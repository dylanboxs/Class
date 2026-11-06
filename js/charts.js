/* =========================================================
   轻量图表：纯 SVG，无第三方依赖
   ========================================================= */
(function () {
  'use strict';

  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const PALETTE = {
    teal: '#16897d', amber: '#d9932f', rose: '#cf5b5b',
    blue: '#3b6fa8', ink: '#10233c', gray: '#d8dfd9'
  };

  function mount(el, svg) {
    if (!el) return;
    el.innerHTML = svg;
    const node = el.querySelector('svg');
    if (node) node.setAttribute('class', 'chart-svg');
  }

  /** 折线图：data = [{ label, value }] */
  function line(el, data, opts) {
    opts = opts || {};
    if (!data.length) return empty(el);
    const W = 620, H = 230;
    const pad = { l: opts.left || 38, r: 16, t: 20, b: 34 };
    const colors = opts.colors || [PALETTE.teal];
    const series = opts.series || [{ key: 'value', color: colors[0], name: opts.name || '' }];

    const values = data.reduce((acc, d) => {
      series.forEach((s) => { if (typeof d[s.key] === 'number') acc.push(d[s.key]); });
      return acc;
    }, []);
    if (!values.length) return empty(el);

    let min = opts.min != null ? opts.min : Math.min.apply(null, values);
    let max = opts.max != null ? opts.max : Math.max.apply(null, values);
    if (min === max) { min -= 5; max += 5; }
    if (opts.padValue !== false) {
      const span = max - min;
      min = Math.max(0, min - span * 0.18);
      max = max + span * 0.12;
    }
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;
    const x = (i) => pad.l + (data.length === 1 ? plotW / 2 : (plotW * i) / (data.length - 1));
    const y = (v) => pad.t + plotH - ((v - min) / (max - min)) * plotH;

    let grid = '';
    for (let i = 0; i <= 4; i++) {
      const gy = pad.t + (plotH * i) / 4;
      const val = max - ((max - min) / 4) * i;
      grid += `<line x1="${pad.l}" y1="${gy}" x2="${W - pad.r}" y2="${gy}" stroke="#eef1ed" stroke-width="1"/>`;
      grid += `<text x="${pad.l - 8}" y="${gy + 3.5}" text-anchor="end" font-size="10" fill="#9aa6ad">${esc(Math.round(val))}</text>`;
    }

    let body = '';
    series.forEach((s) => {
      const pts = data.map((d, i) => ({ x: x(i), y: y(d[s.key] == null ? 0 : d[s.key]), d }));
      const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
      body += `<path d="${path}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
      if (opts.area !== false) {
        const areaPath = `${path} L${pts[pts.length - 1].x},${pad.t + plotH} L${pts[0].x},${pad.t + plotH} Z`;
        body += `<path d="${areaPath}" fill="url(#areaGrad)" opacity=".9"/>`;
      }
      pts.forEach((p) => {
        body += `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#fff" stroke="${s.color}" stroke-width="2.2"><title>${esc(p.d.label)}：${esc(p.d[s.key])}</title></circle>`;
        body += `<text x="${p.x}" y="${p.y - 11}" text-anchor="middle" font-size="10.5" font-weight="600" fill="${s.color}">${esc(p.d[s.key])}</text>`;
      });
    });

    let xlabels = '';
    data.forEach((d, i) => {
      xlabels += `<text x="${x(i)}" y="${H - 10}" text-anchor="middle" font-size="10.5" fill="#6f7f86">${esc(d.label)}</text>`;
    });

    const svg = `
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria || '折线图')}">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${series[0].color}" stop-opacity=".18"/>
            <stop offset="100%" stop-color="${series[0].color}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        ${grid}
        ${body}
        ${xlabels}
      </svg>`;
    mount(el, svg);
  }

  /** 纵向柱状图：data = [{ label, value }] */
  function vbar(el, data, opts) {
    opts = opts || {};
    if (!data.length) return empty(el);
    const W = 620, H = 220;
    const pad = { l: 32, r: 14, t: 18, b: 32 };
    const max = opts.max || Math.max.apply(null, data.map((d) => d.value)) || 1;
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;
    const slot = plotW / data.length;
    const barW = Math.min(46, slot * 0.52);
    const color = opts.color || PALETTE.teal;

    let grid = '';
    for (let i = 0; i <= 3; i++) {
      const gy = pad.t + (plotH * i) / 3;
      grid += `<line x1="${pad.l}" y1="${gy}" x2="${W - pad.r}" y2="${gy}" stroke="#eef1ed"/>`;
      grid += `<text x="${pad.l - 7}" y="${gy + 3.5}" text-anchor="end" font-size="10" fill="#9aa6ad">${Math.round(max - (max / 3) * i)}</text>`;
    }

    let bars = '';
    data.forEach((d, i) => {
      const h = d.value ? Math.max(3, (d.value / max) * plotH) : 0;
      const cx = pad.l + slot * i + slot / 2;
      const bx = cx - barW / 2;
      const by = pad.t + plotH - h;
      const c = d.color || color;
      bars += `<rect x="${bx}" y="${by}" width="${barW}" height="${h}" rx="5" fill="${c}" opacity=".92"><title>${esc(d.label)}：${esc(d.value)}</title></rect>`;
      bars += `<text x="${cx}" y="${by - 7}" text-anchor="middle" font-size="10.5" font-weight="600" fill="#5c6b74">${esc(d.value)}</text>`;
      bars += `<text x="${cx}" y="${H - 10}" text-anchor="middle" font-size="10.5" fill="#6f7f86">${esc(d.label)}</text>`;
    });

    mount(el, `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria || '柱状图')}">${grid}${bars}</svg>`);
  }

  /** 横向条形图：data = [{ label, value, color }] */
  function hbar(el, data, opts) {
    opts = opts || {};
    if (!data.length) return empty(el);
    const W = 620;
    const rowH = 34;
    const labelW = opts.labelWidth || 92;
    const valueW = 36;
    const H = data.length * rowH + 8;
    const max = Math.max.apply(null, data.map((d) => d.value)) || 1;
    const barMax = W - labelW - valueW - 12;

    let rows = '';
    data.forEach((d, i) => {
      const cy = 8 + i * rowH + rowH / 2;
      const w = Math.max(4, (d.value / max) * barMax);
      const color = d.color || opts.color || PALETTE.teal;
      rows += `<text x="0" y="${cy + 4}" font-size="11.5" fill="#5c6b74">${esc(d.label)}</text>`;
      rows += `<rect x="${labelW}" y="${cy - 6}" width="${barMax}" height="12" rx="6" fill="#f0f3ef"/>`;
      rows += `<rect x="${labelW}" y="${cy - 6}" width="${w}" height="12" rx="6" fill="${color}" opacity=".9"><title>${esc(d.label)}：${esc(d.value)}</title></rect>`;
      rows += `<text x="${W}" y="${cy + 4}" text-anchor="end" font-size="11.5" font-weight="600" fill="#1d2a33">${esc(d.value)}</text>`;
    });
    mount(el, `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria || '条形图')}">${rows}</svg>`);
  }

  /** 环形图：segments = [{ label, value, color }] */
  function donut(el, segments, opts) {
    opts = opts || {};
    const total = segments.reduce((s, x) => s + x.value, 0);
    if (!total) return empty(el, opts.emptyText || '暂无数据');

    const W = 240, H = 240, cx = W / 2, cy = H / 2, r = 78, thick = 22;
    const C = 2 * Math.PI * r;
    let offset = 0;
    let arcs = '';

    segments.forEach((seg) => {
      if (!seg.value) return;
      const frac = seg.value / total;
      const len = frac * C;
      const dash = Math.max(0, len - 2) + ' ' + (C - Math.max(0, len - 2));
      arcs += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="${thick}"
        stroke-dasharray="${dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="butt">
        <title>${esc(seg.label)}：${esc(seg.value)}</title></circle>`;
      offset += len;
    });

    const centerValue = opts.centerValue != null ? opts.centerValue : total;
    const centerLabel = opts.centerLabel || '总计';
    const svg = `
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria || '环形图')}">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f0f3ef" stroke-width="${thick}"/>
        ${arcs}
        <text x="${cx}" y="${cy - 2}" text-anchor="middle" font-size="23" font-weight="700" fill="#10233c">${esc(centerValue)}</text>
        <text x="${cx}" y="${cy + 19}" text-anchor="middle" font-size="10.5" fill="#8a979e">${esc(centerLabel)}</text>
      </svg>`;
    mount(el, svg);
  }

  function sparkline(el, values, opts) {
    opts = opts || {};
    if (!values.length) return empty(el);
    const W = 120, H = 34, max = Math.max.apply(null, values), min = Math.min.apply(null, values);
    const span = max - min || 1;
    const pts = values.map((v, i) => `${(W / (values.length - 1 || 1)) * i},${H - 4 - ((v - min) / span) * (H - 8)}`);
    mount(el, `<svg viewBox="0 0 ${W} ${H}"><polyline points="${pts.join(' ')}" fill="none" stroke="${opts.color || PALETTE.teal}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>`);
  }

  function empty(el, text) {
    if (!el) return;
    el.innerHTML = `<div class="empty"><p>${esc(text || '暂无数据')}</p></div>`;
  }

  window.Charts = { line, vbar, hbar, donut, sparkline, PALETTE, empty };
})();
