# Omega Könyvtár — Comprehensive Technical Overview

**Version:** 0.12.5  
**Last Updated:** 2026-06-12  
**Purpose:** Complete system documentation for AI assistant synchronization and session continuity.

> **New in this version:** **deleteUserAccount Cloud Function** — deleting a user now removes both the RTDB record AND the Firebase Auth account (Admin SDK `deleteUser`), fixing the re-invite bug where deleted users got "email már regisztrálva". **SMTP config fix** — from name "Omega Könyvtár" → "Omega Könyvek" in `functions:config`. **AcceptInvite icon centering** — success/error icons now `display: flex; justify-content: center`.

> **Previously (v0.12.4):** **Inline editing for User & Profile panels** — name/email/role become editable in-place with dashed-underline affordance, same position, no layout jump. **Invite email redesign** — Cloud Function HTML template rebranded from burgundy to blue (header banner, Ghost White card, Periwinkle divider). **Delete modal restyled** — now uses the same blur overlay + centered card pattern as the user detail modal. **Loading screen centered** — spinner now vertically/horizontally centered on all screen sizes. **Profile editing fixed** — szolgálók can now actually edit their name/email with inline inputs. **AcceptInvite page rebrand** — "Omega Könyvtár" → "Omega Könyvek".

> **Previously (v0.12.3):** **Skeleton loading screens** — animated shimmer placeholders for all 7 tabs during Firebase data loading. **Invite validation** — prevents inviting already-registered users or sending duplicate pending invites. **UI polish** — avatar border cleanup, user card centering, sidebar CSS scoping fix, phone/address fields removed from both UsersPanel and Profile, self-edit allowed for admins, login page rebranded to "Omega Könyvek", browser tab title + blue omega favicon, modal X buttons removed.

> **Previously (v0.12.1):** **Card/cash payment separation** — `expectedBalance` now cash-only (`openingBalance + cashTotal + extras`), card payments displayed separately everywhere. POSOverlay gets cash/card payment toggle. Shift objects store `cashTotal`/`cardTotal`/`transferTotal`. Balance display, close modal, Napló cards/table/print all show cash/card breakdown. Backward-compatible with old shifts.

> **Previously (v0.12.0):** **Complete rebrand** — burgundy/wine theme (`#844a59`) replaced with blue palette (Ocean Twilight `#3741A8` / `#424EB5` / `#3A41A7`, Ghost White `#F6F8FD`, Periwinkle `#C2C7E6`). CSS custom properties (`--color-*`) on `:root` for future-proof theme management. All 7 inconsistent dark burgundy variants unified. Indigo/purple stat accents absorbed into blue. PWA manifest updated. **All emoji icons (~100+) replaced with Lucide React SVG icons** across 14 source files — professional, consistent cross-platform rendering. See Section 19.

> **Previously (v0.10.0):** Role system redesign (adminisztrátor/szolgáló), admin invite flow, Cloud Function email, bug fixes (sort state, alert→toast, debug cleanup, DB listener consolidation), **RTDB security rules (`database.rules.json`)**, **invite hardening (validateInvite/acceptInvite CFs)**, **dbPrefix bypass fix (4 ref→dbRef)**, **invite revoke**, **delete modal fix (missing .show class + z-index)**.

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
| v0.12.5 | 2026-06-12 | **User deletion fix:** `deleteUserAccount` CF deletes both Auth + RTDB. SMTP from name "Omega Könyvek". AcceptInvite icon centering. |
| v0.12.4 | 2026-06-11 | **Inline editing + invite email rebrand + UI fixes:** dashed-underline editing (UsersPanel + Profile), delete modal restyled, loading screen centered, Profile edit bugs fixed, AcceptInvite rebrand |
| v0.12.3 | 2026-06-10 | **Skeleton screens + UI polish + invite validation:** SkeletonUI shimmer, dataLoaded flag, invite duplicate/registered checks, avatar/phone/address cleanup, Omega Könyvek rebrand |
| v0.12.2 | 2026-06-09 | **Panel header unification:** all 7 tabs share `.panel-header`/`.panel-controls` (centered `h2` + icon, no subheader). Removed `tab-content` white card from 4 tabs. Napló anchor pills toggle (not scroll), safe-area aware. Lending stats grid (3 equal cols). Cache header fix (extglob→individual patterns, sw.js ordered last). |
| v0.12.1 | 2026-06-08 | **Card/cash payment separation:** `expectedBalance` now cash-only, card totals displayed separately everywhere, POSOverlay cash/card toggle, shift objects store `cashTotal`/`cardTotal`/`transferTotal`, backward-compatible with old shifts |
| v0.12.0 | 2026-06-07 | **Rebrand:** burgundy/wine → blue palette (Ocean Twilight, Ghost White, Periwinkle). CSS custom properties on `:root`. All dark burgundy variants unified. **Lucide React SVG icons** replace all emojis (~100+ across 14 files). PWA manifest updated. Both deployed to staging. |
| v0.11.1 | 2026-06-05 | Kassza/Napló split refinements: custom number formatting (all 4-digit numbers get separators), "Eltérés" → "Összesen" (net drawer change), auth-aware DB listeners (re-subscribe on login), useAuth profile listener memory leak fix |
| v0.11.0 | 2026-06-04 | Kassza/Napló split — POS operations separated from reporting, mobile-first card-based shift history, simplified sale cards, extracted `useToast()` hook, FAB moved to bottom-right |
| v0.10.0 | 2026-06-03 / 2026-06-04 | Role system redesign (adminisztrátor + szolgáló only), admin invite flow via Cloud Function email, removed guest registration + self-registration, 4 bug fixes (sort state, POSOverlay alert→toast, debug cleanup, DB listener consolidation), **RTDB security rules** (`database.rules.json` all nodes auth-gated), **invite hardening** (validateInvite/acceptInvite callable CFs, AcceptInvite no longer reads invites/), **dbPrefix bypass fix** (4 ref→dbRef in KasszaPanel/POSOverlay), **invite revoke** (admin can delete invites from UsersPanel), **delete modal fix** (missing .show class + z-index clash) |
| v0.9.1 | 2026-06-01 | Fixed corsProxy Cloud Function (Node fetch timeout → AbortSignal.timeout, proper CORS-on-error, distinguish 502/504) |
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
│   ├── GuestRegister.jsx            # REMOVED in v0.10.0
│   ├── AcceptInvite.jsx             # Invite acceptance page (v0.10.0)
│   ├── AcceptInvite.css
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

**Only 2 roles** (since v0.10.0): `admin` (Adminisztrátor) and `owner` (Szolgáló). Internal DB strings are `"admin"` and `"owner"`.

| Feature | Admin | Szolgáló |
|---------|:-----:|:--------:|
| View books/gifts | ✅ | ✅ |
| Add/Edit/Delete books | ✅ | ❌ |
| Add/Edit/Delete gifts | ✅ | ❌ |
| Kassza (POS) | ✅ | ✅ |
| Open/close műszak | ✅ | ✅ |
| Lending panel | ✅ | ❌ |
| User management + invites | ✅ | ❌ |
| Gift management | ✅ | ❌ |

New users can only be created via admin invite (not self-registration). See Section 17.

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

### Issues (all resolved in v0.10.0)
1. ~~Firebase Realtime Database security rules still not configured~~ ✅ Fixed — `database.rules.json` deployed with auth-gated access: all nodes require authentication, invites require admin role, `users/$uid/role` validated
2. ~~`invites/` node is publicly readable~~ ✅ Fixed — AcceptInvite now validates tokens via Cloud Functions (`validateInvite`, `acceptInvite`) instead of direct RTDB reads; invites rules are admin-only; `curl` verified `{"error":"Permission denied"}`
3. ~~Invite email sending requires SMTP config~~ ✅ Fixed — Gmail SMTP with App Password configured, staging/production URL detection works

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

