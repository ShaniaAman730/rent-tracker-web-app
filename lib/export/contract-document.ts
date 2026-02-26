import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx'
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

type Block = {
  text: string
  align?: 'left' | 'center' | 'right' | 'justify'
  bold?: boolean
  italic?: boolean
  indentLeft?: number
  indentHanging?: number
  indentFirstLine?: number
}

function getContractBlocks(data: ContractData): Block[] {
  const tenantUpper = `${data.firstName} ${data.middleName} ${data.lastName}`.toUpperCase().replace(/\s+/g, ' ').trim()
  const middleInitial = data.middleName ? `${data.middleName[0].toUpperCase()}.` : ''
  const tenantSignatureName = `MR. ${data.firstName.toUpperCase()} ${middleInitial} ${data.lastName.toUpperCase()}`
    .replace(/\s+/g, ' ')
    .trim()
  const tenantAcknowledgeName = `${data.firstName.toUpperCase()} ${middleInitial} ${data.lastName.toUpperCase()}`
    .replace(/\s+/g, ' ')
    .trim()
  const rentText = `${toWords(data.rent)} PESOS (${formatCurrency(data.rent)})`
  const cashBondText = `${toWords(data.cashBond)} PESOS (${formatCurrency(data.cashBond)})`
  const clauses: Block[] = [
    {
      text: `1. That the monthly rental shall be ${rentText}, Philippine currency, to be paid by the LESSEE at the office of the LESSOR at 65 Sacred Heart St., Zone 1, San Felipe, Naga City, the rental for the first month to be paid upon signing of the herein contract and the rental for the subsequent months to be paid NOT LATER THAN THE FIRST FIVE (5) DAYS OF EACH CALENDAR MONTH without the necessity of express demand and without delay on any ground whatsoever, plus FIVE PERCENT (5%) surcharge/interest per month on all amounts due and in arrears reckoned from the time of default payment until fully paid.`,
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
    },
    {
      text: `2. The LESSEE or her representative, upon signing of this agreement shall deposit to the LESSOR a NON-CONSUMABLE CASH BOND OF ${cashBondText} to answer for the faithful compliance by the LESSEE of his obligation under this contract including accrued rentals at the termination of the LEASE OF CONTRACT, but the same shall not earn interest nor shall it be made the measure of damages that the LESSOR may collect from the LESSEE herein. Said bond shall be refunded to the LESSEE upon the termination of the lease, and only after deducting all amount that may be payable to the LESSOR by the LESSEE under this contract. The LESSOR may deduct from time to time from the said deposit any advances and damages which the LESSEE may be liable under any provision of this contract, and if such deduction/bond shall have been reduced, the LESSEE within five (5) days demand shall make additional deposit in order to maintain the deposit in its original amount. The deposit herein agreed shall be without prejudice to the right of the LESSOR to collect the current monthly rentals when due in accordance with the term of this contract.`,
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
    },
    {
      text: `3. The terms of the lease shall be TWELVE MONTHS beginning ${formatLongDate(data.beginContract)} and expiring ${formatLongDate(data.endContract)} renewable at the option of the LESSOR for another like period under the same terms and conditions except that the rate of the monthly rentals may be increased.`,
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
    },
    {
      text: '4. That the LESSEE hereby expressly agrees that the leased premises shall be used exclusively for family dwelling and shall have no right to use the same for business purposes.',
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
    },
    {
      text: '5. The LESSEE is hereby prohibited from assigning or sub-leasing in whole and in part of the leased premises without the written consent of the LESSOR likewise LESSEE is strictly prohibited from assigning, selling transferring or conveying the leasehold right or "goodwill" to any person.',
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
    },
    {
      text: '6. The LESSEE hereby expressly acknowledges that the leased premises are in good and tenantable condition and agrees to keep the same in such good tenantable condition. Any provision of law, present or future or any stipulation in this agreement to the contrary notwithstanding, the LESSEE hereby agrees and binds himself to undertake at his exclusive expense all repairs, necessary or otherwise, such maybe required to maintain the same in good state of repair. It is expressly agreed and understood, however, that the LESSEE shall not start or proceed with any repair work nor in any case introduce improvements or make any alterations of in leased premises without the prior written consent and approval of the LESSOR and parties agree that all improvements or alterations of whatsoever nature such as may be made thereon shall, upon completion thereof, form integral parts of the leased premises and shall not be removed there from but shall belong to and become the exclusive property of the LESSOR, without any right on the part of the LESSEE to the reimbursement of the cost of the value thereof.',
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
    },
    {
      text: '7. The LESSEE shall pay for any defray at her (its) exclusive expense, the consumption of water, electric light, telephone or any other utility services in the leased premises; all repairs in the utility services system therein shall be made by the LESSEE but not for the exclusive account of the LESSEE.',
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
    },
    {
      text: '8. The LESSEE shall not paint; make alterations or changes in the electrical or plumbing installations within the leased premises, without the prior consent of the LESSOR.',
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
    },
    {
      text: '9. The LESSEE shall not claim any loss or damages on account of necessary work that the LESSOR may order to be done in the building, and which in any way may interrupt (its) use of the premises leased.',
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
    },
    {
      text: '10. The LESSEE may comply with any all laws, ordinances, regulations or orders of the National or City Government authorities arising from or regarding the use, occupation and sanitation of the leased premises. Failure to comply with the said laws, ordinances, regulations or orders shall be at the exclusive risk and expenses of the LESSEE.',
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
    },
    {
      text: '11. The LESSEE shall not bring into or store in the leased premises, any inflammable or explosive goods or materials nor any article which may expose the leased premises to fire or increase the fire hazard of the building, or any other article which the LESSOR may prohibit; the LESSOR shall not do or cause to be done any act or thing which shall likewise increase the fire hazard or fire insurance of the building. Firewood and charcoal are prohibited in cooking of food.',
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
    },
    {
      text: '12. The LESSEE shall comply with all sanitary rules and safety regulations which may be promulgated from time to time by the LESSOR and shall keep and maintain the leased premises in clean and sanitary condition and dispose of all rubbish only thru the means and places indicated by the LESSOR for the purpose.',
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
    },
    {
      text: '13. The LESSEE expressly agrees to strictly abide by all the regulations which may be given by the LESSOR from time to time for the building in general.',
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
    },
    {
      text: '14. The LESSOR or its duly authorized representative shall have the right to inspect the leased premises at any reasonable hour of the day.',
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
    },
    {
      text: '15. The LESSEE shall be responsible at all times for all acts done by her family members and other persons entering the leased premises insofar as the enforcement of the provisions of this contract is concerned. Any damage or injury to the leased premises due to fault of the LESSEE, her (its) family members and or other third person who may have gained access to the leased premises shall be repaired promptly by the LESSEE at its exclusive expense. The LESSOR however shall not be responsible for any loss or damage which the LESSEE may sustain the premises, due to any cause whatsoever.',
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
    },
    {
      text: '16. The LESSEE shall not make or permit any disturbing noise within the leased premises caused by himself (itself) or by persons under her (its) control, nor permit anything to be done by himself (itself) or such other persons which will interfere with the rights, comfort or convenience of the other tenants.',
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
    },
    {
      text: '17. Illegal drugs are not allowed.  Alcohol, smoking and public intoxication are not allowed in the common areas.  This includes hallway, parking area and front of the building.',
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
    },
    {
      text: '18. The LESSEE shall not be permitted to bring pets such as dogs, cats, birds, roosters and other animals, within the leased premises and in the common areas.',
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
      bold: true,
      italic: true,
    },
    {
      text: '19. The LESSEE shall not be liable for the presence of bugs, ants, anay or insects, if any, in the leased premises. The LESSOR shall not be liable for the failure of water and/or electric current.',
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
    },
    {
      text: '20. The LESSEE at the expiration of the term of the lease or cancellation of this lease a herein provided, will promptly deliver the said premises to the LESSOR in a good and tenantable conditions in all respects as the same now are, the reasonable wear and tear excepted, devoid of all occupants, furniture, articles and effects of any kind, provided, however, than non-compliance on the part of the LESSEE with term of this clause will give the LESSOR the right at its option, to refuse to accept the delivery of the premises and to compel the LESSEE to pay the rent therefore at the same rate of rental as herein provided, plus 50% additional sum of penalty, until the LESSEE shall have complied with terms hereof. This same penalty shall likewise be imposed in case the LESSEE shall refuse to leave the leased premises after her (its) right to lease has expired or terminated for any reasons whatsoever.',
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
    },
    {
      text: '21. If the said premises be not surrendered at the end of the term, the LESSEE shall be responsible to the LESSOR for all damages which the LESSOR shall suffer by reason thereof and will indemnify the LESSOR against all claims made by any succeeding tenant against the LESSOR in delivering possession of the premises to such succeeding tenants, in so far as such delay is occasioned by failure of the LESSEE to surrender the premises.',
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
    },
    {
      text: '22. The LESSEE hereby expressly recognizes the absolute right of the LESSOR to sell the leased premises, and in the event of sale, this contract shall deem ipso facto cancelled and the right of said LESSEE to occupy the premises considered automatically terminated.',
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
    },
    {
      text: '23. In case of cancellation of contract by the LESSEE or the LESSOR, each party is required to inform the other party of the cancellation one month prior to the date of cancellation.  If the LESSEE did not inform the LESSOR one month before the cancellation of contract, the LESSEE shall pay the LESSOR an amount equivalent to one month rental of the unit.',
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
    },
    {
      text: '24. The failure of the LESSOR to insist upon a strict performance of any of the terms, conditions, and covenants thereof shall not be deemed a relinquishment of waiver of any right of remedy that said LESSOR may have, nor shall it be construed as a waiver of any subsequent breach or default of the terms, conditions, and covenants herein contained, which shall be deemed in full force and effect. No waiver by the LESSOR shall deem to have been made unless express in writing and signed by the LESSOR.',
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
    },
    {
      text: '25. All expenses, documentary stamps, tax and fees in the execution of this contract of lease shall be borne by the LESSEE.',
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
    },
    {
      text: '26. All actions arising out of this contract or in pursuance to the terms and conditions thereof shall be filed in the proper Courts of Naga City.',
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
    },
    {
      text: '27. This lease of contract supersedes and renders void any and all agreements and such understanding, oral and or written previously entered between parties covering the property herein leased, and this agreement may not hereafter be modified or altered except by instrument in writing duly signed by the parties hereto.',
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
    },
    {
      text: `28. Upon signing of this agreement, the LESSEE shall pay by way of deposit unto the sum of ${cashBondText} PESOS to be applied in payment of rentals in arrears and other expenses or charges that the LESSEE may owe in favor of the LESSOR.`,
      align: 'justify',
      indentLeft: 900,
      indentHanging: 360,
    },
  ]

  return [
    { text: 'CONTRACT OF LEASE', align: 'center', bold: true },
    { text: '' },
    {
      text: `This CONTRACT OF LEASE made and executed by and between: The LESSOR: ${data.lessorName}, of legal age, Filipino, single, resident and with postal address at 65 Sacred Heart St., Zone 1, San Felipe, Naga City, Philippines.`,
      align: 'justify',
      indentFirstLine: 720,
    },
    { text: '' },
    { text: 'and    -', align: 'center', indentLeft: 720, indentHanging: 360 },
    { text: '' },
    {
      text: `The LESSEE: ${tenantUpper}, of legal age, ${data.citizenship}, ${data.maritalStatus}, and with postal address at ${data.tenantAddress}, Philippines.`,
      align: 'justify',
      indentFirstLine: 720,
    },
    { text: '' },
    { text: 'W I T H N E S S E T H', align: 'center', bold: true },
    { text: '' },
    {
      text: `The LESSOR hereby leases unto the LESSEE, and the latter hereby accepts in lease form the ${data.unitSpecification} of the ${data.propertySpecification} with exact postal address at ${data.propertyAddress}, Philippines, under the following terms & conditions.`,
      align: 'justify',
      indentFirstLine: 720,
    },
    { text: '' },
    ...clauses,
    { text: '' },
    {
      text: 'IN WITNESS WHEREOF, we have hereunto affixed our signatures, this ______ day of ________________________, 20__ at Naga City, Philippines.',
      align: 'justify',
      indentFirstLine: 720,
    },
    { text: '' },
    { text: `                                     (${tenantSignatureName})` },
    { text: ` ENGR. ${data.lessorName}                              ${tenantSignatureName}` },
    { text: '                LESSOR                                                                         LESSEE' },
    { text: '' },
    { text: 'SIGNED IN THE PRESENCE OF:' },
    { text: '' },
    { text: '_________________________________                  ______________________________' },
    { text: '' },
    { text: '' },
    { text: 'A C K N O W L E D G E M E N T', align: 'center', bold: true },
    { text: '' },
    { text: 'REPUBLIC OF THE PHILIPPINES)' },
    { text: 'CITY OF NAGA ………………….)' },
    { text: '' },
    {
      text: 'BEFORE ME, at the place first above written, on this ______ day of _______________________, 20__ personally appeared the following persons with their respective Community Tax Certificate No., to wit:',
      align: 'justify',
      indentFirstLine: 720,
    },
    { text: '' },
    {
      text: `${data.lessorName.toUpperCase()} with PRC No. 0066992  issued on July 12, 1993 and Expiry date on October 24, 2028 and ${tenantAcknowledgeName} with Driver's License No. D04-18-010458 with expiry date on August 21, 2032 known to me be the same persons who executed the foregoing instrument containing of five (5) pages, and including this page, duly signed by the parties at the left hand margin on each & every page thereof, they all acknowledge to me that the same is their own free and voluntary act indeed.`,
      align: 'justify',
    },
    { text: '' },
    {
      text: 'Witness my hand and Notarial seal at the place and on the date first above written.',
      align: 'justify',
      indentFirstLine: 720,
    },
    { text: '' },
    { text: '' },
    { text: '_________________________________', align: 'right' },
    { text: '                                                                                                   Notary Public' },
    { text: '' },
    { text: '' },
    { text: 'Doc. No. ____________' },
    { text: 'Book No. ___________' },
    { text: 'Page No. ____________' },
    { text: 'Series No. ___________      ' },
  ]
}

