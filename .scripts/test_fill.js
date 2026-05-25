// JSZip でテンプレートにダミーデータを埋め込み、出力 .xlsm を作る検証スクリプト
const fs = require('fs');
const path = require('path');

(async () => {
  const tplPath = path.join(__dirname, '..', 'templates', '4_災害事故発生報告書.xlsm');
  const buf = fs.readFileSync(tplPath);

  // disaster-xlsm-fill.js を読み込んで window 名前空間相当を作る
  const fillSrc = fs.readFileSync(path.join(__dirname, '..', 'disaster-xlsm-fill.js'), 'utf8');
  const win = {};
  // ライブラリ用のwindow代用
  const wrapped = '(function(global){' + fillSrc.replace('(window)', '(global)').replace('(function (global) {', 'return function(global){') + 'return global;}(arguments[0]))';
  // 簡易: eval で disaster-xlsm-fill.js の関数群を win に登録
  (new Function('window', fillSrc.replace('(window)', '(window)')))(win);

  // JSZipはこの環境では無いので、Node の zip ライブラリで代替
  let JSZip;
  try { JSZip = require('jszip'); }
  catch(e){ console.error('JSZip not installed. Run: npm install jszip --no-save'); process.exit(2); }

  const zip = await JSZip.loadAsync(buf);
  const sheetXml = await zip.file('xl/worksheets/sheet1.xml').async('string');

  const sample = {
    datetime: '2026-04-16T16:46',
    keigen: '○○本社新築工事',
    basho: '宮崎県宮崎市佐土原町',
    basho_jusho: '宮崎県宮崎市佐土原町',
    jusho: '宮崎県宮崎市XX町1-2-3',
    victim: 'テスト太郎',
    age: 35,
    birth: '1990-05-15',
    victim_dept: '土木技能工',
    hire_date: '2020-04-01',
    exp: '5-2',
    shobyomei: '右手指挫創',
    byoin: 'テスト病院',
    koui: '無',
    basho_detail: '駐車場の段差で',
    sagyo: '工具を運搬しているとき',
    genin_busshi: '段差を見落としていたため',
    genin_jin: '注意不足',
    kekka: '転倒し負傷',
    kyukun_person: '段差確認の徹底',
    kyukun_equip: '段差注意表示の追加',
    kyukun_mgmt: '安全教育の見直し',
    kaizen_honin: '足元確認をすべきだった',
    kaizen_kantoku: '事前指示を強化すべき',
    taisaku: '段差注意ステッカー貼付・KY実施徹底',
    kiinbutsu: '段差',
    fuanzen: '保護具の不備',
    fuanzen_kodo: '不安全動作',
    jiko: '転倒',
    kanri: '安全管理欠陥',
    report_date: '2026-04-16',
    sekininsha: 'テスト責任者',
  };

  const filled = win.disasterFillSheet1Xml(sheetXml, sample);
  zip.file('xl/worksheets/sheet1.xml', filled);

  const outBuf = await zip.generateAsync({
    type: 'nodebuffer',
    mimeType: 'application/vnd.ms-excel.sheet.macroEnabled.12',
    compression: 'DEFLATE',
  });

  const outPath = path.join(require('os').tmpdir(), 'test_filled.xlsm');
  fs.writeFileSync(outPath, outBuf);

  // 検証: 構造比較
  const orig = await JSZip.loadAsync(buf);
  const filled2 = await JSZip.loadAsync(outBuf);
  const origNames = Object.keys(orig.files).sort();
  const filledNames = Object.keys(filled2.files).sort();
  const missing = origNames.filter(n => !filledNames.includes(n));
  const extra = filledNames.filter(n => !origNames.includes(n));

  console.log('Source size :', buf.length);
  console.log('Output size :', outBuf.length);
  console.log('Output path :', outPath);
  console.log('Files in src:', origNames.length);
  console.log('Files in out:', filledNames.length);
  console.log('Missing in out:', missing);
  console.log('Extra in out :', extra);

  // sheet1.xml を比較
  const out_sheet1 = await filled2.file('xl/worksheets/sheet1.xml').async('string');
  const k11Match = out_sheet1.match(/<c r="K11"[^>]*>(.*?)<\/c>/);
  console.log('K11 in output:', k11Match ? k11Match[0].substring(0,140) : 'NOT FOUND');
  const h17Match = out_sheet1.match(/<c r="H17"[^>]*>(.*?)<\/c>/);
  console.log('H17 in output:', h17Match ? h17Match[0].substring(0,140) : 'NOT FOUND');

  // VBA 保持確認
  const vba = await filled2.file('xl/vbaProject.bin');
  if (vba) {
    const vbaBuf = await vba.async('nodebuffer');
    console.log('vbaProject.bin preserved:', vbaBuf.length, 'bytes');
  } else {
    console.log('vbaProject.bin: MISSING ✗');
  }
  // 入力例 (sheet2) は手を加えていない
  const sheet2Out = await filled2.file('xl/worksheets/sheet2.xml').async('string');
  const sheet2Orig = await orig.file('xl/worksheets/sheet2.xml').async('string');
  console.log('sheet2.xml unchanged:', sheet2Out === sheet2Orig ? 'YES ✓' : 'CHANGED ✗');
})();
