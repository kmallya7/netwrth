// js/insights.js
// ─── Insights & Analytics Module ──────────────────────────────────────────

import { formatINR }     from "./ui.js";
import { allExpenses }   from "./expenses.js";
import { allIncome }     from "./income.js";
import { allInvestments } from "./investments.js";
import { allDebts }      from "./debts.js";
import { allBudgets }    from "./budgets.js";
import { allAccounts }   from "./accounts.js";
import { getSettings }   from "./settings.js";

// ── State ──────────────────────────────────────────────────────────────────
let insPeriod = '1y';   // '3m' | '6m' | '1y' | '2y' | 'all'
let insTab    = 'overview'; // 'overview' | 'spending' | 'networth' | 'investments'
let insTooltipEl = null;

// ── Palette ────────────────────────────────────────────────────────────────
const RING_COLORS = [
  '#10b981','#34d399','#6ee7b7',
  '#f59e0b','#fb923c','#a78bfa',
  '#6b7280',
];
const INV_COLORS = [
  '#6366f1','#8b5cf6','#a78bfa',
  '#06b6d4','#22d3ee','#67e8f9',
  '#f59e0b','#fbbf24',
];

// ── Helpers ────────────────────────────────────────────────────────────────
function isDark() {
  return document.documentElement.classList.contains('dark');
}

function toDate(item) {
  return item.date?.toDate ? item.date.toDate() : new Date(item.date);
}

function compactINR(v) {
  if (!v && v !== 0) return '₹0';
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `${sign}₹${Math.round(abs / 1e3)}K`;
  return `${sign}₹${Math.round(abs)}`;
}

