/**
 * 安全衛生要望 — 一覧クリックで詳細ポップアップ
 */
(function (global) {
  'use strict';

  var REQ_ST = {
    pending: '未対応',
    in_progress: '取り掛かり中',
    resolved: '解決済み',
  };

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function idEsc(id) {
    return String(id || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  function hideDisToolbar() {
    if (typeof global.hideDisExportToolbar === 'function') global.hideDisExportToolbar();
  }

  function getReqList() {
    if (typeof global.REQ_LIST !== 'undefined' && Array.isArray(global.REQ_LIST)) {
      return global.REQ_LIST;
    }
    try {
      var s = localStorage.getItem('hh_requests');
      return s ? JSON.parse(s) : [];
    } catch (e) {
      return [];
    }
  }

  function syncReqListToWindow(list) {
    if (Array.isArray(list)) global.REQ_LIST = list;
  }
  global.syncReqListToWindow = syncReqListToWindow;

  function buildReqDetailHtml(r, opts) {
    opts = opts || {};
    var stKey = r.status || 'pending';
    var st = REQ_ST[stKey] || '未対応';
    var canEditContent = !!opts.canEditContent;
    var inp =
      'width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--bd,#e2e8f0);border-radius:8px;font-size:12px;font-family:inherit';
    var h = '';
    h +=
      '<div style="font-size:12px;line-height:1.65;color:var(--t2,#334155)">';
    if (canEditContent) {
      h +=
        '<div style="margin-bottom:10px;padding:8px 10px;background:rgba(37,99,235,.08);border-radius:8px;font-size:11px;color:#2563EB;font-weight:600">所有者編集モード — 内容を修正して保存できます</div>';
      h +=
        '<div style="margin-bottom:10px"><label style="font-size:11px;font-weight:700;color:var(--t2)">ステータス</label><select id="oreq_status" style="' +
        inp +
        'margin-top:4px"><option value="pending"' +
        (stKey === 'pending' ? ' selected' : '') +
        '>未対応</option><option value="in_progress"' +
        (stKey === 'in_progress' ? ' selected' : '') +
        '>取り掛かり中</option><option value="resolved"' +
        (stKey === 'resolved' ? ' selected' : '') +
        '>解決済み</option></select></div>';
      h +=
        '<div style="display:grid;gap:8px;margin-bottom:12px">' +
        '<div><label style="font-size:11px;font-weight:700;color:var(--t2)">送信日</label><input id="oreq_date" type="date" value="' +
        esc(r.date || '') +
        '" style="' +
        inp +
        'margin-top:4px"></div>' +
        '<div><label style="font-size:11px;font-weight:700;color:var(--t2)">氏名</label><input id="oreq_name" type="text" value="' +
        esc(r.name || '') +
        '" style="' +
        inp +
        'margin-top:4px"></div>' +
        '<div><label style="font-size:11px;font-weight:700;color:var(--t2)">所属</label><input id="oreq_dept" type="text" value="' +
        esc(r.dept || '') +
        '" style="' +
        inp +
        'margin-top:4px"></div>' +
        '</div>';
      h +=
        '<div style="font-size:11px;font-weight:700;color:var(--ac,#3B7DD8);margin-bottom:4px">要望内容</div>' +
        '<textarea id="oreq_content" style="' +
        inp +
        'min-height:120px;line-height:1.6;resize:vertical;white-space:pre-wrap">' +
        esc(r.content || '') +
        '</textarea>';
      h +=
        '<div style="font-size:11px;font-weight:700;color:var(--gn,#2E7D32);margin:12px 0 4px">対策内容</div>' +
        '<textarea id="oreq_resolution" style="' +
        inp +
        'min-height:100px;line-height:1.6;resize:vertical;white-space:pre-wrap">' +
        esc(r.resolution || '') +
        '</textarea>';
    } else {
      h +=
        '<div style="margin-bottom:10px"><span class="bd2 ' +
        esc(stKey) +
        '">' +
        esc(st) +
        '</span></div>' +
        '<div style="display:grid;gap:6px;margin-bottom:12px;font-size:11px;color:var(--t3,#64748b)">' +
        '<div><b style="color:var(--t2,#334155)">送信日</b> ' +
        esc(r.date || '—') +
        '</div>' +
        '<div><b style="color:var(--t2,#334155)">氏名</b> ' +
        esc(r.name || '—') +
        '</div>' +
        '<div><b style="color:var(--t2,#334155)">所属</b> ' +
        esc(r.dept || '—') +
        '</div>' +
        '</div>' +
        '<div style="font-size:11px;font-weight:700;color:var(--ac,#3B7DD8);margin-bottom:4px">要望内容</div>' +
        '<div style="white-space:pre-wrap;word-break:break-word;padding:10px;background:var(--bg3,#f5f7fa);border-radius:8px;border:1px solid var(--bd,#e2e8f0);font-size:12px;line-height:1.6;color:var(--t1,#0f172a)">' +
        esc(r.content || '（内容なし）') +
        '</div>';
      if (stKey === 'resolved' && r.resolution) {
        h +=
          '<div style="font-size:11px;font-weight:700;color:var(--gn,#2E7D32);margin:12px 0 4px">対策内容</div>' +
          '<div style="white-space:pre-wrap;word-break:break-word;padding:10px;background:rgba(46,125,50,.08);border-radius:8px;border:1px solid rgba(46,125,50,.25);font-size:12px;line-height:1.6;color:var(--gn,#2E7D32)">' +
          esc(r.resolution) +
          '</div>';
      }
    }
    h += '</div>';
    if (canEditContent) {
      h +=
        '<div style="margin-top:14px;display:flex;gap:6px;flex-wrap:wrap;border-top:1px solid var(--bd,#e2e8f0);padding-top:12px">' +
        '<button type="button" class="sub" style="margin:0;flex:1;min-width:140px;padding:10px;font-size:13px" onclick="ownerSaveRequest(\'' +
        idEsc(r.id) +
        '\')">💾 内容を保存</button>' +
        (opts.canDelete
          ? '<button type="button" class="fp" onclick="ownerDeleteRequest(\'' +
            idEsc(r.id) +
            '\')" style="padding:10px 12px;font-size:11px;border-radius:8px;border:1px solid #B71C1C;background:#fff;color:#B71C1C;font-weight:600;cursor:pointer">🗑 削除</button>'
          : '') +
        '</div>';
    } else if (opts.canEditStatus) {
      h +=
        '<div style="margin-top:14px;display:flex;gap:6px;flex-wrap:wrap;border-top:1px solid var(--bd,#e2e8f0);padding-top:12px">' +
        ['pending', 'in_progress', 'resolved']
          .map(function (s) {
            var active = stKey === s;
            return (
              '<button type="button" class="fp" onclick="setReqStatus(\'' +
              idEsc(r.id) +
              "','" +
              s +
              '\')" style="padding:6px 12px;font-size:11px;border-radius:8px;border:1px solid #E2E8F0;background:#fff;cursor:pointer' +
              (active ? ';border-color:var(--ac,#3B7DD8);color:var(--ac,#3B7DD8);font-weight:600' : '') +
              '">' +
              esc(REQ_ST[s]) +
              '</button>'
            );
          })
          .join('') +
        (opts.canDelete
          ? '<button type="button" class="fp" onclick="ownerDeleteRequest(\'' +
            idEsc(r.id) +
            '\')" style="margin-left:auto;padding:6px 12px;font-size:11px;border-radius:8px;border:1px solid #B71C1C;background:#fff;color:#B71C1C;font-weight:600;cursor:pointer">🗑 削除</button>'
          : '') +
        '</div>';
    }
    return h;
  }

  global.openReqDetail = function (id) {
    var list = getReqList();
    var r = list.find(function (x) {
      return String(x.id) === String(id);
    });
    if (!r) {
      console.warn('[req-detail] not found id=', id);
      return;
    }
    var role = (typeof ROLE !== 'undefined' ? ROLE : global.ROLE) || 'user';
    var opts = {
      canEditStatus: role !== 'user',
      canDelete: role === 'owner',
      canEditContent: role === 'owner',
    };
    var mT = document.getElementById('mT');
    var mI = document.getElementById('mI');
    var modal = document.getElementById('modal');
    if (!mT || !mI || !modal) {
      console.warn('[req-detail] modal elements missing');
      return;
    }
    hideDisToolbar();
    var mbd = modal.querySelector('.mbd');
    if (mbd) mbd.classList.remove('dis-detail-wide');
    mT.textContent = '安全衛生要望';
    mI.innerHTML = buildReqDetailHtml(r, opts);
    modal.classList.add('show');
  };

  function reqField(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  }

  global.ownerSaveRequest = function (id) {
    var role = typeof ROLE !== 'undefined' ? ROLE : global.ROLE;
    if (role && role !== 'owner') {
      alert('所有者のみ編集できます');
      return;
    }
    var list = getReqList();
    if (typeof REQ_LIST !== 'undefined' && Array.isArray(REQ_LIST)) list = REQ_LIST;
    var r = list.find(function (x) {
      return String(x.id) === String(id);
    });
    if (!r) {
      alert('対象の要望が見つかりません');
      return;
    }
    var st = reqField('oreq_status');
    if (st === 'pending' || st === 'in_progress' || st === 'resolved') r.status = st;
    r.date = reqField('oreq_date') || r.date;
    r.name = reqField('oreq_name');
    r.dept = reqField('oreq_dept');
    r.content = reqField('oreq_content');
    r.resolution = reqField('oreq_resolution');
    if (typeof REQ_LIST !== 'undefined') REQ_LIST = list;
    syncReqListToWindow(list);
    if (typeof HHDB !== 'undefined' && HHDB.saveRequests) HHDB.saveRequests(list);
    else {
      try {
        localStorage.setItem('hh_requests', JSON.stringify(list));
      } catch (e) {}
    }
    if (typeof rReqList === 'function') rReqList();
    else if (typeof global.rReqList === 'function') global.rReqList();
    if (typeof rCom === 'function' && document.querySelector('#pC.pg.on')) rCom();
    global.openReqDetail(id);
    var t = document.getElementById('toast');
    if (t) {
      t.textContent = '✓ 要望を保存しました';
      t.classList.add('show');
      setTimeout(function () {
        t.classList.remove('show');
        t.textContent = '✓ 操作が完了しました';
      }, 2500);
    } else alert('保存しました');
  };

  global.reqListCardClickAttr = function (id, extraStyle) {
    var style = 'cursor:pointer';
    if (extraStyle) style += ';' + extraStyle;
    return (
      ' class="rc req-clickable" data-req-id="' +
      esc(id) +
      '" role="button" tabindex="0" style="' +
      style +
      '" onclick="openReqDetail(\'' +
      idEsc(id) +
      '\')"'
    );
  };

  function initReqListClickDelegation() {
    if (global._reqListClickInited) return;
    global._reqListClickInited = true;
    document.addEventListener(
      'click',
      function (ev) {
        var card = ev.target.closest('[data-req-id]');
        if (!card) return;
        if (ev.target.closest('button')) return;
        var id = card.getAttribute('data-req-id');
        if (id) global.openReqDetail(id);
      },
      true
    );
    document.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Enter' && ev.key !== ' ') return;
      var card = ev.target.closest('[data-req-id]');
      if (!card) return;
      ev.preventDefault();
      var id = card.getAttribute('data-req-id');
      if (id) global.openReqDetail(id);
    });
  }

  initReqListClickDelegation();

  function initReqModalClose() {
    if (global._reqModalCloseInited) return;
    global._reqModalCloseInited = true;
    document.addEventListener('click', function (ev) {
      if (ev.target && ev.target.id === 'modal') {
        ev.target.classList.remove('show');
        var mb = ev.target.querySelector('.mbd');
        if (mb) mb.classList.remove('dis-detail-wide');
      }
    });
  }
  initReqModalClose();
})(typeof window !== 'undefined' ? window : this);
