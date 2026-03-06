/**
 * hr-app.js — 全域共用函式庫（UMD 相容，支援 file:// 協議）
 * 會被各頁面以 <script src="js/hr-app.js"> 方式載入
 */

// ── 設定（只需改這裡）──
window.APP_CONFIG = {
    SUPABASE_URL: 'https://ntfngxvgguokercllzza.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50Zm5neHZnZ3Vva2VyY2xsenphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2OTk5MTQsImV4cCI6MjA4ODI3NTkxNH0.wAXYy_g7mmoIsofbwI8T-Fhl2KiKr-bGm-MxzHuEC7Q',
};

// ── 類別設定（動態從 DB 載入，以下為 fallback）──
window.CATEGORIES = [
    { id: '人事薪資', label: '人事薪資', color: '#f5c842', icon: '💰' },
    { id: '人才招募', label: '人才招募', color: '#3b82f6', icon: '🎯' },
    { id: '教育訓練', label: '教育訓練', color: '#60a5fa', icon: '📚' },
    { id: '績效管理', label: '績效管理', color: '#f472b6', icon: '📊' },
    { id: '其他專案', label: '其他專案', color: '#34d399', icon: '📋' },
];

// 預設顏色選盤
const PRESET_COLORS = [
    '#f5c842', '#f59e0b', '#ef4444', '#ec4899',
    '#a855f7', '#6366f1', '#3b82f6', '#06b6d4',
    '#10b981', '#22c55e', '#84cc16', '#94a3b8',
];

// ── 載入類別（從 DB）──
async function loadCategories() {
    try {
        const { data, error } = await window.__sb
            .from('categories')
            .select('*')
            .order('sort_order', { ascending: true });
        if (error) throw error;
        if (data && data.length) {
            window.CATEGORIES = data.map(c => ({
                id: c.name, label: c.name, color: c.color, icon: c.icon, dbId: c.id,
            }));
        }
    } catch (e) {
        // categories 資料表尚未建立，使用預設值
        console.warn('[HR] categories 資料表不存在，使用預設類別。請執行 migration_categories.sql');
    }
}

// ── 類別 CRUD ──
async function createCategory(name, color, icon, userId) {
    const { data, error } = await window.__sb.from('categories')
        .insert([{ name: name.trim(), color, icon, created_by: userId }])
        .select().single();
    if (error) throw error;
    await loadCategories();
    showToast(`類別「${name}」已新增`, 'success');
    return data;
}

async function deleteCategory(dbId, name) {
    const { count, error: cntErr } = await window.__sb.from('hr_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('category', name);
    if (!cntErr && count > 0) throw new Error(`此類別下還有 ${count} 筆任務，請先將它們移至其他類別`);
    const { error } = await window.__sb.from('categories').delete().eq('id', dbId);
    if (error) throw error;
    await loadCategories();
    showToast(`類別「${name}」已刪除`, 'success');
}

async function updateCategory(dbId, name, color, icon) {
    const { error } = await window.__sb.from('categories')
        .update({ name: name.trim(), color, icon })
        .eq('id', dbId);
    if (error) throw error;
    await loadCategories();
    showToast(`類別「${name}」已更新`, 'success');
}

// ── 類別顏色輔助（自訂類別也適用）──
function getCatStyle(categoryName) {
    const cat = CATEGORIES.find(c => c.id === categoryName);
    if (!cat) return '';
    // 轉為 RGB 計算半透明背景
    const hex = cat.color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `background:rgba(${r},${g},${b},.15);color:${cat.color};border:1px solid rgba(${r},${g},${b},.4);`;
}

window.STATUSES = [
    { id: 'pending', label: '待辦', icon: '⏳' },
    { id: 'in_progress', label: '進行中', icon: '🔄' },
    { id: 'done', label: '已完成', icon: '✅' },
    { id: 'overdue', label: '已逾期', icon: '🔴' },
];

// ── Supabase 初始化 ──
function initSB() {
    if (window.__sb) return window.__sb;
    window.__sb = supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON_KEY);
    return window.__sb;
}

// ── 認證守衛 ──
async function requireAuth() {
    const sb = initSB();
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return null;
    }
    return session.user;
}

// ── 渲染用戶資訊 ──
function renderUserInfo(user) {
    const displayName = user.user_metadata?.name || user.email?.split('@')[0] || 'HR';
    const el = id => document.getElementById(id);
    if (el('user-name')) el('user-name').textContent = displayName;
    if (el('user-email')) el('user-email').textContent = user.email;
    if (el('user-avatar')) el('user-avatar').textContent = displayName.slice(0, 2).toUpperCase();

    const logoutBtn = el('btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await window.__sb.auth.signOut();
            window.location.href = 'login.html';
        });
    }
    return displayName;
}

