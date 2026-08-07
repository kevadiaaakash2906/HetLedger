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

window.login = async function() {
  var input = $('passInput').value.trim();
  if (!input) return;
  var hash = await sha256(input);

  for (var role in PASSWORDS) {
    if (hash === PASSWORDS[role]) {
      ROLE = role;
      USER_HASH = hash;

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

      $('login').style.display = 'none';
      $('app').style.display = 'block';
      document.body.style.background = 'var(--bg)';

      var isStaff = ROLE === 'staff';
      var isSeller = ROLE === 'seller';

      $('newOrderBtn').style.display = (isStaff || isSeller) ? 'inline-flex' : 'none';
      $('receivePaymentBtn').style.display = (isStaff || isSeller) ? 'inline-flex' : 'none';
      $('newTradeBtn').style.display = (isStaff || isSeller) ? 'inline-flex' : 'none';

      await initApp();
      showToast('Welcome, ' + role, 'success', 2000);
      return;
    }
  }

  $('loginError').textContent = 'Invalid access code';
  showToast('Invalid access code', 'error');
};

$('loginBtn').addEventListener('click', window.login);
$('passInput').addEventListener('keydown', function(e) { if (e.key === 'Enter') window.login(); });

/* ============ DATA KEYS ============ */
var DK = {
  sr: 'Sr. No.', customer: 'CUSTOMER ', style: 'Style No.', date: 'Date',
  grossWt: 'Gross Wt', diaQty: 'Dia Qty', inCt: 'IN CT', colourStone: 'COLOUR STONE',
  netWt: 'Net Wt', multiplier: 'Multiplier', pgWt: 'Pg Wt', goldAmt: 'Gold Amount',
  diamAmount: 'Diam Amount', lCharges: 'L CHARGES', laborAmt: 'Labor Amount',
  subTotal: 'SUB TOTAL', usd: '$', soldTo: 'Sold To', salePrice: 'Sale Price',
  dateSold: 'Date Sold', amountPaid: 'Amount Paid', balanceDue: 'Balance Due',
  paymentStatus: 'Payment Status', paymentLog: 'Payment Log', memoNo: 'Memo No.'
};

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
var PAGE_SIZE = 100;

/* ============ INIT ============ */
async function initApp() {
  await doFetchOrders();
  await doFetchTrading();
  renderAll();
}

/* ============ FETCH ORDERS ============ */
async function doFetchOrders() {
  try {
    var result = await window.fetchOrders();
    ORDERS = result.rows;
    console.log('Loaded', ORDERS.length, 'orders');
  } catch (err) {
    console.error('Fetch orders failed', err);
    showToast('Failed to load orders', 'error');
  }
}

/* ============ FETCH TRADING ============ */
async function doFetchTrading() {
  try {
    var result = await window.fetchTrading();
    TRADING = result.rows;
  } catch (err) {
    console.error('Fetch trading failed', err);
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
}

/* ============ COLUMN WIDTHS ============ */
function equalizeColumnWidths() {
  var table = document.getElementById('ordersTable');
  if (!table) return;
  var cols = table.querySelectorAll('colgroup col');
  if (!cols.length) return;

  var baseWidths = [5, 7, 10, 8, 6, 6, 6, 6, 9, 6, 7, 9, 7, 8];
  var visibleIndices = [];

  cols.forEach(function(col, i) {
    if (getComputedStyle(col).visibility === 'collapse') {
      col.style.width = '0%';
    } else {
      visibleIndices.push(i);
    }
  });

  if (!visibleIndices.length) return;
  var visibleTotal = visibleIndices.reduce(function(sum, i) { return sum + baseWidths[i]; }, 0);
  visibleIndices.forEach(function(i) {
    cols[i].style.width = ((baseWidths[i] / visibleTotal) * 100) + '%';
  });
}

/* ============ VIEW TOGGLE ============ */
$('ordersViewBtn').addEventListener('click', function() { switchView('orders'); });
$('tradingViewBtn').addEventListener('click', function() { switchView('trading'); });

function switchView(view) {
  currentView = view;
  currentPage = 1;
  $('ordersViewBtn').classList.toggle('active', view === 'orders');
  $('tradingViewBtn').classList.toggle('active', view === 'trading');

  $('ordersTable').style.display = view === 'orders' ? 'table' : 'none';
  $('tradingTable').style.display = view === 'trading' ? 'table' : 'none';
  $('cardList').style.display = view === 'orders' ? 'flex' : 'none';
  $('tradeCardList').style.display = view === 'trading' ? 'flex' : 'none';
  $('kpiGrid').style.display = view === 'orders' ? 'grid' : 'none';
  $('tradeKpiGrid').style.display = view === 'trading' ? 'grid' : 'none';
  $('paginationBar').style.display = view === 'orders' ? 'flex' : 'none';
  $('tradePaginationBar').style.display = view === 'trading' ? 'flex' : 'none';
  $('newOrderBtn').style.display = (view === 'orders' && ROLE !== 'customer') ? 'inline-flex' : 'none';
  $('newTradeBtn').style.display = (view === 'trading' && ROLE !== 'customer') ? 'inline-flex' : 'none';
  $('headerStats').style.display = view === 'orders' ? 'flex' : 'none';

  renderAll();
}

/* ============ SEARCH ============ */
var searchTimeout;
$('search').addEventListener('input', function(e) {
  currentSearchQuery = e.target.value.trim().toLowerCase();
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(function() {
    currentPage = 1;
    renderAll();
  }, 300);
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
