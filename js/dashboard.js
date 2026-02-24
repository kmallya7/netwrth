// js/dashboard.js
// ─── Dashboard Module ─────────────────────────────────────────────────────

import { formatINR, openModal, closeAllModals } from "./ui.js";
import { allExpenses }                           from "./expenses.js";
import { allIncome }                             from "./income.js";
import { allInvestments }                        from "./investments.js";
import { allDebts }                              from "./debts.js";

// ── Cash flow period filter state ─────────────────────────────────────────
let cashFlowPeriod      = '12m';
let cashFlowCustomStart = null; // 'YYYY-MM'
let cashFlowCustomEnd   = null; // 'YYYY-MM'

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
const WIDGET_KEYS   = ['month-pulse', 'recent-transactions', 'budget-overview', 'cashflow-chart', 'investment-widget', 'debt-widget', 'top-spending'];
const WIDGET_LABELS = {
  'month-pulse':         'Month Pulse',
  'recent-transactions': 'Recent Transactions',
  'budget-overview':     'Budget Overview',
  'cashflow-chart':      'Cash Flow',
  'investment-widget':   'Investments',
  'debt-widget':         'Debts',
  'top-spending':        'Top Spending',
};
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

let _isCustomizing = false;

function _renderHiddenPanel() {
  const panel  = document.getElementById('hiddenWidgetsPanel');
  if (!panel) return;
  const hidden = WIDGET_KEYS.filter(id => !widgetVisibility[id]);
  if (!hidden.length) {
    panel.innerHTML = '';
    panel.classList.add('hidden');
    return;
  }
  panel.classList.remove('hidden');
  panel.innerHTML = `
    <div class="flex items-center gap-2 flex-wrap pt-1">
      <span class="text-xs text-neutral-600 uppercase tracking-wide font-medium">Hidden:</span>
      ${hidden.map(id => `
        <button onclick="window._restoreWidget('${id}')"
                class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs
                       bg-neutral-800/50 border border-neutral-700/50
                       text-neutral-500 hover:text-neutral-200 hover:border-neutral-500
                       transition">
          + ${WIDGET_LABELS[id] || id}
        </button>`).join('')}
    </div>`;
}

window._restoreWidget = function (widgetId) {
  widgetVisibility[widgetId] = true;
  localStorage.setItem('netwrth:widgets', JSON.stringify(widgetVisibility));
  applyWidgetVisibility();
  _renderHiddenPanel();
};

window._toggleCustomizeMode = function () {
  _isCustomizing = !_isCustomizing;
  const grid  = document.getElementById('widgetGrid');
  const btn   = document.getElementById('customizeBtn');
  const label = document.getElementById('customizeBtnLabel');

  if (_isCustomizing) {
    grid?.setAttribute('data-customizing', '');
    if (btn)   btn.classList.add('is-customizing');
    if (label) label.textContent = 'Done';
    if (_sortable) _sortable.option('disabled', false);
    _renderHiddenPanel();
  } else {
    grid?.removeAttribute('data-customizing');
    if (btn)   btn.classList.remove('is-customizing');
    if (label) label.textContent = 'Edit Layout';
    if (_sortable) _sortable.option('disabled', true);
    const panel = document.getElementById('hiddenWidgetsPanel');
    panel?.classList.add('hidden');
  }
};

window._hideWidget = function (widgetId) {
  widgetVisibility[widgetId] = false;
  localStorage.setItem('netwrth:widgets', JSON.stringify(widgetVisibility));
  applyWidgetVisibility();
};

// ── Widget drag-to-reorder (SortableJS) ───────────────────────────────────
function _loadWidgetOrder() {
  try { return JSON.parse(localStorage.getItem('netwrth:widget-order') || 'null'); }
  catch { return null; }
}

function _saveWidgetOrder() {
  const grid = document.getElementById('widgetGrid');
  if (!grid) return;
  const order = [...grid.children].map(el => el.dataset.widget).filter(Boolean);
  localStorage.setItem('netwrth:widget-order', JSON.stringify(order));
}

function _applyWidgetOrder() {
  const order = _loadWidgetOrder();
  if (!order) return;
  const grid = document.getElementById('widgetGrid');
  if (!grid) return;
  // appendChild of an existing child moves it to end — builds DOM order from saved list
  order.forEach(id => {
    const el = grid.querySelector(`[data-widget="${id}"]`);
    if (el) grid.appendChild(el);
  });
}

