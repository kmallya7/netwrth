// js/budgets.js
// ─── Budgets & Goals Module ────────────────────────────────────────────────

import { db }                                                            from "./firebase.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, Timestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getCurrentUid }                                                 from "./auth.js";
import { showToast, formatINR, openModal, closeAllModals }              from "./ui.js";
import { allExpenses }                                                   from "./expenses.js";

function budgetsCol(uid) { return collection(db, "users", uid, "budgets"); }
function goalsCol(uid)   { return collection(db, "users", uid, "goals");   }

let allBudgets      = [];
let allGoals        = [];
let editingBudgetId = null;
let editingGoalId   = null;

// ── Helpers ───────────────────────────────────────────────────────────────
function monthlySpend() {
  const now = new Date();
  const spend = {};
  allExpenses.forEach(e => {
    const d = e.date?.toDate ? e.date.toDate() : new Date(e.date);
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
      spend[e.category] = (spend[e.category] || 0) + e.amount;
    }
  });
  return spend;
}

// ── Budgets ───────────────────────────────────────────────────────────────
export async function loadBudgets() {
  const uid = getCurrentUid();
  if (!uid) return;

  const snap = await getDocs(budgetsCol(uid));
  allBudgets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderBudgets(allBudgets);
  renderBudgetOverview(allBudgets);
}

function renderBudgets(budgets) {
  const list = document.getElementById("budgetsList");
  if (!budgets.length) {
    list.innerHTML = `<p class="text-sm text-neutral-500">No budgets set.</p>`;
    return;
  }

  const spend = monthlySpend();

  list.innerHTML = budgets.map(b => {
    const spent  = spend[b.category] || 0;
    const pct    = Math.min((spent / b.limit) * 100, 100).toFixed(0);
    const over   = spent > b.limit;
    const barCls = over ? "bg-red-500" : pct > 75 ? "bg-amber-400" : "bg-emerald-500";

    return `
      <div class="card">
        <div class="flex items-center justify-between mb-2">
          <span class="font-medium text-sm">${b.category}</span>
          <div class="flex items-center gap-2">
            <span class="text-sm ${over ? "text-red-400" : "text-neutral-400"}">${formatINR(spent)} / ${formatINR(b.limit)}</span>
            <button data-id="${b.id}" class="action-btn edit-btn"
                    onclick="window._editBudget(this.dataset.id)" title="Edit">✎</button>
            <button data-id="${b.id}" data-type="budget" class="action-btn delete-btn"
                    onclick="window._softDelete(this)" title="Delete">✕</button>
          </div>
        </div>
        <div class="h-2 rounded-full bg-neutral-800 overflow-hidden budget-bar-track">
          <div class="h-full rounded-full transition-all ${barCls}" style="width:${pct}%"></div>
        </div>
        <p class="text-xs text-neutral-500 mt-1">${pct}% used${over ? " — over budget!" : ""}</p>
      </div>`;
  }).join("");
}

function renderBudgetOverview(budgets) {
  const overview = document.getElementById("budgetOverview");
  if (!budgets.length) {
    overview.innerHTML = `<p class="text-sm text-neutral-500">No budgets set.</p>`;
    return;
  }

  const spend = monthlySpend();

  overview.innerHTML = budgets.slice(0, 4).map((b, i) => {
    const spent  = spend[b.category] || 0;
    const pct    = Math.min((spent / b.limit) * 100, 100).toFixed(0);
    const over   = spent > b.limit;
    const barCls = over ? "bg-red-500" : pct > 75 ? "bg-amber-400" : "bg-emerald-500";
    return `
      <div class="budget-overview-row cursor-pointer"
           onclick="window._navigateTo('budgets')" title="View all budgets">
        <div class="flex justify-between text-xs mb-1.5">
          <span>${b.category}</span>
          <span class="${over ? "text-red-400" : "text-neutral-400"}">${pct}%</span>
        </div>
        <div class="h-1.5 rounded-full bg-neutral-800 budget-bar-track">
          <div class="h-full rounded-full budget-bar ${barCls}"
               style="width:${pct}%; animation-delay:${i * 100}ms"></div>
        </div>
      </div>`;
  }).join("");
}

export async function addBudget(data) {
  const uid = getCurrentUid();
  if (!uid) return;
  await addDoc(budgetsCol(uid), {
    category:  data.category || "",
    limit:     parseFloat(data.limit),
    createdAt: Timestamp.now(),
  });
  showToast("Budget saved.");
  await loadBudgets();
}

export async function updateBudget(id, data) {
  const uid = getCurrentUid();
  if (!uid) return;
  await updateDoc(doc(db, "users", uid, "budgets", id), {
    category: data.category || "",
    limit:    parseFloat(data.limit),
  });
  showToast("Budget updated.");
  await loadBudgets();
}

export async function deleteBudget(id) {
  const uid = getCurrentUid();
  if (!uid) return;
  await deleteDoc(doc(db, "users", uid, "budgets", id));
  showToast("Budget removed.", "info");
  await loadBudgets();
}

function openBudgetEdit(id) {
  const budget = allBudgets.find(b => b.id === id);
  if (!budget) return;

  editingBudgetId = id;
  const form = document.getElementById("addBudgetForm");
  form.category.value = budget.category || "Food & Dining";
  form.limit.value    = budget.limit    || "";

  document.querySelector("#addBudgetModal .modal-title").textContent    = "Edit Budget";
  document.querySelector("#addBudgetModal [type='submit']").textContent = "Update Budget";
  openModal("addBudgetModal");
}

