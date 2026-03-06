-- HR 行事曆 - 類別管理功能 Migration
-- 在 Supabase Dashboard > SQL Editor 執行

-- 1. 移除 hr_tasks 的 category CHECK 約束（讓自訂類別可以存入）
ALTER TABLE hr_tasks DROP CONSTRAINT IF EXISTS hr_tasks_category_check;

-- 2. 建立 categories 資料表
CREATE TABLE IF NOT EXISTS categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  color      TEXT NOT NULL DEFAULT '#94a3b8',
  icon       TEXT NOT NULL DEFAULT '📋',
  sort_order INT NOT NULL DEFAULT 99,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select" ON categories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "categories_insert" ON categories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "categories_update" ON categories
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 建立者才能刪除自己新增的類別
CREATE POLICY "categories_delete" ON categories
  FOR DELETE USING (auth.uid() = created_by OR created_by IS NULL);

-- 4. 匯入預設類別（若已存在則忽略）
INSERT INTO categories (name, color, icon, sort_order)
VALUES
  ('人事薪資', '#f5c842', '💰', 1),
  ('人才招募', '#3b82f6', '🎯', 2),
  ('教育訓練', '#60a5fa', '📚', 3),
  ('績效管理', '#f472b6', '📊', 4),
  ('其他專案', '#34d399', '📋', 5)
ON CONFLICT (name) DO NOTHING;
