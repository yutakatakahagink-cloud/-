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
    var h = '';
    h +=
      '<div style="font-size:12px;line-height:1.65;color:var(--t2,#334155)">' +
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
    h += '</div>';
    if (opts.canEditStatus) {
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
    var role = typeof global.ROLE !== 'undefined' ? global.ROLE : 'user';
    var opts = {
      canEditStatus: role !== 'user',
      canDelete: role === 'owner',
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
