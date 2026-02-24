// js/demo-data.js
// ─── Demo Sample Data ──────────────────────────────────────────────────────
// Realistic Indian personal finance data for "Arjun Sharma", a 28-year-old
// software engineer in Bangalore. Used for the demo / preview experience.

// Helper: create a Date for a given month offset from today and a day
// monthOffset: 0 = current month, -1 = last month, etc.
function d(monthOffset, day) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + monthOffset, day, 12, 0, 0);
}

// ── Accounts ──────────────────────────────────────────────────────────────
export const demoAccounts = [
  { id: "acc1", name: "HDFC Savings",        type: "Savings Account",    balance: 185000, accountNumber: "4821", bankName: "HDFC Bank",    notes: "Primary savings account" },
  { id: "acc2", name: "ICICI Salary",         type: "Bank Account",       balance: 72500,  accountNumber: "9134", bankName: "ICICI Bank",   notes: "Monthly salary credited here" },
  { id: "acc3", name: "HDFC Credit Card",     type: "Credit Card",        balance: -45200, accountNumber: "7782", bankName: "HDFC Bank",   creditLimit: 300000, notes: "Regalia card" },
  { id: "acc4", name: "Zerodha Trading",      type: "Investment Account", balance: 240000, bankName: "Zerodha",  notes: "Equity & MF portfolio" },
  { id: "acc5", name: "Cash",                 type: "Cash",               balance: 8500,   notes: "Daily petty cash" },
  { id: "acc6", name: "GPay / PhonePe",       type: "UPI / Wallet",       balance: 3200,   notes: "UPI wallet" },
];

