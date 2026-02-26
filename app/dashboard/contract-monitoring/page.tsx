'use client'

import { useEffect, useMemo, useState } from 'react'
import { getPropertiesWithUnits } from '@/lib/api/properties'
import {
  createContract,
  deleteContract,
  getAllTenants,
  getContractsByYear,
  updateContract,
} from '@/lib/api/tenants'
import { getCurrentUser, getUsersMapByIds } from '@/lib/api/users'
import { generateContractDocument } from '@/lib/export/contract-document'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ChevronLeft, ChevronRight, Download, Trash2 } from 'lucide-react'

const START_YEAR = 2026
const LESSOR_NAME = 'ARMANDO L. AMAN'

type ContractFormState = {
  unitId: string
  tenantId: string
  year: string
  firstName: string
  middleName: string
  lastName: string
  citizenship: string
  maritalStatus: string
  tenantAddress: string
  unitSpecification: string
  propertySpecification: string
  rent: string
  cashBond: string
  beginContract: string
  endContract: string
  comments: string
}

const emptyForm: ContractFormState = {
  unitId: '',
  tenantId: '',
  year: String(START_YEAR),
  firstName: '',
  middleName: '',
  lastName: '',
  citizenship: 'Filipino',
  maritalStatus: '',
  tenantAddress: '',
  unitSpecification: '',
  propertySpecification: '',
  rent: '',
  cashBond: '',
  beginContract: '',
  endContract: '',
  comments: '',
}