function smoothPath(pts) {
  if (!pts.length) return '';
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const dx = (x1 - x0) / 3;
    d += ` C ${(x0 + dx).toFixed(1)} ${y0.toFixed(1)}, ${(x1 - dx).toFixed(1)} ${y1.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  }
  return d;
}

function getPeriodRange() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  if (insPeriod === 'all') return { start: new Date(0), end };
  const months = insPeriod === '3m' ? 3 : insPeriod === '6m' ? 6 : insPeriod === '2y' ? 24 : 12;
  const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
  return { start, end };
}

function getMonthBuckets() {
  const now = new Date();
  const months = insPeriod === '3m' ? 3 : insPeriod === '6m' ? 6 : insPeriod === '2y' ? 24 : insPeriod === 'all' ? 24 : 12;
  const buckets = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      year: d.getFullYear(), month: d.getMonth(),
      label: d.toLocaleDateString('en-IN', { month: 'short' }),
      shortYear: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      income: 0, expense: 0,
    });
  }
  return buckets;
}

function clr() {
  const dark = isDark();
  return {
    inc:   dark ? '#34d399' : '#059669',
    exp:   dark ? '#f87171' : '#dc2626',
    net:   dark ? 'rgba(148,163,184,0.7)' : 'rgba(100,116,139,0.7)',
    grid:  dark ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.07)',
    axis:  dark ? 'rgba(255,255,255,0.1)'   : 'rgba(0,0,0,0.12)',
    txt:   dark ? '#525252' : '#a1a1aa',
    dot:   dark ? '#111'    : '#fff',
    ttBg:  dark ? '#1c1c1c' : '#ffffff',
    ttBdr: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)',
    ttTxt: dark ? '#f5f5f5' : '#18181b',
    ttSub: dark ? '#737373' : '#71717a',
    savBg: dark ? '#171717' : '#fafafa',
  };
}

// ── Tooltip ────────────────────────────────────────────────────────────────
function ensureTooltip() {
  if (!insTooltipEl) {
    insTooltipEl = document.createElement('div');
    insTooltipEl.id = 'insTooltip';
    insTooltipEl.className = 'ins-tooltip';
    insTooltipEl.style.opacity = '0';
    insTooltipEl.style.pointerEvents = 'none';
    document.body.appendChild(insTooltipEl);
  }
  return insTooltipEl;
}

function showTip(e, html) {
  const tip = ensureTooltip();
  tip.innerHTML = html;
  tip.style.opacity = '1';
  tip.style.left = `${e.clientX}px`;
  tip.style.top  = `${e.clientY}px`;
}

function hideTip() {
  if (insTooltipEl) insTooltipEl.style.opacity = '0';
}

// ── Update period/tab UI state ─────────────────────────────────────────────
function updatePeriodUI() {
  document.querySelectorAll('.ins-period-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.period === insPeriod);
  });
}

function updateTabUI() {
  document.querySelectorAll('.ins-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === insTab);
  });
  document.querySelectorAll('.ins-tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.dataset.tab === insTab);
  });
}

// ══════════════════════════════════════════════════════════════════════════
// 1. KPI STRIP
// ══════════════════════════════════════════════════════════════════════════
function renderKPIStrip() {
  const { start, end } = getPeriodRange();
  const months = insPeriod === '3m' ? 3 : insPeriod === '6m' ? 6 : insPeriod === '2y' ? 24 : insPeriod === 'all' ? 24 : 12;

  const ignored = getSettings().ignoredReportCategories || [];
  const exp = allExpenses.filter(e => {
    const d = toDate(e);
    if (d < start || d > end) return false;
    if (ignored.includes(e.category) || ignored.includes(e.categoryGroup)) return false;
    return true;
  });
  const inc = allIncome.filter(i => { const d = toDate(i); return d >= start && d <= end; });

  const totalExp = exp.reduce((s, e) => s + (e.amount || 0), 0);
  const totalInc = inc.reduce((s, i) => s + (i.amount || 0), 0);
  const avgMonthly = months > 0 ? Math.round(totalExp / months) : 0;
  const savingsRate = totalInc > 0 ? Math.round(((totalInc - totalExp) / totalInc) * 100) : 0;

  // NW = assets - liabilities
  const assets = allAccounts.filter(a => !['credit'].includes(a.type))
                             .reduce((s, a) => s + (a.balance || 0), 0);
  const liabilities = allDebts.reduce((s, d) => s + (d.remaining || 0), 0);
  const netWorth = assets - liabilities;

  // Top category
  const byCat = {};
  exp.forEach(e => {
    const k = e.categoryGroup || e.category || 'Other';
    byCat[k] = (byCat[k] || 0) + (e.amount || 0);
  });
  const topCat = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];

  const target  = getSettings().savingsRateTarget;
  const srColor = savingsRate >= target ? 'positive' : savingsRate >= target / 2 ? 'text-amber-400' : 'negative';

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.textContent !== val) {
      el.textContent = val;
      el.classList.remove('stat-pop');
      void el.offsetWidth;
      el.classList.add('stat-pop');
    }
  };

  set('insKpiAvgSpend',    compactINR(avgMonthly));
  set('insKpiSavings',     `${Math.max(savingsRate, 0)}%`);
  set('insKpiNetWorth',    compactINR(netWorth));
  set('insKpiTopCat',      topCat ? topCat[0] : '—');

  const savEl = document.getElementById('insKpiSavings');
  if (savEl) {
    savEl.className = `stat-value ${srColor}`;
  }
  const savDelta = document.getElementById('insKpiSavingsDelta');
  if (savDelta) {
    const t = getSettings().savingsRateTarget;
    savDelta.textContent = savingsRate >= t ? `On track (${t}% goal)` : savingsRate >= t / 2 ? 'Below target' : 'Needs attention';
    savDelta.className = `stat-delta ${srColor}`;
  }
  const topCatAmt = document.getElementById('insKpiTopCatAmt');
  if (topCatAmt) topCatAmt.textContent = topCat ? compactINR(topCat[1]) : '—';
  const avgDelta = document.getElementById('insKpiAvgDelta');
  if (avgDelta) avgDelta.textContent = `per month · ${insPeriod.toUpperCase()} avg`;
  const nwDelta = document.getElementById('insKpiNWDelta');
  if (nwDelta) nwDelta.textContent = `assets ${compactINR(assets)} · debts ${compactINR(liabilities)}`;
}

// ══════════════════════════════════════════════════════════════════════════
// 2. STACKED BAR — Income vs Expenses
// ══════════════════════════════════════════════════════════════════════════
function renderStackedBar() {
  const el = document.getElementById('insStackedBar');
  if (!el) return;

  const buckets = getMonthBuckets();
  allIncome.forEach(item => {
    const d = toDate(item);
    const b = buckets.find(b => b.year === d.getFullYear() && b.month === d.getMonth());
    if (b) b.income += item.amount || 0;
  });
  allExpenses.forEach(item => {
    const d = toDate(item);
    const b = buckets.find(b => b.year === d.getFullYear() && b.month === d.getMonth());
    if (b) b.expense += item.amount || 0;
  });

  const W = 600, H = 200;
  const padL = 52, padR = 12, padT = 16, padB = 32;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const maxVal = Math.max(...buckets.map(b => Math.max(b.income, b.expense)), 1);
  const barW = Math.max((chartW / buckets.length) * 0.35, 4);
  const gap  = barW * 0.25;
  const slotW = chartW / buckets.length;
  const c = clr();

  const gradId = 'sbGradInc';
  const gradExpId = 'sbGradExp';

  const bars = buckets.map((b, i) => {
    const cx  = padL + (i + 0.5) * slotW;
    const incH = (b.income  / maxVal) * chartH;
    const expH = (b.expense / maxVal) * chartH;
    const baseY = padT + chartH;
    const netY  = baseY - ((b.income - b.expense) / maxVal) * chartH;
    const net   = b.income - b.expense;

    return `
      <rect x="${(cx - gap / 2 - barW).toFixed(1)}" y="${(baseY - incH).toFixed(1)}"
            width="${barW.toFixed(1)}" height="${Math.max(incH, 0).toFixed(1)}"
            fill="url(#${gradId})" rx="2"
            style="transform-origin:${(cx - gap/2 - barW/2).toFixed(1)}px ${baseY}px;
                   animation:insBarUp 0.55s cubic-bezier(0.4,0,0.2,1) ${i * 40}ms both"
            data-i="${i}" class="ins-bar-rect">
        <title>${b.shortYear} Income: ${formatINR(b.income)}</title>
      </rect>
      <rect x="${(cx + gap / 2).toFixed(1)}" y="${(baseY - expH).toFixed(1)}"
            width="${barW.toFixed(1)}" height="${Math.max(expH, 0).toFixed(1)}"
            fill="url(#${gradExpId})" rx="2"
            style="transform-origin:${(cx + gap/2 + barW/2).toFixed(1)}px ${baseY}px;
                   animation:insBarUp 0.55s cubic-bezier(0.4,0,0.2,1) ${i * 40 + 20}ms both"
            data-i="${i}" class="ins-bar-rect">
        <title>${b.shortYear} Expenses: ${formatINR(b.expense)}</title>
      </rect>
      ${Math.abs(net) > 0 ? `<circle cx="${cx.toFixed(1)}" cy="${netY.toFixed(1)}" r="2.5"
        fill="${net >= 0 ? c.inc : c.exp}" opacity="0.9">
        <title>Net ${net >= 0 ? 'Saved' : 'Deficit'}: ${formatINR(Math.abs(net))}</title>
      </circle>` : ''}`;
  }).join('');

  const gridLines = [0.25, 0.5, 0.75, 1].map(p => {
    const y = (padT + chartH - p * chartH).toFixed(1);
    return `<line x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}" stroke="${c.grid}" stroke-width="1"/>
            <text x="${(padL - 4).toFixed(1)}" y="${y}" text-anchor="end" dominant-baseline="middle"
                  font-size="9" fill="${c.txt}" font-family="DM Mono,monospace">${compactINR(p * maxVal)}</text>`;
  }).join('');

  const xLabels = buckets.map((b, i) => {
    const show = buckets.length <= 12 || i % 2 === 0;
    if (!show) return '';
    const cx = padL + (i + 0.5) * slotW;
    return `<text x="${cx.toFixed(1)}" y="${(H - 6).toFixed(1)}" text-anchor="middle"
                  font-size="9" fill="${c.txt}" font-family="DM Sans,sans-serif">${b.label}</text>`;
  }).join('');

  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;overflow:visible">
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${c.inc}" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="${c.inc}" stop-opacity="0.55"/>
      </linearGradient>
      <linearGradient id="${gradExpId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${c.exp}" stop-opacity="0.9"/>
        <stop offset="100%" stop-color="${c.exp}" stop-opacity="0.55"/>
      </linearGradient>
    </defs>
    ${gridLines}
    <line x1="${padL}" x2="${W - padR}" y1="${padT + chartH}" y2="${padT + chartH}" stroke="${c.axis}" stroke-width="1"/>
    ${bars}
    ${xLabels}
  </svg>`;

  // Hover tooltip
  el.querySelectorAll('.ins-bar-rect').forEach(rect => {
    rect.style.cursor = 'default';
    rect.addEventListener('mouseenter', e => {
      const i = +rect.dataset.i;
      const b = buckets[i];
      const net = b.income - b.expense;
      showTip(e, `<div class="ins-tooltip-label">${b.shortYear}</div>
        <div style="color:${c.inc}">Income: ${formatINR(b.income)}</div>
        <div style="color:${c.exp}">Expenses: ${formatINR(b.expense)}</div>
        <div style="color:${net >= 0 ? c.inc : c.exp};margin-top:2px">
          Net: ${net >= 0 ? '+' : ''}${formatINR(net)}
        </div>`);
    });
    rect.addEventListener('mousemove', e => {
      if (insTooltipEl) { insTooltipEl.style.left = `${e.clientX}px`; insTooltipEl.style.top = `${e.clientY}px`; }
    });
    rect.addEventListener('mouseleave', hideTip);
  });
}

