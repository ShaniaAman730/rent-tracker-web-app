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
    return `<div style="display:flex; align-items:center; justify-content:center; width:100%; height:200px; background:#f0f0f0; border:1px solid #ccc; font-size:11px; color:#666; font-weight:bold;">${altText} not provided</div>`
  }
  
  // If it's an embed code (iframe), extract the file ID and create an image URL
  if (imageUrl.includes('<iframe')) {
    const fileId = extractGoogleDriveFileId(imageUrl)
    if (fileId) {
      const imageUrlAttempt = `https://drive.google.com/uc?id=${fileId}&export=view`
      return `<img src="${imageUrlAttempt}" style="max-width:100%; max-height:300px; object-fit:contain; display:block; margin:0 auto;" alt="${altText}" />`
    }
  }
  
  // Try to extract file ID from URL
  const fileId = extractGoogleDriveFileId(imageUrl)
  
  if (fileId) {
    // Use Google Drive's export endpoint for direct image viewing
    const imageUrlAttempt = `https://drive.google.com/uc?id=${fileId}&export=view`
    return `<img src="${imageUrlAttempt}" style="max-width:100%; max-height:300px; object-fit:contain; display:block; margin:0 auto;" alt="${altText}" />`
  }
  
  // If it's a regular URL, try to load it
  if (imageUrl) {
    return `<img src="${convertGoogleDriveUrlToEmbeddable(imageUrl)}" style="max-width:100%; max-height:300px; object-fit:contain; display:block; margin:0 auto;" alt="${altText}" />`
  }
  
  // Fallback placeholder
  return `<div style="display:flex; align-items:center; justify-content:center; flex-direction:column; width:100%; height:200px; background:#f5f5f5; border:2px dashed #999; font-size:10px; color:#666; padding:8px; text-align:center;">
    <div style="font-weight:bold; margin-bottom:4px;">📎 Image</div>
    <div style="font-size:9px; line-height:1.3;">Available in web</div>
  </div>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getPdfEmbedUrl(input: string | null | undefined): string | null {
  if (!input) return null

  const iframeMatch = input.match(/src="([^"]+)"/i)
  if (iframeMatch?.[1]) {
    return iframeMatch[1]
  }

  const fileId = extractGoogleDriveFileId(input)
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/preview`
  }

  try {
    return new URL(input).toString()
  } catch {
    return null
  }
}

function getGoogleDriveImageCandidates(input: string | null | undefined): string[] {
  if (!input) return []

  const fileId = extractGoogleDriveFileId(input)
  if (!fileId) return []

  return [
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
    `https://drive.google.com/uc?id=${fileId}&export=view`,
    `https://lh3.googleusercontent.com/d/${fileId}=w1600`,
  ]
}

async function tryFetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' })
    if (!response.ok) return null
    const blob = await response.blob()
    if (!blob.type.startsWith('image/')) return null

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : '')
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

async function resolvePrintableImageSource(input: string | null | undefined): Promise<string | null> {
  if (!input) return null

  if (!input.includes('<iframe')) {
    const converted = convertGoogleDriveUrlToEmbeddable(input)
    if (converted) {
      const dataUrl = await tryFetchAsDataUrl(converted)
      if (dataUrl) return dataUrl
    }
  }

  const candidates = getGoogleDriveImageCandidates(input)
  for (const candidate of candidates) {
    const dataUrl = await tryFetchAsDataUrl(candidate)
    if (dataUrl) return dataUrl
  }

  return candidates[0] || convertGoogleDriveUrlToEmbeddable(input) || getPdfEmbedUrl(input)
}

function getPdfImageSection(
  title: string,
  imageSrc: string | null | undefined,
): string {
  const printableSrc = imageSrc ? escapeHtml(imageSrc) : null

  if (!printableSrc) {
    return `
      <div class="image-panel">
        <div class="image-label">${escapeHtml(title)}</div>
        <div class="embed-placeholder">${escapeHtml(title)} not provided</div>
      </div>
    `
  }

  return `
    <div class="image-panel">
      <div class="image-label">${escapeHtml(title)}</div>
      <div class="embed-image-wrap">
        <img src="${printableSrc}" alt="${escapeHtml(title)}" class="embed-image" />
      </div>
    </div>
  `
}

