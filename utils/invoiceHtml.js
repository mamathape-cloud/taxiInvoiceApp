import { amountToWords } from './amountToWords';
import { escapeHtml } from './htmlEscape';

function formatDisplayDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function formatMoney(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return '0.00';
  return x.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function descriptionToHtml(description) {
  const text = escapeHtml(description || '');
  return text.split('\n').map((line) => `<div class="desc-line">${line || '&nbsp;'}</div>`).join('');
}

/**
 * @param {object} company
 * @param {object} invoice
 * @returns {string}
 */
export function buildInvoiceHtml(company, invoice) {
  const logoUri = company?.logo || '';
  const sigUri = company?.signature || '';
  const logoBlock = logoUri
    ? `<img src="${escapeHtml(logoUri)}" class="logo" alt="" />`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: #111; margin: 0; padding: 24px; font-size: 14px; }
    .header-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 2px solid #1a237e; padding-bottom: 16px; margin-bottom: 20px; }
    .company-left { flex: 1; }
    .logo { max-height: 64px; max-width: 160px; object-fit: contain; margin-bottom: 8px; }
    .company-name { font-size: 20px; font-weight: 700; color: #1a237e; margin: 0 0 6px 0; }
    .muted { color: #444; line-height: 1.5; margin: 2px 0; }
    .tax-title { font-size: 18px; font-weight: 700; text-align: right; color: #1a237e; white-space: nowrap; }
    .section { margin: 18px 0; }
    .section-title { font-weight: 700; margin-bottom: 8px; color: #1a237e; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
    .two-col { display: flex; gap: 24px; flex-wrap: wrap; }
    .col { flex: 1; min-width: 200px; }
    table.meta { width: 100%; border-collapse: collapse; }
    table.meta td { padding: 6px 0; vertical-align: top; }
    table.meta td.label { color: #666; width: 42%; }
    .amount-block { background: #f5f7ff; border: 1px solid #e0e4ff; border-radius: 8px; padding: 14px 16px; margin: 16px 0; }
    .amount-row { display: flex; justify-content: space-between; padding: 4px 0; }
    .words { font-style: italic; color: #333; margin: 12px 0; line-height: 1.5; }
    .desc-box { border: 1px solid #ddd; border-radius: 8px; padding: 12px 14px; min-height: 80px; background: #fafafa; }
    .desc-line { white-space: pre-wrap; margin: 2px 0; }
    .terms { margin-top: 28px; padding-top: 16px; border-top: 1px solid #eee; color: #555; font-size: 13px; line-height: 1.5; }
    .footer-sign { margin-top: 32px; display: flex; justify-content: flex-end; }
    .sign-inner { text-align: center; }
    .sign-inner img { max-height: 72px; max-width: 180px; object-fit: contain; display: block; margin: 0 auto 6px auto; }
    .sign-label { font-size: 12px; color: #333; }
  </style>
</head>
<body>
  <div class="header-row">
    <div class="company-left">
      ${logoBlock}
      <div class="company-name">${escapeHtml(company?.company_name || '')}</div>
      <p class="muted">${escapeHtml(company?.address || '').replace(/\n/g, '<br/>')}</p>
      <p class="muted">Phone: ${escapeHtml(company?.phone || '')}</p>
      ${company?.email && String(company.email).trim() ? `<p class="muted">Email: ${escapeHtml(company.email)}</p>` : ''}
    </div>
    <div class="tax-title">Tax Invoice</div>
  </div>

  <div class="two-col section">
    <div class="col">
      <div class="section-title">Bill To</div>
      <p class="muted" style="margin:0;font-weight:600;">${escapeHtml(invoice?.customer_name || '')}</p>
      <p class="muted" style="margin:4px 0 0 0;">Contact No: ${escapeHtml(invoice?.customer_phone || '')}</p>
    </div>
    <div class="col">
      <div class="section-title">Invoice Details</div>
      <table class="meta">
        <tr><td class="label">Invoice Number</td><td><strong>${escapeHtml(invoice?.invoice_number || '')}</strong></td></tr>
        <tr><td class="label">Date</td><td>${escapeHtml(formatDisplayDate(invoice?.date))}</td></tr>
        <tr><td class="label">Total Amount</td><td><strong>₹ ${formatMoney(invoice?.amount)}</strong></td></tr>
      </table>
    </div>
  </div>

  <div class="amount-block">
    <div class="amount-row"><span>Invoice Amount in Words</span></div>
    <div class="words">${escapeHtml(amountToWords(invoice?.amount))}</div>
    <div class="amount-row"><span>Received Amount</span><span>₹ ${formatMoney(invoice?.received_amount)}</span></div>
    <div class="amount-row"><span>Balance Amount</span><span>₹ ${formatMoney(invoice?.balance_amount)}</span></div>
  </div>

  <div class="section">
    <div class="section-title">Description</div>
    <div class="desc-box">${descriptionToHtml(invoice?.description)}</div>
  </div>

  <div class="terms">
    <strong>Terms:</strong><br/>
    Thank you, It was a pleasure serving you...
  </div>

  <div class="footer-sign">
    <div class="sign-inner">
      ${sigUri ? `<img src="${escapeHtml(sigUri)}" alt="" />` : '<div style="height:48px"></div>'}
      <div class="sign-label">Authorized Signatory</div>
    </div>
  </div>
</body>
</html>`;
}

export function buildReportHtml({ title, periodLabel, summary, invoices, driverRows }) {
  const rows = (invoices || [])
    .map(
      (inv) => `<tr>
      <td>${escapeHtml(inv.invoice_number)}</td>
      <td>${escapeHtml(formatDisplayDate(inv.date))}</td>
      <td>${escapeHtml(inv.customer_name)}</td>
      <td>${escapeHtml(inv.driver_name || '')}</td>
      <td style="text-align:right;">₹ ${formatMoney(inv.amount)}</td>
      <td>${escapeHtml(inv.payment_status)}</td>
    </tr>`
    )
    .join('');

  const driverHtml = (driverRows || [])
    .map(
      (d) => `<tr>
      <td>${escapeHtml(d.driver_name)}</td>
      <td style="text-align:right;">${d.trips}</td>
      <td style="text-align:right;">₹ ${formatMoney(d.revenue)}</td>
    </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<style>
  body { font-family: system-ui, sans-serif; padding: 20px; color: #111; }
  h1 { font-size: 20px; color: #1a237e; }
  .meta { color: #555; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
  th, td { border: 1px solid #ccc; padding: 8px; }
  th { background: #eef0ff; text-align: left; }
  .summary { margin: 16px 0; padding: 12px; background: #f8f9ff; border-radius: 8px; }
</style></head><body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">${escapeHtml(periodLabel)}</div>
  <div class="summary">
    <div><strong>Total Revenue:</strong> ₹ ${formatMoney(summary.total_revenue)}</div>
    <div><strong>Number of Trips:</strong> ${summary.trip_count}</div>
  </div>
  <h2 style="font-size:14px;color:#1a237e;">Driver-wise breakdown</h2>
  <table><thead><tr><th>Driver</th><th>Trips</th><th>Revenue</th></tr></thead><tbody>${driverHtml || '<tr><td colspan="3">No data</td></tr>'}</tbody></table>
  <h2 style="font-size:14px;margin-top:24px;color:#1a237e;">Invoices</h2>
  <table><thead><tr><th>No.</th><th>Date</th><th>Customer</th><th>Driver</th><th>Amount</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="6">No invoices</td></tr>'}</tbody></table>
</body></html>`;
}
