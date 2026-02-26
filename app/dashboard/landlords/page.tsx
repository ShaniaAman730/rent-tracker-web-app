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
        <Card className="p-8 sm:p-10 border-slate-700 bg-slate-800">
          <div className="space-y-8">
            <div className="rounded-xl border border-slate-600 bg-slate-700/40 p-6 sm:p-8">
              <p className="text-slate-400 text-sm uppercase tracking-wide">Owner Name</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2">
                {landlord.name_prefix ? `${landlord.name_prefix} ` : ''}
                {landlord.first_name} {landlord.middle_name} {landlord.last_name}
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-slate-600 bg-slate-700/40 p-6">
                <p className="text-slate-400 text-sm mb-2">Personal Information</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-slate-400 text-xs">Citizenship</p>
                    <p className="text-white text-lg">{landlord.citizenship}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Marital Status</p>
                    <p className="text-white text-lg">{landlord.marital_status}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-600 bg-slate-700/40 p-6">
                <p className="text-slate-400 text-sm mb-2">Government ID</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-slate-400 text-xs">ID Type</p>
                    <p className="text-white text-lg">{landlord.gov_id_type}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">ID Number</p>
                    <p className="text-white text-lg">{landlord.gov_id_no}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Issued / Expiry</p>
                    <p className="text-white text-lg">
                      {new Date(landlord.id_issued_date).toLocaleDateString()} /{' '}
                      {new Date(landlord.id_expiry_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-600 bg-slate-700/40 p-6">
              <p className="text-slate-400 text-sm mb-2">Postal Address</p>
              <p className="text-white text-lg leading-relaxed">{landlord.postal_address}</p>
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
