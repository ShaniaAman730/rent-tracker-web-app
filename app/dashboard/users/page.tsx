'use client'

import { useEffect, useState } from 'react'
import { getAllUsers, getCurrentUser, updateUserRole, deleteUser } from '@/lib/api/users'
import { User } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { UserForm } from '@/components/forms/user-form'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [editRoleId, setEditRoleId] = useState<string | null>(null)
  const [newRole, setNewRole] = useState<'manager' | 'contributor'>('contributor')

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const [user, list] = await Promise.all([getCurrentUser(), getAllUsers()])
      setCurrentUser(user)
      setUsers(list)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (id: string, role: 'manager' | 'contributor') => {
    try {
      await updateUserRole(id, role)
      await loadUsers()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return
    try {
      await deleteUser(id)
      await loadUsers()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return <div className="text-center text-slate-400">Loading...</div>
  }

  if (currentUser?.role !== 'manager') {
    return <div className="text-center text-red-400">Only managers can view this page.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Manage Users</h1>
        <Button onClick={() => setFormOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
          Add User
        </Button>
      </div>

      {users.length === 0 ? (
        <p className="text-slate-400">No users created yet.</p>
      ) : (
        <div className="space-y-4">
          {users.map((u) => (
            <div key={u.id} className="p-4 bg-slate-800 border border-slate-700 rounded flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-white font-semibold">{u.full_name || u.email}</p>
                <p className="text-sm text-slate-400">{u.email}</p>
              </div>
              <div className="flex items-center gap-2 mt-2 sm:mt-0">
                <span className="text-sm text-slate-400">Role: </span>
                {editRoleId === u.id ? (
                  <Select value={newRole} onValueChange={(v) => setNewRole(v as any)}>
                    <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="contributor">Contributor</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-white">{u.role}</span>
                )}
                {editRoleId === u.id ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => {
                        handleRoleChange(u.id, newRole)
                        setEditRoleId(null)
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditRoleId(null)}
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditRoleId(u.id)
                        setNewRole(u.role)
                      }}
                      variant="outline"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                    >
                      Change
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-600/50 text-red-400 hover:bg-red-900/20"
                      onClick={() => handleDelete(u.id)}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <UserForm open={formOpen} onOpenChange={setFormOpen} onSuccess={loadUsers} />
    </div>
  )
}
