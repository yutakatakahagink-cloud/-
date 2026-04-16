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
    ['sekininsha', '責任者'],
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

  global.disasterExportDownloadExcel = function (r) {
    if (!r) return;
    var rows = global.disasterExportTwoColumnRows(r);
    var base = global.disasterExportSafeFileBase(r);
    if (typeof global.XLSX !== 'undefined' && global.XLSX.utils && global.XLSX.utils.aoa_to_sheet) {
      var wb = global.XLSX.utils.book_new();
      var ws = global.XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 28 }, { wch: 80 }];
      global.XLSX.utils.book_append_sheet(wb, ws, '報告書');
      var noteRows = [
        ['紙様式（.xlsm）との関係'],
        [
          '社内の「4_災害事故発生報告書.xlsm」（例: 安全管理室/07_災害関係 配下）がレイアウトの参考です。本ファイルはブラウザから出力した「全項目（項目名・値）」です。マクロやセル結合は含みません。',
        ],
        [''],
        ['Excel と PDF'],
        ['PDF は「印刷→PDFに保存」により、画面の帳票レイアウトに近い形で画像含む出力が可能です。'],
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
      alert('Excel用ライブラリを読み込めなかったため、CSVでダウンロードしました。Excelで開けます。\n（.xlsx が必要な場合はネット接続を確認し、再読み込みしてください）');
    }
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
    var doc =
      '<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>' +
      title +
      '</title><style>body{font-family:Meiryo,MS PGothic,sans-serif;padding:16px;color:#111} @media print{body{padding:8px} .no-print{display:none!important}}</style></head><body>' +
      h +
      ex +
      '<p class="no-print" style="margin-top:16px;font-size:12px;color:#555">印刷ダイアログで「PDFに保存」を選ぶとPDF化できます。終わったらこのタブを閉じてください。</p>' +
      '<script>window.onload=function(){setTimeout(function(){window.print()},300)};<\/script></body></html>';
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
