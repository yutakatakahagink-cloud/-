/**
 * 委員会シート：災害報告（発生状況・労災原因分類・対策）まとめ
 */
(function(global){
  function esc(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function clip(s,n){
    s=String(s||'').replace(/\s+/g,' ').trim();
    return s.length>n?s.substring(0,n)+'…':s;
  }
  function disasterDateKey(r){
    if(!r)return '';
    var dt=String(r.datetime||'');
    var m=dt.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    if(m)return m[1]+'-'+String(m[2]).padStart(2,'0')+'-'+String(m[3]).padStart(2,'0');
    if(/^\d{4}-\d{2}-\d{2}/.test(dt))return dt.substring(0,10);
    var d=String(r.date||'');
    if(/^\d{4}-\d{2}-\d{2}/.test(d))return d.substring(0,10);
    if(/^\d{4}/.test(dt))return dt.substring(0,10);
    return d.substring(0,10);
  }
  function joinParts(parts,sep){
    return parts.filter(function(x){return x}).join(sep||'／');
  }
  function disasterSituationText(r){
    if(!r)return '（記載なし）';
    var parts=[];
    if(r.basho_detail)parts.push('場所：'+r.basho_detail);
    else if(r.basho||r.place)parts.push('場所：'+(r.basho||r.place));
    if(r.sagyo)parts.push('作業：'+r.sagyo);
    if(r.kekka)parts.push('結果：'+r.kekka);
    if(r.situation)parts.push(r.situation);
    if(r.human_damage)parts.push('人的被害：'+r.human_damage);
    if(r.material_damage)parts.push('物的被害：'+r.material_damage);
    return joinParts(parts,'。')||'（記載なし）';
  }
  function disasterCauseClassText(r){
    if(!r)return '（記載なし）';
    var parts=[];
    if(r.kiinbutsu)parts.push('起因物：'+r.kiinbutsu);
    if(r.fuanzen)parts.push('不安全状態：'+r.fuanzen);
    if(r.fuanzen_kodo)parts.push('不安全行動：'+r.fuanzen_kodo);
    if(r.jiko)parts.push('事故の型：'+r.jiko);
    if(r.kanri)parts.push('管理の欠陥：'+r.kanri);
    if(r.genin_busshi)parts.push('物・環境的要因：'+r.genin_busshi);
    if(r.genin_jin)parts.push('人的要因：'+r.genin_jin);
    if(r.cause&&!parts.length)parts.push(r.cause);
    return joinParts(parts,'／')||'（記載なし）';
  }
  function disasterMeasureText(r){
    if(!r)return '（記載なし）';
    var parts=[];
    if(r.taisaku)parts.push(r.taisaku);
    if(r.measure)parts.push(r.measure);
    if(r.kaizen_honin)parts.push('本人：'+r.kaizen_honin);
    if(r.kaizen_kantoku)parts.push('監督者：'+r.kaizen_kantoku);
    if(r.kyukun_person)parts.push('教訓(人)：'+r.kyukun_person);
    if(r.kyukun_equip)parts.push('教訓(設備)：'+r.kyukun_equip);
    if(r.kyukun_mgmt)parts.push('教訓(管理)：'+r.kyukun_mgmt);
    return joinParts(parts,'／')||'（記載なし）';
  }
  function formatDisTitle(r){
    var dt=disasterDateKey(r)||'—';
    var where=r.keigen||r.basho||r.place||'';
    return where?dt+'（'+where+'）':dt;
  }
  function isVisibleDisaster(r){
    if(!r)return false;
    return !!(r.victim||r.reporter||r.situation||r.basho_detail||r.keigen||r.basho||r.place);
  }
  function deptMatch(r,deptFilt){
    var fields=[r.victim_dept,r.keigen,r.basho,r.place,r.jigyosho,r.reporter].map(function(x){return String(x||'')});
    return fields.some(function(d){
      return d===deptFilt||d.startsWith(deptFilt+'/')||deptFilt.startsWith(d)||d.indexOf(deptFilt)>=0;
    });
  }
  function filterComDisasters(list,deptFilt,periodYear,periodMonth){
    var out=(list||[]).filter(isVisibleDisaster);
    if(deptFilt&&deptFilt!=='all')out=out.filter(function(r){return deptMatch(r,deptFilt)});
    if(periodYear&&periodYear!=='all'){
      out=out.filter(function(r){return disasterDateKey(r).substring(0,4)===periodYear});
    }
    if(periodMonth&&periodMonth!=='all'){
      out=out.filter(function(r){return disasterDateKey(r).substring(5,7)===periodMonth});
    }
    return out.sort(function(a,b){return disasterDateKey(b).localeCompare(disasterDateKey(a),'ja')});
  }
  function buildOneDisasterHtml(r,compact){
    var sit=disasterSituationText(r);
    var cause=disasterCauseClassText(r);
    var measure=disasterMeasureText(r);
    if(compact){
      sit=clip(sit,140);
      cause=clip(cause,100);
      measure=clip(measure,100);
    }
    var fs=compact?'11':'12';
    return '<div class="com-section" style="margin-bottom:'+(compact?'10':'16')+'px;padding-bottom:'+(compact?'8':'12')+'px;border-bottom:1px solid var(--bd,#eee)">'+
      '<strong style="display:block;margin-bottom:6px;font-size:'+(compact?'11':'12')+'px">'+esc(formatDisTitle(r))+'</strong>'+
      '<p style="margin:0 0 4px;font-size:'+fs+'px;line-height:1.65;color:var(--t2)"><span style="color:var(--t3);font-weight:600">災害発生状況：</span>'+esc(sit)+'</p>'+
      '<p style="margin:0 0 4px;font-size:'+fs+'px;line-height:1.65;color:var(--t2)"><span style="color:var(--t3);font-weight:600">災害原因分類：</span>'+esc(cause)+'</p>'+
      '<p style="margin:0;font-size:'+fs+'px;line-height:1.65;color:var(--t2)"><span style="color:var(--t3);font-weight:600">対策：</span>'+esc(measure)+'</p>'+
      '</div>';
  }
  function buildComDisastersHtml(list,compact){
    list=list||[];
    if(!list.length){
      return '<p style="color:var(--t3);font-size:12px;padding:4px 0">該当する災害報告はありません。</p>';
    }
    var limit=compact?2:list.length;
    var intro=compact?'<p style="font-size:10px;color:var(--t3);margin-bottom:8px">'+list.length+'件の災害報告（タップで全文）</p>':'';
    var body=list.slice(0,limit).map(function(r){return buildOneDisasterHtml(r,compact)}).join('');
    if(compact&&list.length>limit){
      body+='<p style="font-size:10px;color:var(--t3);margin-top:6px">他 '+(list.length-limit)+' 件 — タップで全文</p>';
    }
    return intro+body;
  }
  function renderComDisasters(list,cardEl,fullEl){
    var card=buildComDisastersHtml(list,true);
    var full=buildComDisastersHtml(list,false);
    if(cardEl)cardEl.innerHTML=card;
    if(fullEl)fullEl.innerHTML='<div class="com-detail">'+full+'</div>';
  }
  global.filterComDisasters=filterComDisasters;
  global.renderComDisasters=renderComDisasters;
})(typeof window!=='undefined'?window:this);
