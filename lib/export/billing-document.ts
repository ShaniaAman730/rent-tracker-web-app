import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, AlignmentType, BorderStyle, VerticalAlign, TextRun } from 'docx'
import { BillingDataForExport } from '@/lib/billing-helpers'

export async function generateBillingDocument(billingData: BillingDataForExport): Promise<Buffer> {
  // Create table 1 - Consumption breakdown
  const table1 = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      // Header row
      new TableRow({
        children: [
          createCell('Location', true),
          createCell('Current RDG. kw hour', true),
          createCell('Previous RDG. kw hour', true),
          createCell('Consumption kw hour', true),
          createCell('Percentage', true),
        ],
      }),
      // First floor
      new TableRow({
        children: [
          createCell('First Floor'),
          createCell(billingData.currentFirstFloor.toFixed(2)),
          createCell(billingData.previousFirstFloor.toFixed(2)),
          createCell(billingData.firstFloorUsage.toFixed(2)),
          createCell(billingData.firstFloorPercentage.toFixed(2) + '%'),
        ],
      }),
      // Second floor
      new TableRow({
        children: [
          createCell('Second Floor'),
          createCell(billingData.currentSecondFloor.toFixed(2)),
          createCell(billingData.previousSecondFloor.toFixed(2)),
          createCell(billingData.secondFloorUsage.toFixed(2)),
          createCell(billingData.secondFloorPercentage.toFixed(2) + '%'),
        ],
      }),
      // Total row
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

  // Create table 2 - Amount breakdown
  const table2 = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      // Header row
      new TableRow({
        children: [
          createCell('Location', true),
          createCell('Total Amount', true),
          createCell('Percentage', true),
          createCell('Amount per Location', true),
        ],
      }),
      // First floor
      new TableRow({
        children: [
          createCell('First Floor'),
          createCell('₱' + billingData.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })),
          createCell(billingData.firstFloorPercentage.toFixed(2) + '%'),
          createCell('₱' + billingData.firstFloorAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })),
        ],
      }),
      // Second floor
      new TableRow({
        children: [
          createCell('Second Floor'),
          createCell('₱' + billingData.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })),
          createCell(billingData.secondFloorPercentage.toFixed(2) + '%'),
          createCell('₱' + billingData.secondFloorAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })),
        ],
      }),
      // Total row
      new TableRow({
        children: [
          createCell('TOTAL', true),
          createCell(''),
          createCell(''),
          createCell('₱' + billingData.amount.toLocaleString(undefined, { maximumFractionDigits: 2 }), true),
        ],
      }),
    ],
  })

  const sections = []

  // Create 3 copies of the billing
  for (let copy = 1; copy <= 3; copy++) {
    const copyParagraphs: Paragraph[] = []

    // Title
    copyParagraphs.push(
      new Paragraph({
        text: `${billingData.unitName} - ${billingData.type}`,
        alignment: AlignmentType.CENTER,
        spacing: { line: 240, after: 120 },
        runs: [new TextRun({ text: `${billingData.unitName} - ${billingData.type}`, bold: true, size: 28 })],
      })
    )

    copyParagraphs.push(
      new Paragraph({
        text: `${new Date(billingData.dueDate).toLocaleDateString()}`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
      })
    )

    // Table 1
    copyParagraphs.push(
      new Paragraph({
        text: 'Consumption Breakdown',
        spacing: { after: 120 },
        runs: [new TextRun({ text: 'Consumption Breakdown', bold: true })],
      })
    )
    copyParagraphs.push(new Paragraph({ text: '', children: [table1] }))

    copyParagraphs.push(new Paragraph({ text: '', spacing: { after: 240 } }))

    // Table 2
    copyParagraphs.push(
      new Paragraph({
        text: 'Amount Breakdown',
        spacing: { after: 120 },
        runs: [new TextRun({ text: 'Amount Breakdown', bold: true })],
      })
    )
    copyParagraphs.push(new Paragraph({ text: '', children: [table2] }))

    // Footer
    copyParagraphs.push(
      new Paragraph({
        text: '',
        spacing: { after: 240 },
      })
    )

    copyParagraphs.push(
      new Paragraph({
        text: `Prepared by: ${billingData.preparedBy}`,
        spacing: { after: 60 },
      })
    )

    copyParagraphs.push(
      new Paragraph({
        text: `Date: ${new Date().toLocaleDateString()}`,
      })
    )

    copyParagraphs.push(
      new Paragraph({
        text: `Status: ${billingData.remarks}`,
        spacing: { after: 240 },
      })
    )

    copyParagraphs.push(
      new Paragraph({
        text: `--- Copy ${copy} of 3 ---`,
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
      })
    )

    sections.push(...copyParagraphs)
  }

  const document = new Document({
    sections: [
      {
        children: sections,
      },
    ],
  })

  const buffer = await Packer.toBuffer(document)
  return buffer
}

function createCell(text: string, bold = false): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        text: text,
        runs: bold ? [new TextRun({ text: text, bold: true })] : undefined,
      }),
    ],
    shading: bold ? { fill: 'D3D3D3' } : undefined,
    margins: { top: 60, bottom: 60, left: 60, right: 60 },
    verticalAlign: VerticalAlign.CENTER,
  })
}