// ══════════════════════════════════════════════════════════════════════════
// 3. RING / DONUT — Spending Mix
// ══════════════════════════════════════════════════════════════════════════
function renderRingChart(containerId, legendId, titleId, items, groupKey, amtKey = 'amount', colorSet = RING_COLORS, centerLabelFn = null) {
  const el   = document.getElementById(containerId);
  const legEl = document.getElementById(legendId);
  if (!el) return;

  const { start, end } = getPeriodRange();
  const filtered = items.filter(i => { const d = toDate(i); return d >= start && d <= end; });

  const byCat = {};
  filtered.forEach(item => {
    const k = item[groupKey] || 'Other';
    byCat[k] = (byCat[k] || 0) + (item[amtKey] || 0);
  });

  const total = Object.values(byCat).reduce((s, v) => s + v, 0);
  if (!total) {
    el.innerHTML = `<p class="text-sm text-neutral-500 text-center py-6">No data for period.</p>`;
    if (legEl) legEl.innerHTML = '';
    return;
  }

  let sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 6) {
    const top5 = sorted.slice(0, 6);
    const other = sorted.slice(6).reduce((s, [, v]) => s + v, 0);
    if (other > 0) top5.push(['Other', other]);
    sorted = top5;
  }

  const size = 140, cx = size / 2, cy = size / 2;
  const outerR = 60, innerR = 36;
  const circumference = 2 * Math.PI * outerR;
  let cumAngle = -Math.PI / 2;

  const arcs = sorted.map(([name, val], idx) => {
    const frac  = val / total;
    const angle = frac * 2 * Math.PI;
    const startA = cumAngle;
    const endA   = cumAngle + angle;
    cumAngle = endA;

    const x1 = cx + outerR * Math.cos(startA);
    const y1 = cy + outerR * Math.sin(startA);
    const x2 = cx + outerR * Math.cos(endA);
    const y2 = cy + outerR * Math.sin(endA);
    const xi1 = cx + innerR * Math.cos(endA);
    const yi1 = cy + innerR * Math.sin(endA);
    const xi2 = cx + innerR * Math.cos(startA);
    const yi2 = cy + innerR * Math.sin(startA);
    const lg  = angle > Math.PI ? 1 : 0;
    const col = colorSet[idx % colorSet.length];
    const pct = Math.round(frac * 100);
    const delay = idx * 70;

    const pathLen = frac * circumference;
    const pathD = frac > 0.999
      ? `M ${cx} ${cy - outerR} A ${outerR} ${outerR} 0 1 1 ${cx - 0.001} ${cy - outerR} Z M ${cx} ${cy - innerR} A ${innerR} ${innerR} 0 1 0 ${cx - 0.001} ${cy - innerR} Z`
      : `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${outerR} ${outerR} 0 ${lg} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${xi1.toFixed(2)} ${yi1.toFixed(2)} A ${innerR} ${innerR} 0 ${lg} 0 ${xi2.toFixed(2)} ${yi2.toFixed(2)} Z`;

    return { pathD, col, name, val, pct, delay };
  });

  const c = clr();
  const centerText = centerLabelFn ? centerLabelFn(total) : compactINR(total);
  const titleText  = titleId ? (document.getElementById(titleId)?.textContent || '') : '';

  el.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block;overflow:visible">
    ${arcs.map(({ pathD, col, name, val, pct, delay }) => `
      <path d="${pathD}" fill="${col}" opacity="0.92"
            style="animation:insHeatIn 0.4s cubic-bezier(0.34,1.2,0.64,1) ${delay}ms both;cursor:default"
            class="ins-ring-seg">
        <title>${name}: ${formatINR(val)} (${pct}%)</title>
      </path>`).join('')}
    <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="13" font-weight="600"
          font-family="DM Mono,monospace" fill="${c.ttTxt}">${centerText}</text>
    <text x="${cx}" y="${cy + 10}" text-anchor="middle" font-size="7.5"
          font-family="DM Sans,sans-serif" fill="${c.txt}">total</text>
  </svg>`;

  if (legEl) {
    legEl.innerHTML = arcs.map(({ col, name, val, pct }, i) => `
      <div class="ins-legend-row" style="animation:insHeatIn 0.3s ease ${i * 50 + 200}ms both">
        <span class="ins-legend-dot" style="background:${col}"></span>
        <span class="ins-legend-label">${name}</span>
        <span class="ins-legend-val">${compactINR(val)}</span>
        <span class="ins-legend-label" style="width:2rem;text-align:right">${pct}%</span>
      </div>`).join('');
  }

  // Hover
  el.querySelectorAll('.ins-ring-seg').forEach((seg, i) => {
    seg.addEventListener('mouseenter', e => {
      const { name, val, pct } = arcs[i];
      showTip(e, `<div class="ins-tooltip-label">${name}</div>
        <div class="ins-tooltip-val">${formatINR(val)}</div>
        <div class="ins-tooltip-label">${pct}% of total</div>`);
    });
    seg.addEventListener('mousemove', e => {
      if (insTooltipEl) { insTooltipEl.style.left = `${e.clientX}px`; insTooltipEl.style.top = `${e.clientY}px`; }
    });
    seg.addEventListener('mouseleave', hideTip);
  });
}

function renderSpendingMix() {
  renderRingChart('insSpendMix', 'insSpendMixLegend', null,
    allExpenses, 'categoryGroup', 'amount', RING_COLORS);
}

// ══════════════════════════════════════════════════════════════════════════
// 4. SAVINGS RATE TREND — Line + bands
// ══════════════════════════════════════════════════════════════════════════
function renderSavingsRateTrend() {
  const el = document.getElementById('insSavingsRate');
  if (!el) return;

  const buckets = getMonthBuckets();
  allIncome.forEach(item => {
    const d = toDate(item);
    const b = buckets.find(b => b.year === d.getFullYear() && b.month === d.getMonth());
    if (b) b.income += item.amount || 0;
  });
  allExpenses.forEach(item => {
    const d = toDate(item);
    const b = buckets.find(b => b.year === d.getFullYear() && b.month === d.getMonth());
    if (b) b.expense += item.amount || 0;
  });

  const rates = buckets.map(b => b.income > 0 ? Math.round(((b.income - b.expense) / b.income) * 100) : 0);
  const W = 600, H = 160;
  const padL = 36, padR = 12, padT = 16, padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const maxR = Math.max(...rates, 40);
  const c = clr();

  const pts = buckets.map((b, i) => [
    padL + (i / Math.max(buckets.length - 1, 1)) * chartW,
    padT + chartH - Math.max(0, Math.min(rates[i], maxR)) / maxR * chartH,
  ]);

  const linePath = smoothPath(pts);
  const areaD = pts.length > 1
    ? `${linePath} L ${pts[pts.length - 1][0].toFixed(1)} ${padT + chartH} L ${pts[0][0].toFixed(1)} ${padT + chartH} Z`
    : '';

  // Band: red 0-10%, amber 10-20%, green 20%+
  const band = (lo, hi, color, opacity) => {
    const y1 = padT + chartH - Math.min(hi, maxR) / maxR * chartH;
    const y2 = padT + chartH - Math.min(lo, maxR) / maxR * chartH;
    return `<rect x="${padL}" y="${y1.toFixed(1)}" width="${chartW}" height="${(y2 - y1).toFixed(1)}"
                  fill="${color}" opacity="${opacity}"/>`;
  };

  const bandRed   = band(0,  10, '#ef4444', 0.07);
  const bandAmber = band(10, 20, '#f59e0b', 0.06);
  const bandGreen = band(20, maxR, '#10b981', 0.06);

  const gridY = [10, 20, 30].map(p => {
    if (p > maxR) return '';
    const y = (padT + chartH - p / maxR * chartH).toFixed(1);
    return `<line x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}" stroke="${c.grid}" stroke-width="1" stroke-dasharray="3,3"/>
            <text x="${(padL - 4).toFixed(1)}" y="${y}" text-anchor="end" dominant-baseline="middle"
                  font-size="8.5" fill="${c.txt}" font-family="DM Mono,monospace">${p}%</text>`;
  }).join('');

  const xLabels = buckets.map((b, i) => {
    const show = buckets.length <= 12 || i % 2 === 0;
    if (!show) return '';
    const x = padL + (i / Math.max(buckets.length - 1, 1)) * chartW;
    return `<text x="${x.toFixed(1)}" y="${H - 4}" text-anchor="middle"
                  font-size="8.5" fill="${c.txt}" font-family="DM Sans,sans-serif">${b.label}</text>`;
  }).join('');

  const pathLen = linePath.length * 3;
  const gId = 'srAreaGrad';

  const dots = pts.map((p, i) => `
    <circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3"
            fill="${c.dot}" stroke="${c.inc}" stroke-width="1.5"
            class="ins-sr-dot" data-i="${i}" style="cursor:default"/>`).join('');

  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;overflow:visible">
    <defs>
      <linearGradient id="${gId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${c.inc}" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="${c.inc}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${bandRed}${bandAmber}${bandGreen}
    ${gridY}
    <line x1="${padL}" x2="${W - padR}" y1="${padT + chartH}" y2="${padT + chartH}"
          stroke="${c.axis}" stroke-width="1"/>
    ${areaD ? `<path d="${areaD}" fill="url(#${gId})"/>` : ''}
    <path d="${linePath}" fill="none" stroke="${c.inc}" stroke-width="1.75"
          stroke-linecap="round" stroke-linejoin="round"
          style="--path-len:${pathLen};stroke-dasharray:${pathLen};
                 animation:insLineDraw 0.8s cubic-bezier(0.4,0,0.2,1) both"/>
    ${dots}
    ${xLabels}
  </svg>`;

  el.querySelectorAll('.ins-sr-dot').forEach(dot => {
    dot.addEventListener('mouseenter', e => {
      const i = +dot.dataset.i;
      const b = buckets[i];
      const r = rates[i];
      showTip(e, `<div class="ins-tooltip-label">${b.shortYear}</div>
        <div class="ins-tooltip-val">${r}% saved</div>
        <div style="font-size:0.7rem;color:${c.ttSub}">Inc ${compactINR(b.income)} · Exp ${compactINR(b.expense)}</div>`);
    });
    dot.addEventListener('mousemove', e => {
      if (insTooltipEl) { insTooltipEl.style.left = `${e.clientX}px`; insTooltipEl.style.top = `${e.clientY}px`; }
    });
    dot.addEventListener('mouseleave', hideTip);
  });
}

