/**
 * 安全衛生委員会議事録.xlsx テンプレートへ値を流し込む（JSZip + sheet1.xml 直接編集）
 * 行数が多い場合は結合セル範囲の行高を自動拡張する。
 */
(function (global) {
  'use strict';

  var TEMPLATE_FILES = ['committee_minutes_template.xlsx', '安全衛生委員会議事録.xlsx'];
  var SHEET_PATH = 'xl/worksheets/sheet1.xml';

  var DEFAULT_ROW_HT = 16.15;
  var PT_PER_LINE = 15.5;
  var CHARS_PER_LINE = 38;

  var BLOCKS = {
    att: { start: 4, end: 7 },
    abs: { start: 8, end: 10 },
    part: { start: 11, end: 13 },
    ag: { start: 15, end: 31 },
    other: { start: 33, end: 49 },
    disc: { start: 51, end: 67 }
  };

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

  function textUnits(s) {
    var n = 0;
    var str = String(s || '');
    for (var i = 0; i < str.length; i++) {
      n += str.charCodeAt(i) <= 0xff ? 0.55 : 1;
    }
    return n;
  }

  function estimateLines(text, maxUnitsPerLine) {
    if (!text) return 1;
    var total = 0;
    String(text).split(/\r?\n/).forEach(function (line) {
      var u = textUnits(line);
      total += Math.max(1, Math.ceil(u / maxUnitsPerLine));
    });
    return Math.max(1, total);
  }

  function setRowHeight(xml, rowNum, ht) {
    var htVal = Math.min(409, Math.max(DEFAULT_ROW_HT, ht));
    var htStr = htVal.toFixed(2);
    var rowRe = new RegExp('(<row r="' + rowNum + '")([^>]*)(>)');
    if (!rowRe.test(xml)) return xml;
    return xml.replace(rowRe, function (_m, open, attrs, close) {
      attrs = attrs.replace(/\sht="[^"]*"/, '');
      if (!/customHeight="1"/.test(attrs)) attrs += ' customHeight="1"';
      return open + attrs + ' ht="' + htStr + '"' + close;
    });
  }

  function applyBlockHeights(xml, block, leftText, rightText) {
    var lines = Math.max(
      estimateLines(leftText, CHARS_PER_LINE),
      estimateLines(rightText, CHARS_PER_LINE)
    );
    var numRows = block.end - block.start + 1;
    var needed = lines * PT_PER_LINE + 6;
    var defaultTotal = numRows * DEFAULT_ROW_HT;
    var total = Math.max(defaultTotal, needed);
    var perRow = total / numRows;
    for (var r = block.start; r <= block.end; r++) {
      xml = setRowHeight(xml, r, perRow);
    }
    return xml;
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

  function sideTexts(d, ym, ymLabelFn, buildAgendaForYM) {
    d = d || {};
    return {
      title: ymLabelFn(ym) + ' 安全衛生委員会会議記録',
      date: formatDateJp(d.date),
      tf: formatTime(d.time_from),
      tt: formatTime(d.time_to),
      place: d.place || '',
      att: d.attendees || '',
      abs: d.absentees || '',
      part: d.participants || '',
      ag: agendaForExport(d, ym, buildAgendaForYM),
      other: d.other_reports || '',
      disc: d.discussions || ''
    };
  }

  function fillSide(ref, side, texts) {
    var cols = side === 'left'
      ? { title: 'A1', date: 'B3', tf: 'C3', tt: 'E3', place: 'G3', att: 'B4', abs: 'B8', part: 'B11', ag: 'A15', other: 'A33', disc: 'A51' }
      : { title: 'I1', date: 'J3', tf: 'K3', tt: 'M3', place: 'O3', att: 'J4', abs: 'J8', part: 'J11', ag: 'I15', other: 'I33', disc: 'I51' };

    setStr(ref, cols.title, texts.title);
    setStr(ref, cols.date, texts.date);
    setStr(ref, cols.tf, texts.tf);
    setStr(ref, cols.tt, texts.tt);
    setStr(ref, cols.place, texts.place);
    setStr(ref, cols.att, texts.att);
    setStr(ref, cols.abs, texts.abs);
    setStr(ref, cols.part, texts.part);
    setStr(ref, cols.ag, texts.ag);
    setStr(ref, cols.other, texts.other);
    setStr(ref, cols.disc, texts.disc);
  }

  global.comMinutesFillSheet1Xml = function (sheetXml, prvData, curData, pYM, curYM, ymLabelFn, buildAgendaForYM) {
    if (!sheetXml) return sheetXml;
    var ref = { s: sheetXml };
    var left = sideTexts(prvData, pYM, ymLabelFn, buildAgendaForYM);
    var right = sideTexts(curData, curYM, ymLabelFn, buildAgendaForYM);

    fillSide(ref, 'left', left);
    fillSide(ref, 'right', right);

    ref.s = applyBlockHeights(ref.s, BLOCKS.att, left.att, right.att);
    ref.s = applyBlockHeights(ref.s, BLOCKS.abs, left.abs, right.abs);
    ref.s = applyBlockHeights(ref.s, BLOCKS.part, left.part, right.part);
    ref.s = applyBlockHeights(ref.s, BLOCKS.ag, left.ag, right.ag);
    ref.s = applyBlockHeights(ref.s, BLOCKS.other, left.other, right.other);
    ref.s = applyBlockHeights(ref.s, BLOCKS.disc, left.disc, right.disc);

    return ref.s;
  };

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
