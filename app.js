/* ========================================
   SORA 安全支援アプリ v1.4
   日新興業株式会社
   2026年対応: Gemini 2.5系モデル使用
   ======================================== */

/* ---------- Gemini API ---------- */
var GEMINI_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'];
var GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';

function getApiKey() {
  return localStorage.getItem('sora_api_key') || '';
}

function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

async function callGemini(apiKey, body) {
  var json = null, lastErr = '', triedModels = [];
  for (var i = 0; i < GEMINI_MODELS.length; i++) {
    var model = GEMINI_MODELS[i];
    triedModels.push(model);
    var url = GEMINI_BASE + model + ':generateContent?key=' + apiKey;
    try {
      var resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (resp.ok) { json = await resp.json(); break; }
      var errBody = await resp.text();
      lastErr = model + ' (' + resp.status + '): ' + errBody.substring(0, 300);

      if (resp.status === 403 && errBody.indexOf('leaked') >= 0) {
        throw new Error('LEAKED_KEY');
      }
      if (resp.status === 403 || resp.status === 401) {
        throw new Error('INVALID_KEY:' + errBody.substring(0, 200));
      }
      if (resp.status === 429 && i < GEMINI_MODELS.length - 1) {
        await sleep(3000);
        continue;
      }
      if (i < GEMINI_MODELS.length - 1) { await sleep(1000); continue; }
    } catch (e) {
      if (e.message === 'LEAKED_KEY' || e.message.indexOf('INVALID_KEY') === 0) throw e;
      lastErr = model + ': ' + e.message;
      if (i < GEMINI_MODELS.length - 1) continue;
    }
  }
  if (!json) throw new Error(triedModels.join(', ') + ' で失敗\n' + lastErr);
  if (!json.candidates || !json.candidates[0] || !json.candidates[0].content)
    throw new Error('AIから回答が返りませんでした');
  return json.candidates[0].content.parts[0].text;
}

async function testApiKey(apiKey) {
  var url = GEMINI_BASE + 'gemini-2.5-flash-lite:generateContent?key=' + apiKey;
  var resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'テスト。OKとだけ返して。' }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 100 }
    })
  });
  if (!resp.ok) {
    var e = await resp.text().catch(function() { return ''; });
    if (e.indexOf('leaked') >= 0) {
      throw new Error('このAPIキーはGoogleにより無効化されています。新しいプロジェクトでAPIキーを再作成してください。');
    }
    if (resp.status === 429) {
      throw new Error('APIの利用上限に達しています。Google AI Studioで新しいプロジェクトを作成し、そこでAPIキーを発行してください。');
    }
    throw new Error('HTTP ' + resp.status + ': ' + e.substring(0, 120));
  }
  return true;
}

/* ---------- 法令検索 ---------- */
function searchLaws(query) {
  if (typeof LAWS_DB === 'undefined' || !LAWS_DB) return '';
  var keywords = query.replace(/[?？。、！!]/g, ' ').split(/\s+/).filter(function(w) { return w.length >= 2; });
  if (keywords.length === 0) keywords = [query.trim()];

  var scored = [];
  LAWS_DB.forEach(function(law) {
    law.articles.forEach(function(art) {
      var text = art.heading + ' ' + art.body;
      var score = 0;
      keywords.forEach(function(kw) {
        var idx = text.indexOf(kw);
        while (idx >= 0) { score += 10; idx = text.indexOf(kw, idx + 1); }
      });
      if (law.priority) score *= 2;
      if (score > 0) scored.push({ law: law.title, score: score, text: art.body.substring(0, 600) });
    });
  });

  scored.sort(function(a, b) { return b.score - a.score; });
  var top = scored.slice(0, 6);
  if (top.length === 0) return '';

  var ctx = '【参考：関係法令の該当条文】\n';
  top.forEach(function(item) { ctx += '\n■ ' + item.law + '\n' + item.text + '\n'; });
  return ctx;
}

/* ---------- システムプロンプト ---------- */
var SYS = 'あなたは「SORA（ソラ）」です。日新興業株式会社の安全管理AIアシスタントです。\n'
  + '相棒口調で親しみやすく話す。敬語は使わない。安全に関しては妥協しない。\n\n'
  + '回答は以下のセクションで構成（該当のみ）：\n'
  + '### 🔍 リスク・危険ポイント\n### 🛡️ 対策・改善提案\n### 📋 関係法令\n### ⚠️ 類似災害事例\n### 💡 SORAからのひとこと\n\n'
  + '関係法令は条文番号を必ず明記すること。ユーザーから渡される【参考：関係法令の該当条文】があればそれを優先的に引用すること。';