// ── Expenses (last 6 months — rich data for current month) ────────────────
export const demoExpenses = [
  // ── Current month (February 2026) ──────────────────────────────────────
  { id: "ex001", description: "Rent",                 amount: 32000, date: d(0, 1),  category: "Rent",                 categoryGroup: "Housing & Utilities", account: "HDFC Savings" },
  { id: "ex002", description: "Electricity bill",     amount: 2180,  date: d(0, 3),  category: "Electricity & Gas",    categoryGroup: "Housing & Utilities", account: "HDFC Credit Card" },
  { id: "ex003", description: "Jio Fibre",            amount: 1199,  date: d(0, 3),  category: "Internet",             categoryGroup: "Housing & Utilities", account: "HDFC Credit Card" },
  { id: "ex004", description: "DMart groceries",      amount: 3840,  date: d(0, 4),  category: "Groceries",            categoryGroup: "Food & Dining",       account: "GPay / PhonePe" },
  { id: "ex005", description: "Swiggy – Biryani",     amount: 680,   date: d(0, 5),  category: "Takeout / Delivery",   categoryGroup: "Food & Dining",       account: "HDFC Credit Card", notes: "Friday dinner" },
  { id: "ex006", description: "Cult.fit membership",  amount: 2500,  date: d(0, 6),  category: "Gym & Fitness",        categoryGroup: "Health & Wellness",   account: "HDFC Credit Card" },
  { id: "ex007", description: "Ola cab",              amount: 320,   date: d(0, 7),  category: "Cab / Ride Share",     categoryGroup: "Transport",           account: "GPay / PhonePe" },
  { id: "ex008", description: "Netflix",              amount: 649,   date: d(0, 8),  category: "Streaming",            categoryGroup: "Entertainment",       account: "HDFC Credit Card" },
  { id: "ex009", description: "Spotify",              amount: 119,   date: d(0, 8),  category: "Music",                categoryGroup: "Entertainment",       account: "HDFC Credit Card" },
  { id: "ex010", description: "Pharmacy – vitamins",  amount: 840,   date: d(0, 9),  category: "Pharmacy",             categoryGroup: "Health & Wellness",   account: "Cash" },
  { id: "ex011", description: "Big Basket",           amount: 2650,  date: d(0, 10), category: "Groceries",            categoryGroup: "Food & Dining",       account: "HDFC Credit Card" },
  { id: "ex012", description: "Petrol – HPCL",        amount: 3000,  date: d(0, 11), category: "Fuel",                 categoryGroup: "Transport",           account: "HDFC Credit Card" },
  { id: "ex013", description: "Social Brew café",     amount: 680,   date: d(0, 12), category: "Coffee & Tea",         categoryGroup: "Food & Dining",       account: "GPay / PhonePe" },
  { id: "ex014", description: "Zomato – weekend",     amount: 890,   date: d(0, 12), category: "Takeout / Delivery",   categoryGroup: "Food & Dining",       account: "HDFC Credit Card" },
  { id: "ex015", description: "H&M – casual shirt",   amount: 1999,  date: d(0, 14), category: "Clothing",             categoryGroup: "Shopping",            account: "HDFC Credit Card" },
  { id: "ex016", description: "Amazon – USB hub",     amount: 1499,  date: d(0, 15), category: "Electronics",          categoryGroup: "Shopping",            account: "HDFC Credit Card" },
  { id: "ex017", description: "Dinner – Smoke House", amount: 2800,  date: d(0, 16), category: "Restaurants",          categoryGroup: "Food & Dining",       account: "HDFC Credit Card", notes: "Friend's birthday" },
  { id: "ex018", description: "Ola Electric – recharge", amount: 450, date: d(0, 17), category: "Fuel",               categoryGroup: "Transport",           account: "GPay / PhonePe" },
  { id: "ex019", description: "Mobile recharge – Airtel", amount: 599, date: d(0, 18), category: "Internet",          categoryGroup: "Housing & Utilities", account: "GPay / PhonePe" },
  { id: "ex020", description: "Decathlon – running shoes", amount: 3499, date: d(0, 19), category: "Clothing",        categoryGroup: "Shopping",            account: "HDFC Credit Card" },
  { id: "ex021", description: "Doctor consultation",  amount: 800,   date: d(0, 20), category: "Doctor & Hospital",   categoryGroup: "Health & Wellness",   account: "Cash" },
  { id: "ex022", description: "DMart groceries",      amount: 4100,  date: d(0, 21), category: "Groceries",           categoryGroup: "Food & Dining",       account: "GPay / PhonePe" },
  { id: "ex023", description: "Swiggy – late night",  amount: 420,   date: d(0, 22), category: "Takeout / Delivery",  categoryGroup: "Food & Dining",       account: "HDFC Credit Card" },
  { id: "ex024", description: "PVR – Pushpa 2",       amount: 700,   date: d(0, 23), category: "Movies & Events",     categoryGroup: "Entertainment",       account: "HDFC Credit Card" },

  // ── January 2026 ────────────────────────────────────────────────────────
  { id: "ex025", description: "Rent",                 amount: 32000, date: d(-1, 1),  category: "Rent",                categoryGroup: "Housing & Utilities", account: "HDFC Savings" },
  { id: "ex026", description: "Electricity bill",     amount: 2340,  date: d(-1, 3),  category: "Electricity & Gas",   categoryGroup: "Housing & Utilities", account: "HDFC Credit Card" },
  { id: "ex027", description: "Jio Fibre",            amount: 1199,  date: d(-1, 3),  category: "Internet",            categoryGroup: "Housing & Utilities", account: "HDFC Credit Card" },
  { id: "ex028", description: "DMart groceries",      amount: 5200,  date: d(-1, 5),  category: "Groceries",           categoryGroup: "Food & Dining",       account: "GPay / PhonePe" },
  { id: "ex029", description: "Cult.fit membership",  amount: 2500,  date: d(-1, 6),  category: "Gym & Fitness",       categoryGroup: "Health & Wellness",   account: "HDFC Credit Card" },
  { id: "ex030", description: "Zomato orders",        amount: 3100,  date: d(-1, 10), category: "Takeout / Delivery",  categoryGroup: "Food & Dining",       account: "HDFC Credit Card" },
  { id: "ex031", description: "Petrol – HPCL",        amount: 3000,  date: d(-1, 12), category: "Fuel",                categoryGroup: "Transport",           account: "HDFC Credit Card" },
  { id: "ex032", description: "Netflix",              amount: 649,   date: d(-1, 14), category: "Streaming",           categoryGroup: "Entertainment",       account: "HDFC Credit Card" },
  { id: "ex033", description: "Myntra sale – jacket", amount: 3499,  date: d(-1, 15), category: "Clothing",            categoryGroup: "Shopping",            account: "HDFC Credit Card" },
  { id: "ex034", description: "Lenskart – glasses",   amount: 4200,  date: d(-1, 18), category: "Personal Care",       categoryGroup: "Health & Wellness",   account: "HDFC Credit Card" },
  { id: "ex035", description: "Restaurant – year end", amount: 3800, date: d(-1, 20), category: "Restaurants",         categoryGroup: "Food & Dining",       account: "HDFC Credit Card" },
  { id: "ex036", description: "Mobile recharge",      amount: 599,   date: d(-1, 22), category: "Internet",            categoryGroup: "Housing & Utilities", account: "GPay / PhonePe" },
  { id: "ex037", description: "Auto rides",           amount: 840,   date: d(-1, 25), category: "Cab / Ride Share",    categoryGroup: "Transport",           account: "GPay / PhonePe" },
  { id: "ex038", description: "Pharmeasy order",      amount: 620,   date: d(-1, 28), category: "Pharmacy",            categoryGroup: "Health & Wellness",   account: "HDFC Credit Card" },

  // ── December 2025 ───────────────────────────────────────────────────────
  { id: "ex039", description: "Rent",                 amount: 32000, date: d(-2, 1),  category: "Rent",                categoryGroup: "Housing & Utilities", account: "HDFC Savings" },
  { id: "ex040", description: "Electricity bill",     amount: 2100,  date: d(-2, 3),  category: "Electricity & Gas",   categoryGroup: "Housing & Utilities", account: "HDFC Credit Card" },
  { id: "ex041", description: "Jio Fibre",            amount: 1199,  date: d(-2, 3),  category: "Internet",            categoryGroup: "Housing & Utilities", account: "HDFC Credit Card" },
  { id: "ex042", description: "DMart groceries",      amount: 6800,  date: d(-2, 6),  category: "Groceries",           categoryGroup: "Food & Dining",       account: "GPay / PhonePe", notes: "Christmas stocking up" },
  { id: "ex043", description: "Cult.fit membership",  amount: 2500,  date: d(-2, 7),  category: "Gym & Fitness",       categoryGroup: "Health & Wellness",   account: "HDFC Credit Card" },
  { id: "ex044", description: "Amazon – Christmas gifts", amount: 8500, date: d(-2, 15), category: "Gifts",            categoryGroup: "Shopping",            account: "HDFC Credit Card" },
  { id: "ex045", description: "Zomato orders",        amount: 4200,  date: d(-2, 16), category: "Takeout / Delivery",  categoryGroup: "Food & Dining",       account: "HDFC Credit Card" },
  { id: "ex046", description: "Goa trip – flights",   amount: 12500, date: d(-2, 20), category: "Travel",              categoryGroup: "Entertainment",       account: "HDFC Credit Card", notes: "Christmas vacation" },
  { id: "ex047", description: "Goa trip – hotel",     amount: 9800,  date: d(-2, 21), category: "Travel",              categoryGroup: "Entertainment",       account: "HDFC Credit Card" },
  { id: "ex048", description: "Petrol – HPCL",        amount: 3200,  date: d(-2, 10), category: "Fuel",                categoryGroup: "Transport",           account: "HDFC Credit Card" },
  { id: "ex049", description: "Netflix",              amount: 649,   date: d(-2, 14), category: "Streaming",           categoryGroup: "Entertainment",       account: "HDFC Credit Card" },
  { id: "ex050", description: "New Year party",       amount: 3500,  date: d(-2, 30), category: "Restaurants",         categoryGroup: "Food & Dining",       account: "HDFC Credit Card" },

  // ── November 2025 ───────────────────────────────────────────────────────
  { id: "ex051", description: "Rent",                 amount: 32000, date: d(-3, 1),  category: "Rent",                categoryGroup: "Housing & Utilities", account: "HDFC Savings" },
  { id: "ex052", description: "Electricity bill",     amount: 1950,  date: d(-3, 3),  category: "Electricity & Gas",   categoryGroup: "Housing & Utilities", account: "HDFC Credit Card" },
  { id: "ex053", description: "Jio Fibre",            amount: 1199,  date: d(-3, 3),  category: "Internet",            categoryGroup: "Housing & Utilities", account: "HDFC Credit Card" },
  { id: "ex054", description: "DMart groceries",      amount: 4900,  date: d(-3, 5),  category: "Groceries",           categoryGroup: "Food & Dining",       account: "GPay / PhonePe" },
  { id: "ex055", description: "Cult.fit membership",  amount: 2500,  date: d(-3, 7),  category: "Gym & Fitness",       categoryGroup: "Health & Wellness",   account: "HDFC Credit Card" },
  { id: "ex056", description: "Flipkart Big Billion", amount: 6200,  date: d(-3, 5),  category: "Electronics",         categoryGroup: "Shopping",            account: "HDFC Credit Card", notes: "Noise smartwatch" },
  { id: "ex057", description: "Zomato orders",        amount: 2900,  date: d(-3, 12), category: "Takeout / Delivery",  categoryGroup: "Food & Dining",       account: "HDFC Credit Card" },
  { id: "ex058", description: "Petrol – HPCL",        amount: 2800,  date: d(-3, 14), category: "Fuel",                categoryGroup: "Transport",           account: "HDFC Credit Card" },
  { id: "ex059", description: "Netflix",              amount: 649,   date: d(-3, 16), category: "Streaming",           categoryGroup: "Entertainment",       account: "HDFC Credit Card" },
  { id: "ex060", description: "Diwali sweets & gifts", amount: 4500, date: d(-3, 1),  category: "Gifts",               categoryGroup: "Shopping",            account: "Cash", notes: "Diwali gifting" },
  { id: "ex061", description: "Haircut",              amount: 500,   date: d(-3, 20), category: "Personal Care",       categoryGroup: "Health & Wellness",   account: "Cash" },

  // ── October 2025 ────────────────────────────────────────────────────────
  { id: "ex062", description: "Rent",                 amount: 30000, date: d(-4, 1),  category: "Rent",                categoryGroup: "Housing & Utilities", account: "HDFC Savings", notes: "Old rent before renewal" },
  { id: "ex063", description: "Electricity bill",     amount: 2250,  date: d(-4, 3),  category: "Electricity & Gas",   categoryGroup: "Housing & Utilities", account: "HDFC Credit Card" },
  { id: "ex064", description: "Jio Fibre",            amount: 999,   date: d(-4, 3),  category: "Internet",            categoryGroup: "Housing & Utilities", account: "HDFC Credit Card" },
  { id: "ex065", description: "Groceries",            amount: 5100,  date: d(-4, 6),  category: "Groceries",           categoryGroup: "Food & Dining",       account: "GPay / PhonePe" },
  { id: "ex066", description: "Cult.fit membership",  amount: 2500,  date: d(-4, 7),  category: "Gym & Fitness",       categoryGroup: "Health & Wellness",   account: "HDFC Credit Card" },
  { id: "ex067", description: "Zomato orders",        amount: 3200,  date: d(-4, 15), category: "Takeout / Delivery",  categoryGroup: "Food & Dining",       account: "HDFC Credit Card" },
  { id: "ex068", description: "Petrol – HPCL",        amount: 3000,  date: d(-4, 16), category: "Fuel",                categoryGroup: "Transport",           account: "HDFC Credit Card" },
  { id: "ex069", description: "Netflix",              amount: 649,   date: d(-4, 18), category: "Streaming",           categoryGroup: "Entertainment",       account: "HDFC Credit Card" },
  { id: "ex070", description: "Udemy course",         amount: 499,   date: d(-4, 20), category: "Courses & Learning",  categoryGroup: "Education",           account: "HDFC Credit Card" },

  // ── September 2025 ──────────────────────────────────────────────────────
  { id: "ex071", description: "Rent",                 amount: 30000, date: d(-5, 1),  category: "Rent",                categoryGroup: "Housing & Utilities", account: "HDFC Savings" },
  { id: "ex072", description: "Electricity bill",     amount: 2600,  date: d(-5, 3),  category: "Electricity & Gas",   categoryGroup: "Housing & Utilities", account: "HDFC Credit Card" },
  { id: "ex073", description: "Jio Fibre",            amount: 999,   date: d(-5, 3),  category: "Internet",            categoryGroup: "Housing & Utilities", account: "HDFC Credit Card" },
  { id: "ex074", description: "Groceries",            amount: 4800,  date: d(-5, 5),  category: "Groceries",           categoryGroup: "Food & Dining",       account: "GPay / PhonePe" },
  { id: "ex075", description: "Cult.fit membership",  amount: 2500,  date: d(-5, 7),  category: "Gym & Fitness",       categoryGroup: "Health & Wellness",   account: "HDFC Credit Card" },
  { id: "ex076", description: "Zomato orders",        amount: 2700,  date: d(-5, 12), category: "Takeout / Delivery",  categoryGroup: "Food & Dining",       account: "HDFC Credit Card" },
  { id: "ex077", description: "Petrol – HPCL",        amount: 2800,  date: d(-5, 14), category: "Fuel",                categoryGroup: "Transport",           account: "HDFC Credit Card" },
  { id: "ex078", description: "Netflix",              amount: 649,   date: d(-5, 18), category: "Streaming",           categoryGroup: "Entertainment",       account: "HDFC Credit Card" },
  { id: "ex079", description: "Doctor visit",         amount: 1200,  date: d(-5, 22), category: "Doctor & Hospital",   categoryGroup: "Health & Wellness",   account: "Cash" },
  { id: "ex080", description: "Nykaa – skincare",     amount: 2100,  date: d(-5, 25), category: "Personal Care",       categoryGroup: "Health & Wellness",   account: "HDFC Credit Card" },
];

