/**
 * 災害ワークフロー通知（任意: EmailJS / mailto フォールバック）
 *
 * window.HH_EMAILJS = {
 *   publicKey: 'xxx',
 *   serviceId: 'service_xxx',
 *   templateId: 'template_xxx',
 *   fromEmail: '',      // 任意: 送信元メール（空なら所有者の「送信元メール」と同じ）
 *   fromName: '',       // 任意: From 表示名 → {{from_name}}（テンプレ・サービスが許す場合）
 *   replyToEmail: '',   // 任意: Reply-To 専用（空なら所有者の送信元メール）
 *   composeMode: 'mailto', // EmailJS 未使用／失敗時の compose: 'mailto' | 'outlookWeb'
 *   outlookWebComposeBase: 'https://outlook.office.com/mail/deeplink/compose',
 *   mailtoFromEmail: '',  // mailto 時に &from= を付与（クライアントは無視することがある）
 *   emailJsBundleUrl: '', // 任意: EmailJS SDK の URL（空なら同一オリジンの email.min.js?v=4.4.1 → 失敗時 CDN）
 *   workflowNotifyVia: 'emailjs', // 'emailjs'（既定）| 'mailto' — 後者は EmailJS を使わず OS のメーラーで送る（M365 等で第三者経由が隔離されるとき）
 *   allowMailtoFallbackOnEmailJsFailure: false, // true のときのみ、EmailJS 失敗後にメール作成画面を開く（既定は開かない）
 * };
 * serviceId は EmailJS の「Email Services」で Gmail / Outlook 等どれを接続したかに対応（＝送信に使うメールアカウント経路）。
 * テンプレート例: To フィールドに必ず {{to_email}}（または {{email}} / {{to}} / {{user_email}} のいずれか）を指定
 *   未設定や別名のみだと API が 422「The recipients address is empty」になる。
 *   From に {{from_email}} {{from_name}}、Reply-To = {{reply_to}} 等
 * 所有者が設定した送信元は、上記が空のとき {{reply_to}} {{sender_email}} に反映。差戻し時のみ副本 {{bcc_email}}
 *
 * ※ メールアドレスをフォームに入れただけでは送信されません。EmailJS 設定時は API 送信、未設定時は使用者画面の「承認者にメールを作成」や承認後の確認ダイアログから mailto を開きます。
 * ※ Slack/Teams は disaster-webhook-notify.js と config.js の HH_WEBHOOK_NOTIFY で任意利用（メールと併用可）。
 */
