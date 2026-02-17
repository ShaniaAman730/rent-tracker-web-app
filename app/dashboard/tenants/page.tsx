'use client'

import { useEffect, useState } from 'react'
import { getPropertiesWithUnits } from '@/lib/api/properties'
import { getTenantByUnit, deleteTenant } from '@/lib/api/tenants'
import { TenantForm } from '@/components/forms/tenant-form'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2 } from 'lucide-react'

export default function TenantsPage() {
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState<any>(null)
  const [selectedTenant, setSelectedTenant] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const props = await getPropertiesWithUnits()

      // Load tenants for all units
      const propsWithTenants = await Promise.all(
        props.map(async (prop) => ({
          ...prop,
          units: await Promise.all(
            prop.units.map(async (unit: any) => ({
              ...unit,
              tenant: await getTenantByUnit(unit.id),
            }))
          ),
        }))
      )

      setProperties(propsWithTenants)
    } catch (error) {
      console.error('Error loading tenants:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (tenantId: string) => {
    if (!confirm('Are you sure you want to delete this tenant?')) return

    try {
      await deleteTenant(tenantId)
      loadData()
    } catch (error) {
      console.error('Error deleting tenant:', error)
    }
  }

  const handleAddTenant = (unit: any) => {
    setSelectedUnit(unit)
    setSelectedTenant(null)
    setFormOpen(true)
  }

  const handleEditTenant = (unit: any, tenant: any) => {
    setSelectedUnit(unit)
    setSelectedTenant(tenant)
    setFormOpen(true)
  }

  const handleFormClose = () => {
    setFormOpen(false)
    setSelectedUnit(null)
    setSelectedTenant(null)
  }

  if (loading) {
    return <div className="text-center text-slate-400">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Manage Tenants</h1>

      {properties.length === 0 ? (
        <Card className="p-8 text-center border-slate-700 bg-slate-800">
          <p className="text-slate-400">No properties or units available</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {properties.map((property) => (
            <div key={property.id} className="space-y-3">
              <h2 className="text-xl font-semibold text-white">{property.name}</h2>
              <div className="space-y-3">
                {property.units.map((unit: any) => (
                  <Card key={unit.id} className="p-6 border-slate-700 bg-slate-800">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-3">{unit.name}</h3>

                        {unit.tenant ? (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-slate-400">Tenant Name</p>
                              <p className="text-white font-medium">
                                {unit.tenant.first_name} {unit.tenant.last_name}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400">Contract Name</p>
                              <p className="text-white">{unit.tenant.contract_name}</p>
                            </div>
                            <div>
                              <p className="text-slate-400">Contact Number</p>
                              <p className="text-white">{unit.tenant.contact_no}</p>
                            </div>
                            <div>
                              <p className="text-slate-400">Messenger</p>
                              <p className="text-white">{unit.tenant.messenger || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-slate-400">Address</p>
                              <p className="text-white text-sm">{unit.tenant.address}</p>
                            </div>
                            <div>
                              <p className="text-slate-400">Contract Period</p>
                              <p className="text-white text-sm">
                                {new Date(unit.tenant.begin_contract).toLocaleDateString()} -
                                {' '}
                                {new Date(unit.tenant.end_contract).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-400 italic">No tenant assigned</p>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          onClick={() =>
                            handleAddTenant(unit)
                          }
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Plus size={16} className="mr-1" />
                          {unit.tenant ? 'Edit' : 'Add'} Tenant
                        </Button>
                        {unit.tenant && (
                          <Button
                            onClick={() => handleDelete(unit.tenant.id)}
                            variant="outline"
                            size="sm"
                            className="border-red-600/50 text-red-400 hover:bg-red-900/20"
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedUnit && (
        <TenantForm
          open={formOpen}
          onOpenChange={handleFormClose}
          unitId={selectedUnit.id}
          unitName={selectedUnit.name}
          tenant={selectedTenant}
          onSuccess={() => {
            handleFormClose()
            loadData()
          }}
        />
      )}
    </div>
  )
}
