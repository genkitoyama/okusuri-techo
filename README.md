# おくすり手帳 🐶💊

愛犬と奥さんの服薬を、可愛らしくシンプルに管理する Android アプリ。

## 機能

- 🐶 / 👩 の **2プロファイル切替**（プロファイルには写真もしくは絵文字を設定可能）
- スケジュールは **N日おき / 毎月N日 / 毎週曜日(複数)** の3モード（月末補正あり）
- 1日に **複数の通知時刻**（例: 9:00, 13:00, 21:00 を1薬に設定 → ホーム画面で個別チェック）
- 指定時刻にスマホ通知 → **「✓ あげた」** をタップで履歴に記録
- カレンダー画面で月単位の予定 / 履歴をひと目で確認
- **履歴タブ** で薬の追加・停止・量変更・間隔変更・通知時刻変更を時系列表示（プロファイル別 / お薬別フィルタ）
- **ホーム画面ウィジェット** (小・中 2サイズ、 ウィジェット毎にプロファイル選択可能)
- 全データは端末ローカル SQLite に保存（クラウド同期なし）

## 技術スタック

| カテゴリ | 採用 |
|---|---|
| フレームワーク | Expo SDK 56 + React Native 0.85 + TypeScript |
| ルーティング | `expo-router`（ファイルベース） |
| ローカルDB | `expo-sqlite` |
| 通知 | `expo-notifications` |
| カレンダーUI | `react-native-calendars` |
| 写真 | `expo-image-picker` |
| ホーム画面ウィジェット | `react-native-android-widget` |
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

> 通知やウィジェットは Expo Go では動作しないので、 開発ビルドで:
>
> ```bash
> npx expo run:android
> ```

## Android ビルド（配布用 APK）

ローカルで release APK を作る場合 (debug keystore 署名でサイドロード可):

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH

cd android
./gradlew assembleRelease \
  -PreactNativeArchitectures=arm64-v8a \
  -Pandroid.enableMinifyInReleaseBuilds=true \
  -Pandroid.enableShrinkResourcesInReleaseBuilds=true
```

出力: `android/app/build/outputs/apk/release/app-release.apk` (~49MB)

EAS を使う場合:

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

## フォルダ構成

```
src/
├── app/                       # expo-router
│   ├── _layout.tsx            # ルート(フォント・DB・通知の起動・profileキャッシュ)
│   ├── (tabs)/                # ホーム / カレンダー / お薬 / 履歴 / 設定
│   │   ├── index.tsx
│   │   ├── calendar.tsx
│   │   ├── meds.tsx
│   │   ├── history.tsx
│   │   └── settings.tsx
│   └── meds/                  # 薬の新規追加 / 編集 (modal)
├── components/                # 共通UIパーツ
│   ├── ProfileSwitcher.tsx
│   ├── MedCard.tsx
│   ├── DoseChecklistItem.tsx
│   ├── MedicationForm.tsx
│   ├── ProfileEditRow.tsx
│   └── ...
├── db/                        # SQLite
│   ├── client.ts
│   ├── migrations.ts
│   └── queries.ts
├── notifications/             # 通知レイヤ
│   ├── schedule.ts
│   └── handler.ts
├── store/                     # zustand
│   └── profile.ts
├── theme/                     # 色・フォント
│   ├── colors.ts
│   └── typography.ts
├── utils/                     # 日付・スケジュール展開
│   ├── date.ts
│   └── schedule.ts
└── widgets/                   # ホーム画面ウィジェット
    ├── OkusuriSmallWidget.tsx
    ├── OkusuriMediumWidget.tsx
    ├── WidgetConfigurationScreen.tsx
    ├── widget-task-handler.tsx
    └── utils.ts

index.js                       # 旧 expo-router/entry +
                               #   registerWidgetTaskHandler /
                               #   registerWidgetConfigurationScreen
```

## データモデル

4 テーブル構成（SQLite, `src/db/migrations.ts`）。

| テーブル | 内容 |
|---|---|
| `profiles` | プロファイル(`name`, `kind`, `avatar_emoji`, `photo_uri`) |
| `medications` | お薬(`profile_id`, `name`, `dose`, `interval_days`, `start_date`, `reminder_time`, `color`, `note`, `schedule_type`, `monthly_day`, `weekly_days`) |
| `dose_logs` | 服薬記録(`medication_id`, `scheduled_at`, `taken_at`, `status`) |
| `med_events` | 変更履歴(`medication_id`, `medication_name`, `event_type`, `payload`, `created_at`) |

`dose_logs` は「あげた / スキップした」ものだけを保存します(pendingは事前生成せず、表示時に `medications` から展開)。 `reminder_time` は `"09:00,21:00"` のようにカンマ区切りで複数時刻を持てます。

### スケジュールタイプ

- `schedule_type = 'interval'`: `interval_days` (N日おき)
- `schedule_type = 'monthly'`: `monthly_day` (毎月の日付、 31日指定で2月なら28/29日に補正)
- `schedule_type = 'weekly'`: `weekly_days` (`"1,3,5"` のようにカンマ区切り、 日=0..土=6)

## 通知の仕組み

- 薬を追加 / 編集すると、**向こう 60 日分** の通知が一括予約されます（`expo-notifications` の DateTrigger）。
- 通知には「✓ あげた」アクションが付与されており、タップで `dose_logs` に taken が書き込まれます。
- 60 日を超えて使い続けたとき / 通知が来なくなったときは、**設定画面 → 「通知を再登録」** で全通知をリフレッシュできます。

## ホーム画面ウィジェット

`react-native-android-widget` で実装。 2サイズ:

| サイズ | 内容 |
|---|---|
| 小 (180×110dp) | 次に飲む薬1件のサマリー + 達成カウント |
| 中 (260×200dp) | 今日の薬リスト最大5件 + 達成カウント |

配置時に **プロファイル選択画面** (Configuration Activity) が出るので、 ウィジェット毎に「ワンちゃん」「奥さん」を選べます。 ウィジェットタップで `clickAction="OPEN_APP"` でアプリ起動。

### 注意点 (実装メモ)

- ウィジェット UI では **React Fragment (`<>...</>`) は使えません** (`Symbol(react.fragment) is not a function` で render に失敗)。 `FlexWidget` で必ずラップ。
- Widget headless task で expo-sqlite が動かない可能性があるため、 配置時に選んだ profile を **AsyncStorage に丸ごとキャッシュ** する fallback を備えています (`src/widgets/utils.ts` の `setWidgetProfile`)。
- ウィジェットの登録は `index.js` で `registerWidgetTaskHandler` / `registerWidgetConfigurationScreen` で行います。

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
- iOS は未対応（ロジック層は動くがウィジェットは Android のみ）
- ウィジェットの状態更新は OS の定期更新 + 配置時のみ。 アプリ内のチェック状態が即時反映されない場合あり (アプリ起動 → ホームに戻ると更新)