export default function ContractMonitoringPage() {
  const [properties, setProperties] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [contracts, setContracts] = useState<any[]>([])
  const [recordedByNames, setRecordedByNames] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentYear, setCurrentYear] = useState(START_YEAR)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [exportingId, setExportingId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [editingContractId, setEditingContractId] = useState<string | null>(null)
  const [contractForm, setContractForm] = useState<ContractFormState>(emptyForm)
  const [signingDialogOpen, setSigningDialogOpen] = useState(false)
  const [trackingContract, setTrackingContract] = useState<any>(null)
  const [trackingSigned, setTrackingSigned] = useState<string>('true')
  const [trackingComments, setTrackingComments] = useState('')
  const [trackingSaving, setTrackingSaving] = useState(false)
  const [trackingError, setTrackingError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [currentYear])

  async function loadData() {
    try {
      setLoading(true)
      const [user, props, allTenants, yearlyContracts] = await Promise.all([
        getCurrentUser(),
        getPropertiesWithUnits(),
        getAllTenants(),
        getContractsByYear(currentYear),
      ])
      setCurrentUser(user)
      setProperties(props)
      setTenants(allTenants)
      setContracts(yearlyContracts)

      const userIds = yearlyContracts.map((contract: any) => contract.recorded_by_user_id).filter(Boolean)
      setRecordedByNames(await getUsersMapByIds(userIds))
    } catch (error) {
      console.error('Error loading contracts:', error)
    } finally {
      setLoading(false)
    }
  }

  const contractsByUnit = useMemo(() => {
    const map = new Map<string, any>()
    contracts.forEach((contract) => {
      map.set(contract.unit_id, contract)
    })
    return map
  }, [contracts])

  const tenantsByUnit = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const tenant of tenants) {
      if (!map.has(tenant.unit_id)) map.set(tenant.unit_id, [])
      map.get(tenant.unit_id)!.push(tenant)
    }
    return map
  }, [tenants])

  function openCreateDialog(unit: any) {
    const unitTenants = tenantsByUnit.get(unit.id) || []
    const defaultTenant = unitTenants[0]

    setContractForm({
      ...emptyForm,
      unitId: unit.id,
      tenantId: defaultTenant?.id || '',
      year: String(currentYear),
      firstName: defaultTenant?.first_name || '',
      lastName: defaultTenant?.last_name || '',
      middleName: '',
    })
    setFormError(null)
    setEditingContractId(null)
    setDialogOpen(true)
  }

  function openEditDialog(contract: any) {
    setContractForm({
      unitId: contract.unit_id,
      tenantId: contract.tenant_id,
      year: String(contract.year),
      firstName: contract.first_name,
      middleName: contract.middle_name,
      lastName: contract.last_name,
      citizenship: contract.citizenship,
      maritalStatus: contract.marital_status,
      tenantAddress: contract.tenant_address,
      unitSpecification: contract.unit_specification,
      propertySpecification: contract.property_specification,
      rent: String(contract.rent),
      cashBond: String(contract.cash_bond),
      beginContract: contract.begin_contract,
      endContract: contract.end_contract,
      comments: contract.comments || '',
    })
    setFormError(null)
    setEditingContractId(contract.id)
    setDialogOpen(true)
  }

  function applyTenantToForm(tenantId: string) {
    const tenant = tenants.find((item) => item.id === tenantId)
    setContractForm((prev) => ({
      ...prev,
      tenantId,
      firstName: tenant?.first_name || prev.firstName,
      lastName: tenant?.last_name || prev.lastName,
    }))
  }

  function validateForm() {
    const required = [
      contractForm.unitId,
      contractForm.tenantId,
      contractForm.year,
      contractForm.firstName,
      contractForm.middleName,
      contractForm.lastName,
      contractForm.citizenship,
      contractForm.maritalStatus,
      contractForm.tenantAddress,
      contractForm.unitSpecification,
      contractForm.propertySpecification,
      contractForm.rent,
      contractForm.cashBond,
      contractForm.beginContract,
      contractForm.endContract,
    ]

    return required.every((value) => value.trim().length > 0)
  }

  async function handleSaveContract() {
    if (!currentUser?.id) return
    setFormError(null)

    if (!validateForm()) {
      setFormError('Please complete all required fields.')
      return
    }

    try {
      setSaving(true)
      if (editingContractId) {
        await updateContract(editingContractId, {
          tenant_id: contractForm.tenantId,
          year: Number(contractForm.year),
          first_name: contractForm.firstName.trim(),
          middle_name: contractForm.middleName.trim(),
          last_name: contractForm.lastName.trim(),
          citizenship: contractForm.citizenship.trim(),
          marital_status: contractForm.maritalStatus.trim(),
          tenant_address: contractForm.tenantAddress.trim(),
          unit_specification: contractForm.unitSpecification.trim(),
          property_specification: contractForm.propertySpecification.trim(),
          rent: Number(contractForm.rent),
          cash_bond: Number(contractForm.cashBond),
          begin_contract: contractForm.beginContract,
          end_contract: contractForm.endContract,
          comments: contractForm.comments.trim() || null,
          recorded_by_user_id: currentUser.id,
        })
      } else {
        await createContract(
          contractForm.unitId,
          contractForm.tenantId,
          Number(contractForm.year),
          contractForm.firstName.trim(),
          contractForm.middleName.trim(),
          contractForm.lastName.trim(),
          contractForm.citizenship.trim(),
          contractForm.maritalStatus.trim(),
          contractForm.tenantAddress.trim(),
          contractForm.unitSpecification.trim(),
          contractForm.propertySpecification.trim(),
          Number(contractForm.rent),
          Number(contractForm.cashBond),
          contractForm.beginContract,
          contractForm.endContract,
          false,
          currentUser.id,
          contractForm.comments.trim() || null
        )
      }
      setDialogOpen(false)
      setEditingContractId(null)
      await loadData()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save contract.')
    } finally {
      setSaving(false)
    }
  }

  function openSigningDialog(contract: any) {
    setTrackingContract(contract)
    setTrackingSigned(contract.signed ? 'true' : 'false')
    setTrackingComments(contract.comments || '')
    setTrackingError(null)
    setSigningDialogOpen(true)
  }

  async function handleRecordSigning() {
    if (!currentUser?.id || !trackingContract) return

    try {
      setTrackingSaving(true)
      setTrackingError(null)
      await updateContract(trackingContract.id, {
        signed: trackingSigned === 'true',
        recorded_by_user_id: currentUser.id,
        recorded_date: new Date().toISOString(),
        comments: trackingComments.trim() || null,
      })
      setSigningDialogOpen(false)
      setTrackingContract(null)
      setTrackingComments('')
      await loadData()
    } catch (error) {
      setTrackingError(error instanceof Error ? error.message : 'Unable to record contract signing.')
    } finally {
      setTrackingSaving(false)
    }
  }

  async function handleDeleteTracking(contract: any) {
    if (!confirm('Delete this contract tracking record?')) return
    if (!currentUser?.id) return
    try {
      await updateContract(contract.id, {
        signed: false,
        recorded_by_user_id: null,
        recorded_date: null,
        comments: null,
      })
      await loadData()
    } catch (error) {
      console.error('Error deleting contract tracking:', error)
    }
  }

  async function handleDeleteContract(contractId: string) {
    if (!confirm('Delete this contract record?')) return
    try {
      await deleteContract(contractId)
      await loadData()
    } catch (error) {
      console.error('Error deleting contract:', error)
      alert('Unable to delete contract.')
    }
  }

  async function handleExport(contract: any, property: any, unit: any) {
    try {
      setExportingId(contract.id)
      const payload = {
        lessorName: LESSOR_NAME,
        propertyAddress: `${unit.name}, ${property.address}`,
        year: contract.year,
        firstName: contract.first_name,
        middleName: contract.middle_name,
        lastName: contract.last_name,
        citizenship: contract.citizenship,
        maritalStatus: contract.marital_status,
        tenantAddress: contract.tenant_address,
        unitSpecification: contract.unit_specification,
        propertySpecification: contract.property_specification,
        rent: Number(contract.rent),
        cashBond: Number(contract.cash_bond),
        beginContract: contract.begin_contract,
        endContract: contract.end_contract,
      }

      const fileBase = `${unit.name}-contract-${contract.year}`.replace(/\s+/g, '-')

      const blob = await generateContractDocument(payload)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${fileBase}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting contract:', error)
      alert('Unable to export contract.')
    } finally {
      setExportingId(null)
    }
  }

  if (loading) {
    return <div className="text-center text-slate-400">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Contract Monitoring</h1>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setCurrentYear((value) => Math.max(START_YEAR, value - 1))}
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              disabled={currentYear <= START_YEAR}
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="min-w-16 text-center text-lg font-semibold text-white">{currentYear}</span>
            <Button
              onClick={() => setCurrentYear((value) => value + 1)}
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>

      {properties.length === 0 ? (
        <Card className="p-8 text-center border-slate-700 bg-slate-800">
          <p className="text-slate-400">No properties found.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {properties.map((property) => (
            <Card key={property.id} className="p-4 sm:p-6 border-slate-700 bg-slate-800">
              <h2 className="text-xl font-semibold text-white mb-4">{property.name}</h2>
              <div className="space-y-4">
                {property.units.map((unit: any) => {
                  const contract = contractsByUnit.get(unit.id)
                  return (
                    <div key={unit.id} className="rounded-lg border border-slate-600 bg-slate-700 p-4 space-y-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-white">{unit.name}</h3>
                          <p className="text-sm text-slate-400">Property: {property.name}</p>
                        </div>
                        {!contract ? (
                          <Button onClick={() => openCreateDialog(unit)} className="bg-blue-600 hover:bg-blue-700 text-white">
                            Add Contract
                          </Button>
                        ) : (
                          <Button onClick={() => openEditDialog(contract)} className="bg-blue-600 hover:bg-blue-700 text-white">
                            Edit Contract
                          </Button>
                        )}
                      </div>

                      {!contract ? (
                        <p className="text-sm text-slate-400">No contract recorded for {currentYear}.</p>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 text-sm">
                            <div>
                              <p className="text-slate-400">Tenant</p>
                              <p className="text-white">
                                {contract.first_name} {contract.middle_name} {contract.last_name}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400">Contract Period</p>
                              <p className="text-white">
                                {new Date(contract.begin_contract).toLocaleDateString()} -{' '}
                                {new Date(contract.end_contract).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400">Rent</p>
                              <p className="text-white">PHP {Number(contract.rent).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-slate-400">Cash Bond</p>
                              <p className="text-white">PHP {Number(contract.cash_bond).toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-slate-400">Signed</p>
                              <p className="text-white">{contract.signed ? 'Yes' : 'No'}</p>
                            </div>
                            <div>
                              <p className="text-slate-400">Recorded By</p>
                              <p className="text-white">
                                {contract.recorded_by_user_id
                                  ? recordedByNames.get(contract.recorded_by_user_id) || contract.recorded_by_user_id
                                  : '-'}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400">Recorded Date/Time</p>
                              <p className="text-white">
                                {contract.recorded_date ? new Date(contract.recorded_date).toLocaleString() : '-'}
                              </p>
                            </div>
                            <div className="md:col-span-2">
                              <p className="text-slate-400">Comments</p>
                              <p className="text-white">{contract.comments || '-'}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Button
                              onClick={() => openSigningDialog(contract)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Record Signing
                            </Button>
                            {(contract.recorded_by_user_id || contract.recorded_date || contract.comments) && (
                              <Button
                                onClick={() => handleDeleteTracking(contract)}
                                variant="outline"
                                size="icon"
                                className="border-red-600/50 text-red-400 hover:bg-red-900/20"
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                            <Button
                              onClick={() => handleExport(contract, property, unit)}
                              disabled={exportingId === contract.id}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Download size={14} className="mr-2" />
                              Export Word
                            </Button>
                            <Button
                              onClick={() => handleDeleteContract(contract.id)}
                              variant="outline"
                              className="border-red-600/50 text-red-400 hover:bg-red-900/20"
                            >
                              <Trash2 size={14} className="mr-2" />
                              Delete Contract
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingContractId(null)
          }
        }}
      >
        <DialogContent className="max-w-3xl bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">{editingContractId ? 'Edit Contract' : 'Add Contract'}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Fill in all required fields to save and generate a contract.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-slate-200">Year</Label>
                <Input
                  type="number"
                  min={START_YEAR}
                  value={contractForm.year}
                  onChange={(e) => setContractForm((prev) => ({ ...prev, year: e.target.value }))}
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-slate-200">Tenant</Label>
                <Select value={contractForm.tenantId} onValueChange={applyTenantToForm}>
                  <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id} className="text-white">
                        {tenant.first_name} {tenant.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-slate-200">First Name</Label>
                <Input
                  value={contractForm.firstName}
                  onChange={(e) => setContractForm((prev) => ({ ...prev, firstName: e.target.value }))}
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-200">Middle Name</Label>
                <Input
                  value={contractForm.middleName}
                  onChange={(e) => setContractForm((prev) => ({ ...prev, middleName: e.target.value }))}
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-200">Last Name</Label>
                <Input
                  value={contractForm.lastName}
                  onChange={(e) => setContractForm((prev) => ({ ...prev, lastName: e.target.value }))}
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-200">Citizenship</Label>
                <Input
                  value={contractForm.citizenship}
                  onChange={(e) => setContractForm((prev) => ({ ...prev, citizenship: e.target.value }))}
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-200">Marital Status</Label>
                <Input
                  value={contractForm.maritalStatus}
                  onChange={(e) => setContractForm((prev) => ({ ...prev, maritalStatus: e.target.value }))}
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-200">Tenant Address</Label>
              <Textarea
                value={contractForm.tenantAddress}
                onChange={(e) => setContractForm((prev) => ({ ...prev, tenantAddress: e.target.value }))}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-200">Unit Specification</Label>
                <Input
                  value={contractForm.unitSpecification}
                  onChange={(e) => setContractForm((prev) => ({ ...prev, unitSpecification: e.target.value }))}
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-200">Property Specification</Label>
                <Input
                  value={contractForm.propertySpecification}
                  onChange={(e) =>
                    setContractForm((prev) => ({ ...prev, propertySpecification: e.target.value }))
                  }
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-200">Rent Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={contractForm.rent}
                  onChange={(e) => setContractForm((prev) => ({ ...prev, rent: e.target.value }))}
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-200">Cash Bond Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={contractForm.cashBond}
                  onChange={(e) => setContractForm((prev) => ({ ...prev, cashBond: e.target.value }))}
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-200">Begin Contract</Label>
                <Input
                  type="date"
                  value={contractForm.beginContract}
                  onChange={(e) => setContractForm((prev) => ({ ...prev, beginContract: e.target.value }))}
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label className="text-slate-200">End Contract</Label>
                <Input
                  type="date"
                  value={contractForm.endContract}
                  onChange={(e) => setContractForm((prev) => ({ ...prev, endContract: e.target.value }))}
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-200">Comments</Label>
              <Textarea
                value={contractForm.comments}
                onChange={(e) => setContractForm((prev) => ({ ...prev, comments: e.target.value }))}
                className="mt-1 bg-slate-700 border-slate-600 text-white"
                placeholder="Optional notes"
              />
            </div>

            {formError && (
              <div className="rounded border border-red-700 bg-red-900/20 px-3 py-2 text-sm text-red-200">
                {formError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button onClick={handleSaveContract} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? 'Saving...' : editingContractId ? 'Save Changes' : 'Save Contract'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={signingDialogOpen}
        onOpenChange={(open) => {
          setSigningDialogOpen(open)
          if (!open) {
            setTrackingContract(null)
            setTrackingError(null)
          }
        }}
      >
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Record Contract Signing</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update signing status, recorder, and comments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-slate-200">Signing Status</Label>
              <RadioGroup value={trackingSigned} onValueChange={setTrackingSigned}>
                <div className="flex items-center space-x-2 mt-2">
                  <RadioGroupItem value="true" id="signed" />
                  <Label htmlFor="signed" className="font-normal text-slate-300">
                    Signed
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="not-signed" />
                  <Label htmlFor="not-signed" className="font-normal text-slate-300">
                    Not Signed
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label className="text-slate-200" htmlFor="contract_tracking_comments">
                Comments
              </Label>
              <Textarea
                id="contract_tracking_comments"
                value={trackingComments}
                onChange={(e) => setTrackingComments(e.target.value)}
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

            {trackingError && (
              <div className="p-3 bg-red-900/20 border border-red-700 text-red-200 rounded text-sm">
                {trackingError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              onClick={() => setSigningDialogOpen(false)}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRecordSigning}
              disabled={trackingSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {trackingSaving ? 'Recording...' : 'Record Signing'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
