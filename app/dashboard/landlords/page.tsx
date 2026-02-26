'use client'

import { useEffect, useState } from 'react'
import { deleteLandlord, getAllLandlords } from '@/lib/api/landlords'
import { LandlordForm } from '@/components/forms/landlord-form'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'

export default function LandlordsPage() {
  const [landlords, setLandlords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedLandlord, setSelectedLandlord] = useState<any | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      setLandlords(await getAllLandlords())
    } catch (error) {
      console.error('Error loading landlords:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this landlord?')) return
    try {
      await deleteLandlord(id)
      await loadData()
    } catch (error) {
      console.error('Error deleting landlord:', error)
      alert('Unable to delete landlord.')
    }
  }

  if (loading) {
    return <div className="text-center text-slate-400">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Landlords</h1>
        <Button
          onClick={() => {
            setSelectedLandlord(null)
            setFormOpen(true)
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus size={16} className="mr-2" />
          Add Landlord
        </Button>
      </div>

      {landlords.length === 0 ? (
        <Card className="p-8 text-center border-slate-700 bg-slate-800">
          <p className="text-slate-400">No landlords added yet.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {landlords.map((landlord) => (
            <Card key={landlord.id} className="p-5 border-slate-700 bg-slate-800">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-sm flex-1">
                  <div>
                    <p className="text-slate-400">Name</p>
                    <p className="text-white font-semibold">
                      {landlord.name_prefix ? `${landlord.name_prefix} ` : ''}
                      {landlord.first_name} {landlord.middle_name} {landlord.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Citizenship / Marital Status</p>
                    <p className="text-white">
                      {landlord.citizenship} / {landlord.marital_status}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Gov ID</p>
                    <p className="text-white">
                      {landlord.gov_id_type} - {landlord.gov_id_no}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">ID Issued / Expiry</p>
                    <p className="text-white">
                      {new Date(landlord.id_issued_date).toLocaleDateString()} /{' '}
                      {new Date(landlord.id_expiry_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="md:col-span-2 xl:col-span-4">
                    <p className="text-slate-400">Postal Address</p>
                    <p className="text-white">{landlord.postal_address}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setSelectedLandlord(landlord)
                      setFormOpen(true)
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(landlord.id)}
                    variant="outline"
                    size="icon"
                    className="border-red-600/50 text-red-400 hover:bg-red-900/20"
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <LandlordForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setSelectedLandlord(null)
        }}
        landlord={selectedLandlord}
        onSuccess={async () => {
          setFormOpen(false)
          setSelectedLandlord(null)
          await loadData()
        }}
      />
    </div>
  )
}
