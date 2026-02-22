// js/ui.js
// ─── UI Utilities: Navigation, Modals, Toasts, Dark Mode ─────────────────

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
};

function showSection(id) {
  sections.forEach(s   => s.classList.add("hidden"));
  navLinks.forEach(l   => l.classList.remove("active"));

  const target = document.getElementById(`section-${id}`);
  if (target) target.classList.remove("hidden");

  const activeLink = document.querySelector(`.nav-link[data-section="${id}"]`);
  if (activeLink) activeLink.classList.add("active");

  pageTitle.textContent = sectionTitles[id] || id;
}

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
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("hidden");
}

function closeAllModals() {
  document.querySelectorAll(".modal-overlay").forEach(m => m.classList.add("hidden"));
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

// Quick Add button
document.getElementById("quickAddBtn").addEventListener("click", () => {
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("quickDate").value = today;
  openModal("quickAddModal");
});

export { openModal, closeAllModals };

// ── Quick Add Tabs ────────────────────────────────────────────────────────
const quickExpenseTab = document.getElementById("quickExpenseTab");
const quickIncomeTab  = document.getElementById("quickIncomeTab");
const quickTypeInput  = document.querySelector('#quickAddForm input[name="type"]');
const quickDescLabel  = document.getElementById("quickDescLabel");
const quickCatGroup   = document.getElementById("quickCategoryGroup");

quickExpenseTab.addEventListener("click", () => {
  quickExpenseTab.classList.add("active");
  quickIncomeTab.classList.remove("active");
  quickTypeInput.value    = "expense";
  quickDescLabel.textContent = "Description";
  quickCatGroup.classList.remove("hidden");
});

quickIncomeTab.addEventListener("click", () => {
  quickIncomeTab.classList.add("active");
  quickExpenseTab.classList.remove("active");
  quickTypeInput.value    = "income";
  quickDescLabel.textContent = "Source";
  quickCatGroup.classList.add("hidden");
});

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

// Load saved preference
if (localStorage.getItem("netwrth-theme") === "light") {
  html.classList.remove("dark");
}

darkToggle.addEventListener("click", () => {
  html.classList.toggle("dark");
  localStorage.setItem("netwrth-theme", html.classList.contains("dark") ? "dark" : "light");
});

// ── Format currency ───────────────────────────────────────────────────────
export function formatINR(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0
  }).format(amount);
}
