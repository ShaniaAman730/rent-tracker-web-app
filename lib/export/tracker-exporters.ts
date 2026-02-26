import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx'
import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'

export interface UtilityTrackerExportRow {
  dueDate: string
  previousDateOfReading: string
  previousUnitReading: number | null
  currentDateOfReading: string
  currentUnitReading: number
  usage: number | null
  amount: number
}

function formatDate(value: string) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString()
}

function formatReading(value: number | null) {
  if (value === null || Number.isNaN(value)) return '-'
  return value.toFixed(2)
}

function formatAmount(value: number) {
  return `PHP ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

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

function createWordCell(
  text: string,
  bold = false,
  align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT
): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        alignment: align,
        children: [new TextRun({ text, bold })],
      }),
    ],
    margins: { top: 80, bottom: 80, left: 80, right: 80 },
    verticalAlign: VerticalAlign.CENTER,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
      right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    },
  })
}

export async function exportUtilityTrackerToWord(
  pairLabel: string,
  type: 'MNWD' | 'Casureco',
  rows: UtilityTrackerExportRow[],
  filename: string
) {
  const tableRows = [
    new TableRow({
      children: [
        createWordCell('Due Date', true),
        createWordCell('Previous Date of Reading', true),
        createWordCell('Previous Unit Reading', true, AlignmentType.RIGHT),
        createWordCell('Current Date of Reading', true),
        createWordCell('Current Unit Reading', true, AlignmentType.RIGHT),
        createWordCell('Usage', true, AlignmentType.RIGHT),
        createWordCell('Amount', true, AlignmentType.RIGHT),
      ],
    }),
    ...rows.map(
      (row) =>
        new TableRow({
          children: [
            createWordCell(formatDate(row.dueDate)),
            createWordCell(formatDate(row.previousDateOfReading)),
            createWordCell(formatReading(row.previousUnitReading), false, AlignmentType.RIGHT),
            createWordCell(formatDate(row.currentDateOfReading)),
            createWordCell(formatReading(row.currentUnitReading), false, AlignmentType.RIGHT),
            createWordCell(formatReading(row.usage), false, AlignmentType.RIGHT),
            createWordCell(formatAmount(row.amount), false, AlignmentType.RIGHT),
          ],
        })
    ),
  ]

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 180 },
            children: [
              new TextRun({
                text: `${pairLabel} - ${type} Tracker`,
                bold: true,
                size: 28,
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
          }),
        ],
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  downloadBlob(blob, filename)
}

export function exportUtilityTrackerToExcel(
  pairLabel: string,
  type: 'MNWD' | 'Casureco',
  rows: UtilityTrackerExportRow[],
  filename: string
) {
  const aoa: (string | number)[][] = [
    [`${pairLabel} - ${type} Tracker`],
    [],
    [
      'Due Date',
      'Previous Date of Reading',
      'Previous Unit Reading',
      'Current Date of Reading',
      'Current Unit Reading',
      'Usage',
      'Amount',
    ],
  ]

  rows.forEach((row) => {
    aoa.push([
      formatDate(row.dueDate),
      formatDate(row.previousDateOfReading),
      row.previousUnitReading ?? '',
      formatDate(row.currentDateOfReading),
      row.currentUnitReading,
      row.usage ?? '',
      row.amount,
    ])
  })

  const sheet = XLSX.utils.aoa_to_sheet(aoa)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Tracker')
  XLSX.writeFile(workbook, filename)
}

export function exportUtilityTrackerToPdf(
  pairLabel: string,
  type: 'MNWD' | 'Casureco',
  rows: UtilityTrackerExportRow[],
  filename: string
) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const marginX = 24
  const marginTop = 36
  const tableWidth = pageWidth - marginX * 2
  const rowHeight = 22
  const fontSize = 8
  const title = `${pairLabel} - ${type} Tracker`

  const columns = [
    { header: 'Due Date', ratio: 0.12 },
    { header: 'Previous Date of Reading', ratio: 0.19 },
    { header: 'Previous Unit Reading', ratio: 0.14 },
    { header: 'Current Date of Reading', ratio: 0.19 },
    { header: 'Current Unit Reading', ratio: 0.14 },
    { header: 'Usage', ratio: 0.1 },
    { header: 'Amount', ratio: 0.12 },
  ]

  const columnWidths = columns.map((column) => column.ratio * tableWidth)

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.text(title, pageWidth / 2, marginTop, { align: 'center' })

  const drawRow = (y: number, values: string[], header = false) => {
    let x = marginX
    pdf.setFont('helvetica', header ? 'bold' : 'normal')
    pdf.setFontSize(fontSize)
    values.forEach((value, index) => {
      const width = columnWidths[index]
      pdf.rect(x, y, width, rowHeight)
      const lines = pdf.splitTextToSize(value, width - 6)
      pdf.text(lines, x + 3, y + 14)
      x += width
    })
  }

  let y = marginTop + 18
  drawRow(
    y,
    columns.map((column) => column.header),
    true
  )
  y += rowHeight

  rows.forEach((row) => {
    if (y + rowHeight > pageHeight - marginX) {
      pdf.addPage()
      y = marginTop
      drawRow(
        y,
        columns.map((column) => column.header),
        true
      )
      y += rowHeight
    }

    drawRow(y, [
      formatDate(row.dueDate),
      formatDate(row.previousDateOfReading),
      formatReading(row.previousUnitReading),
      formatDate(row.currentDateOfReading),
      formatReading(row.currentUnitReading),
      formatReading(row.usage),
      formatAmount(row.amount),
    ])
    y += rowHeight
  })

  pdf.save(filename)
}
