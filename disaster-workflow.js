/**
 * 災害事故発生報告書の多段承認ワークフロー
 * 承認者は主に user.html 送信時に rec.wf.steps で設定（レガシー: 所有者のグローバル設定 STEPS）
 */
(function (global) {
  'use strict';

  var STEPS = [];
  /** 災害通知メールの送信元・返信先（所有者設定）。差戻し時は BCC にも使う */
  var NOTIFY_FROM_EMAIL = '';
  global.DISASTER_WF_STEPS = STEPS;

  function normEmail(e) {
    return String(e || '')
      .trim()
      .toLowerCase();
  }

  global.disasterNormEmail = normEmail;

  function refreshStepsFromLocalStorageIfEmpty() {
    if (STEPS.length > 0) return;
    try {
      var s = localStorage.getItem('hh_disaster_workflow');
      if (!s) return;
      var o = JSON.parse(s);
      STEPS = Array.isArray(o.steps) ? o.steps : [];
      if (o.notify_from_email != null) NOTIFY_FROM_EMAIL = normEmail(o.notify_from_email);
      global.DISASTER_WF_STEPS = STEPS;
    } catch (e) {}
  }

  /** この報告の承認段階（送信時の wf.steps 優先、無ければグローバル設定＝レガシー） */
  function getStepsForRecord(r) {
    if (r && r.wf && Array.isArray(r.wf.steps) && r.wf.steps.length > 0) {
      return r.wf.steps;
    }
    refreshStepsFromLocalStorageIfEmpty();
    return STEPS;
  }

  global.disasterGetStepsForRecord = getStepsForRecord;

  global.disasterLoadWfConfig = function (cb) {
    function applyCfg(cfg) {
      cfg = cfg || {};
      STEPS = Array.isArray(cfg.steps) ? cfg.steps : [];
      NOTIFY_FROM_EMAIL = normEmail(cfg.notify_from_email);
      global.DISASTER_WF_STEPS = STEPS;
      if (typeof cb === 'function') cb(STEPS);
    }
    if (typeof HHDB !== 'undefined' && HHDB.loadDisasterWorkflow) {
      HHDB.loadDisasterWorkflow(function (cfg) {
        applyCfg(cfg || {});
      });
    } else {
      try {
        var s = localStorage.getItem('hh_disaster_workflow');
        applyCfg(s ? JSON.parse(s) : {});
      } catch (e) {
        applyCfg({});
      }
    }
  };

  global.disasterGetNotifyFromEmail = function () {
    return NOTIFY_FROM_EMAIL;
  };

  /** 所有者: 災害メールの送信元（返信先）を保存。既存の承認段階リストは維持 */
  global.disasterSaveNotifyFromEmail = function (email, cb) {
    NOTIFY_FROM_EMAIL = normEmail(email);
    var data = { steps: STEPS.slice(), notify_from_email: NOTIFY_FROM_EMAIL };
    if (typeof HHDB !== 'undefined' && HHDB.saveDisasterWorkflow) {
      HHDB.saveDisasterWorkflow(data);
    }
    try {
      localStorage.setItem('hh_disaster_workflow', JSON.stringify(data));
    } catch (e) {}
    if (typeof cb === 'function') cb();
  };

  global.disasterSaveWfConfig = function (steps, cb) {
    var data = {
      steps: Array.isArray(steps) ? steps : [],
      notify_from_email: NOTIFY_FROM_EMAIL,
    };
    if (typeof HHDB !== 'undefined' && HHDB.saveDisasterWorkflow) {
      HHDB.saveDisasterWorkflow(data);
    }
    try {
      localStorage.setItem('hh_disaster_workflow', JSON.stringify(data));
    } catch (e) {}
    STEPS = data.steps;
    global.DISASTER_WF_STEPS = STEPS;
    if (typeof cb === 'function') cb();
  };

  /** グローバル（所有者設定）のみのレガシー用 */
  global.disasterWfEnabled = function () {
    refreshStepsFromLocalStorageIfEmpty();
    return STEPS.length > 0;
  };

  /** このレコードが承認フロー対象か（送信時に承認者メールを付けた場合など） */
  global.recordHasActiveWorkflow = function (r) {
    return !!(r && r.wf && getStepsForRecord(r).length > 0);
  };

  /** 災害一覧（確定済み）に表示するか */
  global.disasterListVisible = function (r) {
    if (!r) return false;
    if (!r.wf) return true;
    return r.wf.state === 'final';
  };

  global.disasterIsPending = function (r) {
    return r && r.wf && r.wf.state === 'pending';
  };

  global.disasterIsReturned = function (r) {
    return r && r.wf && r.wf.state === 'returned';
  };

  function genApproveToken() {
    var a = new Uint8Array(16);
    if (global.crypto && global.crypto.getRandomValues) {
      global.crypto.getRandomValues(a);
    } else {
      for (var i = 0; i < a.length; i++) {
        a[i] = Math.floor(Math.random() * 256);
      }
    }
    var s = '';
    for (var j = 0; j < a.length; j++) {
      s += ('0' + a[j].toString(16)).slice(-2);
    }
    return s;
  }

  /**
   * 送信時: stepsFromForm = [{label,email},...] メール必須。1件以上で wf 付与。
   */
  global.disasterApplyWfOnSubmit = function (rec, reporterName, stepsFromForm) {
    var raw = Array.isArray(stepsFromForm) ? stepsFromForm : [];
    var cleaned = [];
    raw.forEach(function (s) {
      var em = normEmail(s && s.email);
      if (!em) return;
      var lab = String((s && s.label) || '').trim() || '承認';
      cleaned.push({ label: lab, email: em });
    });
    if (!cleaned.length) return;
    var now = new Date().toISOString();
    rec.wf = {
      steps: cleaned,
      state: 'pending',
      step: 0,
      stamps: [],
      history: [{ type: 'submit', at: now, by: reporterName || '', note: '' }],
      returnNote: '',
      approve_token: genApproveToken(),
      report_addenda: [],
    };
  };

  /** ログイン不要の承認URL用（?id= &t= と rec.wf.approve_token が一致） */
  function normPubToken(t) {
    return String(t || '')
      .trim()
      .replace(/\s+/g, '')
      .toLowerCase();
  }

  global.disasterPublicTokenValid = function (r, token) {
    var stored = r && r.wf && (r.wf.approve_token != null ? r.wf.approve_token : r.wf.approveToken);
    return !!(stored && token && normPubToken(stored) === normPubToken(token));
  };

  function stepEmailForRecord(r, stepIdx) {
    var st = getStepsForRecord(r)[stepIdx];
    return st ? normEmail(st.email) : '';
  }

  /**
   * メールのログイン不要リンク用: トークンが有効でも URL の承認段階 s= が現在の wf.step と一致する場合のみ操作可
   * @param {string|number|undefined} publicStep URL の s パラメータ（無い場合は従来互換で第1段階のみ）
   */
  global.disasterCanApprove = function (r, userEmail, isOwner, publicToken, publicStep) {
    if (!r || !r.wf || r.wf.state !== 'pending') return false;
    var steps = getStepsForRecord(r);
    if (!steps.length) return false;
    if (publicToken && global.disasterPublicTokenValid(r, publicToken)) {
      var ps = publicStep;
      if (ps === undefined || ps === null || String(ps).trim() === '') {
        return r.wf.step === 0;
      }
      var n = parseInt(String(ps), 10);
      if (isNaN(n) || n < 0) return false;
      return n === r.wf.step;
    }
    var need = stepEmailForRecord(r, r.wf.step);
    if (isOwner) return true;
    var u = normEmail(userEmail);
    if (!u || !need) return false;
    return u === need;
  };

  global.disasterCanReturn = global.disasterCanApprove;

  global.disasterSaveReports = function (DIS_LIST, singleId) {
    if (
      typeof HHDB !== 'undefined' &&
      HHDB.mergeDisasterReport &&
      HHDB.useFirebase &&
      HHDB.useFirebase() &&
      singleId != null &&
      String(singleId) !== ''
    ) {
      var one = DIS_LIST.find(function (x) {
        return String(x.id) === String(singleId);
      });
      if (one) {
        HHDB.mergeDisasterReport(one);
        try {
          localStorage.setItem('hh_disaster_reports', JSON.stringify(DIS_LIST));
        } catch (e) {}
        return;
      }
    }
    if (typeof HHDB !== 'undefined' && HHDB.saveDisasterReports) {
      HHDB.saveDisasterReports(DIS_LIST);
    }
    try {
      localStorage.setItem('hh_disaster_reports', JSON.stringify(DIS_LIST));
    } catch (e) {}
  };

  global.disasterApprove = function (DIS_LIST, id, approverName, approverEmail, isOwner, publicToken, publicStep) {
    var r = DIS_LIST.find(function (x) {
      return String(x.id) === String(id);
    });
    if (!r || !r.wf) return { ok: false, msg: '対象がありません' };
    var steps = getStepsForRecord(r);
    if (!steps.length) return { ok: false, msg: '承認段階が設定されていません' };
    if (!disasterCanApprove(r, approverEmail, isOwner, publicToken, publicStep)) {
      return {
        ok: false,
        msg: publicToken
          ? 'このURLは現在の承認段階用ではありません。最新のメールのリンクを開いてください。'
          : 'この段階の承認者ではありません（メールアドレスを確認）',
      };
    }
    var now = new Date().toISOString();
    var label = (steps[r.wf.step] && steps[r.wf.step].label) || '第' + (r.wf.step + 1) + '承認';
    r.wf.stamps = r.wf.stamps || [];
    r.wf.stamps.push({
      step: r.wf.step,
      label: label,
      name: approverName || '',
      email: normEmail(approverEmail),
      at: now,
    });
    r.wf.history.push({
      type: 'approve',
      at: now,
      by: approverName || '',
      note: label,
    });
    if (r.wf.step + 1 >= steps.length) {
      r.wf.state = 'final';
    } else {
      r.wf.step = r.wf.step + 1;
    }
    disasterSaveReports(DIS_LIST, id);
    return { ok: true };
  };

  global.disasterReturn = function (DIS_LIST, id, note, approverName, approverEmail, isOwner, publicToken, publicStep) {
    var r = DIS_LIST.find(function (x) {
      return String(x.id) === String(id);
    });
    if (!r || !r.wf) return { ok: false, msg: '対象がありません' };
    if (!disasterCanReturn(r, approverEmail, isOwner, publicToken, publicStep)) {
      return {
        ok: false,
        msg: publicToken
          ? 'このURLは現在の承認段階用ではありません。最新のメールのリンクを開いてください。'
          : '差戻しの権限がありません',
      };
    }
    var now = new Date().toISOString();
    r.wf.state = 'returned';
    r.wf.returnNote = note || '';
    r.wf.history.push({
      type: 'return',
      at: now,
      by: approverName || '',
      note: note || '',
    });
    disasterSaveReports(DIS_LIST, id);
    return { ok: true };
  };

  global.disasterReviewerAppendNote = function (DIS_LIST, id, note, approverName, approverEmail, isOwner, publicToken, publicStep) {
    var r = DIS_LIST.find(function (x) {
      return String(x.id) === String(id);
    });
    if (!r || !r.wf) return { ok: false, msg: '対象がありません' };
    if (r.wf.state !== 'pending') return { ok: false, msg: '承認待ちの報告のみ追記・訂正を保存できます' };
    if (!disasterCanApprove(r, approverEmail, isOwner, publicToken, publicStep)) {
      return {
        ok: false,
        msg: publicToken
          ? 'このURLは現在の承認段階用ではありません。最新のメールのリンクを開いてください。'
          : 'この段階の承認者（または所有者）のみ追記・訂正を保存できます',
      };
    }
    var t = String(note || '').trim();
    if (!t) return { ok: false, msg: '内容を入力してください' };
    var now = new Date().toISOString();
    var steps = getStepsForRecord(r);
    var stepLab = (steps[r.wf.step] && steps[r.wf.step].label) || '第' + (r.wf.step + 1) + '承認';
    r.wf.report_addenda = Array.isArray(r.wf.report_addenda) ? r.wf.report_addenda : [];
    r.wf.report_addenda.push({
      at: now,
      by: approverName || '',
      role: '承認者追記（' + stepLab + '）',
      text: t,
    });
    r.wf.history.push({
      type: 'approver_note',
      at: now,
      by: approverName || '',
      note: '報告書に追記（' + stepLab + '）',
    });
    disasterSaveReports(DIS_LIST, id);
    return { ok: true };
  };

  global.disasterUserAppendAndResubmit = function (DIS_LIST, id, reporterName, addendum) {
    var r = DIS_LIST.find(function (x) {
      return String(x.id) === String(id);
    });
    if (!r || !r.wf || r.wf.state !== 'returned') return { ok: false, msg: '差戻中の報告のみ再提出できます' };
    if ((r.reporter || '') !== (reporterName || '')) return { ok: false, msg: '本人の報告のみ再提出できます' };
    var now = new Date().toISOString();
    var add = String(addendum || '').trim();
    r.wf.report_addenda = Array.isArray(r.wf.report_addenda) ? r.wf.report_addenda : [];
    if (add) {
      r.wf.report_addenda.push({
        at: now,
        by: reporterName || '',
        role: '報告者（差戻し後の追記・訂正）',
        text: add,
      });
    }
    r.wf.history.push({
      type: 'revise',
      at: now,
      by: reporterName || '',
      note: add || '再提出',
    });
    r.wf.stamps = [];
    r.wf.state = 'pending';
    r.wf.step = 0;
    r.wf.returnNote = '';
    disasterSaveReports(DIS_LIST, id);
    return { ok: true };
  };

  function esc(v) {
    var s = v != null ? String(v) : '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /** 報告書フォーマット外・右上に並べる円形スタンプ用の HTML 断片（複数 div を連結） */
  global.disasterBuildStampsHtml = function (r) {
    if (!r || !r.wf || !r.wf.stamps || !r.wf.stamps.length) return '';
    return r.wf.stamps
      .map(function (s) {
        var dt = (s.at || '').slice(0, 10).replace(/-/g, '/');
        return (
          '<div style="width:76px;height:76px;border-radius:50%;border:3px solid #B71C1C;background:rgba(255,255,255,.98);box-shadow:0 2px 10px rgba(0,0,0,.15);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:4px;box-sizing:border-box;flex-shrink:0;pointer-events:none">' +
          '<div style="font-size:8px;font-weight:800;color:#B71C1C;letter-spacing:.06em;line-height:1">承認</div>' +
          '<div style="font-size:9px;font-weight:700;color:#222;line-height:1.15;margin-top:2px;max-width:68px;max-height:28px;overflow:hidden">' +
          esc(s.name || '') +
          '</div>' +
          '<div style="font-size:7px;color:#555;margin-top:2px;line-height:1.1">' +
          esc(dt) +
          '</div>' +
          '<div style="font-size:6px;color:#888;margin-top:1px;line-height:1.1;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
          esc(s.label || '') +
          '</div></div>'
        );
      })
      .join('');
  };

  /** スタンプは帳票ボックスの外側・上段右寄せ（横並び） */
  global.disasterWrapDetailWithStamps = function (innerHtml, r) {
    var stamps = disasterBuildStampsHtml(r);
    if (!stamps) return innerHtml;
    return (
      '<div style="width:100%;max-width:100%;box-sizing:border-box">' +
      '<div style="display:flex;flex-wrap:wrap;justify-content:flex-end;align-items:flex-start;gap:10px;margin-bottom:10px;padding-right:2px">' +
      stamps +
      '</div>' +
      innerHtml +
      '</div>'
    );
  };

  global.disasterWfStatusBanner = function (r) {
    if (!r || !r.wf) return '';
    var steps = getStepsForRecord(r);
    if (!steps.length) return '';
    var st = r.wf.state;
    var msg = '';
    var bg = '#E3F2FD';
    if (st === 'pending') {
      msg =
        'ワークフロー承認中（現在: 第' +
        (r.wf.step + 1) +
        '段階 / 全' +
        steps.length +
        '段階）';
      bg = '#FFF8E1';
    } else if (st === 'returned') {
      msg = '差戻中。報告者が訂正・追記して再提出できます。';
      bg = '#FFEBEE';
    } else if (st === 'final') {
      msg = '全承認完了（確定済み）';
      bg = '#E8F5E9';
    }
    var ret =
      r.wf.returnNote &&
      '<div style="font-size:11px;margin-top:6px;color:#C62828;white-space:pre-wrap">' +
      esc(r.wf.returnNote) +
      '</div>';
    return (
      '<div style="margin-bottom:10px;padding:10px 12px;border-radius:8px;font-size:12px;line-height:1.5;border:1px solid rgba(0,0,0,.08);background:' +
      bg +
      '"><strong>ワークフロー</strong>：' +
      esc(msg) +
      ret +
      '</div>'
    );
  };

  var HISTORY_TYPE_JA = {
    submit: '提出',
    approve: '承認',
    return: '差戻',
    revise: '再提出',
    approver_note: '承認者の追記・訂正',
  };

  global.disasterWfHistoryHtml = function (r) {
    if (!r || !r.wf || !r.wf.history || !r.wf.history.length) return '';
    var rows = r.wf.history
      .map(function (h) {
        var typeJa = HISTORY_TYPE_JA[h.type] || h.type || '';
        return (
          '<div style="font-size:11px;border-bottom:1px solid #eee;padding:6px 0">' +
          '<span style="color:var(--t3)">' +
          esc((h.at || '').slice(0, 19).replace('T', ' ')) +
          '</span> ' +
          '<strong>' +
          esc(typeJa) +
          '</strong> ' +
          esc(h.by || '') +
          (h.note ? ' — ' + esc(h.note) : '') +
          '</div>'
        );
      })
      .join('');
    return (
      '<div style="margin-top:12px;padding:10px;background:#fafafa;border-radius:8px;border:1px solid #ddd"><div style="font-weight:700;font-size:12px;margin-bottom:6px">履歴</div>' +
      rows +
      '</div>'
    );
  };

  global.disasterWfAdminPanelHtml = function (r, id, userEmail, approverName, isOwner) {
    if (!r || !r.wf) return '';
    var steps = getStepsForRecord(r);
    if (!steps.length) return '';
    if (r.wf.state === 'final') return '';
    if (r.wf.state === 'returned') {
      return (
        '<div style="margin-top:12px;padding:12px;background:#FFF3E0;border-radius:8px;font-size:12px">差戻中のため、承認操作はできません。報告者の再提出を待ってください。</div>'
      );
    }
    if (r.wf.state !== 'pending') return '';
    var can = disasterCanApprove(r, userEmail, isOwner, undefined, undefined);
    var stepLabel = (steps[r.wf.step] && steps[r.wf.step].label) || '第' + (r.wf.step + 1) + '承認';
    var expect = stepEmailForRecord(r, r.wf.step);
    var hint =
      '<p style="font-size:11px;color:var(--t3);margin:0 0 8px">担当段階: ' +
      esc(stepLabel) +
      (expect ? '（承認者メール: ' + esc(expect) + '）' : '') +
      '</p>';
    if (!can) {
      return (
        '<div style="margin-top:12px;padding:12px;background:#f5f5f5;border-radius:8px;font-size:12px">' +
        hint +
        '<p style="margin:0;color:var(--t3)">あなたのアカウントのメールアドレスがこの段階の承認者と一致しないため承認できません。所有者は全段階承認可能です。</p></div>'
      );
    }
    var idStr = String(id).replace(/'/g, "\\'");
    return (
      '<div style="margin-top:12px;padding:12px;background:linear-gradient(135deg,rgba(46,125,50,.08),rgba(129,199,132,.12));border:1px solid #81C784;border-radius:8px">' +
      hint +
      '<div style="margin:12px 0 0;padding:10px 0 0;border-top:1px dashed rgba(46,125,50,.35)">' +
      '<div style="font-weight:700;font-size:11px;margin-bottom:6px;color:#1B5E20">承認者による追記・訂正</div>' +
      '<p style="font-size:10px;color:var(--t3);margin:0 0 8px;line-height:1.5">入力内容は<b>報告書内の「追記・訂正」欄</b>に氏名・日時付きで表示され、履歴にも記録されます。</p>' +
      '<textarea id="disApproverNote" class="ft" style="min-height:72px;width:100%;box-sizing:border-box;margin-bottom:8px;font-size:12px" placeholder="指摘・補足・訂正文など"></textarea>' +
      '<button type="button" class="fp" style="padding:8px 14px;font-size:11px;border-radius:8px;margin-bottom:10px" onclick="disasterDoApproverNote(\'' +
      idStr +
      "')\">追記・訂正を保存</button></div>" +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">' +
      '<button type="button" class="sub" style="margin:0;padding:10px 16px;font-size:13px;background:#2E7D32" onclick="disasterDoApprove(\'' +
      idStr +
      "')\">承認する</button>" +
      '<button type="button" style="margin:0;padding:10px 16px;font-size:13px;border-radius:var(--rs);border:1px solid #E53935;background:#fff;color:#E53935;cursor:pointer;font-weight:600" onclick="disasterDoReturn(\'' +
      idStr +
      "')\">差戻す</button></div>" +
      '</div>'
    );
  };

  /** メール内リンク用（disaster-approver.html）。pub = { token, step } 必須 */
  global.disasterWfPublicPanelHtml = function (r, id, pub) {
    if (!r || !r.wf) return '';
    var steps = getStepsForRecord(r);
    if (!steps.length) return '';
    if (r.wf.state === 'final') {
      return (
        '<div style="margin-top:12px;padding:12px;background:#E8F5E9;border-radius:8px;font-size:12px;border:1px solid #81C784">全承認が完了しました。</div>'
      );
    }
    if (r.wf.state === 'returned') {
      return (
        '<div style="margin-top:12px;padding:12px;background:#FFF3E0;border-radius:8px;font-size:12px">差戻中です。報告者の再提出をお待ちください。</div>'
      );
    }
    if (r.wf.state !== 'pending') return '';
    var stepLabel = (steps[r.wf.step] && steps[r.wf.step].label) || '第' + (r.wf.step + 1) + '承認';
    var tok = pub && pub.token;
    var stp = pub && pub.step;
    var can =
      tok && typeof global.disasterCanApprove === 'function'
        ? global.disasterCanApprove(r, '', false, tok, stp)
        : false;
    if (tok && global.disasterPublicTokenValid(r, tok) && !can) {
      return (
        '<div style="margin-top:12px;padding:12px;background:#FFF8E1;border-radius:8px;font-size:12px;border:1px solid #FFB300;line-height:1.55">' +
          '<strong>このURLは別の承認段階用です。</strong><br>現在は <strong>' +
          esc(stepLabel) +
          '</strong> の待ちです。担当者に届いた<b>最新のメール</b>のリンクを開いてください（URL に <code style="font-size:10px">s=</code> が段階番号として含まれます）。' +
          '</div>'
      );
    }
    var hint =
      '<p style="font-size:11px;color:var(--t3);margin:0 0 8px">ログイン不要で操作できます。現在の段階: <strong>' +
      esc(stepLabel) +
      '</strong></p>';
    return (
      '<div style="margin-top:12px;padding:12px;background:linear-gradient(135deg,rgba(46,125,50,.08),rgba(129,199,132,.12));border:1px solid #81C784;border-radius:8px">' +
      hint +
      '<div style="margin:12px 0 0;padding:10px 0 0;border-top:1px dashed rgba(46,125,50,.35)">' +
      '<div style="font-weight:700;font-size:11px;margin-bottom:6px;color:#1B5E20">追記・訂正（報告書に表示）</div>' +
      '<p style="font-size:10px;color:var(--t3);margin:0 0 8px;line-height:1.5">保存すると<b>報告書内の「追記・訂正」欄</b>に、入力者名・日時付きで追記されます。</p>' +
      '<textarea id="disApproverNote" class="ft" style="min-height:72px;width:100%;box-sizing:border-box;margin-bottom:8px;font-size:12px" placeholder="指摘・補足・訂正文など"></textarea>' +
      '<button type="button" class="fp" style="padding:8px 14px;font-size:11px;border-radius:8px;margin-bottom:10px" onclick="if(typeof disasterPubDoApproverNote===\'function\')disasterPubDoApproverNote()">追記・訂正を保存</button></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">' +
      '<button type="button" class="sub" style="margin:0;padding:10px 16px;font-size:13px;background:#2E7D32" onclick="if(typeof disasterPubDoApprove===\'function\')disasterPubDoApprove()">承認する</button>' +
      '<button type="button" style="margin:0;padding:10px 16px;font-size:13px;border-radius:var(--rs);border:1px solid #E53935;background:#fff;color:#E53935;cursor:pointer;font-weight:600" onclick="if(typeof disasterPubDoReturn===\'function\')disasterPubDoReturn()">差戻す</button></div>' +
      '</div>'
    );
  };

  global.disasterWfUserPanelHtml = function (r, id, reporterName) {
    if (!r || !r.wf || r.wf.state !== 'returned') return '';
    if (getStepsForRecord(r).length === 0) return '';
    if ((r.reporter || '') !== (reporterName || '')) return '';
    var idStr = String(id).replace(/'/g, "\\'");
    return (
      '<div style="margin-top:12px;padding:12px;background:#E8F5E9;border:1px solid #66BB6A;border-radius:8px">' +
      '<div style="font-weight:700;font-size:12px;margin-bottom:6px">訂正・追記して再提出</div>' +
      '<textarea id="disWfUserNote" class="ft" style="min-height:72px;width:100%;box-sizing:border-box;margin-bottom:8px" placeholder="差戻しに対する追記・訂正内容"></textarea>' +
      '<button type="button" class="sub" style="margin:0;padding:10px 16px;font-size:13px" onclick="disasterDoUserResubmit(\'' +
      idStr +
      "')\">再提出する</button></div>"
    );
  };
})(window);
