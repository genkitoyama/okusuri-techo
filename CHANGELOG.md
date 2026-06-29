# 変更履歴

このプロジェクトの全変更履歴。 形式は [Keep a Changelog](https://keepachangelog.com/) に準拠。

## v1.3.1 — プロファイル写真の永続化 (2026-06-29)

[Release](https://github.com/genkitoyama/okusuri-techo/releases/tag/v1.3.1) / PR: [#3](https://github.com/genkitoyama/okusuri-techo/pull/3)

### 修正 (Fixed)

- **プロファイル写真が突然表示されなくなる問題**
  - `expo-image-picker` の crop 後の画像がアプリの cache directory に保存されていたため、 OS のキャッシュ削除タイミング (容量逼迫時 / アプリ更新時など) で実体が消えると `<Image>` が描画失敗していた
  - 新規に選んだ写真は `documentDirectory/profiles/` に永続コピーするよう変更
  - 起動時マイグレーションで既存 `photo_uri` を自動で永続パスに移し替え
  - 実体が既に消えている場合は `photo_uri = NULL` にリセット (設定で再選択を促す)
  - AsyncStorage の `profiles-cache` も migration 後に refresh されるので、 ウィジェットも自動追従

### 追加 (Added)

- `src/utils/profilePhoto.ts` — 写真の永続化 / マイグレーション helper
- `expo-file-system` 依存 (`/legacy` API を使用)

### 変更 (Changed)

- バージョンを `v1.3.0` → `v1.3.1` に

## v1.3.0 — 過去のお薬チェック対応 (2026-06-28)

[Release](https://github.com/genkitoyama/okusuri-techo/releases/tag/v1.3.0) / PR: [#2](https://github.com/genkitoyama/okusuri-techo/pull/2)

### 追加 (Added)

- **ホーム画面に「飲み忘れ」 セクション**
  - プロファイル切替の直下に過去 7 日分の未記録お薬を集計表示
  - 件数を danger 色 (赤系) で目立たせて見落としを防止
  - 各行タップで「あげた」 を記録、 ホームから消える
  - 該当がないときはセクション自体を非表示
- **カレンダー詳細でチェック切替**
  - カレンダーの日付タップで開く詳細シートで、 各お薬の「未」/「あげた」 ピルをタップで切替
  - タップ反応はピル部分だけに限定 (`hitSlop=8` で押しやすさ確保)
  - 行全体の誤タップで状態が変わらず、 過去日を眺めるだけのときも安心

### 変更 (Changed)

- バージョンを `v1.2.0` → `v1.3.0` に

## v1.2.0 — ホーム画面ウィジェット (2026-06-28)

[Release](https://github.com/genkitoyama/okusuri-techo/releases/tag/v1.2.0) / PR: [#1](https://github.com/genkitoyama/okusuri-techo/pull/1)

### 追加 (Added)

- **Android ホーム画面ウィジェット** (`react-native-android-widget`)
  - 小サイズ (180×110dp): 次に飲むお薬1件のサマリー + 達成カウント (1/3 など)
  - 中サイズ (260×200dp): 今日のお薬リスト最大5件 + 各お薬のチェック状態
  - 配置時の Configuration Screen でウィジェット毎にプロファイル選択可能
  - タップでアプリ起動 (`clickAction="OPEN_APP"`)
- プロファイル情報を AsyncStorage にキャッシュ
  - widget headless task で `expo-sqlite` が動かない環境での fallback
  - メインアプリ起動時 + プロファイル編集時に `okusuri:profiles-cache` を refresh
- ローカル release ビルド手順を README に追記

### 変更 (Changed)

- メインエントリを `expo-router/entry` から `index.js` に変更
  - `registerWidgetTaskHandler` / `registerWidgetConfigurationScreen` を登録
- README を v1.1 機能 (毎月/毎週スケジュール、 履歴タブ、 写真、 複数時刻) + ウィジェット対応に合わせて全面更新
- バージョンを `v1.1.0` → `v1.2.0` に

### 修正 (Fixed)

- ウィジェット UI で **React Fragment (`<>...</>`) は使えない** (`Symbol(react.fragment) is not a function` で render に失敗) ため、 `FlexWidget` で必ずラップするように変更
- `TextWidget` style に `flex` を渡していた型エラーを修正 (親 `FlexWidget` でラップする形に)
- `backgroundColor` に動的な `string` を渡していた `ColorProp` 型エラーを `as any` で吸収

## v1.1.0 — 履歴 / スケジュール拡張 / 写真 (2026-06-28)

### 追加 (Added)

- **履歴タブ** (5タブ目)
  - 薬の追加・停止・量変更・間隔変更・通知時刻変更を時系列で表示
  - プロファイル別 / お薬別フィルタ
  - 日別グループ表示 (時系列降順)
  - 「容量変更 (量変更)」 「間隔変更」 を `from → to` で可視化
- **毎月N日 / 毎週曜日 のスケジュール**
  - フォームに「N日おき / 毎月 / 毎週」 のセグメントトグル
  - 毎月: 1〜31 の日付チップ、 月末補正 (31 指定 → 2月は28/29日)
  - 毎週: 日月火水木金土を複数選択
  - 既存の「N日おき」 は `1, 2, 3, 4, 5, 6, 7, 14, 30` プリセットに拡張
- **プロファイルの写真アイコン** (`expo-image-picker`)
  - 写真ライブラリ / カメラ撮影で設定
  - `ProfileSwitcher` で写真があれば丸いアバター、 なければ絵文字を表示
- **新規 `med_events` テーブル**
  - `create / update / delete` 時に DB レイヤから自動でイベント記録

### 変更 (Changed)

- DB schema 拡張
  - `profiles` に `photo_uri` 列追加
  - `medications` に `schedule_type` / `monthly_day` / `weekly_days` 列追加
  - 起動時の `runMigrations` で既存DBにも `ALTER TABLE` 適用
- お薬カードのスケジュール表示を `describeSchedule` 関数に集約 (interval / monthly / weekly すべて対応)
- バージョンを `v1.0.0` → `v1.1.0` に

### 修正 (Fixed)

- フォント名 `MPlusRounded1c_*` → `MPLUSRounded1c_*` (`@expo-google-fonts/m-plus-rounded-1c` の命名規則変更に追従)
- `ScreenContainer` の `refreshControl` prop 型を `ReactElement<RefreshControlProps>` に

## v1.0.0 — 初版 (2026-06-27)

### 追加 (Added)

- 2 プロファイル切替 (🐶 ワンちゃん / 👩 奥さん)
- お薬の追加・編集・削除
  - 名前、 量、 間隔 (N日おき)、 開始日、 通知時刻 (1薬に複数指定可)、 色、 メモ
- ホーム画面 (今日 / 明日のチェックリスト)
- カレンダー画面 (月表示 + 色ドット、 日付タップで詳細)
- 設定画面 (プロファイル編集、 通知権限、 通知再登録)
- ローカル通知
  - 60 日先まで一括予約 (`expo-notifications` の `DateTrigger`)
  - 通知に「✓ あげた」 アクション、 タップで `dose_logs` に記録
- M PLUS Rounded 1c フォント、 クリーム / ピンク / ミントの可愛い配色
- 薬カプセルの可愛いアプリアイコン (gpt-image-2 で生成)
- SQLite ローカルデータベース (3 テーブル)
- スタンドアロン release APK (arm64-v8a + minify + shrink、 約 49MB)

### 技術スタック

| カテゴリ | 採用 |
|---|---|
| フレームワーク | Expo SDK 56 + React Native 0.85 + TypeScript |
| ルーティング | `expo-router` (ファイルベース) |
| ローカルDB | `expo-sqlite` |
| 通知 | `expo-notifications` |
| カレンダーUI | `react-native-calendars` |
| 状態管理 | `zustand` + `AsyncStorage` |
| 日付処理 | `date-fns` |
| フォント | `M PLUS Rounded 1c` (Google Fonts) |
| アイコン | `@expo/vector-icons` (Ionicons) |
