// js/ui.js
// ─── UI Utilities: Navigation, Modals, Toasts, Dark Mode ─────────────────
import { getSettings } from "./settings.js";

// ── Sidebar Collapse Toggle ───────────────────────────────────────────────
const sidebar       = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");

if (localStorage.getItem("netwrth-sidebar") === "collapsed") {
  sidebar.classList.add("collapsed");
}

sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  localStorage.setItem(
    "netwrth-sidebar",
    sidebar.classList.contains("collapsed") ? "collapsed" : "expanded"
  );
});

// ── Section Navigation ─────────────────────────────────────────────────────
const navLinks   = document.querySelectorAll(".nav-link");
const sections   = document.querySelectorAll(".section");
const pageTitle  = document.getElementById("pageTitle");

const sectionTitles = {
  dashboard:   "Dashboard",
  expenses:    "Expenses",
  income:      "Income",
  budgets:     "Budgets & Goals",
  investments: "Investments",
  debts:       "Debts & Loans",
  reports:     "Reports & Export",
  insights:    "Insights",
  accounts:    "Accounts",
  categories:  "Categories",
  settings:    "Settings",
};

const sectionSubtitles = {
  expenses:    "Track where your money goes.",
  income:      "Track all your income sources.",
  budgets:     "Set limits and track what matters.",
  investments: "Track your portfolio and growth.",
  debts:       "Know what you owe and to whom.",
  reports:     "Understand your financial picture.",
  insights:    "Your financial picture at a glance.",
  accounts:    "Manage your bank, cash and wallet accounts.",
  categories:  "Customise how you classify transactions.",
  settings:    "Personalise your netwrth experience.",
};

// IDs of all header action elements (buttons/divs in the top bar)
const headerActionIds = [
  "quickAddBtn",
  "headerBtn-expenses", "headerBtn-income", "headerBtn-budgets",
  "headerBtn-investments", "headerBtn-debts", "headerBtn-accounts",
  "headerBtn-categories", "headerBtn-insights",
];

export function showSection(id) {
  sections.forEach(s => s.classList.add("hidden"));
  navLinks.forEach(l => l.classList.remove("active"));

  const target = document.getElementById(`section-${id}`);
  if (target) {
    target.classList.remove("hidden", "section-entering");
    // Force reflow so the animation restarts cleanly
    void target.offsetWidth;
    target.classList.add("section-entering");
  }

  const activeLink = document.querySelector(`.nav-link[data-section="${id}"]`);
  if (activeLink) activeLink.classList.add("active");

  pageTitle.textContent = sectionTitles[id] || id;

  // Update subtitle: date on dashboard, tagline on other sections
  const subtitleEl = document.getElementById("pageSubtitle");
  if (subtitleEl) {
    if (id === "dashboard") {
      subtitleEl.textContent = new Date().toLocaleDateString("en-IN", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      });
    } else {
      subtitleEl.textContent = sectionSubtitles[id] || "";
    }
  }

  // Switch header action buttons
  headerActionIds.forEach(aid => {
    const el = document.getElementById(aid);
    if (el) el.classList.add("hidden");
  });
  const activeAction = id === "dashboard"
    ? document.getElementById("quickAddBtn")
    : document.getElementById(`headerBtn-${id}`);
  if (activeAction) activeAction.classList.remove("hidden");

  // Show Edit Layout button only on dashboard
  const customizeBtn = document.getElementById("customizeBtn");
  if (customizeBtn) {
    customizeBtn.classList.toggle("hidden", id !== "dashboard");
    // Exit customize mode when leaving dashboard
    if (id !== "dashboard" && document.getElementById("widgetGrid")?.hasAttribute("data-customizing")) {
      window._toggleCustomizeMode?.();
    }
  }
}

// Global navigation helper (used by dashboard widgets + inline onclick)
window._navigateTo = showSection;

navLinks.forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    showSection(link.dataset.section);
  });
});

// Show default landing page from settings
showSection(getSettings().defaultLandingPage || "dashboard");


// ── Modals ────────────────────────────────────────────────────────────────
export function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  // Remove any prior animation state and hidden
  modal.classList.remove("hidden", "is-closing", "is-opening");
  // Force reflow so animation restarts correctly
  void modal.offsetWidth;
  modal.classList.add("is-opening");
}

export function closeAllModals() {
  document.querySelectorAll(".modal-overlay:not(.hidden)").forEach(modal => {
    modal.classList.remove("is-opening");
    modal.classList.add("is-closing");
    setTimeout(() => {
      modal.classList.add("hidden");
      modal.classList.remove("is-closing");
    }, 180); // matches modalOverlayOut duration
  });
}

document.querySelectorAll(".open-modal").forEach(btn => {
  btn.addEventListener("click", () => openModal(btn.dataset.modal));
});

document.querySelectorAll(".close-modal").forEach(btn => {
  btn.addEventListener("click", closeAllModals);
});

