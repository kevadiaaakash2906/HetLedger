/* ============================================
   VINÉRE — App Core
   ============================================ */

/* ============ AUTH / ROLE ============ */
const PASSWORDS = {
  staff:   '25f885fa451c3c6b024fe23dbf834ceb2be6361316010ef348e7777faa78634c',
  seller:  'c60a26e1e8094121dae3acccdfdb1fffeb616bcb2e3ae68f6b18c336e6e031d7',
  customer:'9a900403ac313ba27a1bc81f0932652b8020dac92c234d98fa0b06bf0040ecfd'
};

let ROLE = null;
let USER_HASH = null;

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

window.login = async function() {
  const input = $('passInput').value.trim();
  if (!input) return;
  const hash = await sha256(input);

  for (const [role, pwdHash] of Object.entries(PASSWORDS)) {
    if (hash === pwdHash) {
      ROLE = role;
      USER_HASH = hash;
      $('login').style.display = 'none';
      $('app').style.display = 'block';
      document.body.style.background = 'var(--bg)';

      // Role-based UI
      const isStaff = ROLE === 'staff';
      const isSeller = ROLE === 'seller';

      $('newOrderBtn').style.display = (isStaff || isSeller) ? 'inline-flex' : 'none';
      $('receivePaymentBtn').style.display = (isStaff || isSeller) ? 'inline-flex' : 'none';
      $('newTradeBtn').style.display = (isStaff || isSeller) ? 'inline-flex' : 'none';

      await initApp();
      showToast(`Welcome, ${role}`, 'success', 2000);
      return;
    }
  }

  $('loginError').textContent = 'Invalid access code';
  showToast('Invalid access code', 'error');
};

$('loginBtn').addEventListener('click', window.login);
$('passInput').addEventListener('keydown', e => { if (e.key === 'Enter') window.login(); });

/* ============ DATA KEYS ============ */
export const DK = {
  sr: 'Sr. No.', customer: 'CUSTOMER ', style: 'Style No.', date: 'Date',
  grossWt: 'Gross Wt', diaQty: 'Dia Qty', inCt: 'IN CT', colourStone: 'COLOUR STONE',
  netWt: 'Net Wt', multiplier: 'Multiplier', pgWt: 'Pg Wt', goldAmt: 'Gold Amount',
  diamAmount: 'Diam Amount', lCharges: 'L CHARGES', laborAmt: 'Labor Amount',
  subTotal: 'SUB TOTAL', usd: '$', soldTo: 'Sold To', salePrice: 'Sale Price',
  dateSold: 'Date Sold', amountPaid: 'Amount Paid', balanceDue: 'Balance Due',
  paymentStatus: 'Payment Status', paymentLog: 'Payment Log', memoNo: 'Memo No.'
};

export const SHEET_KEYS = {
  sr: 'Sr. No.', date: 'Date', item: 'Item', vendor: 'Vendor',
  purchasePrice: 'Purchase Price', salePrice: 'Sale Price', dateSold: 'Date Sold',
  soldTo: 'Sold To', amountPaid: 'Amount Paid', balanceDue: 'Balance Due',
  paymentStatus: 'Payment Status', paymentLog: 'Payment Log', profit: 'Profit / Loss', notes: 'Notes'
};

/* ============ GLOBAL STATE ============ */
export let ORDERS = [];
export let TRADING = [];
export let currentSearchQuery = '';

let currentView = 'orders';
let sortCol = 'sr';
let sortDesc = false;
let currentPage = 1;
const PAGE_SIZE = 25;

/* ============ INIT ============ */
async function initApp() {
  await fetchOrders();
  await fetchTrading();
  renderAll();
}

/* ============ FETCH ORDERS ============ */
export async function fetchOrders() {
  try {
    const { rows } = await window.fetchOrders();
    ORDERS = rows;
    console.log('Loaded', ORDERS.length, 'orders');
  } catch (err) {
    console.error('Fetch orders failed', err);
    showToast('Failed to load orders', 'error');
  }
}

