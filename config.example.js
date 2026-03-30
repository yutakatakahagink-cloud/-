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
// ■ 推奨運用: システム専用メール 1 本（会社で共有の送信用アカウント）
//   1) 例: anzen@会社ドメイン など、安全衛生用のメールボックスを 1 つ用意する
//   2) EmailJS の Email Services で、そのアカウントだけを接続する（serviceId はその接続 1 つを指定）
//   3) 提出 → 第1承認者宛、承認 → 次の承認者宛、差戻し → 報告者宛、がすべてこの経路から送信される
//   4) config.js の HH_EMAILJS で fromEmail / replyToEmail をその専用アドレスにそろえる（テンプレの From・Reply-To に割当）
//   5) 所有者画面「災害報告メールの送信元」にも同じアドレスを入れて保存する（差戻し BCC・本文の返信先表示と一致）
//   ※ パスワードや OAuth は EmailJS ダッシュボード側のみ。config.js には書かない。
//
// ■ 未設定のとき
//   毎回 mailto（既定のメールソフト）が開きます。手動で送信する必要があります。
// ■ 設定したとき
//   HH_EMAILJS を書いた config.js を GitHub Pages 等にデプロイすると、
//   提出・次承認者への通知・差戻し通知が EmailJS 経由で API 送信され、メール画面は開きません。
//
// 手順の概要:
// 1) https://www.emailjs.com/ でアカウント作成
// 2) Email Services で送信に使うメール（Gmail / Outlook 等）を1つ以上接続
//    → serviceId は「どの接続で送るか」の ID（＝実質どのメールアカウント経路で送るか）
// 3) Email Templates でテンプレートを1つ作成し、次の変数を使えるようにする:
//    To（宛先）: {{to_email}}
//    Subject: {{subject}}
//    本文: {{message}} {{admin_link}} {{approver_public_link}} {{report_id}} {{reporter_name}}
//    From（接続先が許す場合）: {{from_email}} や表示名 {{from_name}}
//    Reply-To: {{reply_to}}（または {{sender_email}} を Reply-To に）
//    差戻し時の BCC: {{bcc_email}}（任意・副本）
// 4) Account → API Keys の Public Key を publicKey に
// 5) 無料プラン: Account → Security の Domains 制限は有料のため省略可（未設定で送信可能）
//    有料プランなら Restricted Domains に本番オリジン（例: https://ユーザー.github.io）を登録推奨
//
// ■ config で上書きする送信元（任意）
//   fromEmail / replyToEmail / fromName を空にすると、所有者画面の「送信元メール」と同じ扱い。
//   値を入れると EmailJS テンプレに渡る from_email / reply_to 等が config 優先になる。
// ■ EmailJS 未使用時・失敗時の「メールアプリ」
//   composeMode: 'mailto' → OS の既定メーラー（mailto）。mailtoFromEmail を付けると &from= を付与（クライアントによっては無視）
//   composeMode: 'outlookWeb' → ブラウザで Outlook on the web の新規メールを開く
//
// window.HH_EMAILJS = {
//   publicKey: "xxxxxxxxxxxxxxx",
//   serviceId: "default_service", // メールサービスを1つだけ「デフォルト」にしたとき（API にメールアドレスは使えない）
//   // または編集画面の service_xxxxx
//   templateId: "template_xxxx",
//   fromEmail: "anzen@example.com",
//   replyToEmail: "anzen@example.com",
//   fromName: "安全衛生管理システム",
//   mailtoFromEmail: "",
//   composeMode: "mailto",
//   outlookWebComposeBase: "https://outlook.office.com/mail/deeplink/compose"
// };

// ============================================
// Slack / Teams Webhook / Power Automate（任意）
// ============================================
// 災害報告の「提出・次承認・差戻し」のたびに通知します。
// EmailJS / mailto と同時に使えます。
//
// Slack: アプリ「Incoming Webhooks」をチャンネルに追加 → Webhook URL をコピー
// Teams: チャンネル用 Incoming Webhook、または Teams の「ワークフロー」で HTTP 受信 → チャンネル投稿
//
// Power Automate（推奨: 個人チャットやメールへ振り分けたいとき）
// 1) https://make.powerautomate.com で「自動化されたクラウド フロー」を新規
// 2) トリガー: 「HTTP リクエストの受信時」（Premium のテナントあり。無い場合は管理者に確認）
// 3) 「サンプルの JSON を使用してスキーマを生成」に、次の JSON を貼り付けてスキーマを生成:
//
// {
//   "source": "hh-disaster-workflow",
//   "version": 1,
//   "kind": "submitted",
//   "notifyEmail": "approver@example.com",
//   "title": "【災害報告】新規提出・再提出（承認待ち）",
//   "text": "複数行の本文",
//   "reportId": "",
//   "reporter": "",
//   "approverPublicUrl": "https://...",
//   "adminUrl": "https://...",
//   "replyToEmail": "",
//   "returnNote": ""
// }
//
// 4) kind は "submitted" | "approved_next" | "returned" 。notifyEmail はその通知の主たる宛先（承認者メール等）
// 5) 次のアクション例: 「Teams でチャットまたはチャネルにメッセージを投稿」→ 受信した notifyEmail のユーザー宛
// 6) 保存後、トリガーに表示される「HTTP POST URL」をコピーし powerAutomateUrl に貼り付け
//
// ※ URL は config.js に書くとブラウザから見えるため、漏れたらフロー URL を再発行してください。
// ※ ブラウザの CORS により失敗する場合があります（F12 コンソール）。確実に送るならサーバー側プロキシも可。
//
// window.HH_WEBHOOK_NOTIFY = {
//   slackIncomingUrl: "https://hooks.slack.com/services/XXX/YYY/ZZZ",
//   teamsIncomingUrl: "https://outlook.office.com/webhook/...",
//   powerAutomateUrl: "https://default...environment.api.powerplatform.com/.../triggers/manual/paths/invoke?...",
//   enabled: true
// };
