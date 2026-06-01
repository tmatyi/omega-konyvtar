# Omega Könyvtár — Comprehensive Technical Overview

**Version:** 0.9.0  
**Last Updated:** 2026-06-01  
**Purpose:** Complete system documentation for AI assistant synchronization and session continuity.

> **New in this version:** Staging environment setup (`VITE_APP_ENV=staging`). See Section 16.

> **How to use this file:** When starting a new AI session, read this file first. It contains the complete project state, architecture, ongoing work, and all decisions made. When making changes, update this file at the end of the session.

---

## 1. Project Overview

**Omega Könyvtár** is a comprehensive library and bookstore management system built with React + Firebase. It serves a Hungarian Christian community library and bookstore. The application features real-time data sync, shift-based POS, barcode scanning, book lending, guest registration, and full inventory management.

**Live URL:** https://omega-konyvtar.web.app  
**GitHub:** https://github.com/tmatyi/omega-konyvtar (private)  
**Firebase Project:** `kpregisztracio-6fb9d`  
**Staging URL:** https://teszt.omegakonyvek.hu (deploy: `npm run deploy:staging`)  
**Firebase Hosting targets:** `prod` (omega-konyvtar), `staging` (omega-konyvtar-staging)  
**Deployment:** Firebase Hosting (`npm run deploy:prod` for production, `npm run deploy:staging` for staging)

---

## 2. Current Version History

| Version | Date | Key Changes |
|---------|------|-------------|
| v0.9.0 | 2026-06-01 | Staging environment (VITE_APP_ENV, dual hosting, dbRef prefix, PWA separation), POSOverlay quick-sale, inline title editing, modal positioning fix |
| v0.8.3 | 2026-03-11 | Library categorization dropdown in edit, Kategória/Kiadó filters, Hungarian ABC sort, removed "Levonjuk a kasszából" from bookstore |
| v0.8.1 | 2026-03-07 | Density mode (10 cards/row), density icon images, enhanced shift printing |
| v0.8.0 | 2026-03-05 | Guest registration system, barcode scanner, mobile bottom bar, PWA |
| v0.7.1 | 2026-02-26 | Kassza daily balance/close, extra transactions, stock purchase deduction, lending scanner, sellerName tracking |
| v0.7.0 | 2026-02-20 | iOS PWA fixes, barcode scanner upgrade, Bolt table layout fix |
| v0.6.0 | 2026-02-15 | Major refactoring: extract components and custom hooks |
| v0.5.x | 2026-02-10 | Kassza (POS) implementation series |
| v0.4.x | 2026-02-05 | Gift inventory, modern table view, role-based access |
| v0.3.x | 2026-02-01 | Mode switcher, sidebar, Firebase integration, scraping |
| v0.2.x | 2026-01-25 | Firebase auth, book management, profile system |
| v0.1.x | 2026-01-20 | Initial setup, basic features |

---

## 3. Application Architecture

### 3.1 Tech Stack

- **Frontend:** React 18, Vite 5, vanilla CSS3
- **Backend/Database:** Firebase Authentication, Firebase Realtime Database
- **Hosting:** Firebase Hosting + Netlify (dual deployment)
- **PWA:** Vite PWA plugin with Workbox service worker
- **Barcode Scanning:** `@yudiel/react-qr-scanner` (camera-based QR/barcode)
- **Date Picker:** `react-datepicker` with `date-fns` Hungarian locale
- **Background Sync (PWA):** Workbox (`workbox-window`)

### 3.2 Folder Structure

