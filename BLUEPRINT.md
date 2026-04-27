# Oostagri PO — App Blueprint

A reference document for the Oostagri Purchase Orders app. Upload this to Claude chat so the assistant has full context of how the app is built, what it does, and the conventions it follows.

---

## 1. What the app is

A mobile-first **Progressive Web App (PWA)** for capturing farm purchase orders ("POs") on the go, used by Oostagri staff in South Africa. Users log in with a 5-digit code, capture a PO against a farm/department/supplier/item, and the order is written to a Google Sheet via a Google Apps Script web API. Works fully offline with later sync.

- **Domain:** Farm operations (tractors, vehicles, equipment, "other" purchases)
- **Users:** ~21 named employees (mix of `user`, `management`, `finance` roles)
- **Backend:** Google Sheets + Google Apps Script (`doGet` JSON API)
- **Frontend:** Single-file React app (Babel-in-browser), Tailwind via CDN
- **Hosting:** Static hosting (the HTML/SW/manifest are served from any static host, e.g. GitHub Pages)
- **Languages in UI:** English + Afrikaans labels (item names are mostly Afrikaans)
- **Currency / locale:** ZAR, `Africa/Johannesburg` timezone, `en-ZA` date formatting

---

## 2. Repo layout

```
/
├── index.html                       ← The entire React app (~1000 lines, Babel-compiled in-browser)
├── sw.js                            ← Service worker (offline cache + background sync)
├── manifest.json                    ← PWA manifest (name, icons, theme)
├── google-apps-script-lookups.js    ← The backend script to paste into Google Apps Script
└── .gitignore
```

There is **no build step**, **no node_modules**, **no bundler**. React, ReactDOM, Babel-standalone, and Tailwind are loaded from CDNs. This is intentional — the app must be editable and deployable without tooling.

---

## 3. Tech stack & runtime

| Layer | Choice |
|---|---|
| UI framework | React 18 (UMD) via `<script>` tag |
| JSX compile | `@babel/standalone` in-browser (`<script type="text/babel">`) |
| Styling | Tailwind CSS via CDN (`https://cdn.tailwindcss.com`) |
| Icons | Inline SVG components defined as `React.createElement` (no lucide/heroicons dep) |
| State | Local React `useState` only — no Redux, no Context, no Zustand |
| Persistence (client) | `localStorage` (orders cache, lookups cache, offline queue, last PO numbers, current user) |
| Persistence (server) | Google Sheets via Apps Script Web App (deployed as `doGet`) |
| Offline | Service worker (`sw.js`) + custom `OfflineQueue` in `localStorage` |
| Auth | 5-digit numeric code matched against the `Users` lookup |

---

## 4. Backend — Google Apps Script (`google-apps-script-lookups.js`)

A single `doGet(e)` switch handles all actions. Deployed as a Google Apps Script Web App; the URL is hard-coded in `index.html` as `API_URL`.

**Actions:**

| `?action=` | Purpose | Extra params |
|---|---|---|
| `getOrders` | Read all rows from the `Purchase Orders` sheet | — |
| `addOrder` | Append a new PO row | `order=<JSON>` |
| `updateOrder` | Find row by PO number and overwrite columns A–N | `order=<JSON>` |
| `sendCode` | Email a user their login code (uses `MailApp.sendEmail`) | `email`, `name`, `code` |
| `getLookups` | Return active `Users`, `Suppliers`, `Vehicles`, `Equipment`, `Tractors`, `Farms`, `Departments` | — |

**All responses** are JSON `{ success: true, ... }` or `{ success: false, error }`.

### Sheet structure

`Purchase Orders` sheet — columns A → N:
1. PO Number
2. Date (locale string)
3. Submitted By
4. User Initials
5. Farm/Location
6. Department
7. Supplier
8. Category (`tractor` | `vehicle` | `equipment` | `other`)
9. Item (name from itemDatabase, or `"Other"`)
10. Description (free text — used for `"other"` category, or item details)
11. Quantity (legacy / pre-description field, currently mirrors description)
12. Payment Terms
13. Edited At (ISO/locale string)
14. Edited By (name of editor)

**Lookup sheets** (all use a column to mark active rows — accepts `Yes`/`yes`/`true`/`TRUE`/`true`/boolean true):

- `Users`: `Name | Code | Initials | Role | Email | Active`
- `Suppliers`: `Name | Active`
- `Vehicles`: `ID | Name | Active`
- `Equipment`: `ID | Name | Active`
- `Tractors`: `ID | Name | Active`
- `Farms`: `Name | Active`
- `Departments`: `Name | Active`

If a sheet is missing or returns nothing, the frontend falls back to the **hardcoded defaults baked into `index.html`** (see §6).

