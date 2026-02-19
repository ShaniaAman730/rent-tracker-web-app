'use client'

import { useEffect, useState } from 'react'
import { createProperty, updateProperty } from '@/lib/api/properties'
import { RentalProperty } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface PropertyFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  property?: RentalProperty
  onSuccess: () => void
}

export function PropertyForm({ open, onOpenChange, property, onSuccess }: PropertyFormProps) {
  const [name, setName] = useState(property?.name || '')
  const [address, setAddress] = useState(property?.address || '')
  const [code, setCode] = useState(property?.code || '')
  const [noUnits, setNoUnits] = useState(property?.no_units.toString() || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(property?.name || '')
    setAddress(property?.address || '')
    setCode(property?.code || '')
    setNoUnits(property?.no_units?.toString() || '')
    setError(null)
  }, [property, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (property) {
        await updateProperty(property.id, {
          name,
          address,
          code,
          no_units: parseInt(noUnits),
        })
      } else {
        await createProperty(name, address, code, parseInt(noUnits))
      }

      setName('')
      setAddress('')
      setCode('')
      setNoUnits('')
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">
            {property ? 'Edit Property' : 'Add New Property'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {property
              ? 'Update the property details'
              : 'Enter the details of your rental property'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-slate-200">
              Property Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
              placeholder="e.g., Downtown Apartments"
              required
            />
          </div>

          <div>
            <Label htmlFor="address" className="text-slate-200">
              Address
            </Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
              placeholder="e.g., 123 Main St, City"
              required
            />
          </div>

          <div>
            <Label htmlFor="code" className="text-slate-200">
              Property Code
            </Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
              placeholder="e.g., PROP001"
              required
            />
          </div>

          <div>
            <Label htmlFor="no_units" className="text-slate-200">
              Number of Units
            </Label>
            <Input
              id="no_units"
              type="number"
              min="1"
              value={noUnits}
              onChange={(e) => setNoUnits(e.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
              placeholder="e.g., 5"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-700 text-red-200 rounded text-sm">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? 'Saving...' : 'Save Property'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
