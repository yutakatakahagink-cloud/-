// Firebase 設定（config.example.js を参考に編集）
// 設定すると携帯・他PCからも同じデータで利用できます

// ★ 本番サイトのルート（GitHub Pages で user.html・email.min.js・config.js を置いている階層）
// リポジトリ: github.com/yutakatakahagink-cloud/- ／ 公開例: …/user.html と同じパス直下
// 末尾は必ず / 。QRコード・承認メール内リンク・EmailJS SDK（email.min.js）の読み込み基準になります
// ※ ユーザー名の綴り注意: takahagink（正）／ takahaqink・takatahagink・takataka… などは別URLで別configになります
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

// 災害承認メール（HH_EMAILJS）
// ■ 送信元は社用 Microsoft 365（下記）。EmailJS の Outlook 接続と同じアカウントにすること。
// ■ workflowNotifyVia: 'emailjs' … EmailJS のみ（ブラウザ版/デスクトップの下書き画面は開かない）。手動に戻すときは 'mailto'
// ■ composeMode は mailto フォールバック時のみ効く。'outlookWeb' にすると OWA が開くので自動送信時は付けないこと。
// allowMailtoFallbackOnEmailJsFailure: true … EmailJS 失敗時だけ mailto/OWA を開く（任意）
window.HH_EMAILJS = {
  publicKey: 'dKdOCX_WE0eYN_A5X',
  serviceId: 'default_service',
  templateId: 'template_cnyi3sx',
  fromEmail: 'yutaka_takahagi@nissinkohgyo.onmicrosoft.com',
  replyToEmail: 'yutaka_takahagi@nissinkohgyo.onmicrosoft.com',
  fromName: '安全衛生管理システム',
  mailtoFromEmail: 'yutaka_takahagi@nissinkohgyo.onmicrosoft.com',
  allowMailtoFallbackOnEmailJsFailure: false,
  workflowNotifyVia: 'emailjs'
};

// 災害承認ワークフロー: Slack / Teams（Webhook）/ Power Automate（HTTP トリガー URL）
// いずれかを入れると提出・承認・差戻し時に Webhook も送る。EmailJS 利用時は通常メール作成は開かない（失敗時のみ mailto フォールバックのことがある）。
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
