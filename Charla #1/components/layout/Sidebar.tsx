'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
    LayoutDashboard,
    Users,
    Calendar,
    FileText,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Shield,
    Activity,
    Database
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
    children: React.ReactNode
}

const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: Calendar, label: 'Citas', href: '/dashboard/citas' },
    { icon: Activity, label: 'Doctores', href: '/dashboard/doctores' },
    { icon: Activity, label: 'Analytics', href: '/dashboard/analytics' },
    { icon: Users, label: 'Pacientes', href: '/dashboard/pacientes' },
    { icon: Database, label: 'Importar ETL', href: '/dashboard/import' },
    { icon: Settings, label: 'Configuración', href: '/dashboard/settings' },
]

export function Sidebar({ children }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false)
    const pathname = usePathname()
    const router = useRouter()

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' })
        router.push('/login')
        router.refresh()
    }

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Barra lateral */}
            <aside className={cn(
                "bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 flex flex-col",
                collapsed ? "w-20" : "w-64"
            )}>
                {/* Logo */}
                <div className="p-4 border-b border-slate-700">
                    <Link href="/dashboard" className="flex items-center gap-3">
                        <div className="relative w-10 h-10 flex-shrink-0">
                            <Image src="/logo-transparent.png" alt="Logo" fill className="object-contain" />
                        </div>
                        {!collapsed && (
                            <div>
                                <h1 className="font-bold text-lg">MedComLabs</h1>
                                <p className="text-xs text-slate-400">Sistema Hospitalario</p>
                            </div>
                        )}
                    </Link>
                </div>

                {/* Navegación */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                                    isActive
                                        ? "bg-teal-600 text-white shadow-lg shadow-teal-600/50"
                                        : "text-slate-300 hover:bg-slate-700 hover:text-white"
                                )}
                            >
                                <item.icon className="w-5 h-5 flex-shrink-0" />
                                {!collapsed && <span className="font-medium">{item.label}</span>}
                            </Link>
                        )
                    })}
                </nav>

                {/* Insignia de seguridad */}
                {!collapsed && (
                    <div className="p-4 m-4 bg-teal-900/30 border border-teal-700/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-4 h-4 text-teal-400" />
                            <span className="text-xs font-semibold text-teal-300">Protección Activa</span>
                        </div>
                        <p className="text-xs text-slate-400">
                            Cifrado AES-256-GCM
                        </p>
                    </div>
                )}

                {/* Footer */}
                <div className="p-4 border-t border-slate-700 space-y-2">
                    <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className={cn(
                            "w-full justify-start text-slate-300 hover:bg-slate-700 hover:text-white",
                            collapsed && "justify-center"
                        )}
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="ml-3">Cerrar Sesión</span>}
                    </Button>

                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="w-full flex items-center justify-center py-2 text-slate-400 hover:text-white transition-colors"
                    >
                        {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                    </button>
                </div>
            </aside>

            {/* Contenido principal */}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    )
}
