/**
 * 委員会シート：体験別まとめ文章・安全衛生要望一覧
 */
(function(global){
  var EXP_TYPES=['墜落しそうになった','転倒しそうになった','機械等に激突されそうになった','ものが落下してきた','ものが倒れかかってきた','自分からぶつかりそうになった','はさまれそうになった','切られそうになった','やけどしそうになった','感電しそうになった','交通事故になりそうだった','その他'];
  var EXP_TO_MEASURE={
    '墜落しそうになった':'足場点検・高所作業の安全手順・墜落制止用器具の使用徹底',
    '転倒しそうになった':'4S・通路確保・滑り止め・照明改善',
    '機械等に激突されそうになった':'合図者配置・進入禁止区域の明確化・声掛けルール',
    'ものが落下してきた':'落下防止ネット・工具の落下防止ワイヤー・開口部の囲い',
    'ものが倒れかかってきた':'仮設の固定・計測頻度・警報システム',
    '自分からぶつかりそうになった':'通路確保・視界確保・注意喚起',
    'はさまれそうになった':'安全ガード・インターロック・作業手順の見直し',
    '切られそうになった':'刃物の管理・保護具・作業手順の教育',
    'やけどしそうになった':'熱源の隔離・保護具・緊急措置の周知',
    '感電しそうになった':'絶縁確認・仮設電気の点検・感電防止教育',
    '交通事故になりそうだった':'誘導員配置・バックモニター・後方確認の義務化',
    'その他':'個別事象に応じた対策検討'
  };
  var CAUSE_TO_MEASURE={
    '確認不足':'チェックリスト導入・ダブルチェック・朝礼での確認事項周知',
    '連絡・連携ミス':'声掛けルール・合図の統一・無線の活用',
    '作業環境':'4S・照明・通路確保・危険区域の明示',
    '設備・機械':'定期点検・安全装置の確認・修理・更新',
    '不注意行動':'KY活動強化・休憩の確保・焦りを生む工程の見直し',
    '視界不良':'照明改善・視界確保・安全標識の設置'
  };
  var REQ_ST={'pending':'未対応','in_progress':'取り掛かり中','resolved':'解決済み'};

  function esc(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function expShort(exp){
    return String(exp||'').replace('しそうになった','').replace('そうになった','').replace('してきた','').replace('になりそうだった','');
  }
  function matchExp(e,exp){
    return e===exp||String(e||'').startsWith(String(exp).substring(0,2));
  }
  function reportsForExp(reports,exp){
    return (reports||[]).filter(function(r){
      return (r.e||[]).some(function(e){return matchExp(e,exp)});
    });
  }
  function countByExp(reports){
    var ec={};
    EXP_TYPES.forEach(function(t){ec[t]=0});
    (reports||[]).forEach(function(r){
      (r.e||[]).forEach(function(e){
        if(ec[e]!==undefined)ec[e]++;
        else{
          var k=EXP_TYPES.find(function(t){return String(e||'').startsWith(t.substring(0,2))});
          if(k)ec[k]++;
        }
      });
    });
    return ec;
  }
  function summarizeField(reports,field,maxItems){
    var seen={},items=[];
    (reports||[]).forEach(function(r){
      var t=String(r[field]||'').replace(/\s+/g,' ').trim();
      if(!t||seen[t])return;
      seen[t]=1;
      items.push(t.length>100?t.substring(0,100)+'…':t);
    });
    return items.slice(0,maxItems||4);
  }
  function topCauseText(sub){
    var cc={};
    sub.forEach(function(r){(r.c||[]).forEach(function(c){cc[c]=(cc[c]||0)+1})});
    var top=Object.entries(cc).sort(function(a,b){return b[1]-a[1]}).slice(0,3);
    if(!top.length)return '';
    return top.map(function(x){return x[0]+'（'+x[1]+'件）'}).join('、');
  }
  function causeMeasuresText(sub){
    var parts=[];
    sub.forEach(function(r){
      (r.c||[]).forEach(function(c){
        if(CAUSE_TO_MEASURE[c]&&parts.indexOf(CAUSE_TO_MEASURE[c])<0)parts.push(CAUSE_TO_MEASURE[c]);
      });
    });
    return parts.slice(0,2).join('。');
  }
  function buildExpParagraph(exp,sub){
    if(!sub.length)return '';
    var short=expShort(exp);
    var parts=[];
    parts.push('【'+short+'】は'+sub.length+'件報告されています。');
    var details=summarizeField(sub,'d',3);
    if(details.length){
      parts.push('体験内容の例として、'+details.map(function(t,i){return '（'+(i+1)+'）'+t}).join('')+'。');
    }
    var works=summarizeField(sub,'wk',2);
    if(works.length)parts.push('関連作業では「'+works.join('」「')+'」などが挙がっています。');
    var causes=topCauseText(sub);
    if(causes)parts.push('発生原因は「'+causes+'」が多く見られます。');
    var measures=summarizeField(sub,'m',3);
    if(measures.length)parts.push('報告者の対策案として「'+measures.join('」「')+'」が示されています。');
    if(EXP_TO_MEASURE[exp])parts.push('体験タイプ別の推奨対策は、'+EXP_TO_MEASURE[exp]+'です。');
    var causeM=causeMeasuresText(sub);
    if(causeM)parts.push('原因別には'+causeM+'が有効です。');
    var hi=sub.filter(function(r){return+r.l>=7}).length;
    if(hi)parts.push('うち災害レベルLv.7以上は'+hi+'件で、優先的な対策検討が必要です。');
    return parts.join('');
  }
  function buildComByExpSummaryHtml(reports,compact){
    reports=reports||[];
    var ec=countByExp(reports);
    var seCom=EXP_TYPES.filter(function(t){return ec[t]>0}).sort(function(a,b){return ec[b]-ec[a]});
    if(!seCom.length){
      return '<p style="color:var(--t3);font-size:12px;padding:4px 0">該当期間に体験別の報告データがありません。</p>';
    }
    if(compact){
      var intro='<p style="font-size:10px;color:var(--t3);margin-bottom:8px">'+seCom.length+'種類の体験・計'+reports.length+'件を文章で要約（タップで全文）</p>';
      return intro+seCom.slice(0,3).map(function(exp){
        var sub=reportsForExp(reports,exp);
        var text=buildExpParagraph(exp,sub);
        var clip=text.length>160?text.substring(0,160)+'…':text;
        return '<p style="font-size:11px;line-height:1.65;margin-bottom:10px;color:var(--t2)">'+esc(clip)+'</p>';
      }).join('')+(seCom.length>3?'<p style="font-size:10px;color:var(--t3)">他 '+(seCom.length-3)+' 種類 — タップで全文</p>':'');
    }
    return seCom.map(function(exp){
      var sub=reportsForExp(reports,exp);
      return '<div class="com-section"><p style="font-size:12px;line-height:1.8;margin:0 0 14px;text-align:justify;color:var(--t2)">'+esc(buildExpParagraph(exp,sub))+'</p></div>';
    }).join('');
  }
  function renderComByExpSummary(reports,cardEl,fullEl){
    var card=buildComByExpSummaryHtml(reports,true);
    var full=buildComByExpSummaryHtml(reports,false);
    if(cardEl)cardEl.innerHTML=card;
    if(fullEl)fullEl.innerHTML='<div class="com-detail">'+full+'</div>';
  }
  function filterComRequests(requests,deptFilt,periodYear,periodMonth){
    var list=(requests||[]).slice();
    if(deptFilt&&deptFilt!=='all'){
      list=list.filter(function(r){
        var d=String(r.dept||'');
        return d===deptFilt||d.startsWith(deptFilt+'/')||deptFilt.startsWith(d);
      });
    }
    if(periodYear&&periodYear!=='all'){
      list=list.filter(function(r){return String(r.date||'').substring(0,4)===periodYear});
    }
    if(periodMonth&&periodMonth!=='all'){
      list=list.filter(function(r){return String(r.date||'').substring(5,7)===periodMonth});
    }
    return list.sort(function(a,b){return String(b.date||'').localeCompare(String(a.date||''), 'ja')});
  }
  function buildComRequestsHtml(requests,compact){
    requests=requests||[];
    if(!requests.length){
      return '<p style="color:var(--t3);font-size:12px;padding:4px 0">該当する安全衛生要望はありません。</p>';
    }
    var lines=requests.map(function(r){
      var st=REQ_ST[r.status]||r.status||'未対応';
      var body=String(r.content||'').replace(/\s+/g,' ').trim();
      return '['+st+'] '+(r.date||'—')+' '+esc(r.name||'—')+'（'+esc(r.dept||'—')+'）— '+esc(body);
    });
    var limit=compact?5:lines.length;
    var h='<ul style="margin:0;padding-left:18px;font-size:'+(compact?'11':'12')+'px;line-height:1.65;color:var(--t2)">';
    lines.slice(0,limit).forEach(function(line){
      h+='<li style="margin-bottom:'+(compact?'6':'8')+'px">'+line+'</li>';
    });
    h+='</ul>';
    if(compact&&lines.length>limit){
      h+='<p style="font-size:10px;color:var(--t3);margin-top:6px">他 '+(lines.length-limit)+' 件 — タップで全文</p>';
    }
    return h;
  }
  function renderComRequests(requests,cardEl,fullEl){
    var card=buildComRequestsHtml(requests,true);
    var full=buildComRequestsHtml(requests,false);
    if(cardEl)cardEl.innerHTML=card;
    if(fullEl)fullEl.innerHTML='<div class="com-detail">'+full+'</div>';
  }
  global.renderComByExpSummary=renderComByExpSummary;
  global.renderComRequests=renderComRequests;
  global.filterComRequests=filterComRequests;
})(typeof window!=='undefined'?window:this);
