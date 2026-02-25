// js/settings.js
// ─── Settings Module ──────────────────────────────────────────────────────

const STORAGE_KEY = 'netwrth:settings';

const DEFAULTS = {
  theme:                    'dark',
  accentColor:              '#10b981',   // emerald-500
  fontSize:                 'medium',    // small | medium | large
  defaultLandingPage:       'dashboard',

  fiscalYearStart:          4,           // 4 = April (Indian FY), 1 = January
  salaryCreditDate:         1,           // Day of month 1–28
  netWorthBasis:            'all',       // 'all' | 'liquid' (excludes Investment accounts)
  defaultTransactionType:   'expense',   // 'expense' | 'income'

  budgetAlertThreshold:     80,          // % at which budget bar turns amber

  savingsRateTarget:        30,          // % shown as KPI benchmark
  reportDateRangeDefault:   'this-month', // 'this-month' | 'last-month' | 'this-fy'
  ignoredReportCategories:  [],          // category names excluded from spend analysis

  numberFormat:             'indian',    // 'indian' (en-IN) | 'international' (en-US)
  dateFormat:               'DD-MMM-YYYY', // 'DD-MMM-YYYY' | 'DD/MM/YYYY'
};

const ACCENT_COLORS = [
  { name: 'Emerald', value: '#10b981' },
  { name: 'Blue',    value: '#3b82f6' },
  { name: 'Violet',  value: '#8b5cf6' },
  { name: 'Amber',   value: '#f59e0b' },
  { name: 'Rose',    value: '#f43f5e' },
];

// ── Core API ──────────────────────────────────────────────────────────────

export function getSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function updateSetting(key, value) {
  const settings = getSettings();
  settings[key] = value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent('netwrth:settingsChanged', { detail: { key, value } }));
}

// ── Appearance ────────────────────────────────────────────────────────────

export function applyAppearanceSettings() {
  const { theme, accentColor, fontSize } = getSettings();
  const html = document.documentElement;

  // Theme
  if (theme === 'system') {
    html.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
  } else {
    html.classList.toggle('dark', theme === 'dark');
  }

  // Sync dark mode toggle icon
  const darkToggle = document.getElementById('darkModeToggle');
  if (darkToggle) {
    const isDark = html.classList.contains('dark');
    darkToggle.textContent = isDark ? '☀' : '☾';
    darkToggle.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  }

  // Accent color via CSS custom properties
  html.style.setProperty('--color-accent', accentColor);
  // Also expose as RGB triplet for rgba() usage in CSS
  const hexToRgb = hex => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  };
  if (/^#[0-9a-fA-F]{6}$/.test(accentColor)) {
    html.style.setProperty('--color-accent-rgb', hexToRgb(accentColor));
  }

  // Font size
  const sizes = { small: '13px', medium: '15px', large: '17px' };
  document.body.style.fontSize = sizes[fontSize] || '15px';
}

// ── Finance Utilities ─────────────────────────────────────────────────────

export function getFiscalYearRange() {
  const { fiscalYearStart } = getSettings();
  const now = new Date();
  if (fiscalYearStart === 4) {
    // Indian FY: April 1 – March 31
    const fyYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return {
      from: new Date(fyYear, 3, 1),
      to:   new Date(fyYear + 1, 2, 31, 23, 59, 59),
    };
  }
  // Calendar year: Jan 1 – Dec 31
  return {
    from: new Date(now.getFullYear(), 0, 1),
    to:   new Date(now.getFullYear(), 11, 31, 23, 59, 59),
  };
}

