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

// 災害承認メール: EmailJS 無料プラン運用（月200通まで等）。Account→Security の Domains 制限は有料のため未設定で可。
// publicKey / serviceId / templateId 設定済み。本番 URL から動作確認。所有者画面の送信元を anzensystem@outlook.com に。
window.HH_EMAILJS = {
  publicKey: 'dKdOCX_WE0eYN_A5X',
  // EmailJS API はメールアドレスを service ID にできない。ダッシュボードで「デフォルト」のサービス1つのときは default_service
  serviceId: 'default_service',
  templateId: 'template_cnyi3sx',
  fromEmail: 'anzensystem@outlook.com',
  replyToEmail: 'anzensystem@outlook.com',
  fromName: '安全衛生管理システム'
};

// 災害承認ワークフロー: Slack / Teams（Webhook）/ Power Automate（HTTP トリガー URL）
// いずれかを入れると提出・承認・差戻し時に通知し、Outlook（mailto）は開きません。
// powerAutomateUrl: フロー「HTTP リクエストの受信時」で発行した POST 用 URL（config.example.js の JSON スキーマ参照）
window.HH_WEBHOOK_NOTIFY = {
  slackIncomingUrl: '',
  teamsIncomingUrl: '',
  powerAutomateUrl: '',
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
