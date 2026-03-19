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
        firebase.initializeApp(cfg);
        db=firebase.database();
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
        var v=snap.val();
        var arr=Array.isArray(v)?v:(v?Object.values(v):[]);
        onLoaded(arr);
      },function(){onLoaded([]);});
    },
    saveDisasterReports:function(arr){
      if(!useFirebase||!db){
        try{localStorage.setItem('hh_disaster_reports',JSON.stringify(arr))}catch(e){}
        return;
      }
      getDisasterRef().set(arr);
    },
    onDisasterChange:function(cb){
      if(!useFirebase||!db){return}
      getDisasterRef().on('value',function(snap){
        var v=snap.val();
        var arr=Array.isArray(v)?v:(v?Object.values(v):[]);
        if(typeof cb==='function')cb(arr);
      });
    }
  };
})();