// ══════════════════════════════════════════════════════════════════════════
// 5. CATEGORY BREAKDOWN — Horizontal bars
// ══════════════════════════════════════════════════════════════════════════
function renderCategoryBreakdown() {
  const el = document.getElementById('insCatBreakdown');
  if (!el) return;

  const { start, end } = getPeriodRange();
  const exp = allExpenses.filter(e => { const d = toDate(e); return d >= start && d <= end; });

  const byCat = {};
  exp.forEach(e => {
    const k = e.categoryGroup || e.category || 'Other';
    byCat[k] = (byCat[k] || 0) + (e.amount || 0);
  });

  const total  = Object.values(byCat).reduce((s, v) => s + v, 0);
  const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 10);

  if (!sorted.length) {
    el.innerHTML = `<p class="text-sm text-neutral-500 text-center py-4">No expenses in this period.</p>`;
    return;
  }

  el.innerHTML = sorted.map(([cat, amt], i) => {
    const pct   = total ? (amt / total) * 100 : 0;
    const delay = i * 50;
    const col   = RING_COLORS[i % RING_COLORS.length];
    return `<div class="ins-cat-row" style="animation:txRowIn 0.22s ease ${delay}ms both">
      <span class="ins-cat-name" title="${cat}">${cat}</span>
      <div class="ins-cat-bar-track">
        <div class="ins-cat-bar" style="width:${pct.toFixed(1)}%;background:${col};animation-delay:${delay}ms"></div>
      </div>
      <span class="ins-cat-meta">${compactINR(amt)} · ${Math.round(pct)}%</span>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════════════════
// 6. SPEND HEATMAP
// ══════════════════════════════════════════════════════════════════════════
function renderSpendHeatmap() {
  const el = document.getElementById('insHeatmap');
  if (!el) return;

  const { start, end } = getPeriodRange();
  // Cap heatmap to last 26 weeks to keep it scannable
  const heatStart = new Date(Math.max(start.getTime(), end.getTime() - 26 * 7 * 86400000));
  // Align to Monday of heatStart week
  const dow = (heatStart.getDay() + 6) % 7; // Mon=0
  const aligned = new Date(heatStart);
  aligned.setDate(aligned.getDate() - dow);

  // Bucket spend by date string
  const byDay = {};
  allExpenses.forEach(e => {
    const d = toDate(e);
    if (d < heatStart || d > end) return;
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    byDay[key] = (byDay[key] || 0) + (e.amount || 0);
  });

  const vals = Object.values(byDay);
  const maxDay = vals.length ? Math.max(...vals) : 1;
  const p20 = maxDay * 0.2, p40 = maxDay * 0.4, p60 = maxDay * 0.6, p80 = maxDay * 0.8;

  function cellColor(v) {
    const dark = isDark();
    if (!v) return dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    if (v < p20) return dark ? 'rgba(16,185,129,0.25)' : 'rgba(5,150,105,0.2)';
    if (v < p40) return dark ? 'rgba(16,185,129,0.45)' : 'rgba(5,150,105,0.38)';
    if (v < p60) return dark ? 'rgba(16,185,129,0.65)' : 'rgba(5,150,105,0.56)';
    if (v < p80) return dark ? 'rgba(251,146,60,0.7)'  : 'rgba(234,88,12,0.6)';
    return dark ? 'rgba(248,113,113,0.8)' : 'rgba(220,38,38,0.7)';
  }

  // Build week columns
  const weeks = [];
  let cur = new Date(aligned);
  while (cur <= end) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(cur);
      dt.setDate(dt.getDate() + d);
      days.push(new Date(dt));
    }
    weeks.push(days);
    cur.setDate(cur.getDate() + 7);
  }

  const dayLabels = ['M','T','W','T','F','S','S'];

  // Label row labels (Mon–Sun on left)
  const rowLabelsHTML = dayLabels.map((l, i) =>
    `<div style="height:13px;line-height:13px;margin-bottom:3px;font-size:0.6rem;color:#525252;width:12px;text-align:center">${i % 2 === 0 ? l : ''}</div>`
  ).join('');

  const weeksHTML = weeks.map((days, wi) => {
    const first = days[0];
    const showLabel = wi === 0 || first.getDate() <= 7;
    const monthLabel = showLabel
      ? first.toLocaleDateString('en-IN', { month: 'short' })
      : '';

    const cellsHTML = days.map((dt, di) => {
      const key = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
      const v = byDay[key] || 0;
      const col = cellColor(v);
      const delay = (wi * 7 + di) * 10;
      const label = dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      return `<div class="ins-heat-cell" data-date="${key}" data-amt="${v}"
                   style="background:${col};animation:insHeatIn 0.3s ease ${delay}ms both"
                   title="${label}: ${v ? formatINR(v) : 'No spending'}"></div>`;
    }).join('');

    return `<div class="ins-heat-col" style="align-items:center">
      <div class="ins-heat-label">${monthLabel}</div>
      ${cellsHTML}
    </div>`;
  }).join('');

  el.innerHTML = `<div class="ins-heatmap-wrap">
    <div style="display:flex;gap:0;align-items:flex-start">
      <div style="display:flex;flex-direction:column;margin-top:14px;margin-right:4px">${rowLabelsHTML}</div>
      <div class="ins-heat-grid">${weeksHTML}</div>
    </div>
    <div style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:0.65rem;color:#525252">
      <span>Less</span>
      ${[0, p20, p40, p60, p80].map(v => `<div style="width:12px;height:12px;border-radius:2px;background:${cellColor(v + 0.01)}"></div>`).join('')}
      <span>More</span>
    </div>
  </div>`;

  el.querySelectorAll('.ins-heat-cell').forEach(cell => {
    cell.addEventListener('mouseenter', e => {
      const v   = +cell.dataset.amt;
      const dt  = cell.dataset.date;
      const [y, m, d] = dt.split('-');
      const dateStr = new Date(+y, +m-1, +d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
      showTip(e, `<div class="ins-tooltip-label">${dateStr}</div>
        <div class="ins-tooltip-val">${v ? formatINR(v) : 'No spending'}</div>`);
    });
    cell.addEventListener('mousemove', e => {
      if (insTooltipEl) { insTooltipEl.style.left = `${e.clientX}px`; insTooltipEl.style.top = `${e.clientY}px`; }
    });
    cell.addEventListener('mouseleave', hideTip);
  });
}

// ══════════════════════════════════════════════════════════════════════════
// 7. BUDGET VS ACTUAL
// ══════════════════════════════════════════════════════════════════════════
function renderBudgetVsActual() {
  const el = document.getElementById('insBudgetVsActual');
  if (!el) return;

  if (!allBudgets.length) {
    el.innerHTML = `<p class="text-sm text-neutral-500 text-center py-4">No budgets set. <a href="#" class="text-emerald-500 hover:underline" onclick="window._navigateTo('budgets')">Add budgets →</a></p>`;
    return;
  }

  const { start, end } = getPeriodRange();
  const exp = allExpenses.filter(e => { const d = toDate(e); return d >= start && d <= end; });

  // Spend per category in period
  const spendByCat = {};
  exp.forEach(e => {
    const k = e.category || e.categoryGroup || 'Other';
    spendByCat[k] = (spendByCat[k] || 0) + (e.amount || 0);
    if (e.categoryGroup && e.categoryGroup !== e.category) {
      spendByCat[e.categoryGroup] = (spendByCat[e.categoryGroup] || 0) + (e.amount || 0);
    }
  });

  // Scale budget limit by period months
  const months = insPeriod === '3m' ? 3 : insPeriod === '6m' ? 6 : insPeriod === '2y' ? 24 : insPeriod === 'all' ? 12 : 12;

  const rows = allBudgets.slice(0, 8).map(b => {
    const actual     = spendByCat[b.category] || 0;
    const budgetAmt  = (b.limit || 0) * months;
    const over       = actual > budgetAmt;
    const pctActual  = budgetAmt > 0 ? Math.min((actual / budgetAmt) * 100, 150) : 0;
    const c = clr();
    const barCol     = over ? c.exp : '#10b981';
    return { name: b.category, actual, budgetAmt, over, pctActual, barCol };
  });

  const maxAmt = Math.max(...rows.map(r => Math.max(r.actual, r.budgetAmt)), 1);

  el.innerHTML = rows.map((r, i) => {
    const bPct = (r.budgetAmt / maxAmt * 100).toFixed(1);
    const aPct = (r.actual / maxAmt * 100).toFixed(1);
    const delay = i * 55;
    return `<div style="margin-bottom:0.75rem;animation:txRowIn 0.22s ease ${delay}ms both">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:0.8125rem;color:${isDark() ? '#d4d4d4' : '#27272a'}">${r.name}</span>
        <span style="font-size:0.7rem;font-family:'DM Mono',monospace;color:${r.over ? clr().exp : '#737373'}">
          ${compactINR(r.actual)} / ${compactINR(r.budgetAmt)}${r.over ? ' ↑' : ''}
        </span>
      </div>
      <div style="position:relative;height:6px;border-radius:999px;background:${isDark() ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}">
        <div style="position:absolute;top:0;left:0;height:100%;width:${bPct}%;
                    border-radius:999px;background:${isDark() ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}"></div>
        <div style="position:absolute;top:0;left:0;height:100%;width:${aPct}%;
                    border-radius:999px;background:${r.barCol};
                    transform-origin:left;animation:barGrow 0.6s cubic-bezier(0.4,0,0.2,1) ${delay}ms both"></div>
      </div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════════════════
// 8. NET WORTH TRAJECTORY
// ══════════════════════════════════════════════════════════════════════════
function renderNWTrajectory() {
  const el = document.getElementById('insNWTrajectory');
  if (!el) return;

  const buckets = getMonthBuckets();

  // Current NW
  const assets = allAccounts.filter(a => a.type !== 'credit').reduce((s, a) => s + (a.balance || 0), 0);
  const liabilities = allDebts.reduce((s, d) => s + (d.remaining || 0), 0);
  const currentNW = assets - liabilities;

  // Reconstruct by walking backward: NW[i] = NW[i+1] - netSavings[i+1]
  // netSavings per month = income - expense
  allIncome.forEach(item => {
    const d = toDate(item);
    const b = buckets.find(b => b.year === d.getFullYear() && b.month === d.getMonth());
    if (b) b.income += item.amount || 0;
  });
  allExpenses.forEach(item => {
    const d = toDate(item);
    const b = buckets.find(b => b.year === d.getFullYear() && b.month === d.getMonth());
    if (b) b.expense += item.amount || 0;
  });

  // Walk backward from current NW
  const nwValues = new Array(buckets.length);
  nwValues[buckets.length - 1] = currentNW;
  for (let i = buckets.length - 2; i >= 0; i--) {
    const netNext = buckets[i + 1].income - buckets[i + 1].expense;
    nwValues[i] = nwValues[i + 1] - netNext;
  }

  const W = 600, H = 200;
  const padL = 56, padR = 12, padT = 16, padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;
  const c = clr();

  const minV = Math.min(...nwValues, 0);
  const maxV = Math.max(...nwValues, 1);
  const range = maxV - minV || 1;
  const zeroY = padT + chartH - (0 - minV) / range * chartH;

  const pts = nwValues.map((v, i) => [
    padL + (i / Math.max(buckets.length - 1, 1)) * chartW,
    padT + chartH - (v - minV) / range * chartH,
  ]);

  const linePath = smoothPath(pts);
  const areaD = `${linePath} L ${pts[pts.length - 1][0].toFixed(1)} ${Math.min(zeroY, padT + chartH).toFixed(1)} L ${pts[0][0].toFixed(1)} ${Math.min(zeroY, padT + chartH).toFixed(1)} Z`;
  const pathLen = linePath.length * 3;
  const gId = 'nwGrad';

  const gridLines = [0.25, 0.5, 0.75, 1].map(p => {
    const v = minV + p * range;
    const y = (padT + chartH - p * chartH).toFixed(1);
    return `<line x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}" stroke="${c.grid}" stroke-width="1"/>
            <text x="${(padL - 4).toFixed(1)}" y="${y}" text-anchor="end" dominant-baseline="middle"
                  font-size="9" fill="${c.txt}" font-family="DM Mono,monospace">${compactINR(v)}</text>`;
  }).join('');

  const xLabels = buckets.map((b, i) => {
    const show = buckets.length <= 12 || i % 2 === 0 || i === buckets.length - 1;
    if (!show) return '';
    const x = padL + (i / Math.max(buckets.length - 1, 1)) * chartW;
    return `<text x="${x.toFixed(1)}" y="${H - 4}" text-anchor="middle"
                  font-size="9" fill="${c.txt}" font-family="DM Sans,sans-serif">${b.label}</text>`;
  }).join('');

  const zeroLine = minV < 0 && maxV > 0
    ? `<line x1="${padL}" x2="${W - padR}" y1="${zeroY.toFixed(1)}" y2="${zeroY.toFixed(1)}"
             stroke="${c.axis}" stroke-width="1" stroke-dasharray="4,3"/>`
    : '';

  const lastPt = pts[pts.length - 1];

  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;overflow:visible">
    <defs>
      <linearGradient id="${gId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${c.inc}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="${c.inc}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${gridLines}
    ${zeroLine}
    <path d="${areaD}" fill="url(#${gId})"/>
    <path d="${linePath}" fill="none" stroke="${c.inc}" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"
          style="--path-len:${pathLen};stroke-dasharray:${pathLen};
                 animation:insLineDraw 1s cubic-bezier(0.4,0,0.2,1) both"/>
    <circle cx="${lastPt[0].toFixed(1)}" cy="${lastPt[1].toFixed(1)}" r="4"
            fill="${c.dot}" stroke="${c.inc}" stroke-width="2"
            style="animation:insHeatIn 0.4s ease 0.9s both"/>
    ${xLabels}
  </svg>`;

  // Hover — overlay transparent rect and find nearest point
  el.addEventListener('mousemove', e => {
    const rect  = el.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgX   = (mouseX / rect.width) * W;
    let minDist  = Infinity, nearI = 0;
    pts.forEach(([x], i) => { const d = Math.abs(x - svgX); if (d < minDist) { minDist = d; nearI = i; } });
    const b = buckets[nearI];
    const v = nwValues[nearI];
    showTip(e, `<div class="ins-tooltip-label">${b.shortYear}</div>
      <div class="ins-tooltip-val">${formatINR(v)}</div>
      <div class="ins-tooltip-label">Est. net worth</div>`);
  });
  el.addEventListener('mouseleave', hideTip);
}

// ══════════════════════════════════════════════════════════════════════════
// 9. INVESTMENT PERFORMANCE — Grouped bars (invested vs current)
// ══════════════════════════════════════════════════════════════════════════
function renderInvestmentPerformance() {
  const el = document.getElementById('insInvPerf');
  if (!el) return;

  if (!allInvestments.length) {
    el.innerHTML = `<p class="text-sm text-neutral-500 text-center py-4">No investments added yet.</p>`;
    return;
  }

  const items = allInvestments.slice(0, 10);
  const c = clr();
  const maxAmt = Math.max(...items.flatMap(i => [i.invested || 0, i.currentValue || 0]), 1);

  el.innerHTML = items.map((inv, i) => {
    const invested = inv.invested || 0;
    const current  = inv.currentValue || 0;
    const gain     = current - invested;
    const gainPct  = invested > 0 ? ((gain / invested) * 100).toFixed(1) : 0;
    const isGain   = gain >= 0;
    const invPct   = (invested / maxAmt * 100).toFixed(1);
    const curPct   = (current  / maxAmt * 100).toFixed(1);
    const delay    = i * 60;
    const col      = INV_COLORS[i % INV_COLORS.length];

    return `<div style="margin-bottom:0.875rem;animation:txRowIn 0.22s ease ${delay}ms both">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
        <div>
          <span style="font-size:0.8125rem;color:${isDark() ? '#d4d4d4' : '#27272a'}">${inv.name}</span>
          <span style="font-size:0.7rem;color:#737373;margin-left:0.4rem">${inv.type || ''}</span>
        </div>
        <span style="font-size:0.7rem;font-family:'DM Mono',monospace;color:${isGain ? c.inc : c.exp}">
          ${isGain ? '+' : ''}${gainPct}%
        </span>
      </div>
      <div style="position:relative;height:7px;border-radius:999px;background:${isDark() ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'}">
        <div style="position:absolute;top:0;left:0;height:100%;width:${invPct}%;
                    border-radius:999px;background:${isDark() ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'};
                    transform-origin:left;animation:barGrow 0.6s cubic-bezier(0.4,0,0.2,1) ${delay}ms both">
        </div>
        <div style="position:absolute;top:0;left:0;height:100%;width:${curPct}%;
                    border-radius:999px;background:${col};opacity:0.85;
                    transform-origin:left;animation:barGrow 0.6s cubic-bezier(0.4,0,0.2,1) ${delay + 30}ms both">
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:3px">
        <span style="font-size:0.65rem;color:#737373">Invested: ${compactINR(invested)}</span>
        <span style="font-size:0.65rem;font-family:'DM Mono',monospace;color:${isDark() ? '#d4d4d4' : '#27272a'}">Now: ${compactINR(current)}</span>
      </div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════════════════════
// 10. PORTFOLIO ALLOCATION — Ring chart
// ══════════════════════════════════════════════════════════════════════════
function renderPortfolioAllocation() {
  const el = document.getElementById('insPortfolioRing');
  const legEl = document.getElementById('insPortfolioLegend');
  if (!el || !allInvestments.length) {
    if (el) el.innerHTML = `<p class="text-sm text-neutral-500 text-center py-6">No investments.</p>`;
    return;
  }

  // Group by type, use currentValue
  const byType = {};
  allInvestments.forEach(inv => {
    const k = inv.type || 'Other';
    byType[k] = (byType[k] || 0) + (inv.currentValue || 0);
  });

  const total = Object.values(byType).reduce((s, v) => s + v, 0);
  if (!total) { el.innerHTML = `<p class="text-sm text-neutral-500 text-center py-6">No data.</p>`; return; }

  let sorted = Object.entries(byType).sort((a, b) => b[1] - a[1]);

  const size = 140, cx = size / 2, cy = size / 2;
  const outerR = 60, innerR = 36;
  let cumAngle = -Math.PI / 2;

  const arcs = sorted.map(([name, val], idx) => {
    const frac  = val / total;
    const angle = frac * 2 * Math.PI;
    const startA = cumAngle;
    const endA   = cumAngle + angle;
    cumAngle = endA;

    const x1 = cx + outerR * Math.cos(startA), y1 = cy + outerR * Math.sin(startA);
    const x2 = cx + outerR * Math.cos(endA),   y2 = cy + outerR * Math.sin(endA);
    const xi1 = cx + innerR * Math.cos(endA),  yi1 = cy + innerR * Math.sin(endA);
    const xi2 = cx + innerR * Math.cos(startA),yi2 = cy + innerR * Math.sin(startA);
    const lg  = angle > Math.PI ? 1 : 0;
    const col = INV_COLORS[idx % INV_COLORS.length];
    const pct = Math.round(frac * 100);

    const pathD = frac > 0.999
      ? `M ${cx} ${cy - outerR} A ${outerR} ${outerR} 0 1 1 ${cx - 0.001} ${cy - outerR} Z M ${cx} ${cy - innerR} A ${innerR} ${innerR} 0 1 0 ${cx - 0.001} ${cy - innerR} Z`
      : `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${outerR} ${outerR} 0 ${lg} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${xi1.toFixed(2)} ${yi1.toFixed(2)} A ${innerR} ${innerR} 0 ${lg} 0 ${xi2.toFixed(2)} ${yi2.toFixed(2)} Z`;

    return { pathD, col, name, val, pct, delay: idx * 70 };
  });

  const c = clr();
  el.innerHTML = `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="display:block">
    ${arcs.map(({ pathD, col, name, val, pct, delay }) => `
      <path d="${pathD}" fill="${col}" opacity="0.9"
            style="animation:insHeatIn 0.4s cubic-bezier(0.34,1.2,0.64,1) ${delay}ms both;cursor:default">
        <title>${name}: ${formatINR(val)} (${pct}%)</title>
      </path>`).join('')}
    <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="12" font-weight="600"
          font-family="DM Mono,monospace" fill="${c.ttTxt}">${compactINR(total)}</text>
    <text x="${cx}" y="${cy + 9}" text-anchor="middle" font-size="7.5"
          font-family="DM Sans,sans-serif" fill="${c.txt}">portfolio</text>
  </svg>`;

  if (legEl) {
    legEl.innerHTML = arcs.map(({ col, name, val, pct }, i) => `
      <div class="ins-legend-row" style="animation:insHeatIn 0.3s ease ${i * 50 + 200}ms both">
        <span class="ins-legend-dot" style="background:${col}"></span>
        <span class="ins-legend-label">${name}</span>
        <span class="ins-legend-val">${compactINR(val)}</span>
        <span class="ins-legend-label" style="width:2rem;text-align:right">${pct}%</span>
      </div>`).join('');
  }
}

// ══════════════════════════════════════════════════════════════════════════
// ORCHESTRATION
// ══════════════════════════════════════════════════════════════════════════
function refreshInsights() {
  // Always render KPI strip regardless of tab
  renderKPIStrip();

  if (insTab === 'overview') {
    renderStackedBar();
    renderSpendingMix();
    renderSavingsRateTrend();
  } else if (insTab === 'spending') {
    renderCategoryBreakdown();
    renderSpendHeatmap();
    renderBudgetVsActual();
  } else if (insTab === 'networth') {
    renderNWTrajectory();
  } else if (insTab === 'investments') {
    renderInvestmentPerformance();
    renderPortfolioAllocation();
  }
}

// ── Public API ─────────────────────────────────────────────────────────────
window._insSetPeriod = (p) => {
  insPeriod = p;
  updatePeriodUI();
  refreshInsights();
};

window._insSetTab = (t) => {
  insTab = t;
  updateTabUI();
  refreshInsights();
};

// ── Apply default report period from settings ──────────────────────────────
function applyDefaultPeriod() {
  const rangeDefault = getSettings().reportDateRangeDefault;
  const periodMap = { 'this-month': '3m', 'last-month': '3m', 'this-fy': '1y' };
  const mapped = periodMap[rangeDefault] || '1y';
  if (insPeriod !== mapped) {
    insPeriod = mapped;
    updatePeriodUI();
  }
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
window.addEventListener('netwrth:userReady', () => {
  applyDefaultPeriod();
  refreshInsights();
});

window.addEventListener('netwrth:dataChanged', () => {
  const section = document.getElementById('section-insights');
  if (!section || section.classList.contains('hidden')) return;
  refreshInsights();
});

window.addEventListener('netwrth:settingsChanged', ({ detail: { key } }) => {
  if (['savingsRateTarget', 'ignoredReportCategories', 'reportDateRangeDefault', 'numberFormat'].includes(key)) {
    if (key === 'reportDateRangeDefault') applyDefaultPeriod();
    refreshInsights();
  }
});

// Re-render on navigate to Insights (theme may have changed between visits)
document.addEventListener('DOMContentLoaded', () => {
  const navLink = document.querySelector('.nav-link[data-section="insights"]');
  if (navLink) {
    navLink.addEventListener('click', () => setTimeout(refreshInsights, 60));
  }
});