// ── Income (last 6 months) ────────────────────────────────────────────────
export const demoIncome = [
  // Current month
  { id: "in01", source: "Salary – TechCorp",       amount: 120000, date: d(0, 1),  type: "Primary Salary",    typeGroup: "Salary",                  account: "ICICI Salary", notes: "Feb 2026 salary" },
  { id: "in02", source: "Rental income – Mysore",  amount: 18000,  date: d(0, 5),  type: "Rental",            typeGroup: "Investments",             account: "HDFC Savings", notes: "Monthly property rent" },

  // January 2026
  { id: "in03", source: "Salary – TechCorp",       amount: 120000, date: d(-1, 1), type: "Primary Salary",    typeGroup: "Salary",                  account: "ICICI Salary", notes: "Jan 2026 salary" },
  { id: "in04", source: "Rental income – Mysore",  amount: 18000,  date: d(-1, 5), type: "Rental",            typeGroup: "Investments",             account: "HDFC Savings" },
  { id: "in05", source: "Freelance – React project", amount: 35000, date: d(-1, 20), type: "Freelance",       typeGroup: "Freelance & Side Work",   account: "HDFC Savings", notes: "Dashboard redesign project" },

  // December 2025
  { id: "in06", source: "Salary – TechCorp",       amount: 120000, date: d(-2, 1), type: "Primary Salary",    typeGroup: "Salary",                  account: "ICICI Salary" },
  { id: "in07", source: "Rental income – Mysore",  amount: 18000,  date: d(-2, 5), type: "Rental",            typeGroup: "Investments",             account: "HDFC Savings" },
  { id: "in08", source: "Year-end bonus",           amount: 60000,  date: d(-2, 15), type: "Bonus",           typeGroup: "Salary",                  account: "ICICI Salary", notes: "Performance bonus 2025" },

  // November 2025
  { id: "in09", source: "Salary – TechCorp",       amount: 120000, date: d(-3, 1), type: "Primary Salary",    typeGroup: "Salary",                  account: "ICICI Salary" },
  { id: "in10", source: "Rental income – Mysore",  amount: 18000,  date: d(-3, 5), type: "Rental",            typeGroup: "Investments",             account: "HDFC Savings" },
  { id: "in11", source: "Freelance – API integration", amount: 28000, date: d(-3, 12), type: "Freelance",     typeGroup: "Freelance & Side Work",   account: "HDFC Savings", notes: "Startup client" },

  // October 2025
  { id: "in12", source: "Salary – TechCorp",       amount: 120000, date: d(-4, 1), type: "Primary Salary",    typeGroup: "Salary",                  account: "ICICI Salary" },
  { id: "in13", source: "Rental income – Mysore",  amount: 18000,  date: d(-4, 5), type: "Rental",            typeGroup: "Investments",             account: "HDFC Savings" },
  { id: "in14", source: "Zerodha – dividends",     amount: 12000,  date: d(-4, 18), type: "Dividends",        typeGroup: "Investments",             account: "Zerodha Trading", notes: "Quarterly dividend payout" },

  // September 2025
  { id: "in15", source: "Salary – TechCorp",       amount: 120000, date: d(-5, 1), type: "Primary Salary",    typeGroup: "Salary",                  account: "ICICI Salary" },
  { id: "in16", source: "Rental income – Mysore",  amount: 18000,  date: d(-5, 5), type: "Rental",            typeGroup: "Investments",             account: "HDFC Savings" },
];

