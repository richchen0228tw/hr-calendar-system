// UI 工具模組（Toast、Modal、Spinner）

// ── Toast ──
let toastContainer = null;

function getToastContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    return toastContainer;
}

export function showToast(message, type = 'info', duration = 3000) {
    const container = getToastContainer();
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] ?? 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        toast.addEventListener('animationend', () => toast.remove());
    }, duration);
}

// ── Modal ──
export function openModal(html, options = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modal-overlay';

    overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      ${html}
    </div>
  `;

    // 點擊背景關閉
    overlay.addEventListener('click', e => {
        if (e.target === overlay) closeModal();
    });

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    overlay.querySelector('[data-close-modal]')?.addEventListener('click', closeModal);

    return overlay;
}

export function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
        overlay.remove();
        document.body.style.overflow = '';
    }
}

// ── 確認對話框 ──
export function confirmDialog(message, onConfirm, onCancel) {
    const html = `
    <div class="modal-header">
      <h2 class="modal-title">確認操作</h2>
      <button class="modal-close" data-close-modal>✕</button>
    </div>
    <div class="modal-body">
      <p style="color:var(--text-secondary);font-size:14px;">${message}</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" id="confirm-cancel">取消</button>
      <button class="btn btn-danger" id="confirm-ok">確認刪除</button>
    </div>
  `;
    const overlay = openModal(html);
    overlay.querySelector('#confirm-ok').addEventListener('click', () => {
        closeModal();
        onConfirm?.();
    });
    overlay.querySelector('#confirm-cancel').addEventListener('click', () => {
        closeModal();
        onCancel?.();
    });
}

// ── Loading 覆蓋層 ──
export function showLoading(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:60px;">
    <div class="spinner"></div>
  </div>`;
}

// ── 格式化日期 ──
export function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

// ── 相對時間 ──
export function relativeTime(tsStr) {
    if (!tsStr) return '';
    const now = Date.now();
    const ts = new Date(tsStr).getTime();
    const diff = now - ts;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diff < minute) return '剛剛';
    if (diff < hour) return `${Math.floor(diff / minute)} 分鐘前`;
    if (diff < day) return `${Math.floor(diff / hour)} 小時前`;
    if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
    return formatDate(tsStr);
}

// ── 防抖 ──
export function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}