// ── Toast ──
let _toastContainer;
function showToast(message, type = 'info', duration = 3000) {
    if (!_toastContainer) {
        _toastContainer = document.createElement('div');
        _toastContainer.className = 'toast-container';
        document.body.appendChild(_toastContainer);
    }
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] ?? 'ℹ️'}</span><span>${escHtml(message)}</span>`;
    _toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('removing');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, duration);
}

// ── Modal ──
function openModal(html) {
    document.getElementById('modal-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-overlay';
    overlay.innerHTML = `<div class="modal" role="dialog">${html}</div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    overlay.querySelectorAll('[data-close-modal]').forEach(el => el.addEventListener('click', closeModal));
    return overlay;
}

function closeModal() {
    document.getElementById('modal-overlay')?.remove();
    document.body.style.overflow = '';
}

function confirmDialog(message, onConfirm) {
    const html = `
    <div class="modal-header">
      <h2 class="modal-title">確認操作</h2>
      <button class="modal-close" data-close-modal>✕</button>
    </div>
    <div class="modal-body"><p style="color:var(--text-secondary);font-size:14px;">${escHtml(message)}</p></div>
    <div class="modal-footer">
      <button class="btn btn-secondary" data-close-modal>取消</button>
      <button class="btn btn-danger" id="confirm-ok">確認刪除</button>
    </div>`;
    const overlay = openModal(html);
    overlay.querySelector('#confirm-ok').addEventListener('click', () => { closeModal(); onConfirm?.(); });
}

// ── 格式化日期 ──
function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

// ── 相對時間 ──
function relativeTime(tsStr) {
    if (!tsStr) return '';
    const diff = Date.now() - new Date(tsStr).getTime();
    const m = 60000, h = 3600000, d = 86400000;
    if (diff < m) return '剛剛';
    if (diff < h) return `${Math.floor(diff / m)} 分鐘前`;
    if (diff < d) return `${Math.floor(diff / h)} 小時前`;
    return `${Math.floor(diff / d)} 天前`;
}

