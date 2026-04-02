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
// ■ 会社の Microsoft 365 宛に「届く」運用（推奨・既定）: workflowNotifyVia: 'mailto'
//   → 提出・承認のあとに Outlook 等のメール作成が開くので、必ず「送信」を押す。送信経路は手動テストで届いたのと同じ。
//   → anzensystem@outlook.com が Microsoft にブロックされている間は送信できない。Outlook から届く「verify your account」で解除する。
// ■ EmailJS のみで自動送信に戻す場合: 下の workflowNotifyVia の1行を削除するか 'emailjs' にする（会社宛は届かない・ブロックされやすいことがある）
window.HH_EMAILJS = {
  publicKey: 'dKdOCX_WE0eYN_A5X',
  // EmailJS API はメールアドレスを service ID にできない。ダッシュボードで「デフォルト」のサービス1つのときは default_service
  serviceId: 'default_service',
  templateId: 'template_cnyi3sx',
  fromEmail: 'anzensystem@outlook.com',
  replyToEmail: 'anzensystem@outlook.com',
  fromName: '安全衛生管理システム',
  // workflowNotifyVia: mailto のとき、メール作成に &from= を付与（Outlook でこのアカウントから送るよう促す）
  mailtoFromEmail: 'anzensystem@outlook.com',
  workflowNotifyVia: 'mailto'
};

// 災害承認ワークフロー: Slack / Teams（Webhook）/ Power Automate（HTTP トリガー URL）
// いずれかを入れると提出・承認・差戻し時に Webhook も送る。EmailJS のみのときは通常 mailto は開かない。workflowNotifyVia: 'mailto' のときは Webhook と併せてメール作成も開く。
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
