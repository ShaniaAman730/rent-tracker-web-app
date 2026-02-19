import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'
import { toPng } from 'html-to-image'
import { BillingDataForExport } from '@/lib/billing-helpers'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export function buildBillingPreviewElement(data: BillingDataForExport) {
  const wrapper = document.createElement('div')
  wrapper.style.width = '1200px'
  wrapper.style.background = '#ffffff'
  wrapper.style.color = '#111827'
  wrapper.style.padding = '24px'
  wrapper.style.fontFamily = 'Arial, sans-serif'

  const copyHtml = Array.from({ length: 3 })
    .map(
      (_, idx) => `
      <div style="margin-bottom:${idx === 2 ? 0 : 32}px; border:1px solid #e5e7eb; padding:16px;">
        <h2 style="text-align:center; margin:0 0 8px 0;">${data.unitName} (${data.type}) - ${new Date(
          data.currentDate
        ).toLocaleDateString()}</h2>
        <table style="width:100%; border-collapse:collapse; margin-bottom:16px;" border="1" cellpadding="6">
          <tr><th>Location</th><th>Current RDG. kw hour</th><th>Previous RDG. kw hour</th><th>Consumption kw hour</th><th>Percentage</th></tr>
          <tr><td>First Floor</td><td>${data.currentFirstFloor.toFixed(2)}</td><td>${data.previousFirstFloor.toFixed(2)}</td><td>${data.firstFloorUsage.toFixed(2)}</td><td>${data.firstFloorPercentage.toFixed(2)}%</td></tr>
          <tr><td>Second Floor</td><td>${data.currentSecondFloor.toFixed(2)}</td><td>${data.previousSecondFloor.toFixed(2)}</td><td>${data.secondFloorUsage.toFixed(2)}</td><td>${data.secondFloorPercentage.toFixed(2)}%</td></tr>
          <tr><td><b>TOTAL</b></td><td></td><td></td><td><b>${data.totalUsage.toFixed(2)}</b></td><td><b>100%</b></td></tr>
        </table>
        <table style="width:100%; border-collapse:collapse; margin-bottom:12px;" border="1" cellpadding="6">
          <tr><th>Location</th><th>Total Amount</th><th>Percentage</th><th>Amount per Location</th></tr>
          <tr><td>First Floor</td><td>${data.amount.toFixed(2)}</td><td>${data.firstFloorPercentage.toFixed(2)}%</td><td>${data.firstFloorAmount.toFixed(2)}</td></tr>
          <tr><td>Second Floor</td><td>${data.amount.toFixed(2)}</td><td>${data.secondFloorPercentage.toFixed(2)}%</td><td>${data.secondFloorAmount.toFixed(2)}</td></tr>
          <tr><td><b>TOTAL</b></td><td></td><td></td><td><b>${data.amount.toFixed(2)}</b></td></tr>
        </table>
        <p style="margin:4px 0;">Prepared by: ${data.preparedBy}</p>
        <p style="margin:4px 0;">Date: ${new Date().toLocaleDateString()}</p>
      </div>`
    )
    .join('')

  wrapper.innerHTML = copyHtml
  return wrapper
}

export async function exportBillingToPng(data: BillingDataForExport, filename: string) {
  const node = buildBillingPreviewElement(data)
  document.body.appendChild(node)
  const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2 })
  document.body.removeChild(node)

  const response = await fetch(dataUrl)
  const blob = await response.blob()
  downloadBlob(blob, filename)
}

export async function exportBillingToPdf(data: BillingDataForExport, filename: string) {
  const node = buildBillingPreviewElement(data)
  document.body.appendChild(node)
  const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2 })
  document.body.removeChild(node)

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const img = new Image()

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to render billing image'))
    img.src = dataUrl
  })

  const ratio = Math.min(pageWidth / img.width, pageHeight / img.height)
  const width = img.width * ratio
  const height = img.height * ratio
  pdf.addImage(dataUrl, 'PNG', (pageWidth - width) / 2, 24, width, height)
  pdf.save(filename)
}

export function exportBillingToExcel(data: BillingDataForExport, filename: string) {
  const rows: (string | number)[][] = []
  for (let copy = 1; copy <= 3; copy++) {
    rows.push([`${data.unitName} (${data.type}) - ${new Date(data.currentDate).toLocaleDateString()}`])
    rows.push(['Location', 'Current RDG. kw hour', 'Previous RDG. kw hour', 'Consumption kw hour', 'Percentage'])
    rows.push([
      'First Floor',
      data.currentFirstFloor,
      data.previousFirstFloor,
      data.firstFloorUsage,
      data.firstFloorPercentage / 100,
    ])
    rows.push([
      'Second Floor',
      data.currentSecondFloor,
      data.previousSecondFloor,
      data.secondFloorUsage,
      data.secondFloorPercentage / 100,
    ])
    rows.push(['TOTAL', '', '', data.totalUsage, 1])
    rows.push([])
    rows.push(['Location', 'Total Amount', 'Percentage', 'Amount per Location'])
    rows.push(['First Floor', data.amount, data.firstFloorPercentage / 100, data.firstFloorAmount])
    rows.push(['Second Floor', data.amount, data.secondFloorPercentage / 100, data.secondFloorAmount])
    rows.push(['TOTAL', '', '', data.amount])
    rows.push(['Prepared by', data.preparedBy])
    rows.push(['Date', new Date().toLocaleDateString()])
    rows.push([])
  }

  const sheet = XLSX.utils.aoa_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Billing')
  XLSX.writeFile(workbook, filename)
}