// ── 防抖 ──
function debounce(fn, delay = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

// ── HTML 轉義 ──
function escHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── 逾期判斷 ──
function isOverdue(task) {
    if (task.status === 'done') return false;
    const date = task.deadline || task.event_date;
    if (!date) return false;
    return new Date(date) < new Date(new Date().toDateString());
}

// ── CRUD ──
async function fetchTasks({ year, month, category, status, search } = {}) {
    const sb = window.__sb;
    let q = sb.from('hr_tasks').select('*').order('event_date', { ascending: true, nullsFirst: false });
    if (year) q = q.eq('year', year);
    if (month) q = q.eq('month', month);
    if (category) q = q.eq('category', category);
    if (status) q = q.eq('status', status);
    if (search) q = q.ilike('title', `%${search}%`);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
}

// ── 月曆專用查詢（含跨月任務）──
async function fetchCalendarTasks(year, month, category) {
    const p = n => String(n).padStart(2, '0');
    const firstDay = `${year}-${p(month)}-01`;
    const lastDay = `${year}-${p(month)}-${new Date(year, month, 0).getDate()}`;

    let q = window.__sb.from('hr_tasks').select('*')
        .or(
            `and(year.eq.${year},month.eq.${month}),` +
            `and(event_date.lte.${lastDay},deadline.gte.${firstDay})`
        )
        .order('event_date', { ascending: true, nullsFirst: false });

    if (category) q = q.eq('category', category);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
}

async function fetchTask(id) {
    const { data, error } = await window.__sb.from('hr_tasks').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
}

async function createTask(payload, userId) {
    const { data, error } = await window.__sb.from('hr_tasks')
        .insert([{ ...payload, created_by: userId, updated_by: userId, status: payload.status ?? 'pending' }])
        .select().single();
    if (error) throw error;
    await addHistory(data.id, 'created', null, null, null, userId);
    showToast('任務已新增', 'success');
    return data;
}

async function updateTask(id, updates, userId) {
    const old = await fetchTask(id);
    const { data, error } = await window.__sb.from('hr_tasks')
        .update({ ...updates, updated_by: userId })
        .eq('id', id).select().single();
    if (error) throw error;
    for (const [field, newVal] of Object.entries(updates)) {
        if (field === 'updated_by') continue;
        if (String(old[field] ?? '') !== String(newVal ?? '')) {
            await addHistory(id, 'field_edited', field, String(old[field] ?? ''), String(newVal ?? ''), userId);
        }
    }
    showToast('任務已更新', 'success');
    return data;
}

async function updateStatus(id, newStatus, userId) {
    const old = await fetchTask(id);
    const { data, error } = await window.__sb.from('hr_tasks')
        .update({ status: newStatus, updated_by: userId }).eq('id', id).select().single();
    if (error) throw error;
    await addHistory(id, 'status_changed', 'status', old.status, newStatus, userId);
    return data;
}

async function deleteTask(id) {
    const { error } = await window.__sb.from('hr_tasks').delete().eq('id', id);
    if (error) throw error;
    showToast('任務已刪除', 'success');
}

async function addHistory(taskId, action, field, oldValue, newValue, userId) {
    await window.__sb.from('task_history').insert([{
        task_id: taskId, action, field,
        old_value: oldValue, new_value: newValue, changed_by: userId,
    }]);
}

async function fetchHistory(taskId) {
    const { data, error } = await window.__sb.from('task_history')
        .select('*').eq('task_id', taskId).order('changed_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
}

async function fetchStats(year, month) {
    const tasks = await fetchTasks({ year, month });
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const overdue = tasks.filter(t => isOverdue(t)).length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const byCategory = {};
    for (const t of tasks) byCategory[t.category] = (byCategory[t.category] ?? 0) + 1;
    return { total, done, overdue, inProgress, pending: total - done - inProgress - overdue, byCategory };
}

// ── 類別管理 Modal ──
function openCategoryModal(user, onChanged) {
    const renderList = () => CATEGORIES.map(c => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)" data-cat-row>
            <div style="width:28px;height:28px;border-radius:6px;background:${escHtml(c.color)};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${c.icon}</div>
            <div style="flex:1;font-size:14px;font-weight:500">${escHtml(c.label)}</div>
            ${c.dbId
            ? `<button class="btn btn-ghost btn-sm btn-edit-cat" data-db-id="${c.dbId}" data-name="${escHtml(c.label)}" data-color="${escHtml(c.color)}" data-icon="${escHtml(c.icon)}" title="編輯">✏️</button>
                   <button class="btn btn-ghost btn-sm btn-del-cat"  data-db-id="${c.dbId}" data-name="${escHtml(c.label)}" title="刪除">🗑</button>`
            : '<span style="font-size:10px;color:var(--text-muted)">預設</span>'}
        </div>`).join('');

    const colorSwatches = PRESET_COLORS.map(clr =>
        `<div class="color-swatch" data-color="${clr}" style="width:22px;height:22px;border-radius:50%;background:${clr};cursor:pointer;border:2px solid transparent;transition:border .15s" title="${clr}"></div>`
    ).join('');

    const EMOJI_LIST = [
        '💰', '🎯', '📚', '📊', '📋', '🏢', '👥', '📅', '🗓️', '📌',
        '🔔', '📝', '✅', '🔍', '💡', '🎓', '🏆', '⚙️', '🔧', '📣',
        '🤝', '💼', '📈', '📉', '🗂️', '📂', '📦', '🔐', '💳', '🏗️',
        '🌟', '🎪', '🚀', '💬', '📡', '🏥', '🛡️', '⚖️', '🎨', '🔑',
    ];

    const emojiGrid = EMOJI_LIST.map(e =>
        `<button type="button" class="emoji-btn" data-emoji="${e}" style="
            width:34px;height:34px;border:2px solid transparent;border-radius:8px;
            background:none;cursor:pointer;font-size:20px;line-height:1;
            transition:border .12s,background .12s;
        " title="${e}">${e}</button>`
    ).join('');

    const html = `
    <div class="modal-header">
      <h2 class="modal-title">⚙️ 管理業務類別</h2>
      <button class="modal-close" data-close-modal>✕</button>
    </div>
    <div class="modal-body">
      <div id="cat-list" style="max-height:200px;overflow-y:auto;margin-bottom:20px">${renderList()}</div>
      <div style="border-top:1px solid var(--border);padding-top:16px">
        <div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:10px">新增類別</div>

        <!-- 名稱 -->
        <input id="new-cat-name" class="form-control" placeholder="類別名稱" style="margin-bottom:10px">

        <!-- 圖示選盤 -->
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">選擇圖示</div>
        <div id="emoji-picker" style="display:flex;flex-wrap:wrap;gap:2px;margin-bottom:8px;max-height:110px;overflow-y:auto;background:var(--surface-hover);border-radius:8px;padding:6px;">
          ${emojiGrid}
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <div id="icon-preview" style="width:38px;height:38px;border-radius:8px;background:var(--surface);border:2px solid var(--primary);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">📌</div>
          <input id="new-cat-icon-custom" class="form-control" placeholder="或輸入自訂 emoji" style="flex:1;font-size:18px" maxlength="8">
        </div>

        <!-- 顏色 -->
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">選擇顏色</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px" id="color-swatches">${colorSwatches}</div>
        <input type="hidden" id="new-cat-color" value="${PRESET_COLORS[0]}">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
          <label style="font-size:12px;color:var(--text-muted);white-space:nowrap">或自訂顏色</label>
          <input type="color" id="color-custom" value="${PRESET_COLORS[0]}"
            style="width:36px;height:36px;padding:2px;border:2px solid var(--border);border-radius:8px;cursor:pointer;background:none">
          <div id="color-preview" style="width:36px;height:36px;border-radius:8px;background:${PRESET_COLORS[0]};border:2px solid transparent"></div>
        </div>

        <button class="btn btn-primary" id="btn-add-cat" style="width:100%">➕ 新增類別</button>
      </div>
    </div>`;

    const overlay = openModal(html);

    // ── Emoji 選盤 ──
    let selIcon = '📌';
    const iconPreview = overlay.querySelector('#icon-preview');
    const customInput = overlay.querySelector('#new-cat-icon-custom');

    function setIcon(emoji) {
        selIcon = emoji;
        iconPreview.textContent = emoji;
        // 高亮選中
        overlay.querySelectorAll('.emoji-btn').forEach(b => {
            const isSelected = b.dataset.emoji === emoji;
            b.style.border = isSelected ? '2px solid var(--primary)' : '2px solid transparent';
            b.style.background = isSelected ? 'var(--primary-light, #eef2ff)' : 'none';
        });
    }

    // 預選第一個
    setIcon('📌');

    overlay.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setIcon(btn.dataset.emoji);
            customInput.value = '';
        });
    });

    // 自訂輸入即時預覽
    customInput.addEventListener('input', () => {
        const v = customInput.value.trim();
        if (v) { selIcon = v; iconPreview.textContent = v; }
    });

    // ── 顏色選擇 ──
    let selColor = PRESET_COLORS[0];

    function setColor(color) {
        selColor = color;
        overlay.querySelector('#new-cat-color').value = color;
        overlay.querySelector('#color-preview').style.background = color;
        overlay.querySelector('#color-custom').value = color;
        overlay.querySelectorAll('.color-swatch').forEach(s =>
            s.style.border = s.dataset.color === color ? '2px solid var(--primary)' : '2px solid transparent'
        );
    }

    overlay.querySelectorAll('.color-swatch').forEach(sw => {
        sw.addEventListener('click', () => setColor(sw.dataset.color));
    });

    // 原生色盤輸入
    overlay.querySelector('#color-custom').addEventListener('input', e => setColor(e.target.value));

    // 預選第一個
    setColor(PRESET_COLORS[0]);

    // 删除—event delegation
    overlay.querySelector('#cat-list').addEventListener('click', async e => {
        // 删除
        const delBtn = e.target.closest('.btn-del-cat');
        if (delBtn) {
            const { dbId, name } = delBtn.dataset;
            confirmDialog(
                `確定要刪除類別「${escHtml(name)}」嗎？\n（必須為空類別才可刪除）`,
                async () => {
                    try {
                        await deleteCategory(dbId, name);
                        overlay.querySelector('#cat-list').innerHTML = renderList();
                        onChanged?.();
                    } catch (err) { showToast(err.message, 'error'); }
                }
            );
            return;
        }

        // 編輯—inline form
        const editBtn = e.target.closest('.btn-edit-cat');
        if (!editBtn) return;

        const row = editBtn.closest('[data-cat-row]');
        const { dbId, name, color, icon } = editBtn.dataset;

        row.innerHTML = `
          <div style="width:100%;padding:4px 0">
            <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center">
              <input class="form-control edit-icon" value="${escHtml(icon)}" style="width:52px;text-align:center;font-size:20px" maxlength="8" title="圖示">
              <input class="form-control edit-name" value="${escHtml(name)}" style="flex:1" placeholder="類別名稱">
              <input type="color" class="edit-color" value="${escHtml(color)}"
                style="width:38px;height:38px;padding:2px;border:2px solid var(--border);border-radius:8px;cursor:pointer">
              <div class="edit-color-preview" style="width:32px;height:32px;border-radius:6px;background:${escHtml(color)};flex-shrink:0"></div>
            </div>
            <div style="display:flex;gap:6px">
              <button class="btn btn-primary btn-sm btn-save-edit" data-db-id="${dbId}" data-orig-name="${escHtml(name)}">✅ 儲存</button>
              <button class="btn btn-ghost btn-sm btn-cancel-edit">取消</button>
            </div>
          </div>`;

        // 顏色預覽同步
        row.querySelector('.edit-color').addEventListener('input', ev => {
            row.querySelector('.edit-color-preview').style.background = ev.target.value;
        });

        // 儲存
        row.querySelector('.btn-save-edit').addEventListener('click', async () => {
            const newName = row.querySelector('.edit-name').value.trim();
            const newIcon = row.querySelector('.edit-icon').value.trim() || icon;
            const newColor = row.querySelector('.edit-color').value;
            if (!newName) { showToast('請輸入類別名稱', 'error'); return; }
            const conflict = CATEGORIES.find(c => c.label === newName && c.dbId !== dbId);
            if (conflict) { showToast('此名稱已存在', 'error'); return; }
            try {
                await updateCategory(dbId, newName, newColor, newIcon);
                overlay.querySelector('#cat-list').innerHTML = renderList();
                onChanged?.();
            } catch (err) { showToast('更新失敗：' + err.message, 'error'); }
        });

        // 取消
        row.querySelector('.btn-cancel-edit').addEventListener('click', () => {
            overlay.querySelector('#cat-list').innerHTML = renderList();
        });
    });

    // 新增
    overlay.querySelector('#btn-add-cat').addEventListener('click', async () => {
        const name = overlay.querySelector('#new-cat-name').value.trim();
        const icon = selIcon || '📌';
        const color = selColor || PRESET_COLORS[0];
        if (!name) { showToast('請輸入類別名稱', 'error'); return; }
        if (CATEGORIES.find(c => c.label === name)) { showToast('此類別名稱已存在', 'error'); return; }
        try {
            await createCategory(name, color, icon, user.id);
            overlay.querySelector('#new-cat-name').value = '';
            overlay.querySelector('#cat-list').innerHTML = renderList();
            onChanged?.();
        } catch (e) { showToast('新增失敗：' + e.message, 'error'); }
    });
}

