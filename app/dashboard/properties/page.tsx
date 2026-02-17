'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getPropertiesWithUnits, deleteProperty } from '@/lib/api/properties'
import { PropertyForm } from '@/components/forms/property-form'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Edit, Trash2, ChevronRight } from 'lucide-react'

export default function PropertiesPage() {
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    loadProperties()
  }, [])

  async function loadProperties() {
    try {
      setLoading(true)
      const data = await getPropertiesWithUnits()
      setProperties(data)
    } catch (error) {
      console.error('Error loading properties:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this property?')) return

    try {
      await deleteProperty(id)
      setProperties(properties.filter((p) => p.id !== id))
    } catch (error) {
      console.error('Error deleting property:', error)
    }
  }

  if (loading) {
    return <div className="text-center text-slate-400">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Manage Properties</h1>
        <Button
          onClick={() => setFormOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus size={16} className="mr-2" />
          Add Property
        </Button>
      </div>

      {properties.length === 0 ? (
        <Card className="p-8 text-center border-slate-700 bg-slate-800">
          <p className="text-slate-400 mb-4">No properties added yet</p>
          <Button
            onClick={() => setFormOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus size={16} className="mr-2" />
            Add Your First Property
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {properties.map((property) => (
            <Card key={property.id} className="p-6 border-slate-700 bg-slate-800 hover:border-slate-600 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">{property.name}</h3>
                      <div className="space-y-1 text-sm text-slate-400">
                        <p>📍 {property.address}</p>
                        <p>Code: {property.code}</p>
                        <p>Units: {property.units?.length || 0} / {property.no_units}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    asChild
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    <Link href={`/dashboard/properties/${property.id}/units`}>
                      Manage Units
                      <ChevronRight size={16} className="ml-2" />
                    </Link>
                  </Button>
                  <Button
                    onClick={() => handleDelete(property.id)}
                    variant="outline"
                    size="sm"
                    className="border-red-600/50 text-red-400 hover:bg-red-900/20"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <PropertyForm open={formOpen} onOpenChange={setFormOpen} onSuccess={loadProperties} />
    </div>
  )
}
