// js/dashboard.js
// ─── Dashboard Module ─────────────────────────────────────────────────────

import { formatINR, openModal, closeAllModals } from "./ui.js";
import { allExpenses }                           from "./expenses.js";
import { allIncome }                             from "./income.js";
import { allInvestments }                        from "./investments.js";
import { allDebts }                              from "./debts.js";

// ── Per-card filter state ──────────────────────────────────────────────────
// mode: 'allTime' | 'cycle' | 'pastDays' | 'dateRange'
const thisYear = new Date().getFullYear();
const _defaultCycle = {
  mode:        'cycle',
  cycleAmount: 1,
  cycleUnit:   'month',
  cycleStart:  `${thisYear}-01-01`,
};

const cardFilters = {
  netWorth: { mode: 'allTime' },
  income:   { ..._defaultCycle },
  expenses: { ..._defaultCycle },
  savings:  { ..._defaultCycle },
};

// ── Date helpers ──────────────────────────────────────────────────────────
function toDate(item) {
  return item.date?.toDate ? item.date.toDate() : new Date(item.date);
}

// Step a date forward/backward by N units (calendar-aware)
function stepDate(date, amount, unit) {
  const d = new Date(date);
  if (unit === 'day')   d.setDate(d.getDate()         + amount);
  if (unit === 'week')  d.setDate(d.getDate()         + amount * 7);
  if (unit === 'month') d.setMonth(d.getMonth()       + amount);
  if (unit === 'year')  d.setFullYear(d.getFullYear() + amount);
  return d;
}

function getDateRange(filter) {
  const now = new Date();

  if (filter.mode === 'allTime') {
    return { start: new Date(0), end: new Date(9999, 11, 31) };
  }

  if (filter.mode === 'pastDays') {
    const start = new Date(now);
    start.setDate(start.getDate() - (filter.pastDays || 30));
    start.setHours(0, 0, 0, 0);
    return { start, end: now };
  }

  if (filter.mode === 'dateRange') {
    const start = filter.rangeStart ? new Date(filter.rangeStart) : new Date(0);
    const end   = filter.rangeEnd   ? new Date(filter.rangeEnd)   : new Date(9999, 11, 31);
    if (filter.rangeEnd) end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  // 'cycle' — walk forward from origin until we find the window containing now
  const origin = filter.cycleStart ? new Date(filter.cycleStart) : new Date(now.getFullYear(), 0, 1);
  const amount = filter.cycleAmount || 1;
  const unit   = filter.cycleUnit   || 'month';

  if (now < origin) {
    // now is before the cycle start — show first window
    const end = new Date(stepDate(origin, amount, unit).getTime() - 1);
    return { start: origin, end };
  }

  let wStart = new Date(origin);
  let wEnd   = stepDate(wStart, amount, unit);

  while (wEnd <= now) {
    wStart = new Date(wEnd);
    wEnd   = stepDate(wStart, amount, unit);
  }

  return { start: wStart, end: new Date(wEnd.getTime() - 1) };
}

function getPrevRange(filter) {
  if (filter.mode === 'allTime' || filter.mode === 'dateRange') return null;

  const cur = getDateRange(filter);

  if (filter.mode === 'pastDays') {
    const days     = filter.pastDays || 30;
    const prevEnd  = new Date(cur.start.getTime() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - days + 1);
    prevStart.setHours(0, 0, 0, 0);
    return { start: prevStart, end: prevEnd };
  }

  // cycle — go one step back
  const amount    = filter.cycleAmount || 1;
  const unit      = filter.cycleUnit   || 'month';
  const prevEnd   = new Date(cur.start.getTime() - 1);
  const prevStart = stepDate(cur.start, -amount, unit);
  return { start: prevStart, end: prevEnd };
}

function filterByRange(arr, range) {
  return arr.filter(item => {
    const d = toDate(item);
    return d >= range.start && d <= range.end;
  });
}

function sum(arr) {
  return arr.reduce((s, item) => s + (item.amount || 0), 0);
}

function formatDelta(current, prev) {
  if (!prev) return null;
  const pct  = Math.round(((current - prev) / Math.abs(prev)) * 100);
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct}%`;
}

// ── Filter label shown on the card button ─────────────────────────────────
function getFilterLabel(filter) {
  if (filter.mode === 'allTime')  return 'All Time';
  if (filter.mode === 'pastDays') return `Last ${filter.pastDays || 30}d`;

  if (filter.mode === 'dateRange') {
    if (!filter.rangeStart) return 'Custom';
    const s = new Date(filter.rangeStart).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return filter.rangeEnd ? `${s} →` : `${s} – ∞`;
  }

  // cycle: show the computed current window compactly
  const { start, end } = getDateRange(filter);
  const fmt = d => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${fmt(start)} – ${fmt(end)}`;
}

