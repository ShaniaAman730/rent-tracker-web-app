'use client'

import { useEffect, useState } from 'react'
import { getPropertiesWithUnits } from '@/lib/api/properties'
import { deleteUtilityPayment, getUtilitiesWithPayments } from '@/lib/api/utilities'
import { getTenantByUnit } from '@/lib/api/tenants'
import { getCurrentUser, getUsersMapByIds } from '@/lib/api/users'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { UtilityPaymentDialog } from '@/components/dialogs/utility-payment-dialog'

export function UtilitiesTracker() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [properties, setProperties] = useState<any[]>([])
  const [utilitiesMap, setUtilitiesMap] = useState<Map<string, any[]>>(new Map())
  const [tenants, setTenants] = useState<Map<string, any>>(new Map())
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
      const user = await getCurrentUser()
      setCurrentUser(user)

      const props = await getPropertiesWithUnits()
      setProperties(props)

      const utilitiesData = new Map()
      const tenantsMap = new Map()

      for (const prop of props) {
        for (const unit of prop.units) {
          if (unit.track_utilities) {
            const utilities = await getUtilitiesWithPayments(unit.id)
            if (utilities.length > 0) {
              utilitiesData.set(unit.id, utilities)
            }

            const tenant = await getTenantByUnit(unit.id)
            if (tenant) {
              tenantsMap.set(unit.id, tenant)
            }
          }
        }
      }

      setUtilitiesMap(utilitiesData)
      setTenants(tenantsMap)
      const userIds: string[] = []
      for (const utilityList of utilitiesData.values()) {
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

  const unitsWithUtilities = properties
    .flatMap((prop) =>
      prop.units
        .filter((unit: any) => unit.track_utilities && utilitiesMap.has(unit.id))
        .map((unit: any) => ({ ...unit, property: prop }))
    )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Monthly Utilities Tracker</h1>
        <div className="flex items-center gap-4">
          <Button
            onClick={previousMonth}
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="text-lg font-semibold text-white min-w-40 text-center">{monthName}</span>
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

      {unitsWithUtilities.length === 0 ? (
        <Card className="p-8 text-center border-slate-700 bg-slate-800">
          <p className="text-slate-400">No units with utilities tracking found</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {properties.map((property) => {
            const propertyUnits = property.units.filter(
              (unit: any) => unit.track_utilities && utilitiesMap.has(unit.id)
            )

            if (propertyUnits.length === 0) return null

            return (
              <Card key={property.id} className="p-6 border-slate-700 bg-slate-800">
                <h2 className="text-xl font-semibold text-white mb-4">{property.name}</h2>
                <div className="space-y-4">
                  {propertyUnits.map((unit: any) => {
                    const utilities = utilitiesMap.get(unit.id) || []
                    const tenant = tenants.get(unit.id)

                    return (
                      <div key={unit.id}>
                        <div className="mb-2">
                          <p className="text-sm text-slate-400">Unit: {unit.name}</p>
                          {tenant && (
                            <p className="text-sm text-slate-300">
                              Tenant: {tenant.first_name} {tenant.last_name}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          {utilities.map((utility: any) => (
                            <div
                              key={utility.id}
                              className="p-4 bg-slate-700 rounded-lg border border-slate-600 flex items-center justify-between"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1">
                                    <p className="text-sm text-slate-400">{utility.type}</p>
                                    <p className="text-white font-medium">
                                      Due: {new Date(utility.due_date).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm text-slate-400">Amount</p>
                                    <p className="text-white font-medium">
                                      ₱{utility.amount.toLocaleString()}
                                    </p>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm text-slate-400">Status</p>
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`w-3 h-3 rounded-full ${
                                          utility.payment?.paid ? 'bg-green-500' : 'bg-red-500'
                                        }`}
                                      />
                                      <span className="text-white">
                                        {utility.payment?.paid ? 'Paid' : 'Not Paid'}
                                      </span>
                                    </div>
                                  </div>
                                  {utility.payment && (
                                    <div className="flex-1">
                                      <p className="text-sm text-slate-400">Recorded By</p>
                                      <p className="text-white text-xs">
                                        {recordedByNames.get(utility.payment.recorded_by_user_id) ||
                                          utility.payment.recorded_by_user_id}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="ml-2 flex gap-2">
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
                      </div>
                    )
                  })}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <div className="pt-6 border-t border-slate-700">
        <Button
          asChild
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2"
        >
          <a href="/dashboard/compute-utilities">
            Compute Utilities →
          </a>
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
