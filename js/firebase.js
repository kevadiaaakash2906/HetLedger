/* ============================================
   VINÉRE — Firebase + Sheet Sync
   ============================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, addDoc, setDoc, deleteDoc,
  query, serverTimestamp, writeBatch, where, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { showToast } from "./utils.js";

// ═══════════════════════════════════════════
// PASTE YOUR FIREBASE CONFIG BELOW
// ═══════════════════════════════════════════
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
export const db = getFirestore(app);

const SHEET_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbzJ5U6ndEPYNt2r9cmzKnXK1w0q_WqqHXkhN73h8Iu7giXrCtjn9iwwhO4amKa54FbMlw/exec';

/* ============ ORDERS ============ */
export async function fetchOrders() {
  const snap = await getDocs(query(collection(db, 'orders'), orderBy('Sr. No.', 'asc')));
  const rows = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
  return { rows };
}

export async function addOrder(data) {
  const ref = doc(collection(db, 'orders'));
  await setDoc(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  syncToSheet({ ...data, _collection: 'orders' });
  return ref.id;
}

export async function updateOrder(id, data) {
  await setDoc(doc(db, 'orders', id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
  syncToSheet({ ...data, _collection: 'orders' });
}

export async function deleteOrder(id, srNo) {
  await deleteDoc(doc(db, 'orders', id));
  syncToSheet({ 'Sr. No.': srNo, _action: 'delete', _collection: 'orders' });
}

/* ============ TRADING ============ */
export async function fetchTrading() {
  const snap = await getDocs(query(collection(db, 'trading'), orderBy('Sr. No.', 'asc')));
  const rows = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
  return { rows };
}

export async function addTrading(data) {
  const ref = doc(collection(db, 'trading'));
  await setDoc(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  syncToSheet({ ...data, _collection: 'trading' });
  return ref.id;
}

export async function updateTrading(id, data) {
  await setDoc(doc(db, 'trading', id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
  syncToSheet({ ...data, _collection: 'trading' });
}

export async function deleteTrading(id, srNo) {
  await deleteDoc(doc(db, 'trading', id));
  syncToSheet({ 'Sr. No.': srNo, _action: 'delete', _collection: 'trading' });
}

/* ============ SHEET SYNC ============ */
function syncToSheet(payload) {
  const url = SHEET_WEBHOOK_URL + '?secret=vinere-sync-2026';
  fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(payload)
  })
  .then(() => showToast('Synced to Google Sheet', 'success', 2500))
  .catch(err => {
    showToast('Sheet sync failed — will retry on next save', 'error', 4000);
    console.error('Sync failed', err);
  });
}

/* ============ EXPOSE FOR APP ============ */
Object.assign(window, {
  db, fetchOrders, fetchTrading,
  addOrder, updateOrder, deleteOrder,
  addTrading, updateTrading, deleteTrading
});
