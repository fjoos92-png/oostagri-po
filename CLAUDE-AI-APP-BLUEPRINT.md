# Oostagri PO App - Complete Blueprint for Claude AI

Copy and paste this entire document into Claude AI when you want to build a similar app.

---

## CONTEXT FOR CLAUDE AI

I have an existing Progressive Web App (PWA) called "Oostagri PO" that I built with your help. Below is the complete architecture, design patterns, and code structure. Use this as a blueprint when I ask you to build new apps with similar functionality.

---

## 1. APP OVERVIEW

**What it does:** A mobile-first Purchase Order management system for farm operations.

**Key Features:**
- User login with 5-digit codes (no passwords)
- Create purchase orders with auto-generated PO numbers
- View order history (personal and all orders for management)
- Edit orders within 24 hours
- Offline support with background sync
- Role-based access (user, management, finance)
- Dynamic lookup data from Google Sheets
- Favorite suppliers shown first
- Pull-to-refresh
- PWA installable on home screen

---

## 2. TECHNOLOGY STACK

### Frontend (Single HTML file - No build step)
```
- React 18 (via CDN - unpkg.com)
- Babel Standalone (for JSX compilation in browser)
- Tailwind CSS (via CDN)
- No npm, no webpack, no build process
```

### Backend
```
- Google Apps Script (REST API)
- Google Sheets (Database)
```

### PWA Features
```
- Service Worker for offline caching
- Web App Manifest for install prompt
- localStorage for data persistence
```

---

## 3. FILE STRUCTURE

```
project-folder/
├── index.html      # Complete React app (all components inline)
├── sw.js           # Service worker for offline support
├── manifest.json   # PWA manifest
```

That's it - just 3 files!

---

## 4. GOOGLE SHEETS STRUCTURE

### Tab: Purchase Orders
| Column | Field |
|--------|-------|
| A | PO Number |
| B | Date |
| C | Submitted By |
| D | User Initials |
| E | Farm Location |
| F | Department |
| G | Supplier |
| H | Category |
| I | Item |
| J | Description |
| K | Quantity |
| L | Payment Terms |
| M | Edited At |
| N | Edited By |

### Tab: Users
| Column | Field |
|--------|-------|
| A | Name |
| B | Code (5 digits) |
| C | Initials |
| D | Role (user/management/finance) |
| E | Email |
| F | Active (Yes/No) |

### Tab: Suppliers
| Column | Field |
|--------|-------|
| A | Name |
| B | Active (Yes/No) |

### Tab: Vehicles / Equipment / Tractors
| Column | Field |
|--------|-------|
| A | ID |
| B | Name |
| C | Active (Yes/No) |

### Tab: Farms / Departments
| Column | Field |
|--------|-------|
| A | Name |
| B | Active (Yes/No) |

---

## 5. GOOGLE APPS SCRIPT API

### Deployment Settings
- Execute as: Me
- Who has access: Anyone
- Deploy as Web App

### API Endpoints (via query parameter `?action=`)

| Action | Purpose |
|--------|---------|
| `getOrders` | Fetch all orders |
| `addOrder` | Create new order |
| `updateOrder` | Edit existing order |
| `sendCode` | Email login code |
| `getLookups` | Get all dropdown data |

