'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getPropertyById } from '@/lib/api/properties'
import { getUnitsByProperty, deleteUnit } from '@/lib/api/units'
import { getTenantByUnit } from '@/lib/api/tenants'
import { UnitForm } from '@/components/forms/unit-form'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2 } from 'lucide-react'

export default function UnitsPage() {
  const params = useParams()
  const propertyId = params.id as string

  const [property, setProperty] = useState<any>(null)
  const [units, setUnits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [tenantMap, setTenantMap] = useState<Map<string, any>>(new Map())

  useEffect(() => {
    loadData()
  }, [propertyId])

  async function loadData() {
    try {
      setLoading(true)
      const prop = await getPropertyById(propertyId)
      setProperty(prop)

      const unitsData = await getUnitsByProperty(propertyId)
      setUnits(unitsData)

      // Load tenants for each unit
      const tenants = new Map()
      for (const unit of unitsData) {
        const tenant = await getTenantByUnit(unit.id)
        if (tenant) tenants.set(unit.id, tenant)
      }
      setTenantMap(tenants)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this unit?')) return

    try {
      await deleteUnit(id)
      setUnits(units.filter((u) => u.id !== id))
    } catch (error) {
      console.error('Error deleting unit:', error)
    }
  }

  if (loading || !property) {
    return <div className="text-center text-slate-400">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">{property.name}</h1>
        <p className="text-slate-400">{property.address}</p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">
          Units ({units.length}/{property.no_units})
        </h2>
        {units.length < property.no_units && (
          <Button
            onClick={() => setFormOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus size={16} className="mr-2" />
            Add Unit
          </Button>
        )}
      </div>

      {units.length === 0 ? (
        <Card className="p-8 text-center border-slate-700 bg-slate-800">
          <p className="text-slate-400 mb-4">No units added yet</p>
          <Button
            onClick={() => setFormOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus size={16} className="mr-2" />
            Add Your First Unit
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {units.map((unit) => {
            const tenant = tenantMap.get(unit.id)
            return (
              <Card key={unit.id} className="p-6 border-slate-700 bg-slate-800">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-3">{unit.name}</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400">Contract Address</p>
                        <p className="text-white">{unit.contract_address}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Monthly Rent</p>
                        <p className="text-white font-medium">₱{unit.rent_amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Cash Bond</p>
                        <p className="text-white">₱{unit.cash_bond_amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Track Utilities</p>
                        <p className="text-white">{unit.track_utilities ? 'Yes' : 'No'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Tenant</p>
                        <p className="text-white">
                          {tenant
                            ? `${tenant.first_name} ${tenant.last_name}`
                            : 'No tenant assigned'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleDelete(unit.id)}
                      variant="outline"
                      size="sm"
                      className="border-red-600/50 text-red-400 hover:bg-red-900/20"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <UnitForm
        open={formOpen}
        onOpenChange={setFormOpen}
        propertyId={propertyId}
        onSuccess={loadData}
      />
    </div>
  )
}
