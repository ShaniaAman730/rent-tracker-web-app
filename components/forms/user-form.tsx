'use client'

import { useState } from 'react'
import { createUserWithRole } from '@/lib/api/users'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface UserFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function UserForm({ open, onOpenChange, onSuccess }: UserFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'manager' | 'contributor'>('contributor')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setEmail('')
    setPassword('')
    setFullName('')
    setRole('contributor')
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await createUserWithRole(email, password, fullName, role)
      reset()
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Add New User</DialogTitle>
          <DialogDescription className="text-slate-400">
            Provide email, password, display name and role for the new account.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-slate-200">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="password" className="text-slate-200">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="fullName" className="text-slate-200">
              Display Name
            </Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>

          <div>
            <Label className="text-slate-200">Role</Label>
            <Select value={role} onValueChange={(val) => setRole(val as any)}>
              <SelectTrigger className="w-full bg-slate-700 border-slate-600 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="contributor">Contributor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="p-3 bg-red-900/20 border border-red-700 text-red-200 rounded text-sm">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
