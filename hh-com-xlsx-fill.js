/**
 * 安全衛生委員会議事録.xlsx テンプレートへ値を流し込む（JSZip + sheet1.xml 直接編集）
 * SheetJS 無料版はセルスタイルを書き出せないため、様式保持にはテンプレート ZIP 方式を使う。
 */
(function (global) {
  'use strict';

  var TEMPLATE_PATH = '安全衛生委員会議事録.xlsx';
  var SHEET_PATH = 'xl/worksheets/sheet1.xml';

  function escXml(s) {
    return String(s)
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
    var openClose = new RegExp('<c\\s+r="' + addr + '"([^>]*?)>([\\s\\S]*?)</c>');

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

  global.comMinutesDownloadExcel = function (prvData, curData, pYM, curYM, ymLabelFn, buildAgendaForYM) {
    if (typeof global.JSZip === 'undefined') {
      alert('JSZipが読み込まれていません');
      return Promise.reject(new Error('JSZip missing'));
    }
    return fetch(encodeURI(TEMPLATE_PATH))
      .then(function (res) {
        if (!res.ok) throw new Error('テンプレート「' + TEMPLATE_PATH + '」を取得できません（' + res.status + '）');
        return res.arrayBuffer();
      })
      .then(function (buf) { return global.JSZip.loadAsync(buf); })
      .then(function (zip) {
        return global.comMinutesFillTemplateZip(zip, prvData, curData, pYM, curYM, ymLabelFn, buildAgendaForYM);
      })
      .then(function (zip) {
        return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
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