### Complete Google Apps Script:
```javascript
function doGet(e) {
  const action = e.parameter.action;
  try {
    switch(action) {
      case 'getOrders':
        return jsonResponse(getOrders());
      case 'addOrder':
        return jsonResponse(addOrder(JSON.parse(e.parameter.order)));
      case 'updateOrder':
        return jsonResponse(updateOrder(JSON.parse(e.parameter.order)));
      case 'sendCode':
        return jsonResponse(sendLoginCode(e.parameter.email, e.parameter.name, e.parameter.code));
      case 'getLookups':
        return jsonResponse(getLookups());
      default:
        return jsonResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Purchase Orders');
  if (!sheet) return { success: false, error: 'Sheet not found' };

  const data = sheet.getDataRange().getValues();
  const orders = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      orders.push({
        poNumber: data[i][0],
        date: data[i][1],
        submittedBy: data[i][2],
        userInitials: data[i][3],
        farmLocation: data[i][4],
        department: data[i][5],
        supplier: data[i][6],
        category: data[i][7],
        item: data[i][8],
        description: data[i][9],
        quantity: data[i][10],
        paymentTerms: data[i][11],
        editedAt: data[i][12] || null,
        editedBy: data[i][13] || null
      });
    }
  }
  return { success: true, orders };
}

function addOrder(orderData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Purchase Orders');
  sheet.appendRow([
    orderData.poNumber, orderData.date, orderData.submittedBy,
    orderData.userInitials, orderData.farmLocation, orderData.department,
    orderData.supplier, orderData.category, orderData.item,
    orderData.description, orderData.quantity, orderData.paymentTerms, '', ''
  ]);
  return { success: true };
}

function updateOrder(orderData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Purchase Orders');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === orderData.poNumber) {
      sheet.getRange(i + 1, 1, 1, 14).setValues([[
        orderData.poNumber, orderData.date, orderData.submittedBy,
        orderData.userInitials, orderData.farmLocation, orderData.department,
        orderData.supplier, orderData.category, orderData.item,
        orderData.description, orderData.quantity, orderData.paymentTerms,
        orderData.editedAt, orderData.editedBy
      ]]);
      return { success: true };
    }
  }
  return { success: false, error: 'Not found' };
}

function sendLoginCode(email, name, code) {
  MailApp.sendEmail(email, 'Your Login Code', `Hi ${name},\n\nYour code is: ${code}`);
  return { success: true };
}

function getLookups() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const isActive = (v) => v === 'Yes' || v === 'yes' || v === true;

  // Fetch each lookup sheet and return active items
  // Users, Suppliers, Vehicles, Equipment, Tractors, Farms, Departments
  // Return: { success: true, lookups: { users, suppliers, vehicles, ... } }
}
```

---

## 6. INDEX.HTML STRUCTURE

### HTML Head
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>App Name</title>
    <meta name="theme-color" content="#15803d">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <link rel="manifest" href="./manifest.json">

    <!-- CDN Dependencies -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

    <style>
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      .safe-top { padding-top: max(env(safe-area-inset-top, 0px), 20px) !important; }
      .safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
      @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      .skeleton { background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
                  background-size: 200% 100%; animation: shimmer 1.5s infinite; }
    </style>
</head>
```

### Service Worker Registration
```html
<script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((registration) => console.log('SW registered'))
          .catch((error) => console.log('SW failed:', error));
      });
    }
</script>
```

### Offline Queue (before React)
```html
<script>
    const OfflineQueue = {
      QUEUE_KEY: 'app_offline_queue',
      add: (item, action = 'CREATE') => {
        const queue = JSON.parse(localStorage.getItem(OfflineQueue.QUEUE_KEY) || '[]');
        queue.push({ ...item, _queuedAt: Date.now(), _action: action });
        localStorage.setItem(OfflineQueue.QUEUE_KEY, JSON.stringify(queue));
      },
      getAll: () => JSON.parse(localStorage.getItem(OfflineQueue.QUEUE_KEY) || '[]'),
      remove: (queuedAt) => {
        const queue = JSON.parse(localStorage.getItem(OfflineQueue.QUEUE_KEY) || '[]');
        localStorage.setItem(OfflineQueue.QUEUE_KEY, JSON.stringify(queue.filter(o => o._queuedAt !== queuedAt)));
      },
      clear: () => localStorage.removeItem(OfflineQueue.QUEUE_KEY),
      count: () => OfflineQueue.getAll().length
    };
    window.OfflineQueue = OfflineQueue;
</script>
```

### SVG Icons (inline as React components)
```html
<script>
    const CheckCircle = ({size = 24}) => React.createElement('svg', {...});
    const Search = ({size = 24}) => React.createElement('svg', {...});
    const ArrowLeft = ({size = 24}) => React.createElement('svg', {...});
    // etc.
</script>
```

### Main React App
```html
<script type="text/babel">
    const { useState, useEffect } = React;
    const API_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

    const App = () => {
      // State management
      const [screen, setScreen] = useState('login');
      const [currentUser, setCurrentUser] = useState(null);
      const [isOnline, setIsOnline] = useState(navigator.onLine);
      const [orders, setOrders] = useState([]);
      const [cachedLookups, setCachedLookups] = useState(() => {
        const cached = localStorage.getItem('app_lookups_cache');
        return cached ? JSON.parse(cached) : null;
      });

      // ... rest of app logic

      return (/* JSX */);
    };

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
</script>
```

---

## 7. KEY DESIGN PATTERNS

### A. Screen-Based Navigation (No Router)
```javascript
const [screen, setScreen] = useState('login');

