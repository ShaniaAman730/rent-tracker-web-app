'use client'

import { useEffect, useMemo, useState } from 'react'
import { getPropertiesWithUnits } from '@/lib/api/properties'
import { deleteUtilityPayment, getUtilitiesWithPaymentsForPairings } from '@/lib/api/utilities'
import { getCurrentUser, getUsersMapByIds } from '@/lib/api/users'
import { getUnitPairings } from '@/lib/api/unit-pairings'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { UtilityPaymentDialog } from '@/components/dialogs/utility-payment-dialog'

export function UtilitiesTracker() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [properties, setProperties] = useState<any[]>([])
  const [pairings, setPairings] = useState<any[]>([])
  const [utilitiesMap, setUtilitiesMap] = useState<Map<string, any[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedUtility, setSelectedUtility] = useState<any>(null)
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
          if (utility.payment?.recorded_by_user_id) {
            userIds.push(utility.payment.recorded_by_user_id)
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
        map.set(unit.id, { ...unit, propertyName: property.name })
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

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Delete this utility payment record?')) return
    try {
      await deleteUtilityPayment(paymentId)
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
        <div className="flex items-center gap-2 sm:gap-4">
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
                Pair: {firstUnit.name} (First Floor) + {secondUnit.name} (Second Floor)
              </h2>
              <p className="text-sm text-slate-400 mb-4">{firstUnit.propertyName}</p>
              <div className="space-y-3">
                {utilities.map((utility: any) => (
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
                        <p className="text-sm text-slate-400">Status</p>
                        <p className="text-white">{utility.payment?.paid ? 'Paid' : 'Not Paid'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Recorded By</p>
                        <p className="text-white text-sm">
                          {utility.payment?.recorded_by_user_id
                            ? recordedByNames.get(utility.payment.recorded_by_user_id) ||
                              utility.payment.recorded_by_user_id
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400">Recorded Date/Time</p>
                        <p className="text-white text-sm">
                          {utility.payment?.recorded_date
                            ? new Date(utility.payment.recorded_date).toLocaleString()
                            : '-'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-slate-400">Comments</p>
                      <p className="text-sm text-white">{utility.payment?.comments || '-'}</p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => setSelectedUtility(utility)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                      >
                        Record
                      </Button>
                      {utility.payment && (
                        <Button
                          onClick={() => handleDeletePayment(utility.payment.id)}
                          variant="outline"
                          size="icon"
                          className="border-red-600/50 text-red-400 hover:bg-red-900/20"
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
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
          utility={selectedUtility}
          currentUser={currentUser}
          onClose={() => setSelectedUtility(null)}
          onPaymentRecorded={handlePaymentRecorded}
        />
      )}
    </div>
  )
}
