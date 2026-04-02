# 複数端末で同一データを表示するための Firebase 設定手順

携帯で報告した内容がPCに反映されない場合、Firebase の設定が必要です。以下の手順で設定してください。

---

## 1. Firebase プロジェクトを作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」をクリック
3. プロジェクト名を入力（例：hiyarihatt-report）して作成

---

## 2. Realtime Database を有効化

1. 左メニュー「Realtime Database」をクリック
2. 「データベースを作成」をクリック
3. リージョンは **asia-southeast1（シンガポール）** を選択（日本からは最も近い選択肢です。※東京はRealtime Databaseでは選択できません）
4. セキュリティルールは「テストモードで開始」でOK（後で制限可能）

---

## 3. ウェブアプリの設定値を取得

1. プロジェクト設定（歯車アイコン）→「全般」タブ
2. 「アプリを追加」→「ウェブ」（</> アイコン）を選択
3. アプリのニックネームを入力して「アプリを登録」
4. 表示された設定値をコピー

---

## 4. 設定を記入（2つの方法）

### 方法A: config.firebase.json を使う（推奨・config.js を編集不要）

1. `config.firebase.json.example` をコピーして `config.firebase.json` を作成
2. 取得した値を貼り付け
3. `config.firebase.json` を GitHub にプッシュ

```json
{
  "apiKey": "取得したAPIキー",
  "authDomain": "プロジェクトID.firebaseapp.com",
  "databaseURL": "https://プロジェクトID-default-rtdb.firebaseio.com",
  "projectId": "プロジェクトID",
  "storageBucket": "プロジェクトID.appspot.com",
  "messagingSenderId": "数字",
  "appId": "1:数字:web:英数字"
}
```

### 方法B: config.js に直接記入

`config.js` を開き、`HH_FIREBASE_CONFIG` に取得した値を貼り付けます。

**重要**: `databaseURL` が空だと Firebase は使われません。必ず記入してください。

---

## 5. GitHub にプッシュして反映

1. 更新した `config.firebase.json` または `config.js` を GitHub リポジトリにプッシュ
2. 数分後、GitHub Pages のURL（例：https://xxx.github.io/-/）から開く
3. **携帯・PCの両方で同じURLから開いてください**

---

## 6. 災害承認メール（ログイン不要の disaster-approver.html）が「報告が見つかりません」になるとき

承認用ページ（`disaster-approver.html`）は、**画面としてはログインしません**が、Firebase 接続直後に **匿名認証（signInAnonymously）** を1回行います。これにより、ルールを `auth != null` にしていても災害データを読み取れるようにしています。

### 手順A（推奨）: 匿名ログイン + ルールで認証済みのみ読取

1. Firebase Console → **Authentication** → **Sign-in method** → **匿名** を**有効**にする。  
2. Realtime Database → **ルール** の例:

```json
{
  "rules": {
    "hh_data": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

- 匿名が無効のままだと、承認ページのコンソールに匿名ログイン失敗の警告が出、read が弾かれます。
- コンソール（F12）に **`PERMISSION_DENIED`** が出る場合は、上記の匿名有効化とルールを確認してください。

### 手順B: 未認証でも読めるルール（シンプルだが緩い）

匿名を使わず、従来どおり未認証 read も許可する例です。

```json
{
  "rules": {
    "hh_data": {
      ".read": true,
      ".write": true
    }
  }
}
```

- ルールで `.read` が `auth != null` のみで、**かつ匿名がオフ**のときは、承認ページは一覧を取得できずエラーになります。
- セキュリティを上げる場合は、書き込みだけ制限する・別パスに分ける等の設計が必要です（現行アプリは主に read/write 可能なルール前提です）。

### ルールに `now < 日付` がある場合（テストモード）

期限の **Unix 時刻を過ぎると、read も write もすべて拒否**されます。急に URL もメール連携も「全部おかしい」ように見えます。

- Firebase Console → Realtime Database → **ルール** が **公開済み**か確認する（編集だけでは未反映）。
- JSON の **末尾カンマ**（`.write` の行の最後の `,`）があると公開に失敗し、**古いルールのまま**になることがあります。カンマを消して再公開する。
- 期限を延ばすか、上記の **`hh_data` だけに絞ったルール**に切り替えることを推奨します。

---

## 7. 「メールが届かない」と「承認 URL が開かない」が同時に起きるとき

別原因の組み合わせが多いです。次を順に確認してください。

### メール（`config.js` で `workflowNotifyVia: 'mailto'` のとき）

- **自動では届きません。** 提出・承認のあとに開く **Outlook 等で「送信」** するまで、宛先の受信トレイには出ません。
- **ポップアップブロック**でメール画面が開かないことがあります。アドレスバー右のブロック表示を許可する。
- 届かないのが **会社の Microsoft 365** のみのときは、引き続き隔離・スパムの可能性があります（手元の Outlook から送っているか確認）。

### 承認 URL（`disaster-approver.html`）

- **GitHub Pages に** `disaster-approver.html`・`hh-data.js`・`config.js`・`firebase-auth-compat.js` を読み込む **最新版**が載っているか（ローカルだけ更新していないか）。
- ブラウザの **スーパーリロード**（Ctrl+Shift+R）で `config.js` / `hh-data.js` の古いキャッシュを避ける。`disaster-approver.html` はクエリ付きで読み込むよう更新済みです。
- 上記 **Realtime Database ルール**（期限切れ・末尾カンマ・未公開）。
- **Authentication → 匿名** が有効か（ルールが `auth != null` のとき）。

---

## 注意事項

- **全ての端末で同じURLから開く**: file:/// やローカルサーバーで開いた場合、Firebase が設定されていてもデータは同期されません。GitHub Pages 等の公開URLを使用してください。
- **config.js は GitHub に含める**: config.js に Firebase の設定を記入したら、GitHub にプッシュする必要があります。.gitignore に含めていないか確認してください。
- **GitHub Pages のURLの打ち間違い**: `github.io` のユーザー名・リポジトリ名が1文字でも違うと、**別のサイト**になり、空のデータや別の Firebase 設定を見ることがあります。メールに記載したURLと `config.js` の `HH_BASE_URL` を一致させてください。
