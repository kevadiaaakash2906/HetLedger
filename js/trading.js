/* ============================================
   VINÉRE — Trading Panel (Create / Edit)
   ============================================ */

import { $, fmtDate, showToast } from "./utils.js";
import { SHEET_KEYS, TRADING, ROLE, fetchTrading, renderAll } from "./app.js";

let editingTradeId = null;
let currentTradeInstallments = [];

window.openTradePanel = function() {
  editingTradeId = null;
  currentTradeInstallments = [];
  resetTradePanel();
  $('tradePanelTitle').textContent = 'New Trade';
  $('deleteTradeBtn').style.display = 'none';
  $('t_date').value = new Date().toISOString().split('T')[0];

  $('tradeOverlay').style.display = 'block';
  $('tradePanel').classList.add('open');
};

window.openEditTrade = function(id) {
  const trade = TRADING.find(r => r._id === id);
  if (!trade) return;

  editingTradeId = id;
  currentTradeInstallments = [];

  resetTradePanel();
  $('tradePanelTitle').textContent = 'Edit Trade #' + trade[SHEET_KEYS.sr];

  $('t_item').value = trade[SHEET_KEYS.item] || '';
  $('t_vendor').value = trade[SHEET_KEYS.vendor] || '';
  $('t_date').value = trade[SHEET_KEYS.date] || '';
  $('t_purchasePrice').value = trade[SHEET_KEYS.purchasePrice] || '';
  $('t_salePrice').value = trade[SHEET_KEYS.salePrice] || '';
  $('t_dateSold').value = trade[SHEET_KEYS.dateSold] || '';
  $('t_soldTo').value = trade[SHEET_KEYS.soldTo] || '';
  $('t_notes').value = trade[SHEET_KEYS.notes] || '';

  try { currentTradeInstallments = JSON.parse(trade[SHEET_KEYS.paymentLog] || '[]'); } catch { currentTradeInstallments = []; }
  renderTradeInstallments();
  updateTradePreview();

  // SELLER DELETE FIX: allow staff OR seller to delete
  $('deleteTradeBtn').style.display = (ROLE === 'staff' || ROLE === 'seller') ? 'inline-flex' : 'none';

  $('tradeOverlay').style.display = 'block';
  $('tradePanel').classList.add('open');
};

function resetTradePanel() {
  ['t_item','t_vendor','t_date','t_purchasePrice','t_salePrice','t_dateSold','t_soldTo','t_notes'].forEach(id => $(id).value = '');
  currentTradeInstallments = [];
  renderTradeInstallments();
  updateTradePreview();
  $('tradeSaveMsg').textContent = '';
  document.querySelectorAll('[id^="err_t_"]').forEach(el => el.textContent = '');
}

$('closeTradePanel').addEventListener('click', closeTradePanel);
$('tradeOverlay').addEventListener('click', closeTradePanel);

function closeTradePanel() {
  $('tradePanel').classList.remove('open');
  $('tradeOverlay').style.display = 'none';
  editingTradeId = null;
}

/* ============ LIVE PREVIEW ============ */
['t_purchasePrice','t_salePrice'].forEach(id => {
  $(id).addEventListener('input', updateTradePreview);
});

function updateTradePreview() {
  const purchase = parseFloat($('t_purchasePrice').value) || 0;
  const sale = parseFloat($('t_salePrice').value) || 0;
  const profit = sale ? sale - purchase : 0;

  const totalPaid = currentTradeInstallments.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const balance = sale ? sale - totalPaid : 0;
  let status = 'Not Sold';
  if (sale) {
    if (totalPaid >= sale) status = 'Paid';
    else if (totalPaid > 0) status = 'Partial';
    else status = 'Unpaid';
  }

  $('t_prev_profit').textContent = sale ? (profit >= 0 ? '+' : '-') + '$' + fmtMoney(Math.abs(profit)) : '—';
  $('t_prev_profit').style.color = sale ? (profit >= 0 ? 'var(--success)' : 'var(--error)') : 'var(--text-dim)';
  $('t_prev_amountPaid').textContent = '$' + fmtMoney(totalPaid);
  $('t_prev_balanceDue').textContent = sale ? '$' + fmtMoney(balance) : '—';
  $('t_prev_paymentStatus').textContent = status;
}

