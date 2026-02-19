'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  Building2,
  Users,
  Zap,
  Calculator,
  FileText,
  LogOut,
  UserCog,
} from 'lucide-react'
import { User } from '@supabase/supabase-js'

interface SidebarProps {
  user: User | null
}

export function Sidebar({ user }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  const menuItems = [
    { label: 'Rent Tracker', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Utilities Tracker', icon: Zap, path: '/dashboard/utilities' },
    { label: 'Compute Utilities', icon: Calculator, path: '/dashboard/compute-utilities' },
    { label: 'Properties', icon: Building2, path: '/dashboard/properties' },
    { label: 'Tenants', icon: Users, path: '/dashboard/tenants' },
    { label: 'Contracts', icon: FileText, path: '/dashboard/contract-monitoring' },
    { label: 'Account', icon: UserCog, path: '/dashboard/account' },
  ]

  return (
    <aside className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col h-screen">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <h2 className="text-xl font-bold text-white">RT</h2>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-slate-700 space-y-3">
        <div className="px-4 py-3 bg-slate-700 rounded-lg">
          <p className="text-xs text-slate-400">Signed in as</p>
          <p className="text-sm font-medium text-white truncate">
            {user?.user_metadata?.full_name || user?.email}
          </p>
        </div>
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full text-slate-300 border-slate-600 hover:bg-slate-700"
        >
          <LogOut size={16} className="mr-2" />
          Logout
        </Button>
      </div>
    </aside>
  )
}
