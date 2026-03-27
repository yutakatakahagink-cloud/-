/**
 * 災害ワークフロー → Slack / Microsoft Teams（Incoming Webhook）通知
 *
 * config.js に例:
 * window.HH_WEBHOOK_NOTIFY = {
 *   slackIncomingUrl: 'https://hooks.slack.com/services/.../.../...',
 *   teamsIncomingUrl: 'https://outlook.office.com/webhook/...',
 *   enabled: true
 * };
 *
 * ※ Webhook URL はフロントに載ると悪用されうるため、専用チャンネル・必要ならローテーションを推奨。
 * ※ ブラウザの CORS により環境によっては失敗することがあります（失敗時はコンソールに警告）。
 */
(function (global) {
  'use strict';

  function cfg() {
    return global.HH_WEBHOOK_NOTIFY || {};
  }

  function baseUrl() {
    var b = global.HH_BASE_URL;
    if (typeof b === 'string' && b) return b.replace(/\/?$/, '/');
    var p = global.location.pathname || '';
    return global.location.protocol + '//' + global.location.host + p.replace(/[^/]*$/, '');
  }

  function adminLink() {
    return baseUrl() + 'admin.html';
  }

  function getSteps(rec) {
    if (typeof global.disasterGetStepsForRecord === 'function') {
      return global.disasterGetStepsForRecord(rec) || [];
    }
    return [];
  }

  function targetHint(kind, rec, steps) {
    if (kind === 'submitted') {
      var s0 = steps[0];
      return s0 && s0.email ? '第1承認（' + s0.email + '）' : '第1承認者';
    }
    if (kind === 'approved_next') {
      if (!rec.wf || rec.wf.state !== 'pending') return '（最終承認まで完了）';
      var st = steps[rec.wf.step];
      return st && st.email ? '次の承認（' + st.email + '）' : '次の承認者';
    }
    if (kind === 'returned') {
      var t =
        typeof global.disasterWorkflowReturnNotifyTo === 'function'
          ? global.disasterWorkflowReturnNotifyTo(rec)
          : '';
      return t ? '報告者・連絡先（' + t + '）' : '報告者';
    }
    return '';
  }

  function buildLines(kind, rec, steps) {
    var pub =
      typeof global.disasterApproverPublicUrl === 'function' ? global.disasterApproverPublicUrl(rec) : '';
    var title = '';
    if (kind === 'submitted') title = '【災害報告】新規提出・再提出（承認待ち）';
    else if (kind === 'approved_next') title = '【災害報告】承認済み（次の承認へ）';
    else if (kind === 'returned') title = '【災害報告】差戻し';
    else title = '【災害報告】通知';

    var lines = [
      '*' + title + '*',
      '報告ID: `' + String(rec.id != null ? rec.id : '') + '`',
      '報告者: ' + (rec.reporter || '（不明）'),
      '対応: ' + targetHint(kind, rec, steps),
    ];
    if (pub) lines.push('ログイン不要（承認・差戻し）: ' + pub);
    lines.push('管理者一覧: ' + adminLink());
    var from =
      typeof global.disasterGetNotifyFromEmail === 'function'
        ? String(global.disasterGetNotifyFromEmail() || '').trim()
        : '';
    if (from) lines.push('送信元（返信先）メール: ' + from);
    if (kind === 'returned' && rec.wf && rec.wf.returnNote) {
      lines.push('差戻しコメント: ' + rec.wf.returnNote);
    }
    return { title: title, slackText: lines.join('\n'), plainLines: lines };
  }

  function postSlack(url, text) {
    var body = JSON.stringify({ text: text });
    return global
      .fetch(url, {
        method: 'POST',
        body: body,
        mode: 'cors',
      })
      .then(function (res) {
        if (!res.ok) throw new Error('Slack HTTP ' + res.status);
      })
      .catch(function () {
        return global
          .fetch(url, {
            method: 'POST',
            body: body,
            mode: 'no-cors',
          })
          .then(function () {});
      });
  }

  function postTeams(url, title, plainLines) {
    var textBody = plainLines.join('\n').replace(/\*/g, '');
    var payload = {
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      themeColor: '0078D7',
      summary: title,
      title: title,
      text: textBody,
    };
    var body = JSON.stringify(payload);
    return global
      .fetch(url, {
        method: 'POST',
        body: body,
        mode: 'cors',
      })
      .then(function (res) {
        if (!res.ok) throw new Error('Teams HTTP ' + res.status);
      })
      .catch(function () {
        return global
          .fetch(url, {
            method: 'POST',
            body: body,
            mode: 'no-cors',
          })
          .then(function () {});
      });
  }

  /**
   * @param {string} kind 'submitted' | 'approved_next' | 'returned'
   * @param {object} rec
   */
  global.disasterTryWebhookNotify = function (kind, rec) {
    var c = cfg();
    if (c.enabled === false) return;
    var slackUrl = String(c.slackIncomingUrl || c.slackUrl || '').trim();
    var teamsUrl = String(c.teamsIncomingUrl || c.teamsUrl || '').trim();
    if (!slackUrl && !teamsUrl) return;
    if (!rec || !rec.wf) return;
    var steps = getSteps(rec);
    if (!steps.length) return;

    if (kind === 'approved_next') {
      if (rec.wf.state !== 'pending') return;
      var toStep = steps[rec.wf.step];
      if (!toStep || !String(toStep.email || '').trim()) return;
    }
    if (kind === 'returned') {
      var retTo =
        typeof global.disasterWorkflowReturnNotifyTo === 'function'
          ? String(global.disasterWorkflowReturnNotifyTo(rec) || '').trim()
          : '';
      if (!retTo) return;
    }

    var built = buildLines(kind, rec, steps);
    var promises = [];
    if (slackUrl) {
      promises.push(
        postSlack(slackUrl, built.slackText).catch(function (e) {
          console.warn('[disaster-webhook] Slack', e);
        })
      );
    }
    if (teamsUrl) {
      promises.push(
        postTeams(teamsUrl, built.title, built.plainLines).catch(function (e) {
          console.warn('[disaster-webhook] Teams', e);
        })
      );
    }
    if (promises.length) {
      global.Promise.all(promises).catch(function () {});
    }
  };
})(window);