export async function generateContractDocument(contractData: ContractData): Promise<Blob> {
  const blocks = getContractBlocks(contractData)
  const document = new Document({
    sections: [
      {
        children: blocks.map((block) =>
          new Paragraph({
            alignment:
              block.align === 'center'
                ? AlignmentType.CENTER
                : block.align === 'right'
                ? AlignmentType.RIGHT
                : block.align === 'justify'
                ? AlignmentType.JUSTIFIED
                : AlignmentType.LEFT,
            spacing: { line: 240, before: 0, after: 120 },
            indent: {
              left: block.indentLeft,
              hanging: block.indentHanging,
              firstLine: block.indentFirstLine,
            },
            children: [
              new TextRun({
                text: block.text,
                size: 24,
                font: 'Times New Roman',
                bold: Boolean(block.bold),
                italics: Boolean(block.italic),
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
  const blocks = getContractBlocks(contractData)

  for (const block of blocks) {
    const x = marginX + (block.indentLeft ? (block.indentLeft / 900) * 14 : 0)
    const width = Math.max(420, maxWidth - (x - marginX))
    const lines = doc.splitTextToSize(block.text || ' ', width)
    const blockHeight = lines.length * 14

    if (y + blockHeight > pageHeight - 40) {
      doc.addPage()
      y = marginTop
    }

    doc.setFont('times', block.bold ? 'bold' : block.italic ? 'italic' : 'normal')

    if (block.align === 'center') {
      doc.text(lines, doc.internal.pageSize.getWidth() / 2, y, { align: 'center', maxWidth: width })
    } else if (block.align === 'right') {
      doc.text(lines, doc.internal.pageSize.getWidth() - marginX, y, { align: 'right', maxWidth: width })
    } else if (block.align === 'justify') {
      doc.text(lines, x, y, { align: 'justify', maxWidth: width })
    } else {
      doc.text(lines, x, y)
    }
    y += blockHeight
  }

  return doc.output('blob')
}