var SYS_PHOTO = SYS + '\n\n1枚または複数枚の現場写真が渡されることがあります。すべての写真を総合的に踏まえ、安全の観点からリスク・対策・法令・事例を回答してください。';

/* ---------- ユーティリティ ---------- */
function $(id) { return document.getElementById(id); }
function escapeHtml(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

function renderMd(text) {
  var h = escapeHtml(text);
  h = h.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  h = h.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/`(.+?)`/g, '<code>$1</code>');
  h = h.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  var lines = h.split('\n'), inList = false, out = [];
  for (var i = 0; i < lines.length; i++) {
    var t = lines[i].trim();
    if (t.match(/^- /) || t.match(/^\d+\. /)) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push('<li>' + (t.match(/^- /) ? t.slice(2) : t.replace(/^\d+\. /, '')) + '</li>');
    } else {
      if (inList) { out.push('</ul>'); inList = false; }
      if (!t) continue;
      if (t.indexOf('<h3>') === 0 || t.indexOf('<blockquote>') === 0) out.push(t);
      else out.push('<p>' + t + '</p>');
    }
  }
  if (inList) out.push('</ul>');
  return out.join('');
}

function friendlyError(msg) {
  msg = msg || '';
  if (msg === 'LEAKED_KEY' || msg.indexOf('leaked') >= 0 || msg.indexOf('無効化') >= 0) {
    return '⚠️ このAPIキーはGoogleにより「漏洩」として無効化されています。\n\n'
      + '**新しいAPIキーの作成手順：**\n'
      + '1. Google AI Studio（https://aistudio.google.com/）にアクセス\n'
      + '2. 左上のプロジェクト選択から「新しいプロジェクトを作成」\n'
      + '3. 新プロジェクト内で「APIキーを作成」をクリック\n'
      + '4. コピーしたキーを右上の⚙設定から登録\n\n'
      + '※同じプロジェクト内で新しいキーを作っても同じエラーになります';
  }
  if (msg.indexOf('429') >= 0 || msg.indexOf('quota') >= 0 || msg.indexOf('RESOURCE_EXHAUSTED') >= 0) {
    return '⚠️ APIの利用制限に達しました。\n\n'
      + '**対処法：**\n'
      + '- 1～2分待ってから再送信\n'
      + '- 改善しない場合 → Google AI Studio で新しいプロジェクトを作成してAPIキーを発行\n\n'
      + '詳細: ' + msg.substring(0, 120);
  }
  if (msg.indexOf('INVALID_KEY') >= 0 || msg.indexOf('API key') >= 0 || msg.indexOf('403') >= 0 || msg.indexOf('401') >= 0) {
    return '⚠️ APIキーが無効です。右上の⚙から正しいキーを設定してください。\n\n'
      + 'Google AI Studio（https://aistudio.google.com/apikey）から取得できます。';
  }
  if (msg.indexOf('Failed to fetch') >= 0 || msg.indexOf('network') >= 0) {
    return '⚠️ ネットワークに接続できません。Wi-Fiや回線を確認してください。';
  }
  return '⚠️ エラーが発生しました。\n詳細: ' + msg.substring(0, 200);
}

function soraAvatarHtml(sizeClass) {
  sizeClass = sizeClass || 'sora-avatar-mood--chat';
  return '<div class="sora-avatar-mood ' + sizeClass + '">'
    + '<img class="sora-avatar-img sora-avatar-img--smile" src="images/sora-avatar-smile.png" alt="">'
    + '<img class="sora-avatar-img sora-avatar-img--serious" src="images/sora-avatar-serious.png" alt="">'
    + '</div>';
}

function startSoraAvatarMoodLoop() {
  function tick() {
    document.querySelectorAll('.sora-avatar-mood').forEach(function(el) {
      var serious = Math.random() < 0.36;
      el.classList.toggle('sora-avatar-mood--serious', serious);
    });
  }
  setTimeout(tick, 800);
  setInterval(tick, 4200);
}

