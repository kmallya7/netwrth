// js/reports.js
// ─── Reports & Export Module ──────────────────────────────────────────────

import { formatINR }   from "./ui.js";
import { allExpenses } from "./expenses.js";
import { allIncome }   from "./income.js";

// ── Populate month picker ─────────────────────────────────────────────────
function populateMonthPicker() {
  const sel = document.getElementById("reportMonth");
  const now = new Date();
  sel.innerHTML = "";
  for (let i = 0; i < 12; i++) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const lbl = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    sel.innerHTML += `<option value="${val}">${lbl}</option>`;
  }
}

// ── Generate Monthly Report ───────────────────────────────────────────────
document.getElementById("generateReportBtn").addEventListener("click", () => {
  const [year, month] = document.getElementById("reportMonth").value.split("-").map(Number);

  const expenses = allExpenses.filter(e => {
    const d = e.date?.toDate ? e.date.toDate() : new Date(e.date);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });

  const income = allIncome.filter(i => {
    const d = i.date?.toDate ? i.date.toDate() : new Date(i.date);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });

  const totalIncome   = income.reduce((s, i) => s + (i.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const net           = totalIncome - totalExpenses;
  const savingsRate   = totalIncome ? Math.round((net / totalIncome) * 100) : 0;

  // Category breakdown
  const catBreakdown = {};
  expenses.forEach(e => { catBreakdown[e.category] = (catBreakdown[e.category] || 0) + e.amount; });

  const out = document.getElementById("reportOutput");
  out.innerHTML = `
    <div class="space-y-4">
      <div class="grid grid-cols-3 gap-3">
        <div class="rounded-lg bg-neutral-800 p-3 text-center">
          <p class="text-xs text-neutral-400">Income</p>
          <p class="font-mono font-semibold text-emerald-400">${formatINR(totalIncome)}</p>
        </div>
        <div class="rounded-lg bg-neutral-800 p-3 text-center">
          <p class="text-xs text-neutral-400">Expenses</p>
          <p class="font-mono font-semibold text-red-400">${formatINR(totalExpenses)}</p>
        </div>
        <div class="rounded-lg bg-neutral-800 p-3 text-center">
          <p class="text-xs text-neutral-400">Net / Savings</p>
          <p class="font-mono font-semibold ${net >= 0 ? "text-emerald-400" : "text-red-400"}">${formatINR(net)} (${savingsRate}%)</p>
        </div>
      </div>
      ${Object.keys(catBreakdown).length ? `
        <div>
          <p class="text-xs font-medium text-neutral-400 mb-2">Breakdown by Category</p>
          <div class="space-y-1">
            ${Object.entries(catBreakdown).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => `
              <div class="flex justify-between text-sm">
                <span class="text-neutral-300">${cat}</span>
                <span class="font-mono text-neutral-400">${formatINR(amt)}</span>
              </div>`).join("")}
          </div>
        </div>` : ""}
    </div>`;

  // Render category breakdown section
  renderCategoryBreakdown();
});

// ── Category Breakdown Section ────────────────────────────────────────────
function renderCategoryBreakdown() {
  const catBreakdown = {};
  allExpenses.forEach(e => { catBreakdown[e.category] = (catBreakdown[e.category] || 0) + e.amount; });
  const total = Object.values(catBreakdown).reduce((s, v) => s + v, 0);
  const el    = document.getElementById("categoryBreakdown");

  if (!total) {
    el.innerHTML = `<p class="text-sm text-neutral-500">No data available.</p>`;
    return;
  }

  el.innerHTML = Object.entries(catBreakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => {
      const pct = ((amt / total) * 100).toFixed(1);
      return `
        <div>
          <div class="flex justify-between text-sm mb-1">
            <span>${cat}</span>
            <span class="font-mono text-neutral-400">${formatINR(amt)} · ${pct}%</span>
          </div>
          <div class="h-1.5 rounded-full bg-neutral-800">
            <div class="h-full rounded-full bg-emerald-600 transition-all" style="width:${pct}%"></div>
          </div>
        </div>`;
    }).join("");
}

// ── CSV Export helpers ────────────────────────────────────────────────────
function toCSV(rows, headers) {
  const lines = [headers.join(",")];
  rows.forEach(r => lines.push(headers.map(h => `"${r[h] ?? ""}"`).join(",")));
  return lines.join("\n");
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.getElementById("exportExpensesBtn").addEventListener("click", () => {
  const rows = allExpenses.map(e => ({
    date:        e.date?.toDate ? e.date.toDate().toLocaleDateString("en-IN") : e.date,
    description: e.description,
    category:    e.category,
    account:     e.account,
    amount:      e.amount,
    notes:       e.notes || ""
  }));
  downloadCSV(toCSV(rows, ["date", "description", "category", "account", "amount", "notes"]), "netwrth-expenses.csv");
});

document.getElementById("exportIncomeBtn").addEventListener("click", () => {
  const rows = allIncome.map(i => ({
    date:   i.date?.toDate ? i.date.toDate().toLocaleDateString("en-IN") : i.date,
    source: i.source,
    type:   i.type,
    amount: i.amount,
    notes:  i.notes || ""
  }));
  downloadCSV(toCSV(rows, ["date", "source", "type", "amount", "notes"]), "netwrth-income.csv");
});

document.getElementById("exportAllBtn").addEventListener("click", () => {
  const expRows = allExpenses.map(e => ({
    type:        "expense",
    date:        e.date?.toDate ? e.date.toDate().toLocaleDateString("en-IN") : e.date,
    description: e.description,
    category:    e.category,
    amount:      e.amount
  }));
  const incRows = allIncome.map(i => ({
    type:        "income",
    date:        i.date?.toDate ? i.date.toDate().toLocaleDateString("en-IN") : i.date,
    description: i.source,
    category:    i.type,
    amount:      i.amount
  }));
  downloadCSV(toCSV([...expRows, ...incRows], ["type", "date", "description", "category", "amount"]), "netwrth-all.csv");
});

// ── Init ──────────────────────────────────────────────────────────────────
window.addEventListener("netwrth:userReady", () => {
  populateMonthPicker();
  setTimeout(renderCategoryBreakdown, 1500);
});