document.querySelectorAll(".modal-overlay").forEach(overlay => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeAllModals();
  });
});

// ── Quick Add Tabs ────────────────────────────────────────────────────────
const quickExpenseTab = document.getElementById("quickExpenseTab");
const quickIncomeTab  = document.getElementById("quickIncomeTab");
const quickTypeInput  = document.querySelector('#quickAddForm input[name="type"]');
const quickDescInput  = document.getElementById("quickDescription");
const quickCatLabel   = document.getElementById("quickCatLabel");
const quickSubmitBtn  = document.getElementById("quickSubmitBtn");

function setExpenseTab() {
  quickExpenseTab.classList.add("active");
  quickIncomeTab.classList.remove("active");
  quickTypeInput.value       = "expense";
  quickDescInput.placeholder = "What did you spend on?";
  quickCatLabel.textContent  = "Category";
  quickSubmitBtn.textContent = "Save Expense";
  if (window._initQuickPicker) window._initQuickPicker("expense");
}

function setIncomeTab() {
  quickIncomeTab.classList.add("active");
  quickExpenseTab.classList.remove("active");
  quickTypeInput.value       = "income";
  quickDescInput.placeholder = "Where did this come from?";
  quickCatLabel.textContent  = "Type";
  quickSubmitBtn.textContent = "Save Income";
  if (window._initQuickPicker) window._initQuickPicker("income");
}

quickExpenseTab.addEventListener("click", setExpenseTab);
quickIncomeTab.addEventListener("click", setIncomeTab);

// Quick Add button — open on user's default transaction type
document.getElementById("quickAddBtn").addEventListener("click", () => {
  const defaultType = getSettings().defaultTransactionType || 'expense';
  if (defaultType === 'income') {
    setIncomeTab();
  } else {
    setExpenseTab();
  }
  document.getElementById("quickDate").value = new Date().toISOString().split("T")[0];
  openModal("quickAddModal");
  // Picker needs DOM to be visible; defer slightly
  setTimeout(() => {
    if (window._initQuickPicker) window._initQuickPicker(defaultType);
  }, 50);
});

// ── Two-click Soft Delete ────────────────────────────────────────────────
// First click: button turns red and shows "delete?". Second click within 3s
// executes the delete. Timer reset cancels it if user changes their mind.
window._softDelete = function(btn) {
  if (btn.dataset.confirming === "1") {
    clearTimeout(parseInt(btn.dataset.timer));
    const id   = btn.dataset.id;
    const type = btn.dataset.type;
    const fns  = {
      expense:    window._deleteExpense,
      income:     window._deleteIncome,
      investment: window._deleteInvestment,
      debt:       window._deleteDebt,
      budget:     window._deleteBudget,
      goal:       window._deleteGoal,
      account:    window._deleteAccount,
      category:   window._deleteCategory,
    };
    fns[type]?.(id);
    return;
  }
  btn.dataset.confirming = "1";
  btn.textContent = "delete?";
  btn.classList.add("confirming");
  btn.dataset.timer = String(setTimeout(() => {
    btn.dataset.confirming = "";
    btn.textContent = "✕";
    btn.classList.remove("confirming");
  }, 3000));
};

// ── Toast Notifications ───────────────────────────────────────────────────
let toastTimer = null;

export function showToast(message, type = "success") {
  const toast   = document.getElementById("toast");
  const icon    = document.getElementById("toastIcon");
  const msg     = document.getElementById("toastMsg");

  icon.textContent = type === "success" ? "✓" : type === "error" ? "✕" : "ℹ";
  msg.textContent  = message;

  toast.classList.remove("hidden");

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 3000);
}

// ── Dark Mode Toggle ──────────────────────────────────────────────────────
const darkToggle = document.getElementById("darkModeToggle");
const html       = document.documentElement;

function updateThemeIcon() {
  const isDark = html.classList.contains("dark");
  darkToggle.textContent = isDark ? "☀" : "☾";
  darkToggle.title       = isDark ? "Switch to light mode" : "Switch to dark mode";
}

// Load saved preference (from settings or legacy key)
const savedTheme = getSettings().theme;
if (savedTheme === 'light' || (savedTheme !== 'dark' && localStorage.getItem("netwrth-theme") === "light")) {
  html.classList.remove("dark");
}
updateThemeIcon();

darkToggle.addEventListener("click", () => {
  html.classList.toggle("dark");
  const newTheme = html.classList.contains("dark") ? "dark" : "light";
  localStorage.setItem("netwrth-theme", newTheme);
  import("./settings.js").then(({ updateSetting }) => updateSetting('theme', newTheme));
  updateThemeIcon();
});

// ── Format currency ───────────────────────────────────────────────────────
export function formatINR(amount) {
  const locale = getSettings().numberFormat === 'international' ? 'en-US' : 'en-IN';
  return new Intl.NumberFormat(locale, {
    style: "currency", currency: "INR", maximumFractionDigits: 0
  }).format(amount);
}
