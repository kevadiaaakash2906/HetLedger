/* ============================================
   VINÉRE — Firebase + Sheet Sync (Compat)
   ============================================ */

const firebaseConfig = {
  apiKey: "AIzaSyC3GlUHfz6Zfd1o5eymGcY_jkyz4MuVfls",
  authDomain: "vinereledger-b29be.firebaseapp.com",
  databaseURL: "https://vinereledger-b29be-default-rtdb.firebaseio.com",
  projectId: "vinereledger-b29be",
  storageBucket: "vinereledger-b29be.firebasestorage.app",
  messagingSenderId: "701394930039",
  appId: "1:701394930039:web:456e7ae9c61fc92402b972",
  measurementId: "G-HQN3J4LGXE"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const SHEET_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbx9yEy0j0EHMegp_tzHX5-Q1xSuLHsp6Em98fLIg8wp9hbzIVbkTHeWhkWzZHgLE9RAYw/exec';

/* ============ ORDERS ============ */
async function fetchOrders() {
  const snap = await db.collection('orders').orderBy('Sr. No.', 'asc').get();
  const rows = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
  return { rows };
}

async function addOrder(data) {
  const ref = db.collection('orders').doc();
  await ref.set({ ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
  syncToSheet({ ...data, _collection: 'orders' });
  return ref.id;
}

async function updateOrder(id, data) {
  await db.collection('orders').doc(id).set({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
  syncToSheet({ ...data, _collection: 'orders' });
}

async function deleteOrder(id, srNo) {
  await db.collection('orders').doc(id).delete();
  syncToSheet({ 'Sr. No.': srNo, _action: 'delete', _collection: 'orders' });
}

/* ============ TRADING ============ */
async function fetchTrading() {
  const snap = await db.collection('trading').orderBy('Sr. No.', 'asc').get();
  const rows = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
  return { rows };
}

async function addTrading(data) {
  const ref = db.collection('trading').doc();
  await ref.set({ ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
  syncToSheet({ ...data, _collection: 'trading' });
  return ref.id;
}

async function updateTrading(id, data) {
  await db.collection('trading').doc(id).set({ ...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
  syncToSheet({ ...data, _collection: 'trading' });
}

async function deleteTrading(id, srNo) {
  await db.collection('trading').doc(id).delete();
  syncToSheet({ 'Sr. No.': srNo, _action: 'delete', _collection: 'trading' });
}

/* ============ SHEET SYNC ============ */
function syncToSheet(payload) {
  var url = SHEET_WEBHOOK_URL + '?secret=vinere-sync-2026';
  fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload)
  })
  .then(function() {
    if (window.showToast) showToast('Synced to Google Sheet', 'success', 2500);
  })
  .catch(function(err) {
    if (window.showToast) showToast('Sheet sync failed', 'error', 4000);
    console.error('Sync failed', err);
  });
}

/* ============ EXPOSE GLOBALLY ============ */
window.db = db;
window.fetchOrders = fetchOrders;
window.fetchTrading = fetchTrading;
window.addOrder = addOrder;
window.updateOrder = updateOrder;
window.deleteOrder = deleteOrder;
window.addTrading = addTrading;
window.updateTrading = updateTrading;
window.deleteTrading = deleteTrading;
