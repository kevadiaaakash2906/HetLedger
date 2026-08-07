/* ============================================
   VINÉRE — Filters
   ============================================ */

import { $ } from "./utils.js";
import { renderAll } from "./app.js";

$('filterCustomer').addEventListener('change', () => { window.currentPage = 1; renderAll(); });
$('filterDateFrom').addEventListener('change', () => { window.currentPage = 1; renderAll(); });
$('filterDateTo').addEventListener('change', () => { window.currentPage = 1; renderAll(); });
$('filterSaleStatus').addEventListener('change', () => { window.currentPage = 1; renderAll(); });
