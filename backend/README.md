# huanan-stp Backend

這是 `huanan-stp` 的後端伺服器範例，採用 Express + Socket.IO + Firebase Firestore。

## 快速啟動

1. 進入 `backend` 目錄
2. 安裝依賴：`npm install`
3. 將 Firebase 服務帳號金鑰放入 `backend/serviceAccountKey.json`，或使用 `GOOGLE_APPLICATION_CREDENTIALS` 環境變數
4. 啟動伺服器：`npm run dev`

## 主要 API

- `POST /login` — 使用者登入
- `GET /users` — 取得使用者清單
- `GET /users/:userId` — 取得使用者詳細
- `GET /orders` — 取得下單列表
- `POST /orders/create` — 新增下單
- `GET /ranking` — 取得排行榜
- `GET /portfolio/:userId` — 取得使用者持倉
- `POST /balance/update` — 模擬資金更新
- `GET /chat` — 取得聊天室訊息
- `POST /chat` — 發送聊天室訊息
- `GET /market/twstock` — 取得 TW stock 行情
- `POST /ai/analyze` — AI 分析建議

## 即時同步

Socket.IO 事件：

- `order.created`
- `ranking.updated`
- `chat.message`

## 資料庫初始化

1. 先在 `backend` 中安裝依賴：`npm install`
2. 配置 Firebase 服務帳號金鑰或環境變數
3. 執行種子資料：`npm run seed`
