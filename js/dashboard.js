/* ============================================
   VINÉRE — Dashboard / KPI Cards
   ============================================ */


export function renderKPIs() {
  const sold = ORDERS.filter(r => String(r[DK.salePrice] ?? '').trim() !== '');
  const notSold = ORDERS.filter(r => String(r[DK.salePrice] ?? '').trim() === '');

  const totalRevenue = sold.reduce((s, r) => s + (parseFloat(r[DK.salePrice]) || 0), 0);
  const totalCost = sold.reduce((s, r) => s + (parseFloat(r[DK.usd]) || 0), 0);
  const profit = totalRevenue - totalCost;

  const totalCollected = ORDERS.reduce((s, r) => s + (parseFloat(r[DK.amountPaid]) || 0), 0);
  const totalOutstanding = ORDERS.reduce((s, r) => s + (parseFloat(r[DK.balanceDue]) || 0), 0);

  const stockCount = notSold.length;
  const stockCost = notSold.reduce((s, r) => s + (parseFloat(r[DK.usd]) || 0), 0);

  $('hstat_pl').textContent = (profit >= 0 ? '+' : '-') + '$' + Math.abs(profit).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  $('hstat_stockCount').textContent = stockCount;
  $('hstat_stockCost').textContent = '$' + stockCost.toLocaleString('en-IN', { maximumFractionDigits: 2 });

  $('kpiGrid').innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">Total Revenue</div>
      <div class="kpi-value">$${fmtMoney(totalRevenue)}</div>
      <div class="kpi-sub">from ${sold.length} sold items</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Cost</div>
      <div class="kpi-value">$${fmtMoney(totalCost)}</div>
      <div class="kpi-sub">manufacturing + labor</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Gross Profit / Loss</div>
      <div class="kpi-value" style="color:${profit >= 0 ? 'var(--success)' : 'var(--error)'}">${profit >= 0 ? '+' : '-'}$${fmtMoney(Math.abs(profit))}</div>
      <div class="kpi-sub">revenue minus cost</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Amount Collected</div>
      <div class="kpi-value">$${fmtMoney(totalCollected)}</div>
      <div class="kpi-sub">payments received</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Outstanding Balance</div>
      <div class="kpi-value" style="color:var(--warning)">$${fmtMoney(totalOutstanding)}</div>
      <div class="kpi-sub">across all orders</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Stock on Hand</div>
      <div class="kpi-value">${stockCount}</div>
      <div class="kpi-sub">unsold items worth $${fmtMoney(stockCost)}</div>
    </div>
  `;
}

export function renderTradeKPIs() {
  const K = SHEET_KEYS;
  const sold = TRADING.filter(r => String(r[K.salePrice] ?? '').trim() !== '');
  const totalInvested = TRADING.reduce((s, r) => s + (parseFloat(r[K.purchasePrice]) || 0), 0);
  const totalSales = sold.reduce((s, r) => s + (parseFloat(r[K.salePrice]) || 0), 0);
  const netPL = sold.reduce((s, r) => s + ((parseFloat(r[K.salePrice]) || 0) - (parseFloat(r[K.purchasePrice]) || 0)), 0);
  const collected = TRADING.reduce((s, r) => s + (parseFloat(r[K.amountPaid]) || 0), 0);
  const outstanding = TRADING.reduce((s, r) => s + (parseFloat(r[K.balanceDue]) || 0), 0);

  $('tradeKpiGrid').innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">Total Trades</div>
      <div class="kpi-value">${TRADING.length}</div>
      <div class="kpi-sub">buy & sell records</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Invested</div>
      <div class="kpi-value">$${fmtMoney(totalInvested)}</div>
      <div class="kpi-sub">capital deployed</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Sales</div>
      <div class="kpi-value">$${fmtMoney(totalSales)}</div>
      <div class="kpi-sub">revenue from sold items</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Net P/L</div>
      <div class="kpi-value" style="color:${netPL >= 0 ? 'var(--success)' : 'var(--error)'}">${netPL >= 0 ? '+' : '-'}$${fmtMoney(Math.abs(netPL))}</div>
      <div class="kpi-sub">closed trades only</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Collected</div>
      <div class="kpi-value">$${fmtMoney(collected)}</div>
      <div class="kpi-sub">payments received</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Outstanding</div>
      <div class="kpi-value" style="color:var(--warning)">$${fmtMoney(outstanding)}</div>
      <div class="kpi-sub">balance due across all</div>
    </div>
  `;
}
Object.assign(window, { renderKPIs, renderTradeKPIs });
