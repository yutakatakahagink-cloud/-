/**
 * 災害発生報告の詳細HTML（管理者画面・承認用公開画面で共通）
 */
(function (global) {
  'use strict';

  global.disasterBuildDetailHtml = function (r) {
    if (!r) return '';
    var V = function (v) {
      var s = v != null ? String(v) : '';
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };
    var birthParts = (r.birth || '').split('-');
    var by = birthParts[0] || '',
      bm = birthParts[1] || '',
      bd = birthParts[2] || '';
    var expParts = (r.exp || '').split('-');
    var expY = expParts[0] || '',
      expM = expParts[1] || '';
    var disImgs = r.situation_imgs && r.situation_imgs.length ? r.situation_imgs : r.situation_img ? [r.situation_img] : [];
    var imgsHtml = disImgs.length
      ? disImgs
          .map(function (src) {
            return (
              '<img src="' +
              V(src) +
              '" onclick="if(typeof showFullPhotoSrc===\'function\')showFullPhotoSrc(this.src)" style="max-width:200px;border-radius:6px;cursor:pointer;margin:4px">'
            );
          })
          .join('')
      : '';
    var isMobile = global.innerWidth < 768;
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
    function addendaInline(fieldKey) {
      if (!r.wf || !Array.isArray(r.wf.report_addenda)) return '';
      var blocks = '';
      r.wf.report_addenda.forEach(function (e) {
        if (!e || String(e.field || '') !== String(fieldKey)) return;
        var at = (e.at || '').slice(0, 16).replace('T', ' ');
        blocks +=
          '<div style="margin-top:8px;padding-top:8px;border-top:1px dashed #E57373;font-size:10pt;white-space:pre-wrap;word-break:break-all">' +
          V(e.text || '') +
          '<div style="font-size:9px;color:#C62828;margin-top:4px;font-weight:600">— ' +
          V(e.by || '') +
          '（承認者追記） ' +
          V(at) +
          '</div></div>';
      });
      return blocks;
    }
    var ss = function (t, fieldKey, v) {
      return (
        '<div style="padding:6px 10px;border-bottom:1px solid #ddd"><div style="font-weight:bold;font-size:10pt;margin-bottom:4px">' +
        t +
        '</div><div style="font-size:10pt;white-space:pre-wrap;word-break:break-all;min-height:30px;background:#f9f9f9;padding:4px 6px;border-radius:4px">' +
        V(v) +
        (fieldKey ? addendaInline(fieldKey) : '') +
        '</div></div>'
      );
    };
    var h =
      '<div style="border:1px solid #333;border-radius:6px;overflow:hidden;background:#fff;font-family:Meiryo,sans-serif;font-size:10.5pt">';
    h += '<div style="border-bottom:1px solid #333;padding:10px;text-align:center;font-weight:bold;font-size:16pt;background:#D9D9D9">災害事故(人身・物損)発生報告書</div>';
    h += '<div style="display:grid;grid-template-columns:' + cols + ';gap:0;' + (isMobile ? '' : 'min-height:400px') + '">';
    h += '<div style="' + bdr + 'display:flex;flex-direction:column"><div style="display:flex;flex-direction:column;gap:0;font-size:10.5pt">';
    h += row('工事件名', V(r.keigen || '') + addendaInline('keigen'));
    h += row('災害日時', V(r.datetime || ''));
    h += row('災害場所', V(r.basho || r.place || '') + addendaInline('basho'));
    h += row('住所', V(r.basho_jusho || '') + addendaInline('basho_jusho'));
    h += gs('被災者又は<br>事故者');
    h += sub('住所', V(r.jusho || ''));
    h += sub(
      '氏名',
      V(r.victim || '') + ' 年齢:' + V(r.age || '') + '才 生年月日:' + V(by) + '年' + V(bm) + '月' + V(bd) + '日 職種:' + V(r.victim_dept || '')
    );
    h += sub('雇入年月日', V(r.hire_date || '') + ' 経験年数:' + V(expY) + '年' + V(expM) + 'カ月');
    h += ge;
    h += gs('被災(事故)の<br>程度');
    h += sub('傷病名<br>(損害状況)', V(r.shobyomei || '') + addendaInline('shobyomei'));
    h += sub('病院名', V(r.byoin || '') + ' 後遺症:' + V(r.koui || ''));
    h += sub('休業見込<br>(損害見込額)', V(r.kyugyo || ''));
    h += ge;
    h += row(
      '現認者',
      r.gennin_aru === '有' ? '有 職名:' + V(r.shokumei || '') + ' 氏名:' + V(r.gennin_name || r.gennin || '') : V(r.gennin_aru || '無')
    );
    h += gs('人・設備・管理に<br>ついての教訓');
    h += sub('(人)', V(r.kyukun_person || '') + addendaInline('kyukun_person'));
    h += sub('(設備)', V(r.kyukun_equip || '') + addendaInline('kyukun_equip'));
    h += sub('(管理)', V(r.kyukun_mgmt || '') + addendaInline('kyukun_mgmt'));
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
      V(r.genin_busshi || '') +
      addendaInline('genin_busshi') +
      '</div>';
    h +=
      '<div style="font-size:9.5pt;color:#555;margin-bottom:2px">○人的要因</div><div style="font-size:10pt;white-space:pre-wrap;word-break:break-all;min-height:24px;background:#f9f9f9;padding:4px 6px;border-radius:4px">' +
      V(r.genin_jin || '') +
      addendaInline('genin_jin') +
      '</div></div>';
    h += ss('●結果(・・・した)', 'kekka', r.kekka || '');
    h += '<div style="padding:6px 10px"><div style="font-weight:bold;font-size:10pt;margin-bottom:6px">こうすればよかったと思うこと</div>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
    h +=
      '<div><div style="font-size:9.5pt;color:#555;margin-bottom:2px">本人</div><div style="font-size:10pt;white-space:pre-wrap;word-break:break-all;min-height:40px;background:#f9f9f9;padding:4px 6px;border-radius:4px">' +
      V(r.kaizen_honin || '') +
      addendaInline('kaizen_honin') +
      '</div></div>';
    h +=
      '<div><div style="font-size:9.5pt;color:#555;margin-bottom:2px">監督者</div><div style="font-size:10pt;white-space:pre-wrap;word-break:break-all;min-height:40px;background:#f9f9f9;padding:4px 6px;border-radius:4px">' +
      V(r.kaizen_kantoku || '') +
      addendaInline('kaizen_kantoku') +
      '</div></div>';
    h += '</div></div></div>';
    h += '<div style="display:flex;flex-direction:column">';
    h += '<div style="padding:10px;border-bottom:1px solid #ddd"><div style="font-weight:bold;font-size:11pt;margin-bottom:8px">発生状況図</div><div style="min-height:40px">' + imgsHtml + '</div></div>';
    h +=
      '<div style="padding:10px;flex:1"><div style="font-weight:bold;font-size:11pt;margin-bottom:8px">【対策】</div><div style="font-size:10pt;white-space:pre-wrap;word-break:break-all;min-height:60px;background:#f9f9f9;padding:6px 8px;border-radius:4px">' +
      V(r.taisaku || '') +
      addendaInline('taisaku') +
      '</div></div>';
    h += '</div></div>';
    if (r.wf && Array.isArray(r.wf.report_addenda) && r.wf.report_addenda.length) {
      var looseAdd = r.wf.report_addenda.filter(function (e) {
        return e && !e.field;
      });
      if (looseAdd.length) {
        h +=
          '<div style="margin-top:10px;border-top:2px solid #E65100;padding:10px 12px;background:#FFFDE7"><div style="font-weight:bold;font-size:11pt;margin-bottom:10px;color:#E65100;border-bottom:1px solid #FFCC80;padding-bottom:6px">追記・訂正（ワークフロー・欄未指定分）</div>';
        looseAdd.forEach(function (e) {
          var at = (e.at || '').slice(0, 19).replace('T', ' ');
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
        });
        h += '</div>';
      }
    }
    h +=
      '<div style="margin-top:12px;padding:12px;background:#f8f8f8;border:1px solid #333;border-radius:6px;font-size:11pt"><div style="margin-bottom:8px">上記のとおり相違なく報告いたします。</div><div style="display:flex;justify-content:flex-end;align-items:center;gap:8px;flex-wrap:wrap">' +
      V(r.report_date || '') +
      '　責任者：' +
      V(r.sekininsha || '') +
      '</div></div>';
    h += '</div>';
    return h;
  };
})(window);
