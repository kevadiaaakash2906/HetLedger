/* ============================================
   VINÉRE — App Core
   ============================================ */

/* ============ AUTH / ROLE ============ */
var PASSWORDS = {
  staff:   '25f885fa451c3c6b024fe23dbf834ceb2be6361316010ef348e7777faa78634c',
  seller:  'c60a26e1e8094121dae3acccdfdb1fffeb616bcb2e3ae68f6b18c336e6e031d7',
  customer:'ed0d153323609350d97777beab557ffe834d93f615c0a9f7d8c01767d7fc158d'
};

var ROLE = null;
var USER_HASH = null;

async function sha256(str) {
  var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
}

/* ---------- Auto-login on load ---------- */
window.showApp = function(role) {
  ROLE = role;
  var loginEl = document.getElementById('login');
  var appEl = document.getElementById('app');
  if (loginEl) loginEl.style.display = 'none';
  if (appEl) {
    appEl.style.display = 'block';
    document.body.style.background = 'var(--bg)';
  }
  var userBadge = document.getElementById('userBadge');
  if (userBadge) userBadge.textContent = ROLE;
  var isStaff = ROLE === 'staff';
  var isSeller = ROLE === 'seller';
  var newOrderBtn = document.getElementById('newOrderBtn');
  var receivePaymentBtn = document.getElementById('receivePaymentBtn');
  var newTradeBtn = document.getElementById('newTradeBtn');
  if (newOrderBtn) newOrderBtn.style.display = (isStaff || isSeller) ? 'inline-flex' : 'none';
  if (receivePaymentBtn) receivePaymentBtn.style.display = (isStaff || isSeller) ? 'inline-flex' : 'none';
  if (newTradeBtn) newTradeBtn.style.display = (isStaff || isSeller) ? 'inline-flex' : 'none';
};

window.checkStoredAuth = function() {
  var savedRole = localStorage.getItem('vinere_role');
  if (!savedRole || !PASSWORDS[savedRole]) return;

  // Wait for Firebase Auth to restore session before initializing
  window.firebase.auth().onAuthStateChanged(async function(user) {
    if (user) {
      ROLE = savedRole;
      showApp(savedRole);
      if (typeof initApp === 'function') {
        await initApp();
      }
    }
    // If no user, stay on login screen — user must log in again
  });
};

window.login = async function() {
  var input = $('passInput').value.trim();
  if (!input) return;
  var hash = await sha256(input);

  for (var role in PASSWORDS) {
    if (hash === PASSWORDS[role]) {
      ROLE = role;
      USER_HASH = hash;

      // Persist role for auto-login
      localStorage.setItem('vinere_role', role);

      try {
        var email = role + '@vinere.local';
        await window.firebase.auth().createUserWithEmailAndPassword(email, input);
      } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
          await window.firebase.auth().signInWithEmailAndPassword(email, input);
        } else {
          console.error('Firebase auth failed', err);
          $('loginError').textContent = 'Auth error — check console';
          showToast('Firebase auth failed: ' + err.message, 'error');
          return;
        }
      }

      showApp(role);

      await initApp();
      showToast('Welcome, ' + role, 'success', 2000);
      return;
    }
  }

  $('loginError').textContent = 'Invalid access code';
  showToast('Invalid access code', 'error');
};

/* ---------- Logout ---------- */
window.logout = function() {
  localStorage.removeItem('vinere_role');
  ROLE = null;
  USER_HASH = null;

  // Sign out from Firebase if available
  if (window.firebase && window.firebase.auth) {
    window.firebase.auth().signOut().catch(function() {});
  }

  location.reload();
};

$('loginBtn').addEventListener('click', window.login);
$('passInput').addEventListener('keydown', function(e) { if (e.key === 'Enter') window.login(); });