let _sortable = null;

function _initSortable() {
  const grid = document.getElementById('widgetGrid');
  if (!grid || !window.Sortable) return;
  _sortable = Sortable.create(grid, {
    animation: 180,
    handle: '.widget-drag-handle',
    ghostClass: 'widget-ghost',
    chosenClass: 'widget-chosen',
    disabled: true,
    onEnd: _saveWidgetOrder,
  });
}

// ── Widget collapse ────────────────────────────────────────────────────────
const DEFAULT_COLLAPSED = Object.fromEntries(WIDGET_KEYS.map(k => [k, false]));

function _loadCollapsed() {
  try { return { ...DEFAULT_COLLAPSED, ...JSON.parse(localStorage.getItem('netwrth:widget-collapsed') || '{}') }; }
  catch { return { ...DEFAULT_COLLAPSED }; }
}

let widgetCollapsed = _loadCollapsed();

function _applyCollapsed() {
  WIDGET_KEYS.forEach(id => {
    const card    = document.querySelector(`[data-widget="${id}"]`);
    if (!card) return;
    const body    = card.querySelector('.widget-body');
    const chevron = card.querySelector('.widget-collapse-chevron');
    if (body)    body.classList.toggle('collapsed', !!widgetCollapsed[id]);
    if (chevron) chevron.classList.toggle('rotated',  !!widgetCollapsed[id]);
  });
}

window._toggleCollapse = function (widgetId) {
  widgetCollapsed[widgetId] = !widgetCollapsed[widgetId];
  localStorage.setItem('netwrth:widget-collapsed', JSON.stringify(widgetCollapsed));
  _applyCollapsed();
};

// ── Init once DOM is ready ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  _applyWidgetOrder();
  _applyCollapsed();
  _initSortable();

  // Cash flow period filter
  document.getElementById('cfFilterBar')?.querySelectorAll('.cf-period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      cashFlowPeriod = btn.dataset.period;
      document.querySelectorAll('#cfFilterBar .cf-period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const customRange = document.getElementById('cfCustomRange');
      if (cashFlowPeriod === 'custom') {
        customRange?.classList.remove('hidden');
        // Pre-fill inputs with sensible defaults if empty
        const cfStart = document.getElementById('cfStartMonth');
        const cfEnd   = document.getElementById('cfEndMonth');
        const now     = new Date();
        if (cfStart && !cfStart.value) {
          const sixAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
          cfStart.value = `${sixAgo.getFullYear()}-${String(sixAgo.getMonth() + 1).padStart(2, '0')}`;
        }
        if (cfEnd && !cfEnd.value) {
          cfEnd.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }
        cashFlowCustomStart = document.getElementById('cfStartMonth')?.value || null;
        cashFlowCustomEnd   = document.getElementById('cfEndMonth')?.value   || null;
        if (cashFlowCustomStart && cashFlowCustomEnd) renderCashFlowChart();
      } else {
        customRange?.classList.add('hidden');
        renderCashFlowChart();
      }
    });
  });

  document.getElementById('cfStartMonth')?.addEventListener('change', e => {
    cashFlowCustomStart = e.target.value || null;
    if (cashFlowCustomStart && cashFlowCustomEnd) renderCashFlowChart();
  });
  document.getElementById('cfEndMonth')?.addEventListener('change', e => {
    cashFlowCustomEnd = e.target.value || null;
    if (cashFlowCustomStart && cashFlowCustomEnd) renderCashFlowChart();
  });
});

// ── Compact number format for chart axis ──────────────────────────────────
function compactINR(v) {
  if (!v) return '₹0';
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `₹${Math.round(v / 1e3)}K`;
  return `₹${Math.round(v)}`;
}

// ── Cash Flow period label ─────────────────────────────────────────────────
function _cfPeriodLabel() {
  switch (cashFlowPeriod) {
    case 'quarter':    return 'Last Quarter';
    case 'month':      return 'This Month';
    case 'prev_month': return 'Last Month';
    case 'custom':     return 'Custom Range';
    default:           return 'Last 12 Months';
  }
}

