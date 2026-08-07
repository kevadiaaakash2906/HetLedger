/* ============================================
   VINÉRE — Utilities + Toast System
   ============================================ */

export function $(id) { return document.getElementById(id); }

export function fmtDate(d) {
  if (!d) return '';
  const date = new Date(d);
  if (isNaN(date)) return String(d);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtMoney(n, currency = '') {
  const num = parseFloat(n);
  if (isNaN(num)) return '—';
  const formatted = num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? currency + ' ' + formatted : formatted;
}

export function sortBy(arr, key, desc = false) {
  return [...arr].sort((a, b) => {
    const av = a[key], bv = b[key];
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') {
      return desc ? bv - av : av - bv;
    }
    return desc ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
  });
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function highlightText(text, query) {
  if (!query || !text) return escapeHtml(String(text));
  const q = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${q})`, 'gi');
  return escapeHtml(String(text)).replace(regex, '<mark class="search-highlight">$1</mark>');
}

/* ============ TOAST SYSTEM ============ */
const toastContainer = document.getElementById('toastContainer');

export function showToast(message, type = 'info', duration = 4000) {
  if (!toastContainer) return;

  const titles = {
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Info'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon"></div>
    <div class="toast-body">
      <div class="toast-title">${titles[type] || 'Info'}</div>
      <div class="toast-message">${escapeHtml(message)}</div>
    </div>
    <button class="toast-close">&times;</button>
    <div class="toast-progress" style="animation-duration: ${duration}ms;"></div>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => dismissToast(toast));

  toastContainer.appendChild(toast);

  const autoDismiss = setTimeout(() => dismissToast(toast), duration);

  toast.addEventListener('mouseenter', () => {
    clearTimeout(autoDismiss);
    const prog = toast.querySelector('.toast-progress');
    if (prog) prog.style.animationPlayState = 'paused';
  });
}

export function dismissToast(toast) {
  if (!toast || toast.classList.contains('toast-exit')) return;
  toast.classList.add('toast-exit');
  toast.addEventListener('animationend', () => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  });
}
