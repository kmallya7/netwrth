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

// ── Load ──────────────────────────────────────────────────────────────────
export async function loadExpenses() {
  const uid = getCurrentUid();
  if (!uid) return;

  try {
    const q    = query(expensesCol(uid), orderBy("date", "desc"));
    const snap = await getDocs(q);
    allExpenses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderExpensesTable(allExpenses);
    updateExpenseSummary(allExpenses);
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
      description: data.description || "",
      amount:      parseFloat(data.amount),
      date:        Timestamp.fromDate(dateObj),
      category:    data.category || "Other",
      account:     data.account  || "Cash",
      notes:       data.notes    || "",
      createdAt:   Timestamp.now(),
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
      description: data.description || "",
      amount:      parseFloat(data.amount),
      date:        Timestamp.fromDate(dateObj),
      category:    data.category || "Other",
      account:     data.account  || "Cash",
      notes:       data.notes    || "",
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
  form.category.value    = expense.category || "Food & Dining";
  form.account.value     = expense.account  || "Cash";
  form.notes.value       = expense.notes    || "";

  document.querySelector("#addExpenseModal .modal-title").textContent    = "Edit Expense";
  document.querySelector("#addExpenseModal [type='submit']").textContent = "Update Expense";
  openModal("addExpenseModal");
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
        <td class="py-3 text-neutral-400 text-sm">${date}</td>
        <td class="py-3 font-medium">${e.description}</td>
        <td class="py-3"><span class="category-badge">${e.category}</span></td>
        <td class="py-3 text-neutral-400 text-sm">${e.account || "—"}</td>
        <td class="py-3 text-right font-mono text-red-400">${formatINR(e.amount)}</td>
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

  document.getElementById("expTotalSpent").textContent  = formatINR(total);
  document.getElementById("expAvgDay").textContent      = formatINR(Math.round(total / days));
  document.getElementById("expTopCategory").textContent = topCat;
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

// Reset to "add" mode whenever the Add button opens the modal fresh
document.querySelectorAll('.open-modal[data-modal="addExpenseModal"]').forEach(btn => {
  btn.addEventListener("click", () => {
    editingExpenseId = null;
    document.querySelector("#addExpenseModal .modal-title").textContent    = "Add Expense";
    document.querySelector("#addExpenseModal [type='submit']").textContent = "Save Expense";
    document.getElementById("addExpenseForm").reset();
  });
});

// ── Filters ───────────────────────────────────────────────────────────────
document.getElementById("expenseCategoryFilter").addEventListener("change", (e) => {
  const cat      = e.target.value;
  const filtered = cat ? allExpenses.filter(ex => ex.category === cat) : allExpenses;
  renderExpensesTable(filtered);
  updateExpenseSummary(filtered);
});

// ── Init & Globals ────────────────────────────────────────────────────────
window.addEventListener("netwrth:userReady", loadExpenses);
window._editExpense   = openExpenseEdit;
window._deleteExpense = deleteExpense;

export { allExpenses };
