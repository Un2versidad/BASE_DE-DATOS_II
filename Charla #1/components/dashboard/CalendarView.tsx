'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Clock, Loader2, Calendar as CalendarIcon, X, Check, Edit, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { apiClient } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

interface CalendarViewProps {
    appointments: any[]
    loading: boolean
    onRefresh?: () => void
}

export function CalendarView({ appointments, loading, onRefresh }: CalendarViewProps) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [view, setView] = useState<'day' | 'week' | 'month'>('day')
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
    const [showDetailsDialog, setShowDetailsDialog] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [showCancelDialog, setShowCancelDialog] = useState(false)
    const [actionLoading, setActionLoading] = useState(false)
    const [editForm, setEditForm] = useState({
        appointment_date: '',
        appointment_time: '',
        department: '',
        consultation_type: '',
        notes: ''
    })
    const { toast } = useToast()

    const hours = Array.from({ length: 11 }, (_, i) => i + 8) // 8 AM to 6 PM
    const departments = ['Cardiología', 'Pediatría', 'Neurología', 'Ortopedia', 'Oncología', 'Medicina General']
    const consultationTypes = [
        { value: 'primera_vez', label: 'Primera Vez' },
        { value: 'control', label: 'Control' },
        { value: 'emergencia', label: 'Emergencia' }
    ]

    const getPriorityBgColor = (priority: number) => {
        if (priority >= 8) return 'bg-red-100 border-red-300 text-red-800'
        if (priority >= 5) return 'bg-yellow-100 border-yellow-300 text-yellow-800'
        return 'bg-green-100 border-green-300 text-green-800'
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled': return 'bg-blue-100 text-blue-700 border-blue-200'
            case 'confirmed': return 'bg-purple-100 text-purple-700 border-purple-200'
            case 'in_progress': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
            case 'completed': return 'bg-green-100 text-green-700 border-green-200'
            case 'cancelled': return 'bg-red-100 text-red-700 border-red-200'
            case 'no_show': return 'bg-orange-100 text-orange-700 border-orange-200'
            default: return 'bg-slate-100 text-slate-700 border-slate-200'
        }
    }

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            scheduled: 'Programada',
            confirmed: 'Confirmada',
            in_progress: 'En Consulta',
            completed: 'Completada',
            cancelled: 'Cancelada',
            no_show: 'No Asistió'
        }
        return labels[status] || status
    }

    const getPriorityColor = (priority: number) => {
        if (priority >= 8) return 'text-red-600 bg-red-50'
        if (priority >= 5) return 'text-yellow-600 bg-yellow-50'
        return 'text-green-600 bg-green-50'
    }

    const getPriorityLabel = (priority: number) => {
        if (priority >= 8) return 'Alta'
        if (priority >= 5) return 'Media'
        return 'Baja'
    }

    // Filtrar citas para la fecha actual
    const todayAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date)
        return aptDate.toDateString() === currentDate.toDateString()
    })

    // Agrupar citas por hora
    const appointmentsByHour = todayAppointments.reduce((acc, apt) => {
        const time = apt.appointment_time
        const hour = parseInt(time.split(':')[0])
        if (!acc[hour]) acc[hour] = []
        acc[hour].push(apt)
        return acc
    }, {} as Record<number, any[]>)

    // Helper para la vista semanal
    const getWeekDays = () => {
        const startOfWeek = new Date(currentDate)
        const day = startOfWeek.getDay()
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
        startOfWeek.setDate(diff)
        
        const days = []
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek)
            date.setDate(startOfWeek.getDate() + i)
            days.push(date)
        }
        return days
    }

    const getAppointmentsForDate = (date: Date) => {
        return appointments.filter(apt => {
            const aptDate = new Date(apt.appointment_date)
            return aptDate.toDateString() === date.toDateString()
        })
    }

    // Helper para la vista mensual
    const getMonthDays = () => {
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const startDay = firstDay.getDay()
        
        const days = []
        
        // Días del mes anterior
        const prevMonthLastDay = new Date(year, month, 0).getDate()
        for (let i = startDay - 1; i >= 0; i--) {
            days.push({
                date: new Date(year, month - 1, prevMonthLastDay - i),
                isCurrentMonth: false
            })
        }
        
        // Días del mes actual
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push({
                date: new Date(year, month, i),
                isCurrentMonth: true
            })
        }
        
        // Días del próximo mes
        const remainingDays = 42 - days.length
        for (let i = 1; i <= remainingDays; i++) {
            days.push({
                date: new Date(year, month + 1, i),
                isCurrentMonth: false
            })
        }
        
        return days
    }

    const handleViewDetails = (appointment: any) => {
        setSelectedAppointment(appointment)
        setShowDetailsDialog(true)
    }

    const handleEditAppointment = (appointment: any) => {
        setSelectedAppointment(appointment)
        setEditForm({
            appointment_date: appointment.appointment_date,
            appointment_time: appointment.appointment_time,
            department: appointment.department,
            consultation_type: appointment.consultation_type,
            notes: appointment.notes || ''
        })
        setShowDetailsDialog(false)
        setShowEditDialog(true)
    }

    const handleSaveEdit = async () => {
        if (!selectedAppointment) return
        setActionLoading(true)
        
        try {
            const response = await apiClient(`/api/appointments/${selectedAppointment.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                    action: 'edit',
                    ...editForm
                })
            })

            if (response.ok) {
                toast({
                    title: "Cita actualizada",
                    description: "Los cambios se guardaron correctamente",
                })
                setShowEditDialog(false)
                onRefresh?.()
            } else {
                const error = await response.json()
                throw new Error(error.error || 'Error al actualizar')
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

    const handleConfirmArrival = async () => {
        if (!selectedAppointment) return
        setActionLoading(true)
        
        try {
            const response = await apiClient(`/api/appointments/${selectedAppointment.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ action: 'confirm_arrival' })
            })

            if (response.ok) {
                toast({
                    title: "Llegada confirmada",
                    description: `Paciente de cita ${selectedAppointment.appointment_number} registrado`,
                })
                setShowDetailsDialog(false)
                onRefresh?.()
            } else {
                const error = await response.json()
                throw new Error(error.error || 'Error al confirmar')
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

    const handleCancelAppointment = async () => {
        if (!selectedAppointment) return
        setActionLoading(true)
        
        try {
            const response = await apiClient(`/api/appointments/${selectedAppointment.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ 
                    action: 'cancel',
                    cancellation_reason: 'Cancelado por administración'
                })
            })

            if (response.ok) {
                toast({
                    title: "Cita cancelada",
                    description: `Cita ${selectedAppointment.appointment_number} ha sido cancelada`,
                })
                setShowCancelDialog(false)
                setShowDetailsDialog(false)
                onRefresh?.()
            } else {
                const error = await response.json()
                throw new Error(error.error || 'Error al cancelar')
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

    const navigateDate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate)
        if (view === 'day') {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
        } else if (view === 'week') {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
        } else {
            newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
        }
        setCurrentDate(newDate)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Calendario de Citas</h1>
                    <p className="text-slate-600 mt-2">
                        Vista de calendario con citas programadas
                    </p>
                </div>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 border-0 shadow-md">
                    <div className="text-sm font-medium text-slate-600">Total Citas</div>
                    <div className="text-2xl font-bold mt-1">{appointments.length}</div>
                </Card>
                <Card className="p-4 border-0 shadow-md">
                    <div className="text-sm font-medium text-slate-600">Hoy</div>
                    <div className="text-2xl font-bold mt-1">{todayAppointments.length}</div>
                </Card>
                <Card className="p-4 border-0 shadow-md">
                    <div className="text-sm font-medium text-slate-600">Programadas</div>
                    <div className="text-2xl font-bold mt-1">
                        {appointments.filter(a => a.status === 'scheduled').length}
                    </div>
                </Card>
                <Card className="p-4 border-0 shadow-md">
                    <div className="text-sm font-medium text-slate-600">Completadas</div>
                    <div className="text-2xl font-bold mt-1">
                        {appointments.filter(a => a.status === 'completed').length}
                    </div>
                </Card>
            </div>

            {/* Encabezado del calendario */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigateDate('prev')}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-xl font-semibold capitalize min-w-[250px] text-center">
                        {view === 'day' && currentDate.toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        {view === 'week' && `Semana del ${currentDate.toLocaleDateString('es-PA', { day: 'numeric', month: 'long' })}`}
                        {view === 'month' && currentDate.toLocaleDateString('es-PA', { month: 'long', year: 'numeric' })}
                    </h2>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigateDate('next')}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentDate(new Date())}
                    >
                        Hoy
                    </Button>
                </div>

                <div className="flex items-center bg-slate-100 rounded-lg p-1">
                    <Button
                        variant={view === 'day' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setView('day')}
                        className={cn("text-xs font-medium", view === 'day' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600')}
                    >
                        Día
                    </Button>
                    <Button
                        variant={view === 'week' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setView('week')}
                        className={cn("text-xs font-medium", view === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600')}
                    >
                        Semana
                    </Button>
                    <Button
                        variant={view === 'month' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setView('month')}
                        className={cn("text-xs font-medium", view === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600')}
                    >
                        Mes
                    </Button>
                </div>
            </div>

            {/* Vista diaria */}
            {view === 'day' && (
                <div className="border border-slate-200 rounded-xl bg-white shadow-sm">
                    <div className="grid grid-cols-[80px_1fr] divide-x divide-slate-200">
                        <div className="divide-y divide-slate-200 bg-slate-50">
                            {hours.map((hour) => (
                                <div key={hour} className="h-24 flex items-center justify-center text-xs font-medium text-slate-500">
                                    {hour}:00
                                </div>
                            ))}
                        </div>

                        <div className="divide-y divide-slate-200 relative">
                            {hours.map((hour) => (
                                <div key={hour} className="h-24 relative group">
                                    <div className="absolute inset-0 group-hover:bg-slate-50/50 transition-colors pointer-events-none" />

                                    {appointmentsByHour[hour]?.map((apt, idx) => (
                                        <motion.div
                                            key={apt.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            onClick={() => handleViewDetails(apt)}
                                            className={cn(
                                                "absolute left-2 right-2 rounded-lg border p-2 shadow-sm cursor-pointer hover:shadow-md transition-all",
                                                getStatusColor(apt.status)
                                            )}
                                            style={{
                                                top: `${4 + idx * 30}px`,
                                                height: '28px',
                                                zIndex: 10 + idx
                                            }}
                                        >
                                            <div className="flex justify-between items-center h-full">
                                                <div className="flex-1 min-w-0 flex items-center gap-2">
                                                    <span className="font-semibold text-xs truncate">
                                                        {apt.appointment_number}
                                                    </span>
                                                    <span className="text-xs opacity-75 truncate">
                                                        {apt.department}
                                                    </span>
                                                </div>
                                                <Badge variant="outline" className={cn("text-[9px] uppercase tracking-wider border-0 px-1.5 py-0 ml-2", getPriorityColor(apt.priority || 5))}>
                                                    {getPriorityLabel(apt.priority || 5)}
                                                </Badge>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Vista Semanal */}
            {view === 'week' && (
                <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
                    <div className="grid grid-cols-8 divide-x divide-slate-200">
                        <div className="bg-slate-50 p-2 text-center text-xs font-medium text-slate-500">
                            Hora
                        </div>
                        {getWeekDays().map((day) => (
                            <div 
                                key={day.toISOString()} 
                                className={cn(
                                    "p-2 text-center",
                                    day.toDateString() === new Date().toDateString() 
                                        ? "bg-teal-50" 
                                        : "bg-slate-50"
                                )}
                            >
                                <div className="text-xs font-medium text-slate-500">
                                    {day.toLocaleDateString('es-PA', { weekday: 'short' })}
                                </div>
                                <div className={cn(
                                    "text-sm font-bold",
                                    day.toDateString() === new Date().toDateString() 
                                        ? "text-teal-600" 
                                        : "text-slate-900"
                                )}>
                                    {day.getDate()}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="max-h-[500px] overflow-y-auto">
                        {hours.map((hour) => (
                            <div key={hour} className="grid grid-cols-8 divide-x divide-slate-200 border-t border-slate-200">
                                <div className="bg-slate-50 p-2 text-center text-xs font-medium text-slate-500 flex items-center justify-center">
                                    {hour}:00
                                </div>
                                {getWeekDays().map((day) => {
                                    const dayAppointments = getAppointmentsForDate(day).filter(apt => {
                                        const aptHour = parseInt(apt.appointment_time.split(':')[0])
                                        return aptHour === hour
                                    })
                                    return (
                                        <div 
                                            key={`${day.toISOString()}-${hour}`} 
                                            className={cn(
                                                "min-h-[60px] p-1",
                                                day.toDateString() === new Date().toDateString() 
                                                    ? "bg-teal-50/30" 
                                                    : ""
                                            )}
                                        >
                                            {dayAppointments.map((apt) => (
                                                <div
                                                    key={apt.id}
                                                    onClick={() => handleViewDetails(apt)}
                                                    className={cn(
                                                        "text-[10px] p-1 rounded mb-1 cursor-pointer truncate",
                                                        getStatusColor(apt.status)
                                                    )}
                                                >
                                                    {apt.appointment_number}
                                                </div>
                                            ))}
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Vista Mensual */}
            {view === 'month' && (
                <div className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
                    <div className="grid grid-cols-7 divide-x divide-slate-200 bg-slate-50">
                        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                            <div key={day} className="p-3 text-center text-xs font-medium text-slate-500">
                                {day}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 divide-x divide-slate-200">
                        {getMonthDays().map(({ date, isCurrentMonth }, idx) => {
                            const dayAppointments = getAppointmentsForDate(date)
                            const isToday = date.toDateString() === new Date().toDateString()
                            return (
                                <div 
                                    key={idx} 
                                    className={cn(
                                        "min-h-[100px] p-2 border-t border-slate-200",
                                        !isCurrentMonth && "bg-slate-50",
                                        isToday && "bg-teal-50"
                                    )}
                                >
                                    <div className={cn(
                                        "text-sm font-medium mb-1",
                                        !isCurrentMonth && "text-slate-400",
                                        isToday && "text-teal-600"
                                    )}>
                                        {date.getDate()}
                                    </div>
                                    <div className="space-y-1">
                                        {dayAppointments.slice(0, 3).map((apt) => (
                                            <div
                                                key={apt.id}
                                                onClick={() => handleViewDetails(apt)}
                                                className={cn(
                                                    "text-[10px] p-1 rounded mb-1 cursor-pointer truncate border",
                                                    getPriorityBgColor(apt.priority || 5)
                                                )}
                                            >
                                                {apt.appointment_time.slice(0, 5)} - {apt.department}
                                            </div>
                                        ))}
                                        {dayAppointments.length > 3 && (
                                            <div className="text-[10px] text-slate-500 pl-1">
                                                +{dayAppointments.length - 3} más
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {todayAppointments.length === 0 && view === 'day' && (
                <Card className="p-12 text-center border-0 shadow-md">
                    <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium">No hay citas para este día</p>
                    <p className="text-sm text-slate-500 mt-2">
                        Selecciona otra fecha o espera nuevas citas
                    </p>
                </Card>
            )}

            {/* Detalles Dialog */}
            <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                <DialogContent className="max-w-2xl bg-white border border-slate-200 shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-slate-900">Detalles de la Cita</DialogTitle>
                        <DialogDescription className="text-slate-600">
                            Información completa de la cita médica
                        </DialogDescription>
                    </DialogHeader>
                    {selectedAppointment && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs text-slate-500">Número de Cita</Label>
                                    <p className="font-mono font-bold text-teal-600">{selectedAppointment.appointment_number}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Estado</Label>
                                    <div className="mt-1">
                                        <Badge className={getStatusColor(selectedAppointment.status)}>
                                            {getStatusLabel(selectedAppointment.status)}
                                        </Badge>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Departamento</Label>
                                    <p className="font-medium text-slate-900">{selectedAppointment.department}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Tipo de Consulta</Label>
                                    <p className="font-medium capitalize text-slate-900">{selectedAppointment.consultation_type?.replace('_', ' ')}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Fecha</Label>
                                    <p className="font-medium text-slate-900">{new Date(selectedAppointment.appointment_date).toLocaleDateString('es-PA')}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Hora</Label>
                                    <p className="font-medium text-slate-900">{selectedAppointment.appointment_time}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Prioridad</Label>
                                    <Badge className={getPriorityColor(selectedAppointment.priority || 5)}>
                                        {getPriorityLabel(selectedAppointment.priority || 5)} ({selectedAppointment.priority || 5})
                                    </Badge>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Tiempo de Espera Estimado</Label>
                                    <p className="font-medium text-slate-900">{selectedAppointment.estimated_wait_time || 15} minutos</p>
                                </div>
                            </div>
                            {selectedAppointment.notes && (
                                <div>
                                    <Label className="text-xs text-slate-500">Notas</Label>
                                    <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded">{selectedAppointment.notes}</p>
                                </div>
                            )}
                            <DialogFooter className="gap-2 pt-4 border-t">
                                <Button 
                                    onClick={() => handleEditAppointment(selectedAppointment)} 
                                    variant="outline" 
                                    className="flex-1"
                                    disabled={selectedAppointment.status === 'cancelled' || selectedAppointment.status === 'completed'}
                                >
                                    <Edit className="w-4 h-4 mr-2" />
                                    Editar Cita
                                </Button>
                                <Button 
                                    onClick={handleConfirmArrival} 
                                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                                    disabled={actionLoading || selectedAppointment.status !== 'scheduled'}
                                >
                                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                    Confirmar Llegada
                                </Button>
                                <Button 
                                    onClick={() => setShowCancelDialog(true)} 
                                    variant="destructive" 
                                    className="flex-1"
                                    disabled={selectedAppointment.status === 'cancelled' || selectedAppointment.status === 'completed'}
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Cancelar Cita
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Editar Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-lg bg-white border border-slate-200 shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-slate-900">Editar Cita</DialogTitle>
                        <DialogDescription className="text-slate-600">
                            Modifica los detalles de la cita {selectedAppointment?.appointment_number}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Fecha</Label>
                                <Input
                                    type="date"
                                    value={editForm.appointment_date}
                                    onChange={(e) => setEditForm({ ...editForm, appointment_date: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Hora</Label>
                                <Input
                                    type="time"
                                    value={editForm.appointment_time}
                                    onChange={(e) => setEditForm({ ...editForm, appointment_time: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Departamento</Label>
                            <Select
                                value={editForm.department}
                                onValueChange={(value) => setEditForm({ ...editForm, department: value })}
                            >
                                <SelectTrigger className="bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white border border-slate-200">
                                    {departments.map((dept) => (
                                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Tipo de Consulta</Label>
                            <Select
                                value={editForm.consultation_type}
                                onValueChange={(value) => setEditForm({ ...editForm, consultation_type: value })}
                            >
                                <SelectTrigger className="bg-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white border border-slate-200">
                                    {consultationTypes.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Notas</Label>
                            <Textarea
                                value={editForm.notes}
                                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                placeholder="Notas adicionales..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={actionLoading} className="bg-teal-600 hover:bg-teal-700 text-white">
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancelar Confirmacion Dialog */}
            <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <AlertDialogContent className="bg-white border border-slate-200">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-slate-900">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Confirmar Cancelación
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-600">
                            ¿Está seguro de que desea cancelar la cita {selectedAppointment?.appointment_number}? 
                            Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>No, mantener cita</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleCancelAppointment}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={actionLoading}
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Sí, cancelar cita
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
