/* ============================================
   VINÉRE — Receive Payment Modal
   ============================================ */


window.openPaymentSearch = function() {
  $('paymentSearchOverlay').style.display = 'block';
  $('paymentSearchModal').classList.add('open');
  $('paySearchInput').value = '';
  $('paySearchInput').focus();
  renderPayResults('');
};

$('closePaymentSearch').addEventListener('click', closePaymentSearch);
$('paymentSearchOverlay').addEventListener('click', closePaymentSearch);

function closePaymentSearch() {
  $('paymentSearchModal').classList.remove('open');
  $('paymentSearchOverlay').style.display = 'none';
}

$('paySearchInput').addEventListener('input', (e) => {
  renderPayResults(e.target.value.trim().toLowerCase());
});

function renderPayResults(query) {
  const container = $('payResults');
  let rows = ORDERS.filter(r => {
    const status = (r[DK.paymentStatus] || 'Not Sold').trim();
    return status !== 'Paid' && status !== 'Not Sold';
  });

  if (query) {
    rows = rows.filter(r =>
      Object.values(r).some(v => String(v).toLowerCase().includes(query))
    );
  }

  if (!rows.length) {
    container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-dim)">No pending payments found</div>';
    return;
  }

  container.innerHTML = rows.map(r => {
    const balance = parseFloat(r[DK.balanceDue]) || 0;
    return `
    <div class="pay-result-item" data-id="${r._id}">
      <div class="pay-result-header">
        <span class="pay-result-title">${r[DK.style]} · ${r[DK.customer]}</span>
        <span style="color:var(--warning);font-family:var(--font-mono)">$${fmtMoney(balance)}</span>
      </div>
      <div class="pay-result-meta">Sr. ${r[DK.sr]} · Sold To: ${r[DK.soldTo] || '—'} · Status: ${r[DK.paymentStatus]}</div>
    </div>`;
  }).join('');

  container.querySelectorAll('.pay-result-item').forEach(item => {
    item.addEventListener('click', () => openPaymentForm(item.dataset.id));
  });
}

function openPaymentForm(id) {
  closePaymentSearch();
  const order = ORDERS.find(r => r._id === id);
  if (!order) return;

  const amount = prompt(`Record payment for Order #${order[DK.sr]} — ${order[DK.style]}\nBalance Due: $${fmtMoney(order[DK.balanceDue])}\n\nEnter amount received:`);
  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return;

  const date = prompt('Payment date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
  if (!date) return;

  let installments = [];
  try { installments = JSON.parse(order[DK.paymentLog] || '[]'); } catch { installments = []; }
  installments.push({ amount: parseFloat(amount), date });

  const totalPaid = installments.reduce((s, i) => s + i.amount, 0);
  const salePrice = parseFloat(order[DK.salePrice]) || 0;
  const balance = salePrice - totalPaid;

  let status = 'Unpaid';
  if (totalPaid >= salePrice) status = 'Paid';
  else if (totalPaid > 0) status = 'Partial';

  const data = {
    ...order,
    [DK.amountPaid]: totalPaid.toString(),
    [DK.balanceDue]: balance.toString(),
    [DK.paymentStatus]: status,
    [DK.paymentLog]: JSON.stringify(installments)
  };

  window.updateOrder(id, data).then(() => {
    showToast(`Payment of $${fmtMoney(amount)} recorded for order #${order[DK.sr]}`, 'success');
    return fetchOrders();
  }).then(() => renderAll()).catch(err => {
    console.error(err);
    showToast('Failed to record payment', 'error');
  });
}
