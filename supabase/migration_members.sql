-- HR 行事曆 - 成員管理 Migration
-- 在 Supabase Dashboard > SQL Editor 執行

-- 1. 在 hr_tasks 加負責人欄位
ALTER TABLE hr_tasks
  ADD COLUMN IF NOT EXISTS assignee_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assignee_name TEXT;

-- 2. 建立 members 資料表
CREATE TABLE IF NOT EXISTS members (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  avatar_url  TEXT,
  department  TEXT,
  role        TEXT NOT NULL DEFAULT 'member',   -- 'admin' | 'member'
  is_active   BOOLEAN NOT NULL DEFAULT true,
  joined_at   TIMESTAMPTZ DEFAULT now()
);

-- 3. Row Level Security
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- 所有已登入用戶可查看成員清單
CREATE POLICY "members_select" ON members
  FOR SELECT USING (auth.role() = 'authenticated');

-- 允許用戶新增自己（Google 首次登入自動加入）
CREATE POLICY "members_insert" ON members
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 允許已登入用戶更新（管理員用途）
CREATE POLICY "members_update" ON members
  FOR UPDATE USING (auth.role() = 'authenticated');
