# netwrth — Personal Finance Command Center

netwrth is your personal expense tracker, income logger, budget planner, and investment tracker — all in one clean workspace.

A sibling app to [Flowr](https://github.com/kmallya7/flowr-v1).

---

## Modules

| Module | What it does |
|---|---|
| **Dashboard** | Net worth overview, recent transactions, budget snapshot |
| **Expenses** | Log and categorise every spend |
| **Income** | Track all income sources |
| **Budgets & Goals** | Monthly category budgets + savings goals with progress |
| **Investments** | MFs, stocks, PPF, FD — track value vs invested |
| **Debts & Loans** | Track what you owe and payoff progress |
| **Reports & Export** | Monthly P&L summary, CSV exports |

---

## Tech Stack

- **HTML + Vanilla JS** (ES modules)
- **Tailwind CSS v3**
- **Firebase** — Firestore (data) + Google Auth
- **DM Sans + DM Mono** (Google Fonts)

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Firebase
- Go to [Firebase Console](https://console.firebase.google.com)
- Create a new project (or reuse your Flowr project)
- Enable **Firestore** and **Google Authentication**
- Copy your config into `js/firebase.js`

### 3. Firestore Data Structure
```
users/
  {uid}/
    expenses/   { description, amount, category, account, date, notes }
    income/     { source, amount, type, date, notes }
    budgets/    { category, limit }
    goals/      { name, target, saved, deadline }
    investments/{ name, type, invested, currentValue, notes }
    debts/      { name, lender, total, remaining, interest, dueDate }
```

### 4. Build CSS
```bash
npm run build      # production build
npm run dev        # watch mode during development
```

### 5. Open
Open `index.html` in your browser or deploy to GitHub Pages.

---

## Firestore Rules (suggested)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

---

## Version
netwrth v1.0.0

© 2026 Karthick Mallya. All rights reserved.
