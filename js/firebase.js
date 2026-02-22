import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyD85xjVmdx6BPp-TCfv5FHYjXq2ignORrM",
  authDomain:        "netwrth.firebaseapp.com",
  projectId:         "netwrth",
  storageBucket:     "netwrth.firebasestorage.app",
  messagingSenderId: "524652069175",
  appId:             "1:524652069175:web:17504715cafe8c2e5a1ab2"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);