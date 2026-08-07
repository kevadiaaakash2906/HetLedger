/* ============================================
   VINÉRE — Table Renderers
   ============================================ */

function renderTable() {
  var tbody = $('tbody');
  var filtered = getFilteredOrders();
  var start = (currentPage - 1) * PAGE_SIZE;
  var pageRows = filtered.slice(start, start + PAGE_SIZE);
  var q = window.currentSearchQuery || '';

  if (!pageRows.length) {
    tbody.innerHTML = '<tr><td colspan="14" style="text-align:center;padding:40px;color:var(--text-dim)">No orders found</td></tr>';
    return;
  }

  tbody.innerHTML = pageRows.map(function(r) {
    var sr = r[DK.sr];
    var status = (r[DK.paymentStatus] || 'Not Sold').trim();
    var statusClass = {
      'Not Sold': 'status-not-sold',
      'Unpaid': 'status-unpaid',
      'Partial': 'status-partial',
      'Paid': 'status-paid'
    }[status] || 'status-not-sold';

    return '<tr data-id="' + r._id + '" data-sr="' + sr + '" style="cursor:pointer">' +
      '<td class="num">' + sr + '</td>' +
      '<td>' + highlightText(r[DK.customer] || '', q) + '</td>' +
      '<td><strong>' + highlightText(r[DK.style] || '', q) + '</strong></td>' +
      '<td>' + fmtDate(r[DK.date]) + '</td>' +
      '<td class="num">' + (r[DK.grossWt] || '') + '</td>' +
      '<td class="num">' + (r[DK.netWt] || '') + '</td>' +
      '<td class="num">' + (r[DK.inCt] || '') + '</td>' +
      '<td class="num">' + (r[DK.colourStone] || '') + '</td>' +
      '<td class="num">' + (r[DK.subTotal] ? '₹' + r[DK.subTotal] : '') + '</td>' +
      '<td class="num">' + (r[DK.usd] ? '$' + r[DK.usd] : '') + '</td>' +
      '<td>' + highlightText(r[DK.memoNo] || '', q) + '</td>' +
      '<td>' + highlightText(r[DK.soldTo] || '', q) + '</td>' +
      '<td class="num">' + (r[DK.salePrice] ? '$' + fmtMoney(r[DK.salePrice]) : '') + '</td>' +
      '<td><span class="status-badge ' + statusClass + '">' + status + '</span></td>' +
      '</tr>';
  }).join('');

  tbody.querySelectorAll('tr[data-id]').forEach(function(tr) {
    tr.addEventListener('click', function() {
      if (window.openOrderPanel) window.openOrderPanel(tr.dataset.id);
    });
  });

  renderCards(pageRows);
}

function renderCards(rows) {
  var container = $('cardList');
  var q = window.currentSearchQuery || '';

  container.innerHTML = rows.map(function(r) {
    var status = (r[DK.paymentStatus] || 'Not Sold').trim();
    return '<div class="order-card" data-id="' + r._id + '">' +
      '<div class="card-header">' +
      '<span class="card-title">' + highlightText(r[DK.style] || '', q) + '</span>' +
      '<span class="status-badge status-' + status.toLowerCase().replace(' ', '-') + '">' + status + '</span>' +
      '</div>' +
      '<div class="card-meta">' + (r[DK.customer] || '') + ' · ' + fmtDate(r[DK.date]) + ' · Sr. ' + r[DK.sr] + '</div>' +
      '<div class="card-row"><span class="card-label">Net Wt</span><span class="card-value">' + (r[DK.netWt] || '') + 'g</span></div>' +
      '<div class="card-row"><span class="card-label">Sub Total</span><span class="card-value">₹' + (r[DK.subTotal] || '') + '</span></div>' +
      '<div class="card-row"><span class="card-label">USD</span><span class="card-value">$' + (r[DK.usd] || '') + '</span></div>' +
      '<div class="card-row"><span class="card-label">Sold To</span><span class="card-value">' + (r[DK.soldTo] || '—') + '</span></div>' +
      '<div class="card-row"><span class="card-label">Sale Price</span><span class="card-value">$' + (r[DK.salePrice] || '') + '</span></div>' +
      '<div class="card-row"><span class="card-label">Balance</span><span class="card-value">$' + (r[DK.balanceDue] || '0') + '</span></div>' +
      '</div>';
  }).join('');

  container.querySelectorAll('.order-card').forEach(function(card) {
    card.addEventListener('click', function() {
      if (window.openOrderPanel) window.openOrderPanel(card.dataset.id);
    });
  });
}

