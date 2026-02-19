import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx'

export interface ContractData {
  propertyName: string
  unitName: string
  contractName: string
  tenantAddress: string
  beginContract: string
  endContract: string
  contractAddress: string
  rentAmount: number
  cashBondAmount: number
}

export async function generateContractDocument(contractData: ContractData): Promise<Blob> {
  const document = new Document({
    sections: [
      {
        children: [
          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [new TextRun({ text: 'LEASE AGREEMENT', bold: true, size: 32 })],
          }),

          // Date
          new Paragraph({
            text: `Prepared: ${new Date().toLocaleDateString()}`,
            spacing: { after: 480 },
          }),

          // Property Information
          new Paragraph({
            spacing: { after: 120 },
            children: [new TextRun({ text: 'PROPERTY INFORMATION', bold: true, size: 24 })],
          }),

          new Paragraph({
            text: `Property Name: ${contractData.propertyName}`,
            spacing: { after: 60 },
          }),

          new Paragraph({
            text: `Unit Name: ${contractData.unitName}`,
            spacing: { after: 60 },
          }),

          new Paragraph({
            text: `Contract Address: ${contractData.contractAddress}`,
            spacing: { after: 240 },
          }),

          // Tenant Information
          new Paragraph({
            spacing: { after: 120 },
            children: [new TextRun({ text: 'TENANT INFORMATION', bold: true, size: 24 })],
          }),

          new Paragraph({
            text: `Contract Name: ${contractData.contractName}`,
            spacing: { after: 60 },
          }),

          new Paragraph({
            text: `Tenant Address: ${contractData.tenantAddress}`,
            spacing: { after: 240 },
          }),

          // Lease Terms
          new Paragraph({
            spacing: { after: 120 },
            children: [new TextRun({ text: 'LEASE TERMS', bold: true, size: 24 })],
          }),

          new Paragraph({
            text: `Contract Begin Date: ${new Date(contractData.beginContract).toLocaleDateString()}`,
            spacing: { after: 60 },
          }),

          new Paragraph({
            text: `Contract End Date: ${new Date(contractData.endContract).toLocaleDateString()}`,
            spacing: { after: 240 },
          }),

          // Financial Terms
          new Paragraph({
            spacing: { after: 120 },
            children: [new TextRun({ text: 'FINANCIAL TERMS', bold: true, size: 24 })],
          }),

          new Paragraph({
            text: `Monthly Rent: ₱${contractData.rentAmount.toLocaleString()}`,
            spacing: { after: 60 },
          }),

          new Paragraph({
            text: `Cash Bond: ₱${contractData.cashBondAmount.toLocaleString()}`,
            spacing: { after: 480 },
          }),

          // Signature Section
          new Paragraph({
            spacing: { after: 240 },
            children: [new TextRun({ text: 'SIGNATURES', bold: true, size: 24 })],
          }),

          new Paragraph({
            text: '_____________________________',
            spacing: { after: 60 },
          }),

          new Paragraph({
            text: 'Lessor/Owner',
            spacing: { after: 240 },
          }),

          new Paragraph({
            text: '_____________________________',
            spacing: { after: 60 },
          }),

          new Paragraph({
            text: 'Lessee/Tenant',
            spacing: { after: 240 },
          }),

          new Paragraph({
            text: '_____________________________',
            spacing: { after: 60 },
          }),

          new Paragraph({
            text: 'Date',
          }),
        ],
      },
    ],
  })

  return Packer.toBlob(document)
}
