'use client'

import { useEffect, useState } from 'react'
import { createLandlord, updateLandlord } from '@/lib/api/landlords'
import { GOV_ID_TYPE_OPTIONS } from '@/lib/constants/gov-ids'
import { Landlord } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface LandlordFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  landlord?: Landlord | null
  onSuccess: () => void
}

export function LandlordForm({ open, onOpenChange, landlord, onSuccess }: LandlordFormProps) {
  const [firstName, setFirstName] = useState(landlord?.first_name || '')
  const [middleName, setMiddleName] = useState(landlord?.middle_name || '')
  const [lastName, setLastName] = useState(landlord?.last_name || '')
  const [namePrefix, setNamePrefix] = useState(landlord?.name_prefix || '')
  const [citizenship, setCitizenship] = useState(landlord?.citizenship || 'Filipino')
  const [maritalStatus, setMaritalStatus] = useState(landlord?.marital_status || '')
  const [postalAddress, setPostalAddress] = useState(landlord?.postal_address || '')
  const [govIdType, setGovIdType] = useState(landlord?.gov_id_type || '')
  const [govIdNo, setGovIdNo] = useState(landlord?.gov_id_no || '')
  const [idIssuedDate, setIdIssuedDate] = useState(landlord?.id_issued_date || '')
  const [idExpiryDate, setIdExpiryDate] = useState(landlord?.id_expiry_date || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setFirstName(landlord?.first_name || '')
    setMiddleName(landlord?.middle_name || '')
    setLastName(landlord?.last_name || '')
    setNamePrefix(landlord?.name_prefix || '')
    setCitizenship(landlord?.citizenship || 'Filipino')
    setMaritalStatus(landlord?.marital_status || '')
    setPostalAddress(landlord?.postal_address || '')
    setGovIdType(landlord?.gov_id_type || '')
    setGovIdNo(landlord?.gov_id_no || '')
    setIdIssuedDate(landlord?.id_issued_date || '')
    setIdExpiryDate(landlord?.id_expiry_date || '')
    setError(null)
  }, [landlord, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = {
      first_name: firstName.trim(),
      middle_name: middleName.trim(),
      last_name: lastName.trim(),
      name_prefix: namePrefix.trim() || null,
      citizenship: citizenship.trim(),
      marital_status: maritalStatus.trim(),
      postal_address: postalAddress.trim(),
      gov_id_type: govIdType,
      gov_id_no: govIdNo.trim(),
      id_issued_date: idIssuedDate,
      id_expiry_date: idExpiryDate,
    }

    try {
      if (landlord?.id) {
        await updateLandlord(landlord.id, payload)
      } else {
        await createLandlord(payload)
      }
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save landlord.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-white">{landlord ? 'Edit Landlord' : 'Add Landlord'}</DialogTitle>
          <DialogDescription className="text-slate-400">Maintain lessor master records for contracts.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label className="text-slate-200">Name Prefix</Label>
              <Input
                value={namePrefix}
                onChange={(e) => setNamePrefix(e.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
                placeholder="e.g. ENGR."
              />
            </div>
            <div>
              <Label className="text-slate-200">First Name</Label>
              <Input
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-200">Middle Name</Label>
              <Input
                required
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-200">Last Name</Label>
              <Input
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-200">Citizenship</Label>
              <Input
                required
                value={citizenship}
                onChange={(e) => setCitizenship(e.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-200">Marital Status</Label>
              <Input
                required
                value={maritalStatus}
                onChange={(e) => setMaritalStatus(e.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-200">Postal Address</Label>
            <Textarea
              required
              value={postalAddress}
              onChange={(e) => setPostalAddress(e.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              <Label className="text-slate-200">Government ID Number</Label>
              <Input
                required
                value={govIdNo}
                onChange={(e) => setGovIdNo(e.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-200">ID Issued Date</Label>
              <Input
                required
                type="date"
                value={idIssuedDate}
                onChange={(e) => setIdIssuedDate(e.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-200">ID Expiry Date</Label>
              <Input
                required
                type="date"
                value={idExpiryDate}
                onChange={(e) => setIdExpiryDate(e.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          {error && (
            <div className="rounded border border-red-700 bg-red-900/20 px-3 py-2 text-sm text-red-200">{error}</div>
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
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? 'Saving...' : 'Save Landlord'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
