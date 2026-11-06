/* =========================================================
   通用 UI 工具：转义、弹窗、提示、格式化
   ========================================================= */
(function () {
  'use strict';

  const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (ch) => ESC_MAP[ch]);

  const pad = (n) => String(n).padStart(2, '0');

  function parseDate(str) {
    if (!str) return null;
    const parts = str.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  const WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  function dateLabel(str, withWeek) {
    const d = parseDate(str);
    if (!d) return str || '';
    const base = `${d.getMonth() + 1}月${d.getDate()}日`;
    return withWeek ? `${base} ${WEEK[d.getDay()]}` : base;
  }

  function todayLabel() {
    const d = new Date();
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${WEEK[d.getDay()]}`;
  }

  function pct(v, digits) {
    if (v == null || isNaN(v)) return '—';
    return (v * 100).toFixed(digits == null ? 1 : digits).replace(/\.0$/, '') + '%';
  }

  let toastTimer = null;
  function toast(message, type) {
    const root = document.getElementById('toast-root');
    if (!root) return;
    let wrap = root.querySelector('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      root.appendChild(wrap);
    }
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.textContent = message;
    wrap.appendChild(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.style.transition = 'opacity .25s';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 260);
    }, 2400);
  }

  let activeKeyHandler = null;

  function closeModal() {
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = '';
    document.body.style.overflow = '';
    if (activeKeyHandler) {
      document.removeEventListener('keydown', activeKeyHandler);
      activeKeyHandler = null;
    }
  }

  /**
   * 打开表单弹窗
   * opts: { title, subtitle, body(html), submitText, cancelText, onSubmit(data, helpers), width }
   */
  function modal(opts) {
    const root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = `
      <div class="modal-mask">
        <div class="modal" style="max-width:${opts.width || 520}px" role="dialog" aria-modal="true" aria-label="${esc(opts.title)}">
          <div class="modal-head">
            <div>
              <h3>${esc(opts.title)}</h3>
              ${opts.subtitle ? `<p>${esc(opts.subtitle)}</p>` : ''}
            </div>
            <button class="modal-close" type="button" aria-label="关闭">&times;</button>
          </div>
          <form novalidate>
            <div class="modal-body">${opts.body || ''}</div>
            <div class="modal-foot">
              <button type="button" class="btn" data-close>${esc(opts.cancelText || '取消')}</button>
              ${opts.hideSubmit ? '' : `<button type="submit" class="btn primary">${esc(opts.submitText || '保存')}</button>`}
            </div>
          </form>
        </div>
      </div>`;

    const mask = root.querySelector('.modal-mask');
    const form = root.querySelector('form');
    const close = () => closeModal();
    document.body.style.overflow = 'hidden';

    root.querySelector('.modal-close').addEventListener('click', close);
    root.querySelector('[data-close]').addEventListener('click', close);
    mask.addEventListener('mousedown', (e) => { if (e.target === mask) close(); });

    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    activeKeyHandler = onKey;
    document.addEventListener('keydown', onKey);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = {};
      new FormData(form).forEach((v, k) => { data[k] = typeof v === 'string' ? v.trim() : v; });
      const helpers = { close, root };
      if (opts.onSubmit && opts.onSubmit(data, helpers) === false) return;
      close();
    });

    const first = form.querySelector('input, select, textarea');
    if (first) setTimeout(() => first.focus(), 30);
    return { close, form };
  }

  function confirm(message, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      const root = document.getElementById('modal-root');
      if (!root) return resolve(window.confirm(message));
      root.innerHTML = `
        <div class="modal-mask">
          <div class="modal" style="max-width:420px" role="dialog" aria-modal="true">
            <div class="modal-head"><div><h3>${esc(opts.title || '请确认')}</h3></div></div>
            <div class="modal-body"><p style="font-size:13.5px;color:var(--text-2);line-height:1.7">${esc(message)}</p></div>
            <div class="modal-foot">
              <button type="button" class="btn" data-no>${esc(opts.cancelText || '取消')}</button>
              <button type="button" class="btn ${opts.danger ? 'danger' : 'primary'}" data-yes>${esc(opts.okText || '确定')}</button>
            </div>
          </div>
        </div>`;
      document.body.style.overflow = 'hidden';
      const done = (val) => {
        closeModal();
        resolve(val);
      };
      const onKey = (e) => { if (e.key === 'Escape') done(false); };
      activeKeyHandler = onKey;
      document.addEventListener('keydown', onKey);
      root.querySelector('[data-no]').addEventListener('click', () => done(false));
      root.querySelector('[data-yes]').addEventListener('click', () => done(true));
      root.querySelector('.modal-mask').addEventListener('mousedown', (e) => {
        if (e.target.classList.contains('modal-mask')) done(false);
      });
    });
  }

  const AVATAR_TONES = ['teal', 'blue', 'amber', 'rose', 'teal', 'blue'];

  function avatar(student, size) {
    const name = student && student.name ? student.name : '?';
    const idx = student && student.no ? Number(student.no.slice(-1)) : 0;
    const tone = AVATAR_TONES[idx % AVATAR_TONES.length];
    const ch = name.slice(0, 1);
    const style = size ? `style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px"` : '';
    return `<span class="avatar ${tone}" ${style}>${esc(ch)}</span>`;
  }

  function categoryPill(category) {
    const map = {
      '成绩': 'blue', '出勤': 'amber', '违规': 'rose', '其他': 'teal'
    };
    return `<span class="pill ${map[category] || 'ink'}">${esc(category || '其他')}</span>`;
  }

  function delta(value, unit) {
    const v = Number(value) || 0;
    const cls = v > 0 ? 'up' : v < 0 ? 'down' : 'flat';
    const sign = v > 0 ? '+' : '';
    return `<span class="delta ${cls}">${sign}${v}${unit || ''}</span>`;
  }

  function empty(text) {
    return `<div class="empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>
      <p>${esc(text || '暂无数据')}</p>
    </div>`;
  }

  function studentOptions(selectedId) {
    return Store.students().map((s) =>
      `<option value="${s.id}" ${s.id === selectedId ? 'selected' : ''}>${esc(s.name)}（${esc(s.no)}）</option>`
    ).join('');
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type: type || 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  window.UI = {
    esc, dateLabel, todayLabel, pct, toast, modal, confirm,
    avatar, categoryPill, delta, empty, studentOptions, download
  };
})();