/* ============ DATA KEYS ============ */
var DK = {
  sr: 'Sr. No.', customer: 'CUSTOMER', style: 'Style No.', date: 'Date',
  grossWt: 'Gross Wt', diaQty: 'Dia Qty', inCt: 'IN CT', colourStone: 'COLOUR STONE',
  netWt: 'Net Wt', multiplier: 'Multiplier', pgWt: 'Pg Wt', goldAmt: 'Gold Amount',
  diamAmount: 'Diam Amount', lCharges: 'L CHARGES', laborAmt: 'Labor Amount',
  subTotal: 'SUB TOTAL', usd: '$', soldTo: 'Sold To', salePrice: 'Sale Price',
  dateSold: 'Date Sold', amountPaid: 'Amount Paid', balanceDue: 'Balance Due',
  paymentStatus: 'Payment Status', paymentLog: 'Payment Log', memoNo: 'Memo No.'
};

// Robust field getter — tries multiple key variants
function getField(row, key) {
  if (row[key] !== undefined) return row[key];
  // Try with trailing space (old data compatibility)
  if (row[key + ' '] !== undefined) return row[key + ' '];
  // Try lowercase
  var lower = key.toLowerCase();
  if (row[lower] !== undefined) return row[lower];
  // Try title case
  var title = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
  if (row[title] !== undefined) return row[title];
  return undefined;
}

var SHEET_KEYS = {
  sr: 'Sr. No.', date: 'Date', item: 'Item', vendor: 'Vendor',
  purchasePrice: 'Purchase Price', salePrice: 'Sale Price', dateSold: 'Date Sold',
  soldTo: 'Sold To', amountPaid: 'Amount Paid', balanceDue: 'Balance Due',
  paymentStatus: 'Payment Status', paymentLog: 'Payment Log', profit: 'Profit / Loss', notes: 'Notes'
};

/* ============ GLOBAL STATE ============ */
var ORDERS = [];
var TRADING = [];
var currentSearchQuery = '';

var currentView = 'orders';
var sortCol = 'sr';
var sortDesc = false;
var currentPage = 1;
var PAGE_SIZE = 50;

