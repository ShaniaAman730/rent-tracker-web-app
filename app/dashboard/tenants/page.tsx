'use client'

import { useEffect, useState } from 'react'
import { getPropertiesWithUnits } from '@/lib/api/properties'
import { getTenantByUnit, deleteTenant } from '@/lib/api/tenants'
import { getCurrentUser, getUsersMapByIds } from '@/lib/api/users'
import { TenantForm } from '@/components/forms/tenant-form'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'

export default function TenantsPage() {
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState<any>(null)
  const [selectedTenant, setSelectedTenant] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [recordedByNames, setRecordedByNames] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [user, props] = await Promise.all([getCurrentUser(), getPropertiesWithUnits()])
      setCurrentUser(user)

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

      const userIds: string[] = []
      for (const prop of propsWithTenants) {
        for (const unit of prop.units || []) {
          if (unit.tenant?.recorded_by_user_id) {
            userIds.push(unit.tenant.recorded_by_user_id)
          }
        }
      }
      setRecordedByNames(await getUsersMapByIds(userIds))
    } catch (error) {
      console.error('Error loading tenants:', error)
    } finally {
      setLoading(false)
    }
  }

  const getOwnerName = (userId?: string | null) =>
    (userId ? recordedByNames.get(userId) : null) || userId || 'Someone'

  const canModify = (userId?: string | null) =>
    currentUser?.role === 'manager' || userId === currentUser?.id

  const showOwnershipMessage = (userId?: string | null) => {
    alert(`${getOwnerName(userId)} is responsible for this entry. please contact them for any changes.`)
  }

  const handleDelete = async (tenantId: string) => {
    const tenant = properties
      .flatMap((prop) => prop.units || [])
      .map((unit: any) => unit.tenant)
      .find((item: any) => item?.id === tenantId)

    if (tenant && !canModify(tenant.recorded_by_user_id)) {
      showOwnershipMessage(tenant.recorded_by_user_id)
      return
    }
    if (!confirm('Are you sure you want to delete this tenant?')) return

    try {
      await deleteTenant(tenantId)
      loadData()
    } catch (error) {
      console.error('Error deleting tenant:', error)
    }
  }

  const handleManageTenant = (unit: any, tenant: any | null) => {
    if (tenant && !canModify(tenant.recorded_by_user_id)) {
      showOwnershipMessage(tenant.recorded_by_user_id)
      return
    }
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
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-3">{unit.name}</h3>

                        {unit.tenant ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-slate-400">Tenant Name</p>
                              <p className="text-white font-medium">
                                {unit.tenant.first_name} {unit.tenant.last_name}
                              </p>
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
                              <p className="text-slate-400">Gov ID</p>
                              <p className="text-white">
                                {unit.tenant.gov_id_type && unit.tenant.gov_id_no
                                  ? `${unit.tenant.gov_id_type} - ${unit.tenant.gov_id_no}`
                                  : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400">ID Issued / Expiry</p>
                              <p className="text-white">
                                {unit.tenant.id_issued_date
                                  ? new Date(unit.tenant.id_issued_date).toLocaleDateString()
                                  : 'N/A'}{' '}
                                /{' '}
                                {unit.tenant.id_expiry_date
                                  ? new Date(unit.tenant.id_expiry_date).toLocaleDateString()
                                  : 'N/A'}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-400 italic">No tenant assigned</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleManageTenant(unit, unit.tenant || null)}
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
