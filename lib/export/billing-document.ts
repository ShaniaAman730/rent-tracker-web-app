import {
  AlignmentType,
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
import { BillingDataForExport } from '@/lib/billing-helpers'

function createCell(text: string, bold = false): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold })],
      }),
    ],
    margins: { top: 80, bottom: 80, left: 80, right: 80 },
    verticalAlign: VerticalAlign.CENTER,
  })
}

function buildConsumptionTable(billingData: BillingDataForExport) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createCell('Location', true),
          createCell('Current RDG. kw hour', true),
          createCell('Previous RDG. kw hour', true),
          createCell('Consumption kw hour', true),
          createCell('Percentage', true),
        ],
      }),
      new TableRow({
        children: [
          createCell('First Floor'),
          createCell(billingData.currentFirstFloor.toFixed(2)),
          createCell(billingData.previousFirstFloor.toFixed(2)),
          createCell(billingData.firstFloorUsage.toFixed(2)),
          createCell(`${billingData.firstFloorPercentage.toFixed(2)}%`),
        ],
      }),
      new TableRow({
        children: [
          createCell('Second Floor'),
          createCell(billingData.currentSecondFloor.toFixed(2)),
          createCell(billingData.previousSecondFloor.toFixed(2)),
          createCell(billingData.secondFloorUsage.toFixed(2)),
          createCell(`${billingData.secondFloorPercentage.toFixed(2)}%`),
        ],
      }),
      new TableRow({
        children: [
          createCell('TOTAL', true),
          createCell(''),
          createCell(''),
          createCell(billingData.totalUsage.toFixed(2), true),
          createCell('100%', true),
        ],
      }),
    ],
  })
}

function buildAmountTable(billingData: BillingDataForExport) {
  const total = billingData.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createCell('Location', true),
          createCell('Total Amount', true),
          createCell('Percentage', true),
          createCell('Amount per Location', true),
        ],
      }),
      new TableRow({
        children: [
          createCell('First Floor'),
          createCell(`PHP ${total}`),
          createCell(`${billingData.firstFloorPercentage.toFixed(2)}%`),
          createCell(
            `PHP ${billingData.firstFloorAmount.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}`
          ),
        ],
      }),
      new TableRow({
        children: [
          createCell('Second Floor'),
          createCell(`PHP ${total}`),
          createCell(`${billingData.secondFloorPercentage.toFixed(2)}%`),
          createCell(
            `PHP ${billingData.secondFloorAmount.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}`
          ),
        ],
      }),
      new TableRow({
        children: [
          createCell('TOTAL', true),
          createCell(''),
          createCell(''),
          createCell(`PHP ${total}`, true),
        ],
      }),
    ],
  })
}

export async function generateBillingDocument(billingData: BillingDataForExport): Promise<Blob> {
  const children: (Paragraph | Table)[] = []

  for (let copy = 1; copy <= 3; copy++) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: `${billingData.unitName} (${billingData.type}) - ${new Date(
              billingData.currentDate
            ).toLocaleDateString()}`,
            bold: true,
            size: 28,
          }),
        ],
      })
    )

    children.push(
      new Paragraph({
        text: 'Consumption Breakdown',
        spacing: { after: 80 },
        children: [new TextRun({ text: 'Consumption Breakdown', bold: true })],
      })
    )

    children.push(buildConsumptionTable(billingData))
    children.push(new Paragraph({ text: '', spacing: { after: 160 } }))

    children.push(
      new Paragraph({
        text: 'Amount Breakdown',
        spacing: { after: 80 },
        children: [new TextRun({ text: 'Amount Breakdown', bold: true })],
      })
    )
    children.push(buildAmountTable(billingData))
    children.push(new Paragraph({ text: '', spacing: { after: 160 } }))

    children.push(new Paragraph({ text: `Prepared by: ${billingData.preparedBy}` }))
    children.push(new Paragraph({ text: `Date: ${new Date().toLocaleDateString()}` }))
    children.push(new Paragraph({ text: `Status: ${billingData.remarks}` }))

    if (copy < 3) {
      children.push(
        new Paragraph({
          text: '',
          pageBreakBefore: true,
        })
      )
    }
  }

  const doc = new Document({
    sections: [{ children }],
  })

  return Packer.toBlob(doc)
}
