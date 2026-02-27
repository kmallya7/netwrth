// js/categories.js
// ─── Categories Module ────────────────────────────────────────────────────

import { db }                                                             from "./firebase.js";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc,
         query, orderBy, Timestamp, writeBatch }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getCurrentUid }                                                  from "./auth.js";
import { showToast, openModal, closeAllModals }                          from "./ui.js";

let allCategories     = [];
let editingCategoryId = null;

// ── Lucide inline SVG icon library ────────────────────────────────────────
const CATEGORY_ICONS = {
  utensils:        { label: "Utensils",        d: `<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3v7"/>` },
  coffee:          { label: "Coffee",          d: `<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/>` },
  "shopping-cart": { label: "Shopping Cart",   d: `<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>` },
  "shopping-bag":  { label: "Shopping Bag",    d: `<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>` },
  zap:             { label: "Bills / Zap",     d: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>` },
  heart:           { label: "Health",          d: `<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>` },
  activity:        { label: "Activity",        d: `<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>` },
  film:            { label: "Entertainment",   d: `<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/>` },
  music:           { label: "Music",           d: `<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>` },
  "book-open":     { label: "Education",       d: `<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 0 3-3h7z"/>` },
  "graduation-cap":{ label: "Graduation",      d: `<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>` },
  home:            { label: "Home / Rent",     d: `<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>` },
  plane:           { label: "Travel",          d: `<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2c-.5.1-.9.5-.8 1.1l1.5 4.7c.1.3.4.6.7.7l4.7 1.5c.2.1.3.2.4.4l1.5 4.7c.2.6.6.9 1.1.8l4.7-1.5c.3-.1.6-.4.7-.7z"/>` },
  car:             { label: "Car",             d: `<path d="M19 17H5"/><path d="M19 17v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-2"/><path d="M5 17V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8"/><path d="m7 7 1-3h8l1 3"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/>` },
  bus:             { label: "Bus / Transit",   d: `<path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/>` },
  bike:            { label: "Cycling",         d: `<circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>` },
  wrench:          { label: "Maintenance",     d: `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>` },
  wifi:            { label: "Internet",        d: `<path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" x2="12.01" y1="20" y2="20"/>` },
  briefcase:       { label: "Work / Salary",   d: `<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>` },
  laptop:          { label: "Freelance",       d: `<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/>` },
  building:        { label: "Business",        d: `<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>` },
  "trending-up":   { label: "Investments",     d: `<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>` },
  "bar-chart":     { label: "Analytics",       d: `<line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>` },
  "dollar-sign":   { label: "Money",           d: `<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>` },
  wallet:          { label: "Wallet",          d: `<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>` },
  "credit-card":   { label: "Card",            d: `<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>` },
  gift:            { label: "Gift",            d: `<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>` },
  star:            { label: "Bonus / Star",    d: `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>` },
  dumbbell:        { label: "Fitness",         d: `<path d="M14.4 14.4 9.6 9.6"/><path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"/><path d="m21.5 21.5-1.4-1.4"/><path d="M3.9 3.9 2.5 2.5"/><path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z"/>` },
  scissors:        { label: "Personal Care",   d: `<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" x2="8.12" y1="4" y2="15.88"/><line x1="14.47" x2="20" y1="14.48" y2="20"/><line x1="8.12" x2="12" y1="8.12" y2="12"/>` },
  "paw-print":     { label: "Pets",            d: `<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10C9 10 10 9 12 9s3 1 3 1"/><path d="M12 12c-3.03 0-5.93 1.47-7.5 4a9 9 0 0 0 15 0C17.93 13.47 15.03 12 12 12z"/>` },
  shield:          { label: "Insurance",       d: `<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>` },
  percent:         { label: "Tax / Fees",      d: `<line x1="19" x2="5" y1="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>` },
  smartphone:      { label: "Phone / Apps",    d: `<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>` },
  tag:             { label: "Other",           d: `<path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/>` },
};

// ── Emoji palette ──────────────────────────────────────────────────────────
const EMOJI_LIST = [
  // Food & Dining
  { e:"🍕", k:"pizza food restaurant" },
  { e:"🍔", k:"burger food fast" },
  { e:"🥗", k:"salad food healthy" },
  { e:"🍱", k:"bento lunch food box" },
  { e:"🍜", k:"noodles ramen food" },
  { e:"🍳", k:"egg breakfast cooking" },
  { e:"🥐", k:"croissant bakery breakfast" },
  { e:"🌮", k:"taco food mexican" },
  { e:"🥪", k:"sandwich food lunch" },
  { e:"🍣", k:"sushi food japanese" },
  { e:"🍦", k:"icecream dessert sweet" },
  { e:"🧁", k:"cupcake cake dessert" },
  { e:"🍎", k:"apple fruit food healthy" },
  { e:"🥦", k:"broccoli vegetable grocery" },
  { e:"☕", k:"coffee tea hot drink" },
  { e:"🧃", k:"juice drink beverage" },
  { e:"🍺", k:"beer drink alcohol bar" },
  { e:"🍷", k:"wine drink alcohol" },
  { e:"🥤", k:"cold drink beverage" },
  { e:"🛒", k:"cart grocery shopping supermarket" },
  // Transport
  { e:"🚗", k:"car drive transport" },
  { e:"🚕", k:"taxi cab ride transport" },
  { e:"🚌", k:"bus transit public transport" },
  { e:"🚂", k:"train rail transport" },
  { e:"✈️", k:"airplane flight travel air" },
  { e:"🚲", k:"bicycle cycling bike" },
  { e:"🛵", k:"scooter moped bike" },
  { e:"🏍️", k:"motorcycle bike transport" },
  { e:"⛽", k:"fuel petrol gas station" },
  { e:"🅿️", k:"parking transport" },
  { e:"🚀", k:"rocket fast" },
  { e:"🚢", k:"ship cruise boat travel" },
  { e:"🚁", k:"helicopter air transport" },
  // Home & Housing
  { e:"🏠", k:"house home rent" },
  { e:"🏡", k:"house home garden property" },
  { e:"🏢", k:"office building business work" },
  { e:"🔑", k:"key house rent property" },
  { e:"💡", k:"electricity light utility bulb" },
  { e:"💧", k:"water drop utility" },
  { e:"🔧", k:"wrench repair maintenance tool" },
  { e:"🔨", k:"hammer fix repair" },
  { e:"🛋️", k:"sofa furniture household couch" },
  { e:"🧹", k:"broom cleaning household" },
  { e:"📦", k:"box package delivery parcel" },
  { e:"🛏️", k:"bed furniture household" },
  // Health & Wellness
  { e:"❤️", k:"heart health love wellness" },
  { e:"💊", k:"pill medicine pharmacy drugs" },
  { e:"🏥", k:"hospital health doctor medical" },
  { e:"🩺", k:"stethoscope doctor checkup" },
  { e:"💉", k:"syringe vaccine injection" },
  { e:"🦷", k:"tooth dental dentist health" },
  { e:"👓", k:"glasses vision optician" },
  { e:"🧴", k:"lotion skincare personal care" },
  { e:"🏋️", k:"gym workout fitness training" },
  { e:"🧘", k:"yoga meditation wellness" },
  { e:"🚴", k:"cycling exercise fitness" },
  { e:"🏊", k:"swimming exercise fitness" },
  // Entertainment
  { e:"🎬", k:"movie film cinema entertainment" },
  { e:"📺", k:"tv television streaming entertainment" },
  { e:"🎮", k:"gaming game console entertainment" },
  { e:"🎵", k:"music note song entertainment" },
  { e:"🎧", k:"headphones music listen" },
  { e:"🎭", k:"theater entertainment events show" },
  { e:"🎟️", k:"ticket event concert show" },
  { e:"🎨", k:"art painting hobby creative" },
  { e:"🎲", k:"dice board game fun" },
  { e:"🎯", k:"target darts sport game" },
  { e:"📚", k:"books reading library" },
  { e:"🎡", k:"ferris wheel theme park fun" },
  // Shopping & Fashion
  { e:"👗", k:"dress clothing fashion wear" },
  { e:"👟", k:"shoes sneakers footwear fashion" },
  { e:"👜", k:"bag purse handbag fashion" },
  { e:"💄", k:"lipstick makeup beauty cosmetics" },
  { e:"💍", k:"ring jewelry accessories" },
  { e:"🕶️", k:"sunglasses fashion accessories cool" },
  { e:"👒", k:"hat cap fashion accessories" },
  { e:"🛍️", k:"shopping bags retail store" },
  { e:"⌚", k:"watch wristwatch time accessories" },
  // Electronics
  { e:"📱", k:"phone mobile smartphone electronics" },
  { e:"💻", k:"laptop computer electronics tech" },
  { e:"🖥️", k:"monitor desktop computer electronics" },
  { e:"📷", k:"camera photo electronics" },
  { e:"🎙️", k:"microphone podcast recording" },
  // Money & Finance
  { e:"💰", k:"money bag savings cash" },
  { e:"💳", k:"credit card payment debit" },
  { e:"💵", k:"cash dollars money bill" },
  { e:"🪙", k:"coin money currency" },
  { e:"💸", k:"money flying expense spending" },
  { e:"💎", k:"diamond gem luxury premium" },
  { e:"📈", k:"chart up growth investment stock" },
  { e:"📉", k:"chart down loss decline" },
  { e:"🏦", k:"bank savings finance institution" },
  { e:"💹", k:"chart stock investment trading" },
  { e:"🏆", k:"trophy bonus reward prize" },
  { e:"🎁", k:"gift present reward" },
  { e:"⭐", k:"star bonus reward special" },
  { e:"🧾", k:"receipt bill expense invoice" },
  // Work & Business
  { e:"💼", k:"briefcase work job business" },
  { e:"📋", k:"clipboard work tasks list" },
  { e:"✏️", k:"pencil write note edit" },
  { e:"📧", k:"email work communication" },
  { e:"📊", k:"bar chart analytics data work" },
  { e:"📌", k:"pin location marker work" },
  { e:"🔐", k:"lock security privacy" },
  { e:"⚙️", k:"settings gear configuration tools" },
  { e:"📎", k:"paperclip attachment work office" },
  { e:"🖨️", k:"printer office work" },
  // Education
  { e:"🎓", k:"graduation cap education school university" },
  { e:"📖", k:"book open study education reading" },
  { e:"🏫", k:"school building education" },
  { e:"🔬", k:"microscope science research lab" },
  { e:"🧪", k:"test tube science chemistry" },
  { e:"🧑‍💻", k:"programmer coding developer tech" },
  { e:"📐", k:"ruler geometry math education" },
  // Travel & Leisure
  { e:"🏖️", k:"beach vacation holiday sun" },
  { e:"⛰️", k:"mountain trekking travel" },
  { e:"🗺️", k:"map travel explore navigation" },
  { e:"🏕️", k:"camping outdoor tent travel" },
  { e:"🌍", k:"world globe travel international" },
  { e:"🏨", k:"hotel stay accommodation travel" },
  { e:"🤿", k:"diving snorkel swimming sports" },
  { e:"🎿", k:"ski winter sport" },
  // Nature & Pets
  { e:"🌱", k:"plant sprout nature garden" },
  { e:"🌸", k:"flower blossom nature spring" },
  { e:"🌿", k:"herb leaf nature organic" },
  { e:"🐾", k:"paw pet animal footprint" },
  { e:"🐕", k:"dog pet animal" },
  { e:"🐈", k:"cat pet animal" },
  { e:"🐠", k:"fish pet aquarium" },
  // Subscriptions & Services
  { e:"🌐", k:"internet web online subscription" },
  { e:"📡", k:"satellite internet telecom signal" },
  { e:"📰", k:"newspaper news media subscription" },
  { e:"🔔", k:"bell notification reminder alert" },
  // Misc
  { e:"🎉", k:"party celebration event festival" },
  { e:"🙏", k:"charity donation giving prayer" },
  { e:"🏛️", k:"government institution tax" },
  { e:"🔋", k:"battery power energy charge" },
  { e:"🌞", k:"sun energy solar power" },
  { e:"🫙", k:"jar container savings" },
  { e:"📜", k:"scroll document contract legal" },
  { e:"🔖", k:"bookmark tag label marker" },
  { e:"🏷️", k:"tag label price other" },
];

// ── SVG helper ────────────────────────────────────────────────────────────
function svgIcon(key, size = 18) {
  // If key is not a known SVG icon name, render it as an emoji
  if (!CATEGORY_ICONS[key]) {
    const px = Math.round(size * 0.95);
    return `<span style="font-size:${px}px;line-height:1;display:inline-block;" aria-hidden="true">${key || "🏷️"}</span>`;
  }
  const icon = CATEGORY_ICONS[key];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="${icon.label}">${icon.d}</svg>`;
}
export { svgIcon };

// ── Default category tree (parent → children) ─────────────────────────────
const DEFAULT_CATEGORY_TREE = [
  // ── Expense groups ──────────────────────────────────────────────────────
  { name: "Housing & Utilities", type: "expense", icon: "home", children: [
    { name: "Rent",              icon: "home"   },
    { name: "Electricity & Gas", icon: "zap"    },
    { name: "Internet",          icon: "wifi"   },
    { name: "Water",             icon: "zap"    },
    { name: "Maintenance",       icon: "wrench" },
  ]},
  { name: "Food & Dining", type: "expense", icon: "utensils", children: [
    { name: "Groceries",          icon: "shopping-cart" },
    { name: "Restaurants",        icon: "utensils"      },
    { name: "Coffee",             icon: "coffee"        },
    { name: "Takeout / Delivery", icon: "shopping-bag"  },
  ]},
  { name: "Transport", type: "expense", icon: "car", children: [
    { name: "Fuel",              icon: "car"    },
    { name: "Cab / Ride-share",  icon: "car"    },
    { name: "Public Transit",    icon: "bus"    },
    { name: "Parking",           icon: "car"    },
    { name: "Vehicle Service",   icon: "wrench" },
  ]},
  { name: "Health & Wellness", type: "expense", icon: "heart", children: [
    { name: "Doctor / Hospital", icon: "heart"    },
    { name: "Pharmacy",          icon: "heart"    },
    { name: "Gym & Fitness",     icon: "dumbbell" },
    { name: "Personal Care",     icon: "scissors" },
    { name: "Health Insurance",  icon: "shield"   },
  ]},
  { name: "Entertainment", type: "expense", icon: "film", children: [
    { name: "Streaming",       icon: "film"  },
    { name: "Movies & Events", icon: "film"  },
    { name: "Games",           icon: "star"  },
    { name: "Music",           icon: "music" },
  ]},
  { name: "Shopping", type: "expense", icon: "shopping-bag", children: [
    { name: "Clothing",    icon: "shopping-bag" },
    { name: "Electronics", icon: "smartphone"   },
    { name: "Household",   icon: "home"         },
  ]},
  { name: "Education", type: "expense", icon: "book-open", children: [
    { name: "Tuition",           icon: "graduation-cap" },
    { name: "Books & Stationery",icon: "book-open"      },
    { name: "Online Courses",    icon: "laptop"         },
  ]},
  { name: "Other", type: "expense", icon: "tag", children: [] },

  // ── Income groups ───────────────────────────────────────────────────────
  { name: "Employment", type: "income", icon: "briefcase", children: [
    { name: "Salary",     icon: "briefcase" },
    { name: "Bonus",      icon: "star"      },
    { name: "Commission", icon: "percent"   },
  ]},
  { name: "Self-Employment", type: "income", icon: "laptop", children: [
    { name: "Freelance",        icon: "laptop"    },
    { name: "Consulting",       icon: "briefcase" },
    { name: "Business Revenue", icon: "building"  },
  ]},
  { name: "Investments", type: "income", icon: "trending-up", children: [
    { name: "Dividends",     icon: "bar-chart"    },
    { name: "Capital Gains", icon: "trending-up"  },
    { name: "Rental Income", icon: "home"         },
  ]},
  { name: "Other", type: "income", icon: "tag", children: [
    { name: "Gift",        icon: "gift"    },
    { name: "Tax Refund",  icon: "percent" },
  ]},
];

function categoriesCol(uid) {
  return collection(db, "users", uid, "categories");
}

// ── Seed defaults ─────────────────────────────────────────────────────────
async function seedDefaults(uid) {
  let order = 0;
  for (const group of DEFAULT_CATEGORY_TREE) {
    const parentRef = await addDoc(categoriesCol(uid), {
      name: group.name, type: group.type, icon: group.icon,
      parentId: null, order: order++, createdAt: Timestamp.now(),
    });
    for (const child of group.children) {
      await addDoc(categoriesCol(uid), {
        name: child.name, type: group.type, icon: child.icon,
        parentId: parentRef.id, createdAt: Timestamp.now(),
      });
    }
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
    window._allCategoryData = allCategories;
    renderCategoriesTree();
    populateCategorySelects();
    window.dispatchEvent(new Event("netwrth:categoriesChanged"));
    return allCategories;
  } catch (err) {
    console.error("loadCategories:", err);
  }
}

// ── Add / Update / Delete ─────────────────────────────────────────────────
export async function addCategory(data) {
  const uid = getCurrentUid();
  if (!uid) return false;
  try {
    await addDoc(categoriesCol(uid), {
      name:      data.name     || "",
      type:      data.type     || "expense",
      icon:      data.icon     || "tag",
      parentId:  data.parentId || null,
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

export async function updateCategory(id, data) {
  const uid = getCurrentUid();
  if (!uid) return false;
  try {
    await updateDoc(doc(db, "users", uid, "categories", id), {
      name:     data.name     || "",
      type:     data.type     || "expense",
      icon:     data.icon     || "tag",
      parentId: data.parentId || null,
    });
    showToast("Category updated.");
    await loadCategories();
    return true;
  } catch (err) {
    showToast("Failed to update category.", "error");
    return false;
  }
}

export async function deleteCategory(id) {
  const uid = getCurrentUid();
  if (!uid) return;
  try {
    // Also delete any children
    const children = allCategories.filter(c => c.parentId === id);
    for (const child of children) {
      await deleteDoc(doc(db, "users", uid, "categories", child.id));
    }
    await deleteDoc(doc(db, "users", uid, "categories", id));
    showToast("Category deleted.", "info");
    await loadCategories();
  } catch (err) {
    showToast("Failed to delete category.", "error");
  }
}

// ── Build optgroup HTML for selects ───────────────────────────────────────
function buildOptgroups(type, includeGroupOptions = false) {
  const parents = allCategories.filter(c => c.type === type && !c.parentId);
  return parents.map(p => {
    const children = allCategories.filter(c => c.parentId === p.id);
    if (children.length) {
      const groupOpt = includeGroupOptions
        ? `<option value="${p.name}">All ${p.name}</option>` : "";
      return groupOpt + `<optgroup label="${p.name}">${children.map(c =>
        `<option value="${c.name}">${c.name}</option>`).join("")}</optgroup>`;
    }
    return `<option value="${p.name}">${p.name}</option>`;
  }).join("");
}

// ── Populate all selects ──────────────────────────────────────────────────
export function populateCategorySelects() {
  document.querySelectorAll('select[data-populate="expense-categories"]').forEach(sel => {
    const current = sel.value;
    const hasAll  = sel.dataset.allOption === "true";
    sel.innerHTML = (hasAll ? `<option value="">All Categories</option>` : "")
      + buildOptgroups("expense", hasAll);
    if (current) sel.value = current;
  });

  document.querySelectorAll('select[data-populate="income-categories"]').forEach(sel => {
    const current = sel.value;
    sel.innerHTML = buildOptgroups("income");
    if (current) sel.value = current;
  });

  // Reinit quick-add picker if it's visible
  const quickModal = document.getElementById("quickAddModal");
  if (quickModal && !quickModal.classList.contains("hidden")) {
    const isExpense = document.getElementById("quickExpenseTab")?.classList.contains("active");
    _renderGroupChips("quickCatGroups", "quickCatSubs", isExpense ? "expense" : "income", null, null);
  }
}

// ── Chip picker internals ─────────────────────────────────────────────────
function _renderGroupChips(groupsId, subsId, type, initCat, initGroup) {
  const parents  = allCategories.filter(c => c.type === type && !c.parentId);
  const groupsEl = document.getElementById(groupsId);
  const subsEl   = document.getElementById(subsId);
  if (!groupsEl) return;

  // Resolve which group is active
  let activeGroup = null;
  if (initGroup) activeGroup = parents.find(p => p.name === initGroup);
  if (!activeGroup && initCat) {
    // Is initCat itself a parent?
    activeGroup = parents.find(p => p.name === initCat);
    if (!activeGroup) {
      // initCat is a sub — find its parent
      const sub = allCategories.find(c => c.name === initCat && c.parentId);
      if (sub) activeGroup = parents.find(p => p.id === sub.parentId);
    }
  }
  if (!activeGroup) activeGroup = parents[0];

  groupsEl.innerHTML = parents.map(p => `
    <button type="button" class="cat-group-btn${p.id === activeGroup?.id ? " selected" : ""}"
      data-group-id="${p.id}" data-group-name="${p.name}" data-subs-id="${subsId}"
      onclick="window._onCatGroupClick(this)">
      ${svgIcon(p.icon || "tag", 13)}
      <span>${p.name}</span>
    </button>`).join("");

  if (!activeGroup || !subsEl) return;
  const children = allCategories.filter(c => c.parentId === activeGroup.id);
  const picker   = groupsEl.closest(".cat-picker");

  if (children.length) {
    // Resolve active sub
    let activeSub = null;
    if (initCat && initCat !== activeGroup.name) {
      activeSub = children.find(c => c.name === initCat) || null;
    }
    // If fresh form (no initCat at all), default to first sub
    if (!activeSub && !initCat) activeSub = children[0];

    _renderSubChips(subsId, children, activeSub?.name || null);
    subsEl.classList.remove("hidden");

    const catVal = activeSub?.name || initCat || (children[0]?.name);
    _commitPickerValue(picker, catVal, activeGroup.name);
  } else {
    subsEl.classList.add("hidden");
    _commitPickerValue(picker, activeGroup.name, activeGroup.name);
  }
}

function _renderSubChips(subsId, children, selectedSub) {
  const subsEl = document.getElementById(subsId);
  if (!subsEl) return;
  subsEl.innerHTML = children.map(c => `
    <button type="button" class="cat-sub-btn${c.name === selectedSub ? " selected" : ""}"
      data-sub-name="${c.name}" onclick="window._onCatSubClick(this)">
      ${c.name}
    </button>`).join("");
}

function _commitPickerValue(picker, catVal, groupVal) {
  if (!picker) return;
  const form = picker.closest("form");
  if (!form) return;
  const catField   = picker.dataset.catField;
  const groupField = picker.dataset.groupField;
  if (catField   && form.elements[catField])   form.elements[catField].value   = catVal   || "";
  if (groupField && form.elements[groupField]) form.elements[groupField].value = groupVal || "";
}

// ── Chip picker globals ───────────────────────────────────────────────────
window._onCatGroupClick = function(btn) {
  btn.closest(".cat-group-chips").querySelectorAll(".cat-group-btn").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");

  const groupId   = btn.dataset.groupId;
  const groupName = btn.dataset.groupName;
  const subsId    = btn.dataset.subsId;
  const subsEl    = document.getElementById(subsId);
  const children  = allCategories.filter(c => c.parentId === groupId);
  const picker    = btn.closest(".cat-picker");

  if (children.length) {
    _renderSubChips(subsId, children, null);
    subsEl?.classList.remove("hidden");
    // Value stays uncommitted until user picks a sub
  } else {
    subsEl?.classList.add("hidden");
    _commitPickerValue(picker, groupName, groupName);
  }
};

window._onCatSubClick = function(btn) {
  btn.closest(".cat-sub-chips").querySelectorAll(".cat-sub-btn").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
  const subName   = btn.dataset.subName;
  const groupName = btn.closest(".cat-picker")?.querySelector(".cat-group-btn.selected")?.dataset.groupName || subName;
  _commitPickerValue(btn.closest(".cat-picker"), subName, groupName);
};

// Public init helpers called by expenses.js / income.js / ui.js
window._initCatPicker = function(groupsId, subsId, type, cat, group) {
  _renderGroupChips(groupsId, subsId, type, cat || null, group || null);
};
window._initQuickPicker = function(type) {
  _renderGroupChips("quickCatGroups", "quickCatSubs", type, null, null);
};

// ── Icon picker ───────────────────────────────────────────────────────────
function _renderEmojiGrid(picker, selectedKey, filter) {
  const q = filter.toLowerCase().trim();
  const list = q ? EMOJI_LIST.filter(({ k }) => k.includes(q)) : EMOJI_LIST;
  if (!list.length) {
    picker.innerHTML = `<p class="text-neutral-500 text-xs p-2 col-span-full">No results for "${filter}"</p>`;
    return;
  }
  picker.innerHTML = list.map(({ e, k }) => {
    const label = k.split(" ")[0];
    return `<button type="button" title="${label}" data-icon="${e}"
      class="emoji-pick-btn${e === selectedKey ? " selected" : ""}"
      onclick="window._selectCategoryIcon('${e}', this)">${e}</button>`;
  }).join("");
}

function _updateIconPreview(key) {
  const preview = document.getElementById("catIconPreview");
  if (!preview) return;
  preview.innerHTML = svgIcon(key, 22);
}

function renderIconPicker(selectedKey = "tag") {
  const picker = document.getElementById("categoryIconPicker");
  if (!picker) return;
  const searchEl = document.getElementById("catIconSearch");
  if (searchEl) searchEl.value = "";
  _renderEmojiGrid(picker, selectedKey, "");
  _updateIconPreview(selectedKey);
}

window._filterCatEmojis = function(val) {
  const picker = document.getElementById("categoryIconPicker");
  const selectedKey = document.getElementById("selectedCategoryIcon")?.value || "";
  if (picker) _renderEmojiGrid(picker, selectedKey, val);
};

window._selectCategoryIcon = function(key, btn) {
  document.getElementById("selectedCategoryIcon").value = key;
  document.querySelectorAll(".emoji-pick-btn, .icon-pick-btn").forEach(b => b.classList.remove("selected"));
  if (btn) btn.classList.add("selected");
  _updateIconPreview(key);
};

// ── Populate parent category select in Add Category modal ─────────────────
function populateParentSelect(type) {
  const sel = document.getElementById("catParentSelect");
  if (!sel) return;
  const parents = allCategories.filter(c => c.type === type && !c.parentId);
  sel.innerHTML = `<option value="">— None (top-level group) —</option>`
    + parents.map(p => `<option value="${p.id}">${p.name}</option>`).join("");
}

// ── Open Edit Modal ───────────────────────────────────────────────────────
function openCategoryEdit(id) {
  const cat = allCategories.find(c => c.id === id);
  if (!cat) return;
  editingCategoryId = id;
  const form = document.getElementById("addCategoryForm");
  form.name.value = cat.name || "";
  form.type.value = cat.type || "expense";
  const iconKey = cat.icon || "tag";
  document.getElementById("selectedCategoryIcon").value = iconKey;
  renderIconPicker(iconKey);
  populateParentSelect(cat.type || "expense");
  form.elements["parentId"].value = cat.parentId || "";
  document.querySelector("#addCategoryModal .modal-title").textContent    = "Edit Category";
  document.querySelector("#addCategoryModal [type='submit']").textContent = "Update Category";
  openModal("addCategoryModal");
}

// ── Add Sub-category shortcut ─────────────────────────────────────────────
window._addSubCategory = function(parentId, type) {
  editingCategoryId = null;
  const form = document.getElementById("addCategoryForm");
  form.reset();
  form.type.value = type;
  populateParentSelect(type);
  form.elements["parentId"].value = parentId;
  document.getElementById("selectedCategoryIcon").value = "tag";
  renderIconPicker("tag");
  document.querySelector("#addCategoryModal .modal-title").textContent    = "Add Sub-category";
  document.querySelector("#addCategoryModal [type='submit']").textContent = "Save Sub-category";
  openModal("addCategoryModal");
};

// ── Toggle accordion group ────────────────────────────────────────────────
window._toggleCatGroup = function(groupId, type) {
  const el = document.querySelector(`.cat-tree-group[data-group-id="${groupId}"]`);
  if (!el) return;
  el.classList.toggle("open");

  // Persist open state
  const key  = `cat-open-${type}`;
  const open = JSON.parse(localStorage.getItem(key) || "[]");
  const idx  = open.indexOf(groupId);
  if (el.classList.contains("open")) {
    if (idx === -1) open.push(groupId);
  } else {
    if (idx > -1) open.splice(idx, 1);
  }
  localStorage.setItem(key, JSON.stringify(open));
};

// ── Render accordion tree ─────────────────────────────────────────────────
function renderCategoriesTree() {
  renderTree("expense", "expenseCategoriesList");
  renderTree("income",  "incomeCategoriesList");
}

function renderTree(type, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const parents = allCategories
    .filter(c => c.type === type && !c.parentId)
    .sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return 0;
    });

  if (!parents.length) {
    container.innerHTML = `<p class="text-sm text-neutral-500">No ${type} categories.</p>`;
    return;
  }

  const childMap = {};
  allCategories.filter(c => c.type === type && c.parentId).forEach(c => {
    (childMap[c.parentId] = childMap[c.parentId] || []).push(c);
  });

  const openGroups = JSON.parse(localStorage.getItem(`cat-open-${type}`) || "[]");

  const chevronSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
  const gripSvg    = `<svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden="true"><circle cx="3" cy="2.5" r="1.2"/><circle cx="7" cy="2.5" r="1.2"/><circle cx="3" cy="7" r="1.2"/><circle cx="7" cy="7" r="1.2"/><circle cx="3" cy="11.5" r="1.2"/><circle cx="7" cy="11.5" r="1.2"/></svg>`;

  container.innerHTML = parents.map(parent => {
    const children = childMap[parent.id] || [];
    const isOpen   = openGroups.includes(parent.id);

    const childRows = children.map(child => `
      <div class="cat-tree-child group">
        <div class="flex items-center gap-3 flex-1 min-w-0">
          <span class="inline-flex items-center justify-center w-6 h-6 rounded-md bg-neutral-800 text-neutral-400 shrink-0">
            ${svgIcon(child.icon || parent.icon || "tag", 13)}
          </span>
          <span class="text-sm text-neutral-300 cat-name-label truncate"
                ondblclick="window._inlineRename(event, '${child.id}')"
                title="Double-click to rename">${child.name}</span>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="cat-usage-badge" data-cat-name="${child.name}"></span>
          <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button data-id="${child.id}" class="action-btn edit-btn"
                    onclick="window._editCategory(this.dataset.id)" title="Edit">✎</button>
            <button data-id="${child.id}" data-type="category" class="action-btn delete-btn"
                    onclick="window._softDelete(this)" title="Delete">✕</button>
          </div>
        </div>
      </div>`).join("");

    return `
      <div class="cat-tree-group${isOpen ? " open" : ""}" data-group-id="${parent.id}"
           draggable="true"
           ondragstart="window._onCatDragStart(event, '${parent.id}', '${type}')"
           ondragend="window._onCatDragEnd(event)"
           ondragover="window._onCatDragOver(event, '${parent.id}')"
           ondrop="window._onCatDrop(event, '${parent.id}', '${type}')">
        <div class="cat-tree-header" onclick="window._toggleCatGroup('${parent.id}', '${type}')">
          <span class="cat-drag-handle" title="Drag to reorder" onclick="event.stopPropagation()">${gripSvg}</span>
          <span class="cat-tree-chevron">${children.length ? chevronSvg : '<span style="width:12px"></span>'}</span>
          <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-neutral-800 text-neutral-300 shrink-0">
            ${svgIcon(parent.icon || "tag")}
          </span>
          <span class="text-sm font-semibold flex-1 cat-name-label"
                ondblclick="window._inlineRename(event, '${parent.id}')"
                title="Double-click to rename">${parent.name}</span>
          <span class="cat-usage-badge mr-1" data-cat-group="${parent.name}"></span>
          <div class="flex items-center gap-1" onclick="event.stopPropagation()">
            <button class="add-sub-btn"
                    onclick="window._addSubCategory('${parent.id}', '${type}')"
                    title="Add sub-category">+</button>
            <button data-id="${parent.id}" class="action-btn edit-btn"
                    onclick="window._editCategory(this.dataset.id)" title="Edit">✎</button>
            <button data-id="${parent.id}" data-type="category" class="action-btn delete-btn"
                    onclick="window._softDelete(this)" title="Delete">✕</button>
          </div>
        </div>
        ${children.length ? `
          <div class="cat-tree-children">
            ${childRows}
          </div>` : ""}
      </div>`;
  }).join("");

  annotateUsageCounts(type, containerId);
}

// ── Usage count annotation ────────────────────────────────────────────────
function annotateUsageCounts(type, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const data = type === "expense"
    ? (window._netwrthExpenses || [])
    : (window._netwrthIncome   || []);

  container.querySelectorAll(".cat-usage-badge[data-cat-group]").forEach(badge => {
    const groupName = badge.dataset.catGroup;
    const count = data.filter(t =>
      t.categoryGroup === groupName || (!t.categoryGroup && t.category === groupName)
    ).length;
    badge.textContent = count || "";
    badge.style.display = count ? "" : "none";
  });

  container.querySelectorAll(".cat-usage-badge[data-cat-name]").forEach(badge => {
    const catName = badge.dataset.catName;
    const count = data.filter(t => t.category === catName).length;
    badge.textContent = count || "";
    badge.style.display = count ? "" : "none";
  });
}

// Re-annotate whenever expense/income data refreshes
window.addEventListener("netwrth:dataChanged", () => {
  annotateUsageCounts("expense", "expenseCategoriesList");
  annotateUsageCounts("income",  "incomeCategoriesList");
});

// ── Search / filter ───────────────────────────────────────────────────────
window._filterCatTree = function(type, searchVal) {
  const q = searchVal.toLowerCase().trim();
  const id = type === "expense" ? "expenseCategoriesList" : "incomeCategoriesList";
  const container = document.getElementById(id);
  if (!container) return;

  container.querySelectorAll(".cat-tree-group").forEach(group => {
    const parentText = group.querySelector(".cat-tree-header .cat-name-label")?.textContent.toLowerCase() || "";
    const childTexts = [...group.querySelectorAll(".cat-tree-child .cat-name-label")]
      .map(s => s.textContent.toLowerCase());

    if (!q) {
      group.style.display = "";
      return;
    }
    const parentMatch = parentText.includes(q);
    const childMatch  = childTexts.some(n => n.includes(q));
    group.style.display = (parentMatch || childMatch) ? "" : "none";
    // auto-open when a child matches
    if (childMatch && !group.classList.contains("open")) group.classList.add("open");
  });
};

// ── Inline rename ─────────────────────────────────────────────────────────
window._inlineRename = function(e, catId) {
  e.stopPropagation();
  const span = e.currentTarget;
  const currentName = span.textContent.trim();
  const cat = allCategories.find(c => c.id === catId);
  if (!cat) return;

  const input = document.createElement("input");
  input.value = currentName;
  input.className = "cat-inline-input";
  span.replaceWith(input);
  input.focus();
  input.select();

  let saved = false;
  const save = async () => {
    if (saved) return;
    saved = true;
    const newName = input.value.trim();
    if (!newName || newName === currentName) { input.replaceWith(span); return; }
    await updateCategory(catId, {
      name: newName, type: cat.type, icon: cat.icon, parentId: cat.parentId || null,
    });
    // loadCategories() inside updateCategory re-renders — no need to restore span
  };

  input.addEventListener("blur", save);
  input.addEventListener("keydown", ev => {
    if (ev.key === "Enter")  { ev.preventDefault(); input.blur(); }
    if (ev.key === "Escape") { saved = true; input.replaceWith(span); }
  });
};

// ── Drag-to-reorder ───────────────────────────────────────────────────────
let _dragSrcGroupId = null;
let _dragSrcType    = null;

window._onCatDragStart = function(e, groupId, type) {
  _dragSrcGroupId = groupId;
  _dragSrcType    = type;
  e.dataTransfer.effectAllowed = "move";
  e.currentTarget.classList.add("cat-drag-source");
};

window._onCatDragEnd = function(e) {
  e.currentTarget.classList.remove("cat-drag-source");
  document.querySelectorAll(".cat-drag-over").forEach(el => el.classList.remove("cat-drag-over"));
};

window._onCatDragOver = function(e, groupId) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  if (groupId === _dragSrcGroupId) return;
  document.querySelectorAll(".cat-drag-over").forEach(el => el.classList.remove("cat-drag-over"));
  e.currentTarget.classList.add("cat-drag-over");
};

window._onCatDrop = async function(e, targetGroupId, type) {
  e.preventDefault();
  e.currentTarget.classList.remove("cat-drag-over");
  if (!_dragSrcGroupId || _dragSrcGroupId === targetGroupId || _dragSrcType !== type) return;

  const uid = getCurrentUid();
  if (!uid) return;

  const parents = allCategories
    .filter(c => c.type === type && !c.parentId)
    .sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return 0;
    });

  const srcIdx = parents.findIndex(p => p.id === _dragSrcGroupId);
  const tgtIdx = parents.findIndex(p => p.id === targetGroupId);
  if (srcIdx === -1 || tgtIdx === -1) return;

  const [moved] = parents.splice(srcIdx, 1);
  parents.splice(tgtIdx, 0, moved);

  try {
    const batch = writeBatch(db);
    parents.forEach((p, i) => {
      batch.update(doc(db, "users", uid, "categories", p.id), { order: i });
    });
    await batch.commit();
    await loadCategories();
  } catch (err) {
    console.error("_onCatDrop:", err);
    showToast("Failed to reorder categories.", "error");
  }
};

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

// Type change → repopulate parent select
document.getElementById("addCategoryForm").querySelector('[name="type"]')
  .addEventListener("change", (e) => populateParentSelect(e.target.value));

// Reset to add mode when modal opened fresh
document.querySelectorAll('.open-modal[data-modal="addCategoryModal"]').forEach(btn => {
  btn.addEventListener("click", () => {
    editingCategoryId = null;
    const form = document.getElementById("addCategoryForm");
    form.reset();
    populateParentSelect("expense");
    renderIconPicker("tag");
    document.querySelector("#addCategoryModal .modal-title").textContent    = "Add Category";
    document.querySelector("#addCategoryModal [type='submit']").textContent = "Save Category";
  });
});

// ── Init & globals ────────────────────────────────────────────────────────
window.addEventListener("netwrth:userReady", loadCategories);
window._editCategory   = openCategoryEdit;
window._deleteCategory = deleteCategory;

// Legacy helper (still used by ui.js as a fallback for quick-add selects)
window._populateSelect = function(selectEl, type) {
  const cats = allCategories.filter(c => c.type === type && !c.parentId);
  selectEl.innerHTML = cats.length
    ? cats.map(c => `<option value="${c.name}">${c.name}</option>`).join("")
    : `<option value="Other">Other</option>`;
};

export { allCategories };
