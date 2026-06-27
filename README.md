# おくすり手帳 🐶💊

愛犬と奥さんの服薬を、可愛らしくシンプルに管理する Android アプリ。

## 機能

- 🐶 / 👩 の **2プロファイル切替**
- お薬を **「N日おき＋指定時刻」** で登録（毎日、2日おき、3日おき、週1、2週ごと、月1 …）
- 指定時刻にスマホ通知 → **「✓ あげた」** をタップで履歴に記録
- カレンダー画面で月単位の予定 / 履歴をひと目で確認
- 全データは端末ローカル SQLite に保存（クラウド同期なし）

## 技術スタック

| カテゴリ | 採用 |
|---|---|
| フレームワーク | Expo SDK 56 + React Native 0.85 + TypeScript |
| ルーティング | `expo-router`（ファイルベース） |
| ローカルDB | `expo-sqlite` |
| 通知 | `expo-notifications` |
| カレンダーUI | `react-native-calendars` |
| 状態管理 | `zustand` + `AsyncStorage` |
| 日付処理 | `date-fns` |
| フォント | `M PLUS Rounded 1c`（Google Fonts） |
| アイコン | `@expo/vector-icons` (Ionicons) |

## セットアップ

```bash
npm install
```

## 開発

```bash
npx expo start
```

ターミナルに表示される QR コードを **Expo Go** アプリで読み取る、または `a`（Android emulator）/ `i`（iOS sim）/ `w`（Web）。

> 通知の **本物の挙動**（アクションボタン、バックグラウンド受信）は Expo Go では一部制限があります。確実に確認したいときは開発ビルドで：
>
> ```bash
> npx expo run:android
> ```

## Android ビルド（配布用 APK）

EAS を使うのが一番楽です。初回のみ：

```bash
npm install -g eas-cli
eas login
eas build:configure
```

ビルド：

```bash
eas build -p android --profile preview
```

ビルド完了後、出力された `.apk` を端末に直接インストール（共有リンク経由 or USB）。

## フォルダ構成

```
src/
├── app/                 # expo-router
│   ├── _layout.tsx      # ルート（フォント・DB・通知の起動）
│   ├── (tabs)/          # ホーム / カレンダー / お薬 / 設定
│   └── meds/            # 薬の新規追加 / 編集 (modal)
├── components/          # 共通UIパーツ
│   ├── ProfileSwitcher.tsx
│   ├── MedCard.tsx
│   ├── DoseChecklistItem.tsx
│   ├── MedicationForm.tsx
│   └── ...
├── db/                  # SQLite
│   ├── client.ts
│   ├── migrations.ts
│   └── queries.ts
├── notifications/       # 通知レイヤ
│   ├── schedule.ts      # 予約・キャンセル
│   └── handler.ts       # アクション受信
├── store/               # zustand
│   └── profile.ts
├── theme/               # 色・フォント
│   ├── colors.ts
│   └── typography.ts
└── utils/               # 日付・スケジュール展開
    ├── date.ts
    └── schedule.ts
```

## データモデル

3 テーブル構成（SQLite, `src/db/migrations.ts`）。

| テーブル | 内容 |
|---|---|
| `profiles` | 愛犬・奥さんなどのプロファイル（`name`, `kind`, `avatar_emoji`） |
| `medications` | お薬本体（`profile_id`, `name`, `dose`, `interval_days`, `start_date`, `reminder_time`, `color`, `note`） |
| `dose_logs` | 服薬記録（`medication_id`, `scheduled_at`, `taken_at`, `status`） |

`dose_logs` は「あげた」「スキップした」ものだけ記録します。pending（未消化）は事前生成せず、表示時に `medications` から展開します。

## 通知の仕組み

- 薬を追加 / 編集すると、**向こう 60 日分** の通知が一括予約されます（`expo-notifications` の DateTrigger）。
- 通知には「✓ あげた」アクションが付与されており、タップで `dose_logs` に taken が書き込まれます（`src/notifications/handler.ts`）。
- 60 日を超えて使い続けたとき / 通知が来なくなったときは、**設定画面 →「通知を再登録」** で全通知をリフレッシュできます。

## デザイン方針

| 用途 | 色 |
|---|---|
| 背景 | クリーム `#FFF8F0` |
| カード | 純白 `#FFFFFF` |
| メイン | ミルクティーベージュ `#D4A574` |
| 犬アクセント | ピンク `#FFB6B9` |
| 人アクセント | ミントグリーン `#A8D8B9` |

フォントは丸ゴシックの `M PLUS Rounded 1c`、角丸は 16〜24px、絵文字を積極活用。

## 既知の制約 / 今後の改善

- クラウド同期なし（端末を変えるとデータが消える）
- 通知は端末ローカル予約のみ（OS が予約をクリアすると失われる → 設定画面の「再登録」で復旧可）
- 薬の写真添付、在庫管理、ホーム画面ウィジェットは未対応
