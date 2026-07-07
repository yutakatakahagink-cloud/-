/**
 * 災害発生報告の Excel / PDF エクスポート（管理者・所有者画面のみ読み込み想定）
 * Excel: SheetJS (XLSX) が読み込まれていれば .xlsx、無ければ UTF-8 CSV
 * PDF: 印刷ダイアログで「PDFに保存」（ブラウザ標準）／帳票は disasterBuildDetailHtml(..., { exportMode:true }) 相当
 */
(function (global) {
  'use strict';

  var MERGE = '\n\n────────\n【承認者追記】';

  function stripMerge(s) {
    var t = String(s != null ? s : '');
    var i = t.indexOf(MERGE);
    return i === -1 ? t : t.slice(0, i);
  }

  function cellStr(v) {
    if (v == null) return '';
    if (typeof v === 'object') {
      try {
        return JSON.stringify(v);
      } catch (e) {
        return String(v);
      }
    }
    return String(v);
  }

  /** 帳票・エクセル用の全項目（左: ラベル、右: 値） */
  var FIELD_ORDER = [
    ['id', '報告ID'],
    ['form', 'フォーム種別'],
    ['status', '記録ステータス'],
    ['date', '登録日(システム)'],
    ['keigen', '工事件名'],
    ['basho', '災害場所'],
    ['place', '発生場所(携帯フォーム)'],
    ['basho_jusho', '住所(災害・帳票)'],
    ['jusho', '被災者住所'],
    ['datetime', '災害日時'],
    ['victim', '被災者氏名'],
    ['age', '年齢'],
    ['birth', '生年月日'],
    ['victim_dept', '職種・所属'],
    ['hire_date', '雇入年月日'],
    ['exp', '経験年数'],
    ['shobyomei', '傷病名(損害状況)'],
    ['byoin', '病院名'],
    ['koui', '後遺症'],
    ['kyugyo', '休業見込・損害見込額'],
    ['kyugyo_type', '休業区分'],
    ['kyugyo_days', '休業日数'],
    ['kyugyo_yen', '損害金額(円)'],
    ['gennin_aru', '現認者 有無'],
    ['gennin', '現認者(旧)'],
    ['shokumei', '現認者 職名'],
    ['gennin_name', '現認者 氏名'],
    ['kyukun_person', '教訓(人)'],
    ['kyukun_equip', '教訓(設備)'],
    ['kyukun_mgmt', '教訓(管理)'],
    ['kiinbutsu', '起因物'],
    ['fuanzen', '不安全状態'],
    ['fuanzen_kodo', '不安全行動'],
    ['jiko', '事故の型'],
    ['kanri', '管理の欠陥'],
    ['basho_detail', '発生状況・場所'],
    ['sagyo', '発生状況・作業'],
    ['genin_busshi', '原因・物環境'],
    ['genin_jin', '原因・人的'],
    ['kekka', '結果'],
    ['kaizen_honin', 'こうすればよかった(本人)'],
    ['kaizen_kantoku', 'こうすればよかった(監督者)'],
    ['taisaku', '対策'],
    ['report_date', '記入日'],
    ['sekininsha', '記入者'],
    ['reporter', '報告者'],
    ['gyoshu', '（携帯）事業の種類'],
    ['jigyosho', '（携帯）事業場名'],
    ['address', '（携帯）事業場所在地'],
    ['workers', '（携帯）労働者数'],
    ['machine', '（携帯）機器等の種類'],
    ['type', '（携帯）事故の種類'],
    ['human_damage', '（携帯）人的被害'],
    ['material_damage', '（携帯）物的被害'],
    ['situation', '（携帯）発生状況'],
    ['cause', '（携帯）発生原因'],
    ['measure', '（携帯）再発防止措置'],
    ['wf_sender_email', 'ワークフロー送信者メール'],
  ];

  function situationImgNote(r) {
    var imgs = r.situation_imgs && r.situation_imgs.length ? r.situation_imgs : r.situation_img ? [r.situation_img] : [];
    if (!imgs.length) return '';
    return imgs.length + '枚（画像データはPDFで表示。Excelでは枚数のみ）';
  }

  function wfRows(r) {
    var out = [];
    if (!r || !r.wf) return out;
    var w = r.wf;
    out.push(['— ワークフロー —', '']);
    out.push(['WF状態', cellStr(w.state)]);
    out.push(['WF段階インデックス', cellStr(w.step)]);
    out.push(['差戻しコメント', cellStr(w.returnNote)]);
    if (w.steps && w.steps.length) {
      try {
        out.push(['承認段階設定', JSON.stringify(w.steps)]);
      } catch (e) {
        out.push(['承認段階設定', '']);
      }
    }
    if (w.history && w.history.length) {
      try {
        out.push(['履歴', JSON.stringify(w.history, null, 0)]);
      } catch (e2) {
        out.push(['履歴', '']);
      }
    }
    if (w.report_addenda && w.report_addenda.length) {
      try {
        out.push(['追記・訂正一覧', JSON.stringify(w.report_addenda, null, 0)]);
      } catch (e3) {
        out.push(['追記・訂正一覧', '']);
      }
    }
    if (w.stamps && w.stamps.length) {
      try {
        out.push(['承認スタンプ', JSON.stringify(w.stamps, null, 0)]);
      } catch (e4) {
        out.push(['承認スタンプ', '']);
      }
    }
    return out;
  }

  global.disasterExportTwoColumnRows = function (r) {
    if (!r) return [['項目', '内容']];
    var rows = [['項目', '内容']];
    var seen = Object.create(null);
    FIELD_ORDER.forEach(function (pair) {
      var k = pair[0];
      var lab = pair[1];
      seen[k] = true;
      var raw = r[k];
      var text = k === 'id' || k === 'age' || k === 'workers' ? cellStr(raw) : stripMerge(cellStr(raw));
      rows.push([lab, text]);
    });
    rows.push(['発生状況図', situationImgNote(r)]);
    wfRows(r).forEach(function (x) {
      rows.push(x);
    });
    Object.keys(r).forEach(function (k) {
      if (seen[k] || k === 'wf' || k === 'situation_imgs' || k === 'situation_img') return;
      seen[k] = true;
      rows.push(['その他:' + k, stripMerge(cellStr(r[k]))]);
    });
    return rows;
  };

  global.disasterExportSafeFileBase = function (r) {
    var id = r && r.id != null ? String(r.id) : 'report';
    var d = (r && (r.date || r.datetime)) ? String(r.date || r.datetime).replace(/[^\d]/g, '').slice(0, 8) : '';
    return '災害事故発生報告_' + id + (d ? '_' + d : '');
  };

  /** テンプレ取得失敗時: 2列シート＋案内（.xlsx） */
  function disasterExportDownloadFallbackTwoColumn(r, base) {
    var rows = global.disasterExportTwoColumnRows(r);
    if (typeof global.XLSX !== 'undefined' && global.XLSX.utils && global.XLSX.utils.aoa_to_sheet) {
      var wb = global.XLSX.utils.book_new();
      var ws = global.XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 28 }, { wch: 80 }];
      global.XLSX.utils.book_append_sheet(wb, ws, '報告書');
      var noteRows = [
        ['補足'],
        ['公式様式（4_災害事故発生報告書.xlsm）のコピーを templates/ に置けない場合は、このシートが出力されます。'],
      ];
      var wsNote = global.XLSX.utils.aoa_to_sheet(noteRows);
      wsNote['!cols'] = [{ wch: 96 }];
      global.XLSX.utils.book_append_sheet(wb, wsNote, '様式について');
      global.XLSX.writeFile(wb, base + '.xlsx');
      return;
    }
    var csv = rows
      .map(function (row) {
        return row
          .map(function (c) {
            return '"' + String(c).replace(/"/g, '""') + '"';
          })
          .join(',');
      })
      .join('\r\n');
    var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = base + '.csv';
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 4000);
    if (typeof global.XLSX === 'undefined') {
      alert('Excel用ライブラリを読み込めなかったため、CSVでダウンロードしました。');
    }
  }

  /**
   * Excel 出力（PDFと同じ3列レイアウトをそのまま再現）
   *
   * 設計変更（2026-05-20）:
   *   従来の「公式 .xlsm テンプレートを JSZip で埋める方式」は、テンプレート
   *   配信失敗時に箇条書きフォールバックが発生する／ユーザー要望（PDFと同じ
   *   見た目）と層も別だったため取りやめた。
   *   代わりに disasterBuildExcelHtml(r) が生成する <table> ベースの HTML を
   *   Office HTML 名前空間で包んで application/vnd.ms-excel 形式の .xls として
   *   保存する。Excel は HTML を読み込めるため、PDF と同じ 3 列レイアウト・
   *   ボーダー・背景色などがそのまま反映される。
   *   ※ Excel 起動時に「形式と拡張子が一致しません」と表示されるが「はい」で開ける。
   *   ※ 旧 .xlsm 方式が必要な場合は disasterExportDownloadExcelOfficialTemplate
   *     を直接呼ぶことで利用可能（コード上は保持）。
   */
  global.disasterExportDownloadExcel = function (r) {
    if (!r) return;
    var base = global.disasterExportSafeFileBase(r);
    if (typeof global.disasterBuildExcelHtml !== 'function') {
      // disaster-detail-html.js が古い場合のフォールバック
      disasterExportDownloadFallbackTwoColumn(r, base);
      return;
    }
    var bodyHtml = global.disasterBuildExcelHtml(r);
    var title = 'D' + (r.id != null ? r.id : '');
    var html =
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
      'xmlns:x="urn:schemas-microsoft-com:office:excel" ' +
      'xmlns="http://www.w3.org/TR/REC-html40">' +
      '<head><meta charset="UTF-8">' +
      '<meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">' +
      '<title>' + title + '</title>' +
      '<!--[if gte mso 9]><xml>' +
      '<x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>' +
      '<x:Name>災害発生報告</x:Name>' +
      '<x:WorksheetOptions>' +
      '<x:PageSetup><x:Layout x:Orientation="Landscape"/><x:PageMargins x:Bottom="0.3" x:Left="0.3" x:Right="0.3" x:Top="0.3"/></x:PageSetup>' +
      '<x:Print><x:FitWidth>1</x:FitWidth><x:FitHeight>1</x:FitHeight><x:ValidPrinterInfo/></x:Print>' +
      '<x:DisplayGridlines/>' +
      '</x:WorksheetOptions>' +
      '</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>' +
      '</xml><![endif]-->' +
      '<style>td{vertical-align:top;mso-number-format:"\\@"}br{mso-data-placement:same-cell}</style>' +
      '</head><body>' + bodyHtml + '</body></html>';
    var blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = base + '.xls';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      try { a.parentNode.removeChild(a); } catch (e) {}
    }, 4000);
  };

  /**
   * 旧方式（公式 .xlsm テンプレートを JSZip で埋めてダウンロード）。
   * 通常は使われない。disasterExportDownloadExcel を上書きしているが、
   * 「公式様式の Excel が欲しい」という用途で残してある。
   */
  global.disasterExportDownloadExcelOfficialTemplate = function (r) {
    if (!r) return;
    var base = global.disasterExportSafeFileBase(r);
    var hasJSZip = typeof global.JSZip !== 'undefined';
    var hasFiller = typeof global.disasterFillOfficialTemplateZip === 'function';
    if (!hasJSZip || !hasFiller) {
      disasterExportDownloadFallbackTwoColumn(r, base);
      return;
    }
    var urls =
      typeof global.disasterOfficialTemplateUrls === 'function'
        ? global.disasterOfficialTemplateUrls()
        : ['templates/4_災害事故発生報告書.xlsm'];

    function triggerDownload(blob, filename) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        URL.revokeObjectURL(a.href);
        try { a.parentNode.removeChild(a); } catch (e) {}
      }, 4000);
    }

    function fallback(msg) {
      if (msg) alert(msg);
      disasterExportDownloadFallbackTwoColumn(r, base);
    }

    function tryUrl(i) {
      if (i >= urls.length) {
        fallback(
          '公式様式（templates/4_災害事故発生報告書.xlsm）を読み込めませんでした。\n' +
          'GitHub Pages 配下に templates フォルダがデプロイされていない可能性があります。'
        );
        return;
      }
      fetch(urls[i], { credentials: 'same-origin', cache: 'no-store' })
        .then(function (res) {
          if (!res.ok) throw new Error('http ' + res.status);
          return res.arrayBuffer();
        })
        .then(function (buf) { return global.JSZip.loadAsync(buf); })
        .then(function (zip) { return global.disasterFillOfficialTemplateZip(zip, r); })
        .then(function (zip) {
          return zip.generateAsync({
            type: 'blob',
            mimeType: 'application/vnd.ms-excel.sheet.macroEnabled.12',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 },
          });
        })
        .then(function (blob) {
          triggerDownload(blob, base + '.xlsm');
        })
        .catch(function (err) {
          console.warn('[disaster-export] template fill failed:', err);
          tryUrl(i + 1);
        });
    }
    tryUrl(0);
  };

  global.disasterExportOpenPrintPdf = function (r) {
    if (!r) return;
    var h =
      typeof global.disasterBuildDetailHtml === 'function'
        ? global.disasterBuildDetailHtml(r, { exportMode: true })
        : '<p>詳細を生成できませんでした。</p>';
    if (typeof global.disasterWrapDetailWithStamps === 'function') {
      h = global.disasterWrapDetailWithStamps(h, r);
    }
    var ex = '';
    if (typeof global.disasterWfStatusBanner === 'function') ex += global.disasterWfStatusBanner(r);
    if (typeof global.disasterWfHistoryHtml === 'function') ex += global.disasterWfHistoryHtml(r);
    var title = '災害事故発生報告_' + (r.id != null ? r.id : '');
    var pdfCss =
      'html,body{margin:0;padding:0;color:#111;font-family:Meiryo,MS PGothic,sans-serif}' +
      '#dis-pdf-viewport{width:420mm;min-height:297mm;box-sizing:border-box;padding:4mm;margin:0 auto;background:#fff}' +
      '#dis-pdf-root{transform-origin:top left;box-sizing:border-box}' +
      '#dis-pdf-root img{max-height:38mm!important;max-width:48mm!important;object-fit:contain;vertical-align:top}' +
      '@media print{@page{size:A3 landscape;margin:6mm}body,html{width:100%;height:100%}' +
      '.no-print{display:none!important}#dis-pdf-viewport{padding:0;width:auto;min-height:0}' +
      'body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}';
    var pdfJs =
      'function disPdfScale(){' +
      "var vp=document.getElementById('dis-pdf-viewport');" +
      "var root=document.getElementById('dis-pdf-root');" +
      'if(!vp||!root){window.print();return}' +
      'root.style.transform="";' +
      'var sw=root.scrollWidth,sh=root.scrollHeight;' +
      'var bw=vp.clientWidth,bh=vp.clientHeight;' +
      'if(bw<10||bh<10){bw=window.innerWidth;bh=window.innerHeight}' +
      'var sc=Math.min((bw-4)/sw,(bh-4)/sh,1);' +
      'if(sc<1){root.style.transform="scale("+sc+")";}' +
      'setTimeout(function(){window.print()},200);' +
      '}' +
      'window.onload=function(){setTimeout(disPdfScale,80)};';
    var doc =
      '<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>' +
      title +
      '</title><style>' +
      pdfCss +
      '</style></head><body>' +
      '<div id="dis-pdf-viewport"><div id="dis-pdf-root">' +
      h +
      ex +
      '</div></div>' +
      '<p class="no-print" style="margin:12px;font-size:12px;color:#555">用紙サイズは A3 横・1枚に収まるよう縮小しています。印刷ダイアログで「PDFに保存」を選び、用紙が A3 横になっているか確認してください。</p>' +
      '<script>' +
      pdfJs +
      '<\/script></body></html>';
    var w = window.open('', '_blank');
    if (!w) {
      alert('ポップアップがブロックされました。ブラウザで許可してから再度お試しください。');
      return;
    }
    w.document.open();
    w.document.write(doc);
    w.document.close();
  };

  function getDisasterList() {
    if (typeof global.getDisasterListForExport === 'function') {
      var a = global.getDisasterListForExport();
      if (a && a.length) return a;
    }
    return global.DIS_LIST && global.DIS_LIST.length ? global.DIS_LIST : [];
  }

  global.disasterExportExcelFromList = function (id) {
    var list = getDisasterList();
    if (!list || !list.length) {
      alert('一覧データがありません。');
      return;
    }
    var r = list.find(function (x) {
      return String(x.id) === String(id);
    });
    if (!r) {
      alert('該当する報告が見つかりません。');
      return;
    }
    global.disasterExportDownloadExcel(r);
  };

  global.disasterExportPdfFromList = function (id) {
    var list = getDisasterList();
    if (!list || !list.length) {
      alert('一覧データがありません。');
      return;
    }
    var r = list.find(function (x) {
      return String(x.id) === String(id);
    });
    if (!r) {
      alert('該当する報告が見つかりません。');
      return;
    }
    global.disasterExportOpenPrintPdf(r);
  };
})(window);