```
omega-konyvtar/
├── index.html                       # Vite HTML entry
├── vite.config.js                   # Vite config + PWA plugin
├── package.json                     # Dependencies & scripts
├── firebase.json                    # Firebase Hosting config
├── public/                          # Static assets + grid icons
├── functions/
│   └── index.js                     # Firebase Cloud Functions (CORS proxy)
├── src/
│   ├── main.jsx                     # React entry point
│   ├── App.jsx                      # Central orchestrator, routing, filtering
│   ├── App.css                      # Global styles
│   ├── firebase.js                  # Firebase config + exports
│   ├── Login.jsx                    # Login/Register/Forgot Password
│   ├── Login.css
│   ├── Profile.jsx                  # User profile management
│   ├── Profile.css
│   ├── Sidebar.jsx                  # Desktop sidebar + mobile bottom bar
│   ├── Sidebar.css
│   ├── GuestRegister.jsx            # Guest registration flow
│   ├── GuestRegister.css
│   ├── hooks/
│   │   ├── useAuth.js              # Auth state + login/register/logout
│   │   └── useDatabase.js          # Real-time Firebase listeners
│   ├── services/
│   │   ├── firebaseService.js      # CRUD operations (books, gifts)
│   │   └── scrapingService.js      # Book data scraping (CLC, Bookline, Moly)
│   └── components/
│       ├── AddBookModal.jsx         # Book creation modal (with URL scraping)
│       ├── BookDetailModal.jsx      # Book details + edit + delete
│       ├── BooksTable.jsx           # Table view for books
│       ├── BooksTable.css
│       ├── BarcodeScanner.jsx       # Camera-based barcode/QR scanner
│       ├── BarcodeScanner.css
│       ├── LendingPanel.jsx         # Book lending management
│       ├── LendingPanel.css
│       ├── KasszaPanel.jsx          # POS / cash register system
│       ├── KasszaPanel.css
│       ├── POSOverlay.jsx           # Quicksale POS overlay (NEW)
│       ├── POSOverlay.css
│       ├── GiftsPanel.jsx           # Gift shop inventory
│       └── UsersPanel.jsx           # Admin user management
```

### 3.3 Component Hierarchy

```
App.jsx (Root — auth check, state, routing)
├── Login.jsx (unauthenticated)
├── Sidebar.jsx (desktop sidebar + mobile bottom nav)
├── App-header + filters (conditional per tab)
│   ├── Keresés (text input)
│   ├── Szűrők (Kategória/Kiadó or Műfaj/Szerző)
│   └── Rendezés (Cím/Ár/Dátum)
├── Books Table / Cards (for Könyvtár / Bolt tabs)
├── LendingPanel.jsx (Kölcsönzés tab)
├── KasszaPanel.jsx (Kassza tab — POS system)
│   └── POSOverlay.jsx (quick-sale overlay — NEW)
├── GiftsPanel.jsx (Ajándékok tab)
├── UsersPanel.jsx (Felhasználók tab — admin only)
├── Profile.jsx (Profil tab)
├── AddBookModal.jsx (modal, shown conditionally)
└── BookDetailModal.jsx (modal, shown on card click)
```

---

## 4. Data Flow & State Management

```
Firebase Realtime Database
    ↓ (onValue listeners)
useDatabase Hook → { books, gifts, users, loans }
    ↓ (props drilling)
App.jsx State → filters, sorting, tabs, modals
    ↓ (props drilling)
Panel Components → UI rendering
    ↓ (user actions → firebaseService.js calls)
firebaseService.js → CRUD to Firebase
    ↓ (real-time listener fires)
useDatabase Hook re-renders with updated data
```

### 4.1 Custom Hooks

**`useAuth()`** returns `{ user, loading, handleLogin, handleRegister, handleForgotPassword, handleLogout, handleProfileUpdate }`
- Listens to `onAuthStateChanged`
- Loads user profile from Firebase Realtime Database `users/{uid}` node
- Merges auth data with DB profile (name, role, phone, address, bio, photoURL)

**`useDatabase()`** returns `{ books, gifts, users, loans }`
- Establishes 4 real-time `onValue` listeners
- Transforms Firebase objects into arrays with `id` field
- Books include all categories (Könyvtár, Bolt, Ajándék)
- **NOTE:** `sales`, `shifts`, `extraTransactions`, `pendingGuests` are NOT fetched here — they are managed locally inside `KasszaPanel.jsx` and `UsersPanel.jsx`

### 4.2 Authentication