function getCompactAmountTable(
  data: BillingDataForExport,
  floorLabel: 'First Floor' | 'Second Floor',
  amount: number,
): string {
  return `
    <section class="compact-summary-card">
      <h2>${escapeHtml(data.unitName)} (${escapeHtml(data.type)})</h2>
      <div class="compact-meta">
        <span>Reading: ${escapeHtml(new Date(data.currentDate).toLocaleDateString())}</span>
        <span class="due-date">Due: ${escapeHtml(new Date(data.dueDate).toLocaleDateString())}</span>
      </div>

      <p class="compact-section-title">Computation</p>
      <table class="compact-table">
        <thead>
          <tr>
            <th>Location</th>
            <th class="text-right">Current</th>
            <th class="text-right">Previous</th>
            <th class="text-right">Usage</th>
            <th class="text-right">%</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>First Floor</td>
            <td class="text-right">${data.currentFirstFloor.toFixed(2)}</td>
            <td class="text-right">${data.previousFirstFloor.toFixed(2)}</td>
            <td class="text-right">${data.firstFloorUsage.toFixed(2)}</td>
            <td class="text-right">${data.firstFloorPercentage.toFixed(2)}%</td>
          </tr>
          <tr>
            <td>Second Floor</td>
            <td class="text-right">${data.currentSecondFloor.toFixed(2)}</td>
            <td class="text-right">${data.previousSecondFloor.toFixed(2)}</td>
            <td class="text-right">${data.secondFloorUsage.toFixed(2)}</td>
            <td class="text-right">${data.secondFloorPercentage.toFixed(2)}%</td>
          </tr>
          <tr>
            <td><strong>TOTAL</strong></td>
            <td></td>
            <td></td>
            <td class="text-right"><strong>${data.totalUsage.toFixed(2)}</strong></td>
            <td class="text-right"><strong>100%</strong></td>
          </tr>
        </tbody>
      </table>

      <table class="compact-table amount-only-table">
        <tbody>
          <tr>
            <td><strong>${escapeHtml(floorLabel)} Amount</strong></td>
            <td class="text-right"><strong>PHP ${amount.toFixed(2)}</strong></td>
          </tr>
        </tbody>
      </table>
    </section>
  `
}

