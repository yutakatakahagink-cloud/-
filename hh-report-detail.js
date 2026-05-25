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
    var stressAdminLabel=!!opts.stressAdminLabel;
    var e0=arrJoin(r.e).split('、')[0]||'報告';
    var sl=r.ss==='new'?'新規':r.ss==='review'?'確認中':'完了';
    var h='';
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
    if(showAdminActions){
      h+='<div class="abs"><button class="ab abr" onclick="setSS('+r.id+',\'review\')">確認中</button><button class="ab abd" onclick="setSS('+r.id+',\'done\')">対策完了</button></div>';
    }
    if(showOwnerDelete){
      h+='<div style="margin-top:12px;padding-top:12px;border-top:1px dashed #FFCDD2;text-align:right"><button type="button" onclick="ownerDeleteHhReport('+r.id+')" style="padding:7px 14px;font-size:11px;border-radius:8px;border:1px solid #B71C1C;background:#fff;color:#B71C1C;font-weight:700;cursor:pointer">🗑 この報告を削除（所有者）</button></div>';
    }
    return h;
  }
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
  function isImageFile(file){
    if(!file)return false;
    var type=(file.type||'').toLowerCase();
    if(type.indexOf('image/')===0)return true;
    return /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i.test(file.name||'');
  }
  function isHeicFile(file){
    var name=(file.name||'').toLowerCase();
    var type=(file.type||'').toLowerCase();
    return /\.heic$/i.test(name)||/\.heif$/i.test(name)||type==='image/heic'||type==='image/heif';
  }
  global.hhReportDetail={
    arrJoin:arrJoin,
    normalizePhotoList:normalizePhotoList,
    photosHtml:photosHtml,
    buildDetailHtml:buildDetailHtml,
    ensurePhotos:ensurePhotos,
    compressPhotoDataUrl:compressPhotoDataUrl,
    isImageFile:isImageFile,
    isHeicFile:isHeicFile
  };
})(typeof window!=='undefined'?window:this);
