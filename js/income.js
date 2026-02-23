// js/income.js
// ─── Income Module ─────────────────────────────────────────────────────────

import { db }                                                            from "./firebase.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc,
         query, orderBy, Timestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getCurrentUid }                                                 from "./auth.js";
import { showToast, formatINR, openModal, closeAllModals }              from "./ui.js";

let allIncome      = [];
let editingIncomeId = null;

function incomeCol(uid) {
  return collection(db, "users", uid, "income");
}

// ── Load ──────────────────────────────────────────────────────────────────
export async function loadIncome() {
  const uid = getCurrentUid();
  if (!uid) return;

  try {
    const q    = query(incomeCol(uid), orderBy("date", "desc"));
    const snap = await getDocs(q);
    allIncome  = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    window._netwrthIncome = allIncome;
    renderIncomeTable(allIncome);
    updateIncomeSummary(allIncome);
    window.dispatchEvent(new Event("netwrth:dataChanged"));
    return allIncome;
  } catch (err) {
    console.error("loadIncome:", err);
  }
}

// ── Add ───────────────────────────────────────────────────────────────────
export async function addIncome(data) {
  const uid = getCurrentUid();
  if (!uid) { showToast("Not signed in — please refresh.", "error"); return false; }

  try {
    const dateObj = new Date(data.date + "T12:00:00");
    await addDoc(incomeCol(uid), {
      source:    data.source     || "",
      amount:    parseFloat(data.amount),
      date:      Timestamp.fromDate(dateObj),
      type:      data.type       || "Other",
      typeGroup: data.typeGroup  || data.type || "Other",
      account:   data.account    || "Cash",
      notes:     data.notes      || "",
      createdAt: Timestamp.now(),
    });
    showToast("Income saved.");
    await loadIncome();
    return true;
  } catch (err) {
    console.error("addIncome:", err);
    showToast(err.code === "permission-denied"
      ? "Permission denied — update your Firestore rules."
      : "Failed to save income.", "error");
    return false;
  }
}

// ── Update ────────────────────────────────────────────────────────────────
export async function updateIncome(id, data) {
  const uid = getCurrentUid();
  if (!uid) return false;

  try {
    const dateObj  = new Date(data.date + "T12:00:00");
    const payload  = {
      source:    data.source    || "",
      amount:    parseFloat(data.amount),
      date:      Timestamp.fromDate(dateObj),
      type:      data.type      || "Other",
      typeGroup: data.typeGroup || data.type || "Other",
      notes:     data.notes     || "",
    };
    // Preserve existing account if not in form
    if (data.account) payload.account = data.account;
    await updateDoc(doc(db, "users", uid, "income", id), payload);
    showToast("Income updated.");
    await loadIncome();
    return true;
  } catch (err) {
    console.error("updateIncome:", err);
    showToast("Failed to update income.", "error");
    return false;
  }
}

// ── Delete ────────────────────────────────────────────────────────────────
export async function deleteIncome(id) {
  const uid = getCurrentUid();
  if (!uid) return;
  try {
    await deleteDoc(doc(db, "users", uid, "income", id));
    showToast("Income deleted.", "info");
    await loadIncome();
  } catch (err) {
    console.error("deleteIncome:", err);
    showToast("Failed to delete income.", "error");
  }
}

// ── Open Edit Modal ────────────────────────────────────────────────────────
function openIncomeEdit(id) {
  const income = allIncome.find(i => i.id === id);
  if (!income) return;

  editingIncomeId = id;
  const form = document.getElementById("addIncomeForm");
  form.source.value = income.source || "";
  form.amount.value = income.amount || "";
  const d = income.date?.toDate ? income.date.toDate() : new Date(income.date);
  form.date.value   = d.toISOString().split("T")[0];
  form.notes.value  = income.notes || "";

  document.querySelector("#addIncomeModal .modal-title").textContent    = "Edit Income";
  document.querySelector("#addIncomeModal [type='submit']").textContent = "Update Income";
  openModal("addIncomeModal");
  if (window._initCatPicker) {
    window._initCatPicker("incCatGroups", "incCatSubs", "income", income.type, income.typeGroup);
  }
}

// ── Render Table ──────────────────────────────────────────────────────────
function renderIncomeTable(income) {
  const tbody = document.getElementById("incomeTableBody");
  if (!income.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-neutral-500">No income recorded.</td></tr>`;
    return;
  }

  tbody.innerHTML = income.map((i, idx) => {
    const date = i.date?.toDate ? i.date.toDate().toLocaleDateString("en-IN") : i.date;
    return `
      <tr class="table-row inc-table-row" style="animation-delay:${idx * 30}ms">
        <td class="py-3 text-neutral-400 text-sm">${date}</td>
        <td class="py-3 font-medium">${i.source}</td>
        <td class="py-3"><span class="category-badge">${i.type}</span></td>
        <td class="py-3 text-neutral-400 text-sm">${i.notes || "—"}</td>
        <td class="py-3 text-right font-mono text-emerald-400">${formatINR(i.amount)}</td>
        <td class="py-3 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button data-id="${i.id}" class="action-btn edit-btn"
                    onclick="window._editIncome(this.dataset.id)" title="Edit">✎</button>
            <button data-id="${i.id}" data-type="income" class="action-btn delete-btn"
                    onclick="window._softDelete(this)" title="Delete">✕</button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

// ── Update Summary ────────────────────────────────────────────────────────
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

// ── Form Handler ──────────────────────────────────────────────────────────
document.getElementById("addIncomeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(e.target));
  let ok;
  if (editingIncomeId) {
    ok = await updateIncome(editingIncomeId, fd);
  } else {
    ok = await addIncome(fd);
  }
  if (ok) {
    e.target.reset();
    editingIncomeId = null;
    document.querySelector("#addIncomeModal .modal-title").textContent    = "Add Income";
    document.querySelector("#addIncomeModal [type='submit']").textContent = "Save Income";
    closeAllModals();
  }
});

document.querySelectorAll('.open-modal[data-modal="addIncomeModal"]').forEach(btn => {
  btn.addEventListener("click", () => {
    editingIncomeId = null;
    document.querySelector("#addIncomeModal .modal-title").textContent    = "Add Income";
    document.querySelector("#addIncomeModal [type='submit']").textContent = "Save Income";
    document.getElementById("addIncomeForm").reset();
    if (window._initCatPicker) {
      window._initCatPicker("incCatGroups", "incCatSubs", "income", null, null);
    }
  });
});

// ── Init & Globals ────────────────────────────────────────────────────────
window.addEventListener("netwrth:userReady", loadIncome);
window._editIncome   = openIncomeEdit;
window._deleteIncome = deleteIncome;

export { allIncome };
