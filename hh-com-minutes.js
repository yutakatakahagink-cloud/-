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
  var DEFAULT_PARTICIPANTS=[
    {role:'建材本部',name:'木田寛'},
    {role:'建材本部',name:'甲斐淳林'},
    {role:'建材宮崎',name:'内八重俊哉'},
    {role:'建材延岡',name:'中城俊昭'},
    {role:'建材大分',name:'福島洋幸'},
    {role:'建材鹿児島',name:'小濵一晴'},
    {role:'土木本部',name:'成岡弘治'},
    {role:'土木部',name:'児玉大祐'},
    {role:'社長',name:'吉川真人'}
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
  function defaultParticipantsText(){
    return DEFAULT_PARTICIPANTS.map(function(m){return m.role+'：'+m.name}).join('、');
  }

  function buildAgendaFromData(){return window._comAgendaText||'（報告データなし）'}

  function buildAgendaForYM(y,m){
    var reports=(typeof DB!=='undefined'?DB:[])||[];
    var disList=(typeof DIS_LIST!=='undefined'?DIS_LIST:[])||[];
    var reqList=(typeof REQ_LIST!=='undefined'?REQ_LIST:[])||[];
    var fd=reports.filter(function(r){var dt=r.date||'';return dt.substring(0,4)===y&&dt.substring(5,7)===m});
    var hi=fd.filter(function(r){return r.l>=7});
    var ec={};fd.forEach(function(r){(r.e||[]).forEach(function(e){ec[e]=(ec[e]||0)+1})});
    var te=Object.entries(ec).sort(function(a,b){return b[1]-a[1]})[0];
    var lines=[];var no=1;
    lines.push(no+'．ヒヤリハット報告');no++;
    lines.push('  ・報告総数 '+fd.length+'件');
    lines.push('  ・高レベル(Lv.7+) '+hi.length+'件');
    if(te)lines.push('  ・最頻出体験: '+te[0]+'（'+te[1]+'件）');
    var se=Object.entries(ec).sort(function(a,b){return b[1]-a[1]});
    if(se.length)se.forEach(function(x){lines.push('  ・'+x[0]+': '+x[1]+'件')});
    lines.push('');
    var cc={};fd.forEach(function(r){(r.c||[]).forEach(function(c){cc[c]=(cc[c]||0)+1})});
    var sc=Object.entries(cc).sort(function(a,b){return b[1]-a[1]});
    if(sc.length){
      lines.push(no+'．発生原因');no++;
      sc.forEach(function(x){lines.push('  ・'+x[0]+': '+x[1]+'件')});
      lines.push('');
    }
    var dl=disList.filter(function(r){var dt=r.datetime||r.date||'';return dt.substring(0,4)===y&&dt.substring(5,7)===m});
    lines.push(no+'．災害報告'+(dl.length?'（'+dl.length+'件）':'（なし）'));no++;
    if(dl.length){
      dl.forEach(function(r){
        lines.push('  ・'+(r.datetime||r.date||'—')+' '+(r.place||r.basho||'—')+' '+(r.type||r.jiko||r.keigen||''));
        if(r.situation||r.basho_detail)lines.push('    発生状況: '+(r.basho_detail||r.situation||'').substring(0,80));
        if(r.taisaku||r.measure)lines.push('    対策: '+(r.taisaku||r.measure||'').substring(0,80));
      });
    }
    lines.push('');
    var rl=reqList.filter(function(r){return(r.date||'').substring(0,4)===y&&(r.date||'').substring(5,7)===m});
    lines.push(no+'．安全衛生要望'+(rl.length?'（'+rl.length+'件）':'（なし）'));no++;
    if(rl.length){
      rl.forEach(function(r){
        var st=r.status==='resolved'?'解決済み':r.status==='in_progress'?'取り掛かり中':'未対応';
        lines.push('  ・['+st+'] '+(r.name||'—')+'（'+(r.dept||'—')+'）: '+(r.content||''));
      });
    }
    lines.push('');
    lines.push(no+'．背景要因・職場環境分析');no++;
    var stData=fd.filter(function(r){return r.st&&Object.keys(r.st).length});
    if(stData.length){
      var stAvg={};var stCt=0;
      stData.forEach(function(r){Object.entries(r.st||{}).forEach(function(e){stAvg[e[0]]=(stAvg[e[0]]||0)+e[1];stCt++})});
      var stKeys=Object.keys(stAvg);if(stKeys.length){var n=stData.length;lines.push('  ストレス要因データ '+n+'件');var top=stKeys.sort(function(a,b){return stAvg[a]-stAvg[b]}).slice(0,3);top.forEach(function(k){lines.push('  ・'+k+': 平均'+(stAvg[k]/n).toFixed(1))})}
    }else{lines.push('  （データなし）')}
    lines.push('');
    lines.push(no+'．法改正');no++;
    var lawCount=0;
    if(typeof window.comLawEnacted!=='undefined'&&window.comLawEnacted&&window.comLawEnacted.length){
      lines.push('  〔施行済み〕');
      window.comLawEnacted.forEach(function(l){lines.push('  ・'+l.law+' '+l.short+' ('+l.date+')');lawCount++});
    }
    if(typeof window.comLawUpcoming!=='undefined'&&window.comLawUpcoming&&window.comLawUpcoming.length){
      lines.push('  〔施行予定〕');
      window.comLawUpcoming.forEach(function(l){lines.push('  ・'+l.law+' '+l.short+' ('+l.date+')');lawCount++});
    }
    if(!lawCount)lines.push('  （該当なし）');
    return lines.join('\n').trim();
  }
  global.buildAgendaForYM=buildAgendaForYM;

  function todayStr(){return new Date().toISOString().slice(0,10)}

  function buildColumnHtml(prefix,ym,data,isEditable,isOwner){
    var d=data||{};var lbl=ymLabel(ym);
    var titleText=d.confirmed?lbl+' 安全衛生委員会 議事録':lbl+' 安全衛生委員会 報告事項';
    var ro=isEditable?'':'readonly';
    var roBg=isEditable?'':'background:#f5f5f5';
    var isSaved=!!d.yearMonth;
    var dateVal=d.date||(isEditable&&!isSaved?todayStr():'');
    var placeVal=(d.place!=null&&d.place!=='')?d.place:(isEditable&&!isSaved?'WEB/本社1F会議室':'');
    var tfVal=d.time_from||(isEditable&&!isSaved?'09:00':'');
    var ttVal=d.time_to||(isEditable&&!isSaved?'10:00':'');
    var h='';
    h+='<div class="cm-col" id="'+prefix+'Col">';
    h+='<div class="cm-title'+(d.confirmed?' cm-confirmed':'')+'" id="'+prefix+'Title">'+esc(titleText)+'</div>';

    h+='<div class="cm-section"><div class="cm-row"><div class="cm-lbl">開催日</div><input class="fi cm-fi" type="date" id="'+prefix+'Date" value="'+esc(dateVal)+'" '+ro+' style="'+roBg+'"></div>';
    h+='<div class="cm-row"><div class="cm-lbl">場所</div><input class="fi cm-fi" type="text" id="'+prefix+'Place" value="'+esc(placeVal)+'" placeholder="WEB" '+ro+' style="'+roBg+'"></div>';
    h+='<div class="cm-row"><div class="cm-lbl">時間</div><div style="display:flex;gap:4px;align-items:center;flex:1"><input class="fi cm-fi" type="time" id="'+prefix+'TimeFrom" value="'+esc(tfVal)+'" '+ro+' style="'+roBg+'">～<input class="fi cm-fi" type="time" id="'+prefix+'TimeTo" value="'+esc(ttVal)+'" '+ro+' style="'+roBg+'"></div></div></div>';

    h+='<div class="cm-section"><div class="cm-sh">出席者</div>';
    var att=(d.attendees!=null&&d.attendees!=='')?d.attendees:(isEditable&&!d.yearMonth?defaultAttendeesText():'');
    h+='<textarea class="ft cm-ta" id="'+prefix+'Att" '+ro+' style="min-height:50px;'+roBg+'" placeholder="役割：氏名">'+esc(att)+'</textarea></div>';

    h+='<div class="cm-section"><div class="cm-sh">欠席者</div>';
    h+='<textarea class="ft cm-ta" id="'+prefix+'Abs" '+ro+' style="min-height:30px;'+roBg+'" placeholder="欠席者名">'+esc(d.absentees||'')+'</textarea></div>';

    h+='<div class="cm-section"><div class="cm-sh">参加者</div>';
    var parts=(d.participants!=null&&d.participants!=='')?d.participants:(isEditable&&!d.yearMonth?defaultParticipantsText():'');
    h+='<textarea class="ft cm-ta" id="'+prefix+'Parts" '+ro+' style="min-height:40px;'+roBg+'" placeholder="安全担当・その他参加者">'+esc(parts)+'</textarea></div>';

    h+='<div class="cm-section"><div class="cm-sh">議案（定例報告）</div>';
    var ymParts=ym.split('-');
    var agText=(d.yearMonth&&d.agenda_text!=null)?d.agenda_text:buildAgendaForYM(ymParts[0],ymParts[1]);
    h+='<textarea class="ft cm-ta cm-auto" id="'+prefix+'Agenda" '+ro+' style="min-height:250px;height:300px;'+roBg+';line-height:1.6" placeholder="報告データから自動生成">'+esc(agText)+'</textarea></div>';

    h+='<div class="cm-section"><div class="cm-sh">その他報告事項</div>';
    h+='<textarea class="ft cm-ta cm-auto" id="'+prefix+'Other" '+ro+' style="min-height:100px;height:120px;'+roBg+'" placeholder="委員会での報告事項">'+esc(d.other_reports||'')+'</textarea></div>';

    h+='<div class="cm-section"><div class="cm-sh">協議事項</div>';
    h+='<textarea class="ft cm-ta cm-auto" id="'+prefix+'Disc" '+ro+' style="min-height:100px;height:120px;'+roBg+'" placeholder="委員会での協議事項">'+esc(d.discussions||'')+'</textarea></div>';

    h+='<div class="cm-section"><div class="cm-sh">付随書類</div>';
    if(isEditable){
      h+='<div style="margin-bottom:6px"><input type="file" id="'+prefix+'FileInput" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.csv" style="font-size:11px" onchange="comMinutesAddFiles(this)"></div>';
    }
    var files=isEditable?(window._cmPendingFiles||[]):(window['_cmFiles_'+ym]||[]);
    h+='<div id="'+prefix+'FileList">';
    if(files.length){
      files.forEach(function(f,i){
        h+='<div class="cm-file-item" style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--bd);font-size:11px">';
        h+='<span style="flex:1;word-break:break-all">📎 '+esc(f.name)+'</span>';
        if(f.url)h+='<a href="'+esc(f.url)+'" download="'+esc(f.name)+'" style="color:var(--ac);font-size:10px;white-space:nowrap">ダウンロード</a>';
        if(isEditable)h+='<button type="button" style="border:none;background:none;color:var(--rd);cursor:pointer;font-size:12px;padding:2px 4px" onclick="comMinutesRemoveFile('+i+')">✕</button>';
        h+='</div>';
      });
    }else{
      h+='<div style="font-size:10px;color:var(--t3);padding:4px 0">（なし）</div>';
    }
    h+='</div></div>';

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
    h+='.cm-title{font-size:14px;font-weight:700;text-align:center;padding:8px;border-radius:var(--rs);background:var(--bg2,#e8eef5);color:var(--t1)}';
    h+='.cm-title.cm-confirmed{background:linear-gradient(135deg,#1d5bbf,#2563eb);color:#fff}';
    h+='.cm-section{border-bottom:1px solid var(--bd);padding-bottom:8px}';
    h+='.cm-section:last-of-type{border-bottom:none}';
    h+='.cm-sh{font-size:11px;font-weight:700;color:var(--ac);margin-bottom:4px}';
    h+='.cm-row{display:flex;align-items:center;gap:6px;margin-bottom:4px}';
    h+='.cm-lbl{font-size:11px;font-weight:600;color:var(--t2);width:40px;flex-shrink:0}';
    h+='.cm-fi{padding:6px 8px!important;font-size:12px!important}';
    h+='.cm-ta{font-size:11px!important;padding:6px 8px!important;line-height:1.5}';
    h+='.cm-auto{overflow-y:auto;resize:vertical}';
    h+='</style>';
    h+='<script>setTimeout(function(){document.querySelectorAll(".cm-auto").forEach(function(ta){function grow(){ta.style.height="auto";ta.style.height=ta.scrollHeight+"px"}ta.addEventListener("input",grow);grow()})},50)<\/script>';
    h+='<div class="cm-wrap">';
    h+=buildColumnHtml('cmP',prvYM,prvData,false,false);
    h+=buildColumnHtml('cmC',curYM,curData,true,isOwner);
    h+='</div>';
    h+='<div style="text-align:right;margin-bottom:8px"><button type="button" class="fp" style="padding:8px 16px;font-weight:600" onclick="downloadComMinutesExcel()">📥 議事録Excelダウンロード</button></div>';
    return h;
  }

  var IDB_NAME='hh_committee_files_db';
  var IDB_STORE='files';
  var IDB_VER=1;
  window._cmPendingFiles=[];

  function openIDB(cb){
    if(!window.indexedDB){cb(null);return}
    var req=indexedDB.open(IDB_NAME,IDB_VER);
    req.onupgradeneeded=function(){req.result.createObjectStore(IDB_STORE)};
    req.onsuccess=function(){cb(req.result)};
    req.onerror=function(){cb(null)};
  }
  function saveFilesToLocal(ym,files){
    openIDB(function(db){
      if(!db)return;
      try{var tx=db.transaction(IDB_STORE,'readwrite');tx.objectStore(IDB_STORE).put(files,ym)}catch(e){console.warn('IndexedDB save error',e)}
    });
  }
  function loadFilesFromLocal(ym,cb){
    if(typeof cb!=='function'){var sync=[];return sync}
    openIDB(function(db){
      if(!db){cb([]);return}
      try{
        var tx=db.transaction(IDB_STORE,'readonly');
        var req=tx.objectStore(IDB_STORE).get(ym);
        req.onsuccess=function(){cb(req.result||[])};
        req.onerror=function(){cb([])};
      }catch(e){cb([])}
    });
  }

  function formatSize(bytes){
    if(bytes>=1024*1024)return(bytes/(1024*1024)).toFixed(1)+'MB';
    return Math.round(bytes/1024)+'KB';
  }

  global.comMinutesAddFiles=function(input){
    if(!input||!input.files)return;
    var existing=window._cmPendingFiles||[];
    var remaining=Array.from(input.files);
    var idx=0;
    function next(){
      if(idx>=remaining.length){window._cmPendingFiles=existing;refreshFileList();return}
      var file=remaining[idx++];
      var reader=new FileReader();
      reader.onload=function(){
        existing.push({name:file.name,url:reader.result,size:file.size});
        next();
      };
      reader.onerror=function(){alert(file.name+' の読み込みに失敗しました');next()};
      reader.readAsDataURL(file);
    }
    next();
    input.value='';
  };

  global.comMinutesRemoveFile=function(idx){
    var files=window._cmPendingFiles||[];
    files.splice(idx,1);
    window._cmPendingFiles=files;
    refreshFileList();
  };

  function refreshFileList(){
    var list=document.getElementById('cmCFileList');if(!list)return;
    var files=window._cmPendingFiles||[];
    if(!files.length){list.innerHTML='<div style="font-size:10px;color:var(--t3);padding:4px 0">（なし）</div>';return}
    var h='';
    files.forEach(function(f,i){
      h+='<div class="cm-file-item" style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--bd);font-size:11px">';
      h+='<span style="flex:1;word-break:break-all">📎 '+esc(f.name)+' <span style="color:var(--t3);font-size:9px">('+formatSize(f.size||0)+')</span></span>';
      if(f.url)h+='<a href="'+esc(f.url)+'" download="'+esc(f.name)+'" style="color:var(--ac);font-size:10px;white-space:nowrap">DL</a>';
      h+='<button type="button" style="border:none;background:none;color:var(--rd);cursor:pointer;font-size:12px;padding:2px 4px" onclick="comMinutesRemoveFile('+i+')">✕</button>';
      h+='</div>';
    });
    list.innerHTML=h;
  }

  function collectCurrentFormData(){
    var el=function(id){var e=document.getElementById(id);return e?e.value:''};
    return {
      date:el('cmCDate'),place:el('cmCPlace'),
      time_from:el('cmCTimeFrom'),time_to:el('cmCTimeTo'),
      attendees:el('cmCAtt'),absentees:el('cmCAbs'),
      participants:el('cmCParts'),
      agenda_text:el('cmCAgenda'),
      other_reports:el('cmCOther'),discussions:el('cmCDisc'),
      attachment_names:(window._cmPendingFiles||[]).map(function(f){return f.name})
    };
  }

  global.saveComMinutes=function(){
    var ym=getSelectedComYM();
    var data=collectCurrentFormData();
    var existing=window._comMinutesData||{};
    data.confirmed=!!existing.confirmed;
    data.confirmed_at=existing.confirmed_at||null;
    data.confirmed_by=existing.confirmed_by||null;
    saveFilesToLocal(ym,window._cmPendingFiles||[]);
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
    saveFilesToLocal(ym,window._cmPendingFiles||[]);
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

  global.downloadComMinutesExcel=function(){
    if(typeof comMinutesDownloadExcel!=='function'){alert('議事録Excel出力モジュールが読み込まれていません');return}
    var curYM=getSelectedComYM();var pYM=prevYM(curYM);
    var curData=Object.assign({},window._comMinutesData||{},collectCurrentFormData());
    loadMinutes(pYM,function(prvData){
      comMinutesDownloadExcel(prvData||{},curData,pYM,curYM,ymLabel,buildAgendaForYM).catch(function(err){
        console.error('[com-minutes]',err);
        alert('Excel出力に失敗しました: '+(err&&(err.message||String(err))||'不明なエラー'));
      });
    });
  };

  function loadAllAndRender(wrap,role){
    var curYM=getSelectedComYM();var pYM=prevYM(curYM);
    wrap.innerHTML='<div style="text-align:center;padding:20px;color:var(--t3);font-size:12px">読み込み中…</div>';
    loadMinutes(pYM,function(prvData){
      loadMinutes(curYM,function(curData){
        window._comMinutesData=curData||{};
        loadFilesFromLocal(curYM,function(curFiles){
          window._cmPendingFiles=curFiles||[];
          loadFilesFromLocal(pYM,function(prvFiles){
            window['_cmFiles_'+pYM]=prvFiles||[];
            wrap.innerHTML=buildFullHtml(curYM,curData,pYM,prvData,role);
          });
        });
      });
    });
  }
  global.comMinutesInit=function(role){
    var wrap=document.getElementById('comMinutesWrap');if(!wrap)return;
    loadAllAndRender(wrap,role);
  };
  global.comMinutesReload=function(){
    var wrap=document.getElementById('comMinutesWrap');if(!wrap)return;
    var role=typeof ROLE!=='undefined'?ROLE:'user';
    loadAllAndRender(wrap,role);
  };
})(typeof window!=='undefined'?window:this);