// ── Cash Flow Chart (SVG line+area, variable period, with tooltip) ─────────
function renderCashFlowChart() {
  const el = document.getElementById('cashFlowChart');
  if (!el) return;

  // Update title
  const titleEl = document.getElementById('cashFlowTitle');
  if (titleEl) titleEl.textContent = `Cash Flow · ${_cfPeriodLabel()}`;

  const now = new Date();
  const months = [];

  function mkMonth(d, isCurrent) {
    return {
      label:     d.toLocaleDateString('en-IN', { month: 'short' }),
      fullLabel: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
      year:      d.getFullYear(),
      month:     d.getMonth(),
      income:    0,
      expense:   0,
      isCurrent,
    };
  }

  if (cashFlowPeriod === 'quarter') {
    for (let i = 2; i >= 0; i--) {
      months.push(mkMonth(new Date(now.getFullYear(), now.getMonth() - i, 1), i === 0));
    }
  } else if (cashFlowPeriod === 'month') {
    months.push(mkMonth(new Date(now.getFullYear(), now.getMonth(), 1), true));
  } else if (cashFlowPeriod === 'prev_month') {
    months.push(mkMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1), true));
  } else if (cashFlowPeriod === 'custom' && cashFlowCustomStart && cashFlowCustomEnd) {
    const start = new Date(cashFlowCustomStart + '-01');
    const end   = new Date(cashFlowCustomEnd   + '-01');
    let cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
      const isLast = cur.getFullYear() === end.getFullYear() && cur.getMonth() === end.getMonth();
      months.push(mkMonth(cur, isLast));
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  } else {
    // default: last 12 months
    for (let i = 11; i >= 0; i--) {
      months.push(mkMonth(new Date(now.getFullYear(), now.getMonth() - i, 1), i === 0));
    }
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

  const maxVal = Math.max(...months.flatMap(m => [m.income, m.expense]), 1);
  const isDark = document.documentElement.classList.contains('dark');

  const incColor      = isDark ? '#34d399' : '#059669';
  const expColor      = isDark ? '#f87171' : '#dc2626';
  const netColor      = isDark ? 'rgba(148,163,184,0.6)' : 'rgba(100,116,139,0.6)';
  const gridClr       = isDark ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.07)';
  const axisClr       = isDark ? 'rgba(255,255,255,0.1)'   : 'rgba(0,0,0,0.12)';
  const txtClr        = isDark ? '#404040' : '#b4b4b4';
  const curHL         = isDark ? 'rgba(255,255,255,0.022)' : 'rgba(0,0,0,0.025)';
  const dotBg         = isDark ? '#111'    : '#fff';
  const tooltipBg     = isDark ? '#1c1c1c' : '#ffffff';
  const tooltipBorder = isDark ? 'rgba(255,255,255,0.1)' : '#e4e4e7';
  const ttLabelClr    = isDark ? '#737373' : '#a1a1aa';
  const ttTitleClr    = isDark ? '#a3a3a3' : '#71717a';
  const dividerClr    = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const monoFont      = `'DM Mono', monospace`;
  const sansFont      = `'DM Sans', sans-serif`;

  const W = 600, padL = 48, padR = 12, padTop = 28, padBot = 28;
  const chartH = 148, H = padTop + chartH + padBot;
  const chartW = W - padL - padR;
  const slotW  = chartW / Math.max(months.length, 1);

  const px    = i => padL + (i + 0.5) * slotW;
  const py    = v => padTop + chartH - Math.max((v / maxVal) * chartH, 0);
  const baseY = padTop + chartH;

  // Monotone-X cubic bezier (no overshoot, horizontal tangents)
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

  function areaPath(pts) {
    const line = smoothPath(pts);
    if (!line) return '';
    const [lx, ] = pts[pts.length - 1];
    const [fx, ] = pts[0];
    return `${line} L ${lx.toFixed(1)} ${baseY} L ${fx.toFixed(1)} ${baseY} Z`;
  }

  const incPts = months.map((m, i) => [px(i), py(m.income)]);
  const expPts = months.map((m, i) => [px(i), py(m.expense)]);
  const netPts = months.map((m, i) => [px(i), py(Math.max(m.income - m.expense, 0))]);

  // Grid lines
  const gridLines = [0.25, 0.5, 0.75, 1].map(pct => {
    const y = (padTop + chartH * (1 - pct)).toFixed(1);
    return `<line x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}" stroke="${gridClr}" stroke-width="1"/>
            <text x="${padL - 5}" y="${(+y + 3.5).toFixed(1)}" text-anchor="end" font-size="8" fill="${txtClr}" font-family="${monoFont}">${compactINR(maxVal * pct)}</text>`;
  }).join('');

  // Current month column highlight
  const curIdx   = months.findIndex(m => m.isCurrent);
  const curColHL = curIdx >= 0
    ? `<rect x="${(padL + curIdx * slotW + 1).toFixed(1)}" y="${padTop}" width="${(slotW - 2).toFixed(1)}" height="${chartH}" fill="${curHL}" rx="3"/>`
    : '';

  // X-axis labels
  const xLabels = months.map((m, i) =>
    `<text x="${px(i).toFixed(1)}" y="${(H - 7).toFixed(1)}" text-anchor="middle" font-size="8"
           fill="${m.isCurrent ? (isDark ? '#a3a3a3' : '#52525b') : txtClr}"
           font-family="${monoFont}" font-weight="${m.isCurrent ? 600 : 400}">${m.label}</text>`
  ).join('');

  // Dots for each series
  const incDots = months.map((m, i) => {
    if (m.income <= 0) return '';
    const [x, y] = incPts[i];
    const r = m.isCurrent ? 4.5 : 2.5;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${dotBg}" stroke="${incColor}" stroke-width="${m.isCurrent ? 2 : 1.5}" pointer-events="none"/>`;
  }).join('');

  const expDots = months.map((m, i) => {
    if (m.expense <= 0) return '';
    const [x, y] = expPts[i];
    const r = m.isCurrent ? 4.5 : 2.5;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${dotBg}" stroke="${expColor}" stroke-width="${m.isCurrent ? 2 : 1.5}" pointer-events="none"/>`;
  }).join('');

  // Always-visible data labels for the highlighted month
  const curM = curIdx >= 0 ? months[curIdx] : months[months.length - 1];
  const incLY = Math.max(padTop + 12, py(curM.income) - 10);
  const expLY = Math.max(padTop + 12, py(curM.expense) - 10);
  // Nudge apart if labels would collide (within 14px of each other)
  const nudgeInc = (Math.abs(incLY - expLY) < 14 && curM.income >= curM.expense) ? -8 : 0;
  const nudgeExp = (Math.abs(incLY - expLY) < 14 && curM.expense > curM.income)  ? -8 : 0;

  const curLabelIdx = curIdx >= 0 ? curIdx : months.length - 1;
  const curLabels = [
    curM.income > 0  ? `<text x="${px(curLabelIdx).toFixed(1)}" y="${(incLY + nudgeInc).toFixed(1)}" text-anchor="middle" font-size="7.5" fill="${incColor}" font-family="${monoFont}" font-weight="400" opacity="0.65">${compactINR(curM.income)}</text>` : '',
    curM.expense > 0 ? `<text x="${px(curLabelIdx).toFixed(1)}" y="${(expLY + nudgeExp).toFixed(1)}" text-anchor="middle" font-size="7.5" fill="${expColor}" font-family="${monoFont}" font-weight="400" opacity="0.65">${compactINR(curM.expense)}</text>` : '',
  ].join('');

  // Invisible hit rects for tooltip
  const hitRects = months.map((_m, i) =>
    `<rect class="cf-hit" x="${(padL + i * slotW).toFixed(1)}" y="${padTop}" width="${slotW.toFixed(1)}" height="${chartH + 4}" fill="transparent" data-idx="${i}"/>`
  ).join('');

  el.innerHTML = `
    <div class="cf-wrapper" style="position:relative">
      <svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;overflow:visible" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="cfGradInc" x1="0" y1="${padTop}" x2="0" y2="${baseY}" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stop-color="${incColor}" stop-opacity="0.22"/>
            <stop offset="100%" stop-color="${incColor}" stop-opacity="0.01"/>
          </linearGradient>
          <linearGradient id="cfGradExp" x1="0" y1="${padTop}" x2="0" y2="${baseY}" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stop-color="${expColor}" stop-opacity="0.16"/>
            <stop offset="100%" stop-color="${expColor}" stop-opacity="0.01"/>
          </linearGradient>
        </defs>

        <!-- Axes -->
        <line x1="${padL}" x2="${padL}" y1="${padTop}" y2="${baseY}" stroke="${gridClr}" stroke-width="1"/>
        <line x1="${padL}" x2="${W - padR}" y1="${baseY}" y2="${baseY}" stroke="${axisClr}" stroke-width="1"/>

        <!-- Grid -->
        ${gridLines}

        <!-- Current month highlight -->
        ${curColHL}

        <!-- Area fills -->
        <path d="${areaPath(incPts)}" fill="url(#cfGradInc)"/>
        <path d="${areaPath(expPts)}" fill="url(#cfGradExp)"/>

        <!-- Net savings dashed line -->
        <path d="${smoothPath(netPts)}" fill="none" stroke="${netColor}" stroke-width="1.25" stroke-dasharray="3 2.5" stroke-linecap="round"/>

        <!-- Main lines (expense under income so income is always on top) -->
        <path d="${smoothPath(expPts)}" fill="none" stroke="${expColor}" stroke-width="1.75" stroke-linecap="round" opacity="0.85"/>
        <path d="${smoothPath(incPts)}" fill="none" stroke="${incColor}" stroke-width="2.25" stroke-linecap="round"/>

        <!-- Dots -->
        ${incDots}
        ${expDots}

        <!-- Current month data labels -->
        ${curLabels}

        <!-- X-axis labels -->
        ${xLabels}

        <!-- Crosshair (toggled by JS) -->
        <line id="cfCrosshair" x1="0" x2="0" y1="${padTop}" y2="${baseY}"
              stroke="${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}"
              stroke-width="1" stroke-dasharray="3 2" opacity="0" pointer-events="none"/>

        <!-- Hit areas (topmost layer) -->
        ${hitRects}
      </svg>

      <!-- Floating tooltip -->
      <div id="cfTooltip" style="
        position:absolute; top:0; left:0; pointer-events:none;
        opacity:0; transition:opacity 0.12s ease;
        min-width:152px;
        background:${tooltipBg};
        border:1px solid ${tooltipBorder};
        border-radius:10px; padding:10px 13px;
        box-shadow:0 8px 28px rgba(0,0,0,0.3);
        font-family:${sansFont};
        z-index:20;
        transform:translateX(-50%) translateY(calc(-100% - 10px));
      "></div>
    </div>`;

  // ── Tooltip interaction ────────────────────────────────────────────────
  const wrapper   = el.querySelector('.cf-wrapper');
  const crosshair = wrapper.querySelector('#cfCrosshair');
  const tooltip   = wrapper.querySelector('#cfTooltip');

  wrapper.querySelectorAll('.cf-hit').forEach(rect => {
    rect.addEventListener('mouseenter', () => {
      const idx = parseInt(rect.dataset.idx);
      const m   = months[idx];
      const net = m.income - m.expense;
      const netClr = net >= 0 ? incColor : expColor;

      // Position tooltip: x is column center, y is near top of chart area
      const scale    = wrapper.offsetWidth / W;
      const xInW     = px(idx) * scale;
      const yInW     = (padTop - 2) * scale;
      const half     = 76;
      const clampedX = Math.max(half, Math.min(wrapper.offsetWidth - half, xInW));

      tooltip.style.left      = `${clampedX}px`;
      tooltip.style.top       = `${yInW}px`;
      tooltip.style.opacity   = '1';
      tooltip.style.transform = 'translateX(-50%) translateY(calc(-100% - 10px))';

      const fmt = v => v >= 1e7 ? `₹${(v/1e7).toFixed(2)}Cr`
                      : v >= 1e5 ? `₹${(v/1e5).toFixed(1)}L`
                      : v >= 1e3 ? `₹${(v/1e3).toFixed(0)}K`
                      : `₹${Math.round(v)}`;

      const row = (label, val, clr, dotClr, solid = true) => `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:4px">
          <span style="font-size:11px;color:${ttLabelClr};display:flex;align-items:center;gap:5px">
            ${solid
              ? `<span style="width:8px;height:2px;border-radius:1px;background:${dotClr};display:inline-block"></span>`
              : `<svg width="10" height="6" viewBox="0 0 10 6" style="display:inline-block"><line x1="0" y1="3" x2="10" y2="3" stroke="${dotClr}" stroke-width="1.25" stroke-dasharray="2.5 2" stroke-linecap="round"/></svg>`
            }
            ${label}
          </span>
          <span style="font-size:12px;font-weight:700;font-family:${monoFont};color:${clr}">${val}</span>
        </div>`;

      tooltip.innerHTML = `
        <p style="font-size:10px;font-weight:600;color:${ttTitleClr};margin:0 0 8px;letter-spacing:0.05em;text-transform:uppercase;font-family:${monoFont}">${m.fullLabel}</p>
        ${row('Income',   fmt(m.income),        incColor,  incColor, true)}
        ${row('Expenses', fmt(m.expense),        expColor,  expColor, true)}
        <div style="height:1px;background:${dividerClr};margin:4px 0 6px"></div>
        ${row(net >= 0 ? 'Net Saved' : 'Overspent', (net >= 0 ? '+' : '−') + fmt(Math.abs(net)), netClr, netColor, false)}`;

      // Show crosshair
      const cx = px(idx).toFixed(1);
      crosshair.setAttribute('x1', cx);
      crosshair.setAttribute('x2', cx);
      crosshair.setAttribute('opacity', '1');
    });

    rect.addEventListener('mouseleave', () => {
      tooltip.style.opacity = '0';
      crosshair.setAttribute('opacity', '0');
    });
  });
}