// ── 開啟任務 Modal ──
function openTaskModal(task = {}, user, onSaved) {
    const isEdit = !!task.id;
    const buildCatOptions = () => CATEGORIES.map(c =>
        `<option value="${c.id}" ${(task.category ?? CATEGORIES[0]?.id) === c.id ? 'selected' : ''}>${c.icon} ${c.label}</option>`
    ).join('');
    const statusOptions = STATUSES.map(s =>
        `<option value="${s.id}" ${(task.status ?? 'pending') === s.id ? 'selected' : ''}>${s.icon} ${s.label}</option>`
    ).join('');
    const monthOptions = Array.from({ length: 12 }, (_, i) =>
        `<option value="${i + 1}" ${(task.month ?? new Date().getMonth() + 1) === i + 1 ? 'selected' : ''}>${i + 1} 月</option>`
    ).join('');

    const html = `
    <div class="modal-header">
      <h2 class="modal-title">${isEdit ? '編輯任務' : '新增任務'}</h2>
      <button class="modal-close" data-close-modal>✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">任務名稱 <span style="color:var(--status-overdue)">*</span></label>
        <input id="f-title" class="form-control" placeholder="任務名稱" value="${escHtml(task.title ?? '')}">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label class="form-label" style="display:flex;justify-content:space-between;align-items:center">
            業務類別
            <button type="button" id="btn-open-cat-manage" class="btn btn-ghost btn-sm" style="font-size:11px;padding:2px 6px">⚙️ 管理</button>
          </label>
          <select id="f-category" class="form-control">${buildCatOptions()}</select>
        </div>
        <div class="form-group">
          <label class="form-label">狀態</label>
          <select id="f-status" class="form-control">${statusOptions}</select>
        </div>
        <div class="form-group">
          <label class="form-label">年份</label>
          <input id="f-year" class="form-control" type="number" min="2025" max="2030" value="${task.year ?? 2026}">
        </div>
        <div class="form-group">
          <label class="form-label">月份</label>
          <select id="f-month" class="form-control">${monthOptions}</select>
        </div>
        <div class="form-group">
          <label class="form-label">具體日期（可選）</label>
          <input id="f-event-date" class="form-control" type="date" value="${task.event_date ?? ''}">
        </div>
        <div class="form-group">
          <label class="form-label">截止日（可選）</label>
          <input id="f-deadline" class="form-control" type="date" value="${task.deadline ?? ''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">備註</label>
        <textarea id="f-notes" class="form-control" rows="3">${escHtml(task.notes ?? '')}</textarea>
      </div>
      <div class="form-group" style="display:flex;align-items:center;gap:8px">
        <input id="f-recurring" type="checkbox" ${task.is_recurring ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer">
        <label for="f-recurring" class="form-label" style="margin:0;cursor:pointer">每月例行任務</label>
      </div>
      ${isEdit ? `
        <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:14px">
          <div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:8px">📋 變更歷史</div>
          <div id="modal-history" style="font-size:12px;color:var(--text-muted)">載入中...</div>
        </div>` : ''}
    </div>
    <div class="modal-footer" style="justify-content:space-between">
      ${isEdit ? `<button class="btn btn-danger btn-sm" id="btn-delete-task">🗑 刪除</button>` : `<div></div>`}
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" data-close-modal>取消</button>
        <button class="btn btn-primary" id="btn-save-task">${isEdit ? '💾 儲存' : '➕ 新增'}</button>
      </div>
    </div>`;

    const overlay = openModal(html);

    // 類別管理按鈕
    overlay.querySelector('#btn-open-cat-manage')?.addEventListener('click', () => {
        openCategoryModal(user, () => {
            // 類別更新後，重建選單
            overlay.querySelector('#f-category').innerHTML = buildCatOptions();
        });
    });

    overlay.querySelector('#btn-save-task').addEventListener('click', async () => {
        const title = overlay.querySelector('#f-title').value.trim();
        if (!title) { showToast('請填寫任務名稱', 'error'); return; }
        const payload = {
            title,
            category: overlay.querySelector('#f-category').value,
            status: overlay.querySelector('#f-status').value,
            year: parseInt(overlay.querySelector('#f-year').value),
            month: parseInt(overlay.querySelector('#f-month').value),
            event_date: overlay.querySelector('#f-event-date').value || null,
            deadline: overlay.querySelector('#f-deadline').value || null,
            notes: overlay.querySelector('#f-notes').value.trim() || null,
            is_recurring: overlay.querySelector('#f-recurring').checked,
        };
        try {
            if (isEdit) await updateTask(task.id, payload, user.id);
            else await createTask(payload, user.id);
            closeModal();
            onSaved?.();
        } catch (e) { showToast('操作失敗：' + e.message, 'error'); }
    });

    overlay.querySelector('#btn-delete-task')?.addEventListener('click', () => {
        confirmDialog('確定要刪除這項任務嗎？', async () => { await deleteTask(task.id); onSaved?.(); });
    });

    if (isEdit) {
        fetchHistory(task.id).then(history => {
            const container = overlay.querySelector('#modal-history');
            if (!container) return;
            if (!history.length) { container.textContent = '尚無變更紀錄'; return; }
            const al = { created: '建立', status_changed: '狀態更新', field_edited: '欄位編輯' };
            const fl = { title: '名稱', category: '類別', status: '狀態', notes: '備註', event_date: '日期', deadline: '截止日' };
            container.innerHTML = `<div class="history-list">${history.map(h => `
        <div class="history-item">
          <div class="history-dot"></div>
          <div class="history-content">
            <div class="history-action">${al[h.action] ?? h.action}${h.field ? ` — <b>${fl[h.field] ?? h.field}</b>` : ''}${h.old_value && h.new_value ? `：「${escHtml(h.old_value)}」→「${escHtml(h.new_value)}」` : ''}</div>
            <div class="history-meta">${relativeTime(h.changed_at)}</div>
          </div>
        </div>`).join('')}</div>`;
        }).catch(() => { });
    }
}

// 把所有函式暴露到全域
Object.assign(window, {
    initSB, requireAuth, renderUserInfo,
    showToast, openModal, closeModal, confirmDialog,
    formatDate, relativeTime, debounce, escHtml, isOverdue,
    fetchTasks, fetchTask, createTask, updateTask,
    updateStatus, deleteTask, fetchHistory, fetchStats,
    loadCategories, createCategory, updateCategory, deleteCategory, getCatStyle,
    fetchCalendarTasks,
    openTaskModal, openCategoryModal,
});
