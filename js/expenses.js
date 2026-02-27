// js/expenses.js
// ─── Expenses Module ───────────────────────────────────────────────────────

import { db }                                                            from "./firebase.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc,
         query, orderBy, Timestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getCurrentUid }                                                 from "./auth.js";
import { showToast, formatINR, openModal, closeAllModals }              from "./ui.js";

let allExpenses      = [];
let editingExpenseId = null;

// ── Collection path ───────────────────────────────────────────────────────
function expensesCol(uid) {
  return collection(db, "users", uid, "expenses");
}

// ── Date formatter → "23-Feb-2026" with Today / Yesterday badge ───────────
function formatExpDate(dateField) {
  const d = dateField?.toDate ? dateField.toDate() : new Date(dateField);
  const today     = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const day   = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en", { month: "short" }); // "Feb"
  const year  = d.getFullYear();
  const label = `${day}-${month}-${year}`;

  if (d.toDateString() === today.toDateString())
    return `<span class="exp-date-label">${label}</span><span class="exp-badge-today">Today</span>`;
  if (d.toDateString() === yesterday.toDateString())
    return `<span class="exp-date-label">${label}</span><span class="exp-badge-yday">Yest.</span>`;
  return `<span class="exp-date-label">${label}</span>`;
}

// ── Category colour map ────────────────────────────────────────────────────
const CAT_COLORS = {
  "Food & Dining":     { bg: "rgba(251,146,60,0.14)",  fg: "#fb923c" },
  "Transport":         { bg: "rgba(96,165,250,0.14)",   fg: "#60a5fa" },
  "Shopping":          { bg: "rgba(167,139,250,0.14)",  fg: "#a78bfa" },
  "Bills & Utilities": { bg: "rgba(250,204,21,0.14)",   fg: "#facc15" },
  "Health":            { bg: "rgba(52,211,153,0.14)",   fg: "#34d399" },
  "Entertainment":     { bg: "rgba(244,114,182,0.14)",  fg: "#f472b6" },
  "Education":         { bg: "rgba(129,140,248,0.14)",  fg: "#818cf8" },
  "Other":             { bg: "rgba(113,113,122,0.14)",  fg: "#a1a1aa" },
};

function catBadge(category, categoryGroup) {
  const key = categoryGroup || category || "Other";
  const col = CAT_COLORS[key] || CAT_COLORS["Other"];
  return `<span class="exp-cat-badge" style="background:${col.bg};color:${col.fg}">${category || "—"}</span>`;
}

// ── Category metadata for filter panel ───────────────────────────────────
const CAT_META = {
  "Food & Dining":     { icon: "🍔", short: "Food" },
  "Transport":         { icon: "🚗", short: "Transport" },
  "Shopping":          { icon: "🛍️", short: "Shopping" },
  "Bills & Utilities": { icon: "💡", short: "Bills" },
  "Health":            { icon: "🏥", short: "Health" },
  "Entertainment":     { icon: "🎬", short: "Fun" },
  "Education":         { icon: "📚", short: "Study" },
  "Other":             { icon: "📦", short: "Other" },
};

// ── Active filter state ────────────────────────────────────────────────────
const _initNow        = new Date();
let activeMonth       = `${_initNow.getFullYear()}-${_initNow.getMonth()}`; // "YYYY-M"
let activeCategory    = "";
let activeAccount     = "";
let activeTitleSearch = "";
let activeNotesSearch = "";

// ── Month key → date range ────────────────────────────────────────────────
function getMonthRange(monthKey) {
  if (!monthKey || monthKey === "all") return null;
  const [year, month] = monthKey.split("-").map(Number);
  return {
    from: new Date(year, month, 1),
    to:   new Date(year, month + 1, 0, 23, 59, 59),
  };
}

