/* ============================================
   VINÉRE — Order Panel (Create / Edit)
   ============================================ */

import { $, fmtDate, showToast } from "./utils.js";
import { DK, ORDERS, ROLE, fetchOrders, renderAll } from "./app.js";

let editingId = null;
let currentInstallments = [];
let readOnly = false;

window.openOrderPanel = function(id) {
  editingId = id || null;
  currentInstallments = [];

  const panel = $('panel');
  const overlay = $('overlay');

  // Reset fields
  ['f_customer','f_style','f_date','f_grossWt','f_netWt','f_diaQty','f_inCt',
   'f_colourStone','f_multiplier','f_diamAmount','f_lCharges','f_memoNo',
   'f_soldTo','f_salePrice','f_dateSold'].forEach(id => $(id).value = '');
  $('f_multiplier').value = '0.595';
  $('f_lCharges').value = '900';

  currentInstallments = [];
  renderInstallments();
  updatePreview();

  $('saveMsg').textContent = '';
  $('saveMsg').style.color = '';

  // Hide all errors
  document.querySelectorAll('.field-error').forEach(el => el.textContent = '');

  if (id) {
    const order = ORDERS.find(r => r._id === id);
    if (!order) return;

    $('panelTitle').textContent = 'Edit Order #' + order[DK.sr];
    $('f_customer').value = order[DK.customer] || '';
    $('f_style').value = order[DK.style] || '';
    $('f_date').value = order[DK.date] || '';
    $('f_grossWt').value = order[DK.grossWt] || '';
    $('f_netWt').value = order[DK.netWt] || '';
    $('f_diaQty').value = order[DK.diaQty] || '';
    $('f_inCt').value = order[DK.inCt] || '';
    $('f_colourStone').value = order[DK.colourStone] || '';
    $('f_multiplier').value = order[DK.multiplier] || '0.595';
    $('f_diamAmount').value = order[DK.diamAmount] || '';
    $('f_lCharges').value = order[DK.lCharges] || '900';
    $('f_memoNo').value = order[DK.memoNo] || '';
    $('f_soldTo').value = order[DK.soldTo] || '';
    $('f_salePrice').value = order[DK.salePrice] || '';
    $('f_dateSold').value = order[DK.dateSold] || '';

    try {
      currentInstallments = JSON.parse(order[DK.paymentLog] || '[]');
    } catch { currentInstallments = []; }
    renderInstallments();

    $('deleteBtn').style.display = (ROLE === 'staff') ? 'inline-flex' : 'none';
    readOnly = ROLE === 'customer';
  } else {
    $('panelTitle').textContent = 'New Order';
    $('f_date').value = new Date().toISOString().split('T')[0];
    $('deleteBtn').style.display = 'none';
    readOnly = false;
  }

  setReadOnly(readOnly);
  updatePreview();

  overlay.style.display = 'block';
  panel.classList.add('open');
};

function setReadOnly(ro) {
  const inputs = panel.querySelectorAll('input, select');
  inputs.forEach(inp => inp.disabled = ro);
  $('saveBtn').style.display = ro ? 'none' : 'block';
  $('addInstallmentBtn').style.display = ro ? 'none' : 'block';
}

$('closePanel').addEventListener('click', closePanel);
$('overlay').addEventListener('click', closePanel);

function closePanel() {
  $('panel').classList.remove('open');
  $('overlay').style.display = 'none';
  editingId = null;
}

/* ============ LIVE PREVIEW ============ */
['f_netWt','f_multiplier','f_lCharges','f_diamAmount','f_salePrice'].forEach(id => {
  $(id).addEventListener('input', updatePreview);
});

function updatePreview() {
  const netWt = parseFloat($('f_netWt').value) || 0;
  const multiplier = parseFloat($('f_multiplier').value) || 0.595;
  const lCharges = parseFloat($('f_lCharges').value) || 900;
  const diamAmount = parseFloat($('f_diamAmount').value) || 0;
  const salePrice = parseFloat($('f_salePrice').value) || 0;

  const pgWt = netWt * multiplier;
  const goldAmt = pgWt * 16000;
  const laborAmt = netWt * lCharges;
  const subTotal = goldAmt + diamAmount + laborAmt;
  const usd = subTotal / 94;

  $('prev_pgWt').textContent = pgWt ? pgWt.toFixed(3) + ' g' : '—';
  $('prev_goldAmt').textContent = goldAmt ? '₹' + Math.round(goldAmt).toLocaleString('en-IN') : '—';
  $('prev_laborAmt').textContent = laborAmt ? '₹' + Math.round(laborAmt).toLocaleString('en-IN') : '—';
  $('prev_subTotal').textContent = subTotal ? '₹' + Math.round(subTotal).toLocaleString('en-IN') : '—';
  $('prev_usd').textContent = usd ? '$' + usd.toFixed(2) : '—';

  // Payment preview
  const totalPaid = currentInstallments.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const balance = salePrice ? salePrice - totalPaid : 0;
  let status = 'Not Sold';
  if (salePrice) {
    if (totalPaid >= salePrice) status = 'Paid';
    else if (totalPaid > 0) status = 'Partial';
    else status = 'Unpaid';
  }

  $('prev_amountPaid').textContent = totalPaid ? '$' + fmtMoney(totalPaid) : '$0';
  $('prev_balanceDue').textContent = salePrice ? '$' + fmtMoney(balance) : '—';
  $('prev_paymentStatus').textContent = status;
}

