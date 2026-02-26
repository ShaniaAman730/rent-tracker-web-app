'use client'

import { useEffect, useMemo, useState } from 'react'
import { getPropertiesWithUnits } from '@/lib/api/properties'
import { deleteUtilityPayment, getUtilitiesWithPaymentsForPairings } from '@/lib/api/utilities'
import { getCurrentUser, getUsersMapByIds } from '@/lib/api/users'
import { getUnitPairings } from '@/lib/api/unit-pairings'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { UtilityPaymentDialog } from '@/components/dialogs/utility-payment-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

const MONTH_OPTIONS = [
  { value: 0, label: 'January' },
  { value: 1, label: 'February' },
  { value: 2, label: 'March' },
  { value: 3, label: 'April' },
  { value: 4, label: 'May' },
  { value: 5, label: 'June' },
  { value: 6, label: 'July' },
  { value: 7, label: 'August' },
  { value: 8, label: 'September' },
  { value: 9, label: 'October' },
  { value: 10, label: 'November' },
  { value: 11, label: 'December' },
]

export function UtilitiesTracker() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [properties, setProperties] = useState<any[]>([])
  const [pairings, setPairings] = useState<any[]>([])
  const [utilitiesMap, setUtilitiesMap] = useState<Map<string, any[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedUtility, setSelectedUtility] = useState<{ utility: any; unit: any } | null>(null)
  const [recordedByNames, setRecordedByNames] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    loadData()
  }, [currentDate])

  async function loadData() {
    try {
      setLoading(true)
      const [user, props, pairingsData] = await Promise.all([
        getCurrentUser(),
        getPropertiesWithUnits(),
        getUnitPairings(),
      ])

      setCurrentUser(user)
      setProperties(props)
      setPairings(pairingsData)

      const utilitiesByPairing = new Map<string, any[]>()
      if (pairingsData.length > 0) {
        const utilities = await getUtilitiesWithPaymentsForPairings(pairingsData.map((pair: any) => pair.id))
        for (const utility of utilities) {
          const pairingId = utility.pairing_id
          if (!pairingId) continue
          if (!utilitiesByPairing.has(pairingId)) {
            utilitiesByPairing.set(pairingId, [])
          }
          utilitiesByPairing.get(pairingId)!.push(utility)
        }
      }

      setUtilitiesMap(utilitiesByPairing)

      const userIds: string[] = []
      for (const utilityList of utilitiesByPairing.values()) {
        for (const utility of utilityList) {
          for (const payment of utility.payments || []) {
            if (payment.recorded_by_user_id) {
              userIds.push(payment.recorded_by_user_id)
            }
          }
        }
      }
      setRecordedByNames(await getUsersMapByIds(userIds))
    } catch (error) {
      console.error('Error loading utilities tracker data:', error)
    } finally {
      setLoading(false)
    }
  }

  const unitsById = useMemo(() => {
    const map = new Map<string, any>()
    for (const property of properties) {
      for (const unit of property.units || []) {
        map.set(unit.id, { ...unit, propertyName: property.name, propertyCode: property.code })
      }
    }
    return map
  }, [properties])

  const handlePaymentRecorded = () => {
    setSelectedUtility(null)
    loadData()
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleMonthSelect = (month: string) => {
    setCurrentDate(new Date(currentDate.getFullYear(), Number(month), 1))
  }

  const handleYearInput = (year: string) => {
    if (!year) return
    const parsed = Number(year)
    if (Number.isNaN(parsed)) return
    setCurrentDate(new Date(parsed, currentDate.getMonth(), 1))
  }

  const handleDeletePayment = async (utilityId: string, unitId: string) => {
    if (!confirm('Delete this utility payment record?')) return
    try {
      await deleteUtilityPayment(utilityId, unitId)
      await loadData()
    } catch (error) {
      console.error('Error deleting utility payment:', error)
    }
  }

  if (loading) {
    return <div className="text-center text-slate-400">Loading...</div>
  }

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  const pairRows = pairings
    .map((pairing) => {
      const firstUnit = unitsById.get(pairing.first_unit_id)
      const secondUnit = unitsById.get(pairing.second_unit_id)
      if (!firstUnit || !secondUnit) return null

      const utilities = (utilitiesMap.get(pairing.id) || [])
        .filter((utility: any) => {
          const readingDate = new Date(utility.date_of_reading)
          return readingDate.getFullYear() === currentYear && readingDate.getMonth() === currentMonth
        })
        .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())

      return {
        pairing,
        firstUnit,
        secondUnit,
        utilities,
      }
    })
    .filter((row): row is { pairing: any; firstUnit: any; secondUnit: any; utilities: any[] } =>
      Boolean(row && row.utilities.length > 0)
    )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Monthly Utilities Tracker</h1>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            onClick={previousMonth}
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="text-base sm:text-lg font-semibold text-white min-w-40 text-center">{monthName}</span>
          <Button
            onClick={nextMonth}
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <ChevronRight size={16} />
          </Button>
          <Select value={String(currentDate.getMonth())} onValueChange={handleMonthSelect}>
            <SelectTrigger className="w-36 bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {MONTH_OPTIONS.map((month) => (
                <SelectItem key={month.value} value={String(month.value)} className="text-white">
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            value={currentDate.getFullYear()}
            onChange={(e) => handleYearInput(e.target.value)}
            className="w-24 bg-slate-700 border-slate-600 text-white"
          />
        </div>
      </div>

      {pairRows.length === 0 ? (
        <Card className="p-8 text-center border-slate-700 bg-slate-800">
          <p className="text-slate-400">No utility records found for paired units this month</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {pairRows.map(({ pairing, firstUnit, secondUnit, utilities }) => (
            <Card key={pairing.id} className="p-4 sm:p-6 border-slate-700 bg-slate-800">
              <h2 className="text-xl font-semibold text-white mb-1">
                Pair: {firstUnit.propertyCode} {firstUnit.name} (First Floor) + {secondUnit.propertyCode} {secondUnit.name} (Second Floor)
              </h2>
              <p className="text-sm text-slate-400 mb-4">{firstUnit.propertyName}</p>
              <div className="space-y-3">
                {utilities.map((utility: any) => {
                  const firstPayment = (utility.payments || []).find(
                    (payment: any) => payment.unit_id === firstUnit.id
                  )
                  const secondPayment = (utility.payments || []).find(
                    (payment: any) => payment.unit_id === secondUnit.id
                  )

                  return (
                    <div key={utility.id} className="p-4 bg-slate-700 rounded-lg border border-slate-600 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
                        <div>
                          <p className="text-sm text-slate-400">Type</p>
                          <p className="text-white font-medium">{utility.type}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-400">Due Date</p>
                          <p className="text-white">{new Date(utility.due_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-400">Amount</p>
                          <p className="text-white font-medium">PHP {Number(utility.amount).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-400">{firstUnit.name} Status</p>
                          <p className="text-white">{firstPayment?.paid ? 'Paid' : 'Not Paid'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-400">{secondUnit.name} Status</p>
                          <p className="text-white">{secondPayment?.paid ? 'Paid' : 'Not Paid'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-400">Recorded Date/Time</p>
                          <p className="text-white text-sm">
                            {firstPayment?.recorded_date
                              ? new Date(firstPayment.recorded_date).toLocaleString()
                              : secondPayment?.recorded_date
                              ? new Date(secondPayment.recorded_date).toLocaleString()
                              : '-'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-slate-400">{firstUnit.name} Recorded By</p>
                          <p className="text-white">
                            {firstPayment?.recorded_by_user_id
                              ? recordedByNames.get(firstPayment.recorded_by_user_id) || firstPayment.recorded_by_user_id
                              : '-'}
                          </p>
                          <p className="text-slate-300">{firstPayment?.comments || '-'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">{secondUnit.name} Recorded By</p>
                          <p className="text-white">
                            {secondPayment?.recorded_by_user_id
                              ? recordedByNames.get(secondPayment.recorded_by_user_id) || secondPayment.recorded_by_user_id
                              : '-'}
                          </p>
                          <p className="text-slate-300">{secondPayment?.comments || '-'}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          onClick={() => setSelectedUtility({ utility, unit: firstUnit })}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                        >
                          Record {firstUnit.name}
                        </Button>
                        {firstPayment && (
                          <Button
                            onClick={() => handleDeletePayment(utility.id, firstUnit.id)}
                            variant="outline"
                            className="border-red-600/50 text-red-400 hover:bg-red-900/20 text-xs"
                          >
                            Delete {firstUnit.name}
                          </Button>
                        )}
                        <Button
                          onClick={() => setSelectedUtility({ utility, unit: secondUnit })}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                        >
                          Record {secondUnit.name}
                        </Button>
                        {secondPayment && (
                          <Button
                            onClick={() => handleDeletePayment(utility.id, secondUnit.id)}
                            variant="outline"
                            className="border-red-600/50 text-red-400 hover:bg-red-900/20 text-xs"
                          >
                            Delete {secondUnit.name}
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="pt-6 border-t border-slate-700">
        <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2">
          <a href="/dashboard/compute-utilities">Compute Utilities</a>
        </Button>
      </div>

      {selectedUtility && (
        <UtilityPaymentDialog
          utility={selectedUtility.utility}
          unit={selectedUtility.unit}
          currentUser={currentUser}
          onClose={() => setSelectedUtility(null)}
          onPaymentRecorded={handlePaymentRecorded}
        />
      )}
    </div>
  )
}
