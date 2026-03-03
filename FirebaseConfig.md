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

## 注意事項

- **全ての端末で同じURLから開く**: file:/// やローカルサーバーで開いた場合、Firebase が設定されていてもデータは同期されません。GitHub Pages 等の公開URLを使用してください。
- **config.js は GitHub に含める**: config.js に Firebase の設定を記入したら、GitHub にプッシュする必要があります。.gitignore に含めていないか確認してください。
