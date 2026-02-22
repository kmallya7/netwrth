// js/categories.js
// ─── Categories Module ────────────────────────────────────────────────────

import { db }                                                             from "./firebase.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc,
         query, orderBy, Timestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getCurrentUid }                                                  from "./auth.js";
import { showToast, openModal, closeAllModals }                          from "./ui.js";

let allCategories     = [];
let editingCategoryId = null;

const DEFAULT_CATEGORIES = [
  { name: "Food & Dining",     type: "expense", color: "#f97316" },
  { name: "Transport",         type: "expense", color: "#3b82f6" },
  { name: "Shopping",          type: "expense", color: "#a855f7" },
  { name: "Bills & Utilities", type: "expense", color: "#ef4444" },
  { name: "Health",            type: "expense", color: "#10b981" },
  { name: "Entertainment",     type: "expense", color: "#f59e0b" },
  { name: "Education",         type: "expense", color: "#06b6d4" },
  { name: "Other",             type: "expense", color: "#6b7280" },
  { name: "Salary",            type: "income",  color: "#10b981" },
  { name: "Freelance",         type: "income",  color: "#3b82f6" },
  { name: "Business",          type: "income",  color: "#f59e0b" },
  { name: "Investment Returns", type: "income", color: "#a855f7" },
  { name: "Rental",            type: "income",  color: "#f97316" },
  { name: "Gift",              type: "income",  color: "#ec4899" },
  { name: "Other",             type: "income",  color: "#6b7280" },
];

function categoriesCol(uid) {
  return collection(db, "users", uid, "categories");
}

// ── Seed defaults on first load ───────────────────────────────────────────
async function seedDefaults(uid) {
  for (const cat of DEFAULT_CATEGORIES) {
    await addDoc(categoriesCol(uid), { ...cat, createdAt: Timestamp.now() });
  }
}

// ── Load ──────────────────────────────────────────────────────────────────
export async function loadCategories() {
  const uid = getCurrentUid();
  if (!uid) return;
  try {
    const q    = query(categoriesCol(uid), orderBy("createdAt", "asc"));
    const snap = await getDocs(q);
    if (snap.empty) {
      await seedDefaults(uid);
      return loadCategories();
    }
    allCategories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCategoriesList();
    populateCategorySelects();
    window.dispatchEvent(new Event("netwrth:categoriesChanged"));
    return allCategories;
  } catch (err) {
    console.error("loadCategories:", err);
  }
}

// ── Add ───────────────────────────────────────────────────────────────────
export async function addCategory(data) {
  const uid = getCurrentUid();
  if (!uid) return false;
  try {
    await addDoc(categoriesCol(uid), {
      name:      data.name  || "",
      type:      data.type  || "expense",
      color:     data.color || "#6b7280",
      createdAt: Timestamp.now(),
    });
    showToast("Category added.");
    await loadCategories();
    return true;
  } catch (err) {
    showToast("Failed to add category.", "error");
    return false;
  }
}

// ── Update ────────────────────────────────────────────────────────────────
export async function updateCategory(id, data) {
  const uid = getCurrentUid();
  if (!uid) return false;
  try {
    await updateDoc(doc(db, "users", uid, "categories", id), {
      name:  data.name  || "",
      type:  data.type  || "expense",
      color: data.color || "#6b7280",
    });
    showToast("Category updated.");
    await loadCategories();
    return true;
  } catch (err) {
    showToast("Failed to update category.", "error");
    return false;
  }
}

// ── Delete ────────────────────────────────────────────────────────────────
export async function deleteCategory(id) {
  const uid = getCurrentUid();
  if (!uid) return;
  try {
    await deleteDoc(doc(db, "users", uid, "categories", id));
    showToast("Category deleted.", "info");
    await loadCategories();
  } catch (err) {
    showToast("Failed to delete category.", "error");
  }
}

