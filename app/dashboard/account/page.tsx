'use client'

import { useEffect, useState } from 'react'
import {
  getCurrentUser,
  updateCurrentUserEmail,
  updateCurrentUserPassword,
  updateCurrentUserProfile,
} from '@/lib/api/users'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function AccountPage() {
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    loadUser()
  }, [])

  async function loadUser() {
    try {
      setLoading(true)
      setError(null)
      const user = await getCurrentUser()
      if (!user) return
      setDisplayName(user.full_name || '')
      setPhoneNumber(user.phone_number || '')
      setEmail(user.email || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setError(null)
    setSavingProfile(true)
    try {
      await updateCurrentUserProfile(displayName.trim(), phoneNumber.trim() || null)
      setMessage('Profile updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleSaveEmail(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setError(null)
    setSavingEmail(true)
    try {
      await updateCurrentUserEmail(email.trim())
      setMessage('Email update requested. Check your inbox for confirmation if required.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update email')
    } finally {
      setSavingEmail(false)
    }
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Password confirmation does not match.')
      return
    }

    setSavingPassword(true)
    try {
      await updateCurrentUserPassword(password)
      setPassword('')
      setConfirmPassword('')
      setMessage('Password updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return <div className="text-center text-slate-400">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Account Settings</h1>

      {message && (
        <div className="p-3 bg-emerald-900/20 border border-emerald-700 text-emerald-200 rounded text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-700 text-red-200 rounded text-sm">
          {error}
        </div>
      )}

      <Card className="p-6 border-slate-700 bg-slate-800">
        <h2 className="text-lg font-semibold text-white mb-4">Profile</h2>
        <form className="space-y-4" onSubmit={handleSaveProfile}>
          <div>
            <Label htmlFor="display_name" className="text-slate-200">
              Display Name
            </Label>
            <Input
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>

          <div>
            <Label htmlFor="phone_number" className="text-slate-200">
              Phone Number
            </Label>
            <Input
              id="phone_number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
              placeholder="Optional"
            />
          </div>

          <Button
            type="submit"
            disabled={savingProfile}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </Button>
        </form>
      </Card>

      <Card className="p-6 border-slate-700 bg-slate-800">
        <h2 className="text-lg font-semibold text-white mb-4">Email</h2>
        <form className="space-y-4" onSubmit={handleSaveEmail}>
          <div>
            <Label htmlFor="email" className="text-slate-200">
              Email Address
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
          <Button
            type="submit"
            disabled={savingEmail}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {savingEmail ? 'Saving...' : 'Update Email'}
          </Button>
        </form>
      </Card>

      <Card className="p-6 border-slate-700 bg-slate-800">
        <h2 className="text-lg font-semibold text-white mb-4">Password</h2>
        <form className="space-y-4" onSubmit={handleSavePassword}>
          <div>
            <Label htmlFor="password" className="text-slate-200">
              New Password
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
            <Label htmlFor="confirm_password" className="text-slate-200">
              Confirm Password
            </Label>
            <Input
              id="confirm_password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={savingPassword}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {savingPassword ? 'Saving...' : 'Update Password'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
