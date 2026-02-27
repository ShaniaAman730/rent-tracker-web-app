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

const tableStyle = 'width:100%; border-collapse:collapse; margin-bottom:16px; border:2px solid #111827;'
const cellStyle = 'border:1px solid #111827; padding:6px;'

export function buildBillingPreviewElement(data: BillingDataForExport, copies = 3) {
  const wrapper = document.createElement('div')
  wrapper.style.width = '1200px'
  wrapper.style.background = '#ffffff'
  wrapper.style.color = '#111827'
  wrapper.style.padding = '24px'
  wrapper.style.fontFamily = 'Arial, sans-serif'

  const copyHtml = Array.from({ length: copies })
    .map(
      (_, idx) => `
      <div style="margin-bottom:${idx === copies - 1 ? 0 : 32}px; border:1px solid #e5e7eb; padding:16px;">
        <h2 style="text-align:center; margin:0 0 8px 0;">${data.unitName} (${data.type}) - ${new Date(
          data.currentDate
        ).toLocaleDateString()}</h2>
        <table style="${tableStyle}">
          <tr>
            <th style="${cellStyle}">Location</th>
            <th style="${cellStyle}">Current RDG. kw hour</th>
            <th style="${cellStyle}">Previous RDG. kw hour</th>
            <th style="${cellStyle}">Consumption kw hour</th>
            <th style="${cellStyle}">Percentage</th>
          </tr>
          <tr>
            <td style="${cellStyle}">First Floor</td>
            <td style="${cellStyle}">${data.currentFirstFloor.toFixed(2)}</td>
            <td style="${cellStyle}">${data.previousFirstFloor.toFixed(2)}</td>
            <td style="${cellStyle}">${data.firstFloorUsage.toFixed(2)}</td>
            <td style="${cellStyle}">${data.firstFloorPercentage.toFixed(2)}%</td>
          </tr>
          <tr>
            <td style="${cellStyle}">Second Floor</td>
            <td style="${cellStyle}">${data.currentSecondFloor.toFixed(2)}</td>
            <td style="${cellStyle}">${data.previousSecondFloor.toFixed(2)}</td>
            <td style="${cellStyle}">${data.secondFloorUsage.toFixed(2)}</td>
            <td style="${cellStyle}">${data.secondFloorPercentage.toFixed(2)}%</td>
          </tr>
          <tr>
            <td style="${cellStyle}"><b>TOTAL</b></td>
            <td style="${cellStyle}"></td>
            <td style="${cellStyle}"></td>
            <td style="${cellStyle}"><b>${data.totalUsage.toFixed(2)}</b></td>
            <td style="${cellStyle}"><b>100%</b></td>
          </tr>
        </table>
        <table style="${tableStyle.replace('16px', '12px')}">
          <tr>
            <th style="${cellStyle}">Location</th>
            <th style="${cellStyle}">Total Amount</th>
            <th style="${cellStyle}">Percentage</th>
            <th style="${cellStyle}">Amount per Location</th>
          </tr>
          <tr>
            <td style="${cellStyle}">First Floor</td>
            <td style="${cellStyle}">${data.amount.toFixed(2)}</td>
            <td style="${cellStyle}">${data.firstFloorPercentage.toFixed(2)}%</td>
            <td style="${cellStyle}">${data.firstFloorAmount.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="${cellStyle}">Second Floor</td>
            <td style="${cellStyle}">${data.amount.toFixed(2)}</td>
            <td style="${cellStyle}">${data.secondFloorPercentage.toFixed(2)}%</td>
            <td style="${cellStyle}">${data.secondFloorAmount.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="${cellStyle}"><b>TOTAL</b></td>
            <td style="${cellStyle}"></td>
            <td style="${cellStyle}"></td>
            <td style="${cellStyle}"><b>${data.amount.toFixed(2)}</b></td>
          </tr>
        </table>
        <p style="margin:4px 0;">First Floor Amount Due: ${data.firstFloorAmount.toFixed(2)}</p>
        <p style="margin:4px 0;">Second Floor Amount Due: ${data.secondFloorAmount.toFixed(2)}</p>
        <p style="margin:4px 0;">Total Amount Due: ${data.amount.toFixed(2)}</p>
        <p style="margin:4px 0;">Prepared by: ${data.preparedBy}</p>
        <p style="margin:4px 0;">Date: ${new Date().toLocaleDateString()}</p>
      </div>`
    )
    .join('')

  wrapper.innerHTML = copyHtml
  return wrapper
}

export async function exportBillingToPng(data: BillingDataForExport, filename: string) {
  const node = buildBillingPreviewElement(data, 1)
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
    // additional lines
    rows.push(['First Floor Amount Due', data.firstFloorAmount])
    rows.push(['Second Floor Amount Due', data.secondFloorAmount])
    rows.push(['Total Amount Due', data.amount])
    rows.push(['Prepared by', data.preparedBy])
    rows.push(['Date', new Date().toLocaleDateString()])
    rows.push([])
  }

  const sheet = XLSX.utils.aoa_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Billing')
  XLSX.writeFile(workbook, filename)
}
