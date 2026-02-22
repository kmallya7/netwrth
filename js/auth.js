// js/auth.js
// ─── Authentication ────────────────────────────────────────────────────────

import { auth }                                          from "./firebase.js";
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const provider = new GoogleAuthProvider();

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
  } else {
    // Show auth screen, hide app
    document.getElementById("authScreen").classList.remove("hidden");
    document.getElementById("appShell").classList.add("hidden");
    document.getElementById("appShell").classList.remove("flex");
  }
});

// ── Export current user uid helper ───────────────────────────────────────
export function getCurrentUid() {
  return auth.currentUser?.uid ?? null;
}
