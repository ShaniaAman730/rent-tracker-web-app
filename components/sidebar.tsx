'use client'

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
  UserRound,
  LogOut,
  UserCog,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { User } from '@supabase/supabase-js'

interface SidebarProps {
  user: User | null
  collapsed: boolean
  mobileOpen: boolean
  onToggleCollapse: () => void
  onCloseMobile: () => void
}

export function Sidebar({
  user,
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
}: SidebarProps) {
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
    { label: 'Landlord', icon: UserRound, path: '/dashboard/landlords' },
    { label: 'Account', icon: UserCog, path: '/dashboard/account' },
  ]

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onCloseMobile}
          aria-label="Close sidebar overlay"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-slate-700 bg-slate-800 transition-all duration-200 lg:sticky lg:translate-x-0 ${
          collapsed ? 'w-20' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between border-b border-slate-700 p-4">
          <h2 className="text-xl font-bold text-white">{collapsed ? 'RT' : 'Rent Tracker'}</h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={onToggleCollapse}
              variant="ghost"
              size="icon"
              className="hidden text-slate-300 hover:bg-slate-700 hover:text-white lg:inline-flex"
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </Button>
            <Button
              onClick={onCloseMobile}
              variant="ghost"
              size="icon"
              className="text-slate-300 hover:bg-slate-700 hover:text-white lg:hidden"
            >
              <X size={16} />
            </Button>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto p-3">
          {menuItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={onCloseMobile}
                className={`flex items-center rounded-lg px-3 py-2 transition-colors ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                } ${collapsed ? 'justify-center' : 'gap-3'}`}
                title={item.label}
              >
                <Icon size={20} />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="space-y-3 border-t border-slate-700 p-3">
          <div className="rounded-lg bg-slate-700 px-3 py-2">
            {!collapsed && (
              <>
                <p className="text-xs text-slate-400">Signed in as</p>
                <p className="truncate text-sm font-medium text-white">
                  {user?.user_metadata?.full_name || user?.email}
                </p>
              </>
            )}
            {collapsed && <p className="truncate text-xs text-white">{user?.email}</p>}
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className={`border-slate-600 text-slate-300 hover:bg-slate-700 ${collapsed ? 'w-10 px-0' : 'w-full'}`}
            title="Logout"
          >
            <LogOut size={16} className={collapsed ? '' : 'mr-2'} />
            {!collapsed && 'Logout'}
          </Button>
        </div>
      </aside>
    </>
  )
}
