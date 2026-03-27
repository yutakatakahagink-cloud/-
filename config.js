// Firebase 設定（config.example.js を参考に編集）
// 設定すると携帯・他PCからも同じデータで利用できます

// ★ 携帯・他PCから開くURL（GitHub Pagesの場合はここに記入）
// 末尾の / を忘れずに。ローカルで開くときもQRコードがこのURLを指します
window.HH_BASE_URL = "https://yutakatakahagink-cloud.github.io/-/";

window.HH_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCbp1jk4JKacRzomhwI1he2BmZo27kcoY0",
  authDomain: "hiyarihatt-report.firebaseapp.com",
  databaseURL: "https://hiyarihatt-report-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hiyarihatt-report",
  storageBucket: "hiyarihatt-report.firebasestorage.app",
  messagingSenderId: "482488701359",
  appId: "1:482488701359:web:92e80abb1ed54b90a41f5a"
};

// Gemini Vision API キー（OCR用）
window.HH_GEMINI_API_KEY = "AIzaSyANRvganYmBn0lnqTX81ipC59JSsWs3Ns4";

// 災害承認ワークフロー: Slack / Teams 通知（Incoming Webhook）
// いずれかの URL を入れると、提出・承認・差戻し時にチャンネルへ投稿し、Outlook（mailto）は開きません。
// 未設定のままだと従来どおりメール作成画面が開きます。URL は Slack/Teams で発行して貼り付けてください。
window.HH_WEBHOOK_NOTIFY = {
  slackIncomingUrl: '',
  teamsIncomingUrl: '',
  enabled: true
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
