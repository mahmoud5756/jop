/** Export rows as SpreadsheetML 2003, an Excel-native workbook format. */
export function exportExcel(sheetName: string, headers: string[], rows: Array<Array<string | number | null | undefined>>, fileName: string): void {
  const escapeXml = (value: unknown) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const rowXml = (cells: unknown[], header = false) => `<Row>${cells.map(value =>
    `<Cell${header ? ' ss:StyleID="Header"' : ''}><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`
  ).join('')}</Row>`;
  const allRows = [headers, ...rows];
  const workbook = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>` +
    `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">` +
    `<Styles><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#E8E1D7" ss:Pattern="Solid"/></Style></Styles>` +
    `<Worksheet ss:Name="${escapeXml(sheetName.slice(0, 31))}"><Table>${allRows.map((row, index) => rowXml(row, index === 0)).join('')}</Table></Worksheet></Workbook>`;
  const blob = new Blob(['\uFEFF', workbook], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName.endsWith('.xls') ? fileName : `${fileName}.xls`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