// ── Update all filter button labels on the cards ───────────────────────────
function updateAllFilterBtns() {
  ['netWorth', 'income', 'expenses', 'savings'].forEach(key => {
    const btn = document.getElementById(`filterBtn_${key}`);
    if (btn) btn.textContent = getFilterLabel(cardFilters[key]);
  });
}

// ── Category breakdown helper ─────────────────────────────────────────────
function renderCatBreakdown(items, amtClass, barClass, emptyMsg) {
  const byCat = {};
  items.forEach(e => {
    const k = e.category || e.categoryGroup || e.type || e.typeGroup || "Other";
    byCat[k] = (byCat[k] || 0) + (e.amount || 0);
  });
  const total  = Object.values(byCat).reduce((s, v) => s + v, 0);
  const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 6);

  if (!sorted.length) return `<p class="text-sm text-neutral-500 text-center py-3">${emptyMsg}</p>`;

  return sorted.map(([cat, amt]) => {
    const pct = total ? Math.round((amt / total) * 100) : 0;
    return `
      <div class="exp-breakdown-row">
        <div class="exp-breakdown-info">
          <span class="exp-breakdown-cat">${cat}</span>
          <span class="exp-breakdown-meta ${amtClass}">${formatINR(amt)} · ${pct}%</span>
        </div>
        <div class="exp-breakdown-track rounded-full">
          <div class="budget-bar h-full rounded-full ${barClass}" style="width:${pct}%"></div>
        </div>
      </div>`;
  }).join("");
}

function renderRecentRows(items, type) {
  if (!items.length) return "";
  const sorted = [...items].sort((a, b) => toDate(b) - toDate(a)).slice(0, 5);
  const isExp  = type === "expense";
  const amtCls = isExp ? "text-red-400" : "text-emerald-400";
  const sign   = isExp ? "−" : "+";
  const editFn = isExp ? "window._editExpense" : "window._editIncome";
  const label  = (tx) => isExp ? tx.description : tx.source;
  const sub    = (tx) => isExp ? tx.category : (tx.type || "");

  return `
    <p class="text-xs text-neutral-500 pt-1 uppercase tracking-wide font-medium">Recent</p>
    ${sorted.map(tx => `
      <div class="flex items-center justify-between py-1.5 border-b border-neutral-800/50 last:border-0
                  cursor-pointer hover:bg-neutral-800/30 rounded-lg px-2 transition"
           onclick="window.closeAllModals?.();${editFn}('${tx.id}')">
        <div class="min-w-0">
          <p class="text-sm font-medium truncate">${label(tx) || "—"}</p>
          <p class="text-xs text-neutral-500">${toDate(tx).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}${sub(tx) ? " · " + sub(tx) : ""}</p>
        </div>
        <span class="font-mono text-sm ${amtCls} shrink-0 ml-3">${sign}${formatINR(tx.amount)}</span>
      </div>`).join("")}`;
}

// ── Period Picker ──────────────────────────────────────────────────────────
let _pickerCardKey = null;
let _pickerDraft   = null;

window._openPeriodPicker = function (cardKey) {
  _pickerCardKey = cardKey;
  _pickerDraft   = { ...cardFilters[cardKey] };

  const labels = { netWorth: 'Net Worth', income: 'Income', expenses: 'Expenses', savings: 'Savings Rate' };
  document.getElementById('periodPickerTitle').textContent = `Period · ${labels[cardKey]}`;

  _renderPickerBody();
  openModal('periodPickerModal');
};