// ── Investments ───────────────────────────────────────────────────────────
export const demoInvestments = [
  { id: "inv1", name: "Nifty 50 Index Fund (Zerodha)",   type: "Mutual Fund",  invested: 240000, currentValue: 289500, notes: "ISIN: INF846K01HZ9 · Monthly SIP ₹10K" },
  { id: "inv2", name: "HDFC Flexi Cap Fund",             type: "Mutual Fund",  invested: 120000, currentValue: 138500, notes: "Growth option" },
  { id: "inv3", name: "PPF – SBI",                       type: "PPF / PF",     invested: 150000, currentValue: 162000, notes: "7.1% p.a. | Matures 2031" },
  { id: "inv4", name: "Zerodha Kite – Stocks",           type: "Stocks",       invested: 80000,  currentValue: 92000,  notes: "Infosys, TCS, Reliance" },
  { id: "inv5", name: "Sovereign Gold Bond (2024)",      type: "Gold",         invested: 50000,  currentValue: 58500,  notes: "RBI SGB · 2.5% interest p.a." },
  { id: "inv6", name: "Airtel FD – 1 Year",              type: "Fixed Deposit",invested: 100000, currentValue: 108000, notes: "8% p.a. | Matures Oct 2026" },
  { id: "inv7", name: "NPS – Tier 1",                    type: "PPF / PF",     invested: 60000,  currentValue: 68000,  notes: "Tax saving 80CCD(1B)" },
];

