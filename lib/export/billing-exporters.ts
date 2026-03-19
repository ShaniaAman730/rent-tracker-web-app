import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'
import { toPng } from 'html-to-image'
import { BillingDataForExport } from '@/lib/billing-helpers'
import { convertGoogleDriveUrlToEmbeddable } from '@/lib/google-drive-helpers'

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

const tableStyle = 'width:100%; border-collapse:collapse; margin-bottom:16px; border:2px solid #000000;'
const cellStyle = 'border:1px solid #000000; padding:6px;'

function extractGoogleDriveFileId(input: string): string | null {
  if (!input) return null
  
  // Handle embed code: <iframe src="https://drive.google.com/file/d/FILE_ID/preview">
  const iframeMatch = input.match(/src="[^"]*\/file\/d\/([^\/]+)\//)
  if (iframeMatch) return iframeMatch[1]
  
  // Handle direct URL: https://drive.google.com/file/d/FILE_ID/view
  const urlMatch = input.match(/\/file\/d\/([^\/]+)\//)
  if (urlMatch) return urlMatch[1]
  
  // Handle ?id=FILE_ID format
  const idMatch = input.match(/[?&]id=([^&]+)/)
  if (idMatch) return idMatch[1]
  
  return null
}

function getImageHtml(imageUrl: string | null, altText: string): string {
  if (!imageUrl) {
    return `<div style="display:flex; align-items:center; justify-content:center; width:100%; height:140px; background:#f0f0f0; border:1px solid #ccc; font-size:11px; color:#666; font-weight:bold;">${altText} not provided</div>`
  }
  
  // If it's an embed code (iframe), return it as-is so browser can render it
  if (imageUrl.includes('<iframe')) {
    return imageUrl
  }
  
  // Try to extract file ID from URL or embed code
  const fileId = extractGoogleDriveFileId(imageUrl)
  
  if (fileId) {
    // Try to use Google Drive's export endpoint for direct image viewing
    const imageUrlAttempt = `https://drive.google.com/uc?id=${fileId}&export=view`
    return `<img src="${imageUrlAttempt}" style="max-width:100%; max-height:140px; object-fit:contain;" alt="${altText}" onerror="this.style.display='none'" />`
  }
  
  // If it's a regular URL, try to load it
  if (imageUrl) {
    return `<img src="${convertGoogleDriveUrlToEmbeddable(imageUrl)}" style="max-width:100%; max-height:140px; object-fit:contain;" alt="${altText}" onerror="this.style.display='none'" />`
  }
  
  // Fallback placeholder
  return `<div style="display:flex; align-items:center; justify-content:center; flex-direction:column; width:100%; height:140px; background:#f5f5f5; border:2px dashed #999; font-size:10px; color:#666; padding:8px; text-align:center;">
    <div style="font-weight:bold; margin-bottom:4px;">📎 Image</div>
    <div style="font-size:9px; line-height:1.3;">Available in web</div>
  </div>`
}

export function buildBillingPreviewElement(data: BillingDataForExport) {
  const wrapper = document.createElement('div')
  wrapper.style.width = '1000px'
  wrapper.style.background = '#ffffff'
  wrapper.style.color = '#000000'
  wrapper.style.padding = '16px'
  wrapper.style.fontFamily = 'Arial, sans-serif'
  wrapper.style.fontSize = '10px'

  const readingImageHtml = getImageHtml(data.readingImageUrl, 'Reading')
  const billingImageHtml = getImageHtml(data.billingImageUrl, 'Billing')

  // Compact table styles for single page
  const compactTableStyle = 'width:100%; border-collapse:collapse; margin-bottom:4px; border:1px solid #000000;'
  const compactCellStyle = 'border:1px solid #000000; padding:2px 3px; font-size:9px;'

  const html = `
    <div style="border:1px solid #000000; padding:8px;">
      <h2 style="text-align:center; margin:0 0 2px 0; font-size:12px; font-weight:bold;">${data.unitName} (${data.type})</h2>
      <p style="text-align:center; margin:0 0 4px 0; font-size:8px; color:#666;">
        Reading: ${new Date(data.currentDate).toLocaleDateString()} | Due: ${new Date(data.dueDate).toLocaleDateString()}
      </p>

      <!-- COMPUTATION SECTION -->
      <table style="${compactTableStyle}">
        <tr style="background:#f0f0f0;">
          <th style="${compactCellStyle}">Location</th>
          <th style="${compactCellStyle}">Current</th>
          <th style="${compactCellStyle}">Previous</th>
          <th style="${compactCellStyle}">Usage</th>
          <th style="${compactCellStyle}">%</th>
        </tr>
        <tr>
          <td style="${compactCellStyle}">First Floor</td>
          <td style="${compactCellStyle} text-align:right;">${data.currentFirstFloor.toFixed(2)}</td>
          <td style="${compactCellStyle} text-align:right;">${data.previousFirstFloor.toFixed(2)}</td>
          <td style="${compactCellStyle} text-align:right;">${data.firstFloorUsage.toFixed(2)}</td>
          <td style="${compactCellStyle} text-align:right;">${data.firstFloorPercentage.toFixed(1)}%</td>
        </tr>
        <tr>
          <td style="${compactCellStyle}">Second Floor</td>
          <td style="${compactCellStyle} text-align:right;">${data.currentSecondFloor.toFixed(2)}</td>
          <td style="${compactCellStyle} text-align:right;">${data.previousSecondFloor.toFixed(2)}</td>
          <td style="${compactCellStyle} text-align:right;">${data.secondFloorUsage.toFixed(2)}</td>
          <td style="${compactCellStyle} text-align:right;">${data.secondFloorPercentage.toFixed(1)}%</td>
        </tr>
        <tr style="background:#f0f0f0; font-weight:bold;">
          <td style="${compactCellStyle}">TOTAL</td>
          <td style="${compactCellStyle}"></td>
          <td style="${compactCellStyle}"></td>
          <td style="${compactCellStyle} text-align:right;">${data.totalUsage.toFixed(2)}</td>
          <td style="${compactCellStyle} text-align:right;">100%</td>
        </tr>
      </table>

      <table style="${compactTableStyle}">
        <tr style="background:#f0f0f0;">
          <th style="${compactCellStyle}">Location</th>
          <th style="${compactCellStyle}">Total Amount</th>
          <th style="${compactCellStyle}">%</th>
          <th style="${compactCellStyle}">Per Location</th>
        </tr>
        <tr>
          <td style="${compactCellStyle}">First Floor</td>
          <td style="${compactCellStyle} text-align:right;">PHP ${data.amount.toFixed(2)}</td>
          <td style="${compactCellStyle} text-align:right;">${data.firstFloorPercentage.toFixed(1)}%</td>
          <td style="${compactCellStyle} text-align:right;">PHP ${data.firstFloorAmount.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="${compactCellStyle}">Second Floor</td>
          <td style="${compactCellStyle} text-align:right;">PHP ${data.amount.toFixed(2)}</td>
          <td style="${compactCellStyle} text-align:right;">${data.secondFloorPercentage.toFixed(1)}%</td>
          <td style="${compactCellStyle} text-align:right;">PHP ${data.secondFloorAmount.toFixed(2)}</td>
        </tr>
        <tr style="background:#f0f0f0; font-weight:bold;">
          <td style="${compactCellStyle}">TOTAL AMOUNT DUE</td>
          <td style="${compactCellStyle}"></td>
          <td style="${compactCellStyle}"></td>
          <td style="${compactCellStyle} text-align:right;">PHP ${data.amount.toFixed(2)}</td>
        </tr>
      </table>

      <p style="margin:2px 0 1px 0; font-size:8px;">Prepared by: ${data.preparedBy} | Date: ${new Date().toLocaleDateString()}</p>

      <!-- READING IMAGE -->
      <div style="margin:4px 0 0 0; border-top:1px solid #000000; padding:4px 0 0 0;">
        <div style="text-align:center; margin-bottom:3px;">
          <div style="font-weight:bold; font-size:9px;">Reading</div>
          <div style="height:140px; overflow:hidden;">
            ${readingImageHtml}
          </div>
        </div>

        <!-- BILLING IMAGE -->
        <div style="text-align:center;">
          <div style="font-weight:bold; font-size:9px;">Billing</div>
          <div style="height:140px; overflow:hidden;">
            ${billingImageHtml}
          </div>
        </div>
      </div>
    </div>
  `

  wrapper.innerHTML = html
  return wrapper
}

export async function exportBillingToPng(data: BillingDataForExport, filename: string) {
  try {
    const node = buildBillingPreviewElement(data)
    document.body.appendChild(node)
    
    // Wait for images to attempt loading (some may fail due to CORS, which is ok)
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2 })
    document.body.removeChild(node)

    const response = await fetch(dataUrl)
    const blob = await response.blob()
    downloadBlob(blob, filename)
  } catch (error) {
    console.error('Error exporting to PNG:', error)
    throw new Error('Failed to generate PNG. Please try again.')
  }
}

