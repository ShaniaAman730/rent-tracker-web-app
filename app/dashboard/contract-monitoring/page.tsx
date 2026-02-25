'use client'

import { useEffect, useMemo, useState } from 'react'
import { getPropertiesWithUnits } from '@/lib/api/properties'
import {
  createContract,
  getAllTenants,
  getContractsByYear,
  updateContract,
} from '@/lib/api/tenants'
import { getCurrentUser, getUsersMapByIds } from '@/lib/api/users'
import { generateContractDocument, generateContractPdf } from '@/lib/export/contract-document'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'

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
  const [contractForm, setContractForm] = useState<ContractFormState>(emptyForm)

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

  async function handleCreateContract() {
    if (!currentUser?.id) return
    setFormError(null)

    if (!validateForm()) {
      setFormError('Please complete all required fields.')
      return
    }

    try {
      setSaving(true)
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
      setDialogOpen(false)
      await loadData()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to save contract.')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleSigned(contract: any) {
    if (!currentUser?.id) return
    try {
      await updateContract(contract.id, {
        signed: !contract.signed,
        recorded_by_user_id: currentUser.id,
      })
      await loadData()
    } catch (error) {
      console.error('Error updating contract signed state:', error)
    }
  }

  async function handleExport(contract: any, property: any, unit: any, type: 'word' | 'pdf') {
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

      if (type === 'word') {
        const blob = await generateContractDocument(payload)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${fileBase}.docx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        return
      }

      const pdfBlob = await generateContractPdf(payload)
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${fileBase}.pdf`
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
                        <Button onClick={() => openCreateDialog(unit)} className="bg-blue-600 hover:bg-blue-700 text-white">
                          Add Contract
                        </Button>
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
                              <div className="flex items-center gap-2 pt-1">
                                <Checkbox
                                  checked={contract.signed}
                                  onCheckedChange={() => handleToggleSigned(contract)}
                                />
                                <span className="text-white">{contract.signed ? 'Yes' : 'No'}</span>
                              </div>
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
                              onClick={() => handleExport(contract, property, unit, 'word')}
                              disabled={exportingId === contract.id}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Download size={14} className="mr-2" />
                              Export Word
                            </Button>
                            <Button
                              onClick={() => handleExport(contract, property, unit, 'pdf')}
                              disabled={exportingId === contract.id}
                              variant="outline"
                              className="border-slate-500 text-slate-100 hover:bg-slate-600"
                            >
                              <Download size={14} className="mr-2" />
                              Export PDF
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Add Contract</DialogTitle>
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
            <Button onClick={handleCreateContract} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              {saving ? 'Saving...' : 'Save Contract'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
