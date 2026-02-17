'use client'

import { useEffect, useState } from 'react'
import { getPropertiesWithUnits } from '@/lib/api/properties'
import { getTenantByUnit, getContractsByUnit, updateContract } from '@/lib/api/tenants'
import { getUnitById } from '@/lib/api/units'
import { getCurrentUser } from '@/lib/api/users'
import { generateContractDocument } from '@/lib/export/contract-document'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Download } from 'lucide-react'

export default function ContractMonitoringPage() {
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const user = await getCurrentUser()
      setCurrentUser(user)

      const props = await getPropertiesWithUnits()

      // Load contracts and tenants for all units
      const propsWithContracts = await Promise.all(
        props.map(async (prop) => ({
          ...prop,
          units: await Promise.all(
            prop.units.map(async (unit: any) => {
              const tenant = await getTenantByUnit(unit.id)
              const contracts = await getContractsByUnit(unit.id)
              return { ...unit, tenant, contracts }
            })
          ),
        }))
      )

      setProperties(propsWithContracts)
    } catch (error) {
      console.error('Error loading contracts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleSigned = async (contractId: string, currentValue: boolean) => {
    try {
      await updateContract(contractId, {
        signed: !currentValue,
        signed_recorded_by: !currentValue ? currentUser?.full_name : null,
      })
      loadData()
    } catch (error) {
      console.error('Error updating contract:', error)
    }
  }

  const handleToggleNotarized = async (contractId: string, currentValue: boolean) => {
    try {
      await updateContract(contractId, {
        notarized: !currentValue,
        notarized_recorded_by: !currentValue ? currentUser?.full_name : null,
      })
      loadData()
    } catch (error) {
      console.error('Error updating contract:', error)
    }
  }

  const handleGenerateContract = async (unit: any, tenant: any) => {
    if (!tenant) {
      alert('No tenant assigned to this unit')
      return
    }

    try {
      setExporting(true)

      const contractData = {
        propertyName: unit.property?.name || '',
        unitName: unit.name,
        contractName: tenant.contract_name,
        tenantAddress: tenant.address,
        beginContract: tenant.begin_contract,
        endContract: tenant.end_contract,
        contractAddress: unit.contract_address,
        rentAmount: unit.rent_amount,
        cashBondAmount: unit.cash_bond_amount,
      }

      const buffer = await generateContractDocument(contractData)

      // Download the file
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${unit.name}-Contract-${new Date().getTime()}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error generating contract:', error)
      alert('Error generating contract document')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return <div className="text-center text-slate-400">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Contract Monitoring</h1>

      {properties.length === 0 ? (
        <Card className="p-8 text-center border-slate-700 bg-slate-800">
          <p className="text-slate-400">No properties found</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {properties.map((property) => (
            <Card key={property.id} className="p-6 border-slate-700 bg-slate-800">
              <h2 className="text-xl font-semibold text-white mb-4">{property.name}</h2>

              <div className="space-y-4">
                {property.units.map((unit: any) => (
                  <div key={unit.id} className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                    <div className="mb-3">
                      <h3 className="text-lg font-medium text-white">{unit.name}</h3>
                      {unit.tenant ? (
                        <p className="text-sm text-slate-300">
                          {unit.tenant.first_name} {unit.tenant.last_name}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-400">No tenant assigned</p>
                      )}
                    </div>

                    {unit.contracts && unit.contracts.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-600">
                              <th className="px-3 py-2 text-left text-slate-300">Year</th>
                              <th className="px-3 py-2 text-center text-slate-300">Signed</th>
                              <th className="px-3 py-2 text-center text-slate-300">Recorded By (Signed)</th>
                              <th className="px-3 py-2 text-center text-slate-300">Notarized</th>
                              <th className="px-3 py-2 text-center text-slate-300">Recorded By (Notarized)</th>
                              <th className="px-3 py-2 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {unit.contracts.map((contract: any) => (
                              <tr key={contract.id} className="border-b border-slate-600 hover:bg-slate-600">
                                <td className="px-3 py-2 text-white">{contract.year}</td>
                                <td className="px-3 py-2 text-center">
                                  <Checkbox
                                    checked={contract.signed}
                                    onCheckedChange={() =>
                                      handleToggleSigned(contract.id, contract.signed)
                                    }
                                  />
                                </td>
                                <td className="px-3 py-2 text-center text-xs text-slate-400">
                                  {contract.signed_recorded_by || '-'}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <Checkbox
                                    checked={contract.notarized}
                                    onCheckedChange={() =>
                                      handleToggleNotarized(contract.id, contract.notarized)
                                    }
                                  />
                                </td>
                                <td className="px-3 py-2 text-center text-xs text-slate-400">
                                  {contract.notarized_recorded_by || '-'}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <Button
                                    onClick={() => handleGenerateContract(unit, unit.tenant)}
                                    disabled={exporting || !unit.tenant}
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white text-xs"
                                  >
                                    <Download size={12} className="mr-1" />
                                    Export
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-slate-400 text-sm">No contracts found</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
