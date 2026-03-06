-- HR 行事曆管理系統 - Supabase Schema
-- 在 Supabase Dashboard > SQL Editor 中執行此檔案

-- 1. 任務主表
CREATE TABLE IF NOT EXISTS hr_tasks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  category         TEXT NOT NULL CHECK (category IN ('人事薪資', '人才招募', '教育訓練', '績效管理', '其他專案')),
  year             INT NOT NULL DEFAULT 2026,
  month            INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  event_date       DATE,
  deadline         DATE,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'in_progress', 'done', 'overdue')),
  priority         TEXT NOT NULL DEFAULT 'medium'
                     CHECK (priority IN ('high', 'medium', 'low')),
  notes            TEXT,
  is_recurring     BOOLEAN DEFAULT false,
  recurring_months INT[],
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- 2. 變更歷史表
CREATE TABLE IF NOT EXISTS task_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES hr_tasks(id) ON DELETE CASCADE,
  action     TEXT NOT NULL,   -- status_changed | field_edited | created | deleted
  field      TEXT,
  old_value  TEXT,
  new_value  TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 自動更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON hr_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Row Level Security
ALTER TABLE hr_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;

-- 登入用戶可讀所有任務
CREATE POLICY "tasks_select" ON hr_tasks
  FOR SELECT USING (auth.role() = 'authenticated');

-- 登入用戶可新增任務
CREATE POLICY "tasks_insert" ON hr_tasks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 登入用戶可更新任務
CREATE POLICY "tasks_update" ON hr_tasks
  FOR UPDATE USING (auth.role() = 'authenticated');

-- 只有建立者可刪除
CREATE POLICY "tasks_delete" ON hr_tasks
  FOR DELETE USING (auth.uid() = created_by);

-- 歷史紀錄可讀
CREATE POLICY "history_select" ON task_history
  FOR SELECT USING (auth.role() = 'authenticated');

-- 歷史紀錄可寫
CREATE POLICY "history_insert" ON task_history
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 5. Realtime 啟用
ALTER PUBLICATION supabase_realtime ADD TABLE hr_tasks;

-- 建立索引加速查詢
CREATE INDEX idx_hr_tasks_year_month ON hr_tasks(year, month);
CREATE INDEX idx_hr_tasks_category ON hr_tasks(category);
CREATE INDEX idx_hr_tasks_status ON hr_tasks(status);
CREATE INDEX idx_task_history_task_id ON task_history(task_id);