function fmtMoney(n) {
  const num = parseFloat(n);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ============ INSTALLMENTS ============ */
$('addTradeInstallmentBtn').addEventListener('click', () => {
  const amt = parseFloat($('t_instAmount').value);
  const date = $('t_instDate').value;
  if (!amt || amt <= 0 || !date) {
    $('err_t_installment').textContent = 'Enter valid amount and date';
    return;
  }
  currentTradeInstallments.push({ amount: amt, date });
  $('t_instAmount').value = '';
  $('t_instDate').value = '';
  $('err_t_installment').textContent = '';
  renderTradeInstallments();
  updateTradePreview();
});

function renderTradeInstallments() {
  const list = $('tradeInstallmentsList');
  if (!currentTradeInstallments.length) { list.innerHTML = ''; return; }
  list.innerHTML = currentTradeInstallments.map((inst, i) => `
    <div class="installment-item">
      <span>$${fmtMoney(inst.amount)} · ${inst.date}</span>
      <button onclick="window.removeTradeInst(${i})">&times;</button>
    </div>
  `).join('');
}

window.removeTradeInst = function(idx) {
  currentTradeInstallments.splice(idx, 1);
  renderTradeInstallments();
  updateTradePreview();
};

/* ============ SAVE ============ */
$('saveTradeBtn').addEventListener('click', async () => {
  document.querySelectorAll('[id^="err_t_"]').forEach(el => el.textContent = '');

  let valid = true;
  if (!$('t_item').value.trim()) { $('err_t_item').textContent = 'Required'; valid = false; }
  if (!$('t_vendor').value.trim()) { $('err_t_vendor').textContent = 'Required'; valid = false; }

  const purchaseStr = $('t_purchasePrice').value.trim();
  if (purchaseStr === '' || isNaN(parseFloat(purchaseStr)) || parseFloat(purchaseStr) < 0) {
    $('err_t_purchasePrice').textContent = 'Enter valid amount'; valid = false;
  }

  const saleStr = $('t_salePrice').value.trim();
  const totalPaid = currentTradeInstallments.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const salePrice = saleStr === '' ? 0 : parseFloat(saleStr) || 0;

  if (totalPaid > 0 && saleStr === '') {
    $('err_t_installment').textContent = 'Need sale price for payments'; valid = false;
  } else if (saleStr !== '' && totalPaid > salePrice) {
    $('err_t_installment').textContent = 'Payments exceed sale price'; valid = false;
  }

  if (!valid) {
    $('tradeSaveMsg').textContent = 'Please fix the highlighted fields.';
    showToast('Please fix the highlighted fields before saving.', 'warning');
    return;
  }

  $('tradeSaveMsg').textContent = '';

  const purchase = parseFloat(purchaseStr) || 0;
  let status = 'Not Sold';
  if (salePrice) {
    if (totalPaid >= salePrice) status = 'Paid';
    else if (totalPaid > 0) status = 'Partial';
    else status = 'Unpaid';
  }

  const data = {
    [SHEET_KEYS.date]: $('t_date').value,
    [SHEET_KEYS.item]: $('t_item').value.trim(),
    [SHEET_KEYS.vendor]: $('t_vendor').value.trim(),
    [SHEET_KEYS.purchasePrice]: purchase.toString(),
    [SHEET_KEYS.salePrice]: salePrice ? salePrice.toString() : '',
    [SHEET_KEYS.dateSold]: $('t_dateSold').value || '',
    [SHEET_KEYS.soldTo]: $('t_soldTo').value.trim(),
    [SHEET_KEYS.amountPaid]: totalPaid.toString(),
    [SHEET_KEYS.balanceDue]: (salePrice - totalPaid).toString(),
    [SHEET_KEYS.paymentStatus]: status,
    [SHEET_KEYS.paymentLog]: JSON.stringify(currentTradeInstallments),
    [SHEET_KEYS.notes]: $('t_notes').value.trim()
  };

  try {
    if (editingTradeId) {
      const existing = TRADING.find(r => r._id === editingTradeId);
      data[SHEET_KEYS.sr] = existing[SHEET_KEYS.sr];
      await window.updateTrading(editingTradeId, data);
      showToast(`Trade #${data[SHEET_KEYS.sr]} updated successfully`, 'success');
    } else {
      const nextSr = TRADING.length > 0 ? Math.max(...TRADING.map(r => parseInt(r[SHEET_KEYS.sr]) || 0)) + 1 : 1;
      data[SHEET_KEYS.sr] = nextSr.toString();
      await window.addTrading(data);
      showToast(`Trade #${nextSr} created successfully`, 'success');
    }
    closeTradePanel();
    await fetchTrading();
    renderAll();
  } catch (err) {
    console.error(err);
    $('tradeSaveMsg').textContent = 'Error saving. Try again.';
    showToast('Failed to save trade. Please try again.', 'error');
  }
});

/* ============ DELETE ============ */
$('deleteTradeBtn').addEventListener('click', async () => {
  if (!editingTradeId) return;
  if (!confirm('Delete this trade permanently?')) return;

  const trade = TRADING.find(r => r._id === editingTradeId);
  const srNo = trade ? trade[SHEET_KEYS.sr] : '';

  try {
    await window.deleteTrading(editingTradeId, srNo);
    showToast('Trade deleted', 'success');
    closeTradePanel();
    await fetchTrading();
    renderAll();
  } catch (err) {
    console.error(err);
    showToast('Failed to delete trade', 'error');
  }
});
