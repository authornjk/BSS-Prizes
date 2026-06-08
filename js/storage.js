/**
 * storage.js
 *
 * Uses Firebase Realtime Database for shared, real-time data.
 *
 * SETUP (one-time):
 * 1. Go to https://console.firebase.google.com
 * 2. Create a project (free Spark plan is fine)
 * 3. Create a Realtime Database (start in test mode for now)
 * 4. Copy your config values into FIREBASE_CONFIG below
 * 5. In Firebase Console > Realtime Database > Rules, set:
 *    {
 *      "rules": {
 *        ".read": "auth != null",
 *        ".write": "auth != null"
 *      }
 *    }
 *    (or keep test mode rules while you're getting started)
 */

const FIREBASE_CONFIG = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_AUTH_DOMAIN",
  databaseURL: "REPLACE_WITH_YOUR_DATABASE_URL",
  projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
};

// ---------------------------------------------------------------------------
// Internal helpers — do not edit below unless you know Firebase well
// ---------------------------------------------------------------------------

let _db = null;
let _listeners = {};

async function initFirebase() {
  if (_db) return _db;

  // Dynamically load Firebase SDK (compat version — simpler API)
  if (!window.firebase) {
    await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js');
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }
  _db = firebase.database();
  return _db;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Read a value once from the database.
 * @param {string} path  e.g. 'prizes' or 'meta'
 * @returns {Promise<any>}
 */
async function dbGet(path) {
  const db = await initFirebase();
  const snap = await db.ref(path).once('value');
  return snap.val();
}

/**
 * Write a value to the database.
 * @param {string} path
 * @param {any} value
 */
async function dbSet(path, value) {
  const db = await initFirebase();
  await db.ref(path).set(value);
}

/**
 * Subscribe to real-time changes on a path.
 * Calls callback(value) whenever data changes.
 * Returns an unsubscribe function.
 * @param {string} path
 * @param {function} callback
 */
async function dbListen(path, callback) {
  const db = await initFirebase();
  const ref = db.ref(path);
  const handler = snap => callback(snap.val());
  ref.on('value', handler);
  return () => ref.off('value', handler);
}

/**
 * Atomically increment a counter (used for nextId).
 * @param {string} path
 * @returns {Promise<number>}  the new value
 */
async function dbIncrement(path) {
  const db = await initFirebase();
  const ref = db.ref(path);
  let newVal;
  await ref.transaction(current => {
    newVal = (current || 0) + 1;
    return newVal;
  });
  return newVal;
}

// ── Shared author list from Firebase ─────────────────────────────────────────
// Prize Manager reads authors from the same Firebase path as HQ.
// This keeps the donor dropdown in sync with confirmed authors.

async function loadSharedAuthors() {
  try {
    const data = await dbGet('authors');
    if (data) {
      const authors = Object.values(data)
        .filter(a => a.status === 'Confirmed' || a.status === 'Asked')
        .map(a => a.name)
        .sort();
      return authors.length ? authors : null;
    }
  } catch(e) { console.warn('Author load failed:', e); }
  return null;
}