## 17. v0.10.0 — Role System Redesign + Bug Fixes (2026-06-03)

### 17.1 Role System Redesign

**Only 2 roles**: `admin` (Adminisztrátor) and `owner` (Szolgáló, internal DB string unchanged). Removed: `member` (Tag), `guest` (Vendég), all guest registration infrastructure.

- **Admin**: full rights — add/edit/delete books and gifts, manage users, send invites, access lending
- **Szolgáló**: selling only — Kassza tab (open/close műszak, POS, record sales), view books/gifts

### 17.2 Admin Invite Flow

Replaces guest registration. Admin invites szolgáló via email from UsersPanel:

1. Admin enters email → writes to `invites/{pushId}`: `{email, token (crypto.randomUUID()), status: "pending"}`
2. Cloud Function `sendInviteEmail` (RTDB `onCreate` trigger) → sends email via nodemailer SMTP (Gmail) with link. The function detects staging vs production from the DB path and uses the correct base URL: `https://teszt.omegakonyvek.hu` (staging) or `https://omegakonyvek.hu` (production).
3. Staging variant: `sendInviteEmailStaging` triggers on `staging/invites/{id}`
4. Recipient clicks link → `AcceptInvite.jsx` validates token against `invites/` → fills Teljes név + Jelszó + Jelszó megerősítése → Firebase Auth user created → signs out → redirects to login
5. New user has `role: "owner"` (Szolgáló)

**New files**: `src/AcceptInvite.jsx`, `src/AcceptInvite.css`

**SMTP config** ✅ Configured (Gmail App Password):
```bash
firebase functions:config:set smtp.host="smtp.gmail.com" smtp.port="587" \
  smtp.user="omegakonyvek@gmail.com" smtp.pass="<GMAIL_APP_PASSWORD>" smtp.from="Omega Könyvtár <omegakonyvek@gmail.com>"
```
⚠️ `functions.config()` is deprecated — must migrate to the params package before March 2026 (`firebase functions:config:export`).

Without SMTP config, invites are created but email sending is skipped (status stays "pending").

### 17.3 Removed

- `GuestRegister.jsx` + `GuestRegister.css` — completely deleted
- `/register-guest` route → replaced by `/accept-invite`
- Self-registration form in `Login.jsx` — login page now has only Login + Forgot Password modes
- `handleRegister` from `useAuth.js`
- `pendingGuests/` and `preRegisteredUsers/` DB nodes (dead data, manually deletable)
- "Tag" role filter button in UsersPanel

### 17.4 Bug Fixes (from v0.9.1 known issues)