/* ============ DEMO DATA (fallback if Firebase is empty) ============ */
function getDemoOrders() {
  return [
    { "Sr. No.": "1", "CUSTOMER": "A. Sharma", "Style No.": "SLER-001", "Date": "2026-01-15", "Gross Wt": "12.500", "Net Wt": "10.200", "Dia Qty": "24", "IN CT": "0.48", "COLOUR STONE": "0", "Multiplier": "0.595", "Pg Wt": "6.069", "Gold Amount": "97104", "Diam Amount": "15000", "L CHARGES": "900", "Labor Amount": "9180", "SUB TOTAL": "121284", "$": "1289.19", "Sold To": "", "Sale Price": "", "Date Sold": "", "Amount Paid": "0", "Balance Due": "0", "Payment Status": "Not Sold", "Payment Log": "[]", "Memo No.": "" },
    { "Sr. No.": "2", "CUSTOMER": "R. Goldsmith", "Style No.": "RNG-002", "Date": "2026-01-18", "Gross Wt": "8.300", "Net Wt": "7.100", "Dia Qty": "18", "IN CT": "0.36", "COLOUR STONE": "2", "Multiplier": "0.595", "Pg Wt": "4.225", "Gold Amount": "67596", "Diam Amount": "12000", "L CHARGES": "900", "Labor Amount": "6390", "SUB TOTAL": "85986", "$": "914.74", "Sold To": "Priya Shah", "Sale Price": "1200", "Date Sold": "2026-02-01", "Amount Paid": "500", "Balance Due": "700", "Payment Status": "Partial", "Payment Log": "[{\"amount\":500,\"date\":\"2026-02-01\"}]", "Memo No.": "" },
    { "Sr. No.": "3", "CUSTOMER": "M. Jewellers", "Style No.": "BRCL-003", "Date": "2026-01-20", "Gross Wt": "25.000", "Net Wt": "22.500", "Dia Qty": "45", "IN CT": "0.90", "COLOUR STONE": "0", "Multiplier": "0.595", "Pg Wt": "13.388", "Gold Amount": "214200", "Diam Amount": "35000", "L CHARGES": "900", "Labor Amount": "20250", "SUB TOTAL": "269450", "$": "2866.49", "Sold To": "", "Sale Price": "", "Date Sold": "", "Amount Paid": "0", "Balance Due": "0", "Payment Status": "Not Sold", "Payment Log": "[]", "Memo No.": "" },
    { "Sr. No.": "4", "CUSTOMER": "S. Diamonds", "Style No.": "NKL-004", "Date": "2026-01-22", "Gross Wt": "15.600", "Net Wt": "13.400", "Dia Qty": "30", "IN CT": "0.60", "COLOUR STONE": "0", "Multiplier": "0.595", "Pg Wt": "7.973", "Gold Amount": "127568", "Diam Amount": "22000", "L CHARGES": "900", "Labor Amount": "12060", "SUB TOTAL": "161628", "$": "1719.45", "Sold To": "A. Sharma", "Sale Price": "2000", "Date Sold": "2026-02-10", "Amount Paid": "2000", "Balance Due": "0", "Payment Status": "Paid", "Payment Log": "[{\"amount\":2000,\"date\":\"2026-02-10\"}]", "Memo No.": "" },
    { "Sr. No.": "5", "CUSTOMER": "K. Bullion", "Style No.": "ERNG-005", "Date": "2026-01-25", "Gross Wt": "6.200", "Net Wt": "5.400", "Dia Qty": "12", "IN CT": "0.24", "COLOUR STONE": "0", "Multiplier": "0.595", "Pg Wt": "3.213", "Gold Amount": "51408", "Diam Amount": "8000", "L CHARGES": "900", "Labor Amount": "4860", "SUB TOTAL": "64268", "$": "683.70", "Sold To": "", "Sale Price": "", "Date Sold": "", "Amount Paid": "0", "Balance Due": "0", "Payment Status": "Not Sold", "Payment Log": "[]", "Memo No.": "" },
    { "Sr. No.": "6", "CUSTOMER": "P. Traders", "Style No.": "PNDT-006", "Date": "2026-01-28", "Gross Wt": "18.000", "Net Wt": "15.500", "Dia Qty": "35", "IN CT": "0.70", "COLOUR STONE": "4", "Multiplier": "0.595", "Pg Wt": "9.223", "Gold Amount": "147560", "Diam Amount": "28000", "L CHARGES": "900", "Labor Amount": "13950", "SUB TOTAL": "189510", "$": "2016.06", "Sold To": "R. Goldsmith", "Sale Price": "2500", "Date Sold": "2026-02-15", "Amount Paid": "1000", "Balance Due": "1500", "Payment Status": "Partial", "Payment Log": "[{\"amount\":1000,\"date\":\"2026-02-15\"}]", "Memo No.": "" },
    { "Sr. No.": "7", "CUSTOMER": "N. Exports", "Style No.": "BNG-007", "Date": "2026-02-01", "Gross Wt": "9.500", "Net Wt": "8.200", "Dia Qty": "20", "IN CT": "0.40", "COLOUR STONE": "0", "Multiplier": "0.595", "Pg Wt": "4.879", "Gold Amount": "78064", "Diam Amount": "14000", "L CHARGES": "900", "Labor Amount": "7380", "SUB TOTAL": "99444", "$": "1057.91", "Sold To": "", "Sale Price": "", "Date Sold": "", "Amount Paid": "0", "Balance Due": "0", "Payment Status": "Not Sold", "Payment Log": "[]", "Memo No.": "" },
    { "Sr. No.": "8", "CUSTOMER": "A. Sharma", "Style No.": "RNG-008", "Date": "2026-02-04", "Gross Wt": "11.000", "Net Wt": "9.500", "Dia Qty": "22", "IN CT": "0.44", "COLOUR STONE": "0", "Multiplier": "0.595", "Pg Wt": "5.653", "Gold Amount": "90440", "Diam Amount": "16000", "L CHARGES": "900", "Labor Amount": "8550", "SUB TOTAL": "114990", "$": "1223.30", "Sold To": "M. Jewellers", "Sale Price": "1500", "Date Sold": "2026-02-20", "Amount Paid": "0", "Balance Due": "1500", "Payment Status": "Unpaid", "Payment Log": "[]", "Memo No.": "" },
    { "Sr. No.": "9", "CUSTOMER": "R. Goldsmith", "Style No.": "SLER-009", "Date": "2026-02-08", "Gross Wt": "14.200", "Net Wt": "12.000", "Dia Qty": "28", "IN CT": "0.56", "COLOUR STONE": "0", "Multiplier": "0.595", "Pg Wt": "7.140", "Gold Amount": "114240", "Diam Amount": "21000", "L CHARGES": "900", "Labor Amount": "10800", "SUB TOTAL": "146040", "$": "1553.62", "Sold To": "", "Sale Price": "", "Date Sold": "", "Amount Paid": "0", "Balance Due": "0", "Payment Status": "Not Sold", "Payment Log": "[]", "Memo No.": "" },
    { "Sr. No.": "10", "CUSTOMER": "M. Jewellers", "Style No.": "BRCL-010", "Date": "2026-02-10", "Gross Wt": "28.000", "Net Wt": "25.000", "Dia Qty": "50", "IN CT": "1.00", "COLOUR STONE": "0", "Multiplier": "0.595", "Pg Wt": "14.875", "Gold Amount": "238000", "Diam Amount": "40000", "L CHARGES": "900", "Labor Amount": "22500", "SUB TOTAL": "300500", "$": "3196.81", "Sold To": "S. Diamonds", "Sale Price": "3500", "Date Sold": "2026-03-01", "Amount Paid": "3500", "Balance Due": "0", "Payment Status": "Paid", "Payment Log": "[{\"amount\":3500,\"date\":\"2026-03-01\"}]", "Memo No.": "" }
  ].map(function(r) { r._id = 'demo_' + r["Sr. No."]; return r; });
}

