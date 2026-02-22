// js/dashboard.js
// ─── Dashboard Module ─────────────────────────────────────────────────────

import { formatINR }   from "./ui.js";
import { allExpenses } from "./expenses.js";
import { allIncome }   from "./income.js";

// ── Helpers ───────────────────────────────────────────────────────────────
function toDate(item) {
  return item.date?.toDate ? item.date.toDate() : new Date(item.date);
}

function getThisMonth(arr) {
  const now = new Date();
  return arr.filter(item => {
    const d = toDate(item);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
}

// ── Render ────────────────────────────────────────────────────────────────
export function refreshDashboard() {
  const monthExpenses = getThisMonth(allExpenses);
  const monthIncome   = getThisMonth(allIncome);

  const totalIncome   = monthIncome.reduce((s, i) => s + (i.amount || 0), 0);
  const totalExpenses = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const savings       = totalIncome - totalExpenses;
  const savingsRate   = totalIncome ? Math.round((savings / totalIncome) * 100) : 0;

  document.getElementById("statIncome").textContent   = formatINR(totalIncome);
  document.getElementById("statExpenses").textContent = formatINR(totalExpenses);
  document.getElementById("statSavings").textContent  = `${savingsRate}%`;

  // Net worth = all-time income − all-time expenses
  const lifetimeIncome   = allIncome.reduce((s, i) => s + (i.amount || 0), 0);
  const lifetimeExpenses = allExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  document.getElementById("statNetWorth").textContent = formatINR(lifetimeIncome - lifetimeExpenses);

  // ── Recent transactions (latest 8, expense + income merged) ─────────────
  const allTx = [
    ...allExpenses.map(e => ({ ...e, _type: "expense" })),
    ...allIncome.map(i  => ({ ...i,  _type: "income"  })),
  ].sort((a, b) => toDate(b) - toDate(a)).slice(0, 8);

  const txContainer = document.getElementById("recentTransactions");
  if (!allTx.length) {
    txContainer.innerHTML = `<p class="text-sm text-neutral-500">No transactions yet.</p>`;
    return;
  }

  txContainer.innerHTML = allTx.map((tx, i) => {
    const date   = toDate(tx).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const label  = tx._type === "expense" ? tx.description : tx.source;
    const sub    = tx.category || tx.type || "";
    const amtCls = tx._type === "expense" ? "text-red-400" : "text-emerald-400";
    const sign   = tx._type === "expense" ? "−" : "+";
    const delay  = i * 35;
    return `
      <div class="tx-row flex items-center justify-between border-b border-neutral-800/60 last:border-0 cursor-pointer"
           style="animation-delay:${delay}ms"
           onclick="window._edit${tx._type === 'expense' ? 'Expense' : 'Income'}('${tx.id}')"
           title="Click to edit">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="shrink-0 text-base">${tx._type === "expense" ? "↓" : "↑"}</span>
          <div class="min-w-0">
            <p class="text-sm font-medium truncate">${label}</p>
            <p class="text-xs text-neutral-500">${date}${sub ? " · " + sub : ""}</p>
          </div>
        </div>
        <span class="tx-amount font-mono text-sm ${amtCls} shrink-0 ml-3">${sign}${formatINR(tx.amount)}</span>
      </div>`;
  }).join("");
}

// ── Reactivity ────────────────────────────────────────────────────────────
// Refresh whenever expenses OR income finish loading (covers initial load
// and every add/delete — no setTimeout guesswork needed).
window.addEventListener("netwrth:dataChanged", refreshDashboard);
