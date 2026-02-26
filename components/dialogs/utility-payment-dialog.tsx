'use client'

import { useState } from 'react'
import { recordUtilityPayment } from '@/lib/api/utilities'
import { Utility } from '@/lib/types'
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
import { Textarea } from '@/components/ui/textarea'

interface UtilityPaymentDialogProps {
  utility: Utility & { payment?: any }
  unit: { id: string; name: string }
  currentUser: any
  onClose: () => void
  onPaymentRecorded: () => void
}

export function UtilityPaymentDialog({
  utility,
  unit,
  currentUser,
  onClose,
  onPaymentRecorded,
}: UtilityPaymentDialogProps) {
  const existingPayment = (utility as any).payments?.find((payment: any) => payment.unit_id === unit.id)
  const [paid, setPaid] = useState<string>(existingPayment?.paid ? 'true' : 'false')
  const [comments, setComments] = useState(existingPayment?.comments || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    try {
      setLoading(true)
      setError(null)

      await recordUtilityPayment(
        utility.id,
        unit.id,
        paid === 'true',
        currentUser.id,
        comments.trim() || null
      )

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
          <DialogTitle className="text-white">Record Utility Payment</DialogTitle>
          <DialogDescription className="text-slate-400">
            {utility.type} - {unit.name} - Due: {new Date(utility.due_date).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-slate-700 p-4 rounded space-y-2 text-sm">
            <p>
              <span className="text-slate-400">Type:</span> <span className="text-white">{utility.type}</span>
            </p>
            <p>
              <span className="text-slate-400">Due Date:</span>{' '}
              <span className="text-white">{new Date(utility.due_date).toLocaleDateString()}</span>
            </p>
            <p>
              <span className="text-slate-400">Amount:</span>{' '}
              <span className="text-white font-medium">PHP {utility.amount.toLocaleString()}</span>
            </p>
          </div>

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

          <div>
            <Label htmlFor="utility_comments" className="text-slate-200">
              Comments
            </Label>
            <Textarea
              id="utility_comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
              placeholder="Optional notes"
              rows={3}
            />
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
