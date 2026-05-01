/**
 * 社内様式「4_災害事故発生報告書.xlsm」の「入力用紙」シートへ値を流し込む。
 *
 * 旧版は SheetJS の writeFile を使っていたが、xlsm 内のフォームコントロール
 * (ctrlProps)・図形 (drawings, vmlDrawings)・印刷設定・VBA を完全に保持できず、
 * 出力ファイルが「Excelで開けない／壊れている」と判定される問題があった。
 *
 * 本実装は JSZip で xlsm を ZIP として開き、xl/worksheets/sheet1.xml の
 * 該当セル（自己終了タグ <c r="ADDR" s="N"/> 形式）に値を差し込み、
 * 他のすべての内部ファイルは一切触らずに再パッケージする。
 *
 * → マクロ・図形・入力例シート・mst・印刷設定すべて保持される。
 */
(function (global) {
  'use strict';

  var SHEET_PATH = 'xl/worksheets/sheet1.xml';
  var WD_JA = ['日', '月', '火', '水', '木', '金', '土'];
  var MERGE = '\n\n────────\n【承認者追記】';

  function stripMerge(s) {
    var t = String(s != null ? s : '');
    var i = t.indexOf(MERGE);
    return i === -1 ? t : t.slice(0, i);
  }

  // ===== 承認者追記 (r.wf.report_addenda) を Excel セルに反映するヘルパー =====
  function formatAddendaAtForExcel(raw) {
    if (raw == null || raw === '') return '';
    var d = new Date(raw);
    if (isNaN(d.getTime())) {
      var s = String(raw);
      return s.length >= 19 ? s.slice(0, 19).replace('T', ' ') : s;
    }
    try {
      var fmt = new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      });
      var p = {};
      fmt.formatToParts(d).forEach(function (x) { if (x.type !== 'literal') p[x.type] = x.value; });
      return p.year + '-' + p.month + '-' + p.day + ' ' + p.hour + ':' + p.minute + ':' + p.second;
    } catch (err) {
      return d.toISOString().slice(0, 19).replace('T', ' ');
    }
  }

  function adminNameForApproverEmail(em) {
    var need = String(em || '').trim().toLowerCase();
    if (!need) return '';
    try {
      var raw = (typeof localStorage !== 'undefined') ? localStorage.getItem('hh_admins') : null;
      if (!raw) return '';
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return '';
      for (var i = 0; i < arr.length; i++) {
        var a = arr[i];
        if (!a) continue;
        var em1 = String(a.email || '').trim().toLowerCase();
        var idEm = String(a.id || '').trim().toLowerCase();
        if (em1 === need || (!em1 && idEm === need)) {
          var nm = String(a.name || '').trim();
          if (nm) return nm;
        }
      }
    } catch (err) {}
    return '';
  }

  function getApproverDisplayNameSimple(r, e) {
    if (!e) return '承認者';
    var saved = String(e.approver_display_name || '').trim();
    if (saved) return saved;
    var b0 = String(e.by || '').trim();
    if (b0.indexOf('メールリンク') !== -1) {
      b0 = b0.replace(/\s*[\(（]承認者追記[\)）]\s*$/g, '').trim();
    }
    var candEm = String(e.approver_email || '').trim();
    if (!candEm && b0.indexOf('@') !== -1) candEm = b0;
    var adm = adminNameForApproverEmail(candEm);
    if (!adm && r && r.wf && Array.isArray(r.wf.steps)) {
      for (var si = 0; si < r.wf.steps.length; si++) {
        var sem = (r.wf.steps[si] && r.wf.steps[si].email) || '';
        adm = adminNameForApproverEmail(sem);
        if (adm) break;
      }
    }
    if (adm) return adm;
    if (b0 && b0.indexOf('@') === -1) return b0;
    var fromRoleM = String(e.role || '').match(/承認者追記[（(]([^）)]+)[）)]/);
    if (fromRoleM) return fromRoleM[1].trim();
    return '承認者';
  }

  function isApproverAddendum(e) {
    return e && String(e.role || '').indexOf('承認者') !== -1;
  }

  function getAddendaForField(r, fieldKey) {
    if (!r || !r.wf || !Array.isArray(r.wf.report_addenda)) return [];
    var seen = Object.create(null);
    var out = [];
    r.wf.report_addenda.forEach(function (e) {
      if (!e || String(e.field || '') !== String(fieldKey)) return;
      if (!isApproverAddendum(e)) return;
      var key = String(e.at || '') + '\t' + String(e.by || '') + '\t' + String(e.text || '').trim();
      if (seen[key]) return;
      seen[key] = true;
      out.push(e);
    });
    return out;
  }

  function getLooseAddenda(r) {
    if (!r || !r.wf || !Array.isArray(r.wf.report_addenda)) return [];
    var seen = Object.create(null);
    var out = [];
    r.wf.report_addenda.forEach(function (e) {
      if (!e || e.field) return;
      if (!isApproverAddendum(e)) return;
      var key = String(e.at || '') + '\t' + String(e.by || '') + '\t' + String(e.text || '').trim();
      if (seen[key]) return;
      seen[key] = true;
      out.push(e);
    });
    return out;
  }

  function formatAddendaBlocks(r, list) {
    if (!list || !list.length) return '';
    return list.map(function (e) {
      var at = formatAddendaAtForExcel(e.at);
      var who = getApproverDisplayNameSimple(r, e);
      var txt = String(e.text || '').trim();
      return '──── 【承認者追記】 ────\n' + txt + '\n  — ' + who + '  ' + at;
    }).join('\n\n');
  }

  /** 元の値に承認者追記を結合して返す。stripMerge も実行。 */
  function valueWithAddenda(r, fieldKey, baseText) {
    var base = stripMerge(String(baseText != null ? baseText : ''));
    var addsTxt = formatAddendaBlocks(r, getAddendaForField(r, fieldKey));
    if (!addsTxt) return base;
    return base + (base ? '\n\n' : '') + addsTxt;
  }

  function parseDateLike(r) {
    var raw = (r && (r.datetime || r.date)) || '';
    var d = null;
    if (typeof raw === 'string') {
      var m1 = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{1,2}):(\d{2})/);
      if (m1) d = new Date(+m1[1], +m1[2] - 1, +m1[3], +m1[4], +m1[5]);
      if (!d || isNaN(d.getTime())) {
        var m2 = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m2) d = new Date(+m2[1], +m2[2] - 1, +m2[3]);
      }
    }
    if (!d || isNaN(d.getTime())) d = new Date();
    return d;
  }

  function splitYmd(str) {
    if (!str) return { y: '', m: '', d: '' };
    var p = String(str).split(/[-/年\/月\/日]/).filter(Boolean);
    if (p.length >= 3) return { y: p[0], m: String(+p[1] || p[1]), d: String(+p[2] || p[2]) };
    var m = String(str).match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m) return { y: m[1], m: String(+m[2]), d: String(+m[3]) };
    return { y: '', m: '', d: '' };
  }

  function splitExp(exp) {
    if (!exp) return { y: '', m: '' };
    var p = String(exp).split('-');
    return { y: p[0] || '', m: p[1] || '' };
  }

  function escXml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * sheet1.xml 内の <c r="ADDR" s="N"/> 自己終了セルを、値を持つセルに置換。
   * type: 'n' = number, 's' = inlineStr
   * 既存セルが見つからない場合は何もしない（テンプレートに無い座標は無視）。
   */
  function setCellXml(xml, addr, value, type) {
    if (value == null || value === '') return xml;
    var v = type === 'n' ? String(value) : escXml(stripMerge(String(value)));
    if (v === '') return xml;

    // 自己終了タグ: <c r="K11" s="52"/>  →  値ありセルに置換
    var selfClose = new RegExp('<c\\s+r="' + addr + '"([^/>]*)\\s*/>');
    var openClose = new RegExp('<c\\s+r="' + addr + '"([^>]*?)>([^<]*(?:<(?!c\\s)[^<]*)*?)</c>');

    var inner;
    if (type === 'n') {
      inner = '<v>' + v + '</v>';
    } else {
      inner = '<is><t xml:space="preserve">' + v + '</t></is>';
    }

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
    // テンプレートに該当座標が無い → スキップ
    return xml;
  }

  function setStr(xmlRef, addr, value) {
    if (value == null || value === '') return;
    xmlRef.s = setCellXml(xmlRef.s, addr, value, 's');
  }
  function setNum(xmlRef, addr, value) {
    if (value == null || value === '') return;
    var n = Number(value);
    if (isNaN(n)) {
      setStr(xmlRef, addr, value);
      return;
    }
    xmlRef.s = setCellXml(xmlRef.s, addr, n, 'n');
  }

  /**
   * 災害報告 1件 r の値を sheet1.xml の文字列に流し込んで返す。
   * @param {string} sheetXml - sheet1.xml の元の文字列
   * @param {object} r - 災害報告レコード
   * @returns {string} 値を埋め込んだ sheet1.xml
   */
  global.disasterFillSheet1Xml = function (sheetXml, r) {
    if (!sheetXml || !r) return sheetXml;
    var ref = { s: sheetXml };

    // 災害日時 (row 11)
    var d = parseDateLike(r);
    setNum(ref, 'K11', d.getFullYear());
    setNum(ref, 'P11', d.getMonth() + 1);
    setNum(ref, 'S11', d.getDate());
    setStr(ref, 'W11', WD_JA[d.getDay()]);
    setNum(ref, 'Y11', d.getHours());
    setNum(ref, 'AB11', d.getMinutes());

    // 工事件名・場所・住所
    setStr(ref, 'H9', r.keigen);
    setStr(ref, 'H13', r.basho || r.place);
    setStr(ref, 'V13', valueWithAddenda(r, 'basho_jusho', r.basho_jusho));
    setStr(ref, 'I15', r.jusho);

    // 被災者
    setStr(ref, 'H17', r.victim);
    if (r.age != null && r.age !== '') setNum(ref, 'Q17', r.age);
    var b = splitYmd(r.birth);
    if (b.y) setNum(ref, 'U17', b.y);
    if (b.m) setNum(ref, 'Y17', b.m);
    if (b.d) setNum(ref, 'AB17', b.d);

    // 職種・雇入年月日・経験年数
    setStr(ref, 'I19', r.victim_dept);
    var h = splitYmd(r.hire_date);
    if (h.y) setNum(ref, 'I21', h.y);
    if (h.m) setNum(ref, 'N21', h.m);
    if (h.d) setNum(ref, 'Q21', h.d);
    var ex = splitExp(r.exp);
    if (ex.y) setNum(ref, 'Z21', ex.y);
    if (ex.m) setNum(ref, 'AC21', ex.m);

    // 傷病・病院・後遺症・休業
    setStr(ref, 'I23', valueWithAddenda(r, 'shobyomei', r.shobyomei));
    setStr(ref, 'I25', r.byoin);
    setStr(ref, 'T25', r.koui);
    if (r.kyugyo_days != null && r.kyugyo_days !== '') setNum(ref, 'R27', r.kyugyo_days);
    if (r.kyugyo_yen != null && r.kyugyo_yen !== '') setNum(ref, 'AA27', r.kyugyo_yen);

    // 現認者
    setStr(ref, 'Q29', r.shokumei);
    setStr(ref, 'X29', r.gennin_name);

    // 災害発生状況（承認者追記を結合）
    setStr(ref, 'AI12', valueWithAddenda(r, 'basho_detail', r.basho_detail));
    setStr(ref, 'AI19', valueWithAddenda(r, 'sagyo', r.sagyo));
    setStr(ref, 'AI26', valueWithAddenda(r, 'genin_busshi', r.genin_busshi));
    setStr(ref, 'AI36', valueWithAddenda(r, 'genin_jin', r.genin_jin));
    setStr(ref, 'AI42', valueWithAddenda(r, 'kekka', r.kekka));

    // 教訓 (人・設備・管理) — 左欄（承認者追記を結合）
    setStr(ref, 'D32', valueWithAddenda(r, 'kyukun_person', r.kyukun_person));
    setStr(ref, 'D40', valueWithAddenda(r, 'kyukun_equip', r.kyukun_equip));
    setStr(ref, 'D47', valueWithAddenda(r, 'kyukun_mgmt', r.kyukun_mgmt));

    // こうすればよかった・対策（承認者追記を結合 + 欄未指定の追記は対策に集約）
    setStr(ref, 'AG48', valueWithAddenda(r, 'kaizen_honin', r.kaizen_honin));
    setStr(ref, 'AV48', valueWithAddenda(r, 'kaizen_kantoku', r.kaizen_kantoku));
    var taisakuVal = valueWithAddenda(r, 'taisaku', r.taisaku);
    var looseAdds = formatAddendaBlocks(r, getLooseAddenda(r));
    if (looseAdds) {
      taisakuVal = (taisakuVal ? taisakuVal + '\n\n' : '') + looseAdds;
    }
    setStr(ref, 'BL47', taisakuVal);

    // 労災原因分類
    setStr(ref, 'C55', r.kiinbutsu);
    setStr(ref, 'I55', r.fuanzen);
    setStr(ref, 'O55', r.fuanzen_kodo);
    setStr(ref, 'U55', r.jiko);
    setStr(ref, 'AA55', r.kanri);

    // 記入日・責任者
    var rep = splitYmd(r.report_date);
    if (rep.y) setNum(ref, 'BN61', rep.y);
    if (rep.m) setNum(ref, 'BS61', rep.m);
    if (rep.d) setNum(ref, 'BV61', rep.d);
    setStr(ref, 'BR63', r.sekininsha || r.reporter);

    return ref.s;
  };

  /**
   * JSZip で開いた xlsm の sheet1.xml に値を流し込む。
   * @param {JSZip} zip - JSZip.loadAsync で得たインスタンス
   * @param {object} r - 災害報告レコード
   * @returns {Promise<JSZip>}
   */
  global.disasterFillOfficialTemplateZip = function (zip, r) {
    if (!zip || !r) return Promise.reject(new Error('zip or r missing'));
    var sheetEntry = zip.file(SHEET_PATH);
    if (!sheetEntry) return Promise.reject(new Error('sheet1.xml not found in template'));
    return sheetEntry.async('string').then(function (xml) {
      var filled = global.disasterFillSheet1Xml(xml, r);
      zip.file(SHEET_PATH, filled);
      return zip;
    });
  };

  /** 旧API互換 (SheetJS 用) — 後方互換のため残すが、推奨は disasterFillOfficialTemplateZip */
  global.disasterFillOfficialTemplate = function (wb, r) {
    if (!wb || !wb.Sheets || !r) return false;
    var ws = wb.Sheets['入力用紙'];
    if (!ws) return false;
    if (typeof global.XLSX === 'undefined' || !global.XLSX.utils || !global.XLSX.utils.sheet_add_aoa) return false;
    var addAOA = global.XLSX.utils.sheet_add_aoa;
    function setCell(addr, v) {
      if (v == null || v === '') return;
      addAOA(ws, [[stripMerge(String(v))]], { origin: addr });
    }
    function setNumCompat(addr, v) {
      if (v == null || v === '') return;
      var n = Number(v);
      if (isNaN(n)) {
        setCell(addr, v);
        return;
      }
      addAOA(ws, [[n]], { origin: addr });
    }
    var d = parseDateLike(r);
    setNumCompat('K11', d.getFullYear());
    setNumCompat('P11', d.getMonth() + 1);
    setNumCompat('S11', d.getDate());
    setCell('W11', WD_JA[d.getDay()]);
    setNumCompat('Y11', d.getHours());
    setNumCompat('AB11', d.getMinutes());
    setCell('H9', r.keigen);
    setCell('H13', r.basho || r.place);
    setCell('V13', r.basho_jusho);
    setCell('I15', r.jusho);
    setCell('H17', r.victim);
    if (r.age != null && r.age !== '') setNumCompat('Q17', r.age);
    var b = splitYmd(r.birth);
    if (b.y) setNumCompat('U17', b.y);
    if (b.m) setNumCompat('Y17', b.m);
    if (b.d) setNumCompat('AB17', b.d);
    setCell('I19', r.victim_dept);
    var h = splitYmd(r.hire_date);
    if (h.y) setNumCompat('I21', h.y);
    if (h.m) setNumCompat('N21', h.m);
    if (h.d) setNumCompat('Q21', h.d);
    var ex = splitExp(r.exp);
    if (ex.y) setNumCompat('Z21', ex.y);
    if (ex.m) setNumCompat('AC21', ex.m);
    setCell('I23', r.shobyomei);
    setCell('I25', r.byoin);
    setCell('T25', r.koui);
    if (r.kyugyo_days != null && r.kyugyo_days !== '') setNumCompat('R27', r.kyugyo_days);
    if (r.kyugyo_yen != null && r.kyugyo_yen !== '') setNumCompat('AA27', r.kyugyo_yen);
    setCell('Q29', r.shokumei);
    setCell('X29', r.gennin_name);
    setCell('AI12', r.basho_detail);
    setCell('AI19', r.sagyo);
    setCell('AI26', r.genin_busshi);
    setCell('AI36', r.genin_jin);
    setCell('AI42', r.kekka);
    setCell('D32', r.kyukun_person);
    setCell('D40', r.kyukun_equip);
    setCell('D47', r.kyukun_mgmt);
    setCell('AG48', r.kaizen_honin);
    setCell('AV48', r.kaizen_kantoku);
    setCell('BL47', r.taisaku);
    setCell('C55', r.kiinbutsu);
    setCell('I55', r.fuanzen);
    setCell('O55', r.fuanzen_kodo);
    setCell('U55', r.jiko);
    setCell('AA55', r.kanri);
    var rep = splitYmd(r.report_date);
    if (rep.y) setNumCompat('BN61', rep.y);
    if (rep.m) setNumCompat('BS61', rep.m);
    if (rep.d) setNumCompat('BV61', rep.d);
    setCell('BR63', r.sekininsha || r.reporter);
    return true;
  };

  /** テンプレートを相対パスで解決（同一フォルダ・templates 配下） */
  global.disasterOfficialTemplateUrls = function () {
    var base = '';
    try {
      var s = document.querySelector('script[src*="disaster-export"]');
      if (s && s.src) base = s.src.replace(/[^/]+$/, '');
    } catch (e) {}
    return [
      base + 'templates/4_災害事故発生報告書.xlsm',
      'templates/4_災害事故発生報告書.xlsm',
      './templates/4_災害事故発生報告書.xlsm',
    ];
  };
})(window);