function getDemoTrading() {
  return [
    { "Sr. No.": "1", "Date": "2026-01-10", "Item": "Gold Bar 50g", "Vendor": "Bullion Corp", "Purchase Price": "3200", "Sale Price": "3600", "Date Sold": "2026-01-20", "Sold To": "A. Sharma", "Amount Paid": "3600", "Balance Due": "0", "Payment Status": "Paid", "Payment Log": "[{\"amount\":3600,\"date\":\"2026-01-20\"}]", "Notes": "Quick flip" },
    { "Sr. No.": "2", "Date": "2026-01-12", "Item": "Diamond Lot 2ct", "Vendor": "Rakesh Gems", "Purchase Price": "5000", "Sale Price": "5800", "Date Sold": "2026-02-01", "Sold To": "M. Jewellers", "Amount Paid": "3000", "Balance Due": "2800", "Payment Status": "Partial", "Payment Log": "[{\"amount\":3000,\"date\":\"2026-02-01\"}]", "Notes": "" },
    { "Sr. No.": "3", "Date": "2026-01-15", "Item": "Silver Coins", "Vendor": "K. Bullion", "Purchase Price": "800", "Sale Price": "", "Date Sold": "", "Sold To": "", "Amount Paid": "0", "Balance Due": "0", "Payment Status": "Not Sold", "Payment Log": "[]", "Notes": "Holding" }
  ].map(function(r) { r._id = 'demo_t' + r["Sr. No."]; return r; });
}

/* ============ INIT ============ */
async function initApp() {
  await doFetchOrders();
  await doFetchTrading();
  renderAll();
  initSwipeGestures();
}

/* ============ FETCH ORDERS ============ */
function normalizeRow(row) {
  var normalized = {};
  for (var key in row) {
    var cleanKey = key.trim();
    normalized[cleanKey] = row[key];
  }
  return normalized;
}

async function doFetchOrders() {
  try {
    var result = await window.fetchOrders();
    ORDERS = result.rows.map(normalizeRow);
    console.log('Loaded', ORDERS.length, 'orders');
    if (ORDERS.length === 0) {
      console.log('Firestore orders empty, loading demo data');
      ORDERS = getDemoOrders();
    }
  } catch (err) {
    console.error('Fetch orders failed', err);
    showToast('Firebase orders failed — using demo data. Check console.', 'error');
    ORDERS = getDemoOrders();
  }
}

