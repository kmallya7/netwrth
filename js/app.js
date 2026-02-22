// js/app.js
// ─── App Entry Point ───────────────────────────────────────────────────────
// Handles quick add form and any cross-module wiring

import { addExpense } from "./expenses.js";
import { addIncome }  from "./income.js";
import { closeAllModals } from "./ui.js";

// ── Quick Add Form ────────────────────────────────────────────────────────
document.getElementById("quickAddForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd   = Object.fromEntries(new FormData(e.target));
  const type = fd.type;

  if (type === "expense") {
    await addExpense({
      description: fd.description,
      amount:      fd.amount,
      date:        fd.date,
      category:    fd.category || "Other",
      account:     "Cash",
    });
  } else {
    await addIncome({
      source: fd.description,
      amount: fd.amount,
      date:   fd.date,
      type:   "Other",
    });
  }

  e.target.reset();
  closeAllModals();
});

console.log("netwrth v1.0.0 — ready.");