function fmtMoney(n) {
  const num = parseFloat(n);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ============ INSTALLMENTS ============ */
$('addInstallmentBtn').addEventListener('click', () => {
  const amt = parseFloat($('f_instAmount').value);
  const date = $('f_instDate').value;
  if (!amt || amt <= 0 || !date) {
    $('err_f_installment').textContent = 'Enter valid amount and date';
    return;
  }
  currentInstallments.push({ amount: amt, date });
  $('f_instAmount').value = '';
  $('f_instDate').value = '';
  $('err_f_installment').textContent = '';
  renderInstallments();
  updatePreview();
});

function renderInstallments() {
  const list = $('installmentsList');
  if (!currentInstallments.length) { list.innerHTML = ''; return; }
  list.innerHTML = currentInstallments.map((inst, i) => `
    <div class="installment-item">
      <span>$${fmtMoney(inst.amount)} · ${inst.date}</span>
      <button onclick="window.removeInst(${i})">&times;</button>
    </div>
  `).join('');
}

window.removeInst = function(idx) {
  currentInstallments.splice(idx, 1);
  renderInstallments();
  updatePreview();
};

/* ============ SAVE ============ */
$('saveBtn').addEventListener('click', async () => {
  if (readOnly) return;

  // Validation
  let valid = true;
  document.querySelectorAll('.field-error').forEach(el => el.textContent = '');

  if (!$('f_customer').value.trim()) { $('err_f_customer').textContent = 'Required'; valid = false; }
  if (!$('f_style').value.trim()) { $('err_f_style').textContent = 'Required'; valid = false; }
  if (!$('f_netWt').value.trim()) { $('err_f_netWt').textContent = 'Required'; valid = false; }

  const netWt = parseFloat($('f_netWt').value) || 0;
  const grossWt = parseFloat($('f_grossWt').value) || 0;
  if (grossWt && netWt > grossWt) { $('err_f_netWt').textContent = 'Net Wt cannot exceed Gross Wt'; valid = false; }

  const salePrice = parseFloat($('f_salePrice').value) || 0;
  const totalPaid = currentInstallments.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  if (salePrice && totalPaid > salePrice) { $('err_f_installment').textContent = 'Payments exceed sale price'; valid = false; }

  if (!valid) {
    $('saveMsg').textContent = 'Please fix the highlighted fields.';
    $('saveMsg').style.color = '#f87171';
    showToast('Please fix the highlighted fields before saving.', 'warning');
    return;
  }

  $('saveMsg').textContent = '';

  const net = parseFloat($('f_netWt').value) || 0;
  const mult = parseFloat($('f_multiplier').value) || 0.595;
  const lCharge = parseFloat($('f_lCharges').value) || 900;
  const diam = parseFloat($('f_diamAmount').value) || 0;
  const pgWt = net * mult;
  const goldAmt = pgWt * 16000;
  const laborAmt = net * lCharge;
  const subTotal = goldAmt + diam + laborAmt;
  const usd = subTotal / 94;

  let status = 'Not Sold';
  if (salePrice) {
    if (totalPaid >= salePrice) status = 'Paid';
    else if (totalPaid > 0) status = 'Partial';
    else status = 'Unpaid';
  }

  const data = {
    [DK.customer]: $('f_customer').value.trim().toUpperCase(),
    [DK.style]: $('f_style').value.trim().toUpperCase(),
    [DK.date]: $('f_date').value,
    [DK.grossWt]: $('f_grossWt').value || '',
    [DK.netWt]: $('f_netWt').value,
    [DK.diaQty]: $('f_diaQty').value || '',
    [DK.inCt]: $('f_inCt').value || '',
    [DK.colourStone]: $('f_colourStone').value || '',
    [DK.multiplier]: mult.toString(),
    [DK.pgWt]: pgWt.toFixed(3),
    [DK.goldAmt]: Math.round(goldAmt).toString(),
    [DK.diamAmount]: diam ? diam.toString() : '',
    [DK.lCharges]: lCharge.toString(),
    [DK.laborAmt]: Math.round(laborAmt).toString(),
    [DK.subTotal]: Math.round(subTotal).toString(),
    [DK.usd]: usd.toFixed(2),
    [DK.memoNo]: $('f_memoNo').value.trim().toUpperCase(),
    [DK.soldTo]: $('f_soldTo').value.trim(),
    [DK.salePrice]: salePrice ? salePrice.toString() : '',
    [DK.dateSold]: $('f_dateSold').value || '',
    [DK.amountPaid]: totalPaid.toString(),
    [DK.balanceDue]: (salePrice - totalPaid).toString(),
    [DK.paymentStatus]: status,
    [DK.paymentLog]: JSON.stringify(currentInstallments)
  };

  try {
    if (editingId) {
      const existing = ORDERS.find(r => r._id === editingId);
      data[DK.sr] = existing[DK.sr];
      await window.updateOrder(editingId, data);
      showToast(`Order #${data[DK.sr]} updated successfully`, 'success');
    } else {
      const nextSr = ORDERS.length > 0 ? Math.max(...ORDERS.map(r => parseInt(r[DK.sr]) || 0)) + 1 : 1;
      data[DK.sr] = nextSr.toString();
      await window.addOrder(data);
      showToast(`Order #${nextSr} created successfully`, 'success');
    }
    closePanel();
    await fetchOrders();
    renderAll();
  } catch (err) {
    console.error(err);
    $('saveMsg').textContent = 'Error saving. Try again.';
    showToast('Failed to save order. Please try again.', 'error');
  }
});

/* ============ DELETE ============ */
$('deleteBtn').addEventListener('click', async () => {
  if (!editingId || ROLE !== 'staff') return;
  if (!confirm('Delete this order permanently?')) return;

  const order = ORDERS.find(r => r._id === editingId);
  const srNo = order ? order[DK.sr] : '';

  try {
    await window.deleteOrder(editingId, srNo);
    showToast('Order deleted', 'success');
    closePanel();
    await fetchOrders();
    renderAll();
  } catch (err) {
    console.error(err);
    showToast('Failed to delete order', 'error');
  }
});
