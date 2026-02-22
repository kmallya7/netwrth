// js/budgets.js
// ─── Budgets & Goals Module ────────────────────────────────────────────────

import { db }                                                         from "./firebase.js";
import { collection, addDoc, getDocs, deleteDoc, doc, Timestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getCurrentUid }                                              from "./auth.js";
import { showToast, formatINR }                                       from "./ui.js";
import { allExpenses }                                                from "./expenses.js";

// ── Budgets ───────────────────────────────────────────────────────────────
function budgetsCol(uid)  { return collection(db, "users", uid, "budgets"); }
function goalsCol(uid)    { return collection(db, "users", uid, "goals"); }

export async function loadBudgets() {
  const uid = getCurrentUid();
  if (!uid) return;

  const snap    = await getDocs(budgetsCol(uid));
  const budgets = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  renderBudgets(budgets);
  renderBudgetOverview(budgets); // dashboard widget
}

function renderBudgets(budgets) {
  const list = document.getElementById("budgetsList");
  if (!budgets.length) {
    list.innerHTML = `<p class="text-sm text-neutral-500">No budgets set.</p>`;
    return;
  }

  // Calculate current month spend per category from allExpenses
  const now        = new Date();
  const monthSpend = {};
  allExpenses.forEach(e => {
    const d = e.date?.toDate ? e.date.toDate() : new Date(e.date);
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
      monthSpend[e.category] = (monthSpend[e.category] || 0) + e.amount;
    }
  });

  list.innerHTML = budgets.map(b => {
    const spent   = monthSpend[b.category] || 0;
    const pct     = Math.min((spent / b.limit) * 100, 100).toFixed(0);
    const over    = spent > b.limit;
    const barCls  = over ? "bg-red-500" : pct > 75 ? "bg-amber-400" : "bg-emerald-500";

    return `
      <div class="card">
        <div class="flex items-center justify-between mb-2">
          <span class="font-medium text-sm">${b.category}</span>
          <div class="flex items-center gap-3">
            <span class="text-sm ${over ? "text-red-400" : "text-neutral-400"}">${formatINR(spent)} / ${formatINR(b.limit)}</span>
            <button onclick="window._deleteBudget('${b.id}')" class="text-neutral-600 hover:text-red-400 transition text-xs">✕</button>
          </div>
        </div>
        <div class="h-2 rounded-full bg-neutral-800 overflow-hidden">
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

  const now        = new Date();
  const monthSpend = {};
  allExpenses.forEach(e => {
    const d = e.date?.toDate ? e.date.toDate() : new Date(e.date);
    if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
      monthSpend[e.category] = (monthSpend[e.category] || 0) + e.amount;
    }
  });

  overview.innerHTML = budgets.slice(0, 4).map(b => {
    const spent = monthSpend[b.category] || 0;
    const pct   = Math.min((spent / b.limit) * 100, 100).toFixed(0);
    const over  = spent > b.limit;
    const barCls = over ? "bg-red-500" : pct > 75 ? "bg-amber-400" : "bg-emerald-500";
    return `
      <div>
        <div class="flex justify-between text-xs mb-1">
          <span>${b.category}</span>
          <span class="${over ? "text-red-400" : "text-neutral-400"}">${pct}%</span>
        </div>
        <div class="h-1.5 rounded-full bg-neutral-800">
          <div class="h-full rounded-full ${barCls}" style="width:${pct}%"></div>
        </div>
      </div>`;
  }).join("");
}

export async function addBudget(data) {
  const uid = getCurrentUid();
  if (!uid) return;
  await addDoc(budgetsCol(uid), { ...data, limit: parseFloat(data.limit), createdAt: Timestamp.now() });
  showToast("Budget saved.");
  await loadBudgets();
}

export async function deleteBudget(id) {
  const uid = getCurrentUid();
  if (!uid) return;
  await deleteDoc(doc(db, "users", uid, "budgets", id));
  showToast("Budget removed.", "info");
  await loadBudgets();
}

// ── Goals ─────────────────────────────────────────────────────────────────
export async function loadGoals() {
  const uid  = getCurrentUid();
  if (!uid) return;
  const snap  = await getDocs(goalsCol(uid));
  const goals = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderGoals(goals);
}

function renderGoals(goals) {
  const list = document.getElementById("goalsList");
  if (!goals.length) {
    list.innerHTML = `<p class="text-sm text-neutral-500">No goals set.</p>`;
    return;
  }

  list.innerHTML = goals.map(g => {
    const saved  = g.saved || 0;
    const pct    = Math.min((saved / g.target) * 100, 100).toFixed(0);
    const deadline = g.deadline ? new Date(g.deadline).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "No deadline";
    return `
      <div class="card space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="font-semibold">${g.name}</h4>
          <button onclick="window._deleteGoal('${g.id}')" class="text-neutral-600 hover:text-red-400 transition text-xs">✕</button>
        </div>
        <div class="flex justify-between text-sm text-neutral-400">
          <span>${formatINR(saved)} saved</span>
          <span>Target: ${formatINR(g.target)}</span>
        </div>
        <div class="h-2 rounded-full bg-neutral-800">
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
    ...data,
    target: parseFloat(data.target),
    saved:  parseFloat(data.saved || 0),
    createdAt: Timestamp.now()
  });
  showToast("Goal saved.");
  await loadGoals();
}

export async function deleteGoal(id) {
  const uid = getCurrentUid();
  if (!uid) return;
  await deleteDoc(doc(db, "users", uid, "goals", id));
  showToast("Goal removed.", "info");
  await loadGoals();
}

// ── Form Handlers ─────────────────────────────────────────────────────────
document.getElementById("addBudgetForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  await addBudget(Object.fromEntries(new FormData(e.target)));
  e.target.reset();
  document.getElementById("addBudgetModal").classList.add("hidden");
});

document.getElementById("addGoalForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  await addGoal(Object.fromEntries(new FormData(e.target)));
  e.target.reset();
  document.getElementById("addGoalModal").classList.add("hidden");
});

window._deleteBudget = deleteBudget;
window._deleteGoal   = deleteGoal;

window.addEventListener("netwrth:userReady", async () => {
  await loadBudgets();
  await loadGoals();
});
