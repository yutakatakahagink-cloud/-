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
  function buildExpData(exp,sub){
    return {
      short:expShort(exp),
      count:sub.length,
      details:summarizeField(sub,'d',3),
      works:summarizeField(sub,'wk',2),
      causes:topCauseText(sub),
      measures:summarizeField(sub,'m',3),
      expMeasure:EXP_TO_MEASURE[exp]||'',
      causeM:causeMeasuresText(sub),
      hiCount:sub.filter(function(r){return+r.l>=7}).length,
      photoCount:countPhotosInSub(sub)
    };
  }
  function normalizePhotos(photos){
    var rd=typeof global.hhReportDetail!=='undefined'?global.hhReportDetail:null;
    return rd?rd.normalizePhotoList(photos):(photos||[]);
  }
  function countPhotosInSub(sub){
    var n=0;
    (sub||[]).forEach(function(r){n+=normalizePhotos(r.photos).length});
    return n;
  }
  function photosGridHtml(photos){
    photos=normalizePhotos(photos);
    if(!photos.length)return '';
    var imgs=photos.map(function(p,i){
      var src=esc(p);
      return '<img src="'+src+'" alt="現場写真'+(i+1)+'" loading="lazy" onclick="typeof showFullPhotoSrc===\'function\'&&showFullPhotoSrc(this.src)" onerror="this.replaceWith(Object.assign(document.createElement(\'span\'),{textContent:\'表示不可\',style:\'font-size:11px;color:var(--t3)\'}))">';
    }).join('');
    return '<div class="modal-photos">'+imgs+'</div>';
  }
  function reportPhotoMeta(r){
    var d=String(r.w||r.date||'').replace(/\s+/g,' ').trim();
    var det=String(r.d||'').replace(/\s+/g,' ').trim();
    if(det.length>40)det=det.substring(0,40)+'…';
    return esc(d)+(det?' — '+esc(det):'');
  }
  function buildExpPhotosSection(sub){
    var blocks=[],total=0;
    (sub||[]).forEach(function(r){
      var photos=normalizePhotos(r.photos);
      if(!photos.length)return;
      total+=photos.length;
      blocks.push('<div class="com-exp-photo-block"><p class="com-exp-photo-meta">'+reportPhotoMeta(r)+'</p>'+photosGridHtml(photos)+'</div>');
    });
    if(!blocks.length){
      return '<div class="com-exp-row com-exp-photos-row"><div class="com-exp-label">現場写真</div><div class="com-exp-body"><p class="com-exp-txt com-exp-no-photo">写真はありません</p></div></div>';
    }
    return '<div class="com-exp-row com-exp-photos-row"><div class="com-exp-label">現場写真<br><span class="com-exp-photo-count">'+total+'枚</span></div><div class="com-exp-body com-exp-photo-list">'+blocks.join('')+'</div></div>';
  }
  function expRowHtml(label,content,opts){
    opts=opts||{};
    if(!content||(Array.isArray(content)&&!content.length))return '';
    var inner;
    if(Array.isArray(content)){
      inner='<ul class="com-exp-ul">'+content.map(function(t){return '<li>'+esc(t)+'</li>'}).join('')+'</ul>';
    }else{
      inner='<p class="com-exp-txt">'+esc(content)+'</p>';
    }
    var cls='com-exp-row'+(opts.highlight?' com-exp-highlight':'');
    return '<div class="'+cls+'"><div class="com-exp-label">'+label+'</div><div class="com-exp-body">'+inner+'</div></div>';
  }
  function buildExpCardHtml(exp,sub,compact){
    var d=buildExpData(exp,sub);
    var head='<div class="com-exp-head"><span class="com-exp-title">'+esc(d.short)+'</span><span class="com-exp-badge">'+d.count+'件</span></div>';
    if(compact){
      var body='';
      if(d.expMeasure){
        body+='<p class="com-exp-lead"><span class="com-exp-lead-tag">推奨</span>'+esc(d.expMeasure)+'</p>';
      }
      if(d.causes){
        body+='<p class="com-exp-meta">原因：'+esc(d.causes)+'</p>';
      }
      if(d.hiCount){
        body+='<p class="com-exp-warn-sm">Lv.7+ '+d.hiCount+'件</p>';
      }
      if(d.photoCount){
        body+='<p class="com-exp-meta">📷 現場写真 '+d.photoCount+'枚（詳細で表示）</p>';
      }
      return '<div class="com-exp-card com-exp-compact">'+head+body+'</div>';
    }
    var rows='';
    rows+=expRowHtml('体験例',d.details);
    rows+=expRowHtml('関連作業',d.works);
    rows+=expRowHtml('発生原因',d.causes);
    rows+=expRowHtml('報告者の対策',d.measures);
    rows+=expRowHtml('推奨対策',d.expMeasure,{highlight:true});
    rows+=expRowHtml('原因別の有効策',d.causeM);
    rows+=buildExpPhotosSection(sub);
    var warn=d.hiCount?'<p class="com-exp-warn">⚠ 災害レベル Lv.7 以上 '+d.hiCount+'件 — 優先的な対策検討が必要</p>':'';
    return '<div class="com-exp-card">'+head+'<div class="com-exp-body-wrap">'+rows+'</div>'+warn+'</div>';
  }
  function buildComByExpSummaryHtml(reports,compact){
    reports=reports||[];
    var ec=countByExp(reports);
    var seCom=EXP_TYPES.filter(function(t){return ec[t]>0}).sort(function(a,b){return ec[b]-ec[a]});
    if(!seCom.length){
      return '<p style="color:var(--t3);font-size:12px;padding:4px 0">該当期間に体験別の報告データがありません。</p>';
    }
    var list=seCom.slice(0,compact?3:seCom.length);
    var cards=list.map(function(exp){
      return buildExpCardHtml(exp,reportsForExp(reports,exp),!!compact);
    }).join('');
    var wrapCls=compact?'com-exp-grid com-exp-grid-card':'com-exp-list';
    var intro=compact?'<p class="com-exp-intro">'+seCom.length+'種類・計'+reports.length+'件（タップで全文）</p>':'';
    var more=compact&&seCom.length>3?'<p class="com-exp-more">他 '+(seCom.length-3)+' 種類 — タップで全文</p>':'';
    return intro+'<div class="'+wrapCls+'">'+cards+'</div>'+more;
  }
  function attachPhotosFromStorage(reports){
    if(typeof global.hhReportDetail==='undefined')return;
    try{
      var ph=JSON.parse(localStorage.getItem('hh_photos')||'{}');
      (reports||[]).forEach(function(r){
        if(!r||r.id==null)return;
        var raw=ph[r.id]!=null?ph[r.id]:ph[String(r.id)];
        if(raw)r.photos=global.hhReportDetail.normalizePhotoList(raw);
      });
    }catch(e){}
  }
  function ensureReportsPhotos(reports,cb){
    var list=(reports||[]).slice();
    if(typeof global.hhReportDetail!=='undefined'&&global.hhReportDetail.ensurePhotosForReports){
      global.hhReportDetail.ensurePhotosForReports(list,cb);
      return;
    }
    if(typeof global.loadPhotos==='function')global.loadPhotos();
    attachPhotosFromStorage(list);
    list.forEach(function(r){r.photos=normalizePhotos(r.photos)});
    if(typeof cb==='function')cb(list);
  }
  function renderComByExpSummary(reports,cardEl,fullEl){
    if(cardEl)cardEl.innerHTML=buildComByExpSummaryHtml(reports,true);
    function renderFull(list){
      if(fullEl)fullEl.innerHTML='<div class="com-detail">'+buildComByExpSummaryHtml(list,false)+'</div>';
    }
    if(!fullEl)return;
    renderFull(reports);
    ensureReportsPhotos(reports,function(list){
      if(cardEl)cardEl.innerHTML=buildComByExpSummaryHtml(list,true);
      renderFull(list);
    });
  }
  function openComByExpDetail(reports){
    var title='📊 体験別→対策提案';
    var show=typeof global.showComDetail==='function'?global.showComDetail:null;
    if(!show)return;
    show(title,'<p style="color:var(--t3);font-size:12px;padding:16px">写真を読み込み中…</p>');
    ensureReportsPhotos(reports,function(list){
      show(title,'<div class="com-detail">'+buildComByExpSummaryHtml(list,false)+'</div>');
    });
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
      var line='['+st+'] '+(r.date||'—')+' '+esc(r.name||'—')+'（'+esc(r.dept||'—')+'）— '+esc(body);
      if(r.status==='resolved'){
        var res=String(r.resolution||'').replace(/\s+/g,' ').trim();
        line+=res?' — 対策：'+esc(res):' — <span style="color:var(--yl)">（対策未記入）</span>';
      }
      return line;
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
  global.openComByExpDetail=openComByExpDetail;
  global.renderComRequests=renderComRequests;
  global.filterComRequests=filterComRequests;
})(typeof window!=='undefined'?window:this);
