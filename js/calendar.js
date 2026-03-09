// 月曆渲染模組
import { fetchTasks, updateStatus, isOverdue } from './tasks.js';
import { MONTH_NAMES } from './supabase-client.js';
import { formatDate, showToast } from './ui.js';
import { openTaskModal } from './task-modal.js';

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
let allTasks = [];
let currentUser = null;

// ── 初始化月曆 ──
export async function initCalendar(user) {
    currentUser = user;
    await renderCalendar();
    bindNavButtons();
}

// ── 渲染整個月曆 ──
export async function renderCalendar() {
    updateMonthLabel();
    document.getElementById('cal-grid')?.classList.add('loading');

    try {
        allTasks = await fetchTasks({ year: currentYear, month: currentMonth });
        buildGrid();
    } catch (e) {
        showToast('載入任務失敗：' + e.message, 'error');
    } finally {
        document.getElementById('cal-grid')?.classList.remove('loading');
    }
}

// ── 更新月份標籤 ──
function updateMonthLabel() {
    const el = document.getElementById('month-label');
    if (el) el.textContent = `${currentYear} 年 ${MONTH_NAMES[currentMonth]}`;
}

// ── 建構月曆格線 ──
function buildGrid() {
    const grid = document.getElementById('cal-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // 建立 task by date map
    const taskMap = {};
    for (const task of allTasks) {
        const key = task.event_date ?? `${task.year}-${String(task.month).padStart(2, '0')}-01`;
        const d = key.slice(0, 10);
        if (!taskMap[d]) taskMap[d] = [];
        taskMap[d].push(task);
    }

    // 月份第一天、最後一天
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const startDow = firstDay.getDay(); // 0=週日
    const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7;
    const today = new Date().toISOString().slice(0, 10);

    for (let i = 0; i < totalCells; i++) {
        const offset = i - startDow;
        const d = new Date(currentYear, currentMonth - 1, 1 + offset);
        const dateStr = d.toISOString().slice(0, 10);
        const isCurrentMonth = d.getMonth() === currentMonth - 1;
        const isToday = dateStr === today;

        const cell = document.createElement('div');
        cell.className = `cal-day${isCurrentMonth ? '' : ' other-month'}${isToday ? ' today' : ''}`;
        cell.dataset.date = dateStr;

        // 日期數字
        const numEl = document.createElement('div');
        numEl.className = 'day-num';
        numEl.textContent = d.getDate();
        cell.appendChild(numEl);

        // 月行任務（event_date 為 null 的，放在該月 1 號格）
        const dayTasks = taskMap[dateStr] ?? [];

        // 最多顯示 3 筆
        const visible = dayTasks.slice(0, 3);
        const hidden = dayTasks.length - 3;

        for (const task of visible) {
            cell.appendChild(buildTaskChip(task));
        }

        if (hidden > 0) {
            const more = document.createElement('div');
            more.className = 'cal-more';
            more.textContent = `+${hidden} 項`;
            more.addEventListener('click', () => openDayPanel(dateStr, dayTasks));
            cell.appendChild(more);
        }

        // 點擊日格開啟側欄
        numEl.addEventListener('click', () => openDayPanel(dateStr, dayTasks));
        grid.appendChild(cell);
    }

    // 月份非具日期的任務（event_date 為 null，不在前面的格）
    // 已在 taskMap 用 month 第一天處理
}

// ── 建立任務小卡 ──
function buildTaskChip(task) {
    const effectiveStatus = isOverdue(task) ? 'overdue' : task.status;
    const chip = document.createElement('button');
    chip.className = `cal-task cat-${task.category} status-${effectiveStatus}`;
    chip.title = task.title;
    chip.innerHTML = `
    <span class="task-chip-label">${task.title}</span>
  `;
    chip.addEventListener('click', e => {
        e.stopPropagation();
        openTaskModal(task, currentUser, () => renderCalendar());
    });
    return chip;
}

// ── 側欄：某日所有任務 ──
function openDayPanel(dateStr, tasks) {
    const panel = document.getElementById('day-tasks-panel');
    const titleEl = document.getElementById('panel-title');
    const dateEl = document.getElementById('panel-date');
    const bodyEl = document.getElementById('panel-body');

    if (!panel) return;

    titleEl.textContent = `${tasks.length} 項任務`;
    dateEl.textContent = formatDate(dateStr);
    bodyEl.innerHTML = '';

    if (tasks.length === 0) {
        bodyEl.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><p>這天沒有任務</p></div>`;
    } else {
        for (const task of tasks) {
            bodyEl.appendChild(buildPanelTaskCard(task));
        }
    }

    panel.classList.add('open');

    // 新增按鈕（帶預填日期）
    const addBtn = document.getElementById('panel-add-btn');
    if (addBtn) {
        addBtn.onclick = () => openTaskModal({ event_date: dateStr, year: currentYear, month: currentMonth }, currentUser, () => {
            renderCalendar();
            panel.classList.remove('open');
        });
    }
}

// ── 側欄任務卡片 ──
function buildPanelTaskCard(task) {
    const effectiveStatus = isOverdue(task) ? 'overdue' : task.status;
    const statusLabels = { pending: '待辦', in_progress: '進行中', done: '已完成', overdue: '已逾期' };

    const card = document.createElement('div');
    card.style.cssText = 'background:var(--surface-hover);border-radius:var(--radius);padding:12px;cursor:pointer;border:1px solid var(--border);transition:box-shadow var(--transition)';
    card.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary)">${task.title}</div>
      <span class="badge badge-${effectiveStatus}" style="flex-shrink:0">${statusLabels[effectiveStatus] ?? effectiveStatus}</span>
    </div>
    <div style="display:flex;align-items:center;gap:6px">
      <span class="cat-badge cat-${task.category}">${task.category}</span>
      ${task.deadline ? `<span style="font-size:11px;color:var(--text-muted)">截止 ${formatDate(task.deadline)}</span>` : ''}
    </div>
  `;
    card.addEventListener('click', () => openTaskModal(task, currentUser, () => renderCalendar()));
    card.addEventListener('mouseenter', () => card.style.boxShadow = 'var(--shadow)');
    card.addEventListener('mouseleave', () => card.style.boxShadow = 'none');
    return card;
}

// ── 綁定月份導航 ──
function bindNavButtons() {
    document.getElementById('btn-prev-month')?.addEventListener('click', () => {
        if (currentMonth === 1) { currentMonth = 12; currentYear--; }
        else currentMonth--;
        renderCalendar();
    });

    document.getElementById('btn-next-month')?.addEventListener('click', () => {
        if (currentMonth === 12) { currentMonth = 1; currentYear++; }
        else currentMonth++;
        renderCalendar();
    });

    document.getElementById('btn-today')?.addEventListener('click', () => {
        currentYear = new Date().getFullYear();
        currentMonth = new Date().getMonth() + 1;
        renderCalendar();
    });

    // 關閉側欄
    document.getElementById('btn-close-panel')?.addEventListener('click', () => {
        document.getElementById('day-tasks-panel')?.classList.remove('open');
    });
}

// ── Realtime 更新後重渲染（供 index.js 呼叫）──
export function refreshCalendar() {
    renderCalendar();
}

// ── 取得當前年月（供其他模組用）──
export function getCurrentYearMonth() {
    return { year: currentYear, month: currentMonth };
}
