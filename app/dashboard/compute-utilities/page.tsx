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
import {
  exportUtilityTrackerToExcel,
  exportUtilityTrackerToPdf,
  exportUtilityTrackerToWord,
  UtilityTrackerExportRow,
} from '@/lib/export/tracker-exporters'
import { AddUtilityDialog } from '@/components/dialogs/add-utility-dialog'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Download, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type UtilityType = 'MNWD' | 'Casureco'
type ExportType = 'word' | 'pdf' | 'png' | 'excel'
type TrackerExportType = 'word' | 'pdf' | 'excel'

const MONTH_OPTIONS = [
  { value: 0, label: 'January' },
  { value: 1, label: 'February' },
  { value: 2, label: 'March' },
  { value: 3, label: 'April' },
  { value: 4, label: 'May' },
  { value: 5, label: 'June' },
  { value: 6, label: 'July' },
  { value: 7, label: 'August' },
  { value: 8, label: 'September' },
  { value: 9, label: 'October' },
  { value: 10, label: 'November' },
  { value: 11, label: 'December' },
]

function formatMoney(value: number) {
  return `PHP ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function getPairLabel(first: any, second: any) {
  if (!first || !second) return ''
  if (first.propertyCode === second.propertyCode) {
    return `${first.propertyCode} ${first.name} (First Floor) + ${second.name} (Second Floor)`
  }
  return `${first.propertyCode} ${first.name} (First Floor) + ${second.propertyCode} ${second.name} (Second Floor)`
}

export default function ComputeUtilitiesPage() {
  const [properties, setProperties] = useState<any[]>([])
  const [pairings, setPairings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pairUtilitiesLoading, setPairUtilitiesLoading] = useState(false)
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
  const [trackerDate, setTrackerDate] = useState(new Date())
  const [viewingComputation, setViewingComputation] = useState<any>(null)
  const [exportingUtilityId, setExportingUtilityId] = useState<string | null>(null)
  const [trackerExportOpen, setTrackerExportOpen] = useState(false)
  const [trackerExportUtilityType, setTrackerExportUtilityType] = useState<UtilityType>('MNWD')
  const [trackerExportFormat, setTrackerExportFormat] = useState<TrackerExportType>('pdf')
  const [trackerExportStartDate, setTrackerExportStartDate] = useState('')
  const [trackerExportEndDate, setTrackerExportEndDate] = useState('')
  const [exportingTracker, setExportingTracker] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!selectedPairingId) return
    loadUtilitiesForSelectedPairing(selectedPairingId)
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
            propertyCode: property.code,
            propertyName: property.name,
            label: `${property.code} - ${unit.name}`,
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
    return getPairLabel(selectedPairUnits[0], selectedPairUnits[1])
  }, [selectedPairUnits])

  async function loadUtilitiesForSelectedPairing(pairingId: string) {
    if (!pairingId) return
    try {
      setPairUtilitiesLoading(true)
      const utilities = await getUtilitiesWithPaymentsForPairings([pairingId])

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
    } finally {
      setPairUtilitiesLoading(false)
    }
  }

  const getPreviousReading = (utility: any, list: any[]) => {
    return [...list]
      .filter(
        (candidate) =>
          candidate.id !== utility.id &&
          new Date(candidate.date_of_reading).getTime() < new Date(utility.date_of_reading).getTime()
      )
      .sort(
        (a, b) => new Date(b.date_of_reading).getTime() - new Date(a.date_of_reading).getTime()
      )[0]
  }

  const getUsage = (previousUnitReading: number, currentUnitReading: number) =>
    previousUnitReading - currentUnitReading

  const trackerMonth = trackerDate.getMonth()
  const trackerYear = trackerDate.getFullYear()

  const previousMonth = () => setTrackerDate(new Date(trackerYear, trackerMonth - 1, 1))
  const nextMonth = () => setTrackerDate(new Date(trackerYear, trackerMonth + 1, 1))

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
      if (selectedPairingId) {
        await loadUtilitiesForSelectedPairing(selectedPairingId)
      }
    } catch (error) {
      console.error('Error deleting utility record:', error)
      alert('Unable to delete utility record.')
    }
  }

  async function handleGenerateBillingForUtility(
    utility: any,
    list: any[],
    exportType: ExportType
  ) {
    if (!currentUser) return

    const previous = getPreviousReading(utility, list)
    if (!previous) {
      alert('No previous reading reference found for this record.')
      return
    }

    const selectedPair = pairings.find((pair) => pair.id === utility.pairing_id)
    const firstUnit = selectedPair ? unitsById.get(selectedPair.first_unit_id) : null
    const secondUnit = selectedPair ? unitsById.get(selectedPair.second_unit_id) : null
    const pairLabel =
      firstUnit && secondUnit
        ? getPairLabel(firstUnit, secondUnit)
        : selectedPairLabel

    const billingData = calculateBillingData(previous, utility, pairLabel, currentUser.full_name)
    const fileBase = `${pairLabel}-${utility.type}-${new Date(utility.date_of_reading)
      .toISOString()
      .slice(0, 10)}`

    try {
      setExportingUtilityId(utility.id)
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
      setExportingUtilityId(null)
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
    if (selectedPairingId) {
      await loadUtilitiesForSelectedPairing(selectedPairingId)
    }
  }

  function openTrackerExport(type: UtilityType, format: TrackerExportType) {
    const start = new Date(trackerYear, trackerMonth, 1).toISOString().slice(0, 10)
    const end = new Date(trackerYear, trackerMonth + 1, 0).toISOString().slice(0, 10)
    setTrackerExportUtilityType(type)
    setTrackerExportFormat(format)
    setTrackerExportStartDate(start)
    setTrackerExportEndDate(end)
    setTrackerExportOpen(true)
  }

  async function handleExportTracker() {
    if (!selectedPairLabel) {
      alert('Please select a pair first.')
      return
    }
    if (!trackerExportStartDate || !trackerExportEndDate) {
      alert('Please select a valid date range.')
      return
    }

    const list = trackerExportUtilityType === 'MNWD' ? mnwdUtilities : casurecoUtilities
    const start = new Date(trackerExportStartDate)
    const end = new Date(trackerExportEndDate)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      alert('Invalid timeline. Please check start and end dates.')
      return
    }

    const filtered = [...list]
      .filter((utility) => {
        const readingDate = new Date(utility.date_of_reading)
        return readingDate >= start && readingDate <= end
      })
      .sort(
        (a, b) => new Date(a.date_of_reading).getTime() - new Date(b.date_of_reading).getTime()
      )

    if (filtered.length === 0) {
      alert('No records found for the selected timeline.')
      return
    }

    const rows: UtilityTrackerExportRow[] = filtered.map((utility) => {
      const previous = getPreviousReading(utility, list)
      const previousUnitReading = previous ? Number(previous.unit_reading) : null
      const currentUnitReading = Number(utility.unit_reading)
      const usage =
        previousUnitReading === null ? null : getUsage(previousUnitReading, currentUnitReading)

      return {
        dueDate: utility.due_date,
        previousDateOfReading: previous?.date_of_reading || '',
        previousUnitReading,
        currentDateOfReading: utility.date_of_reading,
        currentUnitReading,
        usage,
        amount: Number(utility.amount),
      }
    })

    const safePairLabel = selectedPairLabel.replace(/[\\/:*?"<>|]/g, '-')
    const fileBase = `${safePairLabel}-${trackerExportUtilityType}-${trackerExportStartDate}-to-${trackerExportEndDate}`

    try {
      setExportingTracker(true)
      if (trackerExportFormat === 'word') {
        await exportUtilityTrackerToWord(
          selectedPairLabel,
          trackerExportUtilityType,
          rows,
          `${fileBase}.docx`
        )
      } else if (trackerExportFormat === 'pdf') {
        exportUtilityTrackerToPdf(
          selectedPairLabel,
          trackerExportUtilityType,
          rows,
          `${fileBase}.pdf`
        )
      } else {
        exportUtilityTrackerToExcel(
          selectedPairLabel,
          trackerExportUtilityType,
          rows,
          `${fileBase}.xlsx`
        )
      }
      setTrackerExportOpen(false)
    } catch (error) {
      console.error('Error exporting tracker:', error)
      alert('Unable to export tracker.')
    } finally {
      setExportingTracker(false)
    }
  }

  const renderTrackerTable = (
    title: string,
    utilityType: UtilityType,
    list: any[],
    showAll: boolean,
    onToggle: (value: boolean) => void
  ) => {
    const monthRows = list.filter((utility) => {
      const d = new Date(utility.date_of_reading)
      return d.getMonth() === trackerMonth && d.getFullYear() === trackerYear
    })
    const rows = showAll ? monthRows : monthRows.slice(0, 7)

    return (
      <Card className="p-6 border-slate-700 bg-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Download size={14} className="mr-1" />
                  Export Tracker
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-slate-700 border-slate-600 text-white">
                <DropdownMenuItem onClick={() => openTrackerExport(utilityType, 'word')}>
                  Word (.docx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openTrackerExport(utilityType, 'pdf')}>
                  PDF (.pdf)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openTrackerExport(utilityType, 'excel')}>
                  Excel (.xlsx)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              onClick={() => onToggle(!showAll)}
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              {showAll ? 'Show Last 7' : 'See More'}
            </Button>
          </div>
        </div>

        {pairUtilitiesLoading ? (
          <div className="flex items-center gap-2 text-slate-300">
            <Spinner className="size-4" />
            Loading readings...
          </div>
        ) : rows.length === 0 ? (
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
                  const previousUnitReading = previous ? Number(previous.unit_reading) : null
                  const currentUnitReading = Number(utility.unit_reading)
                  const usage =
                    previousUnitReading === null
                      ? null
                      : getUsage(previousUnitReading, currentUnitReading)
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
                        {previousUnitReading !== null ? previousUnitReading.toFixed(2) : '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        {new Date(utility.date_of_reading).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-300">
                        {currentUnitReading.toFixed(2)}
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
                            size="sm"
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            onClick={() => setViewingComputation({ utility, previous, pairLabel: selectedPairLabel })}
                          >
                            View
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                disabled={exportingUtilityId === utility.id}
                              >
                                <Download size={14} className="mr-1" />
                                {exportingUtilityId === utility.id ? 'Exporting...' : 'Export'}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="bg-slate-700 border-slate-600 text-white">
                              <DropdownMenuItem onClick={() => handleGenerateBillingForUtility(utility, list, 'word')}>
                                Word (.docx)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleGenerateBillingForUtility(utility, list, 'pdf')}>
                                PDF (.pdf)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleGenerateBillingForUtility(utility, list, 'png')}>
                                PNG (.png)
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleGenerateBillingForUtility(utility, list, 'excel')}>
                                Excel (.xlsx)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
        label: getPairLabel(first, second),
      }
    })
    .filter(Boolean) as { id: string; label: string }[]

  const viewingBillingData =
    viewingComputation?.previous && currentUser
      ? calculateBillingData(
          viewingComputation.previous,
          viewingComputation.utility,
          viewingComputation.pairLabel || selectedPairLabel,
          currentUser.full_name
        )
      : null

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
          <Card className="p-4 border-slate-700 bg-slate-800">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Label className="text-slate-200 mr-2">Tracker Month/Year</Label>
              <Button
                onClick={previousMonth}
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="text-base sm:text-lg font-semibold text-white min-w-40 text-center">
                {trackerDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </span>
              <Button
                onClick={nextMonth}
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <ChevronRight size={16} />
              </Button>
              <Select
                value={String(trackerMonth)}
                onValueChange={(month) => setTrackerDate(new Date(trackerYear, Number(month), 1))}
              >
                <SelectTrigger className="w-36 bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {MONTH_OPTIONS.map((month) => (
                    <SelectItem key={month.value} value={String(month.value)} className="text-white">
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={trackerYear}
                onChange={(e) =>
                  setTrackerDate(new Date(Number(e.target.value) || trackerYear, trackerMonth, 1))
                }
                className="w-24 bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </Card>

          {renderTrackerTable('MNWD Tracker', 'MNWD', mnwdUtilities, showAllMnwd, setShowAllMnwd)}
          {renderTrackerTable(
            'Casureco Tracker',
            'Casureco',
            casurecoUtilities,
            showAllCasureco,
            setShowAllCasureco
          )}
        </>
      ) : (
        <Card className="p-8 border-slate-700 bg-slate-800 text-center">
          <p className="text-slate-400">Create and select a pairing to compute utilities.</p>
        </Card>
      )}

      <Dialog open={Boolean(viewingComputation)} onOpenChange={() => setViewingComputation(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-white">Utility Computation Preview</DialogTitle>
            <DialogDescription className="text-slate-400">
              {viewingComputation?.utility?.type} -{' '}
              {viewingComputation?.utility?.date_of_reading
                ? new Date(viewingComputation.utility.date_of_reading).toLocaleDateString()
                : ''}
            </DialogDescription>
          </DialogHeader>
          {!viewingBillingData ? (
            <p className="text-slate-300 text-sm">
              This is the first reading for this pair and utility type. A previous reference is required to compute billing.
            </p>
          ) : (
            <div className="rounded border border-slate-600 bg-white text-slate-900 p-4 space-y-4">
              <h3 className="text-center font-semibold">
                {viewingBillingData.unitName} ({viewingBillingData.type}) - {new Date(viewingBillingData.currentDate).toLocaleDateString()}
              </h3>
              <table className="w-full text-sm border border-slate-900 border-collapse">
                <thead>
                  <tr>
                    <th className="border border-slate-900 px-2 py-1 text-left">Location</th>
                    <th className="border border-slate-900 px-2 py-1 text-right">Current</th>
                    <th className="border border-slate-900 px-2 py-1 text-right">Previous</th>
                    <th className="border border-slate-900 px-2 py-1 text-right">Consumption</th>
                    <th className="border border-slate-900 px-2 py-1 text-right">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-900 px-2 py-1">First Floor</td>
                    <td className="border border-slate-900 px-2 py-1 text-right">{viewingBillingData.currentFirstFloor.toFixed(2)}</td>
                    <td className="border border-slate-900 px-2 py-1 text-right">{viewingBillingData.previousFirstFloor.toFixed(2)}</td>
                    <td className="border border-slate-900 px-2 py-1 text-right">{viewingBillingData.firstFloorUsage.toFixed(2)}</td>
                    <td className="border border-slate-900 px-2 py-1 text-right">{viewingBillingData.firstFloorPercentage.toFixed(2)}%</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-900 px-2 py-1">Second Floor</td>
                    <td className="border border-slate-900 px-2 py-1 text-right">{viewingBillingData.currentSecondFloor.toFixed(2)}</td>
                    <td className="border border-slate-900 px-2 py-1 text-right">{viewingBillingData.previousSecondFloor.toFixed(2)}</td>
                    <td className="border border-slate-900 px-2 py-1 text-right">{viewingBillingData.secondFloorUsage.toFixed(2)}</td>
                    <td className="border border-slate-900 px-2 py-1 text-right">{viewingBillingData.secondFloorPercentage.toFixed(2)}%</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-900 px-2 py-1 font-semibold">TOTAL</td>
                    <td className="border border-slate-900 px-2 py-1" />
                    <td className="border border-slate-900 px-2 py-1" />
                    <td className="border border-slate-900 px-2 py-1 text-right font-semibold">{viewingBillingData.totalUsage.toFixed(2)}</td>
                    <td className="border border-slate-900 px-2 py-1 text-right font-semibold">100%</td>
                  </tr>
                </tbody>
              </table>
              <table className="w-full text-sm border border-slate-900 border-collapse">
                <thead>
                  <tr>
                    <th className="border border-slate-900 px-2 py-1 text-left">Location</th>
                    <th className="border border-slate-900 px-2 py-1 text-right">Total Amount</th>
                    <th className="border border-slate-900 px-2 py-1 text-right">Percentage</th>
                    <th className="border border-slate-900 px-2 py-1 text-right">Amount per Location</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-900 px-2 py-1">First Floor</td>
                    <td className="border border-slate-900 px-2 py-1 text-right">{viewingBillingData.amount.toFixed(2)}</td>
                    <td className="border border-slate-900 px-2 py-1 text-right">{viewingBillingData.firstFloorPercentage.toFixed(2)}%</td>
                    <td className="border border-slate-900 px-2 py-1 text-right">{viewingBillingData.firstFloorAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-900 px-2 py-1">Second Floor</td>
                    <td className="border border-slate-900 px-2 py-1 text-right">{viewingBillingData.amount.toFixed(2)}</td>
                    <td className="border border-slate-900 px-2 py-1 text-right">{viewingBillingData.secondFloorPercentage.toFixed(2)}%</td>
                    <td className="border border-slate-900 px-2 py-1 text-right">{viewingBillingData.secondFloorAmount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-900 px-2 py-1 font-semibold">TOTAL</td>
                    <td className="border border-slate-900 px-2 py-1" />
                    <td className="border border-slate-900 px-2 py-1" />
                    <td className="border border-slate-900 px-2 py-1 text-right font-semibold">{viewingBillingData.amount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={trackerExportOpen} onOpenChange={setTrackerExportOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Export {trackerExportUtilityType} Tracker</DialogTitle>
            <DialogDescription className="text-slate-400">
              Set timeline and export format for {selectedPairLabel}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-200">Format</Label>
              <Select
                value={trackerExportFormat}
                onValueChange={(value) => setTrackerExportFormat(value as TrackerExportType)}
              >
                <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="word" className="text-white">
                    Word (.docx)
                  </SelectItem>
                  <SelectItem value="pdf" className="text-white">
                    PDF (.pdf)
                  </SelectItem>
                  <SelectItem value="excel" className="text-white">
                    Excel (.xlsx)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tracker_export_start" className="text-slate-200">
                  Start Date
                </Label>
                <Input
                  id="tracker_export_start"
                  type="date"
                  value={trackerExportStartDate}
                  onChange={(event) => setTrackerExportStartDate(event.target.value)}
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="tracker_export_end" className="text-slate-200">
                  End Date
                </Label>
                <Input
                  id="tracker_export_end"
                  type="date"
                  value={trackerExportEndDate}
                  onChange={(event) => setTrackerExportEndDate(event.target.value)}
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setTrackerExportOpen(false)}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                disabled={exportingTracker}
              >
                Cancel
              </Button>
              <Button
                onClick={handleExportTracker}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={exportingTracker}
              >
                {exportingTracker ? 'Exporting...' : 'Export'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