// ── Debts & Loans ──────────────────────────────────────────────────────────
export const demoDebts = [
  { id: "dbt1", name: "Home Loan",    lender: "SBI Bank",   total: 3500000, remaining: 2850000, interest: 8.4, dueDate: "2041-06-30", notes: "EMI: ₹29,200/month" },
  { id: "dbt2", name: "Car Loan",     lender: "HDFC Bank",  total: 650000,  remaining: 280000,  interest: 9.2, dueDate: "2027-03-31", notes: "Honda City · EMI: ₹14,500/month" },
  { id: "dbt3", name: "Credit Card",  lender: "HDFC Regalia", total: 45200, remaining: 45200,   interest: 36,  dueDate: "2026-03-05", notes: "Due on 5th every month" },
];

// ── Budgets ───────────────────────────────────────────────────────────────
export const demoBudgets = [
  { id: "bud1", category: "Food & Dining",       limit: 15000 },
  { id: "bud2", category: "Transport",           limit: 5000  },
  { id: "bud3", category: "Shopping",            limit: 10000 },
  { id: "bud4", category: "Health & Wellness",   limit: 5000  },
  { id: "bud5", category: "Entertainment",       limit: 2000  },
  { id: "bud6", category: "Housing & Utilities", limit: 38000 },
];

// ── Savings Goals ─────────────────────────────────────────────────────────
export const demoGoals = [
  { id: "gol1", name: "Emergency Fund",     target: 500000, saved: 185000, deadline: "2027-03-31", notes: "6 months of expenses" },
  { id: "gol2", name: "Europe Vacation",    target: 200000, saved: 65000,  deadline: "2026-12-31", notes: "Paris + Amsterdam" },
  { id: "gol3", name: "MacBook Pro M4",     target: 200000, saved: 80000,  deadline: "2026-06-30" },
  { id: "gol4", name: "Home Down Payment",  target: 2000000, saved: 685000, deadline: "2028-12-31", notes: "30% of target home value" },
];

// ── Bundled export ────────────────────────────────────────────────────────
export const demoData = {
  expenses:    demoExpenses,
  income:      demoIncome,
  accounts:    demoAccounts,
  investments: demoInvestments,
  debts:       demoDebts,
  budgets:     demoBudgets,
  goals:       demoGoals,
};
