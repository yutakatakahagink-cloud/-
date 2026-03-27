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

  window.HHDB={
    useFirebase:function(){return useFirebase},
    init:function(done){
      if(!useFirebase){
        if(typeof done==='function')done();
        return Promise.resolve();
      }
      if(typeof firebase==='undefined'){
        console.warn('Firebase SDK not loaded');
        if(typeof done==='function')done();
        return Promise.resolve();
      }
      try{
        if(firebase.apps&&firebase.apps.length>0){
          db=firebase.app().database();
        }else{
          firebase.initializeApp(cfg);
          db=firebase.database();
        }
        if(typeof done==='function')done();
        return Promise.resolve();
      }catch(e){
        console.warn('Firebase init failed',e);
        useFirebase=false;
        if(typeof done==='function')done();
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
          localStorage.setItem('hh_disaster_reports',JSON.stringify(arr));
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
    saveDisasterReports:function(arr){
      if(!useFirebase||!db){
        try{localStorage.setItem('hh_disaster_reports',JSON.stringify(arr))}catch(e){}
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
    }
  };
})();
