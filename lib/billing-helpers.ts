import { Utility, UtilityPayment } from '@/lib/types'

export interface UtilityWithPayment extends Utility {
  payment?: UtilityPayment
}

export interface BillingData {
  unitName: string
  type: 'MNWD' | 'Casureco'
  dueDate: string
  previousDate: string
  previousUnitReading: number
  previousFirstFloor: number
  previousSecondFloor: number
  currentDate: string
  currentUnitReading: number
  currentFirstFloor: number
  currentSecondFloor: number
  amount: number
  remarks: 'Paid' | 'Not Paid'
  preparedBy: string
}

export interface BillingDataForExport extends BillingData {
  firstFloorUsage: number
  secondFloorUsage: number
  totalUsage: number
  firstFloorPercentage: number
  secondFloorPercentage: number
  firstFloorAmount: number
  secondFloorAmount: number
}

function getNonNegativeUsage(previousReading: number, currentReading: number): number {
  return Math.max(previousReading - currentReading, 0)
}

// Calculate usage from two utility readings
export function calculateBillingData(
  previous: UtilityWithPayment,
  current: UtilityWithPayment,
  unitName: string,
  preparedBy: string
): BillingDataForExport {
  const firstFloorUsage = getNonNegativeUsage(previous.first_floor_reading, current.first_floor_reading)
  const secondFloorUsage = getNonNegativeUsage(previous.second_floor_reading, current.second_floor_reading)
  const totalUsage = firstFloorUsage + secondFloorUsage

  const firstFloorPercentage = totalUsage > 0 ? (firstFloorUsage / totalUsage) * 100 : 0
  const secondFloorPercentage = totalUsage > 0 ? (secondFloorUsage / totalUsage) * 100 : 0

  const firstFloorAmount = (current.amount * firstFloorPercentage) / 100
  const secondFloorAmount = (current.amount * secondFloorPercentage) / 100

  return {
    unitName,
    type: current.type,
    dueDate: current.due_date,
    previousDate: previous.date_of_reading,
    previousUnitReading: previous.unit_reading,
    previousFirstFloor: previous.first_floor_reading,
    previousSecondFloor: previous.second_floor_reading,
    currentDate: current.date_of_reading,
    currentUnitReading: current.unit_reading,
    currentFirstFloor: current.first_floor_reading,
    currentSecondFloor: current.second_floor_reading,
    amount: current.amount,
    remarks: current.payment?.paid ? 'Paid' : 'Not Paid',
    preparedBy,
    firstFloorUsage,
    secondFloorUsage,
    totalUsage,
    firstFloorPercentage,
    secondFloorPercentage,
    firstFloorAmount,
    secondFloorAmount,
  }
}

// Group utilities by unit and type for billing
export function groupUtilitiesForBilling(
  utilities: UtilityWithPayment[],
  type: 'MNWD' | 'Casureco'
): Map<string, UtilityWithPayment[]> {
  const grouped = new Map<string, UtilityWithPayment[]>()

  utilities
    .filter((u) => u.type === type)
    .forEach((utility) => {
      const key = utility.pairing_id || utility.unit_id || 'unknown'
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(utility)
    })

  return grouped
}

// Get last and previous readings for a unit
export function getReadingPair(utilities: UtilityWithPayment[]): {
  previous: UtilityWithPayment | null
  current: UtilityWithPayment | null
} {
  const sorted = [...utilities].sort(
    (a, b) => new Date(b.date_of_reading).getTime() - new Date(a.date_of_reading).getTime()
  )

  return {
    current: sorted[0] || null,
    previous: sorted[1] || null,
  }
}
