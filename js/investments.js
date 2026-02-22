// js/investments.js
// ─── Investments Module ────────────────────────────────────────────────────

import { db }                                                         from "./firebase.js";
import { collection, addDoc, getDocs, deleteDoc, doc, Timestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getCurrentUid }                                              from "./auth.js";
import { showToast, formatINR }                                       from "./ui.js";

function investmentsCol(uid) { return collection(db, "users", uid, "investments"); }

export async function loadInvestments() {
  const uid  = getCurrentUid();
  if (!uid) return;

  const snap  = await getDocs(investmentsCol(uid));
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  renderInvestmentsTable(items);
  updateInvestmentSummary(items);
  return items;
}

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
          <button onclick="window._deleteInvestment('${inv.id}')" class="text-neutral-600 hover:text-red-400 transition text-xs">✕</button>
        </td>
      </tr>`;
  }).join("");
}

function updateInvestmentSummary(items) {
  const totalValue    = items.reduce((s, i) => s + (i.currentValue || 0), 0);
  const totalInvested = items.reduce((s, i) => s + (i.invested || 0), 0);
  const totalGain     = totalValue - totalInvested;

  document.getElementById("invTotal").textContent = formatINR(totalValue);
  document.getElementById("invCost").textContent  = formatINR(totalInvested);

  const gainEl  = document.getElementById("invGain");
  gainEl.textContent = (totalGain >= 0 ? "+" : "") + formatINR(totalGain);
  gainEl.className   = `stat-value ${totalGain >= 0 ? "text-emerald-400" : "text-red-400"}`;
}

export async function addInvestment(data) {
  const uid = getCurrentUid();
  if (!uid) return;
  await addDoc(investmentsCol(uid), {
    ...data,
    invested:     parseFloat(data.invested),
    currentValue: parseFloat(data.currentValue),
    createdAt:    Timestamp.now()
  });
  showToast("Investment saved.");
  await loadInvestments();
}

export async function deleteInvestment(id) {
  const uid = getCurrentUid();
  if (!uid) return;
  await deleteDoc(doc(db, "users", uid, "investments", id));
  showToast("Investment deleted.", "info");
  await loadInvestments();
}

document.getElementById("addInvestmentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  await addInvestment(Object.fromEntries(new FormData(e.target)));
  e.target.reset();
  document.getElementById("addInvestmentModal").classList.add("hidden");
});

window._deleteInvestment = deleteInvestment;
window.addEventListener("netwrth:userReady", loadInvestments);
