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

// ── Active filter state ────────────────────────────────────────────────────
let activeMonth    = "This Month";
let activeCategory = "";
let activeSearch   = "";

// ── Month → date range ────────────────────────────────────────────────────
function getMonthRange(label) {
  const now = new Date();
  if (label === "All Time") return null;
  if (label === "This Month")    return { from: new Date(now.getFullYear(), now.getMonth(), 1),     to: now };
  if (label === "Last Month")    return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59) };
  if (label === "Last 3 Months") return { from: new Date(now.getFullYear(), now.getMonth() - 3, 1), to: now };
  return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
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
  if (activeSearch) {
    const q = activeSearch.toLowerCase();
    filtered = filtered.filter(e =>
      (e.description || "").toLowerCase().includes(q) ||
      (e.notes       || "").toLowerCase().includes(q) ||
      (e.category    || "").toLowerCase().includes(q)
    );
  }

  renderExpensesTable(filtered);
  updateExpenseSummary(filtered);
  renderCategoryBreakdown(filtered);
}

// ── Load ──────────────────────────────────────────────────────────────────
export async function loadExpenses() {
  const uid = getCurrentUid();
  if (!uid) return;

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
document.getElementById("expenseMonthFilter").addEventListener("change", (e) => {
  activeMonth = e.target.value;
  applyFilters();
});

document.getElementById("expenseCategoryFilter").addEventListener("change", (e) => {
  activeCategory = e.target.value;
  applyFilters();
});

const expSearchEl = document.getElementById("expenseSearch");
if (expSearchEl) {
  expSearchEl.addEventListener("input", (e) => {
    activeSearch = e.target.value.trim();
    applyFilters();
  });
}

// ── Init & Globals ────────────────────────────────────────────────────────
window.addEventListener("netwrth:userReady", loadExpenses);
window._editExpense   = openExpenseEdit;
window._deleteExpense = deleteExpense;

export { allExpenses };
