/**
 * 災害発生報告の詳細HTML（管理者画面・承認用公開画面で共通）
 */
(function (global) {
  'use strict';

  var MERGE_MARKER = '\n\n────────\n【承認者追記】';

  global.disasterBuildDetailHtml = function (r, opts) {
    if (!r) return '';
    opts = opts || {};
    var exportMode = !!opts.exportMode;
    /** 承認画面など：報告の全項目を表示（使用者画面の簡略表示とは別） */
    var showAllFields = !!opts.showAllFields;
    var V = function (v) {
      var s = v != null ? String(v) : '';
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };
    var disImgs = r.situation_imgs && r.situation_imgs.length ? r.situation_imgs : r.situation_img ? [r.situation_img] : [];
    var imgsHtml = disImgs.length
      ? disImgs
          .map(function (src) {
            if (exportMode) {
              return (
                '<img src="' +
                V(src) +
                '" style="max-width:100%;border-radius:6px;margin:4px;page-break-inside:avoid">'
              );
            }
            return (
              '<img src="' +
              V(src) +
              '" onclick="if(typeof showFullPhotoSrc===\'function\')showFullPhotoSrc(this.src)" style="max-width:200px;border-radius:6px;cursor:pointer;margin:4px">'
            );
          })
          .join('')
      : '';
    var isMobile = exportMode ? false : global.innerWidth < 768;
    var bdr = isMobile ? 'border-bottom:1px solid #333;' : 'border-right:1px solid #333;';
    var cols = isMobile ? '1fr' : '1fr 1fr 1fr';
    var row = function (l, v) {
      return (
        '<div style="display:flex;align-items:stretch;border-bottom:1px solid #333;min-height:28px"><div style="flex-shrink:0;width:90px;padding:4px 8px;background:#e8e8e8;border-right:1px solid #333;display:flex;align-items:center;font-size:10pt;line-height:1.3">' +
        l +
        '</div><div style="flex:1;min-width:0;padding:4px 6px;display:flex;align-items:center;background:#fff;font-size:10pt;word-break:break-all">' +
        v +
        '</div></div>'
      );
    };
    var sub = function (l, v) {
      return (
        '<div style="display:flex;align-items:stretch;border-bottom:1px solid #ddd;min-height:28px"><div style="flex-shrink:0;width:70px;padding:4px 6px;background:#f0f0f0;border-right:1px solid #ddd;display:flex;align-items:center;font-size:9.5pt">' +
        l +
        '</div><div style="flex:1;min-width:0;padding:4px 6px;display:flex;align-items:center;background:#fff;font-size:10pt;word-break:break-all">' +
        v +
        '</div></div>'
      );
    };
    var gs = function (l) {
      return (
        '<div style="display:flex;border-bottom:1px solid #333"><div style="flex-shrink:0;width:90px;padding:8px 6px;background:#e8e8e8;border-right:1px solid #333;display:flex;align-items:center;justify-content:center;text-align:center;font-size:9.5pt;line-height:1.4">' +
        l +
        '</div><div style="flex:1;display:flex;flex-direction:column;min-width:0">'
      );
    };
    var ge = '</div></div>';

    function stripSavedApproverMerges(val) {
      var s = String(val != null ? val : '');
      var i = s.indexOf(MERGE_MARKER);
      if (i === -1) return s;
      return s.slice(0, i);
    }

    function isApproverAddendum(e) {
      return e && String(e.role || '').indexOf('承認者') !== -1;
    }

    function adminNameForApproverEmail(em) {
      var need = String(em || '')
        .trim()
        .toLowerCase();
      if (!need) return '';
      try {
        var raw = localStorage.getItem('hh_admins');
        if (!raw) return '';
        var arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return '';
        for (var i = 0; i < arr.length; i++) {
          var a = arr[i];
          if (!a) continue;
          var em = String(a.email || '').trim().toLowerCase();
          var idEm = String(a.id || '').trim().toLowerCase();
          if (em === need || (!em && idEm === need)) {
            var nm = String(a.name || '').trim();
            if (nm) return nm;
          }
        }
      } catch (err) {}
      return '';
    }

    function normalizeParenStr(s) {
      return String(s || '')
        .replace(/\uFF08/g, '(')
        .replace(/\uFF09/g, ')')
        .trim();
    }

    function approverDisplayName(e) {
      var saved = String(e.approver_display_name || '').trim();
      if (saved) return saved;
      var b0 = String(e.by || '').trim();
      if (b0.indexOf('メールリンク') !== -1) {
        b0 = b0.replace(/\s*[\(（]承認者追記[\)）]\s*$/g, '').trim();
      }
      var b = b0;
      var isPh = !b || normalizeParenStr(b) === '(メールリンク)';
      var candEm = String(e.approver_email || '').trim();
      if (!candEm && b.indexOf('@') !== -1) candEm = b;

      var adm = adminNameForApproverEmail(candEm);
      if (!adm && r.wf && Array.isArray(r.wf.steps)) {
        for (var si = 0; si < r.wf.steps.length; si++) {
          var sem = (r.wf.steps[si] && r.wf.steps[si].email) || '';
          adm = adminNameForApproverEmail(sem);
          if (adm) break;
        }
      }
      if (adm) return adm;

      if (b && !isPh && b.indexOf('@') === -1) return b;

      function wfStepLabelForApproverEmail(needRaw) {
        var need =
          typeof global.disasterNormEmail === 'function'
            ? global.disasterNormEmail(needRaw)
            : String(needRaw || '')
                .trim()
                .toLowerCase();
        if (!need || !r.wf || !Array.isArray(r.wf.steps)) return '';
        for (var wi = 0; wi < r.wf.steps.length; wi++) {
          var st = r.wf.steps[wi];
          var se =
            typeof global.disasterNormEmail === 'function'
              ? global.disasterNormEmail(st && st.email)
              : String((st && st.email) || '')
                  .trim()
                  .toLowerCase();
          if (se === need) {
            var lb = String((st && st.label) || '').trim();
            if (lb) return lb;
          }
        }
        return '';
      }
      var needEm = candEm;
      if (!needEm && b.indexOf('@') !== -1) needEm = b;
      var fromRoleM = String(e.role || '').match(/承認者追記[（(]([^）)]+)[）)]/);
      var fromRole = fromRoleM ? fromRoleM[1].trim() : '';
      var wfLab = wfStepLabelForApproverEmail(needEm);
      if (!wfLab) wfLab = fromRole;
      if (wfLab) return wfLab;

      return '承認者（メールリンク）';
    }

    /** ISO（UTC）保存の at を日本標準時で YYYY-MM-DD HH:mm:ss 表示（追記操作の現地時刻に合わせる） */
    function formatAddendaAt(raw) {
      if (raw == null || raw === '') return '';
      var d = new Date(raw);
      if (isNaN(d.getTime())) {
        var s = String(raw);
        return s.length >= 19 ? s.slice(0, 19).replace('T', ' ') : s;
      }
      try {
        var fmt = new Intl.DateTimeFormat('ja-JP', {
          timeZone: 'Asia/Tokyo',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });
        var p = {};
        fmt.formatToParts(d).forEach(function (x) {
          if (x.type !== 'literal') p[x.type] = x.value;
        });
        return p.year + '-' + p.month + '-' + p.day + ' ' + p.hour + ':' + p.minute + ':' + p.second;
      } catch (err) {
        var iso = d.toISOString();
        return iso.slice(0, 19).replace('T', ' ');
      }
    }

    function addendaForFieldUnified(fieldKey) {
      if (!r.wf || !Array.isArray(r.wf.report_addenda)) return '';
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
      if (!out.length) return '';
      return out
        .map(function (e) {
          var at = formatAddendaAt(e.at);
          var who = approverDisplayName(e);
          var txt = String(e.text || '').trim();
          return (
            '<div style="margin-top:8px;padding-top:8px;border-top:1px dashed #E57373;font-size:10pt;white-space:pre-wrap;word-break:break-all">' +
            V(txt) +
            '<span style="font-size:9px;color:#C62828;font-weight:600;display:block;margin-top:6px"> — ' +
            V(who) +
            ' ' +
            V(at) +
            '</span></div>'
          );
        })
        .join('');
    }

    function cellWithApprovals(fieldKey, rawVal) {
      var base = stripSavedApproverMerges(rawVal);
      return V(base) + (fieldKey ? addendaForFieldUnified(fieldKey) : '');
    }

    var ss = function (t, fieldKey, v) {
      return (
        '<div style="padding:6px 10px;border-bottom:1px solid #ddd"><div style="font-weight:bold;font-size:10pt;margin-bottom:4px">' +
        t +
        '</div><div style="font-size:10pt;white-space:pre-wrap;word-break:break-all;min-height:30px;background:#f9f9f9;padding:4px 6px;border-radius:4px">' +
        cellWithApprovals(fieldKey, v) +
        '</div></div>'
      );
    };

    // 管理者・所有者・PDF は簡略表示。承認画面 (showAllFields) のみ全項目を先頭に表示。
    var exportExtra = '';
    if (showAllFields) {
      exportExtra += row('報告ID', V(r.id != null ? r.id : ''));
      exportExtra += row('フォーム種別', V(r.form === 'pc' ? 'PC様式' : r.form || ''));
      exportExtra += row('記録ステータス', V(r.status || ''));
      exportExtra += row('登録日(システム)', V(r.date || ''));
      exportExtra += row('工事件名', V(r.keigen || ''));
      exportExtra += row('災害場所', V(r.basho || r.place || ''));
      exportExtra += row('被災者住所', V(r.jusho || ''));
      exportExtra += row('被災者氏名', V(r.victim || ''));
      exportExtra += row('年齢', V(r.age != null && r.age !== '' ? r.age : ''));
      exportExtra += row('生年月日', V(r.birth || ''));
      exportExtra += row('職種・所属', V(r.victim_dept || ''));
      exportExtra += row('雇入年月日', V(r.hire_date || ''));
      exportExtra += row('経験年数', V(r.exp || ''));
      exportExtra += row('病院名', V(r.byoin || ''));
      exportExtra += row('休業区分', V(r.kyugyo_type || ''));
      exportExtra += row('休業日数', V(r.kyugyo_days != null && r.kyugyo_days !== '' ? r.kyugyo_days : ''));
      exportExtra += row('損害金額(円)', V(r.kyugyo_yen != null && r.kyugyo_yen !== '' ? r.kyugyo_yen : ''));
      exportExtra += row('現認者 有無', V(r.gennin_aru || r.gennin || ''));
      exportExtra += row('現認者 職名', V(r.shokumei || ''));
      exportExtra += row('現認者 氏名', V(r.gennin_name || ''));
      exportExtra += row('（携帯）事業の種類', V(r.gyoshu || ''));
      exportExtra += row('（携帯）事業場名', V(r.jigyosho || ''));
      exportExtra += row('（携帯）事業場所在地', V(r.address || ''));
      exportExtra += row('（携帯）労働者数', V(r.workers != null && r.workers !== '' ? r.workers : ''));
      exportExtra += row('（携帯）機器等の種類', V(r.machine || ''));
      exportExtra += row('（携帯）事故の種類', V(r.type || ''));
      exportExtra += row('（携帯）人的被害', V(r.human_damage || ''));
      exportExtra += row('（携帯）物的被害', V(r.material_damage || ''));
      exportExtra += row('（携帯）発生状況', V(r.situation || ''));
      exportExtra += row('（携帯）発生原因', V(r.cause || ''));
      exportExtra += row('（携帯）再発防止措置', V(r.measure || ''));
      exportExtra += row('報告者', V(r.reporter || ''));
      exportExtra += row('ワークフロー送信者メール', V(r.wf_sender_email || ''));
    }

    var h =
      '<div style="border:1px solid #333;border-radius:6px;overflow:hidden;background:#fff;font-family:Meiryo,sans-serif;font-size:10.5pt">';
    h += '<div style="border-bottom:1px solid #333;padding:10px;text-align:center;font-weight:bold;font-size:16pt;background:#D9D9D9">災害事故(人身・物損)発生報告書</div>';
    h += '<div style="display:grid;grid-template-columns:' + cols + ';gap:0;' + (isMobile ? '' : 'min-height:400px') + '">';
    h += '<div style="' + bdr + 'display:flex;flex-direction:column"><div style="display:flex;flex-direction:column;gap:0;font-size:10.5pt">';
    h += exportExtra;
    h += row('災害日時', V(r.datetime || ''));
    h += row('住所', cellWithApprovals('basho_jusho', r.basho_jusho || ''));
    h += gs('被災(事故)の<br>程度');
    h += sub('傷病名<br>(損害状況)', cellWithApprovals('shobyomei', r.shobyomei || ''));
    h += sub('後遺症', V(r.koui || ''));
    h += sub('休業見込<br>(損害見込額)', V(r.kyugyo || ''));
    h += ge;
    h += gs('人・設備・管理に<br>ついての教訓');
    h += sub('(人)', cellWithApprovals('kyukun_person', r.kyukun_person || ''));
    h += sub('(設備)', cellWithApprovals('kyukun_equip', r.kyukun_equip || ''));
    h += sub('(管理)', cellWithApprovals('kyukun_mgmt', r.kyukun_mgmt || ''));
    h += ge;
    h += '<div style="background:#D0D0D0;font-weight:bold;padding:6px 8px;font-size:11pt;border-bottom:1px solid #333">労災原因分類</div>';
    h += row('起因物', V(r.kiinbutsu || ''));
    h += row('不安全状態', V(r.fuanzen || ''));
    h += row('不安全行動', V(r.fuanzen_kodo || ''));
    h += row('事故の型', V(r.jiko || ''));
    h += row('管理の欠陥', V(r.kanri || ''));
    h += '</div></div>';
    h += '<div style="' + bdr + 'display:flex;flex-direction:column;padding:0">';
    h += '<div style="background:#D0D0D0;font-weight:bold;padding:6px 8px;font-size:11pt;border-bottom:1px solid #333">災害発生状況</div>';
    h += ss('●場所(・・・で)', 'basho_detail', r.basho_detail || '');
    h += ss('●作業(・・・しているとき)', 'sagyo', r.sagyo || '');
    h += '<div style="padding:6px 10px;border-bottom:1px solid #ddd"><div style="font-weight:bold;font-size:10pt;margin-bottom:4px">●原因(・・・であったため)</div>';
    h +=
      '<div style="font-size:9.5pt;color:#555;margin-bottom:2px">○物・環境的要因</div><div style="font-size:10pt;white-space:pre-wrap;word-break:break-all;min-height:24px;background:#f9f9f9;padding:4px 6px;border-radius:4px;margin-bottom:6px">' +
      cellWithApprovals('genin_busshi', r.genin_busshi || '') +
      '</div>';
    h +=
      '<div style="font-size:9.5pt;color:#555;margin-bottom:2px">○人的要因</div><div style="font-size:10pt;white-space:pre-wrap;word-break:break-all;min-height:24px;background:#f9f9f9;padding:4px 6px;border-radius:4px">' +
      cellWithApprovals('genin_jin', r.genin_jin || '') +
      '</div></div>';
    h += ss('●結果(・・・した)', 'kekka', r.kekka || '');
    h += '<div style="padding:6px 10px"><div style="font-weight:bold;font-size:10pt;margin-bottom:6px">こうすればよかったと思うこと</div>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
    h +=
      '<div><div style="font-size:9.5pt;color:#555;margin-bottom:2px">本人</div><div style="font-size:10pt;white-space:pre-wrap;word-break:break-all;min-height:40px;background:#f9f9f9;padding:4px 6px;border-radius:4px">' +
      cellWithApprovals('kaizen_honin', r.kaizen_honin || '') +
      '</div></div>';
    h +=
      '<div><div style="font-size:9.5pt;color:#555;margin-bottom:2px">監督者</div><div style="font-size:10pt;white-space:pre-wrap;word-break:break-all;min-height:40px;background:#f9f9f9;padding:4px 6px;border-radius:4px">' +
      cellWithApprovals('kaizen_kantoku', r.kaizen_kantoku || '') +
      '</div></div>';
    h += '</div></div></div>';
    h += '<div style="display:flex;flex-direction:column">';
    h += '<div style="padding:10px;border-bottom:1px solid #ddd"><div style="font-weight:bold;font-size:11pt;margin-bottom:8px">発生状況図</div><div style="min-height:40px">' + imgsHtml + '</div></div>';
    h +=
      '<div style="padding:10px;flex:1"><div style="font-weight:bold;font-size:11pt;margin-bottom:8px">【対策】</div><div style="font-size:10pt;white-space:pre-wrap;word-break:break-all;min-height:60px;background:#f9f9f9;padding:6px 8px;border-radius:4px">' +
      cellWithApprovals('taisaku', r.taisaku || '') +
      '</div></div>';
    h += '</div></div>';
    if (r.wf && Array.isArray(r.wf.report_addenda) && r.wf.report_addenda.length) {
      var looseRaw = r.wf.report_addenda.filter(function (e) {
        return e && !e.field;
      });
      var seenLoose = Object.create(null);
      var looseAdd = [];
      looseRaw.forEach(function (e) {
        var dk = String(e.at || '') + '\t' + String(e.by || '') + '\t' + String(e.role || '') + '\t' + String(e.text || '').trim();
        if (seenLoose[dk]) return;
        seenLoose[dk] = true;
        looseAdd.push(e);
      });
      if (looseAdd.length) {
        h +=
          '<div style="margin-top:10px;border-top:2px solid #E65100;padding:10px 12px;background:#FFFDE7"><div style="font-weight:bold;font-size:11pt;margin-bottom:10px;color:#E65100;border-bottom:1px solid #FFCC80;padding-bottom:6px">追記・訂正（ワークフロー・欄未指定分）</div>';
        looseAdd.forEach(function (e) {
          var at = formatAddendaAt(e.at);
          if (isApproverAddendum(e)) {
            var who = approverDisplayName(e);
            h +=
              '<div style="margin-bottom:12px;padding:10px;background:#fff;border:1px solid #FFE082;border-radius:6px;font-size:10pt;line-height:1.5">' +
              '<div style="white-space:pre-wrap;word-break:break-all;color:#1a1a1a">' +
              V(e.text || '') +
              '</div>' +
              '<span style="font-size:9px;color:#C62828;font-weight:600;display:block;margin-top:8px"> — ' +
              V(who) +
              ' ' +
              V(at) +
              '</span></div>';
          } else {
            h +=
              '<div style="margin-bottom:12px;padding:10px;background:#fff;border:1px solid #FFE082;border-radius:6px;font-size:10pt;line-height:1.5">' +
              '<div style="font-size:9.5pt;color:#555;margin-bottom:6px"><strong>' +
              V(e.role || '追記') +
              '</strong>　<time style="color:#888">' +
              V(at) +
              '</time></div>' +
              '<div style="white-space:pre-wrap;word-break:break-all;color:#1a1a1a">' +
              V(e.text || '') +
              '</div>' +
              '<div style="font-size:9px;color:#C62828;margin-top:6px;font-weight:600">' +
              V(e.by || '') +
              '</div></div>';
          }
        });
        h += '</div>';
      }
    }
    h +=
      '<div style="margin-top:12px;padding:12px;background:#f8f8f8;border:1px solid #333;border-radius:6px;font-size:11pt"><div style="margin-bottom:8px">上記のとおり相違なく報告いたします。</div><div style="display:flex;justify-content:flex-end;align-items:center;gap:8px;flex-wrap:wrap">' +
      V(r.report_date || '') +
      '　責任者：' +
      V(r.sekininsha || '') +
      (showAllFields && r.reporter ? '　報告者：' + V(r.reporter) : '') +
      '</div></div>';
    h += '</div>';
    return h;
  };

  // ===========================================================================
  // Excel 出力用 HTML（<table>ベース・PDFの3列レイアウトと同等の見た目）
  //
  // 設計方針:
  //  ・Excel は CSS Grid/Flex を解釈しないため、PDF用の disasterBuildDetailHtml の
  //    DIVグリッドをそのまま渡すと崩れる。Excel HTML は <table> + border + bgcolor +
  //    インラインstyle で表現すれば視覚的にほぼ再現できる。
  //  ・全体は外側1テーブル: タイトル行 → 3列のメインTD（左/中/右ブロック） → フッタ行
  //  ・各ブロックは内側テーブル（ラベル背景=#E8E8E8、本文背景=#FFF、ボーダー=#555）
  //  ・承認者追記マーカーは PDF と同じく削除（ stripSavedApproverMerges 相当）
  //  ・disaster-export.js でこの HTML を Office HTML ラッパで包んで .xls として保存する
  // ===========================================================================
  global.disasterBuildExcelHtml = function (r) {
    if (!r) return '';
    var V = function (v) {
      var s = v != null ? String(v) : '';
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '<br>');
    };
    var stripMerges = function (val) {
      var s = String(val != null ? val : '');
      var i = s.indexOf(MERGE_MARKER);
      return i === -1 ? s : s.slice(0, i);
    };
    var txt = function (v) { return V(stripMerges(v)); };

    var disImgs = r.situation_imgs && r.situation_imgs.length ? r.situation_imgs : (r.situation_img ? [r.situation_img] : []);
    var imgsHtml = disImgs.map(function (src) {
      return '<img src="' + V(src) + '" width="200" style="margin:2px;display:block">';
    }).join('') || '<span style="color:#999;font-size:9pt">（画像なし）</span>';

    var LBL = 'border:1px solid #555;background:#E8E8E8;padding:4px 6px;font-size:10pt;width:78px;vertical-align:top;font-weight:bold';
    var VAL = 'border:1px solid #555;background:#FFFFFF;padding:4px 6px;font-size:10pt;vertical-align:top';
    var SUB_LBL = 'border:1px solid #999;background:#F0F0F0;padding:3px 5px;font-size:9.5pt;width:90px;vertical-align:top';
    var SUB_VAL = 'border:1px solid #999;background:#FFFFFF;padding:3px 5px;font-size:10pt;vertical-align:top';
    var SECT = 'border:1px solid #555;background:#D0D0D0;padding:5px 6px;font-size:10.5pt;font-weight:bold;text-align:center';
    var BIG = 'border:1px solid #555;background:#FFFFFF;padding:6px 8px;font-size:10pt;vertical-align:top;min-height:60px';

    function row(lbl, val) {
      return '<tr><td style="' + LBL + '">' + lbl + '</td><td style="' + VAL + '">' + val + '</td></tr>';
    }
    function sub(lbl, val) {
      return '<tr><td style="' + SUB_LBL + '">' + lbl + '</td><td style="' + SUB_VAL + '">' + val + '</td></tr>';
    }
    function sect(lbl) {
      return '<tr><td colspan="2" style="' + SECT + '">' + lbl + '</td></tr>';
    }
    function big(val, height) {
      return '<tr><td colspan="2" style="' + BIG + (height ? ';height:' + height + 'px' : '') + '">' + val + '</td></tr>';
    }

    // 左ブロック
    var left = '';
    left += row('災害日時', txt(r.datetime || ''));
    left += row('住所', txt(r.basho_jusho || ''));
    left += sect('被災(事故)の程度');
    left += sub('傷病名(損害状況)', txt(r.shobyomei || ''));
    left += sub('後遺症', txt(r.koui || ''));
    left += sub('休業見込(損害見込額)', txt(r.kyugyo || ''));
    left += sect('人・設備・管理についての教訓');
    left += sub('(人)', txt(r.kyukun_person || ''));
    left += sub('(設備)', txt(r.kyukun_equip || ''));
    left += sub('(管理)', txt(r.kyukun_mgmt || ''));
    left += sect('労災原因分類');
    left += row('起因物', txt(r.kiinbutsu || ''));
    left += row('不安全状態', txt(r.fuanzen || ''));
    left += row('不安全行動', txt(r.fuanzen_kodo || ''));
    left += row('事故の型', txt(r.jiko || ''));
    left += row('管理の欠陥', txt(r.kanri || ''));

    // 中ブロック
    var mid = '';
    mid += sect('災害発生状況');
    mid += row('●場所', txt(r.basho_detail || ''));
    mid += row('●作業', txt(r.sagyo || ''));
    mid += sub('●原因 物・環境', txt(r.genin_busshi || ''));
    mid += sub('●原因 人的要因', txt(r.genin_jin || ''));
    mid += row('●結果', txt(r.kekka || ''));
    mid += sect('こうすればよかったと思うこと');
    mid += sub('本人', txt(r.kaizen_honin || ''));
    mid += sub('監督者', txt(r.kaizen_kantoku || ''));

    // 右ブロック
    var right = '';
    right += sect('発生状況図');
    right += big(imgsHtml, 140);
    right += sect('対策');
    right += big(txt(r.taisaku || ''), 140);

    function innerTable(rows) {
      return '<table border="0" cellspacing="0" cellpadding="0" width="100%" style="border-collapse:collapse">' + rows + '</table>';
    }

    var h =
      '<table border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-family:Meiryo,MS PGothic,sans-serif;width:900px;table-layout:fixed">' +
      '<tr><td colspan="3" style="border:1px solid #333;background:#D9D9D9;padding:10px 8px;font-size:14pt;font-weight:bold;text-align:center">災害事故(人身・物損)発生報告書</td></tr>' +
      '<tr>' +
      '<td valign="top" width="300" style="border:1px solid #333;padding:0">' + innerTable(left) + '</td>' +
      '<td valign="top" width="300" style="border:1px solid #333;padding:0">' + innerTable(mid) + '</td>' +
      '<td valign="top" width="300" style="border:1px solid #333;padding:0">' + innerTable(right) + '</td>' +
      '</tr>' +
      '<tr><td colspan="3" style="border:1px solid #333;padding:10px 12px;background:#F8F8F8;font-size:11pt">' +
      '上記のとおり相違なく報告いたします。&nbsp;&nbsp;' +
      V(r.report_date || '') + '&nbsp;&nbsp;責任者：' + V(r.sekininsha || '') + '&nbsp;&nbsp;報告者：' + V(r.reporter || '') +
      '</td></tr>' +
      '</table>';

    // 追記・訂正（ワークフロー）があれば下部に追加
    if (r.wf && Array.isArray(r.wf.report_addenda) && r.wf.report_addenda.length) {
      var looseRaw = r.wf.report_addenda.filter(function (e) { return e && !e.field; });
      if (looseRaw.length) {
        h += '<br><table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;font-family:Meiryo,sans-serif;width:900px;border-color:#E65100">';
        h += '<tr><td style="background:#FFF3E0;font-weight:bold;font-size:11pt;color:#E65100">追記・訂正</td></tr>';
        looseRaw.forEach(function (e) {
          h += '<tr><td style="background:#FFFDE7;font-size:10pt"><strong>' + V(e.role || '追記') + '</strong>　' +
            V(e.by || '') + '　<span style="color:#888">' + V(e.at || '') + '</span><br>' +
            V(e.text || '') + '</td></tr>';
        });
        h += '</table>';
      }
    }
    return h;
  };
})(window);
