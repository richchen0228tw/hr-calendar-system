// 任務 Modal（新增/編輯）
import { sb, CATEGORIES, STATUSES } from './supabase-client.js';
import { createTask, updateTask, deleteTask, fetchHistory } from './tasks.js';
import { openModal, closeModal, confirmDialog, formatDate, relativeTime, showToast } from './ui.js';

// ── 開啟 Modal ──
export function openTaskModal(task = {}, user, onSaved) {
    const isEdit = !!task.id;
    const today = new Date().toISOString().slice(0, 10);

    const html = `
    <div class="modal-header">
      <div>
        <h2 class="modal-title">${isEdit ? '編輯任務' : '新增任務'}</h2>
      </div>
      <button class="modal-close" data-close-modal>✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">任務名稱 <span style="color:var(--status-overdue)">*</span></label>
        <input id="f-title" class="form-control" placeholder="例：出勤/薪資結算作業" value="${escHtml(task.title ?? '')}">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group">
          <label class="form-label">業務類別</label>
          <select id="f-category" class="form-control">
            ${CATEGORIES.map(c => `<option value="${c.id}" ${task.category === c.id ? 'selected' : ''}>${c.icon} ${c.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">狀態</label>
          <select id="f-status" class="form-control">
            ${STATUSES.map(s => `<option value="${s.id}" ${task.status === s.id ? 'selected' : ''}>${s.icon} ${s.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">年份</label>
          <input id="f-year" class="form-control" type="number" min="2025" max="2030" value="${task.year ?? 2026}">
        </div>
        <div class="form-group">
          <label class="form-label">月份</label>
          <select id="f-month" class="form-control">
            ${Array.from({ length: 12 }, (_, i) => i + 1)
            .map(m => `<option value="${m}" ${(task.month ?? new Date().getMonth() + 1) === m ? 'selected' : ''}>${m} 月</option>`)
            .join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">具體日期（可選）</label>
          <input id="f-event-date" class="form-control" type="date" value="${task.event_date ?? ''}">
        </div>
        <div class="form-group">
          <label class="form-label">截止日期（可選）</label>
          <input id="f-deadline" class="form-control" type="date" value="${task.deadline ?? ''}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">備註說明</label>
        <textarea id="f-notes" class="form-control" rows="3" placeholder="可在此備註說明任務細節，如授課講師、遇到的問題事項...等">${escHtml(task.notes ?? '')}</textarea>
      </div>
      <div class="form-group" style="display:flex;align-items:center;gap:8px">
        <input id="f-recurring" type="checkbox" ${task.is_recurring ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer">
        <label for="f-recurring" class="form-label" style="margin:0;cursor:pointer">每月例行任務</label>
      </div>

      ${isEdit ? `
        <div style="margin-top:20px;border-top:1px solid var(--border);padding-top:16px">
          <div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:10px">📋 變更歷史</div>
          <div id="history-list" style="font-size:12px;color:var(--text-muted)">載入中...</div>
        </div>
      ` : ''}
    </div>
    <div class="modal-footer" style="justify-content:space-between">
      ${isEdit
            ? `<button class="btn btn-danger btn-sm" id="btn-delete-task">🗑 刪除</button>`
            : `<div></div>`}
      <div style="display:flex;gap:8px">
        <button class="btn btn-secondary" data-close-modal>取消</button>
        <button class="btn btn-primary" id="btn-save-task">
          ${isEdit ? '💾 儲存' : '➕ 新增'}
        </button>
      </div>
    </div>
  `;

    const overlay = openModal(html);

    // 儲存
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
            if (isEdit) {
                await updateTask(task.id, payload, user.id);
            } else {
                await createTask(payload, user.id);
            }
            closeModal();
            onSaved?.();
        } catch (e) {
            showToast('操作失敗：' + e.message, 'error');
        }
    });

    // 刪除
    overlay.querySelector('#btn-delete-task')?.addEventListener('click', () => {
        confirmDialog('確定要刪除這項任務嗎？此操作無法復原。', async () => {
            await deleteTask(task.id);
            onSaved?.();
        });
    });

    // 載入歷史
    if (isEdit) {
        loadHistory(task.id, overlay.querySelector('#history-list'));
    }
}

// ── 載入歷史紀錄 ──
async function loadHistory(taskId, container) {
    try {
        const { fetchHistory } = await import('./tasks.js');
        const history = await fetchHistory(taskId);
        if (history.length === 0) {
            container.textContent = '尚無變更紀錄';
            return;
        }

        const actionLabels = {
            created: '建立任務',
            status_changed: '更新狀態',
            field_edited: '編輯欄位',
        };

        const fieldLabels = {
            title: '任務名稱', category: '類別', status: '狀態',
            notes: '備註', event_date: '日期', deadline: '截止日',
        };

        container.innerHTML = `
      <div class="history-list">
        ${history.map(h => `
          <div class="history-item">
            <div class="history-dot"></div>
            <div class="history-content">
              <div class="history-action">
                ${actionLabels[h.action] ?? h.action}
                ${h.field ? ` — <b>${fieldLabels[h.field] ?? h.field}</b>` : ''}
                ${h.old_value && h.new_value ? `：「${h.old_value}」→「${h.new_value}」` : ''}
              </div>
              <div class="history-meta">${relativeTime(h.changed_at)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    } catch {
        container.textContent = '無法載入歷史';
    }
}

// ── HTML 轉義 ──
function escHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
