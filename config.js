// Firebase 設定（config.example.js を参考に編集）
// 設定すると携帯・他PCからも同じデータで利用できます

// ★ 携帯・他PCから開くURL（GitHub Pagesの場合はここに記入）
// 末尾の / を忘れずに。ローカルで開くときもQRコードがこのURLを指します
window.HH_BASE_URL = "https://yutakatakahagink-cloud.github.io/-/";

window.HH_FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// config.firebase.json があれば読み込んで上書き（編集不要で設定可能）
(function(){
  try{
    var xhr=new XMLHttpRequest();
    var url=(window.HH_BASE_URL||(location.protocol+'//'+location.host+location.pathname.replace(/[^/]+$/,'')))+'config.firebase.json';
    xhr.open('GET',url,false);
    xhr.send();
    if(xhr.status===200){
      var c=JSON.parse(xhr.responseText);
      if(c&&c.databaseURL&&(c.databaseURL.indexOf('firebaseio.com')>=0||c.databaseURL.indexOf('firebasedatabase.app')>=0)){
        window.HH_FIREBASE_CONFIG=Object.assign({},window.HH_FIREBASE_CONFIG,c);
      }
    }
  }catch(e){}
})();
