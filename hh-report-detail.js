/**
 * ヒヤリハット報告 詳細表示・現場写真の共通処理
 */
(function(global){
  function escAttr(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;');
  }
  function arrJoin(v){
    return (Array.isArray(v)?v.join('、'):'')||'—';
  }
  function validPhotoUrl(u){
    if(u==null||u==='')return false;
    u=String(u);
    if(/^data:image\/heic/i.test(u)||/^data:image\/heif/i.test(u))return false;
    return /^data:image\//i.test(u)||/^https?:\/\//i.test(u)||/^blob:/i.test(u);
  }
  function normalizePhotoList(raw){
    if(raw==null)return[];
    var arr=[];
    if(Array.isArray(raw))arr=raw.slice();
    else if(typeof raw==='object'){
      Object.keys(raw).sort(function(a,b){
        var na=Number(a),nb=Number(b);
        if(!isNaN(na)&&!isNaN(nb))return na-nb;
        return String(a).localeCompare(String(b));
      }).forEach(function(k){arr.push(raw[k]);});
    }
    return arr.filter(validPhotoUrl);
  }
  function photoForId(ph,id){
    if(!ph||id==null)return null;
    return ph[id]!=null?ph[id]:(ph[String(id)]!=null?ph[String(id)]:null);
  }
  function photosHtml(photos){
    photos=normalizePhotoList(photos);
    if(!photos.length)return'';
    var imgs=photos.map(function(p,i){
      var src=escAttr(p);
      return '<img src="'+src+'" alt="現場写真'+(i+1)+'" loading="lazy" onclick="typeof showFullPhotoSrc===\'function\'&&showFullPhotoSrc(this.src)" onerror="this.replaceWith(Object.assign(document.createElement(\'span\'),{textContent:\'表示不可（形式未対応）\',style:\'font-size:11px;color:var(--t3)\'}))">';
    }).join('');
    return '<div class="dbk"><div class="dbt">現場写真（'+photos.length+'枚）</div><div class="modal-photos">'+imgs+'</div></div>';
  }
  function buildDetailHtml(r,opts){
    if(!r)return'';
    opts=opts||{};
    var showAdminActions=!!opts.showAdminActions;
    var showStress=!!opts.showStress;
    var showOwnerDelete=!!opts.showOwnerDelete;
    var showOwnerEdit=!!opts.showOwnerEdit;
    var stressAdminLabel=!!opts.stressAdminLabel;
    var e0=arrJoin(r.e).split('、')[0]||'報告';
    var sl=r.ss==='new'?'新規':r.ss==='review'?'確認中':'完了';
    var h='';
    var inp='width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--bd,#E2E8F0);border-radius:8px;font-size:12px;font-family:inherit';
    var ta=inp+'min-height:72px;line-height:1.55;resize:vertical';
    if(showOwnerEdit){
      h+='<div style="margin-bottom:10px;padding:8px 10px;background:rgba(37,99,235,.08);border-radius:8px;font-size:11px;color:#2563EB;font-weight:600">所有者編集モード — 内容を修正して保存できます</div>';
      h+='<div class="dl"><span class="dk">報告者</span><span class="dv"><input id="oe_n" type="text" value="'+escAttr(r.n||'')+'" style="'+inp+'"></span></div>';
      h+='<div class="dl"><span class="dk">部署</span><span class="dv"><input id="oe_dept" type="text" value="'+escAttr(r.dept||'')+'" style="'+inp+'"></span></div>';
      h+='<div class="dl"><span class="dk">区分</span><span class="dv"><input id="oe_ku" type="text" value="'+escAttr(r.ku||'')+'" style="'+inp+'"></span></div>';
      h+='<div class="dl"><span class="dk">日時・場所</span><span class="dv"><input id="oe_w" type="text" value="'+escAttr(r.w||r.date||'')+'" style="'+inp+'"></span></div>';
      h+='<div class="dl"><span class="dk">作業内容</span><span class="dv"><input id="oe_wk" type="text" value="'+escAttr(r.wk||'')+'" style="'+inp+'"></span></div>';
      h+='<div class="dl"><span class="dk">災害レベル</span><span class="dv"><input id="oe_l" type="number" min="1" max="10" value="'+(r.l!=null?r.l:1)+'" style="'+inp+'max-width:100px"></span></div>';
      h+='<div class="dl"><span class="dk">ステータス</span><span class="dv"><select id="oe_ss" style="'+inp+'max-width:160px"><option value="new"'+(r.ss==='new'?' selected':'')+'>新規</option><option value="review"'+(r.ss==='review'?' selected':'')+'>確認中</option><option value="done"'+(r.ss==='done'?' selected':'')+'>対策完了</option></select></span></div>';
      h+='<div class="dbk"><div class="dbt">体験（読点区切り）</div><textarea id="oe_e" style="'+ta+'">'+escAttr(arrJoin(r.e)==='—'?'':arrJoin(r.e))+'</textarea></div>';
      h+='<div class="dbk"><div class="dbt">詳細</div><textarea id="oe_d" style="'+ta+'min-height:100px">'+escAttr(r.d||'')+'</textarea></div>';
      h+='<div class="dbk"><div class="dbt">原因（読点区切り）</div><textarea id="oe_c" style="'+ta+'">'+escAttr(arrJoin(r.c)==='—'?'':arrJoin(r.c))+'</textarea></div>';
      h+='<div class="dbk"><div class="dbt">対策</div><textarea id="oe_m" style="'+ta+'min-height:100px">'+escAttr(r.m||'')+'</textarea></div>';
      h+=photosHtml(r.photos);
      h+='<div class="dbk"><div class="dbt">回避できなかった理由（読点区切り）</div><textarea id="oe_av" style="'+ta+'">'+escAttr(arrJoin(r.av)==='—'?'':arrJoin(r.av))+'</textarea></div>';
      h+='<div class="dbk"><div class="dbt">回避に役立つ活動（読点区切り）</div><textarea id="oe_ac" style="'+ta+'">'+escAttr(arrJoin(r.ac)==='—'?'':arrJoin(r.ac))+'</textarea></div>';
    }else{
      h+='<div class="dl"><span class="dk">報告者</span><span class="dv">'+escAttr(r.n||'—')+'</span></div>';
      h+='<div class="dl"><span class="dk">部署</span><span class="dv">'+escAttr(r.dept||'—')+'</span></div>';
      h+='<div class="dl"><span class="dk">区分</span><span class="dv">'+escAttr(r.ku||'—')+'</span></div>';
      h+='<div class="dl"><span class="dk">日時・場所</span><span class="dv">'+escAttr(r.w||r.date||'—')+'</span></div>';
      if(r.wk)h+='<div class="dl"><span class="dk">作業内容</span><span class="dv">'+escAttr(r.wk)+'</span></div>';
      h+='<div class="dl"><span class="dk">災害レベル</span><span class="dv" style="color:'+(r.l>=7?'var(--rd)':r.l>=4?'var(--yl)':'var(--gn)')+'">Lv.'+(r.l||0)+'</span></div>';
      h+='<div class="dl"><span class="dk">ステータス</span><span class="dv">'+sl+'</span></div>';
      h+='<div class="dbk"><div class="dbt">体験</div><div class="dbtx">'+escAttr(arrJoin(r.e))+'</div></div>';
      h+='<div class="dbk"><div class="dbt">詳細</div><div class="dbtx">'+escAttr(r.d||'—')+'</div></div>';
      h+='<div class="dbk"><div class="dbt">原因</div><div class="dbtx">'+escAttr(arrJoin(r.c))+'</div></div>';
      h+='<div class="dbk"><div class="dbt">対策</div><div class="dbtx">'+escAttr(r.m||'—')+'</div></div>';
      h+=photosHtml(r.photos);
      h+='<div class="dbk"><div class="dbt">回避できなかった理由</div><div class="dbtx">'+escAttr(arrJoin(r.av))+'</div></div>';
      h+='<div class="dbk"><div class="dbt">回避に役立つ活動</div><div class="dbtx">'+escAttr(arrJoin(r.ac))+'</div></div>';
    }
    if(showStress&&typeof SQ!=='undefined'&&typeof WQ!=='undefined'){
      var dot=function(v){return '●'.repeat(v||0)+'○'.repeat(4-(v||0));};
      var sfx=stressAdminLabel?'（管理者のみ）':'';
      h+='<div class="dbk"><div class="dbt">背後要因'+sfx+'</div><div style="display:flex;flex-wrap:wrap;gap:3px 10px;font-size:11px;color:var(--t2)">';
      SQ.forEach(function(pair){h+='<span>'+escAttr(pair[1].substring(0,6))+':'+dot((r.st||{})[pair[0]])+'</span>';});
      h+='</div></div>';
      h+='<div class="dbk"><div class="dbt">職場環境'+sfx+'</div><div style="display:flex;flex-wrap:wrap;gap:3px 10px;font-size:11px;color:var(--t2)">';
      WQ.forEach(function(pair){h+='<span>'+escAttr(pair[1].substring(0,6))+':'+dot((r.we||{})[pair[0]])+'</span>';});
      h+='</div></div>';
    }
    if(showAdminActions&&!showOwnerEdit){
      h+='<div class="abs"><button class="ab abr" onclick="setSS('+r.id+',\'review\')">確認中</button><button class="ab abd" onclick="setSS('+r.id+',\'done\')">対策完了</button></div>';
    }
    if(showOwnerEdit){
      h+='<div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;border-top:1px solid var(--bd,#E2E8F0);padding-top:12px">';
      h+='<button type="button" class="sub" style="margin:0;flex:1;min-width:140px;padding:10px;font-size:13px" onclick="ownerSaveHhReport('+r.id+')">💾 内容を保存</button>';
      if(showOwnerDelete){
        h+='<button type="button" onclick="ownerDeleteHhReport('+r.id+')" style="padding:10px 14px;font-size:12px;border-radius:8px;border:1px solid #B71C1C;background:#fff;color:#B71C1C;font-weight:700;cursor:pointer">🗑 削除</button>';
      }
      h+='</div>';
    }else if(showOwnerDelete){
      h+='<div style="margin-top:12px;padding-top:12px;border-top:1px dashed #FFCDD2;text-align:right"><button type="button" onclick="ownerDeleteHhReport('+r.id+')" style="padding:7px 14px;font-size:11px;border-radius:8px;border:1px solid #B71C1C;background:#fff;color:#B71C1C;font-weight:700;cursor:pointer">🗑 この報告を削除（所有者）</button></div>';
    }
    return h;
  }
  function splitListField(s){
    return String(s||'').split(/[、,，]/).map(function(x){return x.trim()}).filter(Boolean);
  }
  function fieldVal(id){
    var el=document.getElementById(id);
    return el?String(el.value||'').trim():'';
  }
  global.ownerSaveHhReport=function(id){
    var role=(typeof ROLE!=='undefined'?ROLE:global.ROLE);
    if(role&&role!=='owner'){alert('所有者のみ編集できます');return}
    var db=(typeof DB!=='undefined'&&Array.isArray(DB))?DB:(Array.isArray(global.DB)?global.DB:null);
    if(!db){alert('報告データが読み込まれていません');return}
    var r=db.find(function(x){return String(x.id)===String(id)});
    if(!r){alert('対象の報告が見つかりません');return}
    r.n=fieldVal('oe_n');
    r.dept=fieldVal('oe_dept');
    r.ku=fieldVal('oe_ku');
    r.w=fieldVal('oe_w');
    if(r.w&&(!r.date||String(r.date).length>=10)){
      var m=r.w.match(/(\d{4}-\d{2}-\d{2})/);
      if(m)r.date=m[1];
    }
    r.wk=fieldVal('oe_wk');
    var lv=parseInt(fieldVal('oe_l'),10);
    r.l=isNaN(lv)?(r.l||1):Math.max(1,Math.min(10,lv));
    var ss=fieldVal('oe_ss');
    if(ss==='new'||ss==='review'||ss==='done')r.ss=ss;
    r.e=splitListField(fieldVal('oe_e'));
    r.d=fieldVal('oe_d');
    r.c=splitListField(fieldVal('oe_c'));
    r.m=fieldVal('oe_m');
    r.av=splitListField(fieldVal('oe_av'));
    r.ac=splitListField(fieldVal('oe_ac'));
    if(typeof HHDB!=='undefined'&&HHDB.saveReports)HHDB.saveReports(db);
    else{
      try{
        var data=db.map(function(x){var c=Object.assign({},x);delete c.photos;return c});
        localStorage.setItem('hh_reports',JSON.stringify(data));
      }catch(e){}
    }
    if(typeof rDash==='function')rDash();
    else if(typeof global.rDash==='function')global.rDash();
    if(typeof rAnl==='function'){
      var tp=document.querySelector('#aT .tp.on');
      rAnl(tp&&tp.dataset?tp.dataset.t:'simple');
    }
    if(typeof rCom==='function'&&document.querySelector('#pC.pg.on'))rCom();
    if(typeof openHhReportDetail==='function')openHhReportDetail(id);
    else if(typeof global.openHhReportDetail==='function')global.openHhReportDetail(id);
    var t=document.getElementById('toast');
    if(t){t.textContent='✓ ヒヤリハット報告を保存しました';t.classList.add('show');setTimeout(function(){t.classList.remove('show');t.textContent='✓ 操作が完了しました'},2500)}
    else alert('保存しました');
  };
  function attachPhotosFromStorage(r){
    if(!r||r.id==null)return;
    try{
      var ph=JSON.parse(localStorage.getItem('hh_photos')||'{}');
      var raw=photoForId(ph,r.id);
      if(raw)r.photos=normalizePhotoList(raw);
    }catch(e){}
  }
  function ensurePhotos(r,cb){
    if(!r){if(typeof cb==='function')cb(r);return;}
    attachPhotosFromStorage(r);
    r.photos=normalizePhotoList(r.photos);
    if(r.photos.length){if(typeof cb==='function')cb(r);return;}
    if(typeof HHDB!=='undefined'&&HHDB.loadPhotoForReport){
      HHDB.loadPhotoForReport(r.id,function(list){
        if(list&&list.length)r.photos=list;
        else attachPhotosFromStorage(r);
        r.photos=normalizePhotoList(r.photos);
        if(typeof cb==='function')cb(r);
      });
      return;
    }
    if(typeof cb==='function')cb(r);
  }
  function compressPhotoDataUrl(dataUrl,cb){
    if(!dataUrl||typeof cb!=='function'){if(typeof cb==='function')cb(dataUrl);return;}
    var img=new Image();
    img.onload=function(){
      try{
        var maxDim=1600,w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
        if(!w||!h){cb(dataUrl);return;}
        var scale=Math.min(1,maxDim/Math.max(w,h));
        if(scale>=1&&/^data:image\/jpe?g/i.test(dataUrl)&&dataUrl.length<900000){cb(dataUrl);return;}
        var c=document.createElement('canvas');
        c.width=Math.max(1,Math.round(w*scale));
        c.height=Math.max(1,Math.round(h*scale));
        c.getContext('2d').drawImage(img,0,0,c.width,c.height);
        cb(c.toDataURL('image/jpeg',0.85));
      }catch(e){cb(dataUrl);}
    };
    img.onerror=function(){cb(dataUrl);};
    img.src=dataUrl;
  }
  function readAsDataUrl(blob){
    return new Promise(function(resolve,reject){
      if(!blob){reject(new Error('empty blob'));return;}
      var r=new FileReader();
      r.onload=function(){resolve(r.result)};
      r.onerror=function(){reject(new Error('read failed'))};
      r.readAsDataURL(blob);
    });
  }
  function isHeicFile(file){
    if(!file)return false;
    var name=(file.name||'').toLowerCase();
    var type=(file.type||'').toLowerCase();
    if(/\.(heic|heif)$/i.test(name))return true;
    if(/heic|heif/.test(type))return true;
    return false;
  }
  function sniffHeicFile(file){
    return new Promise(function(resolve){
      if(!file||!file.size||file.size<12){resolve(false);return;}
      try{
        var fr=new FileReader();
        fr.onload=function(){
          try{
            var v=new Uint8Array(fr.result);
            var ftyp='';
            for(var i=4;i<8;i++)ftyp+=String.fromCharCode(v[i]);
            if(ftyp!=='ftyp'){resolve(false);return;}
            var brand='';
            for(var j=8;j<12;j++)brand+=String.fromCharCode(v[j]);
            resolve(/heic|heix|hevc|hevx|heim|heis|mif1|msf1/i.test(brand));
          }catch(e){resolve(false);}
        };
        fr.onerror=function(){resolve(false)};
        fr.readAsArrayBuffer(file.slice(0,16));
      }catch(e){resolve(false);}
    });
  }
  function heic2anyToBlob(file){
    if(typeof heic2any==='undefined')return Promise.reject(new Error('heic2any missing'));
    var src=file;
    if(!file.type||file.type==='application/octet-stream'){
      try{src=new Blob([file],{type:'image/heic'})}catch(e){src=file}
    }
    function run(opts){
      return heic2any(Object.assign({blob:src},opts)).then(function(result){
        if(Array.isArray(result)){
          if(!result.length)throw new Error('heic2any empty');
          return result[0];
        }
        return result;
      });
    }
    return run({toType:'image/jpeg',quality:0.85}).catch(function(){
      return run({toType:'image/jpeg',quality:0.92});
    }).catch(function(){
      return run({toType:'image/png'});
    });
  }
  function convertHeicFileToDataUrl(file){
    return heic2anyToBlob(file).then(readAsDataUrl);
  }
  function processImageFileToDataUrl(file){
    return new Promise(function(resolve,reject){
      if(!file){reject(new Error('no file'));return;}
      function finish(url){
        if(!url){reject(new Error('empty'));return;}
        compressPhotoDataUrl(url,function(out){resolve(out||url)});
      }
      function tryHeic(){
        convertHeicFileToDataUrl(file).then(finish).catch(function(err){
          reject(err||new Error('HEIC convert failed'));
        });
      }
      function tryNormal(){
        readAsDataUrl(file).then(function(dataUrl){
          if(/^data:image\/heic/i.test(dataUrl)||/^data:image\/heif/i.test(dataUrl)){
            tryHeic();
            return;
          }
          finish(dataUrl);
        }).catch(reject);
      }
      if(isHeicFile(file)){tryHeic();return;}
      sniffHeicFile(file).then(function(isHeic){
        if(isHeic)tryHeic();
        else tryNormal();
      });
    });
  }
  function isImageFile(file){
    if(!file)return false;
    var type=(file.type||'').toLowerCase();
    if(type.indexOf('image/')===0)return true;
    return /\.(jpe?g|jfif|png|gif|webp|bmp|heic|heif)$/i.test(file.name||'');
  }
  function filterReportsByExp(reports,expFilter){
    if(!reports||!reports.length)return[];
    if(!expFilter||expFilter==='all')return reports.slice();
    return reports.filter(function(r){
      return (r.e||[]).some(function(e){
        return e===expFilter||e.startsWith(String(expFilter).substring(0,2));
      });
    });
  }
  function collectPhotosFromReports(reports){
    var photos=[];
    (reports||[]).forEach(function(r){
      normalizePhotoList(r.photos).forEach(function(p){photos.push(p);});
    });
    return photos;
  }
  function ensurePhotosForReports(reports,cb){
    reports=reports||[];
    if(!reports.length){if(typeof cb==='function')cb(reports);return;}
    function finish(){
      reports.forEach(function(r){r.photos=normalizePhotoList(r.photos);});
      if(typeof cb==='function')cb(reports);
    }
    if(typeof HHDB!=='undefined'&&HHDB.loadPhotos){
      HHDB.loadPhotos(reports,function(){
        reports.forEach(attachPhotosFromStorage);
        finish();
      });
      return;
    }
    if(typeof loadPhotos==='function')loadPhotos();
    reports.forEach(attachPhotosFromStorage);
    finish();
  }
  function buildCausePhotosDetailHtml(cause,reports){
    var photos=collectPhotosFromReports(reports);
    var h='<div class="com-detail"><div class="com-section"><strong>発生原因「'+escAttr(cause)+'」の現場写真</strong></div>';
    h+='<p style="margin-bottom:12px">'+photos.length+'枚（'+(reports||[]).length+'件の報告）</p>';
    if(photos.length)h+=photosHtml(photos);
    else h+='<p style="color:var(--t3);font-size:12px">写真はありません</p>';
    h+='</div>';
    return h;
  }
  global.hhReportDetail={
    arrJoin:arrJoin,
    normalizePhotoList:normalizePhotoList,
    photosHtml:photosHtml,
    buildDetailHtml:buildDetailHtml,
    ensurePhotos:ensurePhotos,
    ensurePhotosForReports:ensurePhotosForReports,
    buildCausePhotosDetailHtml:buildCausePhotosDetailHtml,
    filterReportsByExp:filterReportsByExp,
    compressPhotoDataUrl:compressPhotoDataUrl,
    processImageFileToDataUrl:processImageFileToDataUrl,
    isImageFile:isImageFile,
    isHeicFile:isHeicFile
  };
})(typeof window!=='undefined'?window:this);