---

## 5. Frontend architecture (`index.html`)

A single component, `App`, containing all screens controlled by a `screen` state value:

| `screen` | Description |
|---|---|
| `'login'` | 5-digit code entry, "Forgot code" via email |
| `'form'` | New PO capture (multi-step, scroll-to-next-field on selection) |
| `'success'` | Confirmation view, shows PO number with copy button |
| `'orders'` | List of the current user's POs (search + edit + CSV export) |
| `'allOrders'` | Management/finance view: all users' POs |
| `'edit'` | Edit existing PO (same fields as form) |

### Key state slices

- `currentUser` — persisted to `localStorage` (`farm_po_current_user`)
- `formData` / `editFormData` — `{location, department, supplier, category, item, itemSearch, description, quantity, paymentTerms}`
- `orders` — full list, hydrated from `farm_po_orders_cache` first for instant display, then refreshed from the API
- `cachedLookups` — from `farm_po_lookups_cache`, falls back to hardcoded defaults
- `pendingSyncCount`, `isSyncing`, `isOnline`, `isLoading`, `isSaving`
- `pullDistance`, `isPulling` — for pull-to-refresh

### Hardcoded fallbacks (in `index.html`)
- **`users`** array (21 employees, `{name, code, initials, role, email}`)
- **`itemDatabase`** with `tractor`, `vehicle`, `equipment`, `other` categories (~50+ tractors, ~30 vehicles, ~70 equipment items — mostly Afrikaans names like "Bossiekapper Falcon", "Menger Storti", "Welger Baler")
- **`defaultSuppliers`** — ~600 suppliers, A–Z
- **`farms`** — `['Angora','Diamant','Drew','Grootdam','HO','Leeufontein','Pleasantview','Samuraai','Uitvlugt','Vaandrigsdrift','Voorhuis']`
- **`departments`** — `['Graan','Other','Suiwel','Wingerd']`
- **`favoriteSuppliers`** — 5 pinned at the top of the supplier picker

These fallbacks exist so the app is fully usable even before the Google Sheets `Lookups` sheets exist or when offline with no cached lookups.

---

## 6. Data flow

### Creating a PO
1. User fills the form. PO number is generated **locally** by `getNextPONumber(initials)`:
   - Reads `localStorage['farm_po_last_number_<INITIALS>']`
   - Cross-references the highest `<INITIALS>-NNNN` already in the orders cache
   - Picks `max + 1`, formats as `XX-0001`
2. `saveOrder()` does **optimistic UI**: prepends to `orders`, updates the cache, navigates to `success`.
3. In the background, `fetch(API_URL + '?action=addOrder&order=…')` is fired and forgotten (errors → push to offline queue).
4. If offline, the order is added directly to `OfflineQueue` (`localStorage['farm_po_offline_queue']`).

### Editing a PO
- Same optimistic pattern; `OfflineQueue.add(order, 'UPDATE')` if offline.
- When syncing, the queue item's `_action` flag selects `addOrder` vs `updateOrder`.

### Background sync
- On `online` event, on `syncOfflineOrders` custom event from SW, or on app open with non-empty queue, `syncOfflineOrders()` walks the queue and POSTs each item, removing successful ones.
- Concurrent syncs are guarded by `window._isSyncing`.

### Lookups refresh
- `fetchLookups()` runs alongside `fetchOrders()`. Result is cached in `farm_po_lookups_cache` with a timestamp.
- On open, cached orders are shown **instantly**. A network refresh only triggers if the cache is older than **6 hours** (or absent). Pull-to-refresh forces a refresh.

---

## 7. Service worker (`sw.js`)

- `CACHE_NAME = 'farm-po-v58'` — bumped on each release to invalidate.
- **Install**: caches `./`, `./index.html`, `./manifest.json` (required) and CDN assets (best-effort).
- **Activate**: deletes old caches, calls `clients.claim()`. **No forced reload** — updates apply on next app open. This is by design (commit `c0b318d`: "Silent background update on app open, no forced reload").
- **Fetch strategy**:
  - `script.google.com` → network-only, JSON `{success:false, offline:true}` on failure.
  - HTML/navigation requests → **network-first** (so updates reach users), fall back to cached `index.html` offline.
  - CDN assets (React, Tailwind, Babel) → **cache-first**.
- Listens for `SYNC_ORDERS` messages and `sync` events tagged `sync-orders`, which post `TRIGGER_SYNC` back to clients so the React app runs `syncOfflineOrders()`.

---

## 8. PWA manifest (`manifest.json`)

- `name`: "Oostagri Purchase Orders"
- `short_name`: "Oostagri PO"
- `theme_color` / `background_color`: `#15803d` (Tailwind `green-700`)
- `display`: `standalone`, `orientation: portrait-primary`
- Icons are inline SVG data URIs ("PO" white text on a green rounded square).