/* ============ FETCH TRADING ============ */
async function doFetchTrading() {
  try {
    var result = await window.fetchTrading();
    TRADING = result.rows.map(normalizeRow);
    if (TRADING.length === 0) {
      console.log('Firestore trading empty, loading demo data');
      TRADING = getDemoTrading();
    }
  } catch (err) {
    console.error('Fetch trading failed', err);
    showToast('Firebase trading failed — using demo data.', 'error');
    TRADING = getDemoTrading();
  }
}

/* ============ RENDER ALL ============ */
function renderAll() {
  if (currentView === 'orders') {
    renderKPIs();
    renderTable();
    renderPagination();
    populateFilters();
  } else {
    renderTradeKPIs();
    renderTradeTable();
    renderTradePagination();
  }
  equalizeColumnWidths();
  updateSearchUI();
}

/* ============ COLUMN WIDTHS ============ */
function equalizeColumnWidths() {
  var table = document.getElementById('ordersTable');
  if (!table) return;
  var cols = table.querySelectorAll('colgroup col');
  if (!cols.length) return;

  // 13 columns: Sr, Customer, Style, Date, Gross, Net, Carat, SubTotal, $, Memo, SoldTo, SalePrice, Status
  var baseWidths = [5, 7, 10, 8, 6, 6, 6, 9, 5, 7, 11, 8, 12];
  var total = baseWidths.reduce(function(s, w) { return s + w; }, 0);

  cols.forEach(function(col, i) {
    var w = baseWidths[i] || 0;
    col.style.width = ((w / total) * 100) + '%';
  });
}

/* ============ VIEW TOGGLE ============ */
$('ordersViewBtn').addEventListener('click', function() { switchView('orders'); });
$('tradingViewBtn').addEventListener('click', function() { switchView('trading'); });

function switchView(view) {
  if (view === currentView) return;

  var isOrders = view === 'orders';
  var oldView = currentView;
  currentView = view;
  currentPage = 1;

  // Toggle button states
  $('ordersViewBtn').classList.toggle('active', isOrders);
  $('tradingViewBtn').classList.toggle('active', !isOrders);

  // Animate out old view
  var oldTable = isOrders ? $('tradingTable') : $('ordersTable');
  var oldKpi = isOrders ? $('tradeKpiGrid') : $('kpiGrid');
  var oldPag = isOrders ? $('tradePaginationBar') : $('paginationBar');
  var oldCards = isOrders ? $('tradeCardList') : $('cardList');

  if (oldTable) oldTable.classList.add('switching-out');
  if (oldKpi) oldKpi.classList.add('switching-out');
  if (oldPag) oldPag.classList.add('switching-out');
  if (oldCards) oldCards.classList.add('switching-out');

  // After fade out, switch and animate in
  setTimeout(function() {
    // Hide old view completely
    if (oldTable) {
      oldTable.style.display = 'none';
      oldTable.classList.remove('switching-out');
    }
    if (oldKpi) oldKpi.style.display = 'none';
    if (oldPag) oldPag.style.display = 'none';
    if (oldCards) {
      oldCards.classList.remove('active');
      oldCards.classList.remove('switching-out');
    }

    // Show new view
    $('ordersTable').style.display = isOrders ? 'table' : 'none';
    $('tradingTable').style.display = isOrders ? 'none' : 'table';
    $('kpiGrid').style.display = isOrders ? 'grid' : 'none';
    $('tradeKpiGrid').style.display = isOrders ? 'none' : 'grid';
    $('paginationBar').style.display = isOrders ? 'flex' : 'none';
    $('tradePaginationBar').style.display = isOrders ? 'none' : 'flex';
    $('cardList').classList.toggle('active', isOrders);
    $('tradeCardList').classList.toggle('active', !isOrders);
    $('newOrderBtn').style.display = (isOrders && ROLE !== 'customer') ? 'inline-flex' : 'none';
    $('newTradeBtn').style.display = (!isOrders && ROLE !== 'customer') ? 'inline-flex' : 'none';
    $('headerStats').style.display = 'flex';

    // Animate in new view
    var newTable = isOrders ? $('ordersTable') : $('tradingTable');
    var newKpi = isOrders ? $('kpiGrid') : $('tradeKpiGrid');
    var newPag = isOrders ? $('paginationBar') : $('tradePaginationBar');
    var newCards = isOrders ? $('cardList') : $('tradeCardList');

    if (newTable) {
      newTable.classList.add('switching-in');
      requestAnimationFrame(function() {
        newTable.classList.remove('switching-in');
        newTable.classList.add('active');
      });
    }
    if (newKpi) {
      newKpi.classList.add('switching-in');
      requestAnimationFrame(function() {
        newKpi.classList.remove('switching-in');
        newKpi.classList.add('active');
      });
    }
    if (newPag) {
      newPag.classList.add('switching-in');
      requestAnimationFrame(function() {
        newPag.classList.remove('switching-in');
        newPag.classList.add('active');
      });
    }
    if (newCards) {
      newCards.classList.add('switching-in');
      requestAnimationFrame(function() {
        newCards.classList.remove('switching-in');
        newCards.classList.add('active');
      });
    }

    renderAll();
  }, 300);
}

