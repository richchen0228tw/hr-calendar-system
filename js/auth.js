// 認證模組
import { sb } from './supabase-client.js';
import { showToast } from './ui.js';

// ── 取得當前用戶 ──
export async function getCurrentUser() {
    const { data: { user } } = await sb.auth.getUser();
    return user;
}

// ── 監聽認證狀態 ──
export function onAuthStateChange(callback) {
    return sb.auth.onAuthStateChange((_event, session) => {
        callback(session?.user ?? null);
    });
}

// ── 登入 ──
export async function signIn(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
}

// ── 登出 ──
export async function signOut() {
    const { error } = await sb.auth.signOut();
    if (error) throw error;
}

// ── 路由守衛（重導到登入頁）──
export async function requireAuth() {
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = '/login.html';
        return null;
    }
    return user;
}

// ── 更新 UI 顯示用戶資訊 ──
export function renderUserInfo(user) {
    const nameEl = document.getElementById('user-name');
    const emailEl = document.getElementById('user-email');
    const avatarEl = document.getElementById('user-avatar');

    if (!user) return;

    const displayName = user.user_metadata?.name || user.email?.split('@')[0] || '用戶';
    const initials = displayName.slice(0, 2).toUpperCase();

    if (nameEl) nameEl.textContent = displayName;
    if (emailEl) emailEl.textContent = user.email;
    if (avatarEl) avatarEl.textContent = initials;
}

// ── 登出按鈕 ──
export function bindSignOutButton(btnId = 'btn-logout') {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', async () => {
        try {
            await signOut();
            window.location.href = '/login.html';
        } catch (e) {
            showToast('登出失敗：' + e.message, 'error');
        }
    });
}
