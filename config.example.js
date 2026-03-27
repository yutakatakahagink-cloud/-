// ============================================
// Firebase 設定（コピーして config.js に保存）
// ============================================
// 1. https://console.firebase.google.com/ でプロジェクトを作成
// 2. プロジェクト設定 → 全般 → アプリを追加 → ウェブ
// 3. 以下の値を config.js にコピー

window.HH_FIREBASE_CONFIG = {
  apiKey: "ここにAPIキーを入力",
  authDomain: "プロジェクトID.firebaseapp.com",
  databaseURL: "https://プロジェクトID-default-rtdb.firebaseio.com",
  projectId: "プロジェクトID",
  storageBucket: "プロジェクトID.appspot.com",
  messagingSenderId: "数字",
  appId: "1:数字:web:英数字"
};

// databaseURL が重要です。Realtime Database を作成後、
// プロジェクト設定 → サービス アカウント で確認できます。
// 形式: https://XXXX-default-rtdb.firebaseio.com または
//       https://XXXX-default-rtdb.asia-southeast1.firebasedatabase.app

// オプション: 携帯・他PCからアクセスする公開URL（GitHub Pages等）
// 設定するとQRコードがこのURLを指すようになります。
// 災害承認メール内の「ログイン不要」リンク（disaster-approver.html）もここを基準にします。未設定だと file:// や現在のホストになります。
// window.HH_BASE_URL = "https://あなたのユーザー名.github.io/リポジトリ名/";

// ============================================
// EmailJS（任意・推奨）— 提出・承認・差戻しの通知を「ブラウザから自動送信」する
// ============================================
// ■ 未設定のとき
//   毎回 mailto（既定のメールソフト）が開きます。手動で送信する必要があります。
// ■ 設定したとき
//   HH_EMAILJS を書いた config.js を GitHub Pages 等にデプロイすると、
//   提出・次承認者への通知・差戻し通知が EmailJS 経由で API 送信され、メール画面は開きません。
//
// 手順の概要:
// 1) https://www.emailjs.com/ でアカウント作成
// 2) Email Services で送信に使うメール（Gmail 等）を接続
// 3) Email Templates でテンプレートを1つ作成し、次の変数を使えるようにする:
//    To（宛先）: {{to_email}}
//    Subject: {{subject}}
//    本文: {{message}} {{admin_link}} {{approver_public_link}} {{report_id}} {{reporter_name}}
//    返信先: {{reply_to}} または Reply-To に {{reply_to}}（所有者画面の送信元メール）
//    差戻し時の BCC: {{bcc_email}}（任意・所有者へ副本）
// 4) Account → API Keys の Public Key を publicKey に
// 5) EmailJS ダッシュボード「Restricted Domains」に、サイトのオリジンを登録
//    例: https://yutakatakahagink-cloud.github.io
//
// window.HH_EMAILJS = {
//   publicKey: "xxxxxxxxxxxxxxx",
//   serviceId: "service_xxxx",
//   templateId: "template_xxxx"
// };

// ============================================
// Slack / Microsoft Teams Webhook（任意）
// ============================================
// 災害報告の「提出・次承認・差戻し」のたびに、Incoming Webhook でチャンネルへ投稿します。
// EmailJS / mailto と同時に使えます（Webhook だけ・メールだけ・両方、どれでも可）。
//
// Slack: アプリ「Incoming Webhooks」をチャンネルに追加 → Webhook URL をコピー
// Teams: チャンネル → ⋮ → コネクタ → Incoming Webhook → URL をコピー
//
// ※ URL は config.js に書くとブラウザから見えるため、専用チャンネルに限定し、
//   漏れたら Webhook を再発行することを推奨します。
// ※ ブラウザの CORS により、環境によっては投稿に失敗する場合があります（F12 コンソールを確認）。
//   確実に送る場合は Firebase Cloud Functions 等でプロキシする方法があります。
//
// window.HH_WEBHOOK_NOTIFY = {
//   slackIncomingUrl: "https://hooks.slack.com/services/XXX/YYY/ZZZ",
//   teamsIncomingUrl: "https://outlook.office.com/webhook/...",
//   enabled: true
// };
