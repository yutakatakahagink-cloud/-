/**
 * 委員会議事録 — 左右2カラム表示・データ保存・確定・Excelダウンロード
 */
(function(global){
  'use strict';
  var LS_KEY='hh_committee_minutes';
  var FB_PATH='hh_data/committee_minutes';

  var DEFAULT_MEMBERS=[
    {role:'委員長',name:'髙萩泰'},
    {role:'副委員長',name:'佐藤ブライアン'},
    {role:'組合員',name:'佐々木隆介'},
    {role:'組合員',name:'山田晃也'},
    {role:'',name:'佐藤豊明'},
    {role:'',name:'忍賀俊治'},
    {role:'',name:'中城俊昭'},
    {role:'',name:'土田香織'}
  ];

  function fbRef(ym){
    if(typeof HHDB==='undefined'||!HHDB.useFirebase||!HHDB.useFirebase())return null;
    try{return firebase.app().database().ref(FB_PATH+'/'+ym)}catch(e){return null}
  }
  function loadMinutes(ym,cb){
    var ref=fbRef(ym);
    if(ref){ref.once('value',function(s){var v=s.val();if(v){try{var ls=JSON.parse(localStorage.getItem(LS_KEY)||'{}');ls[ym]=v;localStorage.setItem(LS_KEY,JSON.stringify(ls))}catch(e){}}cb(v||null)},function(){cb(loadLocal(ym))});return}
    cb(loadLocal(ym));
  }
  function loadLocal(ym){try{return(JSON.parse(localStorage.getItem(LS_KEY)||'{}'))[ym]||null}catch(e){return null}}
  function saveMinutes(ym,data,cb){
    data.yearMonth=ym;
    try{var a=JSON.parse(localStorage.getItem(LS_KEY)||'{}');a[ym]=data;localStorage.setItem(LS_KEY,JSON.stringify(a))}catch(e){}
    var ref=fbRef(ym);
    if(ref){ref.set(data,function(err){if(typeof cb==='function')cb(err)});return}
    if(typeof cb==='function')cb(null);
  }

  function currentYM(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
  function prevYM(ym){var p=ym.split('-');var y=+p[0],m=+p[1]-1;if(m<1){m=12;y--}return y+'-'+String(m).padStart(2,'0')}
  function ymLabel(ym){var p=ym.split('-');return p[0]+'年'+parseInt(p[1],10)+'月'}

  function getSelectedComYM(){
    var sel=document.getElementById('pfCom');if(!sel)return currentYM();
    var yEl=sel.querySelector('select');var mEl=sel.querySelectorAll('select')[1];
    var y=yEl?yEl.value:'';var m=mEl?mEl.value:'';
    if(!y||y==='all')y=String(new Date().getFullYear());
    if(!m||m==='all')m=String(new Date().getMonth()+1).padStart(2,'0');
    return y+'-'+m;
  }

  function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

  function defaultAttendeesText(){
    return DEFAULT_MEMBERS.map(function(m){return(m.role?m.role+'：':'')+m.name}).join('、');
  }

  function buildAgendaFromData(){return window._comAgendaText||'（報告データなし）'}

  function buildAgendaForYM(y,m){
    var reports=(typeof DB!=='undefined'?DB:[])||[];
    var disList=(typeof DIS_LIST!=='undefined'?DIS_LIST:[])||[];
    var reqList=(typeof REQ_LIST!=='undefined'?REQ_LIST:[])||[];
    var ym=y+'-'+m;
    var fd=reports.filter(function(r){var dt=r.date||'';return dt.substring(0,4)===y&&dt.substring(5,7)===m});
    var hi=fd.filter(function(r){return r.l>=7});
    var ec={};fd.forEach(function(r){(r.e||[]).forEach(function(e){ec[e]=(ec[e]||0)+1})});
    var te=Object.entries(ec).sort(function(a,b){return b[1]-a[1]})[0];
    var lines=[];
    lines.push('【ヒヤリハット報告】');
    lines.push('・報告総数 '+fd.length+'件');
    lines.push('・高レベル(Lv.7+) '+hi.length+'件');
    if(te)lines.push('・最頻出体験: '+te[0]+'（'+te[1]+'件）');
    var se=Object.entries(ec).sort(function(a,b){return b[1]-a[1]});
    if(se.length){lines.push('');se.forEach(function(x){lines.push('・'+x[0]+': '+x[1]+'件')})}
    lines.push('');
    var cc={};fd.forEach(function(r){(r.c||[]).forEach(function(c){cc[c]=(cc[c]||0)+1})});
    var sc=Object.entries(cc).sort(function(a,b){return b[1]-a[1]});
    if(sc.length){lines.push('【発生原因】');sc.forEach(function(x){lines.push('・'+x[0]+': '+x[1]+'件')});lines.push('')}
    var dl=disList.filter(function(r){var dt=r.datetime||r.date||'';return dt.substring(0,4)===y&&dt.substring(5,7)===m});
    if(dl.length){
      lines.push('【災害報告】');
      dl.forEach(function(r){
        lines.push('・'+(r.datetime||r.date||'—')+' '+(r.place||r.basho||'—')+' '+(r.type||r.jiko||r.keigen||''));
        if(r.situation||r.basho_detail)lines.push('  発生状況: '+(r.basho_detail||r.situation||'').substring(0,80));
        if(r.taisaku||r.measure)lines.push('  対策: '+(r.taisaku||r.measure||'').substring(0,80));
      });
      lines.push('');
    }
    var rl=reqList.filter(function(r){return(r.date||'').substring(0,4)===y&&(r.date||'').substring(5,7)===m});
    if(rl.length){
      lines.push('【安全衛生要望】');
      rl.forEach(function(r){
        var st=r.status==='resolved'?'解決済み':r.status==='in_progress'?'取り掛かり中':'未対応';
        lines.push('・['+st+'] '+(r.name||'—')+'（'+(r.dept||'—')+'）: '+(r.content||''));
      });
      lines.push('');
    }
    if(typeof window.comLawEnacted!=='undefined'&&window.comLawEnacted&&window.comLawEnacted.length){
      lines.push('【法改正（施行済み）】');
      window.comLawEnacted.forEach(function(l){lines.push('・'+l.law+' '+l.short+' ('+l.date+')')});
      lines.push('');
    }
    if(typeof window.comLawUpcoming!=='undefined'&&window.comLawUpcoming&&window.comLawUpcoming.length){
      lines.push('【法改正（施行予定）】');
      window.comLawUpcoming.forEach(function(l){lines.push('・'+l.law+' '+l.short+' ('+l.date+')')});
      lines.push('');
    }
    return lines.join('\n').trim();
  }
  global.buildAgendaForYM=buildAgendaForYM;

  function buildColumnHtml(prefix,ym,data,isEditable,isOwner){
    var d=data||{};var lbl=ymLabel(ym);
    var titleText=d.confirmed?lbl+' 安全衛生委員会 議事録':lbl+' 安全衛生委員会 報告事項';
    var ro=isEditable?'':'readonly';
    var roBg=isEditable?'':'background:#f5f5f5';
    var h='';
    h+='<div class="cm-col" id="'+prefix+'Col">';
    h+='<div class="cm-title'+(d.confirmed?' cm-confirmed':'')+'" id="'+prefix+'Title">'+esc(titleText)+'</div>';

    h+='<div class="cm-section"><div class="cm-row"><div class="cm-lbl">開催日</div><input class="fi cm-fi" type="date" id="'+prefix+'Date" value="'+esc(d.date||'')+'" '+ro+' style="'+roBg+'"></div>';
    h+='<div class="cm-row"><div class="cm-lbl">場所</div><input class="fi cm-fi" type="text" id="'+prefix+'Place" value="'+esc(d.place||'')+'" placeholder="WEB" '+ro+' style="'+roBg+'"></div>';
    h+='<div class="cm-row"><div class="cm-lbl">時間</div><div style="display:flex;gap:4px;align-items:center;flex:1"><input class="fi cm-fi" type="time" id="'+prefix+'TimeFrom" value="'+esc(d.time_from||'')+'" '+ro+' style="'+roBg+'">～<input class="fi cm-fi" type="time" id="'+prefix+'TimeTo" value="'+esc(d.time_to||'')+'" '+ro+' style="'+roBg+'"></div></div></div>';

    h+='<div class="cm-section"><div class="cm-sh">出席者</div>';
    var att=d.attendees||(isEditable?defaultAttendeesText():'');
    h+='<textarea class="ft cm-ta" id="'+prefix+'Att" '+ro+' style="min-height:50px;'+roBg+'" placeholder="役割：氏名">'+esc(att)+'</textarea></div>';

    h+='<div class="cm-section"><div class="cm-sh">欠席者</div>';
    h+='<textarea class="ft cm-ta" id="'+prefix+'Abs" '+ro+' style="min-height:30px;'+roBg+'" placeholder="欠席者名">'+esc(d.absentees||'')+'</textarea></div>';

    h+='<div class="cm-section"><div class="cm-sh">参加者</div>';
    h+='<textarea class="ft cm-ta" id="'+prefix+'Parts" '+ro+' style="min-height:30px;'+roBg+'" placeholder="安全担当・その他参加者">'+esc(d.participants||'')+'</textarea></div>';

    h+='<div class="cm-section"><div class="cm-sh">議案（定例報告）</div>';
    var ymParts=ym.split('-');
    var agText=d.agenda_text||buildAgendaForYM(ymParts[0],ymParts[1]);
    h+='<div class="cm-agenda" id="'+prefix+'Agenda">'+esc(agText).replace(/\n/g,'<br>')+'</div></div>';

    h+='<div class="cm-section"><div class="cm-sh">その他報告事項</div>';
    h+='<textarea class="ft cm-ta" id="'+prefix+'Other" '+ro+' style="min-height:50px;'+roBg+'" placeholder="委員会での報告事項">'+esc(d.other_reports||'')+'</textarea></div>';

    h+='<div class="cm-section"><div class="cm-sh">協議事項</div>';
    h+='<textarea class="ft cm-ta" id="'+prefix+'Disc" '+ro+' style="min-height:50px;'+roBg+'" placeholder="委員会での協議事項">'+esc(d.discussions||'')+'</textarea></div>';

    if(isEditable){
      h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">';
      h+='<button type="button" class="sub" style="flex:1;min-width:100px;margin:0;padding:10px;font-size:12px" onclick="saveComMinutes()">保存</button>';
      if(isOwner)h+='<button type="button" class="sub" id="cmConfirmBtn" style="flex:1;min-width:100px;margin:0;padding:10px;font-size:12px;background:var(--pr)" onclick="confirmComMinutes()">'+(d.confirmed?'確定取消':'議事録を確定')+'</button>';
      h+='</div>';
      h+='<div id="cmStatus" style="font-size:10px;color:var(--t3);margin-top:6px;text-align:center"></div>';
    }
    h+='</div>';
    return h;
  }

  function buildFullHtml(curYM,curData,prvYM,prvData,role){
    var isOwner=role==='owner';
    var h='';
    h+='<style>';
    h+='.cm-wrap{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}';
    h+='@media(max-width:767px){.cm-wrap{grid-template-columns:1fr}}';
    h+='.cm-col{background:#fff;border:1px solid var(--bd);border-radius:var(--r);padding:14px;display:flex;flex-direction:column;gap:8px}';
    h+='.cm-title{font-size:14px;font-weight:700;text-align:center;padding:8px;border-radius:var(--rs);background:var(--bg);color:var(--t1)}';
    h+='.cm-title.cm-confirmed{background:var(--pr);color:#fff}';
    h+='.cm-section{border-bottom:1px solid var(--bd);padding-bottom:8px}';
    h+='.cm-section:last-of-type{border-bottom:none}';
    h+='.cm-sh{font-size:11px;font-weight:700;color:var(--ac);margin-bottom:4px}';
    h+='.cm-row{display:flex;align-items:center;gap:6px;margin-bottom:4px}';
    h+='.cm-lbl{font-size:11px;font-weight:600;color:var(--t2);width:40px;flex-shrink:0}';
    h+='.cm-fi{padding:6px 8px!important;font-size:12px!important}';
    h+='.cm-ta{font-size:11px!important;padding:6px 8px!important;line-height:1.5}';
    h+='.cm-agenda{font-size:11px;line-height:1.6;color:var(--t1);background:var(--bg);padding:8px 10px;border-radius:var(--rs);white-space:pre-wrap;word-break:break-word;max-height:300px;overflow-y:auto}';
    h+='</style>';
    h+='<div class="cm-wrap">';
    h+=buildColumnHtml('cmP',prvYM,prvData,false,false);
    h+=buildColumnHtml('cmC',curYM,curData,true,isOwner);
    h+='</div>';
    h+='<div style="text-align:right;margin-bottom:8px"><button type="button" class="fp" style="padding:8px 16px;font-weight:600" onclick="downloadComMinutesExcel()">📥 議事録Excelダウンロード</button></div>';
    return h;
  }

  function collectCurrentFormData(){
    var el=function(id){var e=document.getElementById(id);return e?e.value:''};
    return {
      date:el('cmCDate'),place:el('cmCPlace'),
      time_from:el('cmCTimeFrom'),time_to:el('cmCTimeTo'),
      attendees:el('cmCAtt'),absentees:el('cmCAbs'),
      participants:el('cmCParts'),
      other_reports:el('cmCOther'),discussions:el('cmCDisc')
    };
  }

  global.saveComMinutes=function(){
    var ym=getSelectedComYM();
    var data=collectCurrentFormData();
    var existing=window._comMinutesData||{};
    data.confirmed=!!existing.confirmed;
    data.confirmed_at=existing.confirmed_at||null;
    data.confirmed_by=existing.confirmed_by||null;
    var ymP=ym.split('-');
    data.agenda_text=buildAgendaForYM(ymP[0],ymP[1]);
    var st=document.getElementById('cmStatus');
    if(st)st.textContent='保存中…';
    saveMinutes(ym,data,function(err){
      if(st)st.textContent=err?'保存失敗: '+err:'保存しました（'+ymLabel(ym)+'）';
      window._comMinutesData=data;
      var tt=document.getElementById('cmCTitle');
      if(tt)tt.textContent=ymLabel(ym)+(data.confirmed?' 安全衛生委員会 議事録':' 安全衛生委員会 報告事項');
    });
  };

  global.confirmComMinutes=function(){
    var ym=getSelectedComYM();
    var data=collectCurrentFormData();
    var existing=window._comMinutesData||{};
    var wasConfirmed=!!existing.confirmed;
    if(wasConfirmed){
      if(!confirm('議事録の確定を取り消しますか？'))return;
      data.confirmed=false;data.confirmed_at=null;data.confirmed_by=null;
    }else{
      if(!confirm(ymLabel(ym)+'の議事録を確定しますか？'))return;
      data.confirmed=true;
      data.confirmed_at=new Date().toISOString();
      data.confirmed_by=(typeof CUR!=='undefined'&&CUR)?CUR.name:'所有者';
    }
    var ymP2=ym.split('-');
    data.agenda_text=buildAgendaForYM(ymP2[0],ymP2[1]);
    var st=document.getElementById('cmStatus');if(st)st.textContent='保存中…';
    saveMinutes(ym,data,function(err){
      if(st)st.textContent=err?'保存失敗':data.confirmed?'議事録を確定しました':'確定を取り消しました';
      window._comMinutesData=data;
      var tt=document.getElementById('cmCTitle');
      if(tt){tt.textContent=ymLabel(ym)+(data.confirmed?' 安全衛生委員会 議事録':' 安全衛生委員会 報告事項');if(data.confirmed)tt.classList.add('cm-confirmed');else tt.classList.remove('cm-confirmed')}
      var btn=document.getElementById('cmConfirmBtn');
      if(btn)btn.textContent=data.confirmed?'確定取消':'議事録を確定';
    });
  };

  function buildExcelAgenda(d,ym){
    var lines=[];
    var agText=d&&d.agenda_text;
    if(!agText&&ym){var pp=ym.split('-');agText=buildAgendaForYM(pp[0],pp[1])}
    if(agText){lines.push(agText);lines.push('')}
    if(d&&d.other_reports){lines.push('【その他報告事項】');lines.push(d.other_reports);lines.push('')}
    if(d&&d.discussions){lines.push('【協議事項】');lines.push(d.discussions);lines.push('')}
    return lines.join('\n').trim()||'（データなし）';
  }

  global.downloadComMinutesExcel=function(){
    if(typeof XLSX==='undefined'){alert('SheetJSが読み込まれていません');return}
    var curYM=getSelectedComYM();var pYM=prevYM(curYM);
    var curData=Object.assign({},window._comMinutesData||{},collectCurrentFormData());
    var cP=curYM.split('-');curData.agenda_text=buildAgendaForYM(cP[0],cP[1]);
    loadMinutes(pYM,function(prvData){
      prvData=prvData||{};
      var wb=XLSX.utils.book_new();var rows=[];var e='';
      var pL=ymLabel(pYM);var cL=ymLabel(curYM);
      rows.push(['安全衛生委員会会議記録（'+pL+'）',e,e,e,e,e,e,e,'安全衛生委員会会議記録（'+cL+'）',e,e,e,e,e,e,e]);
      rows.push([e,e,e,e,e,e,e,e,e,e,e,e,e,e,e,e]);
      rows.push(['日時',e,(prvData.date||'')+(prvData.time_from?' '+prvData.time_from:''),e,'～',prvData.time_to||'','場所',prvData.place||'','日時',e,(curData.date||'')+(curData.time_from?' '+curData.time_from:''),e,'～',curData.time_to||'','場所',curData.place||'']);
      rows.push(['出席者',e,prvData.attendees||'',e,e,e,e,e,'出席者',e,curData.attendees||'',e,e,e,e,e]);
      rows.push([e,e,e,e,e,e,e,e,e,e,e,e,e,e,e,e]);
      rows.push([e,e,e,e,e,e,e,e,e,e,e,e,e,e,e,e]);
      rows.push([e,e,e,e,e,e,e,e,e,e,e,e,e,e,e,e]);
      rows.push(['欠席者',e,prvData.absentees||'',e,e,e,e,e,'欠席者',e,curData.absentees||'',e,e,e,e,e]);
      rows.push(['参加者',e,prvData.participants||'',e,e,e,e,e,'参加者',e,curData.participants||'',e,e,e,e,e]);
      rows.push([e,e,e,e,e,e,e,e,e,e,e,e,e,e,e,e]);
      rows.push(['議案',e,e,e,e,e,e,e,'議案',e,e,e,e,e,e,e]);
      var pA=buildExcelAgenda(prvData,pYM).split('\n');
      var cA=buildExcelAgenda(curData,curYM).split('\n');
      var mx=Math.max(pA.length,cA.length,30);
      for(var i=0;i<mx;i++)rows.push([pA[i]||'',e,e,e,e,e,e,e,cA[i]||'',e,e,e,e,e,e,e]);
      var ws=XLSX.utils.aoa_to_sheet(rows);
      ws['!merges']=[
        {s:{r:0,c:0},e:{r:1,c:7}},{s:{r:0,c:8},e:{r:1,c:15}},
        {s:{r:3,c:0},e:{r:6,c:0}},{s:{r:3,c:2},e:{r:6,c:5}},
        {s:{r:3,c:8},e:{r:6,c:8}},{s:{r:3,c:10},e:{r:6,c:13}},
        {s:{r:10,c:0},e:{r:10+mx,c:7}},{s:{r:10,c:8},e:{r:10+mx,c:15}}
      ];
      ws['!cols']=[{wch:6},{wch:12},{wch:10},{wch:4},{wch:4},{wch:8},{wch:10},{wch:16},{wch:6},{wch:12},{wch:10},{wch:4},{wch:4},{wch:8},{wch:10},{wch:16}];
      XLSX.utils.book_append_sheet(wb,ws,'議事録');
      XLSX.writeFile(wb,'committee_minutes_'+curYM+'.xlsx');
    });
  };

  global.comMinutesInit=function(role){
    var wrap=document.getElementById('comMinutesWrap');if(!wrap)return;
    var curYM=getSelectedComYM();var pYM=prevYM(curYM);
    wrap.innerHTML='<div style="text-align:center;padding:20px;color:var(--t3);font-size:12px">読み込み中…</div>';
    loadMinutes(pYM,function(prvData){
      loadMinutes(curYM,function(curData){
        window._comMinutesData=curData||{};
        wrap.innerHTML=buildFullHtml(curYM,curData,pYM,prvData,role);
      });
    });
  };
  global.comMinutesReload=function(){
    var wrap=document.getElementById('comMinutesWrap');if(!wrap)return;
    var curYM=getSelectedComYM();var pYM=prevYM(curYM);
    loadMinutes(pYM,function(prvData){
      loadMinutes(curYM,function(curData){
        window._comMinutesData=curData||{};
        var role=typeof ROLE!=='undefined'?ROLE:'user';
        wrap.innerHTML=buildFullHtml(curYM,curData,pYM,prvData,role);
      });
    });
  };
})(typeof window!=='undefined'?window:this);
