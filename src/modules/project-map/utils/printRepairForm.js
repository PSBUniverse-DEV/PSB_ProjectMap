/**
 * generateRepairFormPrint — writes the printable Repair Request Form into a
 * window the caller already opened (RepairFormCard opens it on the click,
 * before loading photo links, so the browser does not block it as a pop-up).
 * The layout follows the paper form: yellow title band, black bars, the
 * label / value table, amount owed in red, the reported problem, then the
 * repair photos. Read-only: only the Print / Close toolbar buttons.
 *
 * data = { customerName, phone, address, invoiceNumber, originalInstaller,
 *          formDate ("YYYY-MM-DD"), amountOwed (already formatted),
 *          reportedProblem, photos: [{ name, url }] }
 */
import { formatDisplayDate } from "../data/projectMap.data";

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

export function generateRepairFormPrint(printWindow, data = {}) {
  if (!printWindow) return;
  const show = (value) => (value == null || String(value).trim() === "" ? "&nbsp;" : escapeHtml(value));
  const rowsHtml = [
    ["Customer Name:", data.customerName],
    ["Phone Number:", data.phone],
    ["Repair Address:", data.address],
    ["Invoice Number:", data.invoiceNumber],
    ["Original Installer:", data.originalInstaller],
    ["Form Date:", data.formDate ? formatDisplayDate(data.formDate) : ""],
  ].map(([label, value]) => `<tr><th>${label}</th><td>${show(value)}</td></tr>`).join("");
  const photosHtml = (data.photos || []).length
    ? (data.photos || []).map((photo) => `<figure><img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.name)}"><figcaption>${escapeHtml(photo.name)}</figcaption></figure>`).join("")
    : `<p class="empty">No photos.</p>`;
printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Repair Request Form - ${escapeHtml(data.customerName || "Project")}</title>
<style>
  @page { size: letter portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #000; }
  .toolbar { display: flex; gap: 8px; justify-content: flex-end; padding: 10px 16px; border-bottom: 1px solid #ddd; background: #f8fafc; }
  .toolbar button { padding: 6px 18px; font-size: 12px; font-weight: 600; border-radius: 4px; cursor: pointer; }
  .btn-primary { background: #1e293b; color: #fff; border: none; }
  .btn-secondary { background: #fff; color: #1e293b; border: 1px solid #cbd5e1; }
  .sheet { max-width: 760px; margin: 16px auto; border: 2px solid #000; }
  h1 { margin: 0; padding: 14px 12px; background: #fde68a; text-align: center; font-size: 24px; font-weight: 800; }
  .bar { height: 16px; background: #000; }
  .bar.tall { height: 26px; }
  table { width: 100%; border-collapse: collapse; }
  th { width: 220px; padding: 6px 10px; border-right: 1px solid #000; border-bottom: 1px solid #000; font-weight: 700; text-align: center; }
  td { padding: 6px 10px; border-bottom: 1px solid #000; text-align: center; }
  tr.amount th { font-weight: 800; border-bottom: none; }
  tr.amount td { font-size: 20px; font-weight: 800; color: #dc2626; border-bottom: none; }
  .label-bar { display: flex; background: #000; }
  .label-bar span { padding: 4px 14px; background: #fff; border: 1px solid #000; font-weight: 700; }
  .problem { min-height: 140px; padding: 12px 14px; line-height: 1.6; white-space: pre-wrap; }
  .photos { padding: 12px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  figure { margin: 0; break-inside: avoid; }
  figure img { width: 100%; height: 200px; object-fit: contain; background: #f3f4f6; }
  figcaption { margin-top: 4px; font-size: 10px; color: #4b5563; overflow-wrap: anywhere; }
  .empty { margin: 0; color: #4b5563; }
  .footer { max-width: 760px; margin: 0 auto 16px; font-size: 10px; color: #4b5563; }
  @media print { .no-print { display: none !important; } .sheet { margin: 0 auto; } }
</style>
</head>
<body>
  <div class="no-print toolbar">
    <button class="btn-primary" onclick="window.print()">Print</button>
    <button class="btn-secondary" onclick="window.close()">Close</button>
  </div>
  <div class="sheet">
    <h1>PREMIUM STEEL BUILDINGS REPAIR REQUEST FORM</h1>
    <div class="bar"></div>
    <table>
      <tbody>
        ${rowsHtml}
        <tr class="amount"><th>AMOUNT OWED:</th><td>${show(data.amountOwed)}</td></tr>
      </tbody>
    </table>
    <div class="bar tall"></div>
    <div class="label-bar"><span>Reported Problem:</span></div>
    <div class="problem">${show(data.reportedProblem)}</div>
    <div class="label-bar"><span>Repair Photos:</span></div>
    <div class="photos">${photosHtml}</div>
  </div>
  <div class="footer">PSBUniverse &middot; Project Map</div>
</body>
</html>`);
  printWindow.document.close();
}