/* ========== メイン ========== */
document.addEventListener('DOMContentLoaded', function() {

  var chatHistory = [];
  var photoSlots = [];
  var MAX_PHOTOS = 8;
  var uploadPlaceholderHtml = '';
  var processing = false;

  // --- スプラッシュ ---
  setTimeout(function() {
    $('splash').classList.add('fade-out');
    $('app').classList.remove('hidden');
    setTimeout(function() { $('splash').style.display = 'none'; }, 500);
  }, 2000);

  // --- タブ ---
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.toggle('active', b.dataset.tab === tab); });
      document.querySelectorAll('.tab-content').forEach(function(c) {
        c.classList.toggle('active', c.id === 'tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
      });
    });
  });

  // ===== 写真機能（複数枚・HEIC対応） =====
  var inputCapture = $('inputCapture');
  var inputGallery = $('inputGallery');
  uploadPlaceholderHtml = $('uploadPlaceholder').innerHTML;

  $('btnCapture').addEventListener('click', function(e) {
    e.stopPropagation();
    inputCapture.value = '';
    inputCapture.click();
  });
  $('btnGallery').addEventListener('click', function(e) {
    e.stopPropagation();
    inputGallery.value = '';
    inputGallery.click();
  });
  $('uploadArea').addEventListener('click', function(e) {
    if (e.target.closest('.photo-thumb-remove')) return;
    if (e.target.closest('.photo-thumb-wrap')) return;
    inputGallery.value = '';
    inputGallery.click();
  });

  $('btnClearPhotos').addEventListener('click', function(e) {
    e.stopPropagation();
    photoSlots = [];
    renderPhotoStrip();
  });

  function isHeic(file) {
    var name = (file.name || '').toLowerCase();
    var type = (file.type || '').toLowerCase();
    return name.endsWith('.heic') || name.endsWith('.heif') || type === 'image/heic' || type === 'image/heif';
  }

  function readAsDataUrl(blob) {
    return new Promise(function(resolve, reject) {
      var r = new FileReader();
      r.onload = function() { resolve(r.result); };
      r.onerror = function() { reject(new Error('read')); };
      r.readAsDataURL(blob);
    });
  }

  function processOneFile(file) {
    return new Promise(function(resolve) {
      if (isHeic(file) && typeof heic2any !== 'undefined') {
        heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 })
          .then(function(jpegBlob) { return readAsDataUrl(jpegBlob); })
          .then(function(dataUrl) {
            resolve({ mime: 'image/jpeg', base64: dataUrl.split(',')[1], dataUrl: dataUrl });
          })
          .catch(function() {
            readAsDataUrl(file).then(function(dataUrl) {
              resolve({ mime: file.type || 'image/jpeg', base64: dataUrl.split(',')[1], dataUrl: dataUrl });
            }).catch(function() { resolve(null); });
          });
        return;
      }
      if (isHeic(file)) {
        readAsDataUrl(file).then(function(dataUrl) {
          resolve({ mime: 'image/jpeg', base64: dataUrl.split(',')[1], dataUrl: dataUrl });
        }).catch(function() { resolve(null); });
        return;
      }
      if (!file.type.startsWith('image/')) {
        resolve(null);
        return;
      }
      readAsDataUrl(file).then(function(dataUrl) {
        resolve({ mime: file.type, base64: dataUrl.split(',')[1], dataUrl: dataUrl });
      }).catch(function() { resolve(null); });
    });
  }

  function renderPhotoStrip() {
    var strip = $('photoPreviewStrip');
    var ph = $('uploadPlaceholder');
    var area = $('uploadArea');
    if (photoSlots.length === 0) {
      strip.hidden = true;
      strip.innerHTML = '';
      ph.innerHTML = uploadPlaceholderHtml;
      ph.style.display = '';
      area.classList.remove('has-image');
      $('photoMessageArea').style.display = 'none';
      $('photoResult').style.display = 'none';
      $('btnClearPhotos').hidden = true;
      $('photoCountLine').hidden = true;
      return;
    }
    ph.style.display = 'none';
    strip.hidden = false;
    strip.innerHTML = '';
    area.classList.add('has-image');
    $('photoMessageArea').style.display = 'block';
    $('photoResult').style.display = 'none';
    $('btnClearPhotos').hidden = false;
    $('photoCountLine').hidden = false;
    $('photoCountText').textContent = String(photoSlots.length);
    photoSlots.forEach(function(slot, idx) {
      var wrap = document.createElement('div');
      wrap.className = 'photo-thumb-wrap';
      var img = document.createElement('img');
      img.src = slot.dataUrl;
      img.alt = '写真' + (idx + 1);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'photo-thumb-remove';
      btn.setAttribute('aria-label', 'この写真を削除');
      btn.textContent = '×';
      btn.addEventListener('click', function(ev) {
        ev.stopPropagation();
        photoSlots.splice(idx, 1);
        renderPhotoStrip();
      });
      wrap.appendChild(img);
      wrap.appendChild(btn);
      strip.appendChild(wrap);
    });
  }

  function handlePhotoFiles(files) {
    if (!files || !files.length) return Promise.resolve();
    var arr = Array.prototype.slice.call(files, 0);
    var room = MAX_PHOTOS - photoSlots.length;
    if (room <= 0) {
      alert('写真は最大' + MAX_PHOTOS + '枚までです。');
      return Promise.resolve();
    }
    if (arr.length > room) {
      alert('最大' + MAX_PHOTOS + '枚までです。先頭' + room + '枚のみ追加します。');
      arr = arr.slice(0, room);
    }
    var skipped = 0;
    return arr.reduce(function(chain, file) {
      return chain.then(function() {
        return processOneFile(file).then(function(slot) {
          if (slot) photoSlots.push(slot);
          else skipped++;
        });
      });
    }, Promise.resolve()).then(function() {
      if (skipped) alert('画像以外のファイルはスキップしました（JPEG / PNG / HEIC対応）');
      renderPhotoStrip();
    });
  }

  inputCapture.addEventListener('change', function() {
    if (inputCapture.files && inputCapture.files.length) handlePhotoFiles(inputCapture.files);
  });
  inputGallery.addEventListener('change', function() {
    if (inputGallery.files && inputGallery.files.length) handlePhotoFiles(inputGallery.files);
  });

  // --- 写真診断 ---
  $('btnAnalyze').addEventListener('click', function() {
    if (!photoSlots.length || processing) return;
    var key = getApiKey();
    if (!key) { openSetup(); return; }

    processing = true;
    $('loadingOverlay').style.display = 'flex';
    $('loadingText').textContent = 'SORAが写真を分析中...';

    var msg = $('photoMessage').value.trim() || 'この現場写真を安全の観点から分析してください。';
    var intro = photoSlots.length > 1
      ? '【写真枚数】' + photoSlots.length + '枚。順に現場の状況を示しています。すべてを総合的に読み取ってください。\n\n'
      : '';
    var parts = [{ text: SYS_PHOTO + '\n\n' + intro + '【ユーザーの指示】\n' + msg }];
    photoSlots.forEach(function(s) {
      parts.push({ inline_data: { mime_type: s.mime, data: s.base64 } });
    });
    var body = {
      contents: [{ parts: parts }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 8192 }
    };

    callGemini(key, body).then(function(text) {
      $('photoResultContent').innerHTML = renderMd(text);
      $('photoResult').style.display = 'flex';
      requestAnimationFrame(function() {
        $('photoResultContent').scrollTop = 0;
        $('photoResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }).catch(function(err) {
      $('photoResultContent').innerHTML = '<div style="color:#ff6b6b">' + renderMd(friendlyError(err.message)) + '</div>';
      $('photoResult').style.display = 'flex';
    }).finally(function() {
      processing = false;
      $('loadingOverlay').style.display = 'none';
    });
  });

  // ===== チャット機能 =====
  function doSend() {
    var msg = $('chatInput').value.trim();
    if (!msg || processing) return;
    var key = getApiKey();
    if (!key) { openSetup(); return; }

    processing = true;
    $('chatInput').value = '';
    $('chatInput').style.height = 'auto';
    $('chatSuggestions').style.display = 'none';

    appendMsg('user', msg);

    var lawContext = searchLaws(msg);
    chatHistory.push({ role: 'user', parts: [{ text: msg }] });

    var typing = showTyping();

    var hist = chatHistory.slice(-10);
    while (hist.length > 0 && hist[0].role !== 'user') hist.shift();

    var sendContents = [];
    for (var i = 0; i < hist.length; i++) {
      var text = hist[i].parts[0].text;
      if (i === 0 && hist[i].role === 'user') {
        text = SYS + '\n\n---\n\n' + text;
      }
      if (i === hist.length - 1 && hist[i].role === 'user' && lawContext) {
        text = text + '\n\n' + lawContext;
      }
      sendContents.push({ role: hist[i].role, parts: [{ text: text }] });
    }

    var body = {
      contents: sendContents,
      generationConfig: { temperature: 0.3, maxOutputTokens: 4096 }
    };

    callGemini(key, body).then(function(text) {
      typing.remove();
      appendMsg('assistant', text);
      chatHistory.push({ role: 'model', parts: [{ text: text }] });
    }).catch(function(err) {
      typing.remove();
      appendMsg('assistant', friendlyError(err.message));
    }).finally(function() {
      processing = false;
    });
  }

  $('btnSend').addEventListener('click', doSend);
  $('chatInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  });
  $('chatInput').addEventListener('input', function() {
    var el = $('chatInput');
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  });
  $('chatSuggestions').querySelectorAll('.suggestion-chip').forEach(function(chip) {
    chip.addEventListener('click', function() { $('chatInput').value = chip.dataset.message; doSend(); });
  });

  function appendMsg(role, text) {
    var d = document.createElement('div');
    d.className = 'message ' + role;
    if (role === 'assistant') {
      d.innerHTML = '<div class="message-avatar">' + soraAvatarHtml('sora-avatar-mood--chat') + '</div>'
        + '<div class="message-bubble"><div class="message-name">SORA</div><div class="message-text">' + renderMd(text) + '</div></div>';
    } else {
      d.innerHTML = '<div class="message-bubble"><div class="message-text">' + escapeHtml(text) + '</div></div>';
    }
    $('chatMessages').appendChild(d);
    requestAnimationFrame(function() { $('chatMessages').scrollTop = $('chatMessages').scrollHeight; });
  }

  function showTyping() {
    var d = document.createElement('div');
    d.className = 'message assistant';
    d.innerHTML = '<div class="message-avatar">' + soraAvatarHtml('sora-avatar-mood--chat') + '</div>'
      + '<div class="message-bubble"><div class="message-name">SORA</div><div class="typing-indicator"><span></span><span></span><span></span></div></div>';
    $('chatMessages').appendChild(d);
    requestAnimationFrame(function() { $('chatMessages').scrollTop = $('chatMessages').scrollHeight; });
    return d;
  }

  // --- 新しい会話 ---
  $('btnNewChat').addEventListener('click', function() {
    chatHistory = [];
    $('chatMessages').innerHTML = '';
    $('chatSuggestions').style.display = '';
    appendMsg('assistant', 'よう！新しい会話だね。法令のこと、安全のこと、何でも聞いてくれ！');
  });

  // ===== 設定 =====
  function openSetup() {
    $('setupModal').style.display = 'flex';
  }

  $('btnSettings').addEventListener('click', function() {
    var k = getApiKey();
    $('apiKeyInput').value = k;
    updateLawsStatus();
    $('settingsModal').style.display = 'flex';
    if (k) {
      $('testResult').innerHTML = '';
    }
  });
  $('btnCloseSettings').addEventListener('click', function() { $('settingsModal').style.display = 'none'; });
  $('settingsBackdrop').addEventListener('click', function() { $('settingsModal').style.display = 'none'; });

  $('btnSaveKey').addEventListener('click', function() {
    var key = $('apiKeyInput').value.trim();
    if (!key) { alert('APIキーを入力してください'); return; }
    doSaveAndTest(key, $('testResult'), function() { $('settingsModal').style.display = 'none'; });
  });

  $('btnSetupSave').addEventListener('click', function() {
    var key = $('setupApiKey').value.trim();
    if (!key) return;
    doSaveAndTest(key, $('setupTestResult'), function() { $('setupModal').style.display = 'none'; });
  });
  $('btnSetupSkip').addEventListener('click', function() { $('setupModal').style.display = 'none'; });

  function doSaveAndTest(key, el, onOk) {
    el.innerHTML = '<span style="color:var(--accent)">gemini-2.5-flash-lite で接続テスト中...</span>';
    testApiKey(key).then(function() {
      localStorage.setItem('sora_api_key', key);
      el.innerHTML = '<span style="color:#2ed573">✓ 接続成功！キーを保存しました</span>';
      updateHeader();
      if (onOk) setTimeout(onOk, 1000);
    }).catch(function(err) {
      el.innerHTML = '<span style="color:#ff4757">✗ ' + escapeHtml(err.message).substring(0, 120) + '</span>';
    });
  }

  function updateHeader() {
    $('headerStatus').textContent = getApiKey() ? '安全支援AI - オンライン' : '安全支援AI - APIキー未設定';
  }

  function updateLawsStatus() {
    if (typeof LAWS_DB !== 'undefined' && LAWS_DB && LAWS_DB.length) {
      $('lawsStatus').textContent = LAWS_DB.length + '法令読み込み済み';
    } else {
      $('lawsStatus').textContent = '法令データなし';
    }
  }

  // --- 起動 ---
  updateHeader();
  startSoraAvatarMoodLoop();
  if (!getApiKey()) {
    setTimeout(openSetup, 2500);
  }
});
