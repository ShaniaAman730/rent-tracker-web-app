'use client'

import { useEffect, useMemo, useState } from 'react'
import { getPropertiesWithUnits } from '@/lib/api/properties'
import { getCurrentUser, getUsersMapByIds } from '@/lib/api/users'
import {
  deleteUtility,
  getUtilitiesWithPaymentsForPairings,
  touchUtilityPaymentRecorder,
} from '@/lib/api/utilities'
import {
  deleteUnitPairing,
  getUnitPairings,
  upsertUnitPairing,
} from '@/lib/api/unit-pairings'
import { calculateBillingData } from '@/lib/billing-helpers'
import { generateBillingDocument } from '@/lib/export/billing-document'
import {
  exportBillingToExcel,
  exportBillingToPdf,
  exportBillingToPng,
} from '@/lib/export/billing-exporters'
import { AddUtilityDialog } from '@/components/dialogs/add-utility-dialog'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Download, Edit, Trash2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

type UtilityType = 'MNWD' | 'Casureco'
type ExportType = 'word' | 'pdf' | 'png' | 'excel'

function formatMoney(value: number) {
  return `PHP ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function ComputeUtilitiesPage() {
  const [properties, setProperties] = useState<any[]>([])
  const [pairings, setPairings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [recordedByNames, setRecordedByNames] = useState<Map<string, string>>(new Map())

  const [selectedPairingId, setSelectedPairingId] = useState<string>('')
  const [newFirstUnitId, setNewFirstUnitId] = useState<string>('')
  const [newSecondUnitId, setNewSecondUnitId] = useState<string>('')

  const [showAllMnwd, setShowAllMnwd] = useState(false)
  const [showAllCasureco, setShowAllCasureco] = useState(false)

  const [mnwdUtilities, setMnwdUtilities] = useState<any[]>([])
  const [casurecoUtilities, setCasurecoUtilities] = useState<any[]>([])

  const [formOpen, setFormOpen] = useState(false)
  const [editingUtility, setEditingUtility] = useState<any>(null)
  const [exportType, setExportType] = useState<ExportType>('word')
  const [exportUtilityType, setExportUtilityType] = useState<UtilityType>('MNWD')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!selectedPairing) return
    loadUtilitiesForSelectedPairing()
  }, [selectedPairingId])

  async function loadData() {
    try {
      setLoading(true)
      const [user, props, pairingsData] = await Promise.all([
        getCurrentUser(),
        getPropertiesWithUnits(),
        getUnitPairings(),
      ])
      setCurrentUser(user)
      setProperties(props)
      setPairings(pairingsData)

      if (pairingsData.length > 0) {
        setSelectedPairingId(pairingsData[0].id)
      }
    } catch (error) {
      console.error('Error loading compute utilities data:', error)
    } finally {
      setLoading(false)
    }
  }

  const trackedUnits = useMemo(
    () =>
      properties.flatMap((property) =>
        (property.units || [])
          .filter((unit: any) => unit.track_utilities)
          .map((unit: any) => ({
            ...unit,
            label: `${property.name} - ${unit.name}`,
          }))
      ),
    [properties]
  )

  const unitsById = useMemo(() => {
    const map = new Map<string, any>()
    trackedUnits.forEach((unit) => map.set(unit.id, unit))
    return map
  }, [trackedUnits])

  const selectedPairing = useMemo(
    () => pairings.find((pairing) => pairing.id === selectedPairingId) || null,
    [pairings, selectedPairingId]
  )

  const selectedPairUnits = useMemo(() => {
    if (!selectedPairing) return []
    const firstUnit = unitsById.get(selectedPairing.first_unit_id)
    const secondUnit = unitsById.get(selectedPairing.second_unit_id)
    return [firstUnit, secondUnit].filter(Boolean)
  }, [selectedPairing, unitsById])

  const selectedPairLabel = useMemo(() => {
    if (selectedPairUnits.length !== 2) return ''
    return `${selectedPairUnits[0].name} (First Floor) + ${selectedPairUnits[1].name} (Second Floor)`
  }, [selectedPairUnits])

  async function loadUtilitiesForSelectedPairing() {
    if (!selectedPairing) return
    try {
      const utilities = await getUtilitiesWithPaymentsForPairings([selectedPairing.id])

      const sortedByTypeAndDate = (type: UtilityType) =>
        utilities
          .filter((utility: any) => utility.type === type)
          .sort(
            (a: any, b: any) =>
              new Date(b.date_of_reading).getTime() - new Date(a.date_of_reading).getTime()
          )

      const mnwd = sortedByTypeAndDate('MNWD')
      const casureco = sortedByTypeAndDate('Casureco')
      setMnwdUtilities(mnwd)
      setCasurecoUtilities(casureco)

      const userIds = utilities
        .map((utility: any) => utility.payment?.recorded_by_user_id)
        .filter(Boolean)
      setRecordedByNames(await getUsersMapByIds(userIds))
    } catch (error) {
      console.error('Error loading paired utilities:', error)
    }
  }

  const getPreviousReading = (utility: any, list: any[]) => {
    return list.find(
      (candidate) =>
        candidate.id !== utility.id &&
        new Date(candidate.date_of_reading).getTime() < new Date(utility.date_of_reading).getTime()
    )
  }

  async function handleAddPairing() {
    if (!newFirstUnitId || !newSecondUnitId) {
      alert('Select both units to pair.')
      return
    }
    if (newFirstUnitId === newSecondUnitId) {
      alert('Please select two different units.')
      return
    }
    try {
      await upsertUnitPairing(newFirstUnitId, newSecondUnitId)
      setNewFirstUnitId('')
      setNewSecondUnitId('')
      await loadData()
    } catch (error) {
      console.error('Error saving unit pairing:', error)
      alert('Unable to save pairing.')
    }
  }

  async function handleDeletePairing() {
    if (!selectedPairing) return
    if (!confirm('Delete selected unit pairing?')) return

    try {
      await deleteUnitPairing(selectedPairing.id)
      setSelectedPairingId('')
      setMnwdUtilities([])
      setCasurecoUtilities([])
      await loadData()
    } catch (error) {
      console.error('Error deleting unit pairing:', error)
      alert('Unable to delete pairing.')
    }
  }

  async function handleDeleteUtility(utilityId: string) {
    if (!confirm('Delete this utility record?')) return
    try {
      await deleteUtility(utilityId)
      await loadUtilitiesForSelectedPairing()
    } catch (error) {
      console.error('Error deleting utility record:', error)
      alert('Unable to delete utility record.')
    }
  }

  async function handleGenerateBilling() {
    if (!selectedPairing || !currentUser) return

    const list = exportUtilityType === 'MNWD' ? mnwdUtilities : casurecoUtilities
    if (list.length < 2) {
      alert('First entry has no previous reading. Add another month before exporting.')
      return
    }

    const current = list[0]
    const previous = list[1]
    if (!previous) {
      alert('Previous reading not found.')
      return
    }

    const billingData = calculateBillingData(
      previous,
      current,
      selectedPairLabel,
      currentUser.full_name
    )

    const fileBase = `${selectedPairLabel}-${exportUtilityType}-${new Date(
      current.currentDate || current.date_of_reading
    )
      .toISOString()
      .slice(0, 10)}`

    try {
      setExporting(true)
      if (exportType === 'word') {
        const docBlob = await generateBillingDocument(billingData)
        const url = URL.createObjectURL(docBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${fileBase}.docx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        return
      }

      if (exportType === 'pdf') {
        await exportBillingToPdf(billingData, `${fileBase}.pdf`)
        return
      }

      if (exportType === 'png') {
        await exportBillingToPng(billingData, `${fileBase}.png`)
        return
      }

      exportBillingToExcel(billingData, `${fileBase}.xlsx`)
    } catch (error) {
      console.error('Error generating billing:', error)
      alert('Unable to generate billing.')
    } finally {
      setExporting(false)
    }
  }

  async function handleUtilityFormSuccess() {
    if (editingUtility && currentUser?.id) {
      try {
        await touchUtilityPaymentRecorder(editingUtility.id, currentUser.id)
      } catch (error) {
        console.error('Error updating utility recorder:', error)
      }
    }
    setEditingUtility(null)
    setFormOpen(false)
    await loadUtilitiesForSelectedPairing()
  }

  const renderTrackerTable = (
    title: string,
    list: any[],
    showAll: boolean,
    onToggle: (value: boolean) => void
  ) => {
    const rows = showAll ? list : list.slice(0, 7)

    return (
      <Card className="p-6 border-slate-700 bg-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <Button
            onClick={() => onToggle(!showAll)}
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            {showAll ? 'Show Last 7' : 'See More'}
          </Button>
        </div>

        {rows.length === 0 ? (
          <p className="text-slate-400">No records found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-600">
                  <th className="px-3 py-2 text-left text-slate-300">Pair</th>
                  <th className="px-3 py-2 text-left text-slate-300">Due Date</th>
                  <th className="px-3 py-2 text-left text-slate-300">Previous Date of Reading</th>
                  <th className="px-3 py-2 text-right text-slate-300">Previous Unit Reading</th>
                  <th className="px-3 py-2 text-left text-slate-300">Current Date of Reading</th>
                  <th className="px-3 py-2 text-right text-slate-300">Current Unit Reading</th>
                  <th className="px-3 py-2 text-right text-slate-300">Usage</th>
                  <th className="px-3 py-2 text-right text-slate-300">Amount</th>
                  <th className="px-3 py-2 text-center text-slate-300">Remarks</th>
                  <th className="px-3 py-2 text-left text-slate-300">Recorded By</th>
                  <th className="px-3 py-2 text-center text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((utility) => {
                  const previous = getPreviousReading(utility, list)
                  const usage = previous ? utility.unit_reading - previous.unit_reading : null
                  return (
                    <tr key={utility.id} className="border-b border-slate-700 hover:bg-slate-700">
                      <td className="px-3 py-2 text-white">{selectedPairLabel}</td>
                      <td className="px-3 py-2 text-slate-300">
                        {new Date(utility.due_date).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        {previous ? new Date(previous.date_of_reading).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-300">
                        {previous ? Number(previous.unit_reading).toFixed(2) : '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        {new Date(utility.date_of_reading).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-300">
                        {Number(utility.unit_reading).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-300">
                        {usage === null ? 'N/A (first)' : usage.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right text-white">{formatMoney(utility.amount)}</td>
                      <td className="px-3 py-2 text-center text-slate-300">
                        {utility.payment?.paid ? 'Paid' : 'Not Paid'}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-400">
                        {utility.payment?.recorded_by_user_id
                          ? recordedByNames.get(utility.payment.recorded_by_user_id) ||
                            utility.payment.recorded_by_user_id
                          : '-'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            onClick={() => {
                              setEditingUtility(utility)
                              setFormOpen(true)
                            }}
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="border-red-600/50 text-red-400 hover:bg-red-900/20"
                            onClick={() => handleDeleteUtility(utility.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    )
  }

  if (loading) {
    return <div className="text-center text-slate-400">Loading...</div>
  }

  const pairOptions = pairings
    .map((pairing) => {
      const first = unitsById.get(pairing.first_unit_id)
      const second = unitsById.get(pairing.second_unit_id)
      if (!first || !second) return null
      return {
        id: pairing.id,
        label: `${first.label} + ${second.label}`,
      }
    })
    .filter(Boolean) as { id: string; label: string }[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Compute Utilities</h1>
        <Button
          onClick={() => {
            setEditingUtility(null)
            setFormOpen(true)
          }}
          disabled={!selectedPairing}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus size={16} className="mr-2" />
          Add New
        </Button>
      </div>

      <Card className="p-6 border-slate-700 bg-slate-800">
        <h2 className="text-lg font-semibold text-white mb-4">Pair Units for Utility Computation</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Select value={newFirstUnitId} onValueChange={setNewFirstUnitId}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="First unit" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {trackedUnits.map((unit) => (
                <SelectItem key={unit.id} value={unit.id} className="text-white">
                  {unit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={newSecondUnitId} onValueChange={setNewSecondUnitId}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Second unit" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {trackedUnits.map((unit) => (
                <SelectItem key={unit.id} value={unit.id} className="text-white">
                  {unit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleAddPairing} className="bg-blue-600 hover:bg-blue-700 text-white">
            Save Pairing
          </Button>

          <Button
            onClick={handleDeletePairing}
            variant="outline"
            className="border-red-600/50 text-red-400 hover:bg-red-900/20"
            disabled={!selectedPairing}
          >
            Delete Pairing
          </Button>
        </div>
      </Card>

      <Card className="p-6 border-slate-700 bg-slate-800">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label className="text-slate-200">Select Pair</Label>
            <Select value={selectedPairingId} onValueChange={setSelectedPairingId}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                <SelectValue placeholder="Choose a pair" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {pairOptions.map((pair) => (
                  <SelectItem key={pair.id} value={pair.id} className="text-white">
                    {pair.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {selectedPairing ? (
        <>
          {renderTrackerTable('MNWD Tracker', mnwdUtilities, showAllMnwd, setShowAllMnwd)}
          {renderTrackerTable('Casureco Tracker', casurecoUtilities, showAllCasureco, setShowAllCasureco)}

          <Card className="p-6 border-slate-700 bg-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <Label className="text-slate-200">Utility Type</Label>
                <Select
                  value={exportUtilityType}
                  onValueChange={(value: UtilityType) => setExportUtilityType(value)}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
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

              <div>
                <Label className="text-slate-200">Export Format</Label>
                <Select value={exportType} onValueChange={(value: ExportType) => setExportType(value)}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    <SelectItem value="word" className="text-white">
                      Word (.docx)
                    </SelectItem>
                    <SelectItem value="pdf" className="text-white">
                      PDF (.pdf)
                    </SelectItem>
                    <SelectItem value="png" className="text-white">
                      PNG (.png)
                    </SelectItem>
                    <SelectItem value="excel" className="text-white">
                      Excel (.xlsx)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Button
                  onClick={handleGenerateBilling}
                  disabled={exporting}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <Download size={16} className="mr-2" />
                  {exporting ? 'Generating...' : 'Generate Billing'}
                </Button>
                {((exportUtilityType === 'MNWD' ? mnwdUtilities.length : casurecoUtilities.length) < 2) && (
                  <p className="text-xs text-amber-300 mt-2">
                    First entry for this pair/type cannot be exported until a next monthly reading exists.
                  </p>
                )}
              </div>
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-8 border-slate-700 bg-slate-800 text-center">
          <p className="text-slate-400">Create and select a pairing to compute utilities.</p>
        </Card>
      )}

      <AddUtilityDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingUtility(null)
        }}
        onSuccess={handleUtilityFormSuccess}
        pairingId={selectedPairing?.id}
        pairLabel={selectedPairLabel}
        editingUtility={editingUtility}
      />
    </div>
  )
}