export function getSalaryCycle() {
  const { salaryCreditDate } = getSettings();
  const day = salaryCreditDate;
  const now = new Date();
  const today = now.getDate();
  let cycleStart, cycleEnd;

  if (today >= day) {
    cycleStart = new Date(now.getFullYear(), now.getMonth(), day);
    cycleEnd   = new Date(now.getFullYear(), now.getMonth() + 1, day - 1, 23, 59, 59);
  } else {
    cycleStart = new Date(now.getFullYear(), now.getMonth() - 1, day);
    cycleEnd   = new Date(now.getFullYear(), now.getMonth(), day - 1, 23, 59, 59);
  }

  const daysLeft = Math.max(0, Math.ceil((cycleEnd - now) / 86400000));
  return { from: cycleStart, to: cycleEnd, daysLeft };
}

// ── CSV Export ────────────────────────────────────────────────────────────

export function exportAllDataCSV() {
  const expenses    = window._netwrthExpenses || [];
  const income      = window._netwrthIncome   || [];

  const rows = [
    ['Date', 'Type', 'Category', 'CategoryGroup', 'Account', 'Amount', 'Description', 'Notes'],
  ];

  expenses.forEach(e => {
    const d = e.date?.toDate ? e.date.toDate() : new Date(e.date);
    rows.push([
      d.toLocaleDateString('en-IN'),
      'expense',
      e.category    || '',
      e.categoryGroup || '',
      e.account     || '',
      e.amount      || 0,
      e.description || '',
      e.notes       || '',
    ]);
  });

  income.forEach(i => {
    const d = i.date?.toDate ? i.date.toDate() : new Date(i.date);
    rows.push([
      d.toLocaleDateString('en-IN'),
      'income',
      i.type        || '',
      '',
      '',
      i.amount      || 0,
      i.source      || '',
      i.notes       || '',
    ]);
  });

  if (rows.length === 1) {
    // Only header row — no data
    import('./ui.js').then(({ showToast }) => showToast('No data to export yet.', 'info'));
    return;
  }

  const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `netwrth-export-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  import('./ui.js').then(({ showToast }) => showToast('Data exported successfully.'));
}

// ── Settings UI ───────────────────────────────────────────────────────────

function renderAccentSwatches(currentColor) {
  const container = document.getElementById('settingsAccentSwatches');
  if (!container) return;
  container.innerHTML = ACCENT_COLORS.map(c => `
    <button onclick="window._settingsSetAccent('${c.value}')"
            title="${c.name}"
            class="w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${c.value === currentColor ? 'border-white scale-110 ring-2 ring-white/30' : 'border-transparent'}"
            style="background-color:${c.value}">
    </button>
  `).join('');
}

function populateIgnoreCats() {
  const container = document.getElementById('settingsIgnoreCats');
  if (!container) return;
  const cats    = window._allCategoryData || [];
  const ignored = getSettings().ignoredReportCategories || [];
  // Show top-level expense groups (no parentId)
  const groups  = cats.filter(c => c.type === 'expense' && !c.parentId);
  if (!groups.length) {
    container.innerHTML = '<p class="text-xs text-neutral-500">Load categories first.</p>';
    return;
  }
  container.innerHTML = groups.map(cat => `
    <label class="flex items-center gap-2.5 text-sm cursor-pointer select-none">
      <input type="checkbox"
             class="w-4 h-4 rounded"
             value="${cat.name}"
             ${ignored.includes(cat.name) ? 'checked' : ''}
             onchange="window._settingsToggleIgnoreCat('${cat.name}', this.checked)" />
      <span>${cat.name}</span>
    </label>
  `).join('');
}

export function initSettingsUI() {
  const s = getSettings();

  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };

  setVal('settingsTheme',            s.theme);
  setVal('settingsFontSize',         s.fontSize);
  setVal('settingsLandingPage',      s.defaultLandingPage);
  setVal('settingsFiscalYear',       s.fiscalYearStart);
  setVal('settingsSalaryCreditDate', s.salaryCreditDate);
  setVal('settingsNetWorthBasis',    s.netWorthBasis);
  setVal('settingsDefaultTxType',    s.defaultTransactionType);
  setVal('settingsBudgetThreshold',  s.budgetAlertThreshold);
  setVal('settingsSavingsTarget',    s.savingsRateTarget);
  setVal('settingsReportRange',      s.reportDateRangeDefault);
  setVal('settingsNumberFormat',     s.numberFormat);
  setVal('settingsDateFormat',       s.dateFormat);

  const thresholdDisplay = document.getElementById('settingsBudgetThresholdDisplay');
  if (thresholdDisplay) thresholdDisplay.textContent = `${s.budgetAlertThreshold}%`;

  renderAccentSwatches(s.accentColor);
  populateIgnoreCats();

  // Wire controls
  const wire = (id, key, transform) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
      const val = transform ? transform(el.value) : el.value;
      updateSetting(key, val);
    });
  };

  wire('settingsTheme',            'theme');
  wire('settingsFontSize',         'fontSize');
  wire('settingsLandingPage',      'defaultLandingPage');
  wire('settingsFiscalYear',       'fiscalYearStart',     v => parseInt(v));
  wire('settingsSalaryCreditDate', 'salaryCreditDate',    v => parseInt(v));
  wire('settingsNetWorthBasis',    'netWorthBasis');
  wire('settingsDefaultTxType',    'defaultTransactionType');
  wire('settingsBudgetThreshold',  'budgetAlertThreshold', v => parseInt(v));
  wire('settingsSavingsTarget',    'savingsRateTarget',    v => parseInt(v));
  wire('settingsReportRange',      'reportDateRangeDefault');
  wire('settingsNumberFormat',     'numberFormat');
  wire('settingsDateFormat',       'dateFormat');

  // Budget threshold slider — live value display
  const slider = document.getElementById('settingsBudgetThreshold');
  if (slider && thresholdDisplay) {
    slider.addEventListener('input', () => { thresholdDisplay.textContent = `${slider.value}%`; });
  }

  // Export CSV
  document.getElementById('settingsExportCsvBtn')
    ?.addEventListener('click', exportAllDataCSV);

  // Delete account — two-step confirmation
  const deleteBtn = document.getElementById('settingsDeleteAccountBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (deleteBtn.dataset.confirming === '1') {
        clearTimeout(parseInt(deleteBtn.dataset.timer));
        // Sign out (full deletion requires server-side — sign out for now)
        document.getElementById('signOutBtn')?.click();
        return;
      }
      deleteBtn.dataset.confirming = '1';
      deleteBtn.textContent = 'Click again to confirm sign-out & clear session';
      deleteBtn.classList.add('!bg-red-600', '!border-red-600');
      deleteBtn.dataset.timer = String(setTimeout(() => {
        deleteBtn.dataset.confirming = '';
        deleteBtn.textContent = 'Sign Out & Clear Session';
        deleteBtn.classList.remove('!bg-red-600', '!border-red-600');
      }, 5000));
    });
  }
}

// ── Window Helpers ────────────────────────────────────────────────────────

window._settingsSetAccent = function(color) {
  updateSetting('accentColor', color);
  renderAccentSwatches(color);
};

window._settingsToggleIgnoreCat = function(catName, checked) {
  const ignored = [...(getSettings().ignoredReportCategories || [])];
  if (checked) {
    if (!ignored.includes(catName)) ignored.push(catName);
  } else {
    const i = ignored.indexOf(catName);
    if (i !== -1) ignored.splice(i, 1);
  }
  updateSetting('ignoredReportCategories', ignored);
};

// ── Reactivity ────────────────────────────────────────────────────────────

window.addEventListener('netwrth:settingsChanged', ({ detail: { key } }) => {
  if (['theme', 'accentColor', 'fontSize'].includes(key)) {
    applyAppearanceSettings();
  }
});

// Repopulate ignore-cats when category data arrives
window.addEventListener('netwrth:dataChanged', () => setTimeout(populateIgnoreCats, 100));
window.addEventListener('netwrth:userReady',   () => setTimeout(populateIgnoreCats, 1500));

// ── Bootstrap ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  applyAppearanceSettings();
  initSettingsUI();
});

export { ACCENT_COLORS };
