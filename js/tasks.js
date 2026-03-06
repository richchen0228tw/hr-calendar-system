// 任務 CRUD 模組
import { sb } from './supabase-client.js';
import { showToast } from './ui.js';

// ── 查詢任務 ──
export async function fetchTasks({ year, month, category, status, search } = {}) {
    let query = sb.from('hr_tasks').select('*').order('event_date', { ascending: true, nullsFirst: false });

    if (year) query = query.eq('year', year);
    if (month) query = query.eq('month', month);
    if (category) query = query.eq('category', category);
    if (status) query = query.eq('status', status);
    if (search) query = query.ilike('title', `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
}

// ── 取得單一任務 ──
export async function fetchTask(id) {
    const { data, error } = await sb.from('hr_tasks').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
}

// ── 新增任務 ──
export async function createTask(payload, userId) {
    const taskData = {
        ...payload,
        created_by: userId,
        updated_by: userId,
        status: payload.status ?? 'pending',
    };

    const { data, error } = await sb.from('hr_tasks').insert([taskData]).select().single();
    if (error) throw error;

    // 寫入歷史
    await addHistory(data.id, 'created', null, null, null, userId);

    showToast('任務已新增', 'success');
    return data;
}

// ── 更新任務 ──
export async function updateTask(id, updates, userId) {
    // 先抓舊值以便記歷史
    const old = await fetchTask(id);

    const { data, error } = await sb
        .from('hr_tasks')
        .update({ ...updates, updated_by: userId })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;

    // 記錄變更的每個欄位
    for (const [field, newVal] of Object.entries(updates)) {
        if (field === 'updated_by') continue;
        const oldVal = old[field];
        if (String(oldVal) !== String(newVal)) {
            await addHistory(id, 'field_edited', field, String(oldVal ?? ''), String(newVal ?? ''), userId);
        }
    }

    showToast('任務已更新', 'success');
    return data;
}

// ── 快速更新狀態 ──
export async function updateStatus(id, newStatus, userId) {
    const old = await fetchTask(id);
    const { data, error } = await sb
        .from('hr_tasks')
        .update({ status: newStatus, updated_by: userId })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;

    await addHistory(id, 'status_changed', 'status', old.status, newStatus, userId);
    return data;
}

// ── 刪除任務 ──
export async function deleteTask(id) {
    const { error } = await sb.from('hr_tasks').delete().eq('id', id);
    if (error) throw error;
    showToast('任務已刪除', 'success');
}

// ── 寫入變更歷史 ──
async function addHistory(taskId, action, field, oldValue, newValue, userId) {
    await sb.from('task_history').insert([{
        task_id: taskId,
        action,
        field,
        old_value: oldValue,
        new_value: newValue,
        changed_by: userId,
    }]);
}

// ── 取得任務歷史 ──
export async function fetchHistory(taskId) {
    const { data, error } = await sb
        .from('task_history')
        .select('*')
        .eq('task_id', taskId)
        .order('changed_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
}

// ── Realtime 監聽 ──
export function subscribeToTasks(onInsert, onUpdate, onDelete) {
    return sb
        .channel('hr_tasks_channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hr_tasks' }, payload => onInsert?.(payload.new))
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'hr_tasks' }, payload => onUpdate?.(payload.new))
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'hr_tasks' }, payload => onDelete?.(payload.old))
        .subscribe();
}

// ── 逾期任務自動標記（本地計算，不依賴 DB trigger）──
export function isOverdue(task) {
    if (task.status === 'done') return false;
    const deadline = task.deadline || (task.event_date) || null;
    if (!deadline) return false;
    return new Date(deadline) < new Date(new Date().toDateString());
}

// ── 統計摘要 ──
export async function fetchStats(year, month) {
    const tasks = await fetchTasks({ year, month });
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const overdue = tasks.filter(t => isOverdue(t)).length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;

    const byCategory = {};
    for (const t of tasks) {
        byCategory[t.category] = (byCategory[t.category] ?? 0) + 1;
    }

    return { total, done, overdue, inProgress, pending: total - done - inProgress - overdue, byCategory };
}
