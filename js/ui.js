// js/ui.js
// ─── UI Utilities: Navigation, Modals, Toasts, Dark Mode ─────────────────

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
  accounts:    "Accounts",
  categories:  "Categories",
};

export function showSection(id) {
  sections.forEach(s   => s.classList.add("hidden"));
  navLinks.forEach(l   => l.classList.remove("active"));

  const target = document.getElementById(`section-${id}`);
  if (target) target.classList.remove("hidden");

  const activeLink = document.querySelector(`.nav-link[data-section="${id}"]`);
  if (activeLink) activeLink.classList.add("active");

  pageTitle.textContent = sectionTitles[id] || id;
}

// Global navigation helper (used by dashboard widgets + inline onclick)
window._navigateTo = showSection;

navLinks.forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    showSection(link.dataset.section);
  });
});

// Show dashboard by default
showSection("dashboard");

// ── Date in subtitle ───────────────────────────────────────────────────────
const subtitle = document.getElementById("pageSubtitle");
if (subtitle) {
  subtitle.textContent = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
}

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
const quickExpenseTab     = document.getElementById("quickExpenseTab");
const quickIncomeTab      = document.getElementById("quickIncomeTab");
const quickTypeInput      = document.querySelector('#quickAddForm input[name="type"]');
const quickDescInput      = document.getElementById("quickDescription");
const quickCatLabel       = document.getElementById("quickCatLabel");
const quickCategorySelect = document.getElementById("quickCategorySelect");
const quickSubmitBtn      = document.getElementById("quickSubmitBtn");

const expenseCategoryOptions = `
  <option>Food & Dining</option>
  <option>Transport</option>
  <option>Shopping</option>
  <option>Bills & Utilities</option>
  <option>Health</option>
  <option>Entertainment</option>
  <option>Education</option>
  <option>Other</option>
`;

const incomeTypeOptions = `
  <option>Salary</option>
  <option>Freelance</option>
  <option>Business</option>
  <option>Investment Returns</option>
  <option>Gift</option>
  <option>Other</option>
`;

function setExpenseTab() {
  quickExpenseTab.classList.add("active");
  quickIncomeTab.classList.remove("active");
  quickTypeInput.value       = "expense";
  quickDescInput.placeholder = "What did you spend on?";
  quickCatLabel.textContent  = "Category";
  if (window._populateSelect) {
    window._populateSelect(quickCategorySelect, "expense");
  } else {
    quickCategorySelect.innerHTML = expenseCategoryOptions;
  }
  quickSubmitBtn.textContent = "Save Expense";
}

function setIncomeTab() {
  quickIncomeTab.classList.add("active");
  quickExpenseTab.classList.remove("active");
  quickTypeInput.value       = "income";
  quickDescInput.placeholder = "Where did this come from?";
  quickCatLabel.textContent  = "Type";
  if (window._populateSelect) {
    window._populateSelect(quickCategorySelect, "income");
  } else {
    quickCategorySelect.innerHTML = incomeTypeOptions;
  }
  quickSubmitBtn.textContent = "Save Income";
}

quickExpenseTab.addEventListener("click", setExpenseTab);
quickIncomeTab.addEventListener("click", setIncomeTab);

// Quick Add button — reset to expense tab + today's date
document.getElementById("quickAddBtn").addEventListener("click", () => {
  setExpenseTab();
  document.getElementById("quickDate").value = new Date().toISOString().split("T")[0];
  openModal("quickAddModal");
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

// Load saved preference
if (localStorage.getItem("netwrth-theme") === "light") {
  html.classList.remove("dark");
}
updateThemeIcon();

darkToggle.addEventListener("click", () => {
  html.classList.toggle("dark");
  localStorage.setItem("netwrth-theme", html.classList.contains("dark") ? "dark" : "light");
  updateThemeIcon();
});

// ── Format currency ───────────────────────────────────────────────────────
export function formatINR(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0
  }).format(amount);
}