// ── Month Timeline renderer ───────────────────────────────────────────────
function renderMonthTimeline() {
  const container = document.getElementById("expMonthTimeline");
  if (!container) return;

  const now        = new Date();
  const currentKey = `${now.getFullYear()}-${now.getMonth()}`;
  const months     = [];

  // Build last 18 months up to current
  for (let i = 17; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }

  const allBtn = `<button class="exp-month-item exp-month-all ${activeMonth === "all" ? "active" : ""}" data-month="all">
    <span class="exp-month-name">All</span>
    <span class="exp-month-year">time</span>
  </button>`;

  const monthBtns = months.map(({ year, month }) => {
    const key       = `${year}-${month}`;
    const isActive  = activeMonth === key;
    const isCurrent = key === currentKey;
    const mName     = new Date(year, month).toLocaleString("en", { month: "short" });
    return `<button class="exp-month-item${isActive ? " active" : ""}${isCurrent ? " is-current" : ""}" data-month="${key}">
      <span class="exp-month-name">${mName}</span>
      <span class="exp-month-year">${year}</span>
    </button>`;
  }).join("");

  container.innerHTML = allBtn + monthBtns;

  // Scroll active item to center of the strip
  requestAnimationFrame(() => {
    const activeEl = container.querySelector(".active");
    if (activeEl) {
      container.scrollLeft =
        activeEl.offsetLeft - (container.offsetWidth - activeEl.offsetWidth) / 2;
    }
  });
}

// ── Filter Panel ──────────────────────────────────────────────────────────
let filterPanelOpen = false;
let fpCategory = "";
let fpAccount  = "";
let fpTitle    = "";
let fpNotes    = "";

function renderFpCats() {
  const container = document.getElementById("expFpCats");
  if (!container) return;

  const allBtn = `<button class="exp-fp-cat${!fpCategory ? " active" : ""}" data-fpcat="">
    <div class="exp-fp-cat-icon exp-fp-cat-all">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    </div>
    <span class="exp-fp-cat-label">All</span>
  </button>`;

  const catBtns = Object.entries(CAT_META).map(([cat, meta]) => {
    const col = CAT_COLORS[cat] || CAT_COLORS["Other"];
    return `<button class="exp-fp-cat${fpCategory === cat ? " active" : ""}" data-fpcat="${cat}">
      <div class="exp-fp-cat-icon" style="background:${col.bg}"><span>${meta.icon}</span></div>
      <span class="exp-fp-cat-label">${meta.short}</span>
    </button>`;
  }).join("");

  container.innerHTML = allBtn + catBtns;
}

function renderFpAccounts() {
  const wrap      = document.getElementById("expFpAccountsWrap");
  const container = document.getElementById("expFpAccounts");
  if (!wrap || !container) return;

  const accounts = [...new Set(allExpenses.map(e => e.account).filter(Boolean))].sort();
  if (!accounts.length) { wrap.hidden = true; return; }
  wrap.hidden = false;

  container.innerHTML = [
    `<button class="exp-fp-chip${!fpAccount ? " active" : ""}" data-fpacc="">All</button>`,
    ...accounts.map(acc =>
      `<button class="exp-fp-chip${fpAccount === acc ? " active" : ""}" data-fpacc="${acc}">${acc}</button>`
    ),
  ].join("");
}

function updateFilterIndicator() {
  const on = !!(activeCategory || activeAccount || activeTitleSearch || activeNotesSearch);
  document.getElementById("expFilterBtn")?.classList.toggle("has-filters", on);
}

function openFilterPanel(focusTitle = false) {
  fpCategory = activeCategory;
  fpAccount  = activeAccount;
  fpTitle    = activeTitleSearch;
  fpNotes    = activeNotesSearch;
  renderFpCats();
  renderFpAccounts();
  document.getElementById("expFpTitle").value = fpTitle;
  document.getElementById("expFpNotes").value = fpNotes;
  document.getElementById("expFilterPanel").classList.add("open");
  document.getElementById("expFilterBtn").classList.add("active");
  filterPanelOpen = true;
  if (focusTitle) requestAnimationFrame(() => document.getElementById("expFpTitle").focus());
}

function closeFilterPanel() {
  document.getElementById("expFilterPanel").classList.remove("open");
  document.getElementById("expFilterBtn").classList.remove("active");
  filterPanelOpen = false;
}