- **Type:** Email/Password (Firebase Auth)
- **Persistence:** `browserLocalPersistence` (survives browser restart)
- **User roles:** `admin`, `owner`, `member`, `guest` (stored in Firebase DB `users/{uid}/role`)
- **Access control:** Enforced in UI (component visibility), NOT enforced in Firebase Realtime Database rules yet
- **Admin email:** `takacsmatyas77@gmail.com`

### 4.3 Role-Based Access

| Feature | Admin | Owner (Szolgáló) | Member (Tag) | Guest |
|---------|-------|-------------------|--------------|-------|
| View books/gifts | ✅ | ✅ | ✅ | ✅ (read-only) |
| Add/Edit/Delete books | ✅ | ❌ | ❌ | ❌ |
| Lending (all) | ✅ | ✅ | ❌ | ❌ |
| Kassza (POS) | ✅ | ✅ | ❌ | ❌ |
| User management | ✅ | ❌ | ❌ | ❌ |
| Shift management | ✅ | ✅ | ❌ | ❌ |
| Gift management | ✅ | ❌ | ❌ | ❌ |
| Guest approval | ✅ | ❌ | ❌ | ❌ |

### 4.4 Tab Routing

The `activeTab` state controls which panel renders:
- `books` → Könyvesbolt (category: "Bolt")
- `library` → Könyvtár (category: "Könyvtár")
- `gifts` → Ajándékbolt
- `kassza` → POS system
- `lending` → Könyvtári Kölcsönzés
- `users` → Felhasználók kezelése (admin only)
- `profile` → Profil

**Mode switcher** (Könyvtár/Bolt) controls which tabs are visible in the sidebar. Tabs unavailable in the current mode are hidden.

---

## 5. Firebase Database Schema

### 5.1 Primary Nodes