// ── Goals ─────────────────────────────────────────────────────────────────
export async function loadGoals() {
  const uid = getCurrentUid();
  if (!uid) return;

  const snap = await getDocs(goalsCol(uid));
  allGoals   = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderGoals(allGoals);
}

function renderGoals(goals) {
  const list = document.getElementById("goalsList");
  if (!goals.length) {
    list.innerHTML = `<p class="text-sm text-neutral-500">No goals set.</p>`;
    return;
  }

  list.innerHTML = goals.map(g => {
    const saved    = g.saved || 0;
    const pct      = Math.min((saved / g.target) * 100, 100).toFixed(0);
    const deadline = g.deadline
      ? new Date(g.deadline).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
      : "No deadline";

    return `
      <div class="card space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="font-semibold">${g.name}</h4>
          <div class="flex items-center gap-2">
            <button data-id="${g.id}" class="action-btn edit-btn"
                    onclick="window._editGoal(this.dataset.id)" title="Edit">✎</button>
            <button data-id="${g.id}" data-type="goal" class="action-btn delete-btn"
                    onclick="window._softDelete(this)" title="Delete">✕</button>
          </div>
        </div>
        <div class="flex justify-between text-sm text-neutral-400">
          <span>${formatINR(saved)} saved</span>
          <span>Target: ${formatINR(g.target)}</span>
        </div>
        <div class="h-2 rounded-full bg-neutral-800 budget-bar-track">
          <div class="h-full rounded-full bg-emerald-500 transition-all" style="width:${pct}%"></div>
        </div>
        <div class="flex justify-between text-xs text-neutral-500">
          <span>${pct}% complete</span>
          <span>${deadline}</span>
        </div>
      </div>`;
  }).join("");
}

export async function addGoal(data) {
  const uid = getCurrentUid();
  if (!uid) return;
  await addDoc(goalsCol(uid), {
    name:      data.name     || "",
    target:    parseFloat(data.target),
    saved:     parseFloat(data.saved || 0),
    deadline:  data.deadline || "",
    createdAt: Timestamp.now(),
  });
  showToast("Goal saved.");
  await loadGoals();
}

export async function updateGoal(id, data) {
  const uid = getCurrentUid();
  if (!uid) return;
  await updateDoc(doc(db, "users", uid, "goals", id), {
    name:     data.name     || "",
    target:   parseFloat(data.target),
    saved:    parseFloat(data.saved || 0),
    deadline: data.deadline || "",
  });
  showToast("Goal updated.");
  await loadGoals();
}

export async function deleteGoal(id) {
  const uid = getCurrentUid();
  if (!uid) return;
  await deleteDoc(doc(db, "users", uid, "goals", id));
  showToast("Goal removed.", "info");
  await loadGoals();
}

function openGoalEdit(id) {
  const goal = allGoals.find(g => g.id === id);
  if (!goal) return;

  editingGoalId = id;
  const form = document.getElementById("addGoalForm");
  form.name.value     = goal.name     || "";
  form.target.value   = goal.target   || "";
  form.saved.value    = goal.saved    || "";
  form.deadline.value = goal.deadline || "";

  document.querySelector("#addGoalModal .modal-title").textContent    = "Edit Goal";
  document.querySelector("#addGoalModal [type='submit']").textContent = "Update Goal";
  openModal("addGoalModal");
}

// ── Form Handlers ─────────────────────────────────────────────────────────
document.getElementById("addBudgetForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(e.target));
  if (editingBudgetId) {
    await updateBudget(editingBudgetId, fd);
    editingBudgetId = null;
    document.querySelector("#addBudgetModal .modal-title").textContent    = "Add Budget";
    document.querySelector("#addBudgetModal [type='submit']").textContent = "Save Budget";
  } else {
    await addBudget(fd);
  }
  e.target.reset();
  closeAllModals();
});

document.getElementById("addGoalForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(e.target));
  if (editingGoalId) {
    await updateGoal(editingGoalId, fd);
    editingGoalId = null;
    document.querySelector("#addGoalModal .modal-title").textContent    = "Add Savings Goal";
    document.querySelector("#addGoalModal [type='submit']").textContent = "Save Goal";
  } else {
    await addGoal(fd);
  }
  e.target.reset();
  closeAllModals();
});

// Reset to "add" mode when Add buttons open their modals fresh
document.querySelectorAll('.open-modal[data-modal="addBudgetModal"]').forEach(btn => {
  btn.addEventListener("click", () => {
    editingBudgetId = null;
    document.querySelector("#addBudgetModal .modal-title").textContent    = "Add Budget";
    document.querySelector("#addBudgetModal [type='submit']").textContent = "Save Budget";
    document.getElementById("addBudgetForm").reset();
  });
});

document.querySelectorAll('.open-modal[data-modal="addGoalModal"]').forEach(btn => {
  btn.addEventListener("click", () => {
    editingGoalId = null;
    document.querySelector("#addGoalModal .modal-title").textContent    = "Add Savings Goal";
    document.querySelector("#addGoalModal [type='submit']").textContent = "Save Goal";
    document.getElementById("addGoalForm").reset();
  });
});

// ── Init & Globals ────────────────────────────────────────────────────────
window._editBudget   = openBudgetEdit;
window._deleteBudget = deleteBudget;
window._editGoal     = openGoalEdit;
window._deleteGoal   = deleteGoal;

window.addEventListener("netwrth:userReady", async () => {
  await loadBudgets();
  await loadGoals();
});