function renderTradeTable() {
  var tbody = $('tradeTbody');
  var filtered = getFilteredTrading();
  var start = (currentPage - 1) * PAGE_SIZE;
  var pageRows = filtered.slice(start, start + PAGE_SIZE);
  var K = SHEET_KEYS;
  var q = window.currentSearchQuery || '';

  if (!pageRows.length) {
    tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:40px;color:var(--text-dim)">No trades found</td></tr>';
    return;
  }

  tbody.innerHTML = pageRows.map(function(r) {
    var purchase = parseFloat(r[K.purchasePrice]) || 0;
    var sale = parseFloat(r[K.salePrice]) || 0;
    var profit = sale ? sale - purchase : 0;
    var status = (r[K.paymentStatus] || 'Not Sold').trim();
    var statusClass = {
      'Not Sold': 'status-not-sold',
      'Unpaid': 'status-unpaid',
      'Partial': 'status-partial',
      'Paid': 'status-paid'
    }[status] || 'status-not-sold';

    return '<tr data-id="' + r._id + '" style="cursor:pointer">' +
      '<td class="num">' + r[K.sr] + '</td>' +
      '<td>' + fmtDate(r[K.date]) + '</td>' +
      '<td><strong>' + highlightText(r[K.item] || '', q) + '</strong></td>' +
      '<td>' + highlightText(r[K.vendor] || '', q) + '</td>' +
      '<td class="num">$' + fmtMoney(purchase) + '</td>' +
      '<td class="num">' + (sale ? '$' + fmtMoney(sale) : '') + '</td>' +
      '<td>' + fmtDate(r[K.dateSold]) + '</td>' +
      '<td>' + highlightText(r[K.soldTo] || '', q) + '</td>' +
      '<td class="num">$' + fmtMoney(r[K.amountPaid]) + '</td>' +
      '<td class="num">$' + fmtMoney(r[K.balanceDue]) + '</td>' +
      '<td><span class="status-badge ' + statusClass + '">' + status + '</span></td>' +
      '<td class="num" style="color:' + (profit >= 0 ? 'var(--success)' : 'var(--error)') + '">' +
      (sale ? (profit >= 0 ? '+' : '-') + '$' + fmtMoney(Math.abs(profit)) : '') + '</td>' +
      '</tr>';
  }).join('');

  tbody.querySelectorAll('tr[data-id]').forEach(function(tr) {
    tr.addEventListener('click', function() {
      if (window.openEditTrade) window.openEditTrade(tr.dataset.id);
    });
  });

  renderTradeCards(pageRows);
}

function renderTradeCards(rows) {
  var container = $('tradeCardList');
  var K = SHEET_KEYS;
  var q = window.currentSearchQuery || '';

  container.innerHTML = rows.map(function(r) {
    var purchase = parseFloat(r[K.purchasePrice]) || 0;
    var sale = parseFloat(r[K.salePrice]) || 0;
    var profit = sale ? sale - purchase : 0;
    return '<div class="order-card" data-id="' + r._id + '">' +
      '<div class="card-header">' +
      '<span class="card-title">' + highlightText(r[K.item] || '', q) + '</span>' +
      '<span class="card-value" style="color:' + (profit >= 0 ? 'var(--success)' : 'var(--error)') + '">' +
      (sale ? (profit >= 0 ? '+' : '-') + '$' + fmtMoney(Math.abs(profit)) : '') + '</span>' +
      '</div>' +
      '<div class="card-meta">' + (r[K.vendor] || '') + ' · ' + fmtDate(r[K.date]) + '</div>' +
      '<div class="card-row"><span class="card-label">Purchase</span><span class="card-value">$' + fmtMoney(purchase) + '</span></div>' +
      '<div class="card-row"><span class="card-label">Sale</span><span class="card-value">' + (sale ? '$' + fmtMoney(sale) : '—') + '</span></div>' +
      '<div class="card-row"><span class="card-label">Paid</span><span class="card-value">$' + fmtMoney(r[K.amountPaid]) + '</span></div>' +
      '<div class="card-row"><span class="card-label">Balance</span><span class="card-value">$' + fmtMoney(r[K.balanceDue]) + '</span></div>' +
      '</div>';
  }).join('');

  container.querySelectorAll('.order-card').forEach(function(card) {
    card.addEventListener('click', function() {
      if (window.openEditTrade) window.openEditTrade(card.dataset.id);
    });
  });
}

window.renderTable = renderTable;
window.renderTradeTable = renderTradeTable;
