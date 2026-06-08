# Bookish Summer Soirée — Prize Manager

A Progressive Web App (PWA) for tracking prizes, donation tags, budgets, and authors for the Bookish Summer Soirée event. Supports multiple users with live sync.

---

## Setup (one-time, ~10 minutes)

### 1. Create a Firebase project (free)

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it `soiree-prizes` → Continue (no need for Google Analytics)
3. In the left sidebar, click **Build → Realtime Database**
4. Click **Create Database** → choose a location → start in **test mode** (you'll secure it after)
5. Copy the database URL — it looks like `https://soiree-prizes-default-rtdb.firebaseio.com`

### 2. Get your Firebase config

1. In Firebase Console, click the gear icon ⚙️ → **Project settings**
2. Scroll to **Your apps** → click the `</>` (Web) icon → register app (name it anything)
3. Copy the `firebaseConfig` values

### 3. Add your config to the app

Open `js/storage.js` and fill in your values:

```js
const FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "soiree-prizes.firebaseapp.com",
  databaseURL: "https://soiree-prizes-default-rtdb.firebaseio.com",
  projectId: "soiree-prizes",
};
```

### 4. Secure your database (recommended)

In Firebase Console → Realtime Database → **Rules**, paste:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

> This keeps it open (fine for a private event app). If you want to restrict access, you can add Firebase Authentication later.

### 5. Deploy to GitHub Pages

1. Push this folder to a GitHub repo
2. Go to repo **Settings → Pages**
3. Set source to **main branch, / (root)**
4. Your app will be live at `https://YOUR-USERNAME.github.io/REPO-NAME`

### 6. Add to home screen

**iPhone:** Open the URL in Safari → tap the Share button → **Add to Home Screen**

**Android:** Open in Chrome → tap the three-dot menu → **Add to Home Screen**

---

## User accounts

Default accounts (set up in `js/auth.js`):

| Username | Role | Default view |
|----------|------|-------------|
| `nicole` | Admin | All prizes |
| `coordinator` | Coordinator | BINGO only |

Both accounts have **no password set** — each person sets their own password on first login.

**To add more users:** Sign in as Nicole (admin) → Settings → User accounts → Add user.

**To reset someone's password:** Settings → User accounts → click the key icon next to their name.

---

## File structure

```
soiree-prizes/
├── index.html          # App entry point
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (offline support)
├── css/
│   └── app.css         # All styles
├── js/
│   ├── storage.js      # Firebase database layer ← ADD YOUR CONFIG HERE
│   ├── auth.js         # User accounts & passwords
│   ├── state.js        # Shared data & sync
│   ├── ui-goals.js     # Goals progress bar
│   ├── ui-prizes.js    # Prize list, filters, add/edit
│   ├── ui-tags.js      # Donation tag tracker
│   ├── ui-budget.js    # Budget dashboard
│   ├── ui-authors.js   # Authors tab
│   ├── ui-settings.js  # Settings, users, reset
│   └── app.js          # Main app, login, routing
└── icons/
    ├── icon-192.png    # PWA icon
    └── icon-512.png    # PWA icon (large)
```

---

## For 2028 and beyond

When you're ready to start fresh for a new year:
1. Sign in as admin
2. Go to **Settings → Reset all prize data** (deletes prizes only — keeps users)
3. Update goals, budgets, and authors in Settings
4. Change the event year in Settings → Event details

Or duplicate the GitHub repo for a clean archive of each year.
