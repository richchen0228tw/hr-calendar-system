# HR 行事曆管理系統

> 人力資源處 2026 年度行事曆 — 結構化、可追蹤、多人協作

**技術棧**：HTML + Vanilla JS + Supabase（PostgreSQL） + Netlify

---

## 快速啟動

### 1. 建立 Supabase 專案

1. 前往 [supabase.com](https://supabase.com) → 建立免費帳號
2. 新建專案（取任意名稱）
3. 等待專案初始化（約 30 秒）

### 2. 執行 SQL Schema

1. Supabase Dashboard → **SQL Editor**
2. 貼上 `supabase/schema.sql` 內容並執行
3. 確認左側 **Table Editor** 出現 `hr_tasks`、`task_history` 兩張表

### 3. 填入設定

編輯 `js/config.js`：

```js
// Supabase Dashboard > Settings > API
export const SUPABASE_URL = 'https://xxxx.supabase.co';  // ← 替換
export const SUPABASE_ANON_KEY = 'eyJ...';               // ← 替換
```

### 4. 建立第一個帳號

Supabase Dashboard → **Authentication → Users → Invite user**（輸入 Email）

### 5. 本地測試

直接用瀏覽器開啟 `login.html`，**或**用任意 HTTP Server：

```bash
# Python 3
python -m http.server 8080

# Node.js
npx serve .
```

### 6. 匯入初始資料

登入後，在瀏覽器 **Console（F12）** 執行：

```js
const { seedData } = await import('./js/seed.js');
await seedData();
```

完成後頁面刷新即可看到所有 2026 年任務。

### 7. 部署到 Netlify（免費）

```bash
# 推送到 GitHub
git init && git add . && git commit -m "init"
git remote add origin https://github.com/<你的帳號>/<repo>.git
git push -u origin main
```

登入 [netlify.com](https://netlify.com) → Import from GitHub → 選擇此 repo → **Deploy**

---

## 頁面說明

| 頁面 | 說明 |
|---|---|
| `login.html` | 登入頁 |
| `index.html` | 月曆主頁（預設） |
| `dashboard.html` | 儀表板（統計圖表） |
| `tasks.html` | 任務列表（篩選/搜尋） |

---

## 檔案結構

```
HR-calendar-system/
├── login.html
├── index.html          ← 月曆
├── dashboard.html      ← 儀表板
├── tasks.html          ← 任務列表
├── netlify.toml
├── css/
│   ├── main.css        ← 設計系統
│   └── calendar.css    ← 月曆樣式
├── js/
│   ├── config.js       ← ⚠️ 填入 Supabase 設定
│   ├── supabase-client.js
│   ├── auth.js
│   ├── ui.js
│   ├── tasks.js        ← CRUD + Realtime
│   ├── calendar.js     ← 月曆渲染
│   ├── task-modal.js   ← 新增/編輯 Modal
│   ├── dashboard.js    ← 圖表
│   └── seed.js         ← 初始資料（只用一次）
└── supabase/
    └── schema.sql      ← DB Schema + RLS
```

---

## 備註

- 春節連假：2026/2/14(六) - 2/22(五)
- 備配合 ISO 9001、CMMI、ISMS 內外稽作業
