// js/debts.js
// ─── Debts & Loans Module ─────────────────────────────────────────────────

import { db }                                                         from "./firebase.js";
import { collection, addDoc, getDocs, deleteDoc, doc, Timestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getCurrentUid }                                              from "./auth.js";
import { showToast, formatINR }                                       from "./ui.js";

function debtsCol(uid) { return collection(db, "users", uid, "debts"); }

export async function loadDebts() {
  const uid  = getCurrentUid();
  if (!uid) return;

  const snap  = await getDocs(debtsCol(uid));
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  renderDebtsList(items);
  updateDebtSummary(items);
  return items;
}

function renderDebtsList(items) {
  const list = document.getElementById("debtsList");
  if (!items.length) {
    list.innerHTML = `<p class="text-sm text-neutral-500">No debts recorded.</p>`;
    return;
  }

  list.innerHTML = items.map(debt => {
    const paidPct = debt.total ? (((debt.total - debt.remaining) / debt.total) * 100).toFixed(0) : 0;
    const due     = debt.dueDate
      ? new Date(debt.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "No due date";

    return `
      <div class="card space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="font-semibold">${debt.name}</h4>
            <p class="text-xs text-neutral-500">${debt.lender || "Unknown lender"} · Due ${due}</p>
          </div>
          <div class="flex items-center gap-3">
            ${debt.interest ? `<span class="text-xs text-amber-400">${debt.interest}% p.a.</span>` : ""}
            <button onclick="window._deleteDebt('${debt.id}')" class="text-neutral-600 hover:text-red-400 transition text-xs">✕</button>
          </div>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-neutral-400">Remaining</span>
          <span class="font-mono text-red-400">${formatINR(debt.remaining)}</span>
        </div>
        <div class="h-2 rounded-full bg-neutral-800">
          <div class="h-full rounded-full bg-emerald-500 transition-all" style="width:${paidPct}%"></div>
        </div>
        <p class="text-xs text-neutral-500">${paidPct}% paid off · Total: ${formatINR(debt.total)}</p>
      </div>`;
  }).join("");
}

function updateDebtSummary(items) {
  const totalOwed  = items.reduce((s, d) => s + (d.remaining || 0), 0);
  const avgInt     = items.length
    ? (items.reduce((s, d) => s + (parseFloat(d.interest) || 0), 0) / items.length).toFixed(1)
    : 0;

  document.getElementById("debtTotal").textContent       = formatINR(totalOwed);
  document.getElementById("debtAvgInterest").textContent = `${avgInt}%`;
  document.getElementById("debtCount").textContent       = items.length;
}

export async function addDebt(data) {
  const uid = getCurrentUid();
  if (!uid) return;
  await addDoc(debtsCol(uid), {
    ...data,
    total:     parseFloat(data.total),
    remaining: parseFloat(data.remaining),
    interest:  parseFloat(data.interest || 0),
    createdAt: Timestamp.now()
  });
  showToast("Debt saved.");
  await loadDebts();
}

export async function deleteDebt(id) {
  const uid = getCurrentUid();
  if (!uid) return;
  await deleteDoc(doc(db, "users", uid, "debts", id));
  showToast("Debt removed.", "info");
  await loadDebts();
}

document.getElementById("addDebtForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  await addDebt(Object.fromEntries(new FormData(e.target)));
  e.target.reset();
  document.getElementById("addDebtModal").classList.add("hidden");
});

window._deleteDebt = deleteDebt;
window.addEventListener("netwrth:userReady", loadDebts);