**books/**
```json
{
  "[bookId]": {
    "title": "string",
    "author": "string",
    "year": "string",
    "description": "string",
    "isbn": "string",
    "thumbnail": "string (URL or base64 data-URI)",
    "category": "Könyvtár | Bolt | Ajándék",
    "originalTitle": "string",
    "pageCount": "string",
    "publisher": "string",
    "createdAt": "ISO timestamp",
    "addedBy": "email",
    "updatedAt": "ISO timestamp (optional)",
    // Library only:
    "kategoria": "BIB | TEO | TAN | KER | IMA | LEL | CSG | HAP | SZV | MIS | ELB | REG | GYK",
    "sorszam": "BIB-001",
    // Bookstore only:
    "genre": "string",
    "quantity": "number",
    "price": "number",
    "purchasePrice": "number",
    "status": "Raktáron | Nincs raktáron"
  }
}
```

**loans/** — Book lending records
```json
{
  "[loanId]": {
    "bookId": "string",
    "bookTitle": "string",
    "bookAuthor": "string",
    "userId": "string",
    "userName": "string",
    "userEmail": "string",
    "memberCode": "string",
    "loanDate": "ISO timestamp",
    "dueDate": "ISO timestamp",
    "status": "active | returned",
    "returnDate": "ISO timestamp | null",
    "renewals": "number"
  }
}
```

**shifts/** — Cashier shifts
```json
{
  "[shiftId]": {
    "status": "open | closed",
    "date": "YYYY-MM-DD",
    "openedAt": "ISO timestamp",
    "closedAt": "ISO timestamp | null",
    "openingBalance": "number",
    "actualBalance": "number | null",
    "expectedBalance": "number | null",
    "discrepancy": "number | null",
    "salesTotal": "number | null",
    "extraIncome": "number | null",
    "extraExpense": "number | null",
    "staffOnDuty": ["string"],
    "openedBy": "email",
    "openedByName": "string",
    "closedBy": "email | null",
    "closedByName": "string | null"
  }
}
```

**sales/** — Sales transactions
```json
{
  "[saleId]": {
    "itemType": "book | gift",
    "itemId": "string",
    "itemName": "string",
    "quantity": "number",
    "price": "number",
    "totalAmount": "number",
    "paymentMethod": "cash | card | transfer",
    "shiftId": "string (optional — for POS overlay sales)",
    "timestamp": "ISO timestamp",
    "seller": "email",
    "sellerName": "string"
  }
}
```

**extraTransactions/** — Manual cash adjustments
```json
{
  "[transactionId]": {
    "type": "income | expense",
    "amount": "number",
    "description": "string",
    "timestamp": "ISO timestamp",
    "shiftId": "string",
    "recordedBy": "email",
    "sellerName": "string"
  }
}
```

**gifts/** — Gift shop items
```json
{
  "[giftId]": {
    "name": "string",
    "quantity": "number",
    "price": "number",
    "purchasePrice": "number",
    "barcode": "string",
    "image": "string (base64 or URL)",
    "status": "string",
    "createdAt": "ISO timestamp",
    "addedBy": "email",
    "recommendedStock": "number | null"
  }
}
```

**users/**
```json
{
  "[uid]": {
    "uid": "string (optional, same as key)",
    "email": "string",
    "displayName": "string",
    "name": "string (deprecated, use displayName)",
    "phone": "string",
    "address": "string",
    "bio": "string",
    "role": "admin | owner | member | guest",
    "photoURL": "string | null",
    "createdAt": "ISO timestamp",
    "lastLogin": "ISO timestamp"
  }
}
```

**pendingGuests/** — Guest registration queue
```json
{
  "[requestId]": {
    "name": "string",
    "email": "string",
    "registeredAt": "ISO timestamp",
    "status": "pending | approved | rejected",
    "approvedBy": "email | null",
    "approvedAt": "ISO timestamp | null",
    "tempPassword": "string | null",
    "rejectedBy": "email | null",
    "rejectedAt": "ISO timestamp | null"
  }
}
```

**preRegisteredUsers/** — Post-approval user entries
```json
{
  "[entryId]": {
    "name": "string",
    "email": "string",
    "tempPassword": "string",
    "role": "member",
    "approvedBy": "email",
    "approvedAt": "ISO timestamp",
    "status": "ready"
  }
}
```

---

## 6. Detailed Module Documentation

### 6.1 App.jsx — Central Orchestrator

**Key state management:**
- `activeTab` — current navigation tab (persisted in localStorage)
- `activeMode` — "könyvtár" or "bolt" mode (persisted in localStorage)
- `filterText`, `filterGenre`, `filterAuthor`, `filterCategory`, `filterPublisher` — filtering
- `showFilters` — filter visibility
- `cardDensity` — cards per row (4, 7, or 10); only used on library tab
- `sortBy`, `sortOrder` — sorting configuration
- `selectedBook`, `showBookDetail` — detail modal state

**Book filtering logic:**
- All books shown are filtered by `category` matching the active tab
- Library tab ("Könyvtár"): filters by `kategoria` (BIB, TEO, etc.) and `publisher`
- Bolt tab ("Bolt"): filters by `genre` and `author`
- Text search across title, author, description
- Hungarian locale-aware sorting for titles (A-Z/Z-A)

### 6.2 KasszaPanel.jsx — POS System (2400+ lines)

**This is the most complex component.** It manages:
- **Shifts:** opening/closing with balance tracking
- **Sales:** create, edit, delete with stock management
- **Extra transactions:** manual income/expense entries per shift
- **Shift history:** expandable rows, per-shift printing, cascade deletion
- **Barcode scanning:** find books by ISBN, gifts by barcode
- **POS Overlay:** quick-sale FAB with cart system (new in uncommitted changes)

**Key workflows:**

1. **Open Shift:** Select staff, enter opening balance → creates `shifts/{id}` with `status: "open"`
2. **Record Sale:** Search/scan product → set quantity/price/payment → decrements stock, creates `sales/{id}`
3. **Close Shift:** Enter actual closing balance → calculates discrepancy → sets shift closed
4. **Edit/Delete Sale:** Only if sale is within the current open shift; past-shift sales are read-only ("Lezárt műszak")
5. **Delete Shift:** Type "JÓVÁHAGY" to confirm cascade deletion of shift + all associated sales + extra transactions

**State variables loaded locally (not from useDatabase):**
- `sales` — from Firebase `sales/` node
- `shifts` — from Firebase `shifts/` node
- `extraTransactions` — from Firebase `extraTransactions/` node

### 6.3 POSOverlay.jsx — Quick-Sale Overlay (NEW, UNCOMMITTED)

A modern quick-sale interface with:
- **Search bar** — real-time filtering of books and gifts
- **Quick buttons grid** — top 12 most sold items (by sales history)
- **Cart system** — bottom sheet with quantity controls
- **Payment flow** — enter received amount, calculate change
- **Barcode scanning** — scan ISBN to add to cart
- **Stock validation** — checks availability before finalizing
- **Shift-linked sales** — all sales tagged with `shiftId`

**FAB button** appears only when shift is open (positioned fixed, top-right).

**Dependency:** `BarcodeScanner.jsx` (shared component)

### 6.4 LendingPanel.jsx — Book Lending

- **Book search** with barcode scanning support
- **User search** (name/email) to identify borrower
- **Loan period:** 2/4/6/8 weeks (default 4), starting from next Sunday
- **Active loans list** with expandable details (overdue highlight)
- **Return book** with timestamp
- **Renewal** via DatePicker (Hungarian locale)
- **Toast notifications** for success/error feedback
- Loans only apply to library books (`category: "Könyvtár"`)

### 6.5 GiftsPanel.jsx — Gift Inventory

- Table view (desktop) + compact expandable rows (mobile)
- Add/Edit/Delete gifts (admin only)
- **Fields:** name, quantity, price, purchasePrice, barcode, image
- **Bonus stock tracking:** `recommendedStock` field → color-coded status:
  - Below recommended → "Töltés szükséges" (red)
  - At recommended → "Fogyóban" (warning)
  - Above recommended → "Készleten" (green)
- **Deduct from cashier** toggle: creates an `extraTransactions` expense when enabled
- **Barcode field** for integration with POS scanner

### 6.6 BookDetailModal.jsx — Book Detail & Edit

- View mode (read-only) / Edit mode (all fields editable)
- Library books: category dropdown (13 categories), auto-generated Sorszám
- Bookstore books: quantity, price, purchasePrice fields
- Thumbnail upload (JPG/PNG only, max 5MB, resized to 400x600)
- Delete with confirmation

### 6.7 AddBookModal.jsx — Book Creation

- **URL scraping:** Enter CLC Hungary, Bookline.hu, or Moly.hu URL → auto-fill fields
- **Manual entry:** All fields (title, author, year, genre, description, ISBN, etc.)
- **Category-specific fields:**
  - Library: Kategória dropdown (13 options) → auto-generates Sorszám
  - Bookstore: quantity, purchasePrice, price
- **Thumbnail upload:** JPG/PNG only, max 5MB, auto-resized

### 6.8 UsersPanel.jsx — Admin User Management

- **User list** with search, role filters (Összes/Admin/Szolgáló/Tag)
- **User detail modal** with inline editing (name, email, role, phone, address)
- **Delete user** with confirmation (cannot delete self, restrictions per role)
- **Guest approval:** Pending requests list with password setup for each approved guest
- **Reject guest** with status tracking

### 6.9 scrapingService.js — Book Data Extraction

**Supported sources and proxy strategies:**
1. **Firebase Cloud Function** (`corsProxy`) — own server-side, most reliable
2. **api.allorigins.win** JSON API fallback
3. **corsproxy.io** fallback

**Sources:**
- **CLC Hungary** (`clchungary.com`): title, author, publisher, description, ISBN, thumbnail, year, originalTitle, pageCount
- **Bookline.hu**: title, author, publisher, description, ISBN, thumbnail, year
- **Moly.hu**: both `/konyvek/` and `/kiadasok/` pages — title, author, publisher, year, pageCount, ISBN, thumbnail, description
- **Open Library**: API-based extraction (fallback, not commonly used)
- **Goodreads**: proxy-based extraction (legacy, may be unreliable)
- **Amazon**: proxy-based extraction (legacy, may be unreliable)

### 6.10 BarcodeScanner.jsx — Camera Scanner

- Uses `@yudiel/react-qr-scanner` (QR + barcode detection)
- Supported formats: QR, EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39
- **Beep** (Web Audio API) + **vibrate** (Haptic API) on successful scan
- Prevents double-scan with `hasScanned` ref
- **Error handling:** camera permission denied, not found, generic errors (Hungarian messages)

---

## 7. Library Categorization System (v0.8.2+)

### 7.1 The 13 Categories

```
1. Biblia és teológia
   BIB - Biblia, kommentárok, tanulmányozás
   TEO - Isten, Jézus, Szent Szellem, alapvető teológia
   TAN - Hit, kegyelem, gyógyulás, végidők, tanítások

2. Keresztyén élet
   KER - Keresztény élet, növekedés
   IMA - Ima, böjt, dicsőítés
   LEL - Lelkigondozás, belső gyógyulás

3. Kapcsolatok
   CSG - Család, gyermeknevelés
   HAP - Házasság, párkapcsolat

4. Szolgálat
   SZV - Szolgálat, gyülekezet, vezetés
   MIS - Misszió, evangelizáció

5. Életrajz és irodalom
   ELB - Életrajzok, bizonyságok
   REG - Regények
   GYK - Gyermekkönyvek
```

**Sorszám format:** `[CATEGORY]-[NNN]` (e.g., `BIB-001`, `TEO-042`)
- Auto-generated on category selection
- Finds highest existing number in category, increments by 1
- Gaps are preserved (deleted books don't reuse numbers)

### 7.2 Filtering by Tab

| Tab | Category filter | Additional filters | Sort options |
|-----|----------------|-------------------|--------------|
| Könyvtár | `category: "Könyvtár"` | Kategória, Kiadó | Cím, Legújabb |
| Könyvesbolt | `category: "Bolt"` | Műfaj, Szerző | Cím, Ár, Legújabb |
| Ajándékbolt | `category: "Ajándék"` | (no category filter) | Név, Ár, Új/Legrégebbi |

---

## 8. PWA Configuration

- **Strategy:** `generateSW` (Workbox)
- **Registration:** `autoUpdate` (`skipWaiting: true`, `clientsClaim: true`)
- **Cache:**
  - Firebase Storage: CacheFirst, 1 year
  - Firebase Database: NetworkFirst, 1 week, 3s timeout
- **Manifest:** name "Omega Könyvtár", short_name "Omega", theme `#844a59`, standalone display, portrait orientation
- **Service worker:** disabled in dev mode (`devOptions.enabled: false`)

---

## 9. v0.9.0 Features (Committed 2026-06-01)

### 9.1 POSOverlay — Quick-Sale Overlay (`src/components/POSOverlay.jsx`, ~630 lines)
Full-screen overlay for fast POS sales: search bar, top-12 quick buttons grid (by sales history), cart bottom sheet with quantity controls (−/+/🗑️), payment flow (amount received → change calculation), stock validation, barcode scanning via shared BarcodeScanner component, Escape to close, shift-linked sales.

### 9.2 KasszaPanel Restructure (`src/components/KasszaPanel.jsx`)
- Replaced single "Új Eladás" button with two inline buttons: "Szkennelés" and "Manuális"
- Green FAB button (top-right, 60x60px) when shift is open → launches POSOverlay
- `<POSOverlay>` integration with `onSaleComplete` callback

### 9.3 KasszaPanel.css Modal Fix
Modal positioning changed from flexbox centering to `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%)` — fixes header disappearing on tall modals.

### 9.4 BookDetailModal — Inline Title Editing
In edit mode, the book title renders as an editable `<input>` (24px, 700 weight, bordered) instead of a read-only `<h2>`.

### 9.5 Staging Environment (see Section 15)
- `dbRef()` wrapper for path prefixing (`staging/` vs root)
- Dual Firebase Hosting targets (prod + staging)
- Env-aware PWA config (separate cacheIds, manifest names)
- `VITE_APP_ENV=staging` build mode
- Clone script pattern: `firebase database:get /$node` → `firebase database:set /staging/$node`

---

## 10. Deployment

```bash
# Local development
npm run dev              # Vite dev server → localhost:5173 (uses production mode)

# Production build & deploy
npm run deploy:prod      # builds with VITE_APP_ENV=production → deploys to hosting:prod
                         # → https://omega-konyvtar.web.app / https://omegakonyvek.hu

# Staging build & deploy
npm run deploy:staging   # builds with VITE_APP_ENV=staging → deploys to hosting:staging
                         # → https://teszt.omegakonyvek.hu

# Individual steps
npm run build:prod       # VITE_APP_ENV=production vite build
npm run build:staging    # VITE_APP_ENV=staging vite build
```

**Live URL:** https://omega-konyvtar.web.app  
**Staging URL:** https://teszt.omegakonyvek.hu  
**Firebase Console:** https://console.firebase.google.com/project/kpregisztracio-6fb9d

**Build timestamp:** Vite injects `__BUILD_TIMESTAMP__` at build time, shown in sidebar as "Frissítve: ..."

---

## 11. Book Scraping URL Patterns

| Source | URL Pattern | Data Extracted |
|--------|-------------|----------------|
| CLC Hungary | `https://www.clchungary.com/termek/...` | Title, author, year, ISBN, description, thumbnail, publisher, originalTitle, pageCount |
| Bookline.hu | `https://www.bookline.hu/product/...` | Title, author, year, ISBN, description, thumbnail, publisher |
| Moly.hu (book) | `https://moly.hu/konyvek/...` | Title, author, publisher, description, thumbnail, ISBN |
| Moly.hu (edition) | `https://moly.hu/kiadasok/...` | Title, author, publisher, year, pageCount, ISBN, thumbnail, description |

---

## 12. Known Issues & Technical Debt

### Issues
1. `useDatabase.js` does NOT fetch `sales`, `shifts`, `extraTransactions` — these are fetched separately in KasszaPanel, creating inconsistency and duplication
2. No Firebase Realtime Database security rules — all data access is UI-enforced only
3. Guest approval workflow creates `preRegisteredUsers` but doesn't auto-create Firebase Auth users (manual step required)
4. `sortBy` state in App.jsx has both `sortBy`, `sortField`, and `sortOrder` — some redundancy/confusion
5. POSOverlay uses `alert()` for success messages instead of the toast system
6. Some components use `console.warn`/`console.log` for debug logging that should be removed in production

### Technical Debt
- **No unit tests** — entire codebase untested
- **No TypeScript** — plain JSX throughout
- **No error boundaries** — crashes may leave UI in broken state
- **Bundle size** — no code splitting (single bundle)
- **Accessibility** — missing ARIA labels, keyboard navigation incomplete
- **Components too large** — KasszaPanel.jsx is 2700+ lines, should be refactored
- **Duplicate thumbnail processing** — same logic in AddBookModal and BookDetailModal
- **No loading states** for some Firebase operations
- **Offline support** limited — PWA caches some assets but no offline data queue

---

## 13. Development Workflow

```bash
# Create a feature branch
git checkout -b feature/description

# After changes
git add .
git commit -m "v0.9.x: Description of changes"
git tag v0.9.x
git push origin main
git push origin v0.9.x
```

**Commit message convention:** `vX.Y.Z: Description`

---

## 14. Session Continuity Instructions

When starting a new AI session:
1. **Read this file first** — it contains all project context
2. Check `git status` for uncommitted changes
3. Check the `/Users/tmatyi/.claude/projects/-Users-tmatyi-CascadeProjects-hello-world-app/memory/` directory for user preferences and feedback
4. To run the app: `npm run dev`
5. When making any significant changes, update this file at the end of the session

---

## 15. Staging Environment (v0.8.3+)

The app supports a staging environment at `teszt.omegakonyvek.hu` for testing changes before production deployment.

### 15.1 Architecture

- **Single Firebase project** (`kpregisztracio-6fb9d`), **single RTDB**
- **Data isolation via path prefix**: staging data lives under `staging/` (e.g., `staging/books/`, `staging/sales/`)
- **Build-time env var**: `VITE_APP_ENV=staging` vs `VITE_APP_ENV=production`
- **Separate Firebase Hosting targets**: `prod` on `omega-konyvtar` site, `staging` on `omega-konyvtar-staging` site
- **Separate PWA caches**: `omega-konyvtar-staging` cacheId, separate runtime cache names
- **Firebase Auth is shared** — same login credentials work on both environments

### 15.2 Database Prefix Mechanism

Central helper in `src/firebase.js`:

```js
export function dbPrefix() {
  return isStaging ? "staging/" : "";
}

export function dbRef(db, path) {
  return ref(db, dbPrefix() + path);
}
```

All 12 files that read/write to the RTDB use `dbRef()` instead of raw `ref()`. This includes:
- `/services/firebaseService.js` (7 refs — books, gifts CRUD)
- `/hooks/useDatabase.js` (4 refs — books, gifts, users, loans)
- `/hooks/useAuth.js` (3 refs — user profiles)
- `/components/KasszaPanel.jsx` (15 refs — sales, shifts, extraTransactions)
- `/components/POSOverlay.jsx` (1 ref — sales)
- `/components/LendingPanel.jsx` (3 refs — loans)
- `/components/GiftsPanel.jsx` (1 ref — extraTransactions)
- `/components/AddBookModal.jsx` (1 ref — sorszám generation)
- `/components/BookDetailModal.jsx` (1 ref — sorszám generation)
- `/components/UsersPanel.jsx` (6 refs — users, pendingGuests, preRegisteredUsers)
- `/GuestRegister.jsx` (1 ref — pendingGuests)
- `/Profile.jsx` (2 refs — user profile)

### 15.3 Hosting Targets

One-time CLI setup:
```bash
firebase target:apply hosting prod omega-konyvtar
firebase target:apply hosting staging omega-konyvtar-staging
```

Configured in `.firebaserc`:
```json
"targets": {
  "kpregisztracio-6fb9d": {
    "hosting": {
      "prod": ["omega-konyvtar"],
      "staging": ["omega-konyvtar-staging"]
    }
  }
}
```

### 15.4 PWA Config Differences (vite.config.js)

| Setting | Production | Staging |
|---------|-----------|---------|
| Manifest name | "Omega Könyvtár" | "Omega Könyvtár (Teszt)" |
| Short name | "Omega" | "Omega-Teszt" |
| Description | "Digitális Könyvtárad" | "TESZT - Digitális Könyvtárad" |
| Cache ID | `omega-konyvtar-v1` | `omega-konyvtar-staging` |
| Firebase Storage cache | `firebase-storage` | `firebase-storage-staging` |
| Firebase DB cache | `firebase-database` | `firebase-database-staging` |

### 15.5 Git Workflow

```
feature branch → merge to staging → deploy:staging → test on teszt.omegakonyvek.hu → merge to main → deploy:prod
```

### 15.6 Data Cloning

For populating staging with production data, use a local script with Firebase Admin SDK to read from root nodes and write under `staging/` prefix. Not needed for initial setup.

---

## 16. Future Ideas (from IDEAS.md)

- **Phase 1 (v0.9.x):** Gesture navigation, voice search, haptic feedback, enhanced offline, push notifications
- **Phase 2 (v1.0.x):** AI book intelligence (ISBN/cover recognition, auto-categorization)
- **Phase 3 (v1.1.x):** Community ecosystem (reading circles, reviews, challenges)
- **Phase 4 (v1.2.x):** Business intelligence dashboard, predictive analytics

---

**Document Version:** 3.0  
**Generated:** 2026-05-29  
**Purpose:** Complete AI assistant synchronization for session continuity