1. **Sort state redundancy** (issue #4): Removed `sortField`/`sortOrder` useState; they're now derived from `sortBy` (single source of truth). Column header clicks now work correctly.
2. **POSOverlay `alert()` → toast** (issue #5): All 6 `alert()` calls replaced with `onToast()` prop, using the existing KasszaPanel toast system.
3. **Debug console.log cleanup** (issue #6): Removed 15 debug statements from LendingPanel, Profile, UsersPanel, BookDetailModal. Kept 9 operational logs (PWA, auth, scraping proxy chain).
4. **DB listener consolidation** (issue #1): `sales`, `shifts`, `extraTransactions` moved from local KasszaPanel listeners into `useDatabase.js`. All 7 RTDB nodes now loaded centrally.

### 17.5 UsersPanel Changes

- Removed: pending guest approval UI, `handleApproveGuest`, `handleRejectGuest`
- Added: invite section with email input + "Meghívás Küldés" button + sent invites list with status badges (Függő/Elküldve/Elfogadva/Hiba)
- Role edit dropdown: 2 options (Szolgáló, Adminisztrátor)
- `canDeleteUser`: simplified (only self-delete prevented)
- `getRoleBadge`: "Adminisztrátor" / "Szolgáló" labels, unknown roles default to Szolgáló

### 17.6 Cloud Functions

`functions/index.js` now has 5 functions:
- `corsProxy` — HTTP CORS proxy for book scraping (unchanged)
- `sendInviteEmail` — RTDB `onCreate` trigger on `invites/{inviteId}` (production)
- `sendInviteEmailStaging` — RTDB `onCreate` trigger on `staging/invites/{inviteId}` (staging)
- `validateInvite` — **NEW** callable function for invite token validation (unauthenticated, Admin SDK)
- `acceptInvite` — **NEW** callable function to mark invite as accepted (requires auth, Admin SDK)

### 17.7 RTDB Security Rules (NEW — 2026-06-04)

**File:** `database.rules.json`

All data nodes now require authentication. Rules structure:

| Node | Read | Write | Notes |
|------|------|-------|-------|
| `books` | `auth != null` | `auth != null` | All authenticated users |
| `gifts` | `auth != null` | `auth != null` | All authenticated users |
| `users` | `auth != null` | `auth.uid === $uid` OR role is admin | Self-write or admin |
| `users/$uid/role` | (inherits) | `.validate`: new→"owner", admin can change | Prevents self-escalation |
| `loans` | `auth != null` | `auth != null` | All authenticated users |
| `sales` | `auth != null` | `auth != null` | All authenticated users |
| `shifts` | `auth != null` | `auth != null` | All authenticated users |
| `extraTransactions` | `auth != null` | `auth != null` | All authenticated users |
| `invites` | role is admin | role is admin | Admin only — no client write |
| `staging/*` | Same as above | Same as above | Role checks use `root.child('staging')...` |

**Key design decisions:**
- Writes to books/gifts/sales/shifts are auth-gated (not role-gated) because szolgáló needs to update stock `quantity` during sales. Field-level validation deferred.
- `invites/` is admin-only for both read and write — Cloud Functions (`validateInvite`, `acceptInvite`) use Admin SDK to bypass rules.
- `users/$uid/role` has a `.validate` rule: new users can only be created with `role: "owner"`; only admins can change existing roles. This prevents self-escalation.
- Staging paths are replicated because RTDB rules can't dynamically match path prefixes.

**Deploy:** `firebase deploy --only database`

### 17.8 Invite Hardening (NEW — 2026-06-04)

**Problem:** `AcceptInvite.jsx` previously subscribed to the entire `invites/` node via `onValue()`, downloading all invite tokens and emails to the client. Token validation was client-side by iterating the full list.

**Solution:** Two new callable Cloud Functions replace direct database access:

1. **`validateInvite(token, email)`** — Called from AcceptInvite page (unauthenticated)
   - Uses Admin SDK to search `invites/` and `staging/invites/` for matching token+email
   - Returns `{ valid, status, email }` — never exposes other invites
   
2. **`acceptInvite(token, email)`** — Called after registration (authenticated)
   - Verifies `context.auth.token.email` matches the invite email
   - Updates invite status to "accepted" via Admin SDK

**Client changes:**
- `src/firebase.js`: Added `getFunctions`/`httpsCallable` imports, `validateInvite()` and `acceptInviteCallable()` wrappers
- `src/AcceptInvite.jsx`: Replaced `onValue(invitesRef, ...)` subscription with `validateInvite()` call; replaced direct `update(inviteRef)` with `acceptInviteCallable()` call
- `src/components/UsersPanel.jsx`: Unchanged — keeps real-time `onValue` subscription (rules allow admin reads)

### 17.9 dbPrefix Bypass Bug Fix (NEW — 2026-06-04)

**Bug:** 4 instances of `ref(database, ...)` instead of `dbRef(database, ...)` in `KasszaPanel.jsx` (3 places) and `POSOverlay.jsx` (1 place) caused stock quantity updates on staging to hit production paths (`books/{id}` instead of `staging/books/{id}`).

**Fix:** Changed all 4 to `dbRef(database, ...)` — both files already imported `dbRef`.

**Affected locations:**
- `KasszaPanel.jsx`: edit sale stock adjustment, new sale stock decrease, delete sale stock restore
- `POSOverlay.jsx`: finalize sale stock update

### 17.10 Invite Revoke (NEW — 2026-06-04)

**Feature:** Admin can now delete/revoke any sent invite from the "Küldött meghívók" list in UsersPanel.

- `handleRevokeInvite(inviteId, inviteEmail)` — shows `window.confirm()` dialog, then calls `remove(dbRef(database, \`invites/${inviteId}\`))`
- Trash icon (🗑️) button on each invite item with hover style (red background)
- Works within existing `invites` security rules (admin write access)
- No Cloud Function needed — direct RTDB write by authenticated admin

## 16. Future Ideas (from IDEAS.md)

- **Phase 1 (v0.9.x):** Gesture navigation, voice search, haptic feedback, enhanced offline, push notifications
- **Phase 2 (v1.0.x):** AI book intelligence (ISBN/cover recognition, auto-categorization)
- **Phase 3 (v1.1.x):** Community ecosystem (reading circles, reviews, challenges)
- **Phase 4 (v1.2.x):** Business intelligence dashboard, predictive analytics

---

### 17.11 Delete Confirmation Modal Fix (NEW — 2026-06-04)

**Bug:** The "🗑️ Törlés" button in the user details modal appeared to do nothing.

**Root cause:** Two issues:
1. The delete confirmation used `className="modal"` — the base `.modal` CSS class defaults to invisible (`opacity: 0`, `z-index: -1`, `pointer-events: none`). Only `.modal.show` makes it visible. Fixed to `className="modal show"`.
2. The user details modal's overlay (z-index: 9999) was above the delete confirm modal (z-index: 1000), so even with `.show` it rendered behind. Fixed by closing `showUserDetails` before opening `showDeleteConfirm` (and reopening user details on cancel).

---

## 18. v0.11.0 — Kassza/Napló Split + Mobile-First Redesign (2026-06-04)

### 18.1 Overview

Split the monolithic `KasszaPanel.jsx` (2,677 lines) into two focused tabs:

- **Kassza** (💰) — Day-to-day POS operations for cashiers
- **Napló** (📋) — Historical reporting for admins/staff

Both tabs available to all authenticated users in Bolt mode (same access as before).

### 18.2 Kassza Tab (POS Only)

**File:** `src/components/KasszaPanel.jsx` (1,653 lines, down from 2,677)

**What stays:**
- Open/close shift with staff selection and balance tracking
- Real-time balance display (opening, sales, extras, expected)
- Sale recording: barcode scan, manual form, POSOverlay quick-sale
- Edit/delete sales within active shift
- Extra transactions (income/expense)
- **Today's sales only** — no date filter, no view modes
- FAB → POSOverlay moved to **bottom-right** (thumb reach on mobile)
- Status badge always visible

**What was removed/moved:**
- View mode toggle (daily/monthly/all) → Napló
- Month picker → Napló
- Shift history table → Napló
- Shift print/delete → Napló
- "Műszak Napló" button (navigate via sidebar/bottom-bar instead)

**Mobile improvements:**
- Sale cards reduced from 7 badges to a single compact line: `"12:30 · 1 db · 3,500 Ft/db · Készpénz · 3,500 Ft · Seller"`
- Edit/delete buttons are icon-only (✏️/🗑️) with 44px touch targets
- FAB at bottom-right for thumb reach
- Toast uses shared CSS classes (`.kassza-toast`)

### 18.3 Napló Tab (Reporting Only)

**New files:** `src/components/NaploPanel.jsx` (857 lines), `src/components/NaploPanel.css` (317 lines)

**Features:**
- Shift history as **cards on mobile**, table on desktop (≥769px)
- Each shift card shows: date, staff, opening balance, sales total, expected/actual, discrepancy
- Expandable to show shift sales and extra transactions
- Print individual shift reports (opens new window)
- Delete shifts with "JÓVÁHAGY" confirmation (cascade-deletes sales + extras)
- Sales history with daily/monthly/all view modes + month picker
- **All sales are read-only** — no edit/delete
- Sales displayed with compact single-line format

**Mobile shift card design:**
- Cards replace the unusable 7-column table at narrow widths
- Key balances in a 2-column grid
- Print/delete buttons always visible on the card header
- Expand animation when toggling details

### 18.4 New Shared Infrastructure

**`src/hooks/useToast.js`** (39 lines):
- Extracted toast state machine (show/hide with 3s auto-dismiss, 2.5s exit animation)
- Returns `{ showToast, toastMessage, toastType, isToastExiting, showToastNotification }`
- Used by both KasszaPanel and NaploPanel

**CSS changes:**
- `KasszaPanel.css`: Added `.kassza-toast` class + `@keyframes slideInRight/slideOutRight`, `.pos-fab` class with bottom-right positioning, mobile toast repositioning (bottom: 80px)
- `NaploPanel.css`: Card-based shift history layout, view controls, mobile/desktop display toggles for `.naplo-shift-table` vs `.naplo-shift-cards`

### 18.5 Navigation Changes

**Sidebar.jsx:**
- Added `naplo` tab: `{ id: "naplo", label: "Napló", icon: "📋", mode: "bolt", requiresRole: null }`
- Added SVG icon (clipboard/document) for mobile bottom bar
- Bolt mode now shows 4 tabs + "Több": Könyvesbolt, Ajándékok, Kassza, Napló, Több

**App.jsx:**
- Imports `NaploPanel` + `NaploPanel.css`
- Routes `activeTab === "naplo"` → `<NaploPanel>` with same props as KasszaPanel

### 18.6 UI Files Changed

| File | Action | Lines |
|------|--------|-------|
| `src/hooks/useToast.js` | Create | 39 |
| `src/components/NaploPanel.jsx` | Create | 857 |
| `src/components/NaploPanel.css` | Create | 317 |
| `src/Sidebar.jsx` | Edit | +15 |
| `src/App.jsx` | Edit | +18 |
| `src/components/KasszaPanel.jsx` | Edit | -1,020 |
| `src/components/KasszaPanel.css` | Edit | +130 |

### 18.7 Number Formatting Fix (2026-06-05)

**Problem:** `.toLocaleString("hu-HU")` on a **string** value (from Firebase RTDB) returns the string unchanged — no thousand separators. JavaScript's `String.prototype.toLocaleString()` is effectively a no-op. The Hungarian locale only adds thousand separators at ≥ 10,000 (e.g., "10688" → "10 688" but "4350" stays "4350").

Additionally, Firebase stores some numeric values as strings (e.g., `"4350"`), and arithmetic on strings caused string concatenation (`"5000" + 1000` = `"50001000"`) instead of addition — corrupting the `expectedBalance` and `discrepancy` calculations.

**Fix:** Added a custom `fmt()` helper in both `KasszaPanel.jsx` and `NaploPanel.jsx`:

```js
const fmt = (val) => {
  const n = Math.round(Number(val || 0));
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};
```

This:
- Always parses with `Number()` first (handles Firestore strings)
- Uses regex to insert non-breaking spaces at every 3-digit boundary, starting from 1,000
- Produces: 600 → "600", 4350 → "4 350", 10688 → "10 688", 439960 → "439 960"

**All arithmetic in `shiftExpectedBalance` computation** now wraps with `Number()` to prevent string concatenation:
```js
const shiftExpectedBalance = activeShift
  ? Number(activeShift.openingBalance) + shiftSalesTotal + shiftExtraIncome - shiftExtraExpense
  : 0;
```

### 18.8 "Eltérés" → "Összesen" / Net Change (2026-06-05)

**Problem:** The original "Eltérés" displayed the accounting discrepancy (`actual - expected`), which is always 0 when expenses are properly recorded (because expenses are subtracted from expected balance). This confused users — they expected to see how much money the shift actually made/lost compared to what was in the drawer at opening.

**Fix:** All shift cards, desktop table, print reports, and the close-shift modal now show **"Összesen"** — the net change in the drawer:

```
Összesen = Tényleges záró - Nyitó
```

Updated everywhere:
- **Napló shift cards** (mobile): last balance row
- **Napló desktop table**: last column header + body cells
- **Print view**: closing summary section
- **Kassza close modal**: live preview when entering actual balance
- **Kassza closing summary**: clipboard-copyable text

Color logic: green (`#059669`) when ≥ 0 (drawer gained money), red (`#dc2626`) when negative (drawer lost money).

### 18.9 Auth-Aware Database Listeners + Memory Leak Fix (2026-06-05)

**Problem 1 — Stale data after logout/login:** The `useDatabase` hook's 7 `useEffect` calls all had `[]` dependencies — subscribed to Firebase once on mount. After logout invalidated the auth token, the WebSocket listeners didn't re-establish on re-login. All tabs appeared empty until the PWA was killed and re-opened.

**Problem 2 — Slow cold start (30s):** Partially caused by stale WebSocket connections trying to re-auth.

**Problem 3 — Memory leak in `useAuth`:** Every `onAuthStateChanged` callback created a new `onValue` listener for the user's profile without cleaning up the previous one. After multiple login/logout cycles, zombie listeners accumulated.

**Fix 1 — `useDatabase(isAuthenticated)`** (`src/hooks/useDatabase.js`):
- Now accepts `isAuthenticated` parameter
- Every `useEffect` depends on `[isAuthenticated]`
- When `isAuthenticated` becomes `false`: clears state (`setBooks([])`, etc.) and unsubscribes
- When `isAuthenticated` becomes `true`: re-subscribes all 7 listeners fresh with valid auth token
- `App.jsx`: `useDatabase(!!user)` — reactive to auth state changes

**Fix 2 — `useAuth` listener cleanup** (`src/hooks/useAuth.js`):
- Tracks profile listener in `profileUnsubscribe` ref
- Cleans up old profile listener before creating a new one (on auth change)
- Cleans up on hook unmount
- Prevents zombie listener accumulation

### 18.10 Known Issues

All known issues resolved. No open issues as of 2026-06-05.

---

## 19. v0.12.0 — Rebrand: Burgundy → Blue Theme + Lucide SVG Icons (2026-06-07)

### 19.1 Overview

Complete visual rebrand from the burgundy/wine theme to a new blue palette. All ~250+ color references across 20 files were migrated. CSS custom properties on `:root` now serve as the single source of truth for theme colors. Additionally, all emoji-based icons (~100+) across 14 source files were replaced with Lucide React SVG components for professional, consistent cross-platform rendering.

### 19.2 New Palette

| Role | Old (Burgundy) | New (Blue) | CSS Variable |
|------|---------------|------------|--------------|
| Primary | `#844a59` | `#3741A8` (Ocean Twilight) | `--color-primary` |
| Hover / light accent | `#6b3a48` + 9 inconsistent variants | `#424EB5` (Ocean Twilight 2) | `--color-primary-hover` |
| Dark / pressed | — | `#3A41A7` (Ocean Twilight 3) | `--color-primary-dark` |
| Primary RGB (for rgba) | `132, 74, 89` | `55, 65, 168` | `--color-primary-rgb` |
| Page background | `#e8e0e2` (dusty rose) | `#F6F8FD` (Ghost White) | `--color-bg-page` |
| Subtle accent | — | `#C2C7E6` (Periwinkle) | `--color-accent` |
| Accent RGB | — | `194, 199, 230` | `--color-accent-rgb` |
| Stat card from | `#667eea` (indigo) | `#424EB5` | `--color-stat-from` |
| Stat card to | `#764ba2` (purple) | `#3741A8` | `--color-stat-to` |

### 19.3 Approach

- **CSS files** (11 files): All theme color references use `var(--color-primary)` etc. — makes future theme changes a single `:root` edit
- **JSX inline styles** (6 files): Direct hex replacement — JSX `e.target.style` setters can't read CSS variables
- **rgba() values**: CSS uses modern `rgb(var(--color-primary-rgb) / 0.3)` syntax; JSX uses `rgba(55, 65, 168, X)` directly
- **Unifications**: 10+ inconsistent dark/light burgundy variants (`#6b3a48`, `#6b3c47`, `#6d3c4a`, `#6d3d4a`, `#5a2f3a`, `#5a3d4a`, `#6d4a5c`, `#5c3340`, `#7b4c57`, `#9a5a69`, `#a05d7a`, `#a05a6d`) all collapsed into a single hover variable — colors that looked the same but were subtly wrong are now consistent
- Indigo/purple stat card accents (`#667eea` / `#764ba2`) absorbed into the blue palette
- Neutrals (`#f8f9fa`, `#f8fafc`, `#2c3e50`, `#64748b`, etc.) and semantic colors (`#dc3545`, `#28a745`, `#059669`, `#ffc107`) unchanged

### 19.4 PWA Manifest

- `theme_color`: `#844a59` → `#3741A8`
- `background_color`: `#f8f9fa` → `#F6F8FD`
- `dist/manifest.webmanifest` and `index.html` meta tag synced

### 19.5 Files Modified (26 files)

| Category | Files |
|----------|-------|
| Core | `src/App.css` (~100 refs) + added `:root` variables |
| Page CSS | `src/Login.css`, `src/Profile.css`, `src/Sidebar.css`, `src/AcceptInvite.css` |
| Component CSS | `src/components/KasszaPanel.css`, `src/components/LendingPanel.css`, `src/components/POSOverlay.css`, `src/components/BarcodeScanner.css`, `src/components/NaploPanel.css`, `src/components/BooksTable.css` |
| JSX inline styles | `src/components/GiftsPanel.jsx`, `src/components/AddBookModal.jsx`, `src/components/KasszaPanel.jsx`, `src/components/NaploPanel.jsx`, `src/components/LendingPanel.jsx`, `src/components/BookDetailModal.jsx` |
| Lucide icons (JSX) | `src/Sidebar.jsx`, `src/App.jsx`, `src/Profile.jsx`, `src/AcceptInvite.jsx`, `src/components/KasszaPanel.jsx`, `src/components/NaploPanel.jsx`, `src/components/POSOverlay.jsx`, `src/components/LendingPanel.jsx`, `src/components/GiftsPanel.jsx`, `src/components/UsersPanel.jsx`, `src/components/AddBookModal.jsx`, `src/components/BooksTable.jsx`, `src/components/BarcodeScanner.jsx` |
| Config | `vite.config.js`, `index.html`, `dist/index.html`, `dist/manifest.webmanifest` |
| Deps | `package.json` (added `lucide-react`), `package-lock.json` |

### 19.6 Lucide React SVG Icons

**Library:** `lucide-react` — tree-shakeable, MIT licensed, ~250 icons available.

**Pattern:**
- Named imports only: `import { BookOpen, Gift, Trash2 } from "lucide-react";`
- Sizes: sidebar tabs=20, mode switcher=22, inline buttons=14–16, standalone=24, toasts=18
- Styling: `style={{verticalAlign: "middle", marginRight: N}}` for inline text alignment
- Color: inherits `currentColor` from parent; for kassza/toasts, explicit color or className

**Icon mapping (most common):**

| Emoji | Lucide Icon | Where Used |
|-------|-------------|------------|
| 📚 | `BookOpen` | Tab, book placeholder, item type |
| 🎁 | `Gift` | Tab, gift placeholder, item type |
| 💰 | `CircleDollarSign` | Kassza tab |
| 📋 | `ClipboardList` | Napló tab |
| 🏛️ | `Building2` | Mode: Könyvtár |
| 📖 | `BookMarked` | Kölcsönzés tab |
| 👥 | `Users` | Felhasználók tab |
| 🚪 | `LogOut` | Kilépés |
| 🛒 | `ShoppingCart` | Mode: Bolt, POS cart |
| 📌 | `Pin` / `PinOff` | Pin/unpin sidebar |
| 🔍 | `Search` | Search/book lookup |
| ✏️ | `Pencil` | Edit buttons |
| 🗑️ | `Trash2` | Delete buttons |
| 💾 | `Save` | Save buttons |
| ❌ / ✕ | `X` | Cancel / close |
| ✅ | `CircleCheck` | Success toasts, confirmation |
| ✓ | `Check` | Selected state, inline check |
| ⚠️ | `AlertTriangle` | Warnings, overdue, delete modals |
| 🔒 | `Lock` | Close kassza, change password |
| 🔓 | `LockOpen` | Open kassza |
| 💵 | `Banknote` | Payment: cash |
| 💳 | `CreditCard` | Payment: card |
| 🏦 | `Landmark` | Payment: bank transfer |
| ➕ | `Plus` | Add new item |
| 🖨️ | `Printer` | Print shift report |
| 📷 | `Camera` | Avatar upload |
| 👤 | `User` | Single user selection |
| 🎯 | `Crosshair` | Selected user indicator |
| 📊 | `BarChart3` | Sales section |
| ▶ | `ChevronRight` | Expand collapse |
| ▲ | `ChevronUp` | Collapse indicator |
| ▼ | `ChevronDown` | Expand indicator |

**Status indicators (no Lucide equivalent):**
- 🟢 → `<span style={{display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#22c55e"}} />`
- 🔴 → `<span style={{display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "#ef4444"}} />`

### 19.7 Post-Fix Bugs Resolved (2026-06-07)

After initial sed-based emoji replacement, three bug classes were found and fixed:

1. **Missing imports** — Several Lucide icons were used in JSX but not imported, causing runtime `ReferenceError` (blank pages). Fixed by cross-checking all 14 files: `BookOpen` added to App.jsx, `BookOpen`+`Gift` added to KasszaPanel.jsx, `BookMarked` added to NaploPanel.jsx.

2. **JSX inside template literals** — The sed replaced emojis inside JavaScript template literals (backtick strings) with JSX components, which is a syntax error. Fixed in NaploPanel.jsx (print view template) and KasszaPanel.jsx (scan result messages) by using plain text prefixes instead.

3. **Arrow triangle emojis (▲▼)** — The original emoji sweep regex missed Unicode arrow triangles. Replaced in NaploPanel.jsx and LendingPanel.jsx with `<ChevronUp>`/`<ChevronDown>`.

**Verification:** Global emoji sweep across all `src/` files returns zero matches. `npm run build` passes clean. Staging deployment verified functional.

---

---

## 20. v0.12.1 — Card/Cash Payment Separation (2026-06-08)

### 20.1 Overview

**Problem:** Card payments go to a terminal, not the cash drawer. The `expectedBalance` formula (`openingBalance + allSales + extraIncome - extraExpense`) lumped cash and card sales together, making it mathematically wrong — a 5,000 Ft card sale inflated expected cash by 5,000 Ft even though that money wasn't in the drawer.

**Solution:** `expectedBalance` is now cash-only: `openingBalance + cashTotal + extraIncome - extraExpense`. Card/transfer totals are displayed separately everywhere but don't affect the cash math. The shift close flow now clearly distinguishes "Várt készpénz egyenleg" from card terminal amounts.

### 20.2 Changes

**KasszaPanel.jsx:**
- Three new derived values: `shiftCashTotal`, `shiftCardTotal`, `shiftTransferTotal` (filtered from `shiftSales` by `paymentMethod`)
- `shiftExpectedBalance` uses `shiftCashTotal` instead of `shiftSalesTotal`
- Balance display split: "Eladások" replaced with "Készpénzes eladások" (green), "Bankkártyás eladások" (blue), "Átutalásos eladások" (purple, conditional)
- "Várt egyenleg" → "Várt készpénz egyenleg"
- Terminal info row showing card total when > 0
- Close modal preview shows cash/card/transfer breakdown
- Input label: "Tényleges záró egyenleg" → "Tényleges készpénz egyenleg"
- Italic note: "A bankkártyás forgalom a terminálban van, nem a kasszában."
- Closing summary text includes cash/card breakdown
- Shift object now stores `cashTotal`, `cardTotal`, `transferTotal` on close
- `Banknote`, `CreditCard`, `Landmark` icons imported

**POSOverlay.jsx:**
- `paymentMethod` state (default `"cash"`)
- Payment method toggle: segmented button (Készpénz / Bankkártya)
- Card payments: "Kapott összeg" / "Visszajáró" fields hidden, finalize button enabled without amount received
- Cash payments: existing flow unchanged
- Toast message reflects payment method
- `Banknote`, `CreditCard` icons imported

**NaploPanel.jsx:**
- Desktop table: "Készpénz" and "Kártya" columns added (colSpan 8 → 10)
- Mobile cards: "Készpénz" and "Kártya" balance rows added after "Eladások"
- Payment method summary bar above expanded sales list (both desktop and mobile)
- Print reports: Készpénzes/Bankkártyás rows in summary, "Várt egyenleg" → "Várt készpénz egyenleg"

**CSS files:**
- `KasszaPanel.css`: `.balance-card.card-payment` (blue bg), `.balance-card.transfer-payment` (purple bg), `.balance-card-terminal` (terminal info row)
- `POSOverlay.css`: `.pos-payment-method-toggle`, `.pos-method-btn` (segmented button styles)
- `NaploPanel.css`: `.shift-balance-row .negative` (was missing, now added)

### 20.3 Backward Compatibility

- Old shifts (no `cashTotal`/`cardTotal`): cash column falls back to `salesTotal`, card shows "—" (em dash)
- Old sales (no `paymentMethod`): treated as cash via `(s.paymentMethod || "cash")`
- No database migration needed — new fields are additive only

### 20.4 Design Decisions

- `discrepancy` remains `actualBalance - expectedBalance` (now cash-only discrepancy — what matters)
- "Összesen" remains `actualBalance - openingBalance` (net cash drawer change — unchanged)
- Transfer payments shown conditionally (only when > 0) to avoid clutter
- POSOverlay defaults to cash (backward-compatible UX, minimal friction for cash-heavy shops)
- Banknote/CreditCard/Landmark icons added to KasszaPanel imports

### 20.5 Firebase Hosting Cache Headers Fix (2026-06-08)

**Problem:** Staging not updating on web/mobile even after deploy, restart, and incognito. Root cause: Firebase Hosting sends `Cache-Control: max-age=3600` on `sw.js` by default. The browser caches the old service worker, which never gets replaced, and it serves stale precached files indefinitely.

**Fix:** Added `headers` arrays to both hosting targets in `firebase.json`:

| Pattern | Cache-Control | Why |
|---------|--------------|-----|
| `sw.js` | `no-cache, no-store, must-revalidate` | Service worker checked on every visit |
| `**/*.js`, `**/*.css` | `max-age=31536000, immutable` | Content-hashed filenames = safe forever |
| `**/*.html`, `.json`, `.webmanifest` | `max-age=0, must-revalidate` | Change with every deploy |

**Recovery for already-cached devices:** DevTools → Application → Service Workers → Unregister, or clear site data, then reload.

---

## 21. v0.12.2 — Panel Header Unification + UI Consistency (2026-06-09)

### 21.1 Overview

All 7 tabs now share an identical header pattern — centered `h2` with inline Lucide icon, no subheader, no gradient/border/white-card. The old `App-header` (gradient, shadow, `h1`+`p` subheader, nested sections) and `kassza-header`/`lending-header`/`users-header` (each with different styling) are replaced by a single `.panel-header` / `.panel-controls` system.

**Subheaders removed:** "Raktárkezelés", "Értékesítési és bevételi nyilvántartás", "Raktárkezelő Rendszer", "Raktárkészlet" (inner h2 in GiftsPanel), "Értékesítési és műszak napló", "Digitális Könyvtárad", "Összes felhasználó" user-count.

### 21.2 Unified Header System

**CSS classes in `App.css`:**

```css
.panel-header {
  text-align: center;
  padding-top: 20px;
  margin-bottom: 20px;
}

.panel-header h2 {
  margin: 0;
  padding: 0 40px;
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
}

.panel-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 24px;
  gap: 12px;
  flex-wrap: wrap;
}
```

**JSX pattern (identical across all tabs):**
```jsx
<div className="tab-panel">             <!-- books-panel / library-panel / etc. -->
  <div className="panel-header">
    <h2><Icon size={20} /> Title</h2>
  </div>
  <div className="panel-controls">
    <!-- filters, buttons, stats -->
  </div>
  ...
</div>
```

**Tab → Wrapper → Icon mapping:**

| Tab | Wrapper class | Icon | Title |
|-----|-------------|------|-------|
| Könyvesbolt | `.books-panel` | `ShoppingCart` | Könyvesbolt |
| Könyvtár | `.library-panel` | `Building2` | Omega Könyvtár |
| Ajándékok | `.gifts-panel` | `Gift` | Ajándéktárgyak |
| Kassza | `.kassza-panel` | `CircleDollarSign` | Kassza |
| Napló | `.naplo-panel` | `ClipboardList` | Napló |
| Kölcsönzés | `.lending-panel` | `BookMarked` | Könyvtári Kölcsönzés |
| Felhasználók | `.users-panel` | `Users` | Felhasználók Kezelése |

### 21.3 Tab Wrapper Cleanup

Removed `tab-content custom-scrollbar` white card wrappers from Kassza, Napló, Lending, and Users tabs in `App.jsx`. Each panel now handles its own wrapper with consistent `max-width: 1200px; margin: 0 auto; padding: 20px`.

### 21.4 Napló Anchor Pills — Scroll → Toggle

**Before:** Two pills smooth-scrolled between shift history and sales sections. Both sections always present in the DOM. On iPhone, the notch covered the sticky bar.

**After:**
- Pills toggle visibility: tapping "Műszak Napló" shows only shift history, "Eladási Történet" shows only sales
- `activeAnchor` state (`"shifts"` | `"sales"`) controls which section renders
- Sticky bar uses `padding-top: calc(12px + env(safe-area-inset-top, 0px))` — respects iPhone notch
- Background is transparent (inherits page bg, not `#F6F8FD`)
- Removed `scroll-margin-top` and `#naplo-shifts`/`#naplo-sales` IDs
- Removed unused `showShiftHistory` state, `ChevronUp`/`ChevronDown` imports

### 21.5 LendingPanel Stat Cards Grid Fix

**Before:** `display: flex; flex-wrap: wrap; min-width: 150px` — two cards per row, third wrapped below, all unequal widths.

**After:** `display: grid; grid-template-columns: repeat(3, 1fr)` — three equal columns, always one row.

### 21.6 UsersPanel Cleanup

- Removed `getUserStats()` function and `stats` variable (was only used for the user-count subheader)
- Removed `.users-header`/`.user-count` CSS
- Removed `tab-content` white card wrapper

### 21.7 Firebase Hosting Cache Headers Fix (Corrected)

**Problem:** `**/*.@(js,css)` and `**/*.@(html,json,webmanifest)` extglob patterns are not supported by Firebase Hosting CDN — files received default `max-age=3600`.

**Fix:** Split into individual patterns:
```json
{ "source": "**/*.js",    "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
{ "source": "**/*.css",   "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
{ "source": "**/*.html",  "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }] },
{ "source": "**/*.webmanifest", "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }] },
{ "source": "sw.js",      "headers": [{ "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }] }
```
**Important:** `sw.js` must be **last** — Firebase resolves conflicts by rule order; if `**/*.js` comes after `sw.js`, the broader pattern wins.

### 21.8 Bug Fixes

- **KasszaPanel blank page** — `CircleDollarSign` was used in the new header JSX but not imported. Added to Lucide imports.
- **LendingPanel build error** — Orphan `</div>` from removed `.lending-header` wrapper caused transform failure.
- **NaploPanel build error** — Duplicate `)}` closing bracket from section toggle restructuring.

### 21.9 Files Modified

| File | Change |
|------|--------|
| `src/App.css` | Added `.panel-header`, `.panel-controls`, `.books-panel`, `.library-panel`, `.gifts-panel` + mobile variants. Removed `.users-header`, `.user-count`. |
| `src/App.jsx` | Unified Könyvesbolt + Könyvtár headers. Removed `tab-content` wrappers from 4 tabs. Added wrapper divs for books/library panels. Added `ShoppingCart`, `Building2` imports. |
| `src/components/KasszaPanel.jsx` | `App-header` → `panel-header`. Added `CircleDollarSign` import. |
| `src/components/NaploPanel.jsx` | `kassza-header` → `panel-header`. Anchor pills toggle visibility. Removed `showShiftHistory` state, `ChevronUp`/`ChevronDown` imports. |
| `src/components/NaploPanel.css` | Anchor pill styles (transparent bg, safe-area). Removed `scroll-margin-top`/`#naplo-shifts`/`#naplo-sales`. |
| `src/components/GiftsPanel.jsx` | `App-header` → `panel-header`. Removed inner `<h2>Raktárkészlet</h2>`. Removed `tab-content` wrapper. |
| `src/components/LendingPanel.jsx` | `lending-header` → `panel-header`. Removed orphan `</div>`. |
| `src/components/LendingPanel.css` | Stats: `flex-wrap` → `grid 3×1fr`. Removed `.lending-header` styles. |
| `src/components/UsersPanel.jsx` | `users-header` → `panel-header`. Removed `getUserStats()`/`user-count`. Added `Users` import. |
| `firebase.json` | Fixed extglob patterns → individual rules, `sw.js` ordered last. |
| `TECHNICAL_OVERVIEW.md` | This section. |

---

## 22. v0.12.3 — Skeleton Screens + UI Polish + Invite Validation (2026-06-10)

### 22.1 Skeleton Loading Screens

**Problem:** On slow connections, the app shows a "flash of empty" — all panels render with `[]` initial state before Firebase `onValue` listeners fire, showing "0 könyv található" / "Még nincsenek lezárt műszakok" etc.

**Solution:** Added `dataLoaded` flag to `useDatabase` + `SkeletonUI` component + guard in `App.jsx`.

**`useDatabase.js` changes:**
- Added `dataLoaded` boolean state + `useRef(new Set())` tracker
- `markLoaded(key)` called at the top of each `onValue` callback (before `if (data)` — fires even when DB is empty)
- After all 7 sources (books, gifts, users, loans, sales, shifts, extraTransactions) report, `dataLoaded = true`
- Reset effect: clears Set and resets flag on auth change (logout/login)

**`SkeletonUI.jsx`** (new file, ~195 lines):
- Single component with `activeTab`, `activeMode`, `cardDensity` props
- Renders appropriate skeleton per tab using shared sub-components:
  - `SkeletonCard` — book/user card with thumbnail + text lines
  - `SkeletonTableRow` — table row with optional thumbnail cell
  - `SkeletonStat` — stat card with number + label
  - `SkeletonUserCard` — user card with avatar circle + text lines
- Each tab gets a `PanelWrapper` with correct icon + title + wrapper class

**CSS** (`App.css`, ~60 lines):
- `@keyframes shimmer` — animated gradient sweep left-to-right
- `.skeleton` — base class with shimmer gradient
- `.skeleton-card`, `.skeleton-card-thumb`, `.skeleton-card-line` — card grid shapes
- `.skeleton-table-row`, `.skeleton-cell` — table row shapes
- `.skeleton-stat`, `.skeleton-num`, `.skeleton-label` — stat card shapes
- `.skeleton-heading`, `.skeleton-grid`, `.skeleton-stats-row`, `.skeleton-pill`, `.skeleton-btn`, `.skeleton-avatar` — misc shapes
- Mobile overrides: cards go 2-column, stats stack vertically

**`App.jsx` integration:**
- Destructures `dataLoaded` from `useDatabase(!!user)`
- After auth resolved but `!dataLoaded`: renders `Sidebar` + `SkeletonUI` (sidebar interactive for tab switching)
- Full app only renders when `dataLoaded === true`

### 22.2 Invite Validation

**Problem:** Admin could invite an already-registered user or send duplicate pending invites to the same email.

**Fix** in `UsersPanel.jsx` `handleInviteSend`:
- Checks `users` array for existing email → "Ez az email cím már regisztrálva van a rendszerben."
- Checks `invites` array for pending/sent invite → "Erre az email címre már van függőben lévő meghívó."
- Added `inviteMessageError` state for red error styling
- Added `.invite-message.error` CSS class (red bg `#fef2f2`, red text `#dc2626`)

### 22.3 UI Polish

**Avatar border removal** (`App.css`):
- Removed `border: 3px solid #f1f5f9` from `.user-avatar img` and `.avatar-placeholder`
- Removed `border: 4px solid #f1f5f9` from `.user-detail-avatar img` and `.user-detail-avatar .avatar-placeholder`
- Kept `box-shadow` on detail avatars (subtle lift effect)

**User card centering** (`App.css`):
- `.user-card` — added `text-align: center`
- `.user-dates` — added `align-items: center` to flex column

**Sidebar avatar CSS scoping** (`Sidebar.css`):
- `.user-avatar` → `.sidebar-user .user-avatar` — was leaking globally onto UsersPanel cards
- `.user-avatar-img` → `.sidebar-user .user-avatar-img` — same scoping

**Phone/address removal:**
- **UsersPanel.jsx:** Removed from `handleEditUser` form init, read-only view, and edit form JSX
- **Profile.jsx:** Removed from `formData` state init, `handleProfileUpdate`, `handleEdit`, `handleCancel`, and JSX (both read + edit)
- Old DB data preserved — just no longer shown or editable

**Self-edit allowed** (`UsersPanel.jsx`):
- Removed `disabled={selectedUser?.id === user?.uid}` from Szerkesztés button
- Admin can now edit themselves from UsersPanel
- Delete self-protection still active

**Login page rebrand:**
- H1: "Omega Könyvtár" → "Omega Könyvek"
- Removed login-footer ("Omega Könyvtár — Digitális Könyvtárad") in login mode
- Footer kept for forgot password mode (back-link)

**Browser tab:**
- Title: "Omega Könyvtár" → "Omega Könyvek"
- Favicon: `/omega-icon.svg` — blue circle (#3741A8) with white Ω character

**User detail modal X buttons removed** (`UsersPanel.jsx`):
- Removed × from user detail modal header — title now centered
- Removed × from delete confirmation modal header — title now centered
- Close via "Bezárás"/"Mégse" buttons at bottom
	- Delete modal restyled with same blur overlay + centered card inline styles as user detail modal (was old `.modal.show` CSS class approach)

### 22.4 Documentation Updates

- **Memory files:** `user-preferences.md` — added staging testing workflow. `session-workflow.md` — added staging testing + deploy step.
- **TECHNICAL_OVERVIEW.md:** This section.

### 22.5 Files Modified (this session)

| File | Change |
|------|--------|
| `src/hooks/useDatabase.js` | Added `dataLoaded` flag + Set-based tracker + reset effect |
| `src/App.jsx` | Import SkeletonUI, destructure dataLoaded, add skeleton guard |
| `src/App.css` | Skeleton CSS (~60 lines), centering fixes, avatar border removal |
| `src/components/SkeletonUI.jsx` | **New** — ~195 lines, per-tab skeleton layouts |
| `src/components/UsersPanel.jsx` | Invite validation, phone/address removal, self-edit allowed, X buttons removed |
| `src/Profile.jsx` | Phone/address removed from form + JSX |
| `src/Sidebar.css` | Scoped .user-avatar and .user-avatar-img to .sidebar-user |
| `src/Login.jsx` | H1 rebrand, login-footer removed in login mode |
| `index.html` | Title "Omega Könyvek", favicon /omega-icon.svg |
| `public/omega-icon.svg` | **New** — blue omega favicon |
| `TECHNICAL_OVERVIEW.md` | v0.12.3 section + version bump |
| Memory files | user-preferences, session-workflow updated |

---

## 23. v0.12.4 — Inline Editing + Invite Email Rebrand + UI Fixes (2026-06-11 / 2026-06-12)

### 23.1 Invite Email Template Redesign

**File:** `functions/index.js`

The Cloud Function HTML email template still used the old burgundy theme and "Omega Könyvtár" branding. Complete redesign:

- **Header banner** — `#3741A8` bar with white "Üdvözlünk az Omega Könyvekben!" heading
- **Body** — white content area on `#F6F8FD` (Ghost White) background, rounded card (`border-radius: 12px`)
- **Button** — `#3741A8` with `font-weight: 600`, wider padding
- **Text** — `#1e293b` for body, `#64748b` for secondary, `#94a3b8` for footer
- **Link color** — `#3741A8`
- **Divider** — `#C2C7E6` (Periwinkle)
- **Footer** — "Omega Könyvek"
- **Subject** — "Meghívás az Omega Könyvekbe", from name "Omega Könyvek"
- **SMTP config comment** — updated example with new branding

All 5 Cloud Functions redeployed.

### 23.2 AcceptInvite Page Rebrand

**File:** `src/AcceptInvite.jsx`

Two text references still said "Omega Könyvtár":
- Page `<h1>`: "Omega Könyvtár" → "Omega Könyvek"
- Success message: "az Omega Könyvtárba" → "az Omega Könyvekbe"

### 23.3 Delete Confirmation Modal Restyled

**File:** `src/components/UsersPanel.jsx`

The delete confirmation modal used the old `.modal.show` / `.modal-content` CSS classes which had a different feel from the user detail modal. Now uses identical inline style pattern:

- **Overlay** — `backdropFilter: blur(5px)` (same as user detail modal)
- **Card** — `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.3)` — properly centered
- **Header** — centered title with `border-bottom: 2px solid #f1f5f9`

### 23.4 User Detail Modal — Inline Editing

**Files:** `src/components/UsersPanel.jsx`, `src/App.css`

**Problem:** Clicking "Szerkesztés" replaced the entire read-only content block with a form — avatar disappeared, layout jumped from centered text + detail rows to stacked form groups with thick blue-bordered inputs.

**Solution:** Per-field conditionals instead of block-level swap:

| Field | Before (edit) | After (edit) |
|-------|--------------|-------------|
| Name | Stacked form-group with thick blue input | Inline input replacing just the text — same font/size/position |
| Email | Stacked form-group with thick blue input | Inline input — same grey color, same position |
| Szerepkör | Stacked form-group with thick blue select | Clean select inside existing `.detail-row`, same label position |
| Reg. dátuma | Hidden in edit mode | Always visible |
| Utoljára belépve | Hidden in edit mode | Always visible |
| Avatar | Hidden in edit mode | Always visible |

**Input affordance** — three visual states:
- **Default** — subtle grey dashed underline (`#cbd5e1`)
- **Hover** — light blue tint + darker dashed line (`#94a3b8`)
- **Focus** — solid primary-color underline + stronger tint

**CSS changes in `App.css`:**
- **Removed** ~45 lines of dead `.user-edit-form` CSS (scrollbar, form-group, label, `.edit-input` overrides)
- **Added** ~70 lines: `.inline-edit-input`, `.inline-edit-name`, `.inline-edit-email`, `.inline-edit-select` + responsive overrides at 768px

### 23.5 Profile Editing Fixed

**Files:** `src/Profile.jsx`, `src/Profile.css`

**Three bugs fixed:**

1. **Edit button didn't render inputs** — Same pattern as UsersPanel: name and email `<span>` elements now become inline `<input>` elements when editing (dashed-underline affordance). Registration date and last login stay read-only.

2. **`handleEdit()` didn't populate `displayName`** — Only set `email` in `formData`, so the name field was empty. Now includes `displayName: user?.displayName || user?.name || ""`.

3. **`handleSubmit()` used hardcoded `user?.displayName`** — Even if you typed a new name, it was ignored because `displayName: user?.displayName || user?.name` was spread over formData. Fixed: uses `formData.displayName` and `formData.email` directly. Same fix in `saveProfileToFirebase()`.

**CSS:** New `.profile-inline-input` class — same Notion-style dashed-underline affordance, `text-align: right` to match the read-only value position. Responsive at 768px (full-width, left-aligned).

### 23.6 Loading Screen Centered

**File:** `src/App.css`

The initial auth-check loading spinner was left-aligned at the top of the page. Changed `.loading-screen` from `padding: 50px 20px` to:
```css
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
min-height: 100vh;
```
Spinner and "Betöltés..." text are now centered vertically and horizontally.

### 23.7 SMTP Config Example Updated

**File:** Memory `session-workflow.md`

The `firebase functions:config:set` example in the session workflow had the old `from` name: "Omega Könyvtár" → "Omega Könyvek".

### 23.8 Files Modified (this session)

| File | Change |
|------|--------|
| `functions/index.js` | Invite email HTML template redesign (burgundy→blue, "Omega Könyvek") |
| `src/AcceptInvite.jsx` | `<h1>` + success message "Omega Könyvtár" → "Omega Könyvek" |
| `src/components/UsersPanel.jsx` | Inline per-field editing (JSX), delete modal restyled to match user detail modal |
| `src/App.css` | Removed `.user-edit-form` CSS (~45 lines), added `.inline-edit-*` styles (~70 lines), `.loading-screen` centering fix |
| `src/Profile.jsx` | Inline name/email editing, `handleEdit` displayName fix, `handleSubmit` + `saveProfileToFirebase` data fix |
| `src/Profile.css` | Added `.profile-inline-input` styles + responsive rules |
| `TECHNICAL_OVERVIEW.md` | v0.12.4 section + version bump |
| Memory files | project-overview, uncommitted-changes, session-workflow updated |

---

---

## 24. v0.12.5 — User Deletion Fix (Auth + RTDB) + SMTP Rebrand Fix (2026-06-12)

### 24.1 Overview

**Two bugs fixed:**

1. **User deletion only removed RTDB record** — Firebase Auth account survived, causing "email már regisztrálva" errors on re-invite
2. **Invite emails arrived from "Omega Könyvtár"** — SMTP config still had old branding

### 24.2 deleteUserAccount Cloud Function

**Problem:** `handleDeleteUser` in `UsersPanel.jsx` only called `remove(userRef)` on the RTDB record. The Firebase Auth account was never deleted. When the same person was re-invited, `createUserWithEmailAndPassword` on the AcceptInvite page failed with `auth/email-already-in-use`.

**Solution:** New callable Cloud Function `deleteUserAccount` that uses Admin SDK to delete both the Auth account and the RTDB record server-side.

**File:** `functions/index.js` (new function, ~90 lines)

**Behavior:**
- Requires authentication — caller must be logged in
- Verifies caller is admin (checks `users/{callerUid}/role` in both prod and staging paths)
- Self-deletion blocked (both client-side `canDeleteUser()` and server-side guard)
- Calls `admin.auth().deleteUser(uid)` — catches `auth/user-not-found` gracefully (Auth already gone → still clean up RTDB)
- Removes RTDB record from both `users/{uid}` and `staging/users/{uid}` paths (whichever exists)
- Returns `{ success: true }`

**Client wrapper** (`src/firebase.js`):
```js
export function deleteUserCallable(uid) {
  const fn = httpsCallable(functions, "deleteUserAccount");
  return fn({ uid });
}
```

**UsersPanel update** (`src/components/UsersPanel.jsx`):
- Added `deleteUserCallable` to imports
- `handleDeleteUser`: replaced `await remove(userRef)` with `await deleteUserCallable(selectedUser.id)`
- Added user-visible error alert on failure (was only `console.error` before)

### 24.3 SMTP Config Fix

**Problem:** `firebase functions:config` had `smtp.from = "Omega Könyvtár <omegakonyvek@gmail.com>"` — old branding.

**Fix:** Updated via `firebase functions:config:set smtp.from="Omega Könyvek <omegakonyvek@gmail.com>"` + redeployed all functions.

### 24.4 AcceptInvite Icon Centering

**Problem:** Success (`CircleCheck`) and error (`AlertTriangle`) icons on the AcceptInvite page were left-aligned. The CSS used `font-size: 3rem` (text centering technique, doesn't work for SVG icons).

**Fix** in `src/AcceptInvite.css`:
- `.invite-success .success-icon` + `.invite-error .error-icon`: `font-size: 3rem` → `display: flex; justify-content: center`

### 24.5 Known Issues

All resolved ✅. No open issues as of 2026-06-12.

### 24.6 Files Modified (this session)

| File | Change |
|------|--------|
| `functions/index.js` | New `deleteUserAccount` callable function (~90 lines) |
| `src/firebase.js` | New `deleteUserCallable` wrapper (~5 lines) |
| `src/components/UsersPanel.jsx` | Updated `handleDeleteUser` to use Cloud Function, added error alert |
| `src/AcceptInvite.css` | Fixed success/error icon centering |
| `functions:config` (SMTP) | `from` name: "Omega Könyvtár" → "Omega Könyvek" |
| `TECHNICAL_OVERVIEW.md` | v0.12.5 section + version bump |

---

**Document Version:** 3.9  
**Generated:** 2026-05-29  
**Last Updated:** 2026-06-12
**Purpose:** Complete AI assistant synchronization for session continuity
