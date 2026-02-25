import { Document, Packer, Paragraph, TextRun } from 'docx'
import jsPDF from 'jspdf'

export interface ContractData {
  lessorName: string
  propertyAddress: string
  year: number
  firstName: string
  middleName: string
  lastName: string
  citizenship: string
  maritalStatus: string
  tenantAddress: string
  unitSpecification: string
  propertySpecification: string
  rent: number
  cashBond: number
  beginContract: string
  endContract: string
}

function formatLongDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatCurrency(value: number) {
  return `P${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function toWords(value: number): string {
  const ones = [
    '',
    'ONE',
    'TWO',
    'THREE',
    'FOUR',
    'FIVE',
    'SIX',
    'SEVEN',
    'EIGHT',
    'NINE',
    'TEN',
    'ELEVEN',
    'TWELVE',
    'THIRTEEN',
    'FOURTEEN',
    'FIFTEEN',
    'SIXTEEN',
    'SEVENTEEN',
    'EIGHTEEN',
    'NINETEEN',
  ]
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY']

  const underThousand = (n: number): string => {
    if (n < 20) return ones[n]
    if (n < 100) {
      const t = Math.floor(n / 10)
      const r = n % 10
      return `${tens[t]}${r ? ` ${ones[r]}` : ''}`
    }

    const h = Math.floor(n / 100)
    const r = n % 100
    return `${ones[h]} HUNDRED${r ? ` ${underThousand(r)}` : ''}`
  }

  const integer = Math.floor(value)
  if (integer === 0) return 'ZERO'

  const chunks = [
    { value: 1000000, name: 'MILLION' },
    { value: 1000, name: 'THOUSAND' },
    { value: 1, name: '' },
  ]

  let num = integer
  const parts: string[] = []
  for (const chunk of chunks) {
    const count = Math.floor(num / chunk.value)
    if (count > 0) {
      parts.push(`${underThousand(count)}${chunk.name ? ` ${chunk.name}` : ''}`)
      num %= chunk.value
    }
  }

  return parts.join(' ').trim()
}

function getContractText(data: ContractData) {
  const tenantUpper = `${data.firstName} ${data.middleName} ${data.lastName}`.toUpperCase().replace(/\s+/g, ' ').trim()
  const middleInitial = data.middleName ? `${data.middleName[0].toUpperCase()}.` : ''
  const tenantSignatureName = `MR. ${data.firstName.toUpperCase()} ${middleInitial} ${data.lastName.toUpperCase()}`.replace(/\s+/g, ' ').trim()
  const rentText = `${toWords(data.rent)} PESOS (${formatCurrency(data.rent)})`
  const cashBondText = `${toWords(data.cashBond)} PESOS (${formatCurrency(data.cashBond)})`

  return [
    'CONTRACT OF LEASE',
    '',
    `This CONTRACT OF LEASE made and executed by and between: The LESSOR: ${data.lessorName}, of legal age, Filipino, single, resident and with postal address at 65 Sacred Heart St., Zone 1, San Felipe, Naga City, Philippines.`,
    '',
    `The LESSEE: ${tenantUpper}, of legal age, ${data.citizenship}, ${data.maritalStatus}, and with postal address at ${data.tenantAddress}.`,
    '',
    'WITHNESSETH',
    '',
    `The LESSOR hereby leases unto the LESSEE, and the latter hereby accepts in lease form the ${data.unitSpecification} of the ${data.propertySpecification} with exact postal address at ${data.propertyAddress}, Philippines, under the following terms and conditions.`,
    '',
    `1. That the monthly rental shall be ${rentText}, Philippine currency, to be paid by the LESSEE at the office of the LESSOR at 65 Sacred Heart St., Zone 1, San Felipe, Naga City, the rental for the first month to be paid upon signing of the herein contract and the rental for the subsequent months to be paid NOT LATER THAN THE FIRST FIVE (5) DAYS OF EACH CALENDAR MONTH without the necessity of express demand and without delay on any ground whatsoever, plus FIVE PERCENT (5%) surcharge/interest per month on all amounts due and in arrears reckoned from the time of default payment until fully paid.`,
    '',
    `2. The LESSEE or her representative, upon signing of this agreement shall deposit to the LESSOR a NON-CONSUMABLE CASH BOND OF ${cashBondText} to answer for the faithful compliance by the LESSEE of his obligation under this contract including accrued rentals at the termination of the LEASE OF CONTRACT.`,
    '',
    `3. The terms of the lease shall be TWELVE MONTHS beginning ${formatLongDate(data.beginContract)} and expiring ${formatLongDate(data.endContract)} renewable at the option of the LESSOR for another like period under the same terms and conditions except that the rate of the monthly rentals may be increased.`,
    '',
    '4. The LESSEE hereby expressly agrees that the leased premises shall be used exclusively for family dwelling and shall have no right to use the same for business purposes.',
    '',
    '5. The LESSEE is hereby prohibited from assigning or sub-leasing in whole and in part of the leased premises without the written consent of the LESSOR.',
    '',
    '6. The LESSEE hereby expressly acknowledges that the leased premises are in good and tenantable condition and agrees to keep the same in such good tenantable condition.',
    '',
    '7. The LESSEE shall pay at her exclusive expense, the consumption of water, electric light, telephone or any other utility services in the leased premises.',
    '',
    '8. The LESSEE shall not paint; make alterations or changes in the electrical or plumbing installations within the leased premises, without the prior consent of the LESSOR.',
    '',
    '9. The LESSEE shall not claim any loss or damages on account of necessary work that the LESSOR may order to be done in the building, and which in any way may interrupt use of the premises leased.',
    '',
    '10. The LESSEE may comply with all laws, ordinances, regulations or orders of the National or City Government authorities arising from or regarding the use, occupation and sanitation of the leased premises.',
    '',
    '11. The LESSEE shall not bring into or store in the leased premises, any inflammable or explosive goods or materials nor any article which may expose the leased premises to fire.',
    '',
    '12. The LESSEE shall comply with all sanitary rules and safety regulations which may be promulgated from time to time by the LESSOR.',
    '',
    '13. The LESSEE expressly agrees to strictly abide by all the regulations which may be given by the LESSOR from time to time for the building in general.',
    '',
    '14. The LESSOR or its duly authorized representative shall have the right to inspect the leased premises at any reasonable hour of the day.',
    '',
    '15. The LESSEE shall be responsible at all times for all acts done by her family members and other persons entering the leased premises.',
    '',
    '16. The LESSEE shall not make or permit any disturbing noise within the leased premises.',
    '',
    '17. Illegal drugs are not allowed. Alcohol, smoking and public intoxication are not allowed in the common areas.',
    '',
    '18. The LESSEE shall not be permitted to bring pets such as dogs, cats, birds, roosters and other animals, within the leased premises and in the common areas.',
    '',
    '19. The LESSOR shall not be liable for the failure of water and/or electric current.',
    '',
    '20. The LESSEE at the expiration of the term of the lease or cancellation of this lease will promptly deliver the said premises to the LESSOR in good and tenantable conditions.',
    '',
    '21. If the said premises be not surrendered at the end of the term, the LESSEE shall be responsible to the LESSOR for all damages which the LESSOR shall suffer by reason thereof.',
    '',
    '22. The LESSEE hereby expressly recognizes the absolute right of the LESSOR to sell the leased premises.',
    '',
    '23. In case of cancellation of contract by the LESSEE or the LESSOR, each party is required to inform the other party one month prior to the date of cancellation.',
    '',
    '24. The failure of the LESSOR to insist upon strict performance of any of the terms shall not be deemed a waiver of rights.',
    '',
    '25. All expenses, documentary stamps, tax and fees in the execution of this contract of lease shall be borne by the LESSEE.',
    '',
    '26. All actions arising out of this contract shall be filed in the proper Courts of Naga City.',
    '',
    '27. This lease of contract supersedes and renders void any and all agreements previously entered between parties covering the property herein leased.',
    '',
    `28. Upon signing of this agreement, the LESSEE shall pay by way of deposit unto the sum of ${cashBondText} PESOS to be applied in payment of rentals in arrears and other expenses or charges that the LESSEE may owe in favor of the LESSOR.`,
    '',
    'IN WITNESS WHEREOF, we have hereunto affixed our signatures, this ______ day of ________________________, 20__ at Naga City, Philippines.',
    '',
    'ENGR. ARMANDO L. AMAN                                  ' + tenantSignatureName,
    'LESSOR                                                 LESSEE',
    '',
    'SIGNED IN THE PRESENCE OF:',
    '',
    '_________________________________      ______________________________',
  ].join('\n')
}

export async function generateContractDocument(contractData: ContractData): Promise<Blob> {
  const lines = getContractText(contractData).split('\n')
  const document = new Document({
    sections: [
      {
        children: lines.map((line) =>
          new Paragraph({
            spacing: { line: 360, before: 0, after: 120 },
            children: [
              new TextRun({
                text: line,
                size: 24,
                font: 'Times New Roman',
                bold: line === 'CONTRACT OF LEASE' || line === 'WITHNESSETH',
              }),
            ],
          })
        ),
      },
    ],
  })

  return Packer.toBlob(document)
}

export async function generateContractPdf(contractData: ContractData): Promise<Blob> {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageHeight = doc.internal.pageSize.getHeight()
  const maxWidth = 520
  const marginX = 40
  const marginTop = 48

  doc.setFont('times', 'normal')
  doc.setFontSize(12)

  let y = marginTop
  const paragraphs = getContractText(contractData).split('\n')

  for (const paragraph of paragraphs) {
    const lines = doc.splitTextToSize(paragraph || ' ', maxWidth)
    const blockHeight = lines.length * 14

    if (y + blockHeight > pageHeight - 40) {
      doc.addPage()
      y = marginTop
    }

    if (paragraph === 'CONTRACT OF LEASE' || paragraph === 'WITHNESSETH') {
      doc.setFont('times', 'bold')
    } else {
      doc.setFont('times', 'normal')
    }

    doc.text(lines, marginX, y)
    y += blockHeight
  }

  return doc.output('blob')
}
