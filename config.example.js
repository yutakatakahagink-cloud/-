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
// 設定するとQRコードがこのURLを指すようになります
// window.HH_BASE_URL = "https://あなたのユーザー名.github.io/リポジトリ名/";
