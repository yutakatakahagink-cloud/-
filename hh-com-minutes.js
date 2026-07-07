/**
 * 委員会議事録 — データ保存・読込・確定・Excelダウンロード
 */
(function(global){
  'use strict';
  var LS_KEY='hh_committee_minutes';
  var FB_PATH='hh_data/committee_minutes';

  function fbRef(ym){
    if(typeof HHDB==='undefined'||!HHDB.useFirebase||!HHDB.useFirebase())return null;
    try{var db=firebase.app().database();return db.ref(FB_PATH+'/'+ym)}catch(e){return null}
  }

  function loadMinutes(ym,cb){
    var ref=fbRef(ym);
    if(ref){
      ref.once('value',function(snap){
        var v=snap.val();
        if(v){try{var ls=JSON.parse(localStorage.getItem(LS_KEY)||'{}');ls[ym]=v;localStorage.setItem(LS_KEY,JSON.stringify(ls))}catch(e){}}
        cb(v||null);
      },function(){cb(loadLocal(ym))});
      return;
    }
    cb(loadLocal(ym));
  }
  function loadLocal(ym){
    try{var all=JSON.parse(localStorage.getItem(LS_KEY)||'{}');return all[ym]||null}catch(e){return null}
  }
  function saveMinutes(ym,data,cb){
    data.yearMonth=ym;
    try{var all=JSON.parse(localStorage.getItem(LS_KEY)||'{}');all[ym]=data;localStorage.setItem(LS_KEY,JSON.stringify(all))}catch(e){}
    var ref=fbRef(ym);
    if(ref){ref.set(data,function(err){if(typeof cb==='function')cb(err)});return}
    if(typeof cb==='function')cb(null);
  }

  function currentYM(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
  function prevYM(ym){
    var p=ym.split('-');var y=parseInt(p[0],10),m=parseInt(p[1],10)-1;
    if(m<1){m=12;y--}
    return y+'-'+String(m).padStart(2,'0');
  }
  function ymLabel(ym){var p=ym.split('-');return p[0]+'年'+parseInt(p[1],10)+'月'}

  function buildMinutesFormHtml(role){
    var isOwner=role==='owner';
    var h='';
    h+='<div id="comMinutesTitle" style="font-size:16px;font-weight:700;color:var(--t1);margin:16px 0 12px;text-align:center">安全衛生委員会 報告事項</div>';
    h+='<div class="cb" id="comMinutesForm" style="margin-bottom:12px">';
    h+='<div class="cht" style="cursor:pointer" onclick="toggleComMinutesForm()"><span class="chd" style="background:var(--pr)"></span>📝 議事録情報 <span id="comMinutesToggle" style="margin-left:auto;font-size:10px;color:var(--t3)">▼</span></div>';
    h+='<div id="comMinutesBody">';
    h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">';
    h+='<div class="fg" style="margin:0"><label class="fl">開催日</label><input class="fi" type="date" id="cmDate"></div>';
    h+='<div class="fg" style="margin:0"><label class="fl">開催場所</label><input class="fi" type="text" id="cmPlace" placeholder="例: WEB / 本社会議室"></div>';
    h+='</div>';
    h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">';
    h+='<div class="fg" style="margin:0"><label class="fl">開始時間</label><input class="fi" type="time" id="cmTimeFrom"></div>';
    h+='<div class="fg" style="margin:0"><label class="fl">終了時間</label><input class="fi" type="time" id="cmTimeTo"></div>';
    h+='</div>';
    h+='<div class="fg"><label class="fl">出席者</label><textarea class="ft" id="cmAttendees" placeholder="出席者名をカンマ区切りまたは改行" style="min-height:50px"></textarea></div>';
    h+='<div class="fg"><label class="fl">欠席者</label><textarea class="ft" id="cmAbsentees" placeholder="欠席者名" style="min-height:40px"></textarea></div>';
    h+='<div class="fg"><label class="fl">その他報告事項</label><textarea class="ft" id="cmOtherReports" placeholder="委員会での報告内容" style="min-height:60px"></textarea></div>';
    h+='<div class="fg"><label class="fl">協議事項</label><textarea class="ft" id="cmDiscussions" placeholder="委員会での協議内容" style="min-height:60px"></textarea></div>';
    h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">';
    h+='<button type="button" class="sub" style="flex:1;min-width:120px;margin:0;padding:10px" onclick="saveComMinutes()">保存</button>';
    if(isOwner){
      h+='<button type="button" class="sub" id="cmConfirmBtn" style="flex:1;min-width:120px;margin:0;padding:10px;background:var(--pr)" onclick="confirmComMinutes()">議事録を確定する</button>';
    }
    h+='</div>';
    h+='<div id="cmStatus" style="font-size:11px;color:var(--t3);margin-top:8px;text-align:center"></div>';
    h+='</div></div>';
    h+='<div style="text-align:right;margin-bottom:12px"><button type="button" class="fp" style="padding:8px 16px;font-weight:600" onclick="downloadComMinutesExcel()">📥 議事録Excelダウンロード</button></div>';
    return h;
  }

  function getSelectedComYM(){
    var sel=document.getElementById('pfCom');
    if(!sel)return currentYM();
    var yEl=sel.querySelector('select[data-type="year"]')||sel.querySelector('select');
    var mEl=sel.querySelectorAll('select')[1];
    var y=yEl?yEl.value:'';
    var m=mEl?mEl.value:'';
    if(!y||y==='all')y=String(new Date().getFullYear());
    if(!m||m==='all')m=String(new Date().getMonth()+1).padStart(2,'0');
    return y+'-'+m;
  }

  function fillFormFromData(d){
    if(!d)d={};
    var el=function(id){return document.getElementById(id)};
    if(el('cmDate'))el('cmDate').value=d.date||'';
    if(el('cmPlace'))el('cmPlace').value=d.place||'';
    if(el('cmTimeFrom'))el('cmTimeFrom').value=d.time_from||'';
    if(el('cmTimeTo'))el('cmTimeTo').value=d.time_to||'';
    if(el('cmAttendees'))el('cmAttendees').value=d.attendees||'';
    if(el('cmAbsentees'))el('cmAbsentees').value=d.absentees||'';
    if(el('cmOtherReports'))el('cmOtherReports').value=d.other_reports||'';
    if(el('cmDiscussions'))el('cmDiscussions').value=d.discussions||'';
    updateMinutesTitle(d);
    updateConfirmBtn(d);
  }

  function collectFormData(){
    var el=function(id){var e=document.getElementById(id);return e?e.value:''};
    return {
      date:el('cmDate'),place:el('cmPlace'),
      time_from:el('cmTimeFrom'),time_to:el('cmTimeTo'),
      attendees:el('cmAttendees'),absentees:el('cmAbsentees'),
      other_reports:el('cmOtherReports'),discussions:el('cmDiscussions')
    };
  }

  function updateMinutesTitle(d){
    var tt=document.getElementById('comMinutesTitle');
    if(!tt)return;
    if(d&&d.confirmed){
      tt.textContent='安全衛生委員会 議事録';
      tt.style.color='var(--pr)';
    }else{
      tt.textContent='安全衛生委員会 報告事項';
      tt.style.color='var(--t1)';
    }
  }
  function updateConfirmBtn(d){
    var btn=document.getElementById('cmConfirmBtn');
    if(!btn)return;
    if(d&&d.confirmed){
      btn.textContent='確定済み（取消）';
      btn.style.background='var(--t3)';
    }else{
      btn.textContent='議事録を確定する';
      btn.style.background='var(--pr)';
    }
  }

  function loadAndFillForm(ym){
    var st=document.getElementById('cmStatus');
    if(st)st.textContent='読み込み中…';
    loadMinutes(ym,function(d){
      fillFormFromData(d);
      if(st)st.textContent=d?'読み込み完了':'（未保存）';
      window._comMinutesData=d||{};
    });
  }

  global.toggleComMinutesForm=function(){
    var body=document.getElementById('comMinutesBody');
    var icon=document.getElementById('comMinutesToggle');
    if(!body)return;
    if(body.style.display==='none'){body.style.display='';if(icon)icon.textContent='▼'}
    else{body.style.display='none';if(icon)icon.textContent='▶'}
  };

  function grabCardText(id){
    var el=document.getElementById(id);
    if(!el)return '';
    return (el.innerText||el.textContent||'').trim();
  }
  function grabFullCardText(id){
    var el=document.getElementById(id);
    if(!el)return '';
    return (el.innerText||el.textContent||'').trim();
  }

  function collectAgendaFromScreen(){
    var sections=[];
    var summary=grabCardText('cS');
    if(summary)sections.push({title:'報告状況',text:summary});
    var byexp=grabCardText('cByExp');
    if(byexp)sections.push({title:'体験別→対策提案',text:byexp});
    var deptAn=grabCardText('cDeptAn');
    if(deptAn)sections.push({title:'本部別 背景要因・職場環境分析',text:deptAn});
    var req=grabCardText('cReq');
    if(req)sections.push({title:'安全衛生要望',text:req});
    var dis=grabCardText('cDisCom');
    if(dis)sections.push({title:'災害報告',text:dis});
    var law=grabCardText('cLaw');
    if(law)sections.push({title:'法改正',text:law});
    return sections;
  }

  function buildAgendaTextFromSections(sections,d){
    var lines=[];
    (sections||[]).forEach(function(s){
      lines.push('【'+s.title+'】');
      lines.push(s.text);
      lines.push('');
    });
    if(d&&d.other_reports){
      lines.push('【その他報告事項】');
      lines.push(d.other_reports);
      lines.push('');
    }
    if(d&&d.discussions){
      lines.push('【協議事項】');
      lines.push(d.discussions);
      lines.push('');
    }
    return lines.join('\n').trim();
  }

  global.saveComMinutes=function(){
    var ym=getSelectedComYM();
    var data=collectFormData();
    var existing=window._comMinutesData||{};
    data.confirmed=!!existing.confirmed;
    data.confirmed_at=existing.confirmed_at||null;
    data.confirmed_by=existing.confirmed_by||null;
    data.agenda_sections=collectAgendaFromScreen();
    data.agenda_text=buildAgendaTextFromSections(data.agenda_sections,data);
    var st=document.getElementById('cmStatus');
    if(st)st.textContent='保存中…';
    saveMinutes(ym,data,function(err){
      if(st)st.textContent=err?'保存失敗: '+err:'保存しました（'+ymLabel(ym)+'）';
      window._comMinutesData=data;
      updateMinutesTitle(data);
    });
  };

  global.confirmComMinutes=function(){
    var ym=getSelectedComYM();
    var data=collectFormData();
    var existing=window._comMinutesData||{};
    var isConfirmed=!!existing.confirmed;
    if(isConfirmed){
      if(!confirm('議事録の確定を取り消しますか？'))return;
      data.confirmed=false;data.confirmed_at=null;data.confirmed_by=null;
    }else{
      if(!confirm(ymLabel(ym)+'の議事録を確定しますか？\n確定すると「安全衛生委員会 議事録」に名称が変わります。'))return;
      data.confirmed=true;
      data.confirmed_at=new Date().toISOString();
      data.confirmed_by=(typeof CUR!=='undefined'&&CUR)?CUR.name:'所有者';
    }
    data.agenda_sections=collectAgendaFromScreen();
    data.agenda_text=buildAgendaTextFromSections(data.agenda_sections,data);
    var st=document.getElementById('cmStatus');
    if(st)st.textContent='保存中…';
    saveMinutes(ym,data,function(err){
      if(st)st.textContent=err?'保存失敗':data.confirmed?'議事録を確定しました':'確定を取り消しました';
      window._comMinutesData=data;
      updateMinutesTitle(data);
      updateConfirmBtn(data);
    });
  };

  function buildAgendaForExcel(d){
    if(d&&d.agenda_text)return d.agenda_text;
    if(d&&d.agenda_sections&&d.agenda_sections.length){
      return buildAgendaTextFromSections(d.agenda_sections,d);
    }
    var sections=collectAgendaFromScreen();
    return buildAgendaTextFromSections(sections,d);
  }

  global.downloadComMinutesExcel=function(){
    if(typeof XLSX==='undefined'){alert('SheetJSが読み込まれていません。');return}
    var curYM=getSelectedComYM();
    var prvYM=prevYM(curYM);
    var curData=window._comMinutesData||{};
    if(!curData.agenda_text){
      curData.agenda_sections=collectAgendaFromScreen();
      curData.agenda_text=buildAgendaTextFromSections(curData.agenda_sections,curData);
    }

    loadMinutes(prvYM,function(prvData){
      prvData=prvData||{};
      var wb=XLSX.utils.book_new();
      var rows=[];
      var prvLabel=ymLabel(prvYM);
      var curLabel=ymLabel(curYM);
      var TITLE_P='安全衛生委員会会議記録（'+prvLabel+'）';
      var TITLE_C='安全衛生委員会会議記録（'+curLabel+'）';
      var e='';

      rows.push([TITLE_P,e,e,e,e,e,e,e, TITLE_C,e,e,e,e,e,e,e]);
      rows.push([e,e,e,e,e,e,e,e, e,e,e,e,e,e,e,e]);

      var pDt=(prvData.date||'')+(prvData.time_from?' '+prvData.time_from:'');
      var pDtTo=prvData.time_to||'';
      var cDt=(curData.date||'')+(curData.time_from?' '+curData.time_from:'');
      var cDtTo=curData.time_to||'';
      rows.push(['日時',e,pDt,e,'～',pDtTo,'開催場所',prvData.place||'', '日時',e,cDt,e,'～',cDtTo,'開催場所',curData.place||'']);

      rows.push(['出席者',e,prvData.attendees||'',e,e,e,e,e, '出席者',e,curData.attendees||'',e,e,e,e,e]);
      rows.push([e,e,e,e,e,e,e,e, e,e,e,e,e,e,e,e]);
      rows.push([e,e,e,e,e,e,e,e, e,e,e,e,e,e,e,e]);
      rows.push([e,e,e,e,e,e,e,e, e,e,e,e,e,e,e,e]);

      rows.push(['欠席者',e,prvData.absentees||'',e,e,e,e,e, '欠席者',e,curData.absentees||'',e,e,e,e,e]);
      rows.push([e,e,e,e,e,e,e,e, e,e,e,e,e,e,e,e]);
      rows.push([e,e,e,e,e,e,e,e, e,e,e,e,e,e,e,e]);

      var prvAgenda=buildAgendaForExcel(prvData);
      var curAgenda=buildAgendaForExcel(curData);
      rows.push(['議案',e,e,e,e,e,e,e, '議案',e,e,e,e,e,e,e]);

      var prvLines=prvAgenda.split('\n');
      var curLines=curAgenda.split('\n');
      var maxLines=Math.max(prvLines.length,curLines.length,30);
      for(var i=0;i<maxLines;i++){
        rows.push([prvLines[i]||'',e,e,e,e,e,e,e, curLines[i]||'',e,e,e,e,e,e,e]);
      }

      var ws=XLSX.utils.aoa_to_sheet(rows);

      ws['!merges']=[
        {s:{r:0,c:0},e:{r:1,c:7}},
        {s:{r:0,c:8},e:{r:1,c:15}},
        {s:{r:3,c:0},e:{r:6,c:0}},
        {s:{r:3,c:2},e:{r:6,c:4}},
        {s:{r:3,c:8},e:{r:6,c:8}},
        {s:{r:3,c:10},e:{r:6,c:12}},
        {s:{r:7,c:0},e:{r:9,c:0}},
        {s:{r:7,c:2},e:{r:9,c:4}},
        {s:{r:7,c:8},e:{r:9,c:8}},
        {s:{r:7,c:10},e:{r:9,c:12}},
        {s:{r:10,c:0},e:{r:10+maxLines,c:7}},
        {s:{r:10,c:8},e:{r:10+maxLines,c:15}}
      ];

      ws['!cols']=[
        {wch:10},{wch:6},{wch:14},{wch:10},{wch:4},{wch:10},{wch:10},{wch:10},
        {wch:10},{wch:6},{wch:14},{wch:10},{wch:4},{wch:10},{wch:10},{wch:10}
      ];

      XLSX.utils.book_append_sheet(wb,ws,'議事録');
      XLSX.writeFile(wb,'committee_minutes_'+curYM+'.xlsx');
    });
  };

  global.comMinutesInit=function(role){
    var wrap=document.getElementById('comMinutesWrap');
    if(!wrap)return;
    wrap.innerHTML=buildMinutesFormHtml(role);
    var ym=getSelectedComYM();
    loadAndFillForm(ym);
  };

  global.comMinutesReload=function(){
    var ym=getSelectedComYM();
    loadAndFillForm(ym);
  };

})(typeof window!=='undefined'?window:this);