/* ============ FETCH TRADING ============ */
export async function fetchTrading() {
  try {
    const { rows } = await window.fetchTrading();
    TRADING = rows;
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
  const table = document.getElementById('ordersTable');
  if (!table) return;
  const cols = table.querySelectorAll('colgroup col');
  if (!cols.length) return;

  const baseWidths = [5, 7, 10, 8, 6, 6, 6, 6, 9, 6, 7, 9, 7, 8];
  const visibleIndices = [];

  cols.forEach((col, i) => {
    if (getComputedStyle(col).visibility === 'collapse') {
      col.style.width = '0%';
    } else {
      visibleIndices.push(i);
    }
  });

  if (!visibleIndices.length) return;
  const visibleTotal = visibleIndices.reduce((sum, i) => sum + baseWidths[i], 0);
  visibleIndices.forEach(i => {
    cols[i].style.width = ((baseWidths[i] / visibleTotal) * 100) + '%';
  });
}

/* ============ VIEW TOGGLE ============ */
$('ordersViewBtn').addEventListener('click', () => switchView('orders'));
$('tradingViewBtn').addEventListener('click', () => switchView('trading'));

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
let searchTimeout;
$('search').addEventListener('input', (e) => {
  currentSearchQuery = e.target.value.trim().toLowerCase();
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage = 1;
    renderAll();
  }, 300);
});

/* ============ REFRESH ============ */
$('refreshBtn').addEventListener('click', async () => {
  showToast('Refreshing data...', 'info', 1500);
  await fetchOrders();
  await fetchTrading();
  renderAll();
  showToast('Data refreshed', 'success', 2000);
});

/* ============ NEW ORDER ============ */
$('newOrderBtn').addEventListener('click', () => {
  if (window.openOrderPanel) window.openOrderPanel();
});

/* ============ NEW TRADE ============ */
$('newTradeBtn').addEventListener('click', () => {
  if (window.openTradePanel) window.openTradePanel();
});

/* ============ RECEIVE PAYMENT ============ */
$('receivePaymentBtn').addEventListener('click', () => {
  if (window.openPaymentSearch) window.openPaymentSearch();
});

/* ============ FILTERS ============ */
function populateFilters() {
  const customers = [...new Set(ORDERS.map(r => r[DK.customer]).filter(Boolean))].sort();
  const sel = $('filterCustomer');
  const current = sel.value;
  sel.innerHTML = '<option value="">All customers</option>' + customers.map(c => `<option value="${c}">${c}</option>`).join('');
  sel.value = current;
}

$('clearFiltersBtn').addEventListener('click', () => {
  $('filterCustomer').value = '';
  $('filterDateFrom').value = '';
  $('filterDateTo').value = '';
  $('filterSaleStatus').value = '';
  currentPage = 1;
  renderAll();
});

/* ============ PAGINATION ============ */
function renderPagination() {
  const filtered = getFilteredOrders();
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;

  $('paginationBar').innerHTML = `
    <button ${currentPage <= 1 ? 'disabled' : ''} onclick="window.changePage(${currentPage - 1})">Prev</button>
    <span class="page-info">Page ${currentPage} of ${totalPages}</span>
    <button ${currentPage >= totalPages ? 'disabled' : ''} onclick="window.changePage(${currentPage + 1})">Next</button>
  `;
}

function renderTradePagination() {
  const filtered = getFilteredTrading();
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;

  $('tradePaginationBar').innerHTML = `
    <button ${currentPage <= 1 ? 'disabled' : ''} onclick="window.changeTradePage(${currentPage - 1})">Prev</button>
    <span class="page-info">Page ${currentPage} of ${totalPages}</span>
    <button ${currentPage >= totalPages ? 'disabled' : ''} onclick="window.changeTradePage(${currentPage + 1})">Next</button>
  `;
}

window.changePage = (p) => { currentPage = p; renderTable(); renderPagination(); };
window.changeTradePage = (p) => { currentPage = p; renderTradeTable(); renderTradePagination(); };

/* ============ FILTER LOGIC ============ */
function getFilteredOrders() {
  let rows = [...ORDERS];
  const q = currentSearchQuery;
  const customer = $('filterCustomer').value;
  const from = $('filterDateFrom').value;
  const to = $('filterDateTo').value;
  const status = $('filterSaleStatus').value;

  if (q) {
    rows = rows.filter(r =>
      Object.values(r).some(v => String(v).toLowerCase().includes(q))
    );
  }
  if (customer) rows = rows.filter(r => r[DK.customer] === customer);
  if (from) rows = rows.filter(r => r[DK.date] >= from);
  if (to) rows = rows.filter(r => r[DK.date] <= to);
  if (status) rows = rows.filter(r => (r[DK.paymentStatus] || 'Not Sold') === status);

  return rows;
}

function getFilteredTrading() {
  let rows = [...TRADING];
  const q = currentSearchQuery;
  if (q) {
    rows = rows.filter(r =>
      Object.values(r).some(v => String(v).toLowerCase().includes(q))
    );
  }
  return rows;
}
Object.assign(window, {
  ROLE, DK, SHEET_KEYS, ORDERS, TRADING,
  currentPage, PAGE_SIZE,
  getFilteredOrders, getFilteredTrading,
  switchView, renderAll,
  fetchOrders, fetchTrading
});


