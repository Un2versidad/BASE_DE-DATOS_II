'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import Link from 'next/link'
import { 
    User, 
    Mail, 
    Phone, 
    Calendar,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    Stethoscope,
    Settings,
    MessageSquare,
    Send
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

export default function DoctorsPage() {
    const [doctors, setDoctors] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showMessageDialog, setShowMessageDialog] = useState(false)
    const [selectedDoctor, setSelectedDoctor] = useState<any>(null)
    const [messageForm, setMessageForm] = useState({ title: '', message: '', priority: 'normal' })
    const [actionLoading, setActionLoading] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        loadDoctors()
    }, [])

    const loadDoctors = async () => {
        try {
            const response = await apiClient('/api/doctors')
            const data = await response.json()
            setDoctors(data.doctors || [])
        } catch (error) {
            console.error('Error loading doctors:', error)
        } finally {
            setLoading(false)
        }
    }

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    const getAvatarColor = (index: number) => {
        const colors = [
            'bg-blue-500',
            'bg-purple-500',
            'bg-pink-500',
            'bg-teal-500',
            'bg-orange-500',
            'bg-indigo-500',
        ]
        return colors[index % colors.length]
    }

    const openMessageDialog = (doctor: any) => {
        setSelectedDoctor(doctor)
        setShowMessageDialog(true)
    }

    const handleSendMessage = async () => {
        if (!selectedDoctor || !messageForm.title || !messageForm.message) return
        setActionLoading(true)
        
        try {
            const response = await apiClient('/api/admin/notifications', {
                method: 'POST',
                body: JSON.stringify({
                    doctorId: selectedDoctor.id,
                    title: messageForm.title,
                    message: messageForm.message,
                    priority: messageForm.priority
                })
            })

            if (response.ok) {
                toast({
                    title: "Mensaje Enviado",
                    description: `El mensaje ha sido enviado a ${selectedDoctor.name}.`,
                })
                setShowMessageDialog(false)
                setMessageForm({ title: '', message: '', priority: 'normal' })
            } else {
                const error = await response.json()
                throw new Error(error.error || 'Error al enviar mensaje')
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            })
        } finally {
            setActionLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        )
    }

    return (
        <div className="space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Personal Médico</h1>
                    <p className="text-slate-600 mt-2">
                        Directorio completo de doctores y especialistas
                    </p>
                </div>
                <Link href="/dashboard/doctores/admin">
                    <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
                        <Settings className="h-4 w-4" />
                        Administrar Doctores
                    </Button>
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-md">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Total Doctores
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{doctors.length}</div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            Activos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {doctors.filter(d => d.is_active).length}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                            <Stethoscope className="w-4 h-4" />
                            Especialidades
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {new Set(doctors.map(d => d.specialty)).size}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-md bg-gradient-to-br from-teal-50 to-cyan-50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-teal-700 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Disponibles Hoy
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-teal-600">
                            {doctors.filter(d => d.is_active).length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Doctor Grid */}
            {doctors.length === 0 ? (
                <Card className="border-0 shadow-md">
                    <CardContent className="text-center py-12">
                        <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-600 font-medium">No hay doctores registrados</p>
                        <p className="text-sm text-slate-500 mt-2">
                            Ejecuta el script de seed para agregar doctores de ejemplo
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {doctors.map((doctor, index) => (
                        <Card key={doctor.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group p-0 gap-0">
                            <div className="h-2 bg-gradient-to-r from-teal-500 to-blue-500 rounded-t-xl" />
                            <div className="p-6 pb-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <Avatar className={cn("w-14 h-14 text-white text-lg font-bold", getAvatarColor(index))}>
                                            <AvatarFallback className={cn("text-white", getAvatarColor(index))}>
                                                {getInitials(doctor.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <CardTitle className="text-lg group-hover:text-teal-600 transition-colors">
                                                {doctor.name}
                                            </CardTitle>
                                            <Badge variant="outline" className="mt-1.5 border-teal-200 text-teal-700 bg-teal-50">
                                                {doctor.specialty}
                                            </Badge>
                                        </div>
                                    </div>
                                    {doctor.is_active ? (
                                        <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span className="text-xs font-medium">Activo</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded-full">
                                            <XCircle className="w-4 h-4" />
                                            <span className="text-xs font-medium">Inactivo</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <CardContent className="pt-0 pb-6">
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-center gap-3 text-slate-600 hover:text-slate-900 transition-colors">
                                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                            <Mail className="w-4 h-4" />
                                        </div>
                                        <span className="truncate">{doctor.email || 'No especificado'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-600 hover:text-slate-900 transition-colors">
                                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                            <Phone className="w-4 h-4" />
                                        </div>
                                        <span>{doctor.phone || 'No especificado'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-600 hover:text-slate-900 transition-colors">
                                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                            <Calendar className="w-4 h-4" />
                                        </div>
                                        <span className="text-xs">Licencia: {doctor.license_number}</span>
                                    </div>
                                    <div className="pt-3 mt-3 border-t border-slate-100">
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span>ID: {doctor.id.slice(0, 8)}</span>
                                        <span>Registrado: {new Date(doctor.created_at).toLocaleDateString('es-PA')}</span>
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="w-full mt-3 gap-2"
                                        onClick={() => openMessageDialog(doctor)}
                                    >
                                        <MessageSquare className="h-4 w-4" />
                                        Enviar Mensaje
                                    </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Mensaje Dialog */}
            <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
                <DialogContent className="max-w-lg bg-white border border-slate-200 shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-slate-900 flex items-center gap-2">
                            <MessageSquare className="h-5 w-5 text-blue-600" />
                            Enviar Mensaje a Doctor
                        </DialogTitle>
                        <DialogDescription className="text-slate-600">
                            {selectedDoctor && `Enviar notificación a ${selectedDoctor.name}`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Título del mensaje</Label>
                            <Input
                                placeholder="Ej: Actualización importante"
                                value={messageForm.title}
                                onChange={(e) => setMessageForm({ ...messageForm, title: e.target.value })}
                                maxLength={100}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Mensaje</Label>
                            <Textarea
                                placeholder="Escriba el mensaje que desea enviar..."
                                value={messageForm.message}
                                onChange={(e) => setMessageForm({ ...messageForm, message: e.target.value })}
                                rows={4}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Prioridad</Label>
                            <Select 
                                value={messageForm.priority} 
                                onValueChange={(value) => setMessageForm({ ...messageForm, priority: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    <SelectItem value="baja">Baja</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="alta">Alta</SelectItem>
                                    <SelectItem value="urgente">Urgente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowMessageDialog(false)}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleSendMessage}
                            disabled={actionLoading || !messageForm.title || !messageForm.message}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            {actionLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Send className="h-4 w-4 mr-2" />
                            )}
                            Enviar Mensaje
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}
