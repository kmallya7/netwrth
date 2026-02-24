// js/auth.js
// ─── Authentication ────────────────────────────────────────────────────────

import { auth }                                          from "./firebase.js";
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { demoData }                                      from "./demo-data.js";

const provider = new GoogleAuthProvider();

// ── Demo Mode ────────────────────────────────────────────────────────────
window._demoMode = false;
window._demoData = demoData;

document.getElementById("tryDemoBtn")?.addEventListener("click", () => {
  window._demoMode = true;

  // Show app shell as demo user
  document.getElementById("authScreen").classList.add("hidden");
  document.getElementById("appShell").classList.remove("hidden");
  document.getElementById("appShell").classList.add("flex");

  // Populate demo user profile
  document.getElementById("userName").textContent  = "Arjun Sharma";
  document.getElementById("userEmail").textContent = "demo@netwrth.app";
  document.getElementById("userAvatar").src        = "https://api.dicebear.com/7.x/initials/svg?seed=AS&backgroundColor=6366f1&textColor=ffffff";

  // Show demo banner
  const banner = document.getElementById("demoBanner");
  if (banner) banner.classList.remove("hidden");

  // Fire userReady so all modules load demo data
  window.dispatchEvent(new CustomEvent("netwrth:userReady", { detail: { uid: "demo" } }));
});

// ── Sign In ──────────────────────────────────────────────────────────────
document.getElementById("googleSignInBtn").addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error("Sign-in error:", err);
  }
});

// ── Sign Out ──────────────────────────────────────────────────────────────
document.getElementById("signOutBtn").addEventListener("click", async () => {
  await signOut(auth);
});

// ── Auth State Observer ───────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Show app, hide auth screen
    document.getElementById("authScreen").classList.add("hidden");
    document.getElementById("appShell").classList.remove("hidden");
    document.getElementById("appShell").classList.add("flex");

    // Populate user profile in sidebar
    document.getElementById("userName").textContent  = user.displayName || "User";
    document.getElementById("userEmail").textContent = user.email || "";
    if (user.photoURL) {
      document.getElementById("userAvatar").src = user.photoURL;
    }

    // Broadcast login event so modules can load data
    window.dispatchEvent(new CustomEvent("netwrth:userReady", { detail: { uid: user.uid } }));
  } else if (!window._demoMode) {
    // Show auth screen, hide app (skip if in demo mode)
    document.getElementById("authScreen").classList.remove("hidden");
    document.getElementById("appShell").classList.add("hidden");
    document.getElementById("appShell").classList.remove("flex");
  }
});

// ── Export current user uid helper ───────────────────────────────────────
export function getCurrentUid() {
  if (window._demoMode) return "demo";
  return auth.currentUser?.uid ?? null;
}
