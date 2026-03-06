// 儀表板模組
import { fetchTasks, fetchStats, isOverdue } from './tasks.js';
import { MONTH_NAMES, CATEGORIES } from './supabase-client.js';
import { formatDate } from './ui.js';

let chartPie = null;
let chartBar = null;

// ── 初始化儀表板 ──
export async function initDashboard() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    await renderStats(year, month);
    await renderCharts(year, month);
    await renderOverdueTasks(year, month);
    await renderUpcomingTasks(year, month);
}

// ── 統計卡片 ──
async function renderStats(year, month) {
    const stats = await fetchStats(year, month);

    setEl('stat-total', stats.total);
    setEl('stat-done', stats.done);
    setEl('stat-in-progress', stats.inProgress);
    setEl('stat-overdue', stats.overdue);

    const rate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
    setEl('stat-rate', rate + '%');

    // 根據逾期數量顯示顏色
    const overdueEl = document.getElementById('stat-overdue');
    if (overdueEl && stats.overdue > 0) {
        overdueEl.style.color = 'var(--status-overdue)';
    }
}

// ── Chart.js 圖表 ──
async function renderCharts(year, month) {
    const stats = await fetchStats(year, month);

    // 各類別分佈長條圖
    const barCtx = document.getElementById('chart-bar')?.getContext('2d');
    if (barCtx) {
        if (chartBar) chartBar.destroy();
        const catColors = {
            '人事薪資': '#f5c842',
            '人才招募': '#3b82f6',
            '教育訓練': '#60a5fa',
            '績效管理': '#f472b6',
            '其他專案': '#34d399',
        };
        chartBar = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: CATEGORIES.map(c => c.label),
                datasets: [{
                    label: '任務數量',
                    data: CATEGORIES.map(c => stats.byCategory[c.id] ?? 0),
                    backgroundColor: CATEGORIES.map(c => catColors[c.id]),
                    borderRadius: 6,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 },
                        grid: { color: 'rgba(0,0,0,.05)' },
                    },
                    x: { grid: { display: false } },
                },
            },
        });
    }

    // 完成率圓餅圖
    const pieCtx = document.getElementById('chart-pie')?.getContext('2d');
    if (pieCtx) {
        if (chartPie) chartPie.destroy();
        chartPie = new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: ['已完成', '進行中', '待辦', '已逾期'],
                datasets: [{
                    data: [stats.done, stats.inProgress, stats.pending, stats.overdue],
                    backgroundColor: ['#22c55e', '#f59e0b', '#94a3b8', '#ef4444'],
                    borderWidth: 0,
                    hoverOffset: 4,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 16, font: { size: 12 } },
                    },
                },
                cutout: '65%',
            },
        });
    }
}

// ── 逾期任務清單 ──
async function renderOverdueTasks(year, month) {
    const container = document.getElementById('overdue-list');
    if (!container) return;

    const tasks = await fetchTasks({ year, month });
    const overdue = tasks.filter(t => isOverdue(t));

    if (overdue.length === 0) {
        container.innerHTML = `
      <div class="empty-state" style="padding:20px">
        <div class="empty-icon">🎉</div>
        <p>本月沒有逾期任務！</p>
      </div>`;
        return;
    }

    container.innerHTML = overdue.map(t => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border)">
      <div style="width:6px;height:6px;border-radius:50%;background:var(--status-overdue);flex-shrink:0"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(t.title)}</div>
        <div style="font-size:11px;color:var(--text-muted)">${t.category} · 截止 ${formatDate(t.deadline ?? t.event_date)}</div>
      </div>
      <span class="badge badge-overdue">逾期</span>
    </div>
  `).join('');
}

// ── 即將到期（本月剩餘任務） ──
async function renderUpcomingTasks(year, month) {
    const container = document.getElementById('upcoming-list');
    if (!container) return;

    const allTasks = await fetchTasks({ year, month });
    const today = new Date();

    const upcoming = allTasks
        .filter(t => t.status !== 'done' && !isOverdue(t))
        .filter(t => t.event_date || t.deadline)
        .sort((a, b) => {
            const da = new Date(a.event_date ?? a.deadline ?? '9999-12-31');
            const db = new Date(b.event_date ?? b.deadline ?? '9999-12-31');
            return da - db;
        })
        .slice(0, 5);

    if (upcoming.length === 0) {
        container.innerHTML = `<div class="empty-state" style="padding:20px"><p>無即將到期任務</p></div>`;
        return;
    }

    container.innerHTML = upcoming.map(t => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border)">
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;color:var(--text-primary)">${escHtml(t.title)}</div>
        <div style="font-size:11px;color:var(--text-muted)">${t.category} · ${formatDate(t.event_date ?? t.deadline)}</div>
      </div>
      <span class="cat-badge cat-${t.category}">${t.category}</span>
    </div>
  `).join('');
}

function setEl(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function escHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
