// js/accounts.js
// ─── Accounts Module ──────────────────────────────────────────────────────

import { db }                                                             from "./firebase.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc,
         query, orderBy, Timestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getCurrentUid }                                                  from "./auth.js";
import { showToast, formatINR, openModal, closeAllModals }               from "./ui.js";

let allAccounts      = [];
let editingAccountId = null;

const ACCOUNT_ICONS = {
  "Cash":               "◉",
  "Bank Account":       "⊟",
  "Savings Account":    "⊞",
  "Credit Card":        "▣",
  "Debit Card":         "▢",
  "UPI / Wallet":       "◈",
  "Loan Account":       "⊘",
  "Investment Account": "△",
  "Other":              "○",
};

function accountsCol(uid) {
  return collection(db, "users", uid, "accounts");
}

// ── Load ──────────────────────────────────────────────────────────────────
export async function loadAccounts() {
  const uid = getCurrentUid();
  if (!uid) return;
  try {
    const q    = query(accountsCol(uid), orderBy("createdAt", "asc"));
    const snap = await getDocs(q);
    allAccounts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderAccountsList();
    updateAccountsSummary();
    populateAccountSelects();
    window.dispatchEvent(new Event("netwrth:accountsChanged"));
    return allAccounts;
  } catch (err) {
    console.error("loadAccounts:", err);
  }
}

// ── Add ───────────────────────────────────────────────────────────────────
export async function addAccount(data) {
  const uid = getCurrentUid();
  if (!uid) { showToast("Not signed in.", "error"); return false; }
  try {
    await addDoc(accountsCol(uid), {
      name:          data.name          || "",
      type:          data.type          || "Cash",
      balance:       parseFloat(data.balance)     || 0,
      accountNumber: data.accountNumber || "",
      bankName:      data.bankName      || "",
      creditLimit:   parseFloat(data.creditLimit) || 0,
      notes:         data.notes         || "",
      createdAt:     Timestamp.now(),
    });
    showToast("Account added.");
    await loadAccounts();
    return true;
  } catch (err) {
    console.error("addAccount:", err);
    showToast("Failed to add account.", "error");
    return false;
  }
}

// ── Update ────────────────────────────────────────────────────────────────
export async function updateAccount(id, data) {
  const uid = getCurrentUid();
  if (!uid) return false;
  try {
    await updateDoc(doc(db, "users", uid, "accounts", id), {
      name:          data.name          || "",
      type:          data.type          || "Cash",
      balance:       parseFloat(data.balance)     || 0,
      accountNumber: data.accountNumber || "",
      bankName:      data.bankName      || "",
      creditLimit:   parseFloat(data.creditLimit) || 0,
      notes:         data.notes         || "",
    });
    showToast("Account updated.");
    await loadAccounts();
    return true;
  } catch (err) {
    console.error("updateAccount:", err);
    showToast("Failed to update account.", "error");
    return false;
  }
}

// ── Delete ────────────────────────────────────────────────────────────────
export async function deleteAccount(id) {
  const uid = getCurrentUid();
  if (!uid) return;
  try {
    await deleteDoc(doc(db, "users", uid, "accounts", id));
    showToast("Account deleted.", "info");
    await loadAccounts();
  } catch (err) {
    showToast("Failed to delete account.", "error");
  }
}

// ── Populate account selects across the app ───────────────────────────────
export function populateAccountSelects() {
  document.querySelectorAll('select[data-populate="accounts"]').forEach(sel => {
    const current = sel.value;
    sel.innerHTML = allAccounts.length
      ? allAccounts.map(a => `<option value="${a.name}">${a.name} (${a.type})</option>`).join("")
      : `<option value="Cash">Cash (default)</option>`;
    if (current) sel.value = current;
  });
}

// ── Show/hide credit limit field ──────────────────────────────────────────
function toggleCreditFields(type) {
  const row = document.getElementById("creditLimitRow");
  if (row) row.classList.toggle("hidden", type !== "Credit Card");
}

