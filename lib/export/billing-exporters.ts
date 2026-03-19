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

function getImageHtml(imageUrl: string | null, altText: string): string {
  if (!imageUrl) {
    return `<div style="display:flex; align-items:center; justify-content:center; width:100%; height:280px; background:#f0f0f0; border:1px solid #ccc; font-size:12px; color:#666; font-weight:bold;">${altText} not provided</div>`
  }
  const embeddableUrl = convertGoogleDriveUrlToEmbeddable(imageUrl)
  return `<img src="${embeddableUrl}" alt="${altText}" style="max-width:100%; height:auto; max-height:280px; border:1px solid #000000; display:block;" />`
}

export function buildBillingPreviewElement(data: BillingDataForExport, copies = 3) {
  const wrapper = document.createElement('div')
  wrapper.style.width = '1200px'
  wrapper.style.background = '#ffffff'
  wrapper.style.color = '#000000'
  wrapper.style.padding = '24px'
  wrapper.style.fontFamily = 'Arial, sans-serif'

  const readingImageHtml = getImageHtml(data.readingImageUrl, 'Reading Image')
  const billingImageHtml = getImageHtml(data.billingImageUrl, 'Billing Image')

  const copyHtml = Array.from({ length: copies })
    .map(
      (_, idx) => `
      <div style="margin-bottom:${idx === copies - 1 ? 0 : 32}px; border:1px solid #e5e7eb; padding:16px;">
        <h2 style="text-align:center; margin:0 0 8px 0;">${data.unitName} (${data.type}) - ${new Date(
          data.currentDate
        ).toLocaleDateString()}</h2>
        <table style="width:100%; margin-bottom:12px;">
          <tr>
            <td style="text-align:center; width:50%;">Date of Reading: ${new Date(data.currentDate).toLocaleDateString()}</td>
            <td style="text-align:center; width:50%; color:#dc2626;">Due Date: ${new Date(data.dueDate).toLocaleDateString()}</td>
          </tr>
        </table>
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
        <div style="display:flex; align-items:flex-end; margin:4px 0;">
          <span>First Floor Amount Due</span>
          <span style="flex:1; border-bottom:1px dotted #000000; margin:0 6px 4px 6px;"></span>
          <span>PHP ${data.firstFloorAmount.toFixed(2)}</span>
        </div>
        <div style="display:flex; align-items:flex-end; margin:4px 0;">
          <span>Second Floor Amount Due</span>
          <span style="flex:1; border-bottom:1px dotted #000000; margin:0 6px 4px 6px;"></span>
          <span>PHP ${data.secondFloorAmount.toFixed(2)}</span>
        </div>
        <div style="width:100%; margin:6px 0; border-top:1px solid #000000;"></div>
        <div style="display:flex; align-items:flex-end; margin:4px 0; font-weight:700;">
          <span>Total Amount Due</span>
          <span style="flex:1; border-bottom:1px dotted #000000; margin:0 6px 4px 6px;"></span>
          <span>PHP ${data.amount.toFixed(2)}</span>
        </div>
        <p style="margin:12px 0 4px 0;">Prepared by: ${data.preparedBy}</p>
        <p style="margin:4px 0 12px 0;">Date Prepared: ${new Date().toLocaleDateString()}</p>
        
        <!-- Images Section -->
        <div style="border-top:2px solid #000000; padding-top:12px; margin-top:12px;">
          <h3 style="text-align:center; margin:0 0 12px 0; font-size:14px;">Supporting Documents</h3>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
            <div style="text-align:center;">
              <div style="font-weight:bold; font-size:12px; margin-bottom:8px;">Reading Image</div>
              ${readingImageHtml}
            </div>
            <div style="text-align:center;">
              <div style="font-weight:bold; font-size:12px; margin-bottom:8px;">Reading Image</div>
              ${readingImageHtml}
            </div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div style="text-align:center;">
              <div style="font-weight:bold; font-size:12px; margin-bottom:8px;">Billing Image</div>
              ${billingImageHtml}
            </div>
            <div style="text-align:center;">
              <div style="font-weight:bold; font-size:12px; margin-bottom:8px;">Billing Image</div>
              ${billingImageHtml}
            </div>
          </div>
        </div>
      </div>`
    )
    .join('')

  wrapper.innerHTML = copyHtml
  return wrapper
}

export async function exportBillingToPng(data: BillingDataForExport, filename: string) {
  try {
    const node = buildBillingPreviewElement(data, 1)
    document.body.appendChild(node)
    
    // Wait for images to load with timeout
    const images = node.querySelectorAll('img')
    const imagePromises = Array.from(images).map(img => 
      Promise.race([
        new Promise<void>((resolve) => {
          img.onload = () => resolve()
          img.onerror = () => resolve() // Continue even if image fails to load
          if (img.complete) resolve() // If already loaded
        }),
        new Promise<void>((resolve) => setTimeout(() => resolve(), 5000)) // 5 second timeout per image
      ])
    )
    await Promise.all(imagePromises)
    
    const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2 })
    document.body.removeChild(node)

    const response = await fetch(dataUrl)
    const blob = await response.blob()
    downloadBlob(blob, filename)
  } catch (error) {
    console.error('Error exporting to PNG:', error)
    throw new Error('Failed to generate PNG. Please check the image URLs and try again.')
  }
}

export async function exportBillingToPdf(data: BillingDataForExport, filename: string) {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4',
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 24
    const node = buildBillingPreviewElement(data, 3)
    document.body.appendChild(node)
    
    // Wait for images to load with timeout
    const images = node.querySelectorAll('img')
    const imagePromises = Array.from(images).map(img => 
      Promise.race([
        new Promise<void>((resolve) => {
          img.onload = () => resolve()
          img.onerror = () => resolve() // Continue even if image fails to load
          if (img.complete) resolve() // If already loaded
        }),
        new Promise<void>((resolve) => setTimeout(() => resolve(), 5000)) // 5 second timeout per image
      ])
    )
    await Promise.all(imagePromises)
    
    const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2 })
    document.body.removeChild(node)

    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Failed to render billing document'))
      img.src = dataUrl
    })

    const ratio = Math.min((pageWidth - margin * 2) / img.width, (pageHeight - margin * 2) / img.height)
    const width = img.width * ratio
    const height = img.height * ratio
    pdf.addImage(dataUrl, 'PNG', (pageWidth - width) / 2, margin, width, height)

    pdf.save(filename)
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    throw new Error('Failed to generate PDF. Please check the image URLs and ensure they are accessible.')
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
