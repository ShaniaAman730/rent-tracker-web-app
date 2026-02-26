'use client'

import { useEffect, useState } from 'react'
import { createTenant, updateTenant } from '@/lib/api/tenants'
import { Tenant } from '@/lib/types'
import { GOV_ID_TYPE_OPTIONS } from '@/lib/constants/gov-ids'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface TenantFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unitId: string
  unitName: string
  tenant?: Tenant
  onSuccess: () => void
}

export function TenantForm({
  open,
  onOpenChange,
  unitId,
  unitName,
  tenant,
  onSuccess,
}: TenantFormProps) {
  const [firstName, setFirstName] = useState(tenant?.first_name || '')
  const [lastName, setLastName] = useState(tenant?.last_name || '')
  const [contactNo, setContactNo] = useState(tenant?.contact_no || '')
  const [messenger, setMessenger] = useState(tenant?.messenger || '')
  const [govIdType, setGovIdType] = useState(tenant?.gov_id_type || '')
  const [govIdNo, setGovIdNo] = useState(tenant?.gov_id_no || '')
  const [idIssuedDate, setIdIssuedDate] = useState(tenant?.id_issued_date || '')
  const [idExpiryDate, setIdExpiryDate] = useState(tenant?.id_expiry_date || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setFirstName(tenant?.first_name || '')
    setLastName(tenant?.last_name || '')
    setContactNo(tenant?.contact_no || '')
    setMessenger(tenant?.messenger || '')
    setGovIdType(tenant?.gov_id_type || '')
    setGovIdNo(tenant?.gov_id_no || '')
    setIdIssuedDate(tenant?.id_issued_date || '')
    setIdExpiryDate(tenant?.id_expiry_date || '')
    setError(null)
  }, [tenant, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (tenant) {
        await updateTenant(tenant.id, {
          first_name: firstName,
          last_name: lastName,
          contact_no: contactNo,
          messenger,
          gov_id_type: govIdType || null,
          gov_id_no: govIdNo || null,
          id_issued_date: idIssuedDate || null,
          id_expiry_date: idExpiryDate || null,
        })
      } else {
        await createTenant(
          unitId,
          firstName,
          lastName,
          contactNo,
          messenger,
          govIdType || null,
          govIdNo || null,
          idIssuedDate || null,
          idExpiryDate || null
        )
      }

      setFirstName('')
      setLastName('')
      setContactNo('')
      setMessenger('')
      setGovIdType('')
      setGovIdNo('')
      setIdIssuedDate('')
      setIdExpiryDate('')
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
      <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">{tenant ? 'Edit Tenant' : 'Add Tenant'}</DialogTitle>
          <DialogDescription className="text-slate-400">Unit: {unitName}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-96 overflow-y-auto pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name" className="text-slate-200">
                First Name
              </Label>
              <Input
                id="first_name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="last_name" className="text-slate-200">
                Last Name
              </Label>
              <Input
                id="last_name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-200">Government ID Type</Label>
              <Select value={govIdType} onValueChange={setGovIdType}>
                <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select ID type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {GOV_ID_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option} className="text-white">
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="gov_id_no" className="text-slate-200">
                Government ID Number
              </Label>
              <Input
                id="gov_id_no"
                value={govIdNo}
                onChange={(e) => setGovIdNo(e.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="id_issued_date" className="text-slate-200">
                ID Issued Date
              </Label>
              <Input
                id="id_issued_date"
                type="date"
                value={idIssuedDate}
                onChange={(e) => setIdIssuedDate(e.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div>
              <Label htmlFor="id_expiry_date" className="text-slate-200">
                ID Expiry Date
              </Label>
              <Input
                id="id_expiry_date"
                type="date"
                value={idExpiryDate}
                onChange={(e) => setIdExpiryDate(e.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contact_no" className="text-slate-200">
                Contact Number
              </Label>
              <Input
                id="contact_no"
                value={contactNo}
                onChange={(e) => setContactNo(e.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="messenger" className="text-slate-200">
                Messenger
              </Label>
              <Input
                id="messenger"
                value={messenger}
                onChange={(e) => setMessenger(e.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
                placeholder="e.g., @facebook_handle"
              />
            </div>
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
              {loading ? 'Saving...' : 'Save Tenant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