function _renderPickerBody() {
  const f      = _pickerDraft;
  const body   = document.getElementById('periodPickerBody');

  // Cycle config values (with fallbacks)
  const cycleStart  = f.cycleStart  || `${new Date().getFullYear()}-01-01`;
  const cycleAmount = f.cycleAmount || 1;
  const cycleUnit   = f.cycleUnit   || 'month';
  const pastDays    = f.pastDays    || 30;
  const rangeStart  = f.rangeStart  || `${new Date().getFullYear()}-01-01`;
  const rangeEnd    = f.rangeEnd    || '';

  // Compute the cycle window preview
  const cyclePreview = (() => {
    const draft = { mode: 'cycle', cycleStart, cycleAmount, cycleUnit };
    const { start, end } = getDateRange(draft);
    const fmt = d => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}`;
  })();

  body.innerHTML = `
    <!-- All Time -->
    <div class="period-mode-row ${f.mode === 'allTime' ? 'active' : ''}"
         onclick="window._ppSelectMode('allTime')">
      <div class="period-mode-header">
        <span class="period-mode-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
        </span>
        <span class="period-mode-label">All Time</span>
        ${f.mode === 'allTime' ? '<span class="period-mode-check">✓</span>' : ''}
      </div>
    </div>

    <!-- Cycle -->
    <div class="period-mode-row ${f.mode === 'cycle' ? 'active' : ''}"
         onclick="window._ppSelectMode('cycle')">
      <div class="period-mode-header">
        <span class="period-mode-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        </span>
        <span class="period-mode-label">Cycle</span>
        ${f.mode === 'cycle' ? '<span class="period-mode-check">✓</span>' : ''}
      </div>
      ${f.mode === 'cycle' ? `
        <div class="period-mode-config" onclick="event.stopPropagation()">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-neutral-500 text-xs">Every</span>
            <input id="pp_cycleAmount" type="number" min="1" max="99" value="${cycleAmount}"
              class="form-input py-1 font-mono text-center" style="width:3.5rem"
              oninput="window._ppUpdateDraft()" />
            <select id="pp_cycleUnit" class="select-input py-1" onchange="window._ppUpdateDraft()">
              <option value="day"   ${cycleUnit==='day'   ?'selected':''}>day</option>
              <option value="week"  ${cycleUnit==='week'  ?'selected':''}>week</option>
              <option value="month" ${cycleUnit==='month' ?'selected':''}>month</option>
              <option value="year"  ${cycleUnit==='year'  ?'selected':''}>year</option>
            </select>
          </div>
          <div class="flex items-center gap-2 mt-2">
            <span class="text-neutral-500 text-xs">beginning</span>
            <input id="pp_cycleStart" type="date" value="${cycleStart}"
              class="form-input py-1 flex-1" oninput="window._ppUpdateDraft()" />
          </div>
          <p id="pp_cyclePreview" class="text-xs text-neutral-500 font-mono mt-2">${cyclePreview}</p>
        </div>` : ''}
    </div>

    <!-- Past Days -->
    <div class="period-mode-row ${f.mode === 'pastDays' ? 'active' : ''}"
         onclick="window._ppSelectMode('pastDays')">
      <div class="period-mode-header">
        <span class="period-mode-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
        </span>
        <span class="period-mode-label">Past Days</span>
        ${f.mode === 'pastDays' ? '<span class="period-mode-check">✓</span>' : ''}
      </div>
      ${f.mode === 'pastDays' ? `
        <div class="period-mode-config" onclick="event.stopPropagation()">
          <div class="flex items-center gap-2">
            <span class="text-neutral-500 text-xs">Previous</span>
            <input id="pp_pastDays" type="number" min="1" max="3650" value="${pastDays}"
              class="form-input py-1 font-mono text-center" style="width:4rem"
              oninput="window._ppUpdateDraft()" />
            <span class="text-neutral-500 text-xs">days</span>
          </div>
        </div>` : ''}
    </div>

    <!-- Date Range -->
    <div class="period-mode-row ${f.mode === 'dateRange' ? 'active' : ''}"
         onclick="window._ppSelectMode('dateRange')">
      <div class="period-mode-header">
        <span class="period-mode-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
        </span>
        <span class="period-mode-label">Date Range</span>
        ${f.mode === 'dateRange' ? '<span class="period-mode-check">✓</span>' : ''}
      </div>
      ${f.mode === 'dateRange' ? `
        <div class="period-mode-config" onclick="event.stopPropagation()">
          <div class="space-y-2">
            <input id="pp_rangeStart" type="date" value="${rangeStart}"
              class="form-input py-1 w-full" oninput="window._ppUpdateDraft()" />
            <input id="pp_rangeEnd" type="date" value="${rangeEnd}"
              class="form-input py-1 w-full" placeholder="Until forever"
              oninput="window._ppUpdateDraft()" />
          </div>
        </div>` : ''}
    </div>
  `;
}

window._ppSelectMode = function (mode) {
  _pickerDraft.mode = mode;
  _renderPickerBody();
};

window._ppUpdateDraft = function () {
  const f = _pickerDraft;
  if (f.mode === 'cycle') {
    f.cycleAmount = parseInt(document.getElementById('pp_cycleAmount')?.value) || 1;
    f.cycleUnit   = document.getElementById('pp_cycleUnit')?.value   || 'month';
    f.cycleStart  = document.getElementById('pp_cycleStart')?.value  || '';
    // live-update the window preview
    const { start, end } = getDateRange(f);
    const fmt = d => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const el = document.getElementById('pp_cyclePreview');
    if (el) el.textContent = `${fmt(start)} – ${fmt(end)}`;
  } else if (f.mode === 'pastDays') {
    f.pastDays = parseInt(document.getElementById('pp_pastDays')?.value) || 30;
  } else if (f.mode === 'dateRange') {
    f.rangeStart = document.getElementById('pp_rangeStart')?.value || '';
    f.rangeEnd   = document.getElementById('pp_rangeEnd')?.value   || '';
  }
};

window._applyPeriodFilter = function () {
  window._ppUpdateDraft();                           // sync latest input values
  cardFilters[_pickerCardKey] = { ..._pickerDraft }; // commit to state
  closeAllModals();
  updateAllFilterBtns();
  refreshDashboard();
};

// ── Widget visibility (show/hide, persisted to localStorage) ──────────────
const WIDGET_KEYS = ['recent-transactions', 'budget-overview', 'cashflow-chart', 'investment-widget', 'debt-widget', 'top-spending'];
const DEFAULT_VIS = Object.fromEntries(WIDGET_KEYS.map(k => [k, true]));

function _loadVis() {
  try { return { ...DEFAULT_VIS, ...JSON.parse(localStorage.getItem('netwrth:widgets') || '{}') }; }
  catch { return { ...DEFAULT_VIS }; }
}

let widgetVisibility = _loadVis();

function applyWidgetVisibility() {
  WIDGET_KEYS.forEach(id => {
    const el = document.querySelector(`[data-widget="${id}"]`);
    if (el) el.classList.toggle('hidden', !widgetVisibility[id]);
  });
  document.querySelectorAll('.widget-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', widgetVisibility[btn.dataset.widget] !== false);
  });
}

window._toggleWidget = function (btn) {
  const id = btn.dataset.widget;
  widgetVisibility[id] = !widgetVisibility[id];
  localStorage.setItem('netwrth:widgets', JSON.stringify(widgetVisibility));
  applyWidgetVisibility();
};

window._toggleCustomizePanel = function () {
  document.getElementById('customizePanel')?.classList.toggle('hidden');
};

// ── Compact number format for chart axis ──────────────────────────────────
function compactINR(v) {
  if (!v) return '₹0';
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `₹${Math.round(v / 1e3)}K`;
  return `₹${Math.round(v)}`;
}

// ── Cash Flow Chart (SVG, last 12 months) ─────────────────────────────────
function renderCashFlowChart() {
  const el = document.getElementById('cashFlowChart');
  if (!el) return;

  const now = new Date();
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ label: d.toLocaleDateString('en-IN', { month: 'short' }), year: d.getFullYear(), month: d.getMonth(), income: 0, expense: 0, isCurrent: i === 0 });
  }

  allIncome.forEach(item => {
    const d = toDate(item);
    const m = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth());
    if (m) m.income += item.amount || 0;
  });
  allExpenses.forEach(item => {
    const d = toDate(item);
    const m = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth());
    if (m) m.expense += item.amount || 0;
  });

  const maxVal = Math.max(...months.map(m => Math.max(m.income, m.expense)), 1);
  const isDark  = document.documentElement.classList.contains('dark');
  const gridClr = isDark ? '#262626' : '#e4e4e7';
  const axisClr = isDark ? '#404040' : '#d4d4d8';
  const txtClr  = isDark ? '#525252' : '#a1a1aa';
  const curClr  = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)';

  const W = 600, padL = 44, padR = 8, padTop = 8, padBot = 28;
  const chartH = 130, H = padTop + chartH + padBot;
  const chartW = W - padL - padR;
  const colW   = chartW / 12;
  const barW   = Math.max(colW * 0.33, 4);
  const gap    = colW * 0.05;

  const bx = (i, side) => padL + i * colW + (colW - 2 * barW - gap) / 2 + side * (barW + gap);
  const bh = val => Math.max((val / maxVal) * chartH, val > 0 ? 2 : 0);
  const by = val => padTop + chartH - bh(val);

  const grids = [0.25, 0.5, 0.75, 1].map(pct => {
    const y = padTop + chartH - pct * chartH;
    return `<line x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}" stroke="${gridClr}" stroke-width="1"/>
            <text x="${padL - 4}" y="${y + 3.5}" text-anchor="end" font-size="7.5" fill="${txtClr}">${compactINR(maxVal * pct)}</text>`;
  }).join('');

  const bars = months.map((m, i) => {
    const cx = padL + i * colW + colW / 2;
    const curHL = m.isCurrent ? `<rect x="${padL + i * colW + 1}" y="${padTop}" width="${colW - 2}" height="${chartH}" fill="${curClr}" rx="3"/>` : '';
    return `${curHL}
      <rect x="${bx(i, 0)}" y="${by(m.income)}"  width="${barW}" height="${bh(m.income)}"  rx="2" fill="rgba(52,211,153,0.75)"/>
      <rect x="${bx(i, 1)}" y="${by(m.expense)}" width="${barW}" height="${bh(m.expense)}" rx="2" fill="rgba(248,113,113,0.65)"/>
      <text x="${cx}" y="${H - 8}" text-anchor="middle" font-size="7.5" fill="${m.isCurrent ? (isDark ? '#a3a3a3' : '#71717a') : txtClr}">${m.label}</text>`;
  }).join('');

  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block" xmlns="http://www.w3.org/2000/svg">
    <line x1="${padL}" x2="${padL}" y1="${padTop}" y2="${padTop + chartH}" stroke="${gridClr}" stroke-width="1"/>
    <line x1="${padL}" x2="${W - padR}" y1="${padTop + chartH}" y2="${padTop + chartH}" stroke="${axisClr}" stroke-width="1"/>
    ${grids}${bars}
  </svg>`;
}

