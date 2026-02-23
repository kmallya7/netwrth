// js/app.js
// ─── App Entry Point ───────────────────────────────────────────────────────

import { addExpense } from "./expenses.js";
import { addIncome }  from "./income.js";
import { closeAllModals } from "./ui.js";

// ── Quick Add Form ────────────────────────────────────────────────────────
document.getElementById("quickAddForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd   = Object.fromEntries(new FormData(e.target));
  const type = fd.type;

  let ok;
  if (type === "expense") {
    ok = await addExpense({
      description:   fd.description,
      amount:        fd.amount,
      date:          fd.date,
      category:      fd.category      || "Other",
      categoryGroup: fd.categoryGroup || fd.category || "Other",
      account:       fd.account       || "Cash",
      notes:         fd.notes         || "",
    });
  } else {
    ok = await addIncome({
      source:    fd.description,                          // description maps to source
      amount:    fd.amount,
      date:      fd.date,
      type:      fd.category      || "Other",             // category hidden input → type
      typeGroup: fd.categoryGroup || fd.category || "Other",
      account:   fd.account       || "Cash",
      notes:     fd.notes         || "",
    });
  }

  if (ok) {
    e.target.reset();
    closeAllModals();
  }
});

console.log("netwrth v1.0.0 — ready.");
