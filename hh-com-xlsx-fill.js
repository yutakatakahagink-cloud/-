/**
 * 安全衛生委員会議事録.xlsx テンプレートへ値を流し込む（JSZip + sheet1.xml 直接編集）
 */
(function (global) {
  'use strict';

  var TEMPLATE_FILES = ['committee_minutes_template.xlsx', '安全衛生委員会議事録.xlsx'];
  var SHEET_PATH = 'xl/worksheets/sheet1.xml';

  function escXml(s) {
    return String(s)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function setCellXml(xml, addr, value, type) {
    if (value == null || value === '') return xml;
    var v = type === 'n' ? String(value) : escXml(String(value));
    if (v === '') return xml;

    var selfClose = new RegExp('<c\\s+r="' + addr + '"([^/>]*)\\s*/>');
    var openClose = new RegExp('<c\\s+r="' + addr + '"([^>]*?)>([^<]*(?:<(?!c\\s)[^<]*)*?)</c>');

    var inner = type === 'n' ? '<v>' + v + '</v>' : '<is><t xml:space="preserve">' + v + '</t></is>';

    if (selfClose.test(xml)) {
      return xml.replace(selfClose, function (_m, attrs) {
        var a = attrs || '';
        if (type !== 'n' && !/\bt="/.test(a)) a += ' t="inlineStr"';
        return '<c r="' + addr + '"' + a + '>' + inner + '</c>';
      });
    }
    if (openClose.test(xml)) {
      return xml.replace(openClose, function (_m, attrs) {
        var a = (attrs || '').replace(/\s*t="[^"]*"/, '');
        if (type !== 'n') a += ' t="inlineStr"';
        return '<c r="' + addr + '"' + a + '>' + inner + '</c>';
      });
    }
    return xml;
  }

  function setStr(xmlRef, addr, value) {
    if (value == null || value === '') return;
    xmlRef.s = setCellXml(xmlRef.s, addr, value, 's');
  }

  function formatDateJp(dateStr) {
    if (!dateStr) return '';
    var m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return dateStr;
    return parseInt(m[1], 10) + '年' + parseInt(m[2], 10) + '月' + parseInt(m[3], 10) + '日';
  }

  function formatTime(t) {
    if (!t) return '';
    return String(t).substring(0, 5);
  }

  function agendaForExport(d, ym, buildAgendaForYM) {
    if (d && d.agenda_text != null) return d.agenda_text;
    if (typeof buildAgendaForYM !== 'function') return '';
    var p = ym.split('-');
    return buildAgendaForYM(p[0], p[1]);
  }

  function fillSide(ref, side, d, ym, ymLabelFn, buildAgendaForYM) {
    d = d || {};
    var cols = side === 'left'
      ? { title: 'A1', date: 'B3', tf: 'C3', tt: 'E3', place: 'G3', att: 'B4', abs: 'B8', part: 'B11', ag: 'A15', other: 'A33', disc: 'A51' }
      : { title: 'I1', date: 'J3', tf: 'K3', tt: 'M3', place: 'O3', att: 'J4', abs: 'J8', part: 'J11', ag: 'I15', other: 'I33', disc: 'I51' };

    setStr(ref, cols.title, ymLabelFn(ym) + ' 安全衛生委員会会議記録');
    setStr(ref, cols.date, formatDateJp(d.date));
    setStr(ref, cols.tf, formatTime(d.time_from));
    setStr(ref, cols.tt, formatTime(d.time_to));
    setStr(ref, cols.place, d.place || '');
    setStr(ref, cols.att, d.attendees || '');
    setStr(ref, cols.abs, d.absentees || '');
    setStr(ref, cols.part, d.participants || '');
    setStr(ref, cols.ag, agendaForExport(d, ym, buildAgendaForYM));
    setStr(ref, cols.other, d.other_reports || '');
    setStr(ref, cols.disc, d.discussions || '');
  }

  function assetBase() {
    if (typeof global.HH_BASE_URL === 'string' && global.HH_BASE_URL) {
      return global.HH_BASE_URL.replace(/\/?$/, '/');
    }
    try {
      var s = document.querySelector('script[src*="hh-com-xlsx-fill"]');
      if (s && s.src) return s.src.replace(/[^/]+$/, '');
    } catch (e) {}
    try {
      var p = global.location && global.location.pathname ? global.location.pathname : '';
      return p.replace(/[^/]+$/, '');
    } catch (e2) {}
    return '';
  }

  global.comMinutesTemplateUrls = function () {
    var base = assetBase();
    var urls = [];
    TEMPLATE_FILES.forEach(function (name) {
      urls.push(base + encodeURIComponent(name));
      urls.push(base + name);
      urls.push(name);
      urls.push('./' + name);
    });
    var seen = {};
    return urls.filter(function (u) {
      if (!u || seen[u]) return false;
      seen[u] = true;
      return true;
    });
  };

  global.comMinutesFillSheet1Xml = function (sheetXml, prvData, curData, pYM, curYM, ymLabelFn, buildAgendaForYM) {
    if (!sheetXml) return sheetXml;
    var ref = { s: sheetXml };
    fillSide(ref, 'left', prvData, pYM, ymLabelFn, buildAgendaForYM);
    fillSide(ref, 'right', curData, curYM, ymLabelFn, buildAgendaForYM);
    return ref.s;
  };

  global.comMinutesFillTemplateZip = function (zip, prvData, curData, pYM, curYM, ymLabelFn, buildAgendaForYM) {
    if (!zip) return Promise.reject(new Error('zip missing'));
    var sheetEntry = zip.file(SHEET_PATH);
    if (!sheetEntry) return Promise.reject(new Error('sheet1.xml not found in template'));
    return sheetEntry.async('string').then(function (xml) {
      var filled = global.comMinutesFillSheet1Xml(xml, prvData, curData, pYM, curYM, ymLabelFn, buildAgendaForYM);
      zip.file(SHEET_PATH, filled);
      return zip;
    });
  };

  function fetchTemplateBuffer(urls, idx) {
    if (idx >= urls.length) {
      return Promise.reject(new Error('議事録テンプレートを取得できません。GitHub Pages から開いているか確認してください。'));
    }
    return fetch(urls[idx], { credentials: 'same-origin', cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status + ' (' + urls[idx] + ')');
        return res.arrayBuffer();
      })
      .catch(function () { return fetchTemplateBuffer(urls, idx + 1); });
  }

  global.comMinutesDownloadExcel = function (prvData, curData, pYM, curYM, ymLabelFn, buildAgendaForYM) {
    if (typeof global.JSZip === 'undefined') {
      alert('JSZipが読み込まれていません');
      return Promise.reject(new Error('JSZip missing'));
    }
    var urls = global.comMinutesTemplateUrls();
    return fetchTemplateBuffer(urls, 0)
      .then(function (buf) { return global.JSZip.loadAsync(buf); })
      .then(function (zip) {
        return global.comMinutesFillTemplateZip(zip, prvData, curData, pYM, curYM, ymLabelFn, buildAgendaForYM);
      })
      .then(function (zip) {
        return zip.generateAsync({
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 }
        });
      })
      .then(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'committee_minutes_' + curYM + '.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
      });
  };
})(typeof window !== 'undefined' ? window : this);
