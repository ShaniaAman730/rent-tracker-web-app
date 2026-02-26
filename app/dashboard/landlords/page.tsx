'use client'

import { useEffect, useState } from 'react'
import { getAllLandlords } from '@/lib/api/landlords'
import { LandlordForm } from '@/components/forms/landlord-form'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function LandlordsPage() {
  const [landlord, setLandlord] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const allLandlords = await getAllLandlords()
      setLandlord(allLandlords[0] || null)
    } catch (error) {
      console.error('Error loading landlords:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center text-slate-400">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Landlord Profile</h1>
        <Button
          onClick={() => {
            setFormOpen(true)
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus size={16} className="mr-2" />
          {landlord ? 'Edit Landlord' : 'Set Up Landlord'}
        </Button>
      </div>

      {!landlord ? (
        <Card className="p-8 text-center border-slate-700 bg-slate-800">
          <p className="text-slate-400">No landlord profile yet. Set up your owner details.</p>
        </Card>
      ) : (
        <Card className="p-5 border-slate-700 bg-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 text-sm">
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
        </Card>
      )}

      <LandlordForm
        open={formOpen}
        onOpenChange={setFormOpen}
        landlord={landlord}
        onSuccess={async () => {
          setFormOpen(false)
          await loadData()
        }}
      />
    </div>
  )
}
