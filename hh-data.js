/**
 * 安全衛生管理 - 共有データ層
 * Firebase が設定されていればクラウド同期、なければ localStorage
 */
(function(){
  var cfg=window.HH_FIREBASE_CONFIG;
  var useFirebase=cfg&&cfg.databaseURL&&(cfg.databaseURL.indexOf('firebaseio.com')>=0||cfg.databaseURL.indexOf('firebasedatabase.app')>=0);
  var db=null;
  var DB_PATH='hh_data';

  function getReportsRef(){return db?db.ref(DB_PATH+'/hh_reports'):null}
  function getPhotosRef(){return db?db.ref(DB_PATH+'/hh_photos'):null}
  function getAdminsRef(){return db?db.ref(DB_PATH+'/hh_admins'):null}
  function getOwnerPassRef(){return db?db.ref(DB_PATH+'/hh_owner_pass'):null}
  function getRequestsRef(){return db?db.ref(DB_PATH+'/hh_requests'):null}
  function getDisasterRef(){return db?db.ref(DB_PATH+'/hh_disaster_reports'):null}
  function getDisasterWfRef(){return db?db.ref(DB_PATH+'/hh_disaster_workflow'):null}

  /** localStorage 用：画像 base64 を除き容量超過を防ぐ */
  function hhStripDisasterReportsForStorage(arr){
    if(!Array.isArray(arr))return[];
    return arr.map(function(r){
      if(!r||typeof r!=='object')return r;
      var o=Object.assign({},r);
      if(o.situation_img!=null)o.situation_img='';
      if(Array.isArray(o.situation_imgs))o.situation_imgs=[];
      return o;
    });
  }

  /** Firebase 互換: 配列・{0:…}・{報告id:…} のいずれでも一覧配列へ */
  function normalizeDisasterRecord(raw,keyHint){
    if(!raw||typeof raw!=='object')return null;
    var r=raw;
    if(r.id==null&&keyHint!=null){
      var ks=String(keyHint);
      if(/^\d+$/.test(ks)) r=Object.assign({},raw,{id:Number(ks)});
    }
    if(r.wf&&typeof r.wf==='object'&&r.wf.approve_token==null&&r.wf.approveToken!=null){
      r=Object.assign({},r,{wf:Object.assign({},r.wf,{approve_token:r.wf.approveToken})});
    }
    return r;
  }
  function disasterSnapshotToArray(v){
    if(v==null)return [];
    if(Array.isArray(v)){
      var a=[];
      for(var i=0;i<v.length;i++){
        if(v[i]==null)continue;
        var n=normalizeDisasterRecord(v[i],null);
        if(n)a.push(n);
      }
      return a;
    }
    if(typeof v!=='object')return [];
    var out=[];
    Object.keys(v).forEach(function(k){
      var item=v[k];
      if(!item||typeof item!=='object')return;
      var n=normalizeDisasterRecord(item,k);
      if(n)out.push(n);
    });
    out.sort(function(a,b){
      var ia=Number(a.id),ib=Number(b.id);
      if(isNaN(ia)||isNaN(ib))return 0;
      return ib-ia;
    });
    return out;
  }
  function arrayToDisasterIdMap(arr){
    var o={};
    if(!Array.isArray(arr))return o;
    arr.forEach(function(r){
      if(!r||r.id==null)return;
      o[String(r.id)]=r;
    });
    return o;
  }

  function normApproveTokenStr(t){
    return String(t||'').trim().replace(/\s+/g,'').toLowerCase();
  }
  /** wf 内またはレガシー直下の承認トークン文字列 */
  function rawItemApproveToken(item){
    if(!item||typeof item!=='object')return null;
    var wf=item.wf;
    if(wf&&typeof wf==='object'){
      if(wf.approve_token!=null)return String(wf.approve_token);
      if(wf.approveToken!=null)return String(wf.approveToken);
    }
    if(item.approve_token!=null)return String(item.approve_token);
    return null;
  }
  /**
   * 一覧配列の find と食い違うケース向け: 生のスナップショットを走査して t= と一致する報告を1件返す。
   * メール改行・空白・大小文字差、URL の t が短く切れた場合（先頭一致が1件だけのとき）も試す。
   */
  function findReportByPublicTokenInVal(v,wantRaw){
    var want=normApproveTokenStr(wantRaw);
    if(!want)return null;
    var exact=null;
    var prefixHits=[];
    function consider(item,keyHint){
      if(!item||typeof item!=='object')return;
      var rawTok=rawItemApproveToken(item);
      if(rawTok==null)return;
      var nt=normApproveTokenStr(rawTok);
      if(nt===want){exact=normalizeDisasterRecord(item,keyHint);return}
      if(want.length>=20&&nt.length>want.length&&nt.indexOf(want)===0)prefixHits.push(normalizeDisasterRecord(item,keyHint));
      if(nt.length>=20&&want.length>nt.length&&want.indexOf(nt)===0)prefixHits.push(normalizeDisasterRecord(item,keyHint));
    }
    if(v==null)return null;
    if(Array.isArray(v)){
      for(var i=0;i<v.length;i++)consider(v[i],i);
    }else if(typeof v==='object'){
      Object.keys(v).forEach(function(k){consider(v[k],k);});
    }
    if(exact)return exact;
    if(prefixHits.length===0)return null;
    var seen={},uniq=[];
    for(var h=0;h<prefixHits.length;h++){
      var pr=prefixHits[h];
      if(!pr||pr.id==null)continue;
      var ids=String(pr.id);
      if(seen[ids])continue;
      seen[ids]=1;
      uniq.push(pr);
    }
    if(uniq.length===1)return uniq[0];
    return null;
  }

  window.HHDB={
    useFirebase:function(){return useFirebase},
    /**
     * @param {function} done 初期化完了後
     * @param {{anonymousSignIn?:boolean}} opt disaster-approver 等: true なら匿名ログインしてから done（ルールが auth != null でも読める）
     */
    init:function(done,opt){
      opt=opt||{};
      if(!useFirebase){
        if(typeof done==='function')done();
        return Promise.resolve();
      }
      if(typeof firebase==='undefined'){
        console.warn('Firebase SDK not loaded');
        if(typeof done==='function')done();
        return Promise.resolve();
      }
      function callDone(){
        if(typeof done==='function')done();
      }
      try{
        if(firebase.apps&&firebase.apps.length>0){
          db=firebase.app().database();
        }else{
          firebase.initializeApp(cfg);
          db=firebase.database();
        }
        if(opt.anonymousSignIn){
          var authSvc=null;
          try{
            if(firebase&&typeof firebase.auth==='function')authSvc=firebase.auth();
          }catch(eAuth){}
          if(!authSvc||typeof authSvc.signInAnonymously!=='function'){
            console.warn('[HHDB] firebase-auth が未読込のため匿名ログインをスキップします（承認ページの読込に失敗する場合は disaster-approver.html に firebase-auth-compat.js を追加してください）');
            callDone();
            return Promise.resolve();
          }
          return authSvc.signInAnonymously().then(function(){
            callDone();
          }).catch(function(e){
            console.warn('[HHDB] 匿名ログインに失敗しました。Authentication で「匿名」を有効にするか、Database ルールで未認証の read を許可してください。',e);
            callDone();
          });
        }
        callDone();
        return Promise.resolve();
      }catch(e){
        console.warn('Firebase init failed',e);
        useFirebase=false;
        callDone();
        return Promise.resolve();
      }
    },
    loadReports:function(demoData,onLoaded){
      if(!useFirebase||!db){
        var s=localStorage.getItem('hh_reports');
        var arr=s?JSON.parse(s):null;
        if(arr&&arr.length){onLoaded(arr);return}
        demoData.forEach(function(r,i){r.id=i+1;r.date='2026-02-0'+(8-i)});
        onLoaded(demoData);
        return;
      }
      getReportsRef().once('value',function(snap){
        var v=snap.val();
        var arr=Array.isArray(v)?v:(v?Object.values(v):[]);
        if(!arr||arr.length===0){onLoaded(demoData);return}
        onLoaded(arr);
      },function(){onLoaded(demoData);});
    },
    saveReports:function(arr){
      if(!useFirebase||!db){
        try{
          var data=arr.map(function(r){var c=Object.assign({},r);delete c.photos;return c});
          localStorage.setItem('hh_reports',JSON.stringify(data));
        }catch(e){}
        return;
      }
      getReportsRef().set(arr.map(function(r){var c=Object.assign({},r);delete c.photos;return c}));
    },
    loadPhotos:function(reports,onLoaded){
      if(!useFirebase||!db){
        try{
          var s=localStorage.getItem('hh_photos');
          if(s){var ph=JSON.parse(s);reports.forEach(function(r){if(ph[r.id])r.photos=ph[r.id]})}
        }catch(e){}
        onLoaded();
        return;
      }
      getPhotosRef().once('value',function(snap){
        var ph=snap.val()||{};
        reports.forEach(function(r){if(ph[r.id])r.photos=ph[r.id]});
        onLoaded();
      },function(){onLoaded();});
    },
    savePhotos:function(reports){
      if(!useFirebase||!db){
        try{
          var ph={};
          reports.forEach(function(r){if(r.photos&&r.photos.length)ph[r.id]=r.photos});
          if(Object.keys(ph).length)localStorage.setItem('hh_photos',JSON.stringify(ph));
        }catch(e){}
        return;
      }
      var ph={};
      reports.forEach(function(r){if(r.photos&&r.photos.length)ph[r.id]=r.photos});
      getPhotosRef().set(ph);
    },
    getAdmins:function(){
      if(!useFirebase||!db){
        try{return JSON.parse(localStorage.getItem('hh_admins')||'[{"id":"admin","pass":"admin123","name":"管理者"}]')}catch(e){}
        return [{id:'admin',pass:'admin123',name:'管理者'}];
      }
      return null;
    },
    loadAdmins:function(onLoaded){
      if(!useFirebase||!db){
        onLoaded(JSON.parse(localStorage.getItem('hh_admins')||'[{"id":"admin","pass":"admin123","name":"管理者"}]'));
        return;
      }
      getAdminsRef().once('value',function(snap){
        var v=snap.val();
        var arr=Array.isArray(v)?v:(v?Object.values(v):[{id:'admin',pass:'admin123',name:'管理者'}]);
        onLoaded(arr);
      },function(){onLoaded([{id:'admin',pass:'admin123',name:'管理者'}]);});
    },
    saveAdmins:function(arr){
      if(!useFirebase||!db){
        try{localStorage.setItem('hh_admins',JSON.stringify(arr))}catch(e){}
        return;
      }
      getAdminsRef().set(arr);
    },
    onReportsChange:function(cb){
      if(!useFirebase||!db){return}
      getReportsRef().on('value',function(snap){
        var v=snap.val();
        var arr=Array.isArray(v)?v:(v?Object.values(v):[]);
        if(typeof cb==='function')cb(arr);
      });
    },
    onAdminsChange:function(cb){
      if(!useFirebase||!db){return}
      getAdminsRef().on('value',function(snap){
        var v=snap.val();
        var arr=Array.isArray(v)?v:(v?Object.values(v):[]);
        if(typeof cb==='function')cb(arr);
      });
    },
    loadOwnerPass:function(onLoaded){
      if(!useFirebase||!db){
        var p=localStorage.getItem('hh_owner_pass');
        onLoaded(p||'owner2026');
        return;
      }
      getOwnerPassRef().once('value',function(snap){
        var v=snap.val();
        onLoaded(v&&typeof v==='string'?v:'owner2026');
      },function(){onLoaded('owner2026');});
    },
    saveOwnerPass:function(pass){
      if(!useFirebase||!db){
        try{localStorage.setItem('hh_owner_pass',pass)}catch(e){}
        return;
      }
      getOwnerPassRef().set(pass);
    },
    loadRequests:function(onLoaded){
      if(!useFirebase||!db){
        try{var s=localStorage.getItem('hh_requests');onLoaded(s?JSON.parse(s):[])}catch(e){onLoaded([])}
        return;
      }
      getRequestsRef().once('value',function(snap){
        var v=snap.val();
        var arr=Array.isArray(v)?v:(v?Object.values(v):[]);
        onLoaded(arr);
      },function(){onLoaded([]);});
    },
    saveRequests:function(arr){
      if(!useFirebase||!db){
        try{localStorage.setItem('hh_requests',JSON.stringify(arr))}catch(e){}
        return;
      }
      getRequestsRef().set(arr);
    },
    onRequestsChange:function(cb){
      if(!useFirebase||!db){return}
      getRequestsRef().on('value',function(snap){
        var v=snap.val();
        var arr=Array.isArray(v)?v:(v?Object.values(v):[]);
        if(typeof cb==='function')cb(arr);
      });
    },
    loadDisasterReports:function(onLoaded){
      if(!useFirebase||!db){
        try{var s=localStorage.getItem('hh_disaster_reports');onLoaded(s?JSON.parse(s):[])}catch(e){onLoaded([])}
        return;
      }
      getDisasterRef().once('value',function(snap){
        onLoaded(disasterSnapshotToArray(snap.val()));
      },function(err){
        console.warn('[HHDB] loadDisasterReports failed',err);
        if(typeof onLoaded==='function')onLoaded([],err);
      });
    },
    /** 1件だけ書き込み（他クライアントの提出と競合しにくい） */
    mergeDisasterReport:function(rec,onDone,onErr){
      if(!rec||rec.id==null){
        if(typeof onDone==='function')onDone();
        return;
      }
      var toSave=normalizeDisasterRecord(rec,rec.id)||rec;
      if(!useFirebase||!db){
        try{
          var s=localStorage.getItem('hh_disaster_reports');
          var arr=s?JSON.parse(s):[];
          var ix=-1;
          for(var i=0;i<arr.length;i++){if(String(arr[i].id)===String(rec.id)){ix=i;break}}
          if(ix>=0)arr[ix]=toSave;else arr.push(toSave);
          localStorage.setItem('hh_disaster_reports',JSON.stringify(hhStripDisasterReportsForStorage(arr)));
        }catch(e){if(typeof onErr==='function')onErr(e)}
        if(typeof onDone==='function')onDone();
        return;
      }
      getDisasterRef().child(String(rec.id)).set(toSave,function(err){
        if(err){
          console.warn('[HHDB] mergeDisasterReport failed',err);
          if(typeof onErr==='function')onErr(err);
          return;
        }
        if(typeof onDone==='function')onDone();
      });
    },
    /** URLの id= のみ一致させたいとき（一覧に無いレガシー配列の取りこぼし対策） */
    loadDisasterReportById:function(id,onLoaded){
      if(id==null||id===''){if(typeof onLoaded==='function')onLoaded(null,null);return}
      if(!useFirebase||!db){
        try{
          var s=localStorage.getItem('hh_disaster_reports');
          var arr=s?JSON.parse(s):[];
          var r=null;
          for(var i=0;i<arr.length;i++){if(String(arr[i].id)===String(id)){r=arr[i];break}}
          if(typeof onLoaded==='function')onLoaded(r||null,null);
        }catch(e){if(typeof onLoaded==='function')onLoaded(null,e)}
        return;
      }
      getDisasterRef().child(String(id)).once('value',function(snap){
        var v=snap.val();
        if(!v||typeof v!=='object'){if(typeof onLoaded==='function')onLoaded(null,null);return}
        if(typeof onLoaded==='function')onLoaded(normalizeDisasterRecord(v,String(id)),null);
      },function(err){
        if(typeof onLoaded==='function')onLoaded(null,err);
      });
    },
    /** メールの t= で DB から直接解決（一覧 find より寛容） */
    findDisasterReportByPublicToken:function(token,onLoaded){
      if(!token||String(token).trim()===''){if(typeof onLoaded==='function')onLoaded(null,null);return}
      if(!useFirebase||!db){
        try{
          var s=localStorage.getItem('hh_disaster_reports');
          var raw=s?JSON.parse(s):null;
          var rec=null;
          if(Array.isArray(raw)||(raw&&typeof raw==='object'))rec=findReportByPublicTokenInVal(raw,token);
          if(typeof onLoaded==='function')onLoaded(rec||null,null);
        }catch(e){if(typeof onLoaded==='function')onLoaded(null,e)}
        return;
      }
      getDisasterRef().once('value',function(snap){
        var rec=findReportByPublicTokenInVal(snap.val(),token);
        if(typeof onLoaded==='function')onLoaded(rec||null,null);
      },function(err){
        if(typeof onLoaded==='function')onLoaded(null,err);
      });
    },
    /** id フィールドが子キーと違うレガシー配列向け: 生データから id 一致を探す */
    findDisasterReportByIdInTree:function(id,onLoaded){
      if(id==null||id===''){if(typeof onLoaded==='function')onLoaded(null,null);return}
      var sid=String(id);
      if(!useFirebase||!db){
        try{
          var s=localStorage.getItem('hh_disaster_reports');
          var arr=s?JSON.parse(s):[];
          for(var i=0;i<arr.length;i++){
            if(arr[i]&&String(arr[i].id)===sid){if(typeof onLoaded==='function')onLoaded(normalizeDisasterRecord(arr[i],null),null);return}
          }
          if(typeof onLoaded==='function')onLoaded(null,null);
        }catch(e){if(typeof onLoaded==='function')onLoaded(null,e)}
        return;
      }
      getDisasterRef().once('value',function(snap){
        var v=snap.val();
        var found=null;
        function check(item,keyHint){
          if(!item||typeof item!=='object')return;
          if(String(item.id)===sid){found=normalizeDisasterRecord(item,keyHint);}
        }
        if(Array.isArray(v)){for(var j=0;j<v.length;j++){check(v[j],j);if(found)break}}
        else if(v&&typeof v==='object'){
          Object.keys(v).forEach(function(k){if(found)return;check(v[k],k);});
        }
        if(typeof onLoaded==='function')onLoaded(found,null);
      },function(err){
        if(typeof onLoaded==='function')onLoaded(null,err);
      });
    },
    saveDisasterReports:function(arr){
      if(!useFirebase||!db){
        try{localStorage.setItem('hh_disaster_reports',JSON.stringify(hhStripDisasterReportsForStorage(arr||[])))}catch(e){}
        return;
      }
      getDisasterRef().set(arrayToDisasterIdMap(arr||[]));
    },
    onDisasterChange:function(cb){
      if(!useFirebase||!db){return}
      getDisasterRef().on('value',function(snap){
        if(typeof cb==='function')cb(disasterSnapshotToArray(snap.val()));
      });
    },
    loadDisasterWorkflow:function(onLoaded){
      function normWf(v){
        if(!v||typeof v!=='object')return{steps:[],notify_from_email:''};
        return{
          steps:Array.isArray(v.steps)?v.steps:[],
          notify_from_email:String(v.notify_from_email!=null?v.notify_from_email:'').trim().toLowerCase()
        };
      }
      if(!useFirebase||!db){
        try{var s=localStorage.getItem('hh_disaster_workflow');onLoaded(s?normWf(JSON.parse(s)):{steps:[],notify_from_email:''})}catch(e){onLoaded({steps:[],notify_from_email:''})}
        return
      }
      getDisasterWfRef().once('value',function(snap){
        onLoaded(normWf(snap.val()));
      },function(){onLoaded({steps:[],notify_from_email:''});});
    },
    saveDisasterWorkflow:function(obj){
      var data={
        steps:Array.isArray(obj&&obj.steps)?obj.steps:[],
        notify_from_email:String(obj&&obj.notify_from_email!=null?obj.notify_from_email:'').trim().toLowerCase()
      };
      if(!useFirebase||!db){
        try{localStorage.setItem('hh_disaster_workflow',JSON.stringify(data))}catch(e){}
        return
      }
      getDisasterWfRef().set(data);
    },
    onDisasterWorkflowChange:function(cb){
      if(!useFirebase||!db){return}
      getDisasterWfRef().on('value',function(snap){
        var v=snap.val();
        if(!v||typeof v!=='object'){if(typeof cb==='function')cb({steps:[],notify_from_email:''});return}
        if(typeof cb==='function')cb({
          steps:Array.isArray(v.steps)?v.steps:[],
          notify_from_email:String(v.notify_from_email!=null?v.notify_from_email:'').trim().toLowerCase()
        });
      });
    },
    stripDisasterReportsForStorage:hhStripDisasterReportsForStorage
  };
})();
