'use client'

import { useState } from 'react'
import { recordRentPayment } from '@/lib/api/rent-payments'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface RentPaymentDialogProps {
  unitId: string
  year: number
  month: number
  currentUser: any
  onClose: () => void
  onPaymentRecorded: () => void
}

export function RentPaymentDialog({
  unitId,
  year,
  month,
  currentUser,
  onClose,
  onPaymentRecorded,
}: RentPaymentDialogProps) {
  const [paid, setPaid] = useState<string>('true')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    try {
      setLoading(true)
      setError(null)

      await recordRentPayment(unitId, year, month, paid === 'true', currentUser.id)

      onPaymentRecorded()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Record Rent Payment</DialogTitle>
          <DialogDescription className="text-slate-400">
            {new Date(year, month - 1).toLocaleString('default', {
              month: 'long',
              year: 'numeric',
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <Label className="text-slate-200">Payment Status</Label>
            <RadioGroup value={paid} onValueChange={setPaid}>
              <div className="flex items-center space-x-2 mt-2">
                <RadioGroupItem value="true" id="paid" />
                <Label htmlFor="paid" className="font-normal text-slate-300">
                  Paid
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="not-paid" />
                <Label htmlFor="not-paid" className="font-normal text-slate-300">
                  Not Paid
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="bg-slate-700 p-3 rounded text-sm text-slate-300">
            <p>
              <span className="text-slate-400">Recorded by:</span> {currentUser?.full_name}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-700 text-red-200 rounded text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={onClose}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? 'Recording...' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
