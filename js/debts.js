// js/debts.js
// ─── Debts & Loans Module ─────────────────────────────────────────────────

import { db }                                                            from "./firebase.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, Timestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getCurrentUid }                                                 from "./auth.js";
import { showToast, formatINR, openModal, closeAllModals }              from "./ui.js";

export let allDebts = [];
let editingDebtId   = null;

function debtsCol(uid) { return collection(db, "users", uid, "debts"); }

// ── Load ──────────────────────────────────────────────────────────────────
export async function loadDebts() {
  const uid = getCurrentUid();
  if (!uid) return;

  const snap = await getDocs(debtsCol(uid));
  allDebts   = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderDebtsList(allDebts);
  updateDebtSummary(allDebts);
  window.dispatchEvent(new CustomEvent("netwrth:dataChanged"));
  return allDebts;
}

// ── Render ────────────────────────────────────────────────────────────────
function renderDebtsList(items) {
  const list = document.getElementById("debtsList");
  if (!items.length) {
    list.innerHTML = `<p class="text-sm text-neutral-500">No debts recorded.</p>`;
    return;
  }

  list.innerHTML = items.map(debt => {
    const paidPct = debt.total
      ? (((debt.total - debt.remaining) / debt.total) * 100).toFixed(0)
      : 0;
    const due = debt.dueDate
      ? new Date(debt.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "No due date";

    return `
      <div class="card space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="font-semibold">${debt.name}</h4>
            <p class="text-xs text-neutral-500">${debt.lender || "Unknown lender"} · Due ${due}</p>
          </div>
          <div class="flex items-center gap-2">
            ${debt.interest ? `<span class="text-xs text-amber-400">${debt.interest}% p.a.</span>` : ""}
            <button data-id="${debt.id}" class="action-btn edit-btn"
                    onclick="window._editDebt(this.dataset.id)" title="Edit">✎</button>
            <button data-id="${debt.id}" data-type="debt" class="action-btn delete-btn"
                    onclick="window._softDelete(this)" title="Delete">✕</button>
          </div>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-neutral-400">Remaining</span>
          <span class="font-mono text-red-400">${formatINR(debt.remaining)}</span>
        </div>
        <div class="h-2 rounded-full bg-neutral-800 budget-bar-track">
          <div class="h-full rounded-full bg-emerald-500 transition-all" style="width:${paidPct}%"></div>
        </div>
        <p class="text-xs text-neutral-500">${paidPct}% paid off · Total: ${formatINR(debt.total)}</p>
      </div>`;
  }).join("");
}

// ── Summary ───────────────────────────────────────────────────────────────
function updateDebtSummary(items) {
  const totalOwed = items.reduce((s, d) => s + (d.remaining || 0), 0);
  const avgInt    = items.length
    ? (items.reduce((s, d) => s + (parseFloat(d.interest) || 0), 0) / items.length).toFixed(1)
    : 0;

  document.getElementById("debtTotal").textContent       = formatINR(totalOwed);
  document.getElementById("debtAvgInterest").textContent = `${avgInt}%`;
  document.getElementById("debtCount").textContent       = items.length;
}

// ── Add ───────────────────────────────────────────────────────────────────
export async function addDebt(data) {
  const uid = getCurrentUid();
  if (!uid) return;
  await addDoc(debtsCol(uid), {
    name:      data.name      || "",
    lender:    data.lender    || "",
    total:     parseFloat(data.total),
    remaining: parseFloat(data.remaining),
    interest:  parseFloat(data.interest || 0),
    dueDate:   data.dueDate   || "",
    createdAt: Timestamp.now(),
  });
  showToast("Debt saved.");
  await loadDebts();
}

// ── Update ────────────────────────────────────────────────────────────────
export async function updateDebt(id, data) {
  const uid = getCurrentUid();
  if (!uid) return;
  await updateDoc(doc(db, "users", uid, "debts", id), {
    name:      data.name      || "",
    lender:    data.lender    || "",
    total:     parseFloat(data.total),
    remaining: parseFloat(data.remaining),
    interest:  parseFloat(data.interest || 0),
    dueDate:   data.dueDate   || "",
  });
  showToast("Debt updated.");
  await loadDebts();
}

// ── Delete ────────────────────────────────────────────────────────────────
export async function deleteDebt(id) {
  const uid = getCurrentUid();
  if (!uid) return;
  await deleteDoc(doc(db, "users", uid, "debts", id));
  showToast("Debt removed.", "info");
  await loadDebts();
}

// ── Open Edit Modal ────────────────────────────────────────────────────────
function openDebtEdit(id) {
  const debt = allDebts.find(d => d.id === id);
  if (!debt) return;

  editingDebtId = id;
  const form = document.getElementById("addDebtForm");
  form.name.value      = debt.name      || "";
  form.lender.value    = debt.lender    || "";
  form.total.value     = debt.total     || "";
  form.remaining.value = debt.remaining || "";
  form.interest.value  = debt.interest  || "";
  form.dueDate.value   = debt.dueDate   || "";

  document.querySelector("#addDebtModal .modal-title").textContent    = "Edit Debt";
  document.querySelector("#addDebtModal [type='submit']").textContent = "Update Debt";
  openModal("addDebtModal");
}

// ── Form Handler ──────────────────────────────────────────────────────────
document.getElementById("addDebtForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(e.target));
  if (editingDebtId) {
    await updateDebt(editingDebtId, fd);
    editingDebtId = null;
    document.querySelector("#addDebtModal .modal-title").textContent    = "Add Debt / Loan";
    document.querySelector("#addDebtModal [type='submit']").textContent = "Save Debt";
  } else {
    await addDebt(fd);
  }
  e.target.reset();
  closeAllModals();
});

document.querySelectorAll('.open-modal[data-modal="addDebtModal"]').forEach(btn => {
  btn.addEventListener("click", () => {
    editingDebtId = null;
    document.querySelector("#addDebtModal .modal-title").textContent    = "Add Debt / Loan";
    document.querySelector("#addDebtModal [type='submit']").textContent = "Save Debt";
    document.getElementById("addDebtForm").reset();
  });
});

// ── Init & Globals ────────────────────────────────────────────────────────
window._editDebt   = openDebtEdit;
window._deleteDebt = deleteDebt;
window.addEventListener("netwrth:userReady", loadDebts);