/* ============ SEARCH ============ */
$('search').addEventListener('input', function(e) {
  currentSearchQuery = e.target.value.trim().toLowerCase();
  currentPage = 1;
  updateSearchUI();
  renderAll();
});

function updateSearchUI() {
  var clearBtn = $('searchClear');
  var countEl = $('resultCount');
  if (clearBtn) clearBtn.style.display = currentSearchQuery ? 'flex' : 'none';

  var count = currentView === 'orders' 
    ? getFilteredOrders().length 
    : getFilteredTrading().length;

  if (countEl) {
    if (currentSearchQuery) {
      countEl.textContent = count + ' result' + (count !== 1 ? 's' : '');
      countEl.style.display = 'inline-flex';
    } else {
      countEl.style.display = 'none';
    }
  }
}

$('searchClear').addEventListener('click', function() {
  $('search').value = '';
  currentSearchQuery = '';
  currentPage = 1;
  updateSearchUI();
  renderAll();
  $('search').focus();
});

/* ============ REFRESH ============ */
$('refreshBtn').addEventListener('click', async function() {
  showToast('Refreshing data...', 'info', 1500);
  await doFetchOrders();
  await doFetchTrading();
  renderAll();
  showToast('Data refreshed', 'success', 2000);
});

/* ============ NEW ORDER ============ */
$('newOrderBtn').addEventListener('click', function() {
  if (window.openOrderPanel) window.openOrderPanel();
});

/* ============ NEW TRADE ============ */
$('newTradeBtn').addEventListener('click', function() {
  if (window.openTradePanel) window.openTradePanel();
});

/* ============ RECEIVE PAYMENT ============ */
$('receivePaymentBtn').addEventListener('click', function() {
  if (window.openPaymentSearch) window.openPaymentSearch();
});

