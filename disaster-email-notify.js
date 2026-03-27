/**
 * 災害ワークフロー通知（任意: EmailJS / mailto フォールバック）
 *
 * window.HH_EMAILJS = {
 *   publicKey: 'xxx',
 *   serviceId: 'service_xxx',
 *   templateId: 'template_xxx'
 * };
 * テンプレート例: To = {{to_email}}、本文に {{message}} {{admin_link}} {{approver_public_link}} {{report_id}} {{reporter_name}}
 * 所有者が設定した送信元は {{reply_to}} {{sender_email}}（差戻し時のみ副本 {{bcc_email}}）として渡します。EmailJS 側で Reply-To / BCC に割り当ててください。
 *
 * ※ メールアドレスをフォームに入れただけでは送信されません。EmailJS 設定時は API 送信、未設定時は使用者画面の「承認者にメールを作成」や承認後の確認ダイアログから mailto を開きます。
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

  function notifyFromLine() {
    var f =
      typeof global.disasterGetNotifyFromEmail === 'function' ? String(global.disasterGetNotifyFromEmail() || '').trim() : '';
    return f ? '\n\n────────\n送信元（返信先）メール: ' + f : '';
  }

  function mailtoBodyForApprover(rec, stepIndex) {
    var sub = '【災害報告】承認依頼 (報告ID:' + (rec && rec.id != null ? rec.id : '') + ')';
    var pub = global.disasterApproverPublicUrl ? global.disasterApproverPublicUrl(rec) : '';
    var body =
      '災害事故発生報告の承認をお願いします。\n\n' +
      '報告者: ' +
      (rec && rec.reporter ? rec.reporter : '') +
      '\n報告ID: ' +
      (rec && rec.id != null ? rec.id : '') +
      (pub ? '\n\n【ログイン不要】報告の確認・承認・差戻し・追記:\n' + pub : '') +
      '\n\n管理者ログイン（一覧）: ' +
      adminLink() +
      '\n\n※ 確実な自動送信には config.js の HH_EMAILJS（EmailJS）を設定してください。' +
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
    openMailtoLink(to, m.sub, m.body);
  };

  function openMailtoLink(to, sub, body, bcc) {
    var q = 'subject=' + encodeURIComponent(sub) + '&body=' + encodeURIComponent(body);
    var bc = safeMailtoAddr(bcc);
    if (bc) q += '&bcc=' + encodeURIComponent(bc);
    var href = 'mailto:' + to + '?' + q;
    var a = global.document.createElement('a');
    a.href = href;
    a.style.display = 'none';
    global.document.body.appendChild(a);
    a.click();
    global.document.body.removeChild(a);
  }

  global.disasterOpenMailtoReturned = function (rec) {
    var to = safeMailtoAddr(global.disasterWorkflowReturnNotifyTo ? global.disasterWorkflowReturnNotifyTo(rec) : '');
    if (!to) return;
    var sub2 = '【災害報告】差戻し（報告ID:' + (rec && rec.id != null ? rec.id : '') + '）';
    var body2 =
      '災害報告が差戻されました。\n\n' +
      (rec.wf && rec.wf.returnNote ? 'コメント: ' + rec.wf.returnNote + '\n\n' : '') +
      '報告ID: ' +
      (rec && rec.id != null ? rec.id : '') +
      '\n再提出は使用者画面からお願いします。' +
      notifyFromLine();
    var bcc = '';
    var from =
      typeof global.disasterGetNotifyFromEmail === 'function' ? String(global.disasterGetNotifyFromEmail() || '').trim() : '';
    if (from && normAddr(from) !== normAddr(to)) bcc = from;
    openMailtoLink(to, sub2, body2, bcc);
  };

  var _emailJsLoading = false;
  function ensureEmailJs(cb) {
    if (global.emailjs && typeof global.emailjs.init === 'function') {
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
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    s.onload = function () {
      _emailJsLoading = false;
      var cfg = global.HH_EMAILJS;
      try {
        if (global.emailjs && cfg && cfg.publicKey) {
          global.emailjs.init({ publicKey: cfg.publicKey });
        }
      } catch (e) {}
      cb(!!(global.emailjs && cfg && cfg.publicKey && cfg.serviceId && cfg.templateId));
    };
    s.onerror = function () {
      _emailJsLoading = false;
      cb(false);
    };
    document.head.appendChild(s);
  }

  global.disasterHasEmailJsConfigured = function () {
    var cfg = global.HH_EMAILJS;
    return !!(cfg && cfg.publicKey && cfg.serviceId && cfg.templateId);
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
      closePopupSafe(mailtoPopup);
      return;
    }
    var steps = getSteps(rec);
    if (!steps.length) {
      closePopupSafe(mailtoPopup);
      return;
    }
    if (global.disasterHasEmailJsConfigured()) {
      closePopupSafe(mailtoPopup);
      global.disasterTryNotifyWorkflow('submitted', rec);
      return;
    }
    var to = safeMailtoAddr(steps[0] && steps[0].email);
    if (!to) {
      closePopupSafe(mailtoPopup);
      return;
    }
    var m = mailtoBodyForApprover(rec, 0);
    var href = 'mailto:' + to + '?subject=' + encodeURIComponent(m.sub) + '&body=' + encodeURIComponent(m.body);
    if (mailtoPopup && !mailtoPopup.closed) {
      try {
        mailtoPopup.location.href = href;
        return;
      } catch (e) {}
      closePopupSafe(mailtoPopup);
    }
    openMailtoLink(to, m.sub, m.body);
  };

  /**
   * EmailJS が config にある場合のみ API 送信（失敗時は第1承認者へ mailto フォールバック可）
   * @param {string} kind 'submitted' | 'approved_next' | 'returned'
   */
  global.disasterTryNotifyWorkflow = function (kind, rec) {
    if (!rec || !rec.wf) return;
    var steps = getSteps(rec);
    if (!steps.length) return;

    var cfg = global.HH_EMAILJS;
    if (!(cfg && cfg.publicKey && cfg.serviceId && cfg.templateId)) return;

    var to = '';
    if (kind === 'submitted') {
      to = (steps[0] && steps[0].email) || '';
    } else if (kind === 'approved_next') {
      if (rec.wf.state !== 'pending') return;
      to = (steps[rec.wf.step] && steps[rec.wf.step].email) || '';
    } else if (kind === 'returned') {
      to = global.disasterWorkflowReturnNotifyTo ? global.disasterWorkflowReturnNotifyTo(rec) : '';
      if (!to) return;
    } else {
      return;
    }
    if (!to) return;

    var subj =
      kind === 'returned'
        ? '【災害報告】差戻し（報告ID:' + rec.id + '）'
        : '【災害報告】承認依頼 (報告ID:' + rec.id + ')';
    var pubL = global.disasterApproverPublicUrl ? global.disasterApproverPublicUrl(rec) : '';
    var from =
      typeof global.disasterGetNotifyFromEmail === 'function' ? String(global.disasterGetNotifyFromEmail() || '').trim() : '';
    var msg =
      '報告ID: ' +
      rec.id +
      '\n報告者: ' +
      (rec.reporter || '') +
      (pubL ? '\nログイン不要で承認: ' + pubL : '') +
      '\n管理者画面: ' +
      adminLink() +
      (from ? '\n\n送信元（返信先）: ' + from : '');

    ensureEmailJs(function (ok) {
      if (!ok || !global.emailjs || !global.emailjs.send) return;
      var params = {
        to_email: to,
        subject: subj,
        message: msg,
        admin_link: adminLink(),
        approver_public_link: pubL || '',
        report_id: String(rec.id),
        reporter_name: rec.reporter || '',
      };
      if (from) {
        params.reply_to = from;
        params.sender_email = from;
      }
      if (kind === 'returned' && from && normAddr(from) !== normAddr(to)) {
        params.bcc_email = from;
      }
      global.emailjs.send(cfg.serviceId, cfg.templateId, params).then(
        function () {},
        function (err) {
          console.warn('[disaster-email] EmailJS', err);
          if (kind === 'submitted' && rec && rec.wf) {
            var st = getSteps(rec)[0];
            var toF = st && safeMailtoAddr(st.email);
            if (toF) {
              var m = mailtoBodyForApprover(rec, 0);
              openMailtoLink(toF, m.sub, m.body);
            }
          }
        }
      );
    });
  };
})(window);