// Render based on screen state
if (screen === 'login') return <LoginScreen />;
if (screen === 'form') return <FormScreen />;
if (screen === 'success') return <SuccessScreen />;
if (screen === 'history') return <HistoryScreen />;
```

### B. localStorage Caching with Timestamps
```javascript
// Save with timestamp
const timestamp = Date.now();
localStorage.setItem('cache_key', JSON.stringify({ data, timestamp }));

// Load and check age
const cached = localStorage.getItem('cache_key');
if (cached) {
  const { data, timestamp } = JSON.parse(cached);
  const sixHours = 6 * 60 * 60 * 1000;
  if (Date.now() - timestamp < sixHours) {
    // Use cached data
  } else {
    // Refresh from server
  }
}
```

### C. Optimistic UI Updates
```javascript
const saveOrder = async (orderData) => {
  // Update local state immediately
  setOrders([orderData, ...orders]);
  localStorage.setItem('cache', JSON.stringify({ orders: [orderData, ...orders], timestamp: Date.now() }));

  // Then sync to server in background
  if (navigator.onLine) {
    fetch(API_URL + '?action=addOrder&order=' + encodeURIComponent(JSON.stringify(orderData)));
  } else {
    OfflineQueue.add(orderData);
  }
};
```

### D. Offline Queue Sync
```javascript
const syncOfflineOrders = async () => {
  const queue = OfflineQueue.getAll();
  for (const item of queue) {
    try {
      const response = await fetch(API_URL + '?action=addOrder&order=' + encodeURIComponent(JSON.stringify(item)));
      const data = await response.json();
      if (data.success) {
        OfflineQueue.remove(item._queuedAt);
      }
    } catch (error) {
      break; // Stop on error
    }
  }
};

// Auto-sync when back online
useEffect(() => {
  window.addEventListener('online', syncOfflineOrders);
  return () => window.removeEventListener('online', syncOfflineOrders);
}, []);
```

### E. Pull-to-Refresh
```javascript
const [pullDistance, setPullDistance] = useState(0);
const touchStartY = React.useRef(0);

const handleTouchStart = (e) => {
  if (e.target.closest('.scroll-container')?.scrollTop === 0) {
    touchStartY.current = e.touches[0].clientY;
  }
};

const handleTouchMove = (e) => {
  const diff = e.touches[0].clientY - touchStartY.current;
  if (diff > 0 && diff < 150) setPullDistance(diff);
};

const handleTouchEnd = () => {
  if (pullDistance > 80) fetchData();
  setPullDistance(0);
};
```

### F. Favorite Items First in Lists
```javascript
const favoriteSuppliers = ['Supplier A', 'Supplier B', 'Supplier C'];

const getFilteredSuppliers = () => {
  const allSuppliers = getActiveSuppliers();
  const search = formData.supplier.toLowerCase();

  if (search) {
    return allSuppliers.filter(s => s.toLowerCase().includes(search));
  }

  // No search - favorites first
  const favorites = favoriteSuppliers.filter(f => allSuppliers.includes(f));
  const others = allSuppliers.filter(s => !favoriteSuppliers.includes(s));
  return [...favorites, ...others];
};
```

### G. Role-Based Access
```javascript
const isManagement = currentUser?.role === 'management' || currentUser?.role === 'finance';
const isFinance = currentUser?.role === 'finance';

// Show management-only features
{isManagement && <button onClick={() => setScreen('allorders')}>All Orders</button>}

// Finance can edit any order
const canEdit = isFinance || (isOwnOrder && isWithin24Hours);
```

### H. Form Validation with Visual Feedback
```javascript
const [validationErrors, setValidationErrors] = useState({});

const handleSubmit = () => {
  const errors = {};
  if (!formData.field1) errors.field1 = true;
  if (!formData.field2) errors.field2 = true;

  if (Object.keys(errors).length > 0) {
    setValidationErrors(errors);
    // Scroll to first error
    const firstError = document.querySelector('[data-field="' + Object.keys(errors)[0] + '"]');
    firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  // Submit...
};

// In form
<input className={validationErrors.field1 ? 'border-red-400 bg-red-50' : 'border-gray-300'} />
```

---

## 8. SERVICE WORKER (sw.js)

```javascript
const CACHE_NAME = 'app-v1';
const CORE_ASSETS = ['./', './index.html', './manifest.json'];
const CDN_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js'
];

// Install: Cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(CORE_ASSETS);
      for (const url of CDN_ASSETS) {
        try {
          const response = await fetch(url, { mode: 'cors' });
          if (response.ok) await cache.put(url, response);
        } catch (err) { console.warn('CDN cache failed:', url); }
      }
    })
  );
  self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
    ))
  );
  self.clients.claim();
});

