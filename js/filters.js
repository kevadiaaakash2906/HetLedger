/* ============================================
   VINÉRE — Filters
   ============================================ */



$('filterCustomer').addEventListener('change', () => { window.currentPage = 1; renderAll(); });
$('filterDateFrom').addEventListener('change', () => { window.currentPage = 1; renderAll(); });
$('filterDateTo').addEventListener('change', () => { window.currentPage = 1; renderAll(); });
$('filterSaleStatus').addEventListener('change', () => { window.currentPage = 1; renderAll(); });