// ── Open Edit Modal ───────────────────────────────────────────────────────
function openAccountEdit(id) {
  const acct = allAccounts.find(a => a.id === id);
  if (!acct) return;
  editingAccountId = id;
  const form = document.getElementById("addAccountForm");
  form.name.value          = acct.name          || "";
  form.type.value          = acct.type          || "Cash";
  form.balance.value       = acct.balance       != null ? acct.balance : "";
  form.accountNumber.value = acct.accountNumber || "";
  form.bankName.value      = acct.bankName      || "";
  form.creditLimit.value   = acct.creditLimit   || "";
  form.notes.value         = acct.notes         || "";
  toggleCreditFields(acct.type);
  document.querySelector("#addAccountModal .modal-title").textContent    = "Edit Account";
  document.querySelector("#addAccountModal [type='submit']").textContent = "Update Account";
  openModal("addAccountModal");
}

// ── Render list ───────────────────────────────────────────────────────────
function renderAccountsList() {
  const container = document.getElementById("accountsList");
  if (!container) return;
  if (!allAccounts.length) {
    container.innerHTML = `<p class="text-sm text-neutral-500">No accounts yet. Add your first account to get started.</p>`;
    return;
  }
  container.innerHTML = allAccounts.map(a => {
    const icon    = ACCOUNT_ICONS[a.type] || "○";
    const acctNum = a.accountNumber
      ? `<span class="font-mono text-neutral-600 text-xs"> ···${a.accountNumber}</span>`
      : "";
    const meta = [
      a.bankName,
      a.type === "Credit Card" && a.creditLimit ? `Limit ${formatINR(a.creditLimit)}` : "",
    ].filter(Boolean).join(" · ");
    return `
      <div class="manage-item group">
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <span class="text-base text-neutral-400 shrink-0 w-5 text-center">${icon}</span>
          <div class="min-w-0">
            <p class="text-sm font-medium truncate">${a.name}${acctNum}</p>
            ${meta ? `<p class="text-xs text-neutral-500">${meta}</p>` : ""}
          </div>
          <span class="manage-badge shrink-0">${a.type}</span>
        </div>
        <div class="flex items-center gap-3 shrink-0">
          <span class="font-mono text-sm ${(a.balance || 0) >= 0 ? "text-emerald-400" : "text-red-400"}">${formatINR(a.balance || 0)}</span>
          <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button data-id="${a.id}" class="action-btn edit-btn"
                    onclick="window._editAccount(this.dataset.id)" title="Edit">✎</button>
            <button data-id="${a.id}" data-type="account" class="action-btn delete-btn"
                    onclick="window._softDelete(this)" title="Delete">✕</button>
          </div>
        </div>
      </div>`;
  }).join("");
}

// ── Update summary stats ──────────────────────────────────────────────────
function updateAccountsSummary() {
  const total  = allAccounts.reduce((s, a) => s + (a.balance || 0), 0);
  const credit = allAccounts
    .filter(a => a.type === "Credit Card")
    .reduce((s, a) => s + (a.creditLimit || 0), 0);
  const countEl  = document.getElementById("accountsCount");
  const balEl    = document.getElementById("accountsTotalBalance");
  const creditEl = document.getElementById("accountsTotalCredit");
  if (countEl)  countEl.textContent  = allAccounts.length;
  if (balEl)    balEl.textContent    = formatINR(total);
  if (creditEl) creditEl.textContent = formatINR(credit);
}

// ── Form handler ──────────────────────────────────────────────────────────
document.getElementById("addAccountForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(e.target));
  const ok = editingAccountId
    ? await updateAccount(editingAccountId, fd)
    : await addAccount(fd);
  if (ok) {
    e.target.reset();
    editingAccountId = null;
    document.querySelector("#addAccountModal .modal-title").textContent    = "Add Account";
    document.querySelector("#addAccountModal [type='submit']").textContent = "Save Account";
    toggleCreditFields("Cash");
    closeAllModals();
  }
});

document.getElementById("accountTypeSelect").addEventListener("change", (e) => {
  toggleCreditFields(e.target.value);
});

document.querySelectorAll('.open-modal[data-modal="addAccountModal"]').forEach(btn => {
  btn.addEventListener("click", () => {
    editingAccountId = null;
    document.querySelector("#addAccountModal .modal-title").textContent    = "Add Account";
    document.querySelector("#addAccountModal [type='submit']").textContent = "Save Account";
    document.getElementById("addAccountForm").reset();
    toggleCreditFields("Cash");
  });
});

// ── Init & globals ────────────────────────────────────────────────────────
window.addEventListener("netwrth:userReady", loadAccounts);
window._editAccount   = openAccountEdit;
window._deleteAccount = deleteAccount;

export { allAccounts };
