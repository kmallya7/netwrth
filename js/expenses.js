// js/expenses.js
// ─── Expenses Module ───────────────────────────────────────────────────────

import { db }                                                     from "./firebase.js";
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, orderBy, Timestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getCurrentUid }                                          from "./auth.js";
import { showToast, formatINR }                                   from "./ui.js";

let allExpenses = [];

// ── Collection path helper ────────────────────────────────────────────────
function expensesCol(uid) {
  return collection(db, "users", uid, "expenses");
}

// ── Load Expenses ─────────────────────────────────────────────────────────
export async function loadExpenses() {
  const uid = getCurrentUid();
  if (!uid) return;

  const q   = query(expensesCol(uid), orderBy("date", "desc"));
  const snap = await getDocs(q);

  allExpenses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderExpensesTable(allExpenses);
  updateExpenseSummary(allExpenses);
  return allExpenses;
}

// ── Add Expense ───────────────────────────────────────────────────────────
export async function addExpense(data) {
  const uid = getCurrentUid();
  if (!uid) return;

  await addDoc(expensesCol(uid), {
    ...data,
    amount: parseFloat(data.amount),
    date:   Timestamp.fromDate(new Date(data.date)),
    createdAt: Timestamp.now()
  });

  showToast("Expense saved.");
  await loadExpenses();
}

// ── Delete Expense ────────────────────────────────────────────────────────
export async function deleteExpense(id) {
  const uid = getCurrentUid();
  if (!uid) return;

  await deleteDoc(doc(db, "users", uid, "expenses", id));
  showToast("Expense deleted.", "info");
  await loadExpenses();
}

// ── Render Table ──────────────────────────────────────────────────────────
function renderExpensesTable(expenses) {
  const tbody = document.getElementById("expensesTableBody");
  if (!expenses.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-neutral-500">No expenses recorded.</td></tr>`;
    return;
  }

  tbody.innerHTML = expenses.map(e => {
    const date = e.date?.toDate ? e.date.toDate().toLocaleDateString("en-IN") : e.date;
    return `
      <tr class="table-row">
        <td class="py-3 text-neutral-400">${date}</td>
        <td class="py-3 font-medium">${e.description}</td>
        <td class="py-3"><span class="category-badge">${e.category}</span></td>
        <td class="py-3 text-neutral-400">${e.account || "—"}</td>
        <td class="py-3 text-right font-mono text-red-400">${formatINR(e.amount)}</td>
        <td class="py-3 text-right">
          <button onclick="window._deleteExpense('${e.id}')" class="text-neutral-600 hover:text-red-400 transition text-xs">✕</button>
        </td>
      </tr>`;
  }).join("");
}

// ── Update Summary Cards ──────────────────────────────────────────────────
function updateExpenseSummary(expenses) {
  const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const days  = new Set(expenses.map(e => {
    const d = e.date?.toDate ? e.date.toDate() : new Date(e.date);
    return d.toDateString();
  })).size || 1;

  const catCount = {};
  expenses.forEach(e => { catCount[e.category] = (catCount[e.category] || 0) + e.amount; });
  const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  document.getElementById("expTotalSpent").textContent = formatINR(total);
  document.getElementById("expAvgDay").textContent     = formatINR(Math.round(total / days));
  document.getElementById("expTopCategory").textContent = topCat;
}

// ── Form Handler ──────────────────────────────────────────────────────────
document.getElementById("addExpenseForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  await addExpense(Object.fromEntries(fd));
  e.target.reset();
  document.getElementById("addExpenseModal").classList.add("hidden");
});

// ── Expose delete globally (for inline onclick) ───────────────────────────
window._deleteExpense = deleteExpense;

// ── Filters ───────────────────────────────────────────────────────────────
document.getElementById("expenseCategoryFilter").addEventListener("change", (e) => {
  const cat = e.target.value;
  const filtered = cat ? allExpenses.filter(ex => ex.category === cat) : allExpenses;
  renderExpensesTable(filtered);
  updateExpenseSummary(filtered);
});

// ── Init on login ─────────────────────────────────────────────────────────
window.addEventListener("netwrth:userReady", loadExpenses);

export { allExpenses };