// ── Populate all static category selects ─────────────────────────────────
export function populateCategorySelects() {
  const expCats = allCategories.filter(c => c.type === "expense");
  const incCats = allCategories.filter(c => c.type === "income");

  document.querySelectorAll('select[data-populate="expense-categories"]').forEach(sel => {
    const current = sel.value;
    const hasAll  = sel.dataset.allOption === "true";
    sel.innerHTML = (hasAll ? `<option value="">All Categories</option>` : "")
      + expCats.map(c => `<option value="${c.name}">${c.name}</option>`).join("");
    if (current) sel.value = current;
  });

  document.querySelectorAll('select[data-populate="income-categories"]').forEach(sel => {
    const current = sel.value;
    sel.innerHTML = incCats.map(c => `<option value="${c.name}">${c.name}</option>`).join("");
    if (current) sel.value = current;
  });

  // Also update quick-add modal based on active tab
  const quickSel       = document.getElementById("quickCategorySelect");
  const expenseTabActive = document.getElementById("quickExpenseTab")?.classList.contains("active");
  if (quickSel) window._populateSelect(quickSel, expenseTabActive ? "expense" : "income");
}

// ── Global helper: populate a single select from allCategories ────────────
window._populateSelect = function(selectEl, type) {
  const cats = allCategories.filter(c => c.type === type);
  selectEl.innerHTML = cats.length
    ? cats.map(c => `<option value="${c.name}">${c.name}</option>`).join("")
    : `<option value="Other">Other</option>`;
};

// ── Open Edit Modal ───────────────────────────────────────────────────────
function openCategoryEdit(id) {
  const cat = allCategories.find(c => c.id === id);
  if (!cat) return;
  editingCategoryId = id;
  const form = document.getElementById("addCategoryForm");
  form.name.value  = cat.name  || "";
  form.type.value  = cat.type  || "expense";
  form.color.value = cat.color || "#6b7280";
  document.querySelector("#addCategoryModal .modal-title").textContent    = "Edit Category";
  document.querySelector("#addCategoryModal [type='submit']").textContent = "Update Category";
  openModal("addCategoryModal");
}

// ── Render both lists ─────────────────────────────────────────────────────
function renderCategoriesList() {
  renderGroup("expense", "expenseCategoriesList");
  renderGroup("income",  "incomeCategoriesList");
}

function renderGroup(type, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const cats = allCategories.filter(c => c.type === type);
  if (!cats.length) {
    container.innerHTML = `<p class="text-sm text-neutral-500">No ${type} categories.</p>`;
    return;
  }
  container.innerHTML = cats.map(cat => `
    <div class="manage-item group">
      <div class="flex items-center gap-3 flex-1">
        <span class="inline-block w-2.5 h-2.5 rounded-full shrink-0" style="background:${cat.color}"></span>
        <span class="text-sm font-medium">${cat.name}</span>
      </div>
      <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button data-id="${cat.id}" class="action-btn edit-btn"
                onclick="window._editCategory(this.dataset.id)" title="Edit">✎</button>
        <button data-id="${cat.id}" data-type="category" class="action-btn delete-btn"
                onclick="window._softDelete(this)" title="Delete">✕</button>
      </div>
    </div>`).join("");
}

// ── Form handler ──────────────────────────────────────────────────────────
document.getElementById("addCategoryForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(e.target));
  const ok = editingCategoryId
    ? await updateCategory(editingCategoryId, fd)
    : await addCategory(fd);
  if (ok) {
    e.target.reset();
    editingCategoryId = null;
    document.querySelector("#addCategoryModal .modal-title").textContent    = "Add Category";
    document.querySelector("#addCategoryModal [type='submit']").textContent = "Save Category";
    closeAllModals();
  }
});

document.querySelectorAll('.open-modal[data-modal="addCategoryModal"]').forEach(btn => {
  btn.addEventListener("click", () => {
    editingCategoryId = null;
    document.querySelector("#addCategoryModal .modal-title").textContent    = "Add Category";
    document.querySelector("#addCategoryModal [type='submit']").textContent = "Save Category";
    document.getElementById("addCategoryForm").reset();
  });
});

// ── Init & globals ────────────────────────────────────────────────────────
window.addEventListener("netwrth:userReady", loadCategories);
window._editCategory   = openCategoryEdit;
window._deleteCategory = deleteCategory;

export { allCategories };