/* ============ FILTERS ============ */
function populateFilters() {
  var customers = [...new Set(ORDERS.map(function(r) { return r[DK.customer]; }).filter(Boolean))].sort();
  var sel = $('filterCustomer');
  var current = sel.value;
  sel.innerHTML = '<option value="">All customers</option>' + customers.map(function(c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');
  sel.value = current;
}

$('clearFiltersBtn').addEventListener('click', function() {
  $('filterCustomer').value = '';
  $('filterDateFrom').value = '';
  $('filterDateTo').value = '';
  $('filterSaleStatus').value = '';
  currentPage = 1;
  renderAll();
});

/* ============ PAGINATION ============ */
function renderPagination() {
  var filtered = getFilteredOrders();
  var totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;

  $('paginationBar').innerHTML =
    '<button ' + (currentPage <= 1 ? 'disabled' : '') + ' onclick="window.changePage(1)">First</button>' +
    '<button ' + (currentPage <= 1 ? 'disabled' : '') + ' onclick="window.changePage(' + (currentPage - 1) + ')">Prev</button>' +
    '<span class="page-info">Page ' + currentPage + ' of ' + totalPages + '</span>' +
    '<button ' + (currentPage >= totalPages ? 'disabled' : '') + ' onclick="window.changePage(' + (currentPage + 1) + ')">Next</button>' +
    '<button ' + (currentPage >= totalPages ? 'disabled' : '') + ' onclick="window.changePage(' + totalPages + ')">Last</button>';
}

function renderTradePagination() {
  var filtered = getFilteredTrading();
  var totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;

  $('tradePaginationBar').innerHTML =
    '<button ' + (currentPage <= 1 ? 'disabled' : '') + ' onclick="window.changeTradePage(1)">First</button>' +
    '<button ' + (currentPage <= 1 ? 'disabled' : '') + ' onclick="window.changeTradePage(' + (currentPage - 1) + ')">Prev</button>' +
    '<span class="page-info">Page ' + currentPage + ' of ' + totalPages + '</span>' +
    '<button ' + (currentPage >= totalPages ? 'disabled' : '') + ' onclick="window.changeTradePage(' + (currentPage + 1) + ')">Next</button>' +
    '<button ' + (currentPage >= totalPages ? 'disabled' : '') + ' onclick="window.changeTradePage(' + totalPages + ')">Last</button>';
}

window.changePage = function(p) { currentPage = p; renderTable(); renderPagination(); };
window.changeTradePage = function(p) { currentPage = p; renderTradeTable(); renderTradePagination(); };

/* ============ SWIPE GESTURES (mobile) ============ */
function initSwipeGestures() {
  var touchStartX = 0;
  var touchEndX = 0;
  var minSwipe = 60;

  document.addEventListener('touchstart', function(e) {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    var diff = touchStartX - touchEndX;
    if (Math.abs(diff) < minSwipe) return;

    var filtered, totalPages;
    if (currentView === 'orders') {
      filtered = getFilteredOrders();
      totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
      if (diff > 0 && currentPage < totalPages) {
        changePage(currentPage + 1);
        showToast('Page ' + currentPage, 'info', 800);
      } else if (diff < 0 && currentPage > 1) {
        changePage(currentPage - 1);
        showToast('Page ' + currentPage, 'info', 800);
      }
    } else {
      filtered = getFilteredTrading();
      totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
      if (diff > 0 && currentPage < totalPages) {
        changeTradePage(currentPage + 1);
        showToast('Page ' + currentPage, 'info', 800);
      } else if (diff < 0 && currentPage > 1) {
        changeTradePage(currentPage - 1);
        showToast('Page ' + currentPage, 'info', 800);
      }
    }
  }
}

/* ============ FILTER LOGIC ============ */
function getFilteredOrders() {
  var rows = [...ORDERS];
  var q = currentSearchQuery;
  var customer = $('filterCustomer').value;
  var from = $('filterDateFrom').value;
  var to = $('filterDateTo').value;
  var status = $('filterSaleStatus').value;

  if (q) {
    rows = rows.filter(function(r) {
      return Object.values(r).some(function(v) { return String(v).toLowerCase().includes(q); });
    });
  }
  if (customer) rows = rows.filter(function(r) { return r[DK.customer] === customer; });
  if (from) rows = rows.filter(function(r) { return r[DK.date] >= from; });
  if (to) rows = rows.filter(function(r) { return r[DK.date] <= to; });
  if (status) rows = rows.filter(function(r) { return (r[DK.paymentStatus] || 'Not Sold') === status; });

  return rows;
}

function getFilteredTrading() {
  var rows = [...TRADING];
  var q = currentSearchQuery;
  if (q) {
    rows = rows.filter(function(r) {
      return Object.values(r).some(function(v) { return String(v).toLowerCase().includes(q); });
    });
  }
  return rows;
}

/* ============ EXPOSE GLOBALLY ============ */
window.ROLE = ROLE;
window.DK = DK;
window.SHEET_KEYS = SHEET_KEYS;
window.ORDERS = ORDERS;
window.TRADING = TRADING;
window.currentPage = currentPage;
window.PAGE_SIZE = PAGE_SIZE;
window.currentSearchQuery = currentSearchQuery;
window.getFilteredOrders = getFilteredOrders;
window.getFilteredTrading = getFilteredTrading;
window.switchView = switchView;
window.renderAll = renderAll;
window.doFetchOrders = doFetchOrders;
window.doFetchTrading = doFetchTrading;
window.equalizeColumnWidths = equalizeColumnWidths;
window.populateFilters = populateFilters;
