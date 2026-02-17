'use client'

import { useState } from 'react'
import { createUtility } from '@/lib/api/utilities'
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

interface AddUtilityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  unitId?: string
}

export function AddUtilityDialog({
  open,
  onOpenChange,
  onSuccess,
  unitId,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
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

      setSelectedUnitId(unitId || '')
      setType('MNWD')
      setDueDate('')
      setDateOfReading('')
      setUnitReading('')
      setFirstFloorReading('')
      setSecondFloorReading('')
      setAmount('')
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
          <DialogTitle className="text-white">Add Utility Reading</DialogTitle>
          <DialogDescription className="text-slate-400">
            Enter the utility billing details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-96 overflow-y-auto">
          <div>
            <Label className="text-slate-200">Utility Type</Label>
            <Select value={type} onValueChange={(value: any) => setType(value)}>
              <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="MNWD" className="text-white">
                  MNWD (Water)
                </SelectItem>
                <SelectItem value="Casureco" className="text-white">
                  Casureco (Electricity)
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
                Reading Date
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
              Unit Reading (Total)
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
                1st Floor Reading
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
                2nd Floor Reading
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
              Amount (₱)
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
              {loading ? 'Adding...' : 'Add Reading'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