// ── Unified filter + render ───────────────────────────────────────────────
function applyFilters() {
  const range = getMonthRange(activeMonth);
  let filtered = allExpenses;

  if (range) {
    filtered = filtered.filter(e => {
      const d = e.date?.toDate ? e.date.toDate() : new Date(e.date);
      return d >= range.from && d <= range.to;
    });
  }
  if (activeCategory) {
    filtered = filtered.filter(e =>
      e.category === activeCategory || e.categoryGroup === activeCategory
    );
  }
  if (activeAccount) {
    filtered = filtered.filter(e => e.account === activeAccount);
  }
  if (activeTitleSearch) {
    const q = activeTitleSearch.toLowerCase();
    filtered = filtered.filter(e =>
      (e.description || "").toLowerCase().includes(q) ||
      (e.category    || "").toLowerCase().includes(q)
    );
  }
  if (activeNotesSearch) {
    const q = activeNotesSearch.toLowerCase();
    filtered = filtered.filter(e => (e.notes || "").toLowerCase().includes(q));
  }

  renderExpensesTable(filtered);
  updateExpenseSummary(filtered);
  renderCategoryBreakdown(filtered);
}

// ── Load ──────────────────────────────────────────────────────────────────
export async function loadExpenses() {
  const uid = getCurrentUid();
  if (!uid) return;

  if (window._demoMode) {
    allExpenses = [...(window._demoData?.expenses || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    window._netwrthExpenses = allExpenses;
    applyFilters();
    window.dispatchEvent(new Event("netwrth:dataChanged"));
    return allExpenses;
  }

  try {
    const q    = query(expensesCol(uid), orderBy("date", "desc"));
    const snap = await getDocs(q);
    allExpenses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    window._netwrthExpenses = allExpenses;
    applyFilters();
    window.dispatchEvent(new Event("netwrth:dataChanged"));
    return allExpenses;
  } catch (err) {
    console.error("loadExpenses:", err);
  }
}

// ── Add ───────────────────────────────────────────────────────────────────
export async function addExpense(data) {
  if (window._demoMode) { showToast("Demo mode — sign in to save data.", "info"); return false; }
  const uid = getCurrentUid();
  if (!uid) { showToast("Not signed in — please refresh.", "error"); return false; }

  try {
    const dateObj = new Date(data.date + "T12:00:00");
    await addDoc(expensesCol(uid), {
      description:   data.description   || "",
      amount:        parseFloat(data.amount),
      date:          Timestamp.fromDate(dateObj),
      category:      data.category      || "Other",
      categoryGroup: data.categoryGroup || data.category || "Other",
      account:       data.account       || "Cash",
      notes:         data.notes         || "",
      createdAt:     Timestamp.now(),
    });
    showToast("Expense saved.");
    await loadExpenses();
    return true;
  } catch (err) {
    console.error("addExpense:", err);
    showToast(err.code === "permission-denied"
      ? "Permission denied — update your Firestore rules."
      : "Failed to save expense.", "error");
    return false;
  }
}

// ── Update ────────────────────────────────────────────────────────────────
export async function updateExpense(id, data) {
  if (window._demoMode) { showToast("Demo mode — sign in to save data.", "info"); return false; }
  const uid = getCurrentUid();
  if (!uid) return false;

  try {
    const dateObj = new Date(data.date + "T12:00:00");
    await updateDoc(doc(db, "users", uid, "expenses", id), {
      description:   data.description   || "",
      amount:        parseFloat(data.amount),
      date:          Timestamp.fromDate(dateObj),
      category:      data.category      || "Other",
      categoryGroup: data.categoryGroup || data.category || "Other",
      account:       data.account       || "Cash",
      notes:         data.notes         || "",
    });
    showToast("Expense updated.");
    await loadExpenses();
    return true;
  } catch (err) {
    console.error("updateExpense:", err);
    showToast("Failed to update expense.", "error");
    return false;
  }
}

// ── Delete ────────────────────────────────────────────────────────────────
export async function deleteExpense(id) {
  if (window._demoMode) { showToast("Demo mode — sign in to save data.", "info"); return; }
  const uid = getCurrentUid();
  if (!uid) return;
  try {
    await deleteDoc(doc(db, "users", uid, "expenses", id));
    showToast("Expense deleted.", "info");
    await loadExpenses();
  } catch (err) {
    console.error("deleteExpense:", err);
    showToast("Failed to delete expense.", "error");
  }
}

// ── Open Edit Modal ────────────────────────────────────────────────────────
function openExpenseEdit(id) {
  const expense = allExpenses.find(e => e.id === id);
  if (!expense) return;

  editingExpenseId = id;
  const form = document.getElementById("addExpenseForm");
  form.description.value = expense.description || "";
  form.amount.value      = expense.amount      || "";
  const d = expense.date?.toDate ? expense.date.toDate() : new Date(expense.date);
  form.date.value        = d.toISOString().split("T")[0];
  form.account.value     = expense.account  || "Cash";
  form.notes.value       = expense.notes    || "";

  document.querySelector("#addExpenseModal .modal-title").textContent    = "Edit Expense";
  document.querySelector("#addExpenseModal [type='submit']").textContent = "Update Expense";
  openModal("addExpenseModal");
  if (window._initCatPicker) {
    window._initCatPicker("expCatGroups", "expCatSubs", "expense", expense.category, expense.categoryGroup);
  }
}

// ── Animate stat value pop ────────────────────────────────────────────────
function animateStat(el, text) {
  if (!el) return;
  el.textContent = text;
  el.classList.remove("stat-pop");
  void el.offsetWidth;
  el.classList.add("stat-pop");
}

// ── Render Table ──────────────────────────────────────────────────────────
function renderExpensesTable(expenses) {
  const tbody = document.getElementById("expensesTableBody");

  if (!expenses.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-16 text-center">
          <div class="exp-empty">
            <div class="exp-empty-icon">💸</div>
            <p class="exp-empty-title">Nothing here yet</p>
            <p class="exp-empty-sub">Add an expense or adjust your filters</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = expenses.map((e, i) => {
    const escapedNotes = (e.notes || "").replace(/"/g, "&quot;");
    const notesDot = e.notes
      ? `<span class="exp-notes-dot" title="${escapedNotes}">·</span>`
      : "";
    return `
      <tr class="table-row exp-table-row" style="animation-delay:${i * 0.035}s">
        <td class="py-3 pr-4 text-sm whitespace-nowrap">${formatExpDate(e.date)}</td>
        <td class="py-3 font-medium">
          <span>${e.description}</span>${notesDot}
        </td>
        <td class="py-3">${catBadge(e.category, e.categoryGroup)}</td>
        <td class="py-3 text-neutral-400 text-sm">${e.account || "—"}</td>
        <td class="py-3 text-right font-mono text-red-400 font-semibold">${formatINR(e.amount)}</td>
        <td class="py-3 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button data-id="${e.id}" class="action-btn edit-btn"
                    onclick="window._editExpense(this.dataset.id)" title="Edit">✎</button>
            <button data-id="${e.id}" data-type="expense" class="action-btn delete-btn"
                    onclick="window._softDelete(this)" title="Delete">✕</button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

// ── Category breakdown bars ───────────────────────────────────────────────
function renderCategoryBreakdown(expenses) {
  const container = document.getElementById("expCategoryBreakdown");
  if (!container) return;

  if (!expenses.length) {
    container.innerHTML = `<p class="text-sm text-neutral-500">No expenses in this period.</p>`;
    return;
  }

  const total  = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const catMap = {};
  expenses.forEach(e => {
    const key = e.categoryGroup || e.category || "Other";
    catMap[key] = (catMap[key] || 0) + e.amount;
  });

  const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

  container.innerHTML = sorted.map(([cat, amt]) => {
    const pct = total ? Math.round((amt / total) * 100) : 0;
    const col = CAT_COLORS[cat] || CAT_COLORS["Other"];
    return `
      <div class="exp-breakdown-row">
        <div class="exp-breakdown-info">
          <span class="exp-breakdown-cat" style="color:${col.fg}">${cat}</span>
          <span class="exp-breakdown-meta">${pct}% · ${formatINR(amt)}</span>
        </div>
        <div class="budget-bar-track exp-breakdown-track">
          <div class="budget-bar exp-breakdown-bar" style="width:${pct}%;background:${col.fg};opacity:0.75;height:100%;border-radius:999px"></div>
        </div>
      </div>`;
  }).join("");
}

// ── Update Summary ────────────────────────────────────────────────────────
function updateExpenseSummary(expenses) {
  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const days  = new Set(expenses.map(e => {
    const d = e.date?.toDate ? e.date.toDate() : new Date(e.date);
    return d.toDateString();
  })).size || 1;

  const catCount = {};
  expenses.forEach(e => { catCount[e.category] = (catCount[e.category] || 0) + e.amount; });
  const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  animateStat(document.getElementById("expTotalSpent"),  formatINR(total));
  animateStat(document.getElementById("expAvgDay"),      formatINR(Math.round(total / days)));
  animateStat(document.getElementById("expTopCategory"), topCat);
  animateStat(document.getElementById("expTxCount"),     String(expenses.length));
}

// ── Form Handler ──────────────────────────────────────────────────────────
document.getElementById("addExpenseForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(e.target));
  let ok;
  if (editingExpenseId) {
    ok = await updateExpense(editingExpenseId, fd);
  } else {
    ok = await addExpense(fd);
  }
  if (ok) {
    e.target.reset();
    editingExpenseId = null;
    document.querySelector("#addExpenseModal .modal-title").textContent    = "Add Expense";
    document.querySelector("#addExpenseModal [type='submit']").textContent = "Save Expense";
    closeAllModals();
  }
});

// Reset to "add" mode when the Add button opens the modal fresh
document.querySelectorAll('.open-modal[data-modal="addExpenseModal"]').forEach(btn => {
  btn.addEventListener("click", () => {
    editingExpenseId = null;
    document.querySelector("#addExpenseModal .modal-title").textContent    = "Add Expense";
    document.querySelector("#addExpenseModal [type='submit']").textContent = "Save Expense";
    document.getElementById("addExpenseForm").reset();
    if (window._initCatPicker) {
      window._initCatPicker("expCatGroups", "expCatSubs", "expense", null, null);
    }
  });
});

// ── Filters ───────────────────────────────────────────────────────────────

// Month timeline click
document.getElementById("expMonthTimeline").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-month]");
  if (!btn) return;
  activeMonth = btn.dataset.month;
  renderMonthTimeline();
  applyFilters();
});

// Filter / Search buttons toggle the panel
document.getElementById("expFilterBtn").addEventListener("click", () => {
  filterPanelOpen ? closeFilterPanel() : openFilterPanel();
});
document.getElementById("expSearchBtn").addEventListener("click", () => {
  filterPanelOpen ? closeFilterPanel() : openFilterPanel(true);
});

// Filter panel: category card + account chip clicks
document.getElementById("expFilterPanel").addEventListener("click", (e) => {
  const catBtn = e.target.closest("[data-fpcat]");
  if (catBtn) {
    fpCategory = catBtn.dataset.fpcat;
    document.querySelectorAll("#expFpCats .exp-fp-cat").forEach(b =>
      b.classList.toggle("active", b.dataset.fpcat === fpCategory)
    );
    return;
  }
  const accBtn = e.target.closest("[data-fpacc]");
  if (accBtn) {
    fpAccount = accBtn.dataset.fpacc;
    document.querySelectorAll("#expFpAccounts .exp-fp-chip").forEach(b =>
      b.classList.toggle("active", b.dataset.fpacc === fpAccount)
    );
  }
});

document.getElementById("expFpApply").addEventListener("click", () => {
  fpTitle = document.getElementById("expFpTitle").value.trim();
  fpNotes = document.getElementById("expFpNotes").value.trim();
  activeCategory    = fpCategory;
  activeAccount     = fpAccount;
  activeTitleSearch = fpTitle;
  activeNotesSearch = fpNotes;
  applyFilters();
  updateFilterIndicator();
  closeFilterPanel();
});

document.getElementById("expFpReset").addEventListener("click", () => {
  fpCategory = fpAccount = fpTitle = fpNotes = "";
  activeCategory = activeAccount = activeTitleSearch = activeNotesSearch = "";
  document.getElementById("expFpTitle").value = "";
  document.getElementById("expFpNotes").value = "";
  renderFpCats();
  renderFpAccounts();
  applyFilters();
  updateFilterIndicator();
  closeFilterPanel();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && filterPanelOpen) closeFilterPanel();
});

// ── Init & Globals ────────────────────────────────────────────────────────
window.addEventListener("netwrth:userReady", () => {
  renderMonthTimeline();
  updateFilterIndicator();
  loadExpenses();
});
window._editExpense   = openExpenseEdit;
window._deleteExpense = deleteExpense;

export { allExpenses };
