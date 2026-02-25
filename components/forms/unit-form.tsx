'use client'

import { useEffect, useState } from 'react'
import { createUnit, updateUnit } from '@/lib/api/units'
import { Unit } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface UnitFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyId: string
  unit?: Unit
  onSuccess: () => void
}

export function UnitForm({ open, onOpenChange, propertyId, unit, onSuccess }: UnitFormProps) {
  const [name, setName] = useState(unit?.name || '')
  const [trackUtilities, setTrackUtilities] = useState(unit?.track_utilities || false)
  const [rentAmount, setRentAmount] = useState(unit?.rent_amount.toString() || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(unit?.name || '')
    setTrackUtilities(unit?.track_utilities || false)
    setRentAmount(unit?.rent_amount?.toString() || '')
    setError(null)
  }, [unit, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (unit) {
        await updateUnit(unit.id, {
          name,
          track_utilities: trackUtilities,
          rent_amount: parseFloat(rentAmount),
        })
      } else {
        await createUnit(propertyId, name, trackUtilities, parseFloat(rentAmount))
      }

      setName('')
      setTrackUtilities(false)
      setRentAmount('')
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
      <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">{unit ? 'Edit Unit' : 'Add New Unit'}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {unit ? 'Update the unit details' : 'Enter the details of the rental unit'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-slate-200">
              Unit Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
              placeholder="e.g., Unit 101"
              required
            />
          </div>

          <div>
            <Label htmlFor="rent_amount" className="text-slate-200">
              Monthly Rent Amount (PHP)
            </Label>
            <Input
              id="rent_amount"
              type="number"
              step="0.01"
              min="0"
              value={rentAmount}
              onChange={(e) => setRentAmount(e.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
              placeholder="e.g., 10000"
              required
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="track_utilities"
              checked={trackUtilities}
              onCheckedChange={(checked) => setTrackUtilities(checked === true)}
            />
            <Label htmlFor="track_utilities" className="text-slate-300 font-normal">
              Track Utilities (MNWD and Casureco)
            </Label>
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
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? 'Saving...' : 'Save Unit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