// Fetch: Cache-first for static, network-first for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // API calls: network first
  if (request.url.includes('script.google.com')) {
    event.respondWith(
      fetch(request).catch(() => new Response(
        JSON.stringify({ success: false, offline: true }),
        { headers: { 'Content-Type': 'application/json' } }
      ))
    );
    return;
  }

  // Static assets: cache first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return response;
      });
    })
  );
});
```

---

## 9. MANIFEST.JSON

```json
{
  "name": "App Full Name",
  "short_name": "AppName",
  "description": "App description",
  "start_url": "./",
  "display": "standalone",
  "background_color": "#15803d",
  "theme_color": "#15803d",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%2315803d' width='100' height='100' rx='22'/><text x='50' y='68' font-size='48' font-weight='900' font-family='Arial Black' text-anchor='middle' fill='white'>PO</text></svg>",
      "sizes": "192x192",
      "type": "image/svg+xml",
      "purpose": "any"
    },
    {
      "src": "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%2315803d' width='100' height='100'/><text x='50' y='62' font-size='36' font-weight='900' font-family='Arial Black' text-anchor='middle' fill='white'>PO</text></svg>",
      "sizes": "192x192",
      "type": "image/svg+xml",
      "purpose": "maskable"
    }
  ]
}
```

---

## 10. UI/UX PATTERNS

### Color Scheme
```
Primary (Green):    #15803d (green-700)
Secondary (Slate):  #334155 (slate-700)
Success:            #10B981 (emerald-500)
Warning:            #F59E0B (amber-500)
Danger:             #EF4444 (red-500)
Management:         #7C3AED (purple-600)
```

### Component Styling (Tailwind)
```html
<!-- Card -->
<div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-sm hover:border-green-500 hover:shadow-lg">

<!-- Button Primary -->
<button className="w-full bg-green-600 text-white py-4 rounded-xl text-xl font-bold hover:bg-green-700">

<!-- Input with error state -->
<input className={'w-full p-4 text-lg border-2 rounded-xl focus:outline-none ' +
  (error ? 'border-red-400 bg-red-50' : 'border-gray-300 focus:border-green-500')} />

<!-- Select -->
<select className="w-full p-4 text-lg border-2 border-gray-300 rounded-xl focus:border-green-500 focus:outline-none">

<!-- Header -->
<div className="bg-green-700 text-white p-4 rounded-t-2xl">

<!-- Bottom Navigation -->
<div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-lg">
```

### Safe Area Handling (iPhone notch)
```css
.safe-top { padding-top: max(env(safe-area-inset-top, 0px), 20px) !important; }
.safe-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
```

---

## 11. COMMON FEATURES TO INCLUDE

1. **Login Screen** - Simple code entry, no passwords
2. **Forgot Code** - Email code to user
3. **Main Form** - Create new records
4. **Success Screen** - Copy/share confirmation
5. **History/List View** - User's records with search
6. **All Records View** - Management only, with export
7. **Detail View** - Full record with edit option
8. **Edit Screen** - Time-limited editing
9. **Bottom Navigation** - Tab-based navigation
10. **Offline Banner** - Show when offline
11. **Sync Status** - Show pending syncs
12. **Pull-to-Refresh** - Manual refresh gesture
13. **Install Prompt** - PWA home screen instructions

---

## 12. HOW TO USE THIS BLUEPRINT

When asking Claude to build a new app, say:

> "I want to build a [APP TYPE] app using the same architecture as my Oostagri PO app. Here's the blueprint: [paste this document].
>
> The new app should:
> - [Feature 1]
> - [Feature 2]
> - [Feature 3]
>
> Please create the Google Sheets structure, Google Apps Script, and index.html following the same patterns."

---

## 13. DEPLOYMENT CHECKLIST

1. [ ] Create Google Sheet with required tabs
2. [ ] Add Google Apps Script and deploy as Web App
3. [ ] Copy deployment URL to index.html API_URL constant
4. [ ] Update manifest.json (name, colors, icons)
5. [ ] Update service worker cache name
6. [ ] Host files (GitHub Pages, Netlify, etc.)
7. [ ] Test on mobile device
8. [ ] Add to home screen as PWA
9. [ ] Test offline functionality
10. [ ] Test sync when back online

---

**This blueprint created from the Oostagri PO app - January 2024**
