/* ============================================
   VINÉRE — Firebase + Sheet Sync
   ============================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, addDoc, setDoc, deleteDoc,
  query, serverTimestamp, writeBatch, where, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SHEET_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzJ5U6ndEPYNt2r9cmzKnXK1w0q_WqqHXkhN73h8Iu7giXrCtjn9iwwhO4amKa54FbMlw/exec';

/* ============ ORDERS ============ */
async function fetchOrders() {
  const snap = await getDocs(query(collection(db, 'orders'), orderBy('Sr. No.', 'asc')));
  const rows = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
  return { rows };
}

async function addOrder(data) {
  const ref = doc(collection(db, 'orders'));
  await setDoc(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  syncToSheet({ ...data, _collection: 'orders' });
  return ref.id;
}

async function updateOrder(id, data) {
  await setDoc(doc(db, 'orders', id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
  syncToSheet({ ...data, _collection: 'orders' });
}

async function deleteOrder(id, srNo) {
  await deleteDoc(doc(db, 'orders', id));
  syncToSheet({ 'Sr. No.': srNo, _action: 'delete', _collection: 'orders' });
}

/* ============ TRADING ============ */
async function fetchTrading() {
  const snap = await getDocs(query(collection(db, 'trading'), orderBy('Sr. No.', 'asc')));
  const rows = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
  return { rows };
}

async function addTrading(data) {
  const ref = doc(collection(db, 'trading'));
  await setDoc(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  syncToSheet({ ...data, _collection: 'trading' });
  return ref.id;
}

async function updateTrading(id, data) {
  await setDoc(doc(db, 'trading', id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
  syncToSheet({ ...data, _collection: 'trading' });
}

async function deleteTrading(id, srNo) {
  await deleteDoc(doc(db, 'trading', id));
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
    if (window.showToast) showToast('Sheet sync failed — will retry on next save', 'error', 4000);
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
