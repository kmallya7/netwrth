// js/dashboard.js
// ─── Dashboard Module ─────────────────────────────────────────────────────
// Pulls aggregated data from all modules to populate the overview

import { formatINR }    from "./ui.js";
import { allExpenses }  from "./expenses.js";
import { allIncome }    from "./income.js";

function getThisMonthData(arr, amountKey = "amount") {
  const now = new Date();
  return arr.filter(item => {
    const d = item.date?.toDate ? item.date.toDate() : new Date(item.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
}

export function refreshDashboard() {
  const monthExpenses = getThisMonthData(allExpenses);
  const monthIncome   = getThisMonthData(allIncome);

  const totalIncome   = monthIncome.reduce((s, i) => s + (i.amount || 0), 0);
  const totalExpenses = monthExpenses.reduce((s, i) => s + (i.amount || 0), 0);
  const savings       = totalIncome - totalExpenses;
  const savingsRate   = totalIncome ? Math.round((savings / totalIncome) * 100) : 0;

  document.getElementById("statIncome").textContent   = formatINR(totalIncome);
  document.getElementById("statExpenses").textContent = formatINR(totalExpenses);
  document.getElementById("statSavings").textContent  = `${savingsRate}%`;

  // Net worth = total income ever - total expenses ever + investments
  // Simplified: we use lifetime income - lifetime expenses as proxy until investments load
  const lifetimeIncome   = allIncome.reduce((s, i) => s + (i.amount || 0), 0);
  const lifetimeExpenses = allExpenses.reduce((s, i) => s + (i.amount || 0), 0);
  document.getElementById("statNetWorth").textContent = formatINR(lifetimeIncome - lifetimeExpenses);

  // Recent transactions: merge expenses + income, sort by date, show latest 8
  const allTx = [
    ...allExpenses.map(e => ({ ...e, _type: "expense" })),
    ...allIncome.map(i => ({ ...i, _type: "income" }))
  ].sort((a, b) => {
    const da = a.date?.toDate ? a.date.toDate() : new Date(a.date);
    const db_ = b.date?.toDate ? b.date.toDate() : new Date(b.date);
    return db_ - da;
  }).slice(0, 8);

  const txContainer = document.getElementById("recentTransactions");
  if (!allTx.length) {
    txContainer.innerHTML = `<p class="text-sm text-neutral-500">No transactions yet.</p>`;
  } else {
    txContainer.innerHTML = allTx.map(tx => {
      const date    = tx.date?.toDate ? tx.date.toDate().toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : tx.date;
      const label   = tx._type === "expense" ? tx.description : tx.source;
      const amtCls  = tx._type === "expense" ? "text-red-400" : "text-emerald-400";
      const sign    = tx._type === "expense" ? "−" : "+";
      return `
        <div class="flex items-center justify-between py-1.5 border-b border-neutral-800 last:border-0">
          <div>
            <p class="text-sm font-medium">${label}</p>
            <p class="text-xs text-neutral-500">${date} · ${tx.category || tx.type || ""}</p>
          </div>
          <span class="font-mono text-sm ${amtCls}">${sign}${formatINR(tx.amount)}</span>
        </div>`;
    }).join("");
  }
}

// Refresh dashboard whenever data loads
window.addEventListener("netwrth:userReady", () => {
  // Small delay to allow modules to hydrate
  setTimeout(refreshDashboard, 1500);
});