// ── Investment Snapshot ────────────────────────────────────────────────────
function renderInvestmentWidget() {
  const el = document.getElementById('investmentWidget');
  if (!el) return;

  if (!allInvestments.length) {
    el.innerHTML = `<p class="text-sm text-neutral-500">No investments added. <span class="text-emerald-400 hover:underline cursor-pointer" onclick="window._navigateTo('investments')">Add one →</span></p>`;
    return;
  }

  const totalValue    = allInvestments.reduce((s, i) => s + (i.currentValue || 0), 0);
  const totalInvested = allInvestments.reduce((s, i) => s + (i.invested    || 0), 0);
  const gain          = totalValue - totalInvested;
  const gainPct       = totalInvested ? ((gain / totalInvested) * 100).toFixed(1) : '0.0';
  const gainCls       = gain >= 0 ? 'text-emerald-400' : 'text-red-400';

  const byType = {};
  allInvestments.forEach(i => { byType[i.type] = (byType[i.type] || 0) + (i.currentValue || 0); });
  const sorted = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 4);

  el.innerHTML = `
    <div class="flex justify-between items-start mb-3">
      <div>
        <p class="text-xl font-mono font-bold">${formatINR(totalValue)}</p>
        <p class="text-xs text-neutral-500 mt-0.5">Portfolio value</p>
      </div>
      <div class="text-right">
        <p class="font-mono text-sm font-semibold ${gainCls}">${gain >= 0 ? '+' : ''}${formatINR(gain)}</p>
        <p class="text-xs text-neutral-500">${gain >= 0 ? '+' : ''}${gainPct}% return</p>
      </div>
    </div>
    <div class="space-y-1">
      ${sorted.map(([type, val]) => {
        const pct = Math.round((val / totalValue) * 100);
        return `<div class="exp-breakdown-row">
          <div class="exp-breakdown-info">
            <span class="exp-breakdown-cat">${type}</span>
            <span class="exp-breakdown-meta text-emerald-400">${pct}%</span>
          </div>
          <div class="exp-breakdown-track rounded-full">
            <div class="budget-bar h-full rounded-full bg-emerald-500/60" style="width:${pct}%"></div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