async function buildBillingPdfHtml(data: BillingDataForExport, filename: string): Promise<string> {
  const [readingPrintableSrc, billingPrintableSrc] = await Promise.all([
    resolvePrintableImageSource(data.readingImageUrl),
    resolvePrintableImageSource(data.billingImageUrl),
  ])
  const contentHtml = `
    <section class="copy-block">
      <h1>${escapeHtml(data.unitName)} (${escapeHtml(data.type)})</h1>
      <div class="meta-row">
        <span>Reading Date: ${escapeHtml(new Date(data.currentDate).toLocaleDateString())}</span>
        <span class="due-date">Due Date: ${escapeHtml(new Date(data.dueDate).toLocaleDateString())}</span>
      </div>

      <section>
        <p class="section-title">Computation</p>
        <table>
          <thead>
            <tr>
              <th>Location</th>
              <th class="text-right">Current</th>
              <th class="text-right">Previous</th>
              <th class="text-right">Usage</th>
              <th class="text-right">Percentage</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>First Floor</td>
              <td class="text-right">${data.currentFirstFloor.toFixed(2)}</td>
              <td class="text-right">${data.previousFirstFloor.toFixed(2)}</td>
              <td class="text-right">${data.firstFloorUsage.toFixed(2)}</td>
              <td class="text-right">${data.firstFloorPercentage.toFixed(2)}%</td>
            </tr>
            <tr>
              <td>Second Floor</td>
              <td class="text-right">${data.currentSecondFloor.toFixed(2)}</td>
              <td class="text-right">${data.previousSecondFloor.toFixed(2)}</td>
              <td class="text-right">${data.secondFloorUsage.toFixed(2)}</td>
              <td class="text-right">${data.secondFloorPercentage.toFixed(2)}%</td>
            </tr>
            <tr>
              <td><strong>TOTAL</strong></td>
              <td></td>
              <td></td>
              <td class="text-right"><strong>${data.totalUsage.toFixed(2)}</strong></td>
              <td class="text-right"><strong>100%</strong></td>
            </tr>
          </tbody>
        </table>

        <table>
          <thead>
            <tr>
              <th>Location</th>
              <th class="text-right">Total Amount</th>
              <th class="text-right">Percentage</th>
              <th class="text-right">Amount per Location</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>First Floor</td>
              <td class="text-right">PHP ${data.amount.toFixed(2)}</td>
              <td class="text-right">${data.firstFloorPercentage.toFixed(2)}%</td>
              <td class="text-right">PHP ${data.firstFloorAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Second Floor</td>
              <td class="text-right">PHP ${data.amount.toFixed(2)}</td>
              <td class="text-right">${data.secondFloorPercentage.toFixed(2)}%</td>
              <td class="text-right">PHP ${data.secondFloorAmount.toFixed(2)}</td>
            </tr>
            <tr>
              <td><strong>TOTAL AMOUNT DUE</strong></td>
              <td></td>
              <td></td>
              <td class="text-right"><strong>PHP ${data.amount.toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="photos-row">
        ${getPdfImageSection('Reading Image', readingPrintableSrc)}
        ${getPdfImageSection('Billing Image', billingPrintableSrc)}
      </section>

      <section class="compact-summary-grid">
        ${getCompactAmountTable(data, 'First Floor', data.firstFloorAmount)}
        ${getCompactAmountTable(data, 'Second Floor', data.secondFloorAmount)}
      </section>
    </section>
  `

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${escapeHtml(filename)}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
          * {
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            color: #000;
            background: #fff;
          }
          .page {
            max-width: 900px;
            margin: 0 auto;
          }
          .copy-block {
            page-break-inside: avoid;
          }
          h1 {
            margin: 0 0 3px 0;
            font-size: 12px;
            text-align: center;
          }
          .meta-row {
            margin: 0 0 8px 0;
            font-size: 9px;
            text-align: center;
            display: flex;
            justify-content: center;
            gap: 28px;
          }
          .due-date {
            color: #c00000;
          }
          .section-title {
            margin: 0 0 4px 0;
            font-size: 11px;
            font-weight: bold;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 6px;
          }
          th, td {
            border: 1px solid #000;
            padding: 3px 5px;
            font-size: 10px;
          }
          th {
            background: #f2f2f2;
            text-align: left;
          }
          .text-right {
            text-align: right;
          }
          .pdf-section {
            margin-top: 8px;
            page-break-inside: avoid;
          }
          .photos-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            margin-top: 6px;
          }
          .image-panel {
            page-break-inside: avoid;
          }
          .image-label {
            margin: 0 0 3px 0;
            font-size: 9px;
            font-weight: bold;
            text-align: center;
          }
          .embed-image-wrap {
            border: 1px solid #000;
            height: 500px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .embed-image {
            width: 100%;
            height: 100%;
            display: block;
            object-fit: contain;
            background: #fff;
          }
          .embed-placeholder {
            width: 100%;
            height: 100%;
            border: 1px dashed #777;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: #555;
          }
          .prepared-line {
            margin: 5px 0 0 0;
            font-size: 9px;
            text-align: left;
          }
          .compact-summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-top: 8px;
            page-break-inside: avoid;
          }
          .compact-summary-card {
            border: 1px solid #000;
            padding: 6px;
          }
          .compact-summary-card h2 {
            margin: 0 0 3px 0;
            font-size: 11px;
            line-height: 1.2;
            text-align: center;
          }
          .compact-meta {
            display: flex;
            justify-content: center;
            gap: 8px;
            margin-bottom: 4px;
            font-size: 8px;
            line-height: 1.2;
          }
          .compact-section-title {
            margin: 0 0 3px 0;
            font-size: 9px;
            font-weight: bold;
          }
          .compact-table {
            margin-bottom: 4px;
          }
          .compact-table th,
          .compact-table td {
            padding: 2px 3px;
            font-size: 8px;
          }
          .amount-only-table {
            margin-bottom: 0;
          }
          @media print {
            .page {
              width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="page">
          ${contentHtml}
        </div>
      </body>
    </html>
  `
}

export function buildBillingPreviewElement(data: BillingDataForExport) {
  const wrapper = document.createElement('div')
  wrapper.style.width = '900px'
  wrapper.style.background = '#ffffff'
  wrapper.style.color = '#000000'
  wrapper.style.padding = '24px'
  wrapper.style.fontFamily = 'Arial, sans-serif'
  wrapper.style.fontSize = '12px'

  // Compact table styles for single page
  const compactTableStyle = 'width:100%; border-collapse:collapse; margin-bottom:10px; border:1px solid #000000;'
  const compactCellStyle = 'border:1px solid #000000; padding:6px 8px; font-size:11px;'

  const html = `
    <div style="border:1px solid #000000; padding:16px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:12px; gap:16px;">
        <div style="font-size:12px; font-weight:bold;">
          Reading Date: ${new Date(data.currentDate).toLocaleDateString()}
        </div>
        <div style="font-size:12px; font-weight:bold; color:#c00000;">
          Due Date: ${new Date(data.dueDate).toLocaleDateString()}
        </div>
      </div>

      <!-- COMPUTATION SECTION -->
      <div style="margin:0 0 6px 0; font-size:12px; font-weight:bold;">Computation</div>
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

      <div style="display:flex; justify-content:space-between; gap:16px; margin-top:14px; padding-top:10px; border-top:1px solid #000000; font-size:11px;">
        <div><strong>Prepared by:</strong> ${data.preparedBy}</div>
        <div><strong>Date Prepared:</strong> ${new Date().toLocaleDateString()}</div>
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
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      throw new Error('Could not open print window. Please disable popup blockers.')
    }
    const printHtml = await buildBillingPdfHtml(data, filename)

    printWindow.document.open()
    printWindow.document.write(printHtml)
    printWindow.document.close()

    setTimeout(() => {
      printWindow.focus()
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
