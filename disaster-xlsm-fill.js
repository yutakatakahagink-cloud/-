/**
 * 社内様式「4_災害事故発生報告書.xlsm」の「入力用紙」シートへ値を流し込む（SheetJS 利用時）
 * セル位置はテンプレート（入力例シート）から特定。マクロ・別シート（mst）はそのまま保持。
 */
(function (global) {
  'use strict';

  var SHEET_NAME = '入力用紙';
  var WD_JA = ['日', '月', '火', '水', '木', '金', '土'];

  function stripMerge(s) {
    var MERGE = '\n\n────────\n【承認者追記】';
    var t = String(s != null ? s : '');
    var i = t.indexOf(MERGE);
    return i === -1 ? t : t.slice(0, i);
  }

  function setCell(ws, addr, v) {
    if (v == null || v === '') return;
    var s = stripMerge(String(v));
    if (!s) return;
    if (typeof global.XLSX === 'undefined' || !global.XLSX.utils || !global.XLSX.utils.sheet_add_aoa) return;
    global.XLSX.utils.sheet_add_aoa(ws, [[s]], { origin: addr });
  }

  function setNum(ws, addr, v) {
    if (v == null || v === '') return;
    var n = Number(v);
    if (isNaN(n)) {
      setCell(ws, addr, v);
      return;
    }
    global.XLSX.utils.sheet_add_aoa(ws, [[n]], { origin: addr });
  }

  function parseDateLike(r) {
    var raw = r.datetime || r.date || '';
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

  /**
   * @param {object} wb - XLSX.read の戻り workbook
   * @param {object} r - 災害報告1件
   * @returns {boolean}
   */
  global.disasterFillOfficialTemplate = function (wb, r) {
    if (!wb || !wb.Sheets || !r) return false;
    var ws = wb.Sheets[SHEET_NAME];
    if (!ws) return false;

    var d = parseDateLike(r);
    setNum(ws, 'K11', d.getFullYear());
    setNum(ws, 'P11', d.getMonth() + 1);
    setNum(ws, 'S11', d.getDate());
    setCell(ws, 'W11', WD_JA[d.getDay()]);
    setNum(ws, 'Y11', d.getHours());
    setNum(ws, 'AB11', d.getMinutes());

    setCell(ws, 'H9', r.keigen);
    setCell(ws, 'H13', r.basho || r.place);
    setCell(ws, 'V13', r.basho_jusho);
    setCell(ws, 'I15', r.jusho);
    setCell(ws, 'H17', r.victim);
    if (r.age != null && r.age !== '') setNum(ws, 'Q17', r.age);
    var b = splitYmd(r.birth);
    if (b.y) setNum(ws, 'U17', b.y);
    if (b.m) setNum(ws, 'Y17', b.m);
    if (b.d) setNum(ws, 'AB17', b.d);

    setCell(ws, 'I19', r.victim_dept);
    var h = splitYmd(r.hire_date);
    if (h.y) setNum(ws, 'I21', h.y);
    if (h.m) setNum(ws, 'N21', h.m);
    if (h.d) setNum(ws, 'Q21', h.d);
    var ex = splitExp(r.exp);
    if (ex.y) setNum(ws, 'Z21', ex.y);
    if (ex.m) setNum(ws, 'AC21', ex.m);

    setCell(ws, 'I23', r.shobyomei);
    setCell(ws, 'I25', r.byoin);
    setCell(ws, 'T25', r.koui);
    if (r.kyugyo_days != null && r.kyugyo_days !== '') setNum(ws, 'R27', r.kyugyo_days);
    if (r.kyugyo_yen != null && r.kyugyo_yen !== '') setNum(ws, 'AA27', r.kyugyo_yen);

    setCell(ws, 'Q29', r.shokumei);
    setCell(ws, 'X29', r.gennin_name);

    setCell(ws, 'AI12', r.basho_detail);
    setCell(ws, 'AI19', r.sagyo);
    setCell(ws, 'AI26', r.genin_busshi);
    setCell(ws, 'AI31', r.kyukun_person);
    setCell(ws, 'D32', r.kyukun_person);
    setCell(ws, 'AI36', r.genin_jin);
    setCell(ws, 'D40', r.kyukun_equip);
    setCell(ws, 'AI42', r.kekka);
    setCell(ws, 'D47', r.kyukun_mgmt);

    setCell(ws, 'AG48', r.kaizen_honin);
    setCell(ws, 'AV48', r.kaizen_kantoku);
    setCell(ws, 'BL47', r.taisaku);

    setCell(ws, 'C55', r.kiinbutsu);
    setCell(ws, 'I55', r.fuanzen);
    setCell(ws, 'O55', r.fuanzen_kodo);
    setCell(ws, 'U55', r.jiko);
    setCell(ws, 'AA55', r.kanri);

    var rep = splitYmd(r.report_date);
    if (rep.y) setNum(ws, 'BN61', rep.y);
    if (rep.m) setNum(ws, 'BS61', rep.m);
    if (rep.d) setNum(ws, 'BV61', rep.d);
    setCell(ws, 'BR63', r.sekininsha || r.reporter);

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