// ── Debt Snapshot ─────────────────────────────────────────────────────────
function renderDebtWidget() {
  const el = document.getElementById('debtWidget');
  if (!el) return;

  if (!allDebts.length) {
    el.innerHTML = `<p class="text-sm text-neutral-500">No debts recorded. <span class="text-emerald-400 hover:underline cursor-pointer" onclick="window._navigateTo('debts')">Add one →</span></p>`;
    return;
  }

  const totalOwed     = allDebts.reduce((s, d) => s + (d.remaining || 0), 0);
  const totalOriginal = allDebts.reduce((s, d) => s + (d.total     || 0), 0);
  const pct           = totalOriginal ? Math.round(((totalOriginal - totalOwed) / totalOriginal) * 100) : 0;
  const top           = [...allDebts].sort((a, b) => (b.remaining || 0) - (a.remaining || 0)).slice(0, 3);

  el.innerHTML = `
    <div class="flex justify-between items-start mb-2">
      <div>
        <p class="text-xl font-mono font-bold text-red-400">${formatINR(totalOwed)}</p>
        <p class="text-xs text-neutral-500 mt-0.5">Total outstanding</p>
      </div>
      <div class="text-right">
        <p class="font-mono text-sm font-semibold text-emerald-400">${pct}%</p>
        <p class="text-xs text-neutral-500">paid off</p>
      </div>
    </div>
    <div class="h-1.5 rounded-full bg-neutral-800 overflow-hidden mb-3 budget-bar-track">
      <div class="h-full rounded-full bg-emerald-500/70 budget-bar" style="width:${pct}%"></div>
    </div>
    <div class="space-y-2">
      ${top.map(d => {
        const dpct = d.total ? Math.round(((d.total - d.remaining) / d.total) * 100) : 0;
        return `<div>
          <div class="flex justify-between text-sm mb-1">
            <span class="truncate text-neutral-300">${d.name}</span>
            <span class="font-mono text-red-400 shrink-0 ml-2">${formatINR(d.remaining)}</span>
          </div>
          <div class="h-1 rounded-full bg-neutral-800 overflow-hidden budget-bar-track">
            <div class="h-full rounded-full bg-emerald-500/60 budget-bar" style="width:${dpct}%"></div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

// ── Top Spending ───────────────────────────────────────────────────────────
function renderTopSpending() {
  const el = document.getElementById('topSpendingWidget');
  if (!el) return;

  const range    = getDateRange(cardFilters.expenses);
  const expenses = filterByRange(allExpenses, range).sort((a, b) => b.amount - a.amount).slice(0, 5);

  if (!expenses.length) {
    el.innerHTML = `<p class="text-sm text-neutral-500">No expenses this period.</p>`;
    return;
  }

  const maxAmt = expenses[0].amount;
  el.innerHTML = expenses.map((e, i) => `
    <div class="flex items-center gap-2.5 py-1.5 cursor-pointer hover:bg-neutral-800/30 rounded-lg px-1.5 -mx-1.5 transition"
         onclick="window._editExpense('${e.id}')">
      <span class="text-neutral-600 font-mono text-xs w-3 shrink-0">${i + 1}</span>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium truncate">${e.description || '—'}</p>
        <p class="text-xs text-neutral-500">${e.category || ''}</p>
        <div class="mt-1 h-0.5 rounded-full bg-neutral-800 overflow-hidden">
          <div class="h-full rounded-full bg-red-400/60" style="width:${Math.round((e.amount / maxAmt) * 100)}%"></div>
        </div>
      </div>
      <span class="font-mono text-sm text-red-400 shrink-0">${formatINR(e.amount)}</span>
    </div>`).join('');
}

// ── Show detail modal for a card ──────────────────────────────────────────
window._showCardDetail = function (cardKey) {
  const filter     = cardFilters[cardKey];
  const range      = getDateRange(filter);
  const expenses   = filterByRange(allExpenses, range);
  const income     = filterByRange(allIncome,   range);
  const periodLabel = getFilterLabel(filter);

  const title = document.getElementById("cardDetailTitle");
  const body  = document.getElementById("cardDetailBody");
  let html    = "";

  if (cardKey === "netWorth") {
    const totalInc = sum(allIncome);
    const totalExp = sum(allExpenses);
    const net      = totalInc - totalExp;
    const thisMonthRange   = getDateRange({ mode: 'cycle', cycleAmount: 1, cycleUnit: 'month', cycleStart: `${thisYear}-01-01` });
    const thisMonthInc = sum(filterByRange(allIncome,   thisMonthRange));
    const thisMonthExp = sum(filterByRange(allExpenses, thisMonthRange));
    const monthChange  = thisMonthInc - thisMonthExp;

    title.textContent = "Net Worth";
    html = `
      <div class="space-y-3">
        <div class="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <span class="text-sm text-neutral-400">Total Income (All Time)</span>
          <span class="font-mono text-emerald-400 font-semibold">${formatINR(totalInc)}</span>
        </div>
        <div class="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <span class="text-sm text-neutral-400">Total Expenses (All Time)</span>
          <span class="font-mono text-red-400 font-semibold">−${formatINR(totalExp)}</span>
        </div>
        <div class="flex items-center justify-between p-3 rounded-xl bg-neutral-800 border border-neutral-700">
          <span class="text-sm font-semibold">Net Worth</span>
          <span class="font-mono text-xl font-bold ${net >= 0 ? "text-emerald-400" : "text-red-400"}">${formatINR(net)}</span>
        </div>
        <div class="flex items-center justify-between py-1 text-sm">
          <span class="text-neutral-400">This cycle's change</span>
          <span class="font-mono font-medium ${monthChange >= 0 ? "text-emerald-400" : "text-red-400"}">
            ${monthChange >= 0 ? "+" : "−"}${formatINR(Math.abs(monthChange))}
          </span>
        </div>
        <div class="pt-1">
          <p class="text-xs text-neutral-500 uppercase tracking-wide font-medium mb-2">All-time Spending by Category</p>
          ${renderCatBreakdown(allExpenses, "text-red-400", "bg-red-400/60", "No expenses recorded.")}
        </div>
      </div>`;

  } else if (cardKey === "income") {
    const totalInc = sum(income);
    title.textContent = `Income · ${periodLabel}`;
    html = `
      <div class="space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-neutral-800">
          <span class="text-sm text-neutral-400">Total Income</span>
          <span class="font-mono text-emerald-400 font-bold text-lg">${formatINR(totalInc)}</span>
        </div>
        ${renderCatBreakdown(income, "text-emerald-400", "bg-emerald-500/70", "No income in this period.")}
        ${renderRecentRows(income, "income")}
      </div>`;

  } else if (cardKey === "expenses") {
    const totalExp = sum(expenses);
    title.textContent = `Expenses · ${periodLabel}`;
    html = `
      <div class="space-y-3">
        <div class="flex items-center justify-between pb-2 border-b border-neutral-800">
          <span class="text-sm text-neutral-400">Total Spent</span>
          <span class="font-mono text-red-400 font-bold text-lg">${formatINR(totalExp)}</span>
        </div>
        ${renderCatBreakdown(expenses, "text-red-400", "bg-red-400/60", "No expenses in this period.")}
        ${renderRecentRows(expenses, "expense")}
      </div>`;

  } else if (cardKey === "savings") {
    const totalInc   = sum(income);
    const totalExp   = sum(expenses);
    const saved      = totalInc - totalExp;
    const rate       = totalInc ? Math.round((saved / totalInc) * 100) : 0;
    const barColor   = rate >= 20 ? "bg-emerald-500" : rate >= 10 ? "bg-amber-500" : "bg-red-500";
    const mood       = rate >= 20 ? "Great savings rate!" : rate >= 10 ? "Good — keep building!" : "Try to cut expenses.";

    title.textContent = `Savings · ${periodLabel}`;
    html = `
      <div class="space-y-3">
        <div class="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <span class="text-sm text-neutral-400">Income</span>
          <span class="font-mono text-emerald-400 font-semibold">${formatINR(totalInc)}</span>
        </div>
        <div class="flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <span class="text-sm text-neutral-400">Expenses</span>
          <span class="font-mono text-red-400 font-semibold">−${formatINR(totalExp)}</span>
        </div>
        <div class="flex items-center justify-between p-3 rounded-xl bg-neutral-800 border border-neutral-700">
          <span class="text-sm font-semibold">Saved</span>
          <span class="font-mono text-xl font-bold ${saved >= 0 ? "text-emerald-400" : "text-red-400"}">${formatINR(Math.abs(saved))}${saved < 0 ? " deficit" : ""}</span>
        </div>
        <div>
          <div class="flex justify-between text-xs text-neutral-500 mb-1.5">
            <span>Savings Rate</span>
            <span class="font-mono font-medium">${rate}%</span>
          </div>
          <div class="exp-breakdown-track rounded-full h-2.5">
            <div class="budget-bar h-full rounded-full ${barColor}" style="width:${Math.min(Math.max(rate,0),100)}%"></div>
          </div>
          <p class="text-xs text-neutral-500 mt-1.5">${mood}</p>
        </div>
      </div>`;
  }

  body.innerHTML = html;
  openModal("cardDetailModal");
};

// Expose closeAllModals for inline onclick in modal body
window.closeAllModals = closeAllModals;

// ── Render ────────────────────────────────────────────────────────────────
export function refreshDashboard() {

  // ── Income card ──────────────────────────────────────────────────────
  const incRange    = getDateRange(cardFilters.income);
  const incData     = filterByRange(allIncome, incRange);
  const totalIncome = sum(incData);

  document.getElementById("statIncome").textContent = formatINR(totalIncome);

  const incDeltaEl = document.getElementById("deltaIncome");
  if (incDeltaEl) {
    const prevIncRange = getPrevRange(cardFilters.income);
    if (prevIncRange) {
      const prevInc = sum(filterByRange(allIncome, prevIncRange));
      const delta   = formatDelta(totalIncome, prevInc);
      if (delta) {
        incDeltaEl.textContent = `${delta} vs prev period`;
        incDeltaEl.className   = `stat-delta ${totalIncome >= prevInc ? "positive" : "negative"}`;
      } else {
        incDeltaEl.textContent = "— no previous data";
        incDeltaEl.className   = "stat-delta";
      }
    } else {
      incDeltaEl.textContent = `${incData.length} entries`;
      incDeltaEl.className   = "stat-delta";
    }
  }

  // ── Expenses card ────────────────────────────────────────────────────
  const expRange      = getDateRange(cardFilters.expenses);
  const expData       = filterByRange(allExpenses, expRange);
  const totalExpenses = sum(expData);

  document.getElementById("statExpenses").textContent = formatINR(totalExpenses);

  const expDeltaEl = document.getElementById("deltaExpenses");
  if (expDeltaEl) {
    const prevExpRange = getPrevRange(cardFilters.expenses);
    if (prevExpRange) {
      const prevExp = sum(filterByRange(allExpenses, prevExpRange));
      const delta   = formatDelta(totalExpenses, prevExp);
      if (delta) {
        const isPos = totalExpenses <= prevExp; // lower spend = positive
        expDeltaEl.textContent = `${delta} vs prev period`;
        expDeltaEl.className   = `stat-delta ${isPos ? "positive" : "negative"}`;
      } else {
        expDeltaEl.textContent = "— no previous data";
        expDeltaEl.className   = "stat-delta";
      }
    } else {
      expDeltaEl.textContent = `${expData.length} transactions`;
      expDeltaEl.className   = "stat-delta";
    }
  }

  // ── Savings card ─────────────────────────────────────────────────────
  const savRange    = getDateRange(cardFilters.savings);
  const savIncData  = filterByRange(allIncome,   savRange);
  const savExpData  = filterByRange(allExpenses, savRange);
  const savTotalInc = sum(savIncData);
  const savTotalExp = sum(savExpData);
  const savings     = savTotalInc - savTotalExp;
  const savingsRate = savTotalInc ? Math.round((savings / savTotalInc) * 100) : 0;

  document.getElementById("statSavings").textContent = `${savingsRate}%`;

  const savDeltaEl = document.getElementById("deltaSavings");
  if (savDeltaEl) {
    if (savTotalInc) {
      savDeltaEl.textContent = savings >= 0
        ? `${formatINR(savings)} saved`
        : `${formatINR(Math.abs(savings))} deficit`;
      savDeltaEl.className = `stat-delta ${savings >= 0 ? "positive" : "negative"}`;
    } else {
      savDeltaEl.textContent = "— of income saved";
      savDeltaEl.className   = "stat-delta";
    }
  }

  // ── Net Worth card ───────────────────────────────────────────────────
  const nwRange   = getDateRange(cardFilters.netWorth);
  const nwIncData = filterByRange(allIncome,   nwRange);
  const nwExpData = filterByRange(allExpenses, nwRange);
  const netWorth  = sum(nwIncData) - sum(nwExpData);

  document.getElementById("statNetWorth").textContent = formatINR(netWorth);

  const nwDeltaEl = document.getElementById("deltaNetWorth");
  if (nwDeltaEl) {
    if (cardFilters.netWorth.mode === 'allTime') {
      // Show this cycle's change
      const curCycle    = getDateRange({ mode: 'cycle', cycleAmount: 1, cycleUnit: 'month', cycleStart: `${thisYear}-01-01` });
      const cycleInc    = sum(filterByRange(allIncome,   curCycle));
      const cycleExp    = sum(filterByRange(allExpenses, curCycle));
      const change      = cycleInc - cycleExp;
      nwDeltaEl.textContent = change >= 0
        ? `+${formatINR(change)} this cycle`
        : `−${formatINR(Math.abs(change))} this cycle`;
      nwDeltaEl.className = `stat-delta ${change >= 0 ? "positive" : "negative"}`;
    } else {
      const prevNwRange = getPrevRange(cardFilters.netWorth);
      if (prevNwRange) {
        const prevInc = sum(filterByRange(allIncome,   prevNwRange));
        const prevExp = sum(filterByRange(allExpenses, prevNwRange));
        const prevNet = prevInc - prevExp;
        const delta   = formatDelta(netWorth, prevNet);
        if (delta) {
          nwDeltaEl.textContent = `${delta} vs prev period`;
          nwDeltaEl.className   = `stat-delta ${netWorth >= prevNet ? "positive" : "negative"}`;
        } else {
          nwDeltaEl.textContent = "— no previous data";
          nwDeltaEl.className   = "stat-delta";
        }
      }
    }
  }

  // ── Update filter button labels ──────────────────────────────────────
  updateAllFilterBtns();

  // ── New widgets ───────────────────────────────────────────────────────
  renderCashFlowChart();
  renderInvestmentWidget();
  renderDebtWidget();
  renderTopSpending();
  applyWidgetVisibility();

  // ── Recent transactions (latest 8, expense + income merged) ─────────
  const allTx = [
    ...allExpenses.map(e => ({ ...e, _type: "expense" })),
    ...allIncome.map(i  => ({ ...i,  _type: "income"  })),
  ].sort((a, b) => toDate(b) - toDate(a)).slice(0, 8);

  const txContainer = document.getElementById("recentTransactions");
  if (!allTx.length) {
    txContainer.innerHTML = `<p class="text-sm text-neutral-500">No transactions yet.</p>`;
    return;
  }

  txContainer.innerHTML = allTx.map((tx, i) => {
    const date   = toDate(tx).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const label  = tx._type === "expense" ? tx.description : tx.source;
    const sub    = tx.category || tx.type || "";
    const amtCls = tx._type === "expense" ? "text-red-400" : "text-emerald-400";
    const sign   = tx._type === "expense" ? "−" : "+";
    const delay  = i * 35;
    return `
      <div class="tx-row flex items-center justify-between border-b border-neutral-800/60 last:border-0 cursor-pointer"
           style="animation-delay:${delay}ms"
           onclick="window._edit${tx._type === "expense" ? "Expense" : "Income"}('${tx.id}')"
           title="Click to edit">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="shrink-0 text-base">${tx._type === "expense" ? "↓" : "↑"}</span>
          <div class="min-w-0">
            <p class="text-sm font-medium truncate">${label}</p>
            <p class="text-xs text-neutral-500">${date}${sub ? " · " + sub : ""}</p>
          </div>
        </div>
        <span class="tx-amount font-mono text-sm ${amtCls} shrink-0 ml-3">${sign}${formatINR(tx.amount)}</span>
      </div>`;
  }).join("");
}

// ── Reactivity ────────────────────────────────────────────────────────────
window.addEventListener("netwrth:dataChanged", refreshDashboard);
