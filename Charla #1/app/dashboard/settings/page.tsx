'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Save, Shield, Bell, User, Activity, Lock, Eye, Globe, Monitor, RefreshCw, Loader2, Key, Search, Users, AlertTriangle, Check, Copy, Wand2, CheckCircle2 } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiClient } from '@/lib/api-client'

interface SecurityLog {
    id: string
    event_type: string
    event_description: string
    user_email: string | null
    user_role: string | null
    ip_address: string | null
    user_agent: string | null
    severity: string
    created_at: string
    metadata: Record<string, any>
}

interface UserAccount {
    id: string
    email: string
    name: string
    role: string
    status: string
    created_at: string
}

// Generar contraseña segura
function generateSecurePassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?'
    const allChars = uppercase + lowercase + numbers + special
    
    let password = ''
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += special[Math.floor(Math.random() * special.length)]
    
    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)]
    }
    
    return password.split('').sort(() => Math.random() - 0.5).join('')
}

export default function SettingsPage() {
    const [showLogs, setShowLogs] = useState(false)
    const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([])
    const [loading, setLoading] = useState(false)
    
    // Estado de restablecimiento de contraseña
    const [showPasswordReset, setShowPasswordReset] = useState(false)
    const [searchEmail, setSearchEmail] = useState('')
    const [searchResults, setSearchResults] = useState<UserAccount[]>([])
    const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null)
    const [newPassword, setNewPassword] = useState('')
    const [resetLoading, setResetLoading] = useState(false)
    const [resetSuccess, setResetSuccess] = useState(false)
    const [resetError, setResetError] = useState('')
    const [copiedPassword, setCopiedPassword] = useState(false)

    // Obtener registros de seguridad de la API
    const loadSecurityLogs = async () => {
        setLoading(true)
        try {
            const response = await apiClient('/api/security-logs?limit=50')
            const data = await response.json()
            setSecurityLogs(data.logs || [])
        } catch (error) {
            console.error('Error loading security logs:', error)
            setSecurityLogs([])
        } finally {
            setLoading(false)
        }
    }

    // Buscar usuarios por correo electrónico
    const searchUsers = async () => {
        if (!searchEmail.trim()) return
        
        setResetLoading(true)
        setResetError('')
        try {
            const response = await apiClient(`/api/admin/users?search=${encodeURIComponent(searchEmail)}`)
            const data = await response.json()
            if (data.success) {
                setSearchResults(data.users || [])
            } else {
                setSearchResults([])
            }
        } catch (error) {
            console.error('Error searching users:', error)
            setSearchResults([])
        } finally {
            setResetLoading(false)
        }
    }

    // Restablecer contraseña de usuario
    const handleResetPassword = async () => {
        if (!selectedUser || !newPassword) return
        
        setResetLoading(true)
        setResetError('')
        setResetSuccess(false)
        
        try {
            const response = await apiClient('/api/admin/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: selectedUser.id,
                    userEmail: selectedUser.email,
                    newPassword
                })
            })
            
            const data = await response.json()
            
            if (response.ok && data.success) {
                setResetSuccess(true)
            } else {
                setResetError(data.error || 'Error al resetear contraseña')
            }
        } catch (error) {
            setResetError('Error de conexión')
        } finally {
            setResetLoading(false)
        }
    }

    const handleGeneratePassword = () => {
        const pwd = generateSecurePassword(16)
        setNewPassword(pwd)
    }

    const handleCopyPassword = async () => {
        try {
            await navigator.clipboard.writeText(newPassword)
            setCopiedPassword(true)
            setTimeout(() => setCopiedPassword(false), 3000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    const closePasswordResetDialog = () => {
        setShowPasswordReset(false)
        setSearchEmail('')
        setSearchResults([])
        setSelectedUser(null)
        setNewPassword('')
        setResetSuccess(false)
        setResetError('')
    }

    useEffect(() => {
        if (showLogs) {
            loadSecurityLogs()
        }
    }, [showLogs])

    const getEventBadge = (eventType: string, severity: string) => {
        const eventColors: Record<string, string> = {
            LOGIN_SUCCESS: 'bg-green-100 text-green-700 border-green-200',
            LOGIN_FAILED: 'bg-red-100 text-red-700 border-red-200',
            DATA_ENCRYPTION: 'bg-blue-100 text-blue-700 border-blue-200',
            API_ACCESS: 'bg-slate-100 text-slate-700 border-slate-200',
            TOKEN_REFRESH: 'bg-purple-100 text-purple-700 border-purple-200',
            ETL_IMPORT: 'bg-teal-100 text-teal-700 border-teal-200',
            APPOINTMENT_CREATED: 'bg-green-100 text-green-700 border-green-200',
            APPOINTMENT_CANCELLED: 'bg-red-100 text-red-700 border-red-200',
            APPOINTMENT_UPDATED: 'bg-blue-100 text-blue-700 border-blue-200',
            APPOINTMENT_COMPLETED: 'bg-green-100 text-green-700 border-green-200',
            APPOINTMENT_ARRIVAL_CONFIRMED: 'bg-purple-100 text-purple-700 border-purple-200',
            DOCTOR_REGISTRATION_REQUEST: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            DOCTOR_REGISTRATION_APPROVED: 'bg-green-100 text-green-700 border-green-200',
            DOCTOR_REGISTRATION_REJECTED: 'bg-red-100 text-red-700 border-red-200',
            DOCTOR_DELETED: 'bg-red-100 text-red-700 border-red-200',
        }

        const severityColors: Record<string, string> = {
            info: 'bg-blue-100 text-blue-700',
            warning: 'bg-yellow-100 text-yellow-700',
            error: 'bg-red-100 text-red-700',
            critical: 'bg-red-200 text-red-800',
        }

        const color = eventColors[eventType] || severityColors[severity] || 'bg-slate-100 text-slate-700'
        
        return (
            <Badge className={`${color} border`}>
                {eventType ? eventType.replace(/_/g, ' ') : 'Evento'}
            </Badge>
        )
    }

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'warning':
                return <span className="w-2 h-2 rounded-full bg-yellow-500" />
            case 'error':
                return <span className="w-2 h-2 rounded-full bg-red-500" />
            case 'critical':
                return <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            default:
                return <span className="w-2 h-2 rounded-full bg-green-500" />
        }
    }

    const getBrowserFromUserAgent = (userAgent: string | null) => {
        if (!userAgent) return 'Desconocido'
        if (userAgent.includes('Chrome')) return 'Chrome'
        if (userAgent.includes('Firefox')) return 'Firefox'
        if (userAgent.includes('Safari')) return 'Safari'
        if (userAgent.includes('Edge')) return 'Edge'
        return 'Navegador'
    }

    return (
        <div className="space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Configuración</h1>
                    <p className="text-slate-500 mt-2">
                        Ajustes generales del sistema y preferencias de usuario.
                    </p>
                </div>
                <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
                    <Save className="h-4 w-4" />
                    Guardar Cambios
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5 text-slate-500" />
                                Perfil de Usuario
                            </CardTitle>
                            <CardDescription>Información personal y de contacto.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nombre Completo</Label>
                                    <Input defaultValue="Administrador Sistema" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input defaultValue="admin@medcomlabs.com" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Cargo</Label>
                                    <Input defaultValue="Director TI" readOnly className="bg-slate-50" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Teléfono</Label>
                                    <Input defaultValue="+507 6000-0000" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="h-5 w-5 text-slate-500" />
                                Notificaciones
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Alertas de Sistema</Label>
                                    <p className="text-sm text-slate-500">Notificar errores críticos de servidor</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Nuevas Citas</Label>
                                    <p className="text-sm text-slate-500">Recibir email por cada nueva cita</p>
                                </div>
                                <Switch />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-slate-500">
                                <Shield className="h-5 w-5" />
                                Seguridad
                            </CardTitle>
                            <CardDescription>Estado de seguridad del sistema.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                <span className="text-sm font-medium text-slate-700">Cifrado AES-256</span>
                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">ACTIVO</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                <span className="text-sm font-medium text-slate-700">JWT Tokens</span>
                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">ACTIVO</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                <span className="text-sm font-medium text-slate-700">Logs de Auditoría</span>
                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">ACTIVO</span>
                            </div>
                            
                            <Dialog open={showLogs} onOpenChange={setShowLogs}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="w-full mt-4 text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 gap-2">
                                        <Eye className="h-4 w-4" />
                                        Ver Logs de Seguridad
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl max-h-[85vh] bg-white border border-slate-200 shadow-xl">
                                    <DialogHeader>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Activity className="h-5 w-5 text-teal-600" />
                                                <DialogTitle className="text-slate-900">Logs de Seguridad</DialogTitle>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={loadSecurityLogs}
                                                disabled={loading}
                                                className="mr-6"
                                            >
                                                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                            </Button>
                                        </div>
                                        <DialogDescription className="text-slate-600">
                                            Registro de eventos de seguridad y auditoría del sistema en tiempo real
                                        </DialogDescription>
                                    </DialogHeader>
                                    <ScrollArea className="h-[500px] pr-4">
                                        {loading ? (
                                            <div className="flex items-center justify-center h-40">
                                                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                                            </div>
                                        ) : securityLogs.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                                                <Shield className="h-12 w-12 mb-4 text-slate-300" />
                                                <p className="font-medium">No hay logs de seguridad</p>
                                                <p className="text-sm">Los eventos de seguridad aparecerán aquí</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {securityLogs.map((log) => (
                                                    <Card key={log.id} className="border-l-4 border-l-teal-500 bg-white shadow-sm">
                                                        <CardContent className="p-4">
                                                            <div className="flex items-start justify-between mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    {getSeverityIcon(log.severity)}
                                                                    {getEventBadge(log.event_type, log.severity)}
                                                                </div>
                                                                <span className="text-xs text-slate-500 font-mono">
                                                                    {new Date(log.created_at).toLocaleString('es-PA', {
                                                                        year: 'numeric',
                                                                        month: '2-digit',
                                                                        day: '2-digit',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit',
                                                                        second: '2-digit'
                                                                    })}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-slate-700 mb-3">{log.event_description}</p>
                                                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
                                                                <span className="flex items-center gap-1.5">
                                                                    <User className="h-3 w-3" />
                                                                    <span className="font-medium">{log.user_email || 'Sistema'}</span>
                                                                    {log.user_role && (
                                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                                                            {log.user_role}
                                                                        </Badge>
                                                                    )}
                                                                </span>
                                                                <span className="flex items-center gap-1.5">
                                                                    <Globe className="h-3 w-3" />
                                                                    <span className="font-mono">{log.ip_address || 'N/A'}</span>
                                                                </span>
                                                                <span className="flex items-center gap-1.5">
                                                                    <Monitor className="h-3 w-3" />
                                                                    {getBrowserFromUserAgent(log.user_agent)}
                                                                </span>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>

                    {/* Card de restablecimiento de contraseña */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-slate-500">
                                <Key className="h-5 w-5" />
                                Gestión de Contraseñas
                            </CardTitle>
                            <CardDescription>Resetear contraseñas de usuarios del sistema.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Dialog open={showPasswordReset} onOpenChange={(open) => {
                                if (!open) closePasswordResetDialog()
                                else setShowPasswordReset(true)
                            }}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="w-full text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 gap-2">
                                        <Lock className="h-4 w-4" />
                                        Resetear Contraseña de Usuario
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg bg-white border border-slate-200 shadow-xl">
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2 text-slate-900">
                                            <Key className="h-5 w-5 text-teal-600" />
                                            Resetear Contraseña
                                        </DialogTitle>
                                        <DialogDescription className="text-slate-600">
                                            Busque un usuario por email y asigne una nueva contraseña.
                                        </DialogDescription>
                                    </DialogHeader>
                                    
                                    {resetSuccess ? (
                                        <div className="py-6">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                                                </div>
                                                <div className="text-center">
                                                    <h3 className="font-semibold text-slate-900">Contraseña Actualizada</h3>
                                                    <p className="text-sm text-slate-600 mt-1">
                                                        La contraseña de {selectedUser?.email} ha sido actualizada exitosamente.
                                                    </p>
                                                </div>
                                                <Alert className="bg-amber-50 border-amber-200">
                                                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                                                    <AlertDescription className="text-amber-800 text-sm">
                                                        Asegúrese de comunicar la nueva contraseña al usuario de forma segura.
                                                    </AlertDescription>
                                                </Alert>
                                                <Button onClick={closePasswordResetDialog} className="w-full">
                                                    Cerrar
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 py-4">
                                            {/* Buscar por correo electrónico */}
                                            <div className="space-y-2">
                                                <Label className="text-slate-700">Buscar Usuario</Label>
                                                <div className="flex gap-2">
                                                    <div className="relative flex-1">
                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                        <Input
                                                            placeholder="Ingrese email del usuario..."
                                                            value={searchEmail}
                                                            onChange={(e) => setSearchEmail(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                                                            className="pl-10"
                                                        />
                                                    </div>
                                                    <Button 
                                                        variant="outline" 
                                                        onClick={searchUsers}
                                                        disabled={resetLoading || !searchEmail.trim()}
                                                    >
                                                        {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Resultados de la búsqueda */}
                                            {searchResults.length > 0 && (
                                                <div className="space-y-2">
                                                    <Label className="text-slate-700">Usuarios Encontrados</Label>
                                                    <div className="border rounded-lg divide-y max-h-40 overflow-auto">
                                                        {searchResults.map((user) => (
                                                            <button
                                                                key={user.id}
                                                                onClick={() => setSelectedUser(user)}
                                                                className={`w-full p-3 text-left hover:bg-slate-50 transition-colors ${
                                                                    selectedUser?.id === user.id ? 'bg-teal-50 border-l-2 border-l-teal-500' : ''
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div>
                                                                        <p className="font-medium text-slate-900">{user.name}</p>
                                                                        <p className="text-sm text-slate-500">{user.email}</p>
                                                                    </div>
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {user.role}
                                                                    </Badge>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Nueva contraseña */}
                                            {selectedUser && (
                                                <div className="space-y-3 pt-2 border-t">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-slate-700">Nueva Contraseña</Label>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={handleGeneratePassword}
                                                            className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 gap-1.5 h-7 text-xs"
                                                        >
                                                            <Wand2 className="h-3.5 w-3.5" />
                                                            Generar
                                                        </Button>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            type="text"
                                                            value={newPassword}
                                                            onChange={(e) => setNewPassword(e.target.value)}
                                                            placeholder="Ingrese o genere una contraseña"
                                                            className="font-mono"
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={handleCopyPassword}
                                                            disabled={!newPassword}
                                                            title="Copiar contraseña"
                                                        >
                                                            {copiedPassword ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                                        </Button>
                                                    </div>

                                                    {resetError && (
                                                        <Alert variant="destructive" className="bg-red-50 border-red-200">
                                                            <AlertTriangle className="h-4 w-4" />
                                                            <AlertDescription>{resetError}</AlertDescription>
                                                        </Alert>
                                                    )}

                                                    <Alert className="bg-amber-50 border-amber-200">
                                                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                                                        <AlertDescription className="text-amber-800 text-sm">
                                                            Esta acción cambiará inmediatamente la contraseña del usuario <strong>{selectedUser.email}</strong>.
                                                        </AlertDescription>
                                                    </Alert>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {!resetSuccess && (
                                        <DialogFooter>
                                            <Button variant="outline" onClick={closePasswordResetDialog}>
                                                Cancelar
                                            </Button>
                                            <Button 
                                                onClick={handleResetPassword}
                                                disabled={!selectedUser || !newPassword || resetLoading}
                                                className="bg-teal-600 hover:bg-teal-700 text-white"
                                            >
                                                {resetLoading ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        Procesando...
                                                    </>
                                                ) : (
                                                    'Resetear Contraseña'
                                                )}
                                            </Button>
                                        </DialogFooter>
                                    )}
                                </DialogContent>
                            </Dialog>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
