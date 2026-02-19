'use client'

import { useEffect, useState } from 'react'
import { createUtility, updateUtility } from '@/lib/api/utilities'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface UnitOption {
  id: string
  label: string
}

interface AddUtilityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  unitId?: string
  units?: UnitOption[]
  editingUtility?: any
}

export function AddUtilityDialog({
  open,
  onOpenChange,
  onSuccess,
  unitId,
  units = [],
  editingUtility,
}: AddUtilityDialogProps) {
  const [selectedUnitId, setSelectedUnitId] = useState(unitId || '')
  const [type, setType] = useState<'MNWD' | 'Casureco'>('MNWD')
  const [dueDate, setDueDate] = useState('')
  const [dateOfReading, setDateOfReading] = useState('')
  const [unitReading, setUnitReading] = useState('')
  const [firstFloorReading, setFirstFloorReading] = useState('')
  const [secondFloorReading, setSecondFloorReading] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (editingUtility) {
      setSelectedUnitId(editingUtility.unit_id)
      setType(editingUtility.type)
      setDueDate(editingUtility.due_date)
      setDateOfReading(editingUtility.date_of_reading)
      setUnitReading(editingUtility.unit_reading?.toString() || '')
      setFirstFloorReading(editingUtility.first_floor_reading?.toString() || '')
      setSecondFloorReading(editingUtility.second_floor_reading?.toString() || '')
      setAmount(editingUtility.amount?.toString() || '')
      return
    }

    setSelectedUnitId(unitId || '')
    setType('MNWD')
    setDueDate('')
    setDateOfReading('')
    setUnitReading('')
    setFirstFloorReading('')
    setSecondFloorReading('')
    setAmount('')
    setError(null)
  }, [editingUtility, open, unitId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!selectedUnitId) {
        throw new Error('Please select a unit')
      }

      if (editingUtility) {
        await updateUtility(editingUtility.id, {
          unit_id: selectedUnitId,
          type,
          due_date: dueDate,
          date_of_reading: dateOfReading,
          unit_reading: parseFloat(unitReading),
          first_floor_reading: parseFloat(firstFloorReading),
          second_floor_reading: parseFloat(secondFloorReading),
          amount: parseFloat(amount),
        })
      } else {
        await createUtility(
          selectedUnitId,
          type,
          dueDate,
          dateOfReading,
          parseFloat(unitReading),
          parseFloat(firstFloorReading),
          parseFloat(secondFloorReading),
          parseFloat(amount)
        )
      }

      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const isEditMode = Boolean(editingUtility)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">{isEditMode ? 'Edit Utility Reading' : 'Add Utility Reading'}</DialogTitle>
          <DialogDescription className="text-slate-400">
            Enter the utility billing details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-96 overflow-y-auto">
          {units.length > 0 && (
            <div>
              <Label className="text-slate-200">Unit</Label>
              <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id} className="text-white">
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-slate-200">Type</Label>
            <Select value={type} onValueChange={(value: 'MNWD' | 'Casureco') => setType(value)}>
              <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="MNWD" className="text-white">
                  MNWD
                </SelectItem>
                <SelectItem value="Casureco" className="text-white">
                  Casureco
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="due_date" className="text-slate-200">
                Due Date
              </Label>
              <Input
                id="due_date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="date_of_reading" className="text-slate-200">
                Date of Reading
              </Label>
              <Input
                id="date_of_reading"
                type="date"
                value={dateOfReading}
                onChange={(e) => setDateOfReading(e.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="unit_reading" className="text-slate-200">
              Unit Reading
            </Label>
            <Input
              id="unit_reading"
              type="number"
              step="0.01"
              value={unitReading}
              onChange={(e) => setUnitReading(e.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_floor" className="text-slate-200">
                First Floor Reading
              </Label>
              <Input
                id="first_floor"
                type="number"
                step="0.01"
                value={firstFloorReading}
                onChange={(e) => setFirstFloorReading(e.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="second_floor" className="text-slate-200">
                Second Floor Reading
              </Label>
              <Input
                id="second_floor"
                type="number"
                step="0.01"
                value={secondFloorReading}
                onChange={(e) => setSecondFloorReading(e.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="amount" className="text-slate-200">
              Amount
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
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
              {loading ? (isEditMode ? 'Saving...' : 'Adding...') : isEditMode ? 'Save Changes' : 'Add Reading'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
