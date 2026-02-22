// js/investments.js
// ─── Investments Module ────────────────────────────────────────────────────

import { db }                                                            from "./firebase.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, Timestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getCurrentUid }                                                 from "./auth.js";
import { showToast, formatINR, openModal, closeAllModals }              from "./ui.js";

let allInvestments      = [];
let editingInvestmentId = null;

function investmentsCol(uid) { return collection(db, "users", uid, "investments"); }

// ── Load ──────────────────────────────────────────────────────────────────
export async function loadInvestments() {
  const uid = getCurrentUid();
  if (!uid) return;

  const snap     = await getDocs(investmentsCol(uid));
  allInvestments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderInvestmentsTable(allInvestments);
  updateInvestmentSummary(allInvestments);
  return allInvestments;
}

// ── Render Table ──────────────────────────────────────────────────────────
function renderInvestmentsTable(items) {
  const tbody = document.getElementById("investmentsTableBody");
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-neutral-500">No investments added.</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(inv => {
    const gain    = (inv.currentValue || 0) - (inv.invested || 0);
    const gainPct = inv.invested ? ((gain / inv.invested) * 100).toFixed(1) : 0;
    const gainCls = gain >= 0 ? "text-emerald-400" : "text-red-400";
    const sign    = gain >= 0 ? "+" : "";

    return `
      <tr class="table-row">
        <td class="py-3 font-medium">${inv.name}</td>
        <td class="py-3"><span class="category-badge">${inv.type}</span></td>
        <td class="py-3 font-mono">${formatINR(inv.invested)}</td>
        <td class="py-3 font-mono">${formatINR(inv.currentValue)}</td>
        <td class="py-3 text-right font-mono ${gainCls}">${sign}${formatINR(gain)} (${sign}${gainPct}%)</td>
        <td class="py-3 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button data-id="${inv.id}" class="action-btn edit-btn"
                    onclick="window._editInvestment(this.dataset.id)" title="Edit">✎</button>
            <button data-id="${inv.id}" data-type="investment" class="action-btn delete-btn"
                    onclick="window._softDelete(this)" title="Delete">✕</button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

// ── Summary ───────────────────────────────────────────────────────────────
function updateInvestmentSummary(items) {
  const totalValue    = items.reduce((s, i) => s + (i.currentValue || 0), 0);
  const totalInvested = items.reduce((s, i) => s + (i.invested    || 0), 0);
  const totalGain     = totalValue - totalInvested;

  document.getElementById("invTotal").textContent = formatINR(totalValue);
  document.getElementById("invCost").textContent  = formatINR(totalInvested);

  const gainEl = document.getElementById("invGain");
  gainEl.textContent = (totalGain >= 0 ? "+" : "") + formatINR(totalGain);
  gainEl.className   = `stat-value ${totalGain >= 0 ? "text-emerald-400" : "text-red-400"}`;
}

// ── Add ───────────────────────────────────────────────────────────────────
export async function addInvestment(data) {
  const uid = getCurrentUid();
  if (!uid) return;
  await addDoc(investmentsCol(uid), {
    name:         data.name         || "",
    type:         data.type         || "Other",
    invested:     parseFloat(data.invested),
    currentValue: parseFloat(data.currentValue),
    notes:        data.notes        || "",
    createdAt:    Timestamp.now(),
  });
  showToast("Investment saved.");
  await loadInvestments();
}

// ── Update ────────────────────────────────────────────────────────────────
export async function updateInvestment(id, data) {
  const uid = getCurrentUid();
  if (!uid) return;
  await updateDoc(doc(db, "users", uid, "investments", id), {
    name:         data.name         || "",
    type:         data.type         || "Other",
    invested:     parseFloat(data.invested),
    currentValue: parseFloat(data.currentValue),
    notes:        data.notes        || "",
  });
  showToast("Investment updated.");
  await loadInvestments();
}

// ── Delete ────────────────────────────────────────────────────────────────
export async function deleteInvestment(id) {
  const uid = getCurrentUid();
  if (!uid) return;
  await deleteDoc(doc(db, "users", uid, "investments", id));
  showToast("Investment deleted.", "info");
  await loadInvestments();
}

// ── Open Edit Modal ────────────────────────────────────────────────────────
function openInvestmentEdit(id) {
  const inv = allInvestments.find(i => i.id === id);
  if (!inv) return;

  editingInvestmentId = id;
  const form = document.getElementById("addInvestmentForm");
  form.name.value         = inv.name         || "";
  form.type.value         = inv.type         || "Mutual Fund";
  form.invested.value     = inv.invested     || "";
  form.currentValue.value = inv.currentValue || "";
  form.notes.value        = inv.notes        || "";

  document.querySelector("#addInvestmentModal .modal-title").textContent    = "Edit Investment";
  document.querySelector("#addInvestmentModal [type='submit']").textContent = "Update Investment";
  openModal("addInvestmentModal");
}

// ── Form Handler ──────────────────────────────────────────────────────────
document.getElementById("addInvestmentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(e.target));
  if (editingInvestmentId) {
    await updateInvestment(editingInvestmentId, fd);
    editingInvestmentId = null;
    document.querySelector("#addInvestmentModal .modal-title").textContent    = "Add Investment";
    document.querySelector("#addInvestmentModal [type='submit']").textContent = "Save Investment";
  } else {
    await addInvestment(fd);
  }
  e.target.reset();
  closeAllModals();
});

document.querySelectorAll('.open-modal[data-modal="addInvestmentModal"]').forEach(btn => {
  btn.addEventListener("click", () => {
    editingInvestmentId = null;
    document.querySelector("#addInvestmentModal .modal-title").textContent    = "Add Investment";
    document.querySelector("#addInvestmentModal [type='submit']").textContent = "Save Investment";
    document.getElementById("addInvestmentForm").reset();
  });
});

// ── Init & Globals ────────────────────────────────────────────────────────
window._editInvestment   = openInvestmentEdit;
window._deleteInvestment = deleteInvestment;
window.addEventListener("netwrth:userReady", loadInvestments);