(function (global) {
  'use strict';

  function baseUrl() {
    var b = global.HH_BASE_URL;
    if (typeof b === 'string' && b) return b.replace(/\/?$/, '/');
    var p = global.location.pathname || '';
    return global.location.protocol + '//' + global.location.host + p.replace(/[^/]*$/, '');
  }

  function adminLink() {
    return baseUrl() + 'admin.html';
  }

  /** 承認者用・ログイン不要（URL の t= は秘密に扱うこと） */
  global.disasterApproverPublicUrl = function (rec) {
    if (!rec || !rec.wf || !rec.wf.approve_token) return '';
    var step = rec.wf.step != null ? Number(rec.wf.step) : 0;
    if (isNaN(step) || step < 0) step = 0;
    return (
      baseUrl() +
      'disaster-approver.html?id=' +
      encodeURIComponent(rec.id) +
      '&t=' +
      encodeURIComponent(rec.wf.approve_token) +
      '&s=' +
      encodeURIComponent(String(step))
    );
  };

  /** 差戻し後・報告者がログインして報告書を修正するための URL（要ログイン） */
  global.disasterReporterEditUrl = function (rec) {
    if (!rec || rec.id == null) return '';
    return baseUrl() + 'user.html?disReturned=' + encodeURIComponent(rec.id);
  };

  function getSteps(rec) {
    if (typeof global.disasterGetStepsForRecord === 'function') {
      return global.disasterGetStepsForRecord(rec) || [];
    }
    return [];
  }

  /** mailto の宛先はエンコードしない（%40 等でメールクライアントが開かないことがある） */
  function safeMailtoAddr(addr) {
    var s = String(addr || '').trim();
    if (!/^[^\s<>"']+@[^\s<>"']+\.[^\s<>"']+$/.test(s)) return '';
    return s;
  }

  /** 承認段階オブジェクトから宛先を取り出す（キー揺れ・Firebase 経由の大文字など） */
  function stepApproverEmail(st) {
    if (!st || typeof st !== 'object') return '';
    var raw =
      st.email != null
        ? st.email
        : st.Email != null
          ? st.Email
          : st.user_email != null
            ? st.user_email
            : st.mail != null
              ? st.mail
              : '';
    return String(raw || '').trim();
  }

  /** 提出時「送信者メール」。差戻し通知の宛先。旧データは reporter_notify_email */
  global.disasterWorkflowReturnNotifyTo = function (rec) {
    if (!rec) return '';
    var a = rec.wf_sender_email != null ? String(rec.wf_sender_email).trim() : '';
    if (a) return a;
    return String(rec.reporter_notify_email || '').trim();
  };

  function normAddr(s) {
    return String(s || '')
      .trim()
      .toLowerCase();
  }

  /** mailto 本文フッタ用。config の fromEmail を最優先（所有者 Firebase が古いと anzensystem のままになるのを防ぐ） */
  function notifyFromLine() {
    var cfg = global.HH_EMAILJS || {};
    var cfgFrom = String(cfg.fromEmail || cfg.replyToEmail || '').trim();
    var owner =
      typeof global.disasterGetNotifyFromEmail === 'function' ? String(global.disasterGetNotifyFromEmail() || '').trim() : '';
    var f = cfgFrom || owner;
    return f ? '\n\n────────\n送信元（返信先）メール: ' + f : '';
  }

  function mailtoBodyForApprover(rec, stepIndex) {
    /* 件名・本文は短く・URLは1本に抑え、受信側 M365 のスパム判定（550 5.7.520 等）を避けやすくする */
    var sub = '日新興業 災害報告 承認依頼 (ID:' + (rec && rec.id != null ? rec.id : '') + ')';
    var pub = global.disasterApproverPublicUrl ? global.disasterApproverPublicUrl(rec) : '';
    var body =
      '日新興業株式会社 安全衛生管理システムからの通知です。\n\n' +
      '報告ID: ' +
      (rec && rec.id != null ? rec.id : '') +
      '\n報告者: ' +
      (rec && rec.reporter ? rec.reporter : '') +
      (pub ? '\n\n承認・差戻しは次のURLから行えます（ログイン不要）。\n' + pub : '') +
      notifyFromLine();
    return { sub: sub, body: body };
  }

  global.disasterOpenMailtoForStep = function (rec, stepIndex) {
    var steps = getSteps(rec);
    var idx = stepIndex != null ? stepIndex : rec && rec.wf ? rec.wf.step : 0;
    var st = steps[idx];
    if (!st || !st.email) return;
    var to = safeMailtoAddr(st.email);
    if (!to) return;
    var m = mailtoBodyForApprover(rec, idx);
    disasterOpenMailtoCompose(to, m.sub, m.body, '');
  };

  /** mailto の &from=（Outlook が既定アカウントを切り替えることがある）。未指定時は fromEmail / replyToEmail を使う */
  function effectiveMailtoFromEmail() {
    var cfg = global.HH_EMAILJS || {};
    /* workflowNotifyVia: mailto のときは &from= を付けない（意図しない送信元固定を避ける） */
    if (global.disasterWorkflowPrefersMailto && global.disasterWorkflowPrefersMailto()) {
      return '';
    }
    var a = String(cfg.mailtoFromEmail || '').trim();
    if (a && safeMailtoAddr(a)) return a;
    a = String(cfg.fromEmail || '').trim();
    if (a && safeMailtoAddr(a)) return a;
    a = String(cfg.replyToEmail || '').trim();
    if (a && safeMailtoAddr(a)) return a;
    return '';
  }

  function openMailtoLink(to, sub, body, bcc) {
    var q = 'subject=' + encodeURIComponent(sub) + '&body=' + encodeURIComponent(body);
    var bc = safeMailtoAddr(bcc);
    if (bc) q += '&bcc=' + encodeURIComponent(bc);
    var fromAddr = effectiveMailtoFromEmail();
    if (fromAddr) {
      q += '&from=' + encodeURIComponent(fromAddr);
    }
    var href = 'mailto:' + to + '?' + q;
    var a = global.document.createElement('a');
    a.href = href;
    a.style.display = 'none';
    global.document.body.appendChild(a);
    a.click();
    global.document.body.removeChild(a);
  }

  function composeModeIsOutlookWeb() {
    var cfg = global.HH_EMAILJS || {};
    var m = String(cfg.composeMode || 'mailto').toLowerCase().replace(/[\s_-]/g, '');
    return m === 'outlookweb';
  }

  /**
   * mailto または Outlook on the web の新規メール（EmailJS 未使用時・フォールバック）
   */
  function disasterOpenMailtoCompose(to, sub, body, bcc) {
    if (composeModeIsOutlookWeb()) {
      var cfg = global.HH_EMAILJS || {};
      var base = String(
        cfg.outlookWebComposeBase || 'https://outlook.office.com/mail/deeplink/compose'
      ).replace(/\/?$/, '');
      var qs =
        'to=' +
        encodeURIComponent(to) +
        '&subject=' +
        encodeURIComponent(sub) +
        '&body=' +
        encodeURIComponent(body);
      var bc = safeMailtoAddr(bcc);
      if (bc) qs += '&bcc=' + encodeURIComponent(bc);
      try {
        global.open(base + '?' + qs, '_blank', 'noopener,noreferrer');
      } catch (e) {
        openMailtoLink(to, sub, body, bcc);
      }
      return;
    }
    openMailtoLink(to, sub, body, bcc);
  }

  /** EmailJS テンプレへ渡す送信元・返信先（config の fromEmail / replyToEmail が優先、空なら所有者設定） */
  function emailJsFromReplyFields() {
    var cfg = global.HH_EMAILJS || {};
    var owner =
      typeof global.disasterGetNotifyFromEmail === 'function'
        ? String(global.disasterGetNotifyFromEmail() || '').trim()
        : '';
    var replyTo = String(cfg.replyToEmail || '').trim() || owner;
    var fromEmail = String(cfg.fromEmail || '').trim() || owner;
    var fromName = String(cfg.fromName || '').trim();
    return { replyTo: replyTo, fromEmail: fromEmail, fromName: fromName };
  }

  global.disasterOpenMailtoReturned = function (rec) {
    var to = safeMailtoAddr(global.disasterWorkflowReturnNotifyTo ? global.disasterWorkflowReturnNotifyTo(rec) : '');
    if (!to) return;
    var sub2 = '日新興業 災害報告 差戻し (ID:' + (rec && rec.id != null ? rec.id : '') + ')';
    var editU = global.disasterReporterEditUrl ? global.disasterReporterEditUrl(rec) : '';
    var body2 =
      '日新興業株式会社 安全衛生管理システムからの通知です。\n\n' +
      '報告が差戻されました。\n' +
      (rec.wf && String(rec.wf.returnNote || '').trim()
        ? '【差戻しコメント】\n' + String(rec.wf.returnNote).trim() + '\n\n'
        : '') +
      '報告ID: ' +
      (rec && rec.id != null ? rec.id : '') +
      '\n' +
      (editU
        ? '報告書の修正・再提出は、次のURLを開き、ログイン後に「報告書フォームで修正する」から行ってください。\n' + editU + '\n'
        : '再提出は使用者画面（user.html）の災害発生報告からお願いします。\n') +
      notifyFromLine();
    var bcc = '';
    var from =
      typeof global.disasterGetNotifyFromEmail === 'function' ? String(global.disasterGetNotifyFromEmail() || '').trim() : '';
    if (from && normAddr(from) !== normAddr(to)) bcc = from;
    disasterOpenMailtoCompose(to, sub2, body2, bcc);
  };

  var _emailJsLoading = false;
  /** EmailJS 内部のレート制限が localStorage に依存する。Edge のトラッキング防止で失敗するためメモリに逃がす */
  function emailJsMemoryStorageProvider() {
    var mem = Object.create(null);
    return {
      get: function (key) {
        return Promise.resolve(Object.prototype.hasOwnProperty.call(mem, key) ? String(mem[key]) : null);
      },
      set: function (key, val) {
        mem[key] = val;
        return Promise.resolve();
      },
      remove: function (key) {
        delete mem[key];
        return Promise.resolve();
      },
    };
  }

  function emailJsInitWithCfg(cfg) {
    if (!global.emailjs || typeof global.emailjs.init !== 'function' || !cfg || !cfg.publicKey) return;
    global.emailjs.init({
      publicKey: cfg.publicKey,
      storageProvider: emailJsMemoryStorageProvider(),
    });
  }

  /** 同一オリジン配信を優先（Edge 等のトラッキング防止で cdn.jsdelivr.net のストレージがブロックされうる） */
  var EMAILJS_BUNDLE_DEFAULT = 'email.min.js?v=4.4.1';
  var EMAILJS_CDN_FALLBACK = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4.4.1/dist/email.min.js';

  function ensureEmailJs(cb) {
    if (global.emailjs && typeof global.emailjs.init === 'function' && typeof global.emailjs.send === 'function') {
      try {
        emailJsInitWithCfg(global.HH_EMAILJS || {});
      } catch (eRe) {}
      cb(true);
      return;
    }
    if (_emailJsLoading) {
      setTimeout(function () {
        ensureEmailJs(cb);
      }, 120);
      return;
    }
    _emailJsLoading = true;

    function afterBundleLoaded() {
      _emailJsLoading = false;
      var cfg = global.HH_EMAILJS;
      try {
        if (global.emailjs && cfg && cfg.publicKey) {
          emailJsInitWithCfg(cfg);
        }
      } catch (e) {
        console.warn('[disaster-email] EmailJS init に失敗しました', e);
      }
      var ok = !!(
        global.emailjs &&
        typeof global.emailjs.send === 'function' &&
        cfg &&
        cfg.publicKey &&
        cfg.serviceId &&
        cfg.templateId
      );
      if (!ok) {
        console.warn(
          '[disaster-email] EmailJS が利用できません（SDK 未読込・init 失敗・HH_EMAILJS 不足）。email.min.js をサイトと同じフォルダにデプロイしているか確認してください。'
        );
      }
      cb(ok);
    }

    function appendBundle(src, isCdnFallback) {
      var s = document.createElement('script');
      s.async = true;
      s.onload = afterBundleLoaded;
      s.onerror = function () {
        if (!isCdnFallback) {
          console.warn('[disaster-email] 同一オリジンの email.min.js が読めません。CDN にフォールバックします。');
          appendBundle(EMAILJS_CDN_FALLBACK, true);
        } else {
          _emailJsLoading = false;
          console.warn('[disaster-email] EmailJS SDK の読み込みに失敗しました（ネットワーク・ブロック等）');
          cb(false);
        }
      };
      s.src = src;
      document.head.appendChild(s);
    }

    var cfg0 = global.HH_EMAILJS || {};
    var primary = (function () {
      if (typeof cfg0.emailJsBundleUrl === 'string' && cfg0.emailJsBundleUrl.trim()) {
        return cfg0.emailJsBundleUrl.trim();
      }
      var bu = global.HH_BASE_URL;
      if (typeof bu === 'string' && bu.trim()) {
        return bu.replace(/\/?$/, '/') + 'email.min.js?v=4.4.1';
      }
      return EMAILJS_BUNDLE_DEFAULT;
    })();
    appendBundle(primary, false);
  }

  global.disasterHasEmailJsConfigured = function () {
    var cfg = global.HH_EMAILJS;
    return !!(cfg && cfg.publicKey && cfg.serviceId && cfg.templateId);
  };

  /** ページ表示後に先読みすると、提出ボタン直後の EmailJS 初回読み込み待ちを減らせる */
  global.disasterPreloadEmailJs = function (cb) {
    ensureEmailJs(typeof cb === 'function' ? cb : function () {});
  };

  /** EmailJS 送信失敗後に mailto で作成画面を開くか（既定: 開かない＝ブラウザの Outlook が勝手に出ない） */
  function allowMailtoFallbackOnEmailJsFailure() {
    var cfg = global.HH_EMAILJS || {};
    return cfg.allowMailtoFallbackOnEmailJsFailure === true;
  }

  /** HH_EMAILJS.workflowNotifyVia === 'mailto' のとき、災害WF通知は EmailJS ではなくデスクトップメーラー経路にする */
  global.disasterWorkflowPrefersMailto = function () {
    var cfg = global.HH_EMAILJS || {};
    var v = String(cfg.workflowNotifyVia || '')
      .toLowerCase()
      .replace(/[\s_-]/g, '');
    return v === 'mailto';
  };

  /** EmailJS で API 送信するか（キーが揃っていて mailto 優先でない） */
  global.disasterUsesApiForWorkflowEmail = function () {
    if (!global.disasterHasEmailJsConfigured || !global.disasterHasEmailJsConfigured()) return false;
    if (global.disasterWorkflowPrefersMailto && global.disasterWorkflowPrefersMailto()) return false;
    return true;
  };

  /**
   * 提出時に空タブを先に開く／案内（disWfMailPrompt）を出すか。
   * disaster-webhook-notify.js の disasterShouldOpenMailtoForWf はこのファイルより後に読み込まれる想定（実行時には両方そろっていること）。
   */
  global.disasterNeedPrepareMailtoOnSubmit = function () {
    if (global.disasterWorkflowPrefersMailto && global.disasterWorkflowPrefersMailto()) return true;
    if (typeof global.disasterShouldOpenMailtoForWf === 'function' && global.disasterShouldOpenMailtoForWf()) return true;
    if (
      typeof global.disasterShouldOpenMailtoForWf !== 'function' &&
      typeof global.disasterHasEmailJsConfigured === 'function' &&
      !global.disasterHasEmailJsConfigured()
    )
      return true;
    return false;
  };

  /** EmailJS 未使用／mailto 優先時に TryNotify から承認者・差戻し先へ mailto を開く */
  function tryNotifyWorkflowViaMailto(kind, rec) {
    var steps = getSteps(rec);
    if (!steps.length) return;
    if (kind === 'returned') {
      if (global.disasterOpenMailtoReturned) global.disasterOpenMailtoReturned(rec);
      return;
    }
    if (kind === 'submitted') {
      var to0 = safeMailtoAddr(stepApproverEmail(steps[0]));
      if (to0) {
        var m0 = mailtoBodyForApprover(rec, 0);
        disasterOpenMailtoCompose(to0, m0.sub, m0.body, '');
      }
      return;
    }
    if (kind === 'approved_next') {
      if (rec.wf.state !== 'pending') return;
      var si = rec.wf.step != null ? Number(rec.wf.step) : 0;
      if (isNaN(si) || si < 0) si = 0;
      var st = steps[si];
      var toA = safeMailtoAddr(stepApproverEmail(st));
      if (toA) {
        var mm = mailtoBodyForApprover(rec, si);
        disasterOpenMailtoCompose(toA, mm.sub, mm.body, '');
      }
    }
  }

  /** 災害WF付き提出後のトースト文言（EmailJS / Webhook / mailto のいずれかに合わせる） */
  global.disasterWfAfterSubmitHint = function () {
    if (global.disasterUsesApiForWorkflowEmail && global.disasterUsesApiForWorkflowEmail()) {
      return '送信しました。承認者にメールで通知しました';
    }
    if (global.disasterWorkflowPrefersMailto && global.disasterWorkflowPrefersMailto()) {
      return '送信しました。開いたメール画面で会社の Outlook アカウントを選び「送信」すると承認者に届きます（M365 が自動送信を弾くときの運用）';
    }
    if (typeof global.disasterHasWebhookNotifyConfigured === 'function' && global.disasterHasWebhookNotifyConfigured()) {
      return '送信しました。Slack/Teams/自動化フローに通知しました。';
    }
    return '送信しました。メール作成画面で送信すると承認者に届きます';
  };

  /**
   * 提出ボタンと同じクリックで先に空タブを開き、非同期保存後に mailto へ遷移（ポップアップブロック回避）
   */
  global.disasterPrepareMailtoPopup = function () {
    try {
      var w = global.open('about:blank', '_blank');
      if (w && w.document) {
        w.document.write(
          '<meta charset="UTF-8"><title>メール準備</title><p style="font-family:sans-serif;padding:16px;line-height:1.6">レポートを保存しています。まもなくメール作成画面に切り替わります。</p>'
        );
        w.document.close();
      }
      return w;
    } catch (e) {
      return null;
    }
  };

  function closePopupSafe(popup) {
    if (!popup || popup.closed) return;
    try {
      popup.close();
    } catch (e) {}
  }

  /**
   * 提出直後: EmailJS なら API 送信、未設定ならポップアップ経由または mailto リンクで承認者へ案内
   * @param {object|null} mailtoPopup disasterPrepareMailtoPopup() の戻り値
   */
  global.disasterNotifySubmitted = function (rec, mailtoPopup) {
    if (!rec || !rec.wf) {
      if (global.disasterHasEmailJsConfigured && global.disasterHasEmailJsConfigured()) {
        console.warn(
          '[disaster-email] この報告にワークフローがありません（承認者メール未入力など）。第1承認者へメールは送られません。'
        );
      }
      closePopupSafe(mailtoPopup);
      return;
    }
    var steps = getSteps(rec);
    if (!steps.length) {
      if (global.disasterHasEmailJsConfigured && global.disasterHasEmailJsConfigured()) {
        console.warn(
          '[disaster-email] 承認者ステップが0件のためメール通知をスキップしました。災害タブで承認者メールを1件以上入力してください。'
        );
      }
      closePopupSafe(mailtoPopup);
      return;
    }
    if (global.disasterUsesApiForWorkflowEmail && global.disasterUsesApiForWorkflowEmail()) {
      closePopupSafe(mailtoPopup);
      console.info('[disaster-email] 提出後の承認者通知（EmailJS）を試行します', {
        reportId: rec.id,
        firstApprover: stepApproverEmail(steps[0]) ? '（設定あり）' : '（未設定・届きません）',
      });
      global.disasterTryNotifyWorkflow('submitted', rec);
      return;
    }
    if (typeof global.disasterTryWebhookNotify === 'function') {
      try {
        global.disasterTryWebhookNotify('submitted', rec);
      } catch (e) {
        console.warn('[disaster-email] webhook', e);
      }
    }
    var prefM = global.disasterWorkflowPrefersMailto && global.disasterWorkflowPrefersMailto();
    if (
      typeof global.disasterShouldOpenMailtoForWf === 'function' &&
      !global.disasterShouldOpenMailtoForWf() &&
      !prefM
    ) {
      closePopupSafe(mailtoPopup);
      return;
    }
    var to = safeMailtoAddr(stepApproverEmail(steps[0]));
    if (!to) {
      closePopupSafe(mailtoPopup);
      return;
    }
    var m = mailtoBodyForApprover(rec, 0);
    if (composeModeIsOutlookWeb()) {
      closePopupSafe(mailtoPopup);
      disasterOpenMailtoCompose(to, m.sub, m.body, '');
      return;
    }
    var href = 'mailto:' + to + '?subject=' + encodeURIComponent(m.sub) + '&body=' + encodeURIComponent(m.body);
    var mf = effectiveMailtoFromEmail();
    if (mf) href += '&from=' + encodeURIComponent(mf);
    if (mailtoPopup && !mailtoPopup.closed) {
      try {
        mailtoPopup.location.href = href;
        return;
      } catch (e) {}
      closePopupSafe(mailtoPopup);
    }
    openMailtoLink(to, m.sub, m.body, '');
  };

  /**
   * EmailJS が config にある場合のみ API 送信（失敗時は第1承認者へ mailto フォールバック可）
   * @param {string} kind 'submitted' | 'approved_next' | 'returned'
   */
  global.disasterTryNotifyWorkflow = function (kind, rec) {
    if (!rec || !rec.wf) return;
    var steps = getSteps(rec);
    if (!steps.length) return;

    if (typeof global.disasterTryWebhookNotify === 'function') {
      try {
        global.disasterTryWebhookNotify(kind, rec);
      } catch (e) {
        console.warn('[disaster-email] webhook', e);
      }
    }

    if (!(global.disasterUsesApiForWorkflowEmail && global.disasterUsesApiForWorkflowEmail())) {
      console.info('[disaster-email] ワークフロー通知（mailto 経路）', kind, 'reportId=', rec && rec.id);
      tryNotifyWorkflowViaMailto(kind, rec);
      return;
    }

    var cfg = global.HH_EMAILJS;
    if (!(cfg && cfg.publicKey && cfg.serviceId && cfg.templateId)) return;

    console.info('[disaster-email] EmailJS API 送信を準備しています', kind, 'reportId=', rec && rec.id);

    var to = '';
    if (kind === 'submitted') {
      to = stepApproverEmail(steps[0]);
    } else if (kind === 'approved_next') {
      if (rec.wf.state !== 'pending') return;
      var si = rec.wf.step != null ? Number(rec.wf.step) : 0;
      if (isNaN(si) || si < 0) si = 0;
      to = stepApproverEmail(steps[si]);
    } else if (kind === 'returned') {
      to = global.disasterWorkflowReturnNotifyTo ? global.disasterWorkflowReturnNotifyTo(rec) : '';
      if (!to) return;
    } else {
      return;
    }
    to = safeMailtoAddr(to);
    if (!to) {
      console.warn(
        '[disaster-email] 承認者／通知先のメールが空または形式不正のため EmailJS を送れません。使用者画面の承認者メールを確認してください。'
      );
      return;
    }

    var subj =
      kind === 'returned'
        ? '日新興業 災害報告 差戻し (ID:' + rec.id + ')'
        : '日新興業 災害報告 承認依頼 (ID:' + rec.id + ')';
    var pubL = global.disasterApproverPublicUrl ? global.disasterApproverPublicUrl(rec) : '';
    var editL = global.disasterReporterEditUrl ? global.disasterReporterEditUrl(rec) : '';
    var idFields = emailJsFromReplyFields();
    var replyLine = idFields.replyTo || idFields.fromEmail;
    /* 本文は短く・URLは承認用1本（admin_link はテンプレ用パラメータで別渡し。重複URLはスパムスコアが上がりやすい） */
    var returnNoteLine =
      kind === 'returned' && rec.wf && String(rec.wf.returnNote || '').trim()
        ? '\n\n【差戻しコメント】\n' + String(rec.wf.returnNote).trim() + '\n'
        : '';
    var msg =
      '日新興業株式会社 安全衛生管理システムからの通知です。\n' +
      '報告ID: ' +
      rec.id +
      '\n報告者: ' +
      (rec.reporter || '') +
      returnNoteLine +
      (kind === 'returned' && editL
        ? '\n報告書の修正・再提出（ログイン後）:\n' + editL
        : pubL
          ? '\n\n承認・差戻しURL:\n' + pubL
          : '') +
      (replyLine ? '\n\n返信先: ' + replyLine : '');

    ensureEmailJs(function (ok) {
      if (!ok || !global.emailjs || !global.emailjs.send) {
        console.warn(
          '[disaster-email] EmailJS SDK load/init に失敗しました（オフライン・ブロック・file://・email.min.js 未配置 等）。メール作成は開きません。HH_BASE_URL と email.min.js の配置を確認するか、config の allowMailtoFallbackOnEmailJsFailure: true で従来のフォールバックを有効にできます。'
        );
        if (allowMailtoFallbackOnEmailJsFailure() && kind === 'submitted') {
          var st0 = getSteps(rec)[0];
          var to0 = safeMailtoAddr(stepApproverEmail(st0));
          if (to0) {
            var m0 = mailtoBodyForApprover(rec, 0);
            disasterOpenMailtoCompose(to0, m0.sub, m0.body, '');
          }
        }
        return;
      }
      // EmailJS テンプレの「To」は必ずいずれかと一致させる: to_email（推奨） / email / to / user_email
      var repEdit = global.disasterReporterEditUrl ? global.disasterReporterEditUrl(rec) : '';
      var params = {
        to_email: to,
        email: to,
        to: to,
        user_email: to,
        recipient_email: to,
        subject: subj,
        message: msg,
        admin_link: adminLink(),
        approver_public_link: pubL || '',
        reporter_edit_link: kind === 'returned' ? repEdit || '' : '',
        return_note: kind === 'returned' && rec.wf && rec.wf.returnNote != null ? String(rec.wf.returnNote) : '',
        report_id: String(rec.id),
        reporter_name: rec.reporter || '',
      };
      var effReply = idFields.replyTo || idFields.fromEmail;
      if (effReply) {
        params.reply_to = idFields.replyTo || idFields.fromEmail;
        params.sender_email = idFields.fromEmail || idFields.replyTo;
      }
      if (idFields.fromEmail) {
        params.from_email = idFields.fromEmail;
        params.fromEmail = idFields.fromEmail;
        params.from = idFields.fromEmail;
        params.sender = idFields.fromEmail;
      }
      if (idFields.fromName) {
        params.from_name = idFields.fromName;
        params.fromName = idFields.fromName;
      }
      var bccSrc = effReply;
      if (kind === 'returned' && bccSrc && normAddr(bccSrc) !== normAddr(to)) {
        params.bcc_email = bccSrc;
      }
      console.info(
        '[disaster-email] EmailJS 送信用 subject（テンプレの Subject が {{subject}} 固定でないとこの値は使われません）:',
        subj
      );
      global.emailjs
        .send(cfg.serviceId, cfg.templateId, params, { publicKey: cfg.publicKey })
        .then(
        function () {
          console.info('[disaster-email] EmailJS 送信リクエスト成功', kind, to);
        },
        function (err) {
          console.warn('[disaster-email] EmailJS', err);
          var stNum = err && err.status != null ? Number(err.status) : NaN;
          var errTxt = err && typeof err.text === 'string' ? err.text : '';
          if (stNum === 412) {
            console.warn(
              '[disaster-email] EmailJS 412（Outlook/Microsoft 連携エラー）。メールサービスを切断→社用 M365 で再接続するか、別サービスを新規作成して config の serviceId を合わせてください。',
              errTxt || ''
            );
            if (kind === 'submitted') {
              setTimeout(function () {
                try {
                  alert(
                    '【承認依頼メール】自動送信に失敗しました（EmailJS エラー 412・Outlook 連携の不整合が多いです）。\n\n' +
                      '■ 推奨（EmailJS 側）\n' +
                      '1) dashboard.emailjs.com → メールサービス → 該当の Outlook を「切断」\n' +
                      '2) もう一度接続し、送信に使う Microsoft 365（例: yutaka_takahagi@…onmicrosoft.com）でサインインし直す\n' +
                      '3) それでもダメなら「新しいメールサービス」を追加して社用だけ接続し、config.js の serviceId をそのサービスの ID に変更\n\n' +
                      '■ アカウント確認\n' +
                      '・ブラウザで https://portal.office.com または Outlook に、送信に使う社用メールでログインし、セキュリティ上の案内があれば対応\n\n' +
                      '■ すぐ手動で送る（下書き画面が開く）\n' +
                      'config.js の HH_EMAILJS に: allowMailtoFallbackOnEmailJsFailure: true\n' +
                      'を追加 → 保存して GitHub に再アップロード → ページを Ctrl+Shift+R で再読み込み\n\n' +
                      '（詳細は F12 コンソールの [disaster-email] EmailJS を確認）'
                  );
                } catch (eAl) {}
              }, 500);
            }
          }
          if (allowMailtoFallbackOnEmailJsFailure() && kind === 'submitted' && rec && rec.wf) {
            var st = getSteps(rec)[0];
            var toF = safeMailtoAddr(stepApproverEmail(st));
            if (toF) {
              var m = mailtoBodyForApprover(rec, 0);
              disasterOpenMailtoCompose(toF, m.sub, m.body, '');
            }
          } else if (kind === 'submitted') {
            console.warn(
              '[disaster-email] EmailJS 送信に失敗しました。メール作成は開きません（allowMailtoFallbackOnEmailJsFailure: true でフォールバック可）。',
              err
            );
          }
        }
      );
    });
  };
})(window);