export async function exportBillingToPdf(data: BillingDataForExport, filename: string) {
  try {
    const node = buildBillingPreviewElement(data)
    const html = node.innerHTML
    
    // Open new window with printable HTML
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      throw new Error('Could not open print window. Please disable popup blockers.')
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${filename}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              background: white;
            }
            @media print {
              body { padding: 0; }
            }
            img { max-width: 100%; height: auto; }
            iframe { border: none; width: 100%; min-height: 300px; }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `)
    printWindow.document.close()
    
    // Wait for iframes/images to load before offering print
    setTimeout(() => {
      printWindow.print()
    }, 2000)
    
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    throw new Error('Failed to generate PDF. Please try again.')
  }
}

export function exportBillingToExcel(data: BillingDataForExport, filename: string) {
  const rows: (string | number)[][] = []
  for (let copy = 1; copy <= 3; copy++) {
    rows.push([`${data.unitName} (${data.type}) - ${new Date(data.currentDate).toLocaleDateString()}`])
    rows.push([`Date of Reading: ${new Date(data.currentDate).toLocaleDateString()}`, `Due Date: ${new Date(data.dueDate).toLocaleDateString()}`])
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
    rows.push([`First Floor Amount Due.............................PHP ${data.firstFloorAmount.toFixed(2)}`])
    rows.push([`Second Floor Amount Due...........................PHP ${data.secondFloorAmount.toFixed(2)}`])
    rows.push(['--------------------------------------------------------------'])
    rows.push([`Total Amount Due..................................PHP ${data.amount.toFixed(2)}`])
    rows.push([])
    rows.push(['Prepared by', data.preparedBy])
    rows.push(['Date Prepared', new Date().toLocaleDateString()])
    rows.push([])
  }

  const sheet = XLSX.utils.aoa_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Billing')
  XLSX.writeFile(workbook, filename)
}