// Re-render all visual widgets when theme switches (dark ↔ light)
new MutationObserver(() => refreshDashboard())
  .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

// ── Sparkline (tiny inline trend chart for stat cards) ─────────────────────
function renderSparkline(containerId, values, color) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!values.some(v => v > 0)) { el.innerHTML = ''; return; }

  const W = 52, H = 20, pad = 1.5;
  const maxV = Math.max(...values, 1);
  const pts  = values.map((v, i) => [
    pad + (i / Math.max(values.length - 1, 1)) * (W - 2 * pad),
    H - pad - (v / maxV) * (H - 2 * pad),
  ]);

  function linePath(p) {
    let d = `M ${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
    for (let i = 1; i < p.length; i++) {
      const [x0, y0] = p[i - 1], [x1, y1] = p[i];
      const dx = (x1 - x0) / 3;
      d += ` C ${(x0+dx).toFixed(1)} ${y0.toFixed(1)}, ${(x1-dx).toFixed(1)} ${y1.toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    }
    return d;
  }

  const lp   = linePath(pts);
  const last = pts[pts.length - 1], first = pts[0];
  const area = `${lp} L ${last[0].toFixed(1)} ${H} L ${first[0].toFixed(1)} ${H} Z`;
  const gId  = `sg_${containerId}`;

  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="display:block">
    <defs>
      <linearGradient id="${gId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="${color}" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="${area}" fill="url(#${gId})"/>
    <path d="${lp}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2" fill="${color}" opacity="0.9"/>
  </svg>`;
}

// ── Month Pulse widget ─────────────────────────────────────────────────────
function renderMonthPulse() {
  const el = document.getElementById('monthPulseWidget');
  if (!el) return;

  const now   = new Date();
  const yr    = now.getFullYear(), mo = now.getMonth();
  const curS  = new Date(yr, mo,     1);
  const curE  = new Date(yr, mo + 1, 0, 23, 59, 59, 999);
  const lstS  = new Date(yr, mo - 1, 1);
  const lstE  = new Date(yr, mo,     0, 23, 59, 59, 999);

  const curInc  = sum(filterByRange(allIncome,   { start: curS, end: curE }));
  const curExp  = sum(filterByRange(allExpenses,  { start: curS, end: curE }));
  const lstInc  = sum(filterByRange(allIncome,   { start: lstS, end: lstE }));
  const lstExp  = sum(filterByRange(allExpenses,  { start: lstS, end: lstE }));

  const saved      = curInc - curExp;
  const rate       = curInc > 0 ? Math.round((saved / curInc) * 100) : 0;
  const daysInMo   = new Date(yr, mo + 1, 0).getDate();
  const dayOfMo    = now.getDate();
  const monthPct   = Math.round((dayOfMo / daysInMo) * 100);
  const dailyAvg   = dayOfMo > 0 ? curExp / dayOfMo : 0;
  const projected  = Math.round(dailyAvg * daysInMo);

  const isDark   = document.documentElement.classList.contains('dark');
  const incClr   = isDark ? '#34d399' : '#059669';
  const expClr   = isDark ? '#f87171' : '#dc2626';
  const ambrClr  = isDark ? '#fbbf24' : '#d97706';
  const neutClr  = isDark ? '#737373' : '#a1a1aa';
  const dimClr   = isDark ? '#404040' : '#c4c4c4';
  const divClr   = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const mono     = `'DM Mono',monospace`;

  let sTxt, sFg, sBg;
  if      (rate >= 20) { sTxt = 'On Track';    sFg = incClr;  sBg = isDark ? 'rgba(52,211,153,0.1)' : 'rgba(5,150,105,0.09)'; }
  else if (rate >=  0) { sTxt = 'Watch Out';   sFg = ambrClr; sBg = isDark ? 'rgba(251,191,36,0.1)' : 'rgba(217,119,6,0.08)'; }
  else                 { sTxt = 'Over Budget'; sFg = expClr;  sBg = isDark ? 'rgba(248,113,113,0.1)' : 'rgba(220,38,38,0.08)'; }

  const fmt = v => v >= 1e7 ? `₹${(v/1e7).toFixed(1)}Cr`
                 : v >= 1e5 ? `₹${(v/1e5).toFixed(1)}L`
                 : v >= 1e3 ? `₹${(v/1e3).toFixed(0)}K`
                 : `₹${Math.round(v)}`;

  const mom = (cur, prev, goodIfUp) => {
    if (!prev || !cur) return `<span style="color:${dimClr}">—</span>`;
    const pct = Math.round(((cur - prev) / Math.abs(prev)) * 100);
    const up  = pct >= 0;
    const clr = (goodIfUp ? up : !up) ? incClr : expClr;
    return `<span style="color:${clr};font-family:${mono};font-size:10px">${up ? '↑' : '↓'}${Math.abs(pct)}%</span>`;
  };

  const savedClr  = saved >= 0 ? incClr : expClr;
  const rateClr   = rate >= 20 ? incClr : rate >= 0 ? ambrClr : expClr;
  const projClr   = (curInc > 0 && projected > curInc) ? expClr
                  : (curInc > 0 && projected > curInc * 0.85) ? ambrClr : neutClr;
  const dayStrong = isDark ? '#d4d4d4' : '#3f3f46';

  if (!curInc && !curExp) {
    el.innerHTML = `<p style="font-size:13px;color:${neutClr}">No data this month yet.
      <span style="color:${incClr};cursor:pointer" onclick="document.getElementById('quickAddBtn').click()">Add a transaction →</span></p>`;
    return;
  }

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px">

      <!-- Status + month label -->
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:11px;font-weight:600;padding:2px 9px;border-radius:6px;
                     background:${sBg};color:${sFg}">${sTxt}</span>
        <span style="font-size:10px;font-family:${mono};color:${neutClr}">
          ${now.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
        </span>
      </div>

      <!-- Income / Spent / Saved -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">
        <div>
          <p style="font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:${neutClr};margin:0 0 3px">Income</p>
          <p style="font-size:13px;font-weight:700;font-family:${mono};color:${incClr};margin:0 0 2px">${fmt(curInc)}</p>
          <p style="margin:0;line-height:1.4">${mom(curInc, lstInc, true)}</p>
        </div>
        <div>
          <p style="font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:${neutClr};margin:0 0 3px">Spent</p>
          <p style="font-size:13px;font-weight:700;font-family:${mono};color:${expClr};margin:0 0 2px">${fmt(curExp)}</p>
          <p style="margin:0;line-height:1.4">${mom(curExp, lstExp, false)}</p>
        </div>
        <div>
          <p style="font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:${neutClr};margin:0 0 3px">Saved</p>
          <p style="font-size:13px;font-weight:700;font-family:${mono};color:${savedClr};margin:0 0 2px">${fmt(Math.abs(saved))}</p>
          <p style="margin:0;font-size:10px;font-family:${mono};color:${rateClr}">${rate}%</p>
        </div>
      </div>

      <!-- Day progress bar -->
      <div>
        <div style="display:flex;justify-content:space-between;font-size:9px;color:${neutClr};margin-bottom:5px">
          <span>Day <strong style="color:${dayStrong};font-weight:600">${dayOfMo}</strong> of ${daysInMo}</span>
          <span>${monthPct}% through month</span>
        </div>
        <div style="height:5px;border-radius:999px;background:${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'};overflow:hidden">
          <div style="height:100%;width:${monthPct}%;border-radius:999px;
                      background:${isDark ? 'rgba(113,113,122,0.55)' : 'rgba(113,113,122,0.4)'};
                      transition:width .6s ease"></div>
        </div>
      </div>

      <!-- Projection footer -->
      ${dailyAvg > 0 ? `
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;
                  padding-top:7px;border-top:1px solid ${divClr}">
        <span style="color:${neutClr};font-family:${mono}">${fmt(Math.round(dailyAvg))}/day avg</span>
        <span style="color:${projClr};font-family:${mono};font-weight:500">~${fmt(projected)} projected</span>
      </div>` : ''}

    </div>`;
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

  // ── Quick stats bar ───────────────────────────────────────────────────
  const qsNW    = document.getElementById('qsNetWorth');
  const qsSaved = document.getElementById('qsSaved');
  const qsRate  = document.getElementById('qsRate');
  if (qsNW) {
    const nw = sum(allIncome) - sum(allExpenses);
    qsNW.textContent = formatINR(nw);
    qsNW.className   = `quick-stat-value ${nw >= 0 ? 'text-emerald-400' : 'text-red-400'}`;
  }
  if (qsSaved || qsRate) {
    const cyc     = { mode: 'cycle', cycleAmount: 1, cycleUnit: 'month', cycleStart: `${thisYear}-01-01` };
    const cycleR  = getDateRange(cyc);
    const cycInc  = sum(filterByRange(allIncome,   cycleR));
    const cycExp  = sum(filterByRange(allExpenses, cycleR));
    const saved   = cycInc - cycExp;
    const rate    = cycInc ? Math.round((saved / cycInc) * 100) : 0;
    if (qsSaved) {
      qsSaved.textContent = (saved >= 0 ? '+' : '−') + formatINR(Math.abs(saved));
      qsSaved.className   = `quick-stat-value ${saved >= 0 ? 'text-emerald-400' : 'text-red-400'}`;
    }
    if (qsRate) {
      qsRate.textContent = `${rate}%`;
      qsRate.className   = `quick-stat-value ${rate >= 20 ? 'text-emerald-400' : rate >= 10 ? 'text-amber-400' : 'text-red-400'}`;
    }
  }

  // ── Sparklines (last 7 months, fixed monthly buckets) ────────────────
  const isDarkMode = document.documentElement.classList.contains('dark');
  const spkIncClr  = isDarkMode ? '#34d399' : '#059669';
  const spkExpClr  = isDarkMode ? '#f87171' : '#dc2626';

  const spkBuckets = (() => {
    const n = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const mo    = n.getMonth() - (6 - i);
      const start = new Date(n.getFullYear(), mo, 1);
      const end   = new Date(n.getFullYear(), mo + 1, 0, 23, 59, 59, 999);
      return { start, end };
    });
  })();

  const spkInc  = spkBuckets.map(b => sum(filterByRange(allIncome,   b)));
  const spkExp  = spkBuckets.map(b => sum(filterByRange(allExpenses, b)));
  const spkNW   = spkBuckets.map(b => Math.max(
    sum(filterByRange(allIncome, b)) - sum(filterByRange(allExpenses, b)), 0
  ));
  const spkRate = spkBuckets.map(b => {
    const inc = sum(filterByRange(allIncome,   b));
    const exp = sum(filterByRange(allExpenses, b));
    return inc > 0 ? Math.round(((inc - exp) / inc) * 100) : 0;
  });

  const nwTrending  = spkNW[6]   >= spkNW[0];
  const rateTrending = spkRate[6] >= 20;
  renderSparkline('spkNetWorth', spkNW,   nwTrending  ? spkIncClr : spkExpClr);
  renderSparkline('spkIncome',   spkInc,  spkIncClr);
  renderSparkline('spkExpenses', spkExp,  spkExpClr);
  renderSparkline('spkSavings',  spkRate, rateTrending ? spkIncClr : spkExpClr);

  // ── New widgets ───────────────────────────────────────────────────────
  renderCashFlowChart();
  renderMonthPulse();
  renderInvestmentWidget();
  renderDebtWidget();
  renderTopSpending();
  applyWidgetVisibility();
  _applyCollapsed();

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
