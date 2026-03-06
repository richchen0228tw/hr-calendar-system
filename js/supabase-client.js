// Supabase 初始化
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
});

// ── 類別設定 ──
export const CATEGORIES = [
    { id: '人事薪資', label: '人事薪資', color: '#f5c842', icon: '💰' },
    { id: '人才招募', label: '人才招募', color: '#3b82f6', icon: '🎯' },
    { id: '教育訓練', label: '教育訓練', color: '#60a5fa', icon: '📚' },
    { id: '績效管理', label: '績效管理', color: '#f472b6', icon: '📊' },
    { id: '其他專案', label: '其他專案', color: '#34d399', icon: '📋' },
];

// ── 狀態設定 ──
export const STATUSES = [
    { id: 'pending', label: '待辦', icon: '⏳' },
    { id: 'in_progress', label: '進行中', icon: '🔄' },
    { id: 'done', label: '已完成', icon: '✅' },
    { id: 'overdue', label: '已逾期', icon: '🔴' },
];

// ── 月份名稱 ──
export const MONTH_NAMES = [
    '', '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月',
];
