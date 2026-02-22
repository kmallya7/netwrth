// js/income.js
// ─── Income Module ─────────────────────────────────────────────────────────

import { db }                                                     from "./firebase.js";
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, Timestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getCurrentUid }                                          from "./auth.js";
import { showToast, formatINR }                                   from "./ui.js";

let allIncome = [];

function incomeCol(uid) {
  return collection(db, "users", uid, "income");
}

export async function loadIncome() {
  const uid  = getCurrentUid();
  if (!uid) return;

  const q    = query(incomeCol(uid), orderBy("date", "desc"));
  const snap = await getDocs(q);

  allIncome = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderIncomeTable(allIncome);
  updateIncomeSummary(allIncome);
  return allIncome;
}

export async function addIncome(data) {
  const uid = getCurrentUid();
  if (!uid) return;

  await addDoc(incomeCol(uid), {
    ...data,
    amount: parseFloat(data.amount),
    date:   Timestamp.fromDate(new Date(data.date)),
    createdAt: Timestamp.now()
  });

  showToast("Income saved.");
  await loadIncome();
}

export async function deleteIncome(id) {
  const uid = getCurrentUid();
  if (!uid) return;

  await deleteDoc(doc(db, "users", uid, "income", id));
  showToast("Income deleted.", "info");
  await loadIncome();
}

function renderIncomeTable(income) {
  const tbody = document.getElementById("incomeTableBody");
  if (!income.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-neutral-500">No income recorded.</td></tr>`;
    return;
  }

  tbody.innerHTML = income.map(i => {
    const date = i.date?.toDate ? i.date.toDate().toLocaleDateString("en-IN") : i.date;
    return `
      <tr class="table-row">
        <td class="py-3 text-neutral-400">${date}</td>
        <td class="py-3 font-medium">${i.source}</td>
        <td class="py-3"><span class="category-badge">${i.type}</span></td>
        <td class="py-3 text-neutral-400 text-sm">${i.notes || "—"}</td>
        <td class="py-3 text-right font-mono text-emerald-400">${formatINR(i.amount)}</td>
        <td class="py-3 text-right">
          <button onclick="window._deleteIncome('${i.id}')" class="text-neutral-600 hover:text-red-400 transition text-xs">✕</button>
        </td>
      </tr>`;
  }).join("");
}

function updateIncomeSummary(income) {
  const total   = income.reduce((sum, i) => sum + (i.amount || 0), 0);
  const sources = new Set(income.map(i => i.source)).size;

  const sourceCount = {};
  income.forEach(i => { sourceCount[i.source] = (sourceCount[i.source] || 0) + i.amount; });
  const primary = Object.entries(sourceCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  document.getElementById("incTotal").textContent   = formatINR(total);
  document.getElementById("incPrimary").textContent = primary;
  document.getElementById("incSources").textContent = sources;
}

document.getElementById("addIncomeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  await addIncome(Object.fromEntries(fd));
  e.target.reset();
  document.getElementById("addIncomeModal").classList.add("hidden");
});

window._deleteIncome = deleteIncome;
window.addEventListener("netwrth:userReady", loadIncome);

export { allIncome };
