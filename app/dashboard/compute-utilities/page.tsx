'use client'

import { useEffect, useState } from 'react'
import { getPropertiesWithUnits } from '@/lib/api/properties'
import { getUtilitiesWithPayments } from '@/lib/api/utilities'
import { getUnitById } from '@/lib/api/units'
import { getCurrentUser } from '@/lib/api/users'
import { calculateBillingData, getReadingPair } from '@/lib/billing-helpers'
import { generateBillingDocument } from '@/lib/export/billing-document'
import { AddUtilityDialog } from '@/components/dialogs/add-utility-dialog'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Download } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function ComputeUtilitiesPage() {
  const [properties, setProperties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUnit, setSelectedUnit] = useState<string>('')
  const [formOpen, setFormOpen] = useState(false)
  const [mnwdUtilities, setMnwdUtilities] = useState<any[]>([])
  const [casurecoUtilities, setCasurecoUtilities] = useState<any[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedUnit) {
      loadUtilitiesForUnit(selectedUnit)
    }
  }, [selectedUnit])

  async function loadData() {
    try {
      setLoading(true)
      const user = await getCurrentUser()
      setCurrentUser(user)

      const props = await getPropertiesWithUnits()
      setProperties(props)

      // Set first unit with utilities as default
      for (const prop of props) {
        for (const unit of prop.units) {
          if (unit.track_utilities) {
            setSelectedUnit(unit.id)
            return
          }
        }
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadUtilitiesForUnit(unitId: string) {
    try {
      const utilities = await getUtilitiesWithPayments(unitId)

      const mnwd = utilities
        .filter((u) => u.type === 'MNWD')
        .slice(0, 7)
      const casureco = utilities
        .filter((u) => u.type === 'Casureco')
        .slice(0, 7)

      setMnwdUtilities(mnwd)
      setCasurecoUtilities(casureco)
    } catch (error) {
      console.error('Error loading utilities:', error)
    }
  }

  const handleGenerateBilling = async (utility: any) => {
    if (!currentUser) return

    try {
      setExporting(true)

      // Get previous utility
      const utilities = [...mnwdUtilities, ...casurecoUtilities]
        .filter((u) => u.type === utility.type)
        .sort(
          (a, b) =>
            new Date(b.date_of_reading).getTime() - new Date(a.date_of_reading).getTime()
        )

      const currentIndex = utilities.findIndex((u) => u.id === utility.id)
      if (currentIndex === -1 || currentIndex === utilities.length - 1) {
        alert('Previous reading not found')
        return
      }

      const previous = utilities[currentIndex + 1]
      const unit = await getUnitById(selectedUnit)

      if (!unit) return

      const billingData = calculateBillingData(previous, utility, unit.name, currentUser.full_name)

      const buffer = await generateBillingDocument(billingData)

      // Download the file
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${unit.name}-${utility.type}-${new Date().getTime()}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error generating billing:', error)
      alert('Error generating billing document')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return <div className="text-center text-slate-400">Loading...</div>
  }

  const allUnits = properties
    .flatMap((prop) =>
      prop.units
        .filter((u: any) => u.track_utilities)
        .map((u: any) => ({ ...u, propertyName: prop.name }))
    )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Compute Utilities</h1>
        <Button
          onClick={() => setFormOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus size={16} className="mr-2" />
          Add New Reading
        </Button>
      </div>

      <Card className="p-6 border-slate-700 bg-slate-800">
        <div className="space-y-2">
          <label className="text-slate-200">Select Unit</label>
          <Select value={selectedUnit} onValueChange={setSelectedUnit}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {allUnits.map((unit) => (
                <SelectItem key={unit.id} value={unit.id} className="text-white">
                  {unit.propertyName} - {unit.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {selectedUnit && (
        <>
          {/* MNWD Table */}
          <Card className="p-6 border-slate-700 bg-slate-800">
            <h2 className="text-xl font-semibold text-white mb-4">MNWD (Water)</h2>
            {mnwdUtilities.length === 0 ? (
              <p className="text-slate-400">No MNWD readings found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-600">
                      <th className="px-4 py-2 text-left text-slate-300">Unit Name</th>
                      <th className="px-4 py-2 text-left text-slate-300">Due Date</th>
                      <th className="px-4 py-2 text-right text-slate-300">Previous Reading</th>
                      <th className="px-4 py-2 text-right text-slate-300">Current Reading</th>
                      <th className="px-4 py-2 text-right text-slate-300">Usage</th>
                      <th className="px-4 py-2 text-right text-slate-300">Amount</th>
                      <th className="px-4 py-2 text-center text-slate-300">Status</th>
                      <th className="px-4 py-2 text-left text-slate-300">Recorded By</th>
                      <th className="px-4 py-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mnwdUtilities.map((utility) => {
                      const previous = mnwdUtilities[mnwdUtilities.indexOf(utility) + 1]
                      return (
                        <tr key={utility.id} className="border-b border-slate-700 hover:bg-slate-700">
                          <td className="px-4 py-2 text-white">-</td>
                          <td className="px-4 py-2 text-slate-300">
                            {new Date(utility.due_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-300">
                            {previous ? previous.unit_reading.toFixed(2) : '-'}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-300">
                            {utility.unit_reading.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-300">
                            {previous
                              ? (utility.unit_reading - previous.unit_reading).toFixed(2)
                              : '-'}
                          </td>
                          <td className="px-4 py-2 text-right text-white">
                            ₱{utility.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <div
                              className={`w-2 h-2 rounded-full mx-auto ${
                                utility.payment?.paid ? 'bg-green-500' : 'bg-red-500'
                              }`}
                            />
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-400">
                            {utility.payment?.recorded_by_user_id || '-'}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <Button
                              onClick={() => handleGenerateBilling(utility)}
                              disabled={exporting || !previous}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white text-xs"
                            >
                              <Download size={12} className="mr-1" />
                              Bill
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Casureco Table */}
          <Card className="p-6 border-slate-700 bg-slate-800">
            <h2 className="text-xl font-semibold text-white mb-4">Casureco (Electricity)</h2>
            {casurecoUtilities.length === 0 ? (
              <p className="text-slate-400">No Casureco readings found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-600">
                      <th className="px-4 py-2 text-left text-slate-300">Unit Name</th>
                      <th className="px-4 py-2 text-left text-slate-300">Due Date</th>
                      <th className="px-4 py-2 text-right text-slate-300">Previous Reading</th>
                      <th className="px-4 py-2 text-right text-slate-300">Current Reading</th>
                      <th className="px-4 py-2 text-right text-slate-300">Usage</th>
                      <th className="px-4 py-2 text-right text-slate-300">Amount</th>
                      <th className="px-4 py-2 text-center text-slate-300">Status</th>
                      <th className="px-4 py-2 text-left text-slate-300">Recorded By</th>
                      <th className="px-4 py-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {casurecoUtilities.map((utility) => {
                      const previous = casurecoUtilities[casurecoUtilities.indexOf(utility) + 1]
                      return (
                        <tr key={utility.id} className="border-b border-slate-700 hover:bg-slate-700">
                          <td className="px-4 py-2 text-white">-</td>
                          <td className="px-4 py-2 text-slate-300">
                            {new Date(utility.due_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-300">
                            {previous ? previous.unit_reading.toFixed(2) : '-'}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-300">
                            {utility.unit_reading.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-300">
                            {previous
                              ? (utility.unit_reading - previous.unit_reading).toFixed(2)
                              : '-'}
                          </td>
                          <td className="px-4 py-2 text-right text-white">
                            ₱{utility.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <div
                              className={`w-2 h-2 rounded-full mx-auto ${
                                utility.payment?.paid ? 'bg-green-500' : 'bg-red-500'
                              }`}
                            />
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-400">
                            {utility.payment?.recorded_by_user_id || '-'}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <Button
                              onClick={() => handleGenerateBilling(utility)}
                              disabled={exporting || !previous}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white text-xs"
                            >
                              <Download size={12} className="mr-1" />
                              Bill
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      <AddUtilityDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={() => {
          setFormOpen(false)
          if (selectedUnit) loadUtilitiesForUnit(selectedUnit)
        }}
        unitId={selectedUnit}
      />
    </div>
  )
}
