'use client'

import { useState } from 'react'
import { createTenant, updateTenant } from '@/lib/api/tenants'
import { Tenant } from '@/lib/types'
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
  const [contractName, setContractName] = useState(tenant?.contract_name || '')
  const [contactNo, setContactNo] = useState(tenant?.contact_no || '')
  const [messenger, setMessenger] = useState(tenant?.messenger || '')
  const [address, setAddress] = useState(tenant?.address || '')
  const [beginContract, setBeginContract] = useState(
    tenant ? new Date(tenant.begin_contract).toISOString().split('T')[0] : ''
  )
  const [endContract, setEndContract] = useState(
    tenant ? new Date(tenant.end_contract).toISOString().split('T')[0] : ''
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (tenant) {
        await updateTenant(tenant.id, {
          first_name: firstName,
          last_name: lastName,
          contract_name: contractName,
          contact_no: contactNo,
          messenger,
          address,
          begin_contract: beginContract,
          end_contract: endContract,
        })
      } else {
        await createTenant(
          unitId,
          firstName,
          lastName,
          contractName,
          contactNo,
          messenger,
          address,
          beginContract,
          endContract
        )
      }

      setFirstName('')
      setLastName('')
      setContractName('')
      setContactNo('')
      setMessenger('')
      setAddress('')
      setBeginContract('')
      setEndContract('')
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
          <DialogTitle className="text-white">
            {tenant ? 'Edit Tenant' : 'Add Tenant'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Unit: {unitName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-96 overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
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

          <div>
            <Label htmlFor="contract_name" className="text-slate-200">
              Contract Name
            </Label>
            <Input
              id="contract_name"
              value={contractName}
              onChange={(e) => setContractName(e.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          <div>
            <Label htmlFor="address" className="text-slate-200">
              Address
            </Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="begin_contract" className="text-slate-200">
                Contract Begin Date
              </Label>
              <Input
                id="begin_contract"
                type="date"
                value={beginContract}
                onChange={(e) => setBeginContract(e.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>

            <div>
              <Label htmlFor="end_contract" className="text-slate-200">
                Contract End Date
              </Label>
              <Input
                id="end_contract"
                type="date"
                value={endContract}
                onChange={(e) => setEndContract(e.target.value)}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
                required
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
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? 'Saving...' : 'Save Tenant'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