---

## 9. UX conventions / design choices

- **Colour scheme**: green-700 brand colour, soft green/blue gradient backgrounds.
- **iOS safe areas** handled with `env(safe-area-inset-*)` and a `.safe-area-spacer` element.
- **Skeleton loaders** during first fetch (`.skeleton` class with shimmer keyframes).
- **Pull-to-refresh** implemented manually with touch handlers and a `pull-indicator` rotation.
- **Auto-scroll to next step** when user picks a supplier/item, with `data-step="N"` markers and `scrollIntoView`.
- **Validation**: `handleSubmit` collects errors by field, shows a toast, scrolls to first invalid field via `data-field="<name>"`.
- **Form field order** (recently re-ordered, commit `a883d82`): Supplier first → Farm/Department near the end.
- **Supplier picker**: 4–5 favourites pinned, then alphabetical; X clear button; live filter by substring.
- **CSV export** (`exportToExcel`) writes a UTF-8 BOM CSV named `PO_Orders_<YYYY-MM-DD>.csv`.

---

## 10. Auth model

- 5-digit numeric code, plain comparison against the `Users` lookup (or hardcoded fallback).
- No JWT, no session — `currentUser` lives in `localStorage`.
- "Forgot code" sends the code by email via `MailApp` from the user's registered Google Workspace email. Users without an email get a "contact management" message.
- `role` is one of `user`, `management`, `finance`. Management/finance can see the **All Orders** screen; regular users only see their own.

---

## 11. Conventions for future changes

When you (Claude) edit this app, please:

1. **Keep it single-file**: don't add a build step or split `index.html` into modules. The trade-off (fewer features for zero-tooling deployability) is intentional.
2. **Preserve offline-first**: any new write path must update local cache + `OfflineQueue` before/instead of awaiting the API.
3. **Bump `CACHE_NAME`** in `sw.js` on every functional change so users get the update.
4. **Don't force reload** in the service worker — updates land silently on next open.
5. **Maintain hardcoded fallbacks** (`users`, `itemDatabase`, `defaultSuppliers`, `farms`, `departments`) when adding new lookup categories — the app must still function if Google Sheets is unreachable or empty.
6. **Use `data-step="N"` and `data-field="<name>"`** on new form fields to keep auto-scroll and validation working.
7. **PO number format** is `XX-NNNN` (initials, dash, 4-digit zero-padded). Don't change this without a migration plan — older POs in the sheet rely on it.
8. **Date formatting**: always `Africa/Johannesburg` timezone with `en-ZA` locale.
9. **Don't store secrets** in `index.html` — the API URL is the only "secret" and it's a public Apps Script endpoint by design.
10. **Sheet column order is load-bearing**: `addOrder` and `updateOrder` write positionally to columns A–N. Adding a column means updating both functions in `google-apps-script-lookups.js` *and* the read mapping in `getOrders()`.

---

## 12. Recent history (top of `git log`)

- `0a46bee` Silent background update on app open, no forced reload
- `6ec2163` Fix PWA caching so app updates reach users automatically
- `52588e6` Fix Petrus Swart supplier name to include PS suffix
- `dee02c1` Add Overberg Agri to favorite suppliers list
- `850ef9a` Add X clear button to supplier search, show 4 favorites first
- `29a7396` Show cached orders instantly, only auto-refresh after 6 hours
- `a883d82` Reorder form fields: Supplier first, Farm/Dept near end
- `2168dd2` / `35772d0` Update Apps Script API URL to new deployment
- `c9c1711` / `a4d931f` Add Users, Farms, Departments to lookup caching

---

## 13. Quick answers to common questions

- **"How do I add a new tractor/vehicle/equipment item?"** Add a row in the relevant Google Sheet (`Tractors` / `Vehicles` / `Equipment`) with `Active = Yes`. Users will see it after the next lookup refresh (next app open online). Or add it to `itemDatabase` in `index.html` as a permanent fallback.
- **"How do I add a new user?"** Add a row to the `Users` sheet, *and* mirror it into the hardcoded `users` array in `index.html` so login works offline-first.
- **"How do I deploy a new version?"** Edit `index.html` / `sw.js`, **bump `CACHE_NAME`** in `sw.js`, push to the static host. Users get it silently on next app open.
- **"Where is the API URL?"** `index.html`, search for `const API_URL =`. To rotate it, redeploy the Apps Script with a new deployment ID and update this constant.
- **"How do I roll back?"** Restore the previous `index.html` and **bump `CACHE_NAME`** so service workers don't keep serving the broken version from cache.
