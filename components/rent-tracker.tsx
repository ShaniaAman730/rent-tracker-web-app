'use client'

import { useEffect, useState } from 'react'
import { getPropertiesWithUnits } from '@/lib/api/properties'
import { deleteRentPayment, getRentPayments } from '@/lib/api/rent-payments'
import { getTenantByUnit } from '@/lib/api/tenants'
import { getCurrentUser, getUsersMapByIds } from '@/lib/api/users'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { RentPaymentDialog } from '@/components/dialogs/rent-payment-dialog'

export function RentTracker() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [properties, setProperties] = useState<any[]>([])
  const [rentPayments, setRentPayments] = useState<Map<string, any>>(new Map())
  const [tenants, setTenants] = useState<Map<string, any>>(new Map())
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [recordedByNames, setRecordedByNames] = useState<Map<string, string>>(new Map())
  const [selectedPayment, setSelectedPayment] = useState<{
    unitId: string
    year: number
    month: number
  } | null>(null)

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

      // Load rent payments for current month
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1

      const paymentsMap = new Map()
      const tenantsMap = new Map()

      for (const prop of props) {
        for (const unit of prop.units) {
          const payments = await getRentPayments(unit.id, year, month)
          if (payments.length > 0) {
            paymentsMap.set(unit.id, payments[0])
          }

          const tenant = await getTenantByUnit(unit.id)
          if (tenant) {
            tenantsMap.set(unit.id, tenant)
          }
        }
      }

      setRentPayments(paymentsMap)
      setTenants(tenantsMap)
      const userIds = Array.from(paymentsMap.values())
        .map((payment: any) => payment.recorded_by_user_id)
        .filter(Boolean)
      const userNames = await getUsersMapByIds(userIds)
      setRecordedByNames(userNames)
    } catch (error) {
      console.error('Error loading rent tracker data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentRecorded = () => {
    setSelectedPayment(null)
    loadData()
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Delete this rent payment record?')) return
    try {
      await deleteRentPayment(paymentId)
      await loadData()
    } catch (error) {
      console.error('Error deleting rent payment:', error)
    }
  }

  if (loading) {
    return <div className="text-center text-slate-400">Loading...</div>
  }

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth() + 1
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Monthly Rent Tracker</h1>
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

      {properties.length === 0 ? (
        <Card className="p-8 text-center border-slate-700 bg-slate-800">
          <p className="text-slate-400">No properties found. Please add a property first.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {properties.map((property) => (
            <Card key={property.id} className="p-6 border-slate-700 bg-slate-800">
              <h2 className="text-xl font-semibold text-white mb-4">{property.name}</h2>
              <div className="space-y-4">
                {property.units.map((unit: any) => {
                  const payment = rentPayments.get(unit.id)
                  const tenant = tenants.get(unit.id)
                  return (
                    <div
                      key={unit.id}
                      className="p-4 bg-slate-700 rounded-lg border border-slate-600 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-slate-400">Unit</p>
                          <p className="text-lg font-semibold text-white">{unit.name}</p>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-400">Tenant</p>
                          <p className="text-white font-medium">
                            {tenant
                              ? `${tenant.first_name} ${tenant.last_name}`
                              : 'No tenant assigned'}
                          </p>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-400">Rent Amount</p>
                          <p className="text-white font-medium">₱{unit.rent_amount.toLocaleString()}</p>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-slate-400">Status</p>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                payment?.paid ? 'bg-green-500' : 'bg-red-500'
                              }`}
                            />
                            <span className="text-white font-medium">
                              {payment?.paid ? 'Paid' : 'Not Paid'}
                            </span>
                          </div>
                        </div>
                        {payment && (
                          <div className="flex-1">
                            <p className="text-sm text-slate-400">Recorded By</p>
                            <p className="text-white text-sm">
                              {recordedByNames.get(payment.recorded_by_user_id) || payment.recorded_by_user_id}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Button
                          onClick={() => setSelectedPayment({ unitId: unit.id, year, month })}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Record Payment
                        </Button>
                        {payment && (
                          <Button
                            onClick={() => handleDeletePayment(payment.id)}
                            variant="outline"
                            size="icon"
                            className="border-red-600/50 text-red-400 hover:bg-red-900/20"
                          >
                            <Trash2 size={16} />
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

      {selectedPayment && (
        <RentPaymentDialog
          unitId={selectedPayment.unitId}
          year={selectedPayment.year}
          month={selectedPayment.month}
          currentUser={currentUser}
          onClose={() => setSelectedPayment(null)}
          onPaymentRecorded={handlePaymentRecorded}
        />
      )}
    </div>
  )
}
