'use client'

import { useEffect, useState, useCallback } from 'react'
import { decrypt, deriveKey } from '@/lib/encryption'
// Utilidad para descifrar notificaciones (asume que tienes la clave secreta en el frontend)
async function decryptNotificationField(packed: string, key: CryptoKey): Promise<string> {
    if (!packed) return ''
    try {
        return await decrypt(packed, key)
    } catch {
        return packed
    }
}

// Descifra todas las notificaciones recibidas
async function decryptNotifications(notifications: any[], key: CryptoKey) {
    return Promise.all(
        notifications.map(async (n) => ({
            ...n,
            title: await decryptNotificationField(n.title, key),
            message: await decryptNotificationField(n.message, key),
        }))
    )
}
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table'
import { 
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
    Calendar as CalendarIcon, Users, FileText, Clock, Stethoscope, Activity,
    ClipboardList, Pill, Check, AlertCircle, Eye, LogOut,
    Search, Bell, TrendingUp, User, Play, CheckCircle, X, MoreHorizontal,
    Droplet, AlertTriangle, CalendarDays, RefreshCw, Plus, Loader2,
    Mail, Download, Send, FileDown, Settings, Save, ChevronLeft, ChevronRight, Trash2, Pencil
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, addWeeks, subWeeks, addMonths, subMonths, startOfMonth, endOfMonth, isSameMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { AINotesAssistant } from '@/components/ai/ai-notes-assistant'

interface Appointment {
    id: string
    appointmentNumber: string
    time: string
    date: string
    type: string
    status: string
    priority: number
    estimatedWait: number
    reason?: string
    symptoms?: string[]
    patient: {
        id: string
        name: string
        cedula: string
        dob?: string
        bloodType?: string
        allergies?: string[]
    }
}

interface LabResult {
    id: string
    examName: string
    examType: string
    status: string
    orderedDate: string
    completedDate?: string
    priority: string
    patientId: string
    patientName: string
}

interface Prescription {
    id: string
    medication: string
    dosage: string
    frequency: string
    duration?: string
    instructions?: string
    refillsRemaining: number
    startDate: string
    status: string
    patientId: string
    patientName: string
}

interface Patient {
    id: string
    name: string
    cedula: string
    email?: string
    phone?: string
    dob?: string
    bloodType?: string
    allergies?: string[]
    lastVisit?: string
    condition?: string
    status: string
    accessCode?: string
}

interface Notification {
    id: string
    title: string
    message: string
    type: string
    priority: string
    is_read: boolean
    created_at: string
}

interface DashboardData {
    currentDate?: string  // Fecha actual del servidor (YYYY-MM-DD) para un filtrado coherente
    doctor: {
        id: string
        name: string
        specialty: string
        licenseNumber?: string
    }
    stats: {
        todayAppointments: number
        completedToday: number
        waitingPatients: number
        pendingResults: number
        totalPatients: number
        activePrescriptions: number
        unreadNotifications: number
    }
    appointments: Appointment[]
    nextAppointment?: Appointment
    pendingResults: LabResult[]
    prescriptions: Prescription[]
    patients: Patient[]
}

const mapStatusFromDB = (status: string): string => {
    const statusMap: Record<string, string> = {
        'programada': 'scheduled',
        'confirmada': 'confirmed',
        'en_progreso': 'in_progress',
        'completada': 'completed',
        'cancelada': 'cancelled',
        'no_asistio': 'no_show'
    }
    return statusMap[status] || status
}

export default function DoctorDashboardPage() {
    const router = useRouter()
    const [currentTime, setCurrentTime] = useState(new Date())
    const [isInitialLoading, setIsInitialLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [error, setError] = useState('')
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [showNotifications, setShowNotifications] = useState(false)
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
    const [showPatientDialog, setShowPatientDialog] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedDate, setSelectedDate] = useState<Date>(new Date())
    const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month'>('day')
    const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false)
    const [showRescheduleDialog, setShowRescheduleDialog] = useState(false)
    const [showResultsDialog, setShowResultsDialog] = useState(false)
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [validationError, setValidationError] = useState('')
    const [activeConsultation, setActiveConsultation] = useState<Appointment | null>(null)

    // Estado de la configuración del perfil
    const [profileSettings, setProfileSettings] = useState({
        available_days: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'] as string[],
        start_time: '08:00',
        end_time: '17:00',
        appointment_duration: 30
    })
    const [isSavingProfile, setIsSavingProfile] = useState(false)
    const [profileSaveMessage, setProfileSaveMessage] = useState('')

    const [prescriptionForm, setPrescriptionForm] = useState({
        patientId: '',
        appointmentId: '',
        medicationName: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
        refillsAllowed: 0
    })

    const [rescheduleForm, setRescheduleForm] = useState({
        appointmentId: '',
        newDate: '',
        newTime: '',
        reason: ''
    })

    const [resultsForm, setResultsForm] = useState({
        patientId: '',
        examType: '',
        examName: '',
        resultValue: '',
        notes: '',
        isAbnormal: false
    })

    // Estado de edición del paciente
    const [isEditingPatient, setIsEditingPatient] = useState(false)
    const [patientEditForm, setPatientEditForm] = useState({
        bloodType: '',
        allergies: '',
        email: '',
        phone: ''
    })

    // Estado del historial de resultados del paciente 
    const [patientResults, setPatientResults] = useState<LabResult[]>([])
    const [loadingPatientResults, setLoadingPatientResults] = useState(false)

    // Estado de edición de la receta
    const [showEditPrescriptionDialog, setShowEditPrescriptionDialog] = useState(false)
    const [editPrescriptionForm, setEditPrescriptionForm] = useState({
        id: '',
        medicationName: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: '',
        refillsAllowed: 0
    })

    const getToken = () => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('doctor_access_token')
        }
        return null
    }

    const loadDashboardData = useCallback(async (isInitial = false) => {
        const token = getToken()
        if (!token) {
            router.push('/doctores/login')
            return
        }

        try {
            if (isInitial) {
                setIsInitialLoading(true)
            } else {
                setIsRefreshing(true)
            }
            
            const response = await fetch('/api/doctors/dashboard', {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (response.status === 401) {
                localStorage.removeItem('doctor_access_token')
                router.push('/doctores/login')
                return
            }

            const data = await response.json()
            if (data.success) {
                const mappedAppointments = (data.appointments || []).map((apt: any) => ({
                    ...apt,
                    status: mapStatusFromDB(apt.status)
                }))
                
                setDashboardData({
                    ...data,
                    appointments: mappedAppointments
                })
                
                // Seguimiento de consultas activas
                const inProgress = mappedAppointments.find((a: Appointment) => a.status === 'in_progress')
                setActiveConsultation(inProgress || null)
            } else {
                setError(data.error || 'Error al cargar datos')
            }
        } catch (err) {
            setError('Error de conexión')
        } finally {
            setIsInitialLoading(false)
            setIsRefreshing(false)
        }
    }, [router])

    const loadNotifications = useCallback(async () => {
        const token = getToken()
        if (!token) return

        try {
            const response = await fetch('/api/doctors/notifications?limit=10', {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            const data = await response.json()
            if (data.success) {
                const secret = process.env.NEXT_PUBLIC_ENCRYPTION_SECRET || 'default-secret-change-in-production'
                const key = await deriveKey(secret)
                const decrypted = await decryptNotifications(data.notifications || [], key)
                setNotifications(decrypted)
            }
        } catch (err) {
            console.error('Error loading notifications:', err)
        }
    }, [])

    const loadProfile = useCallback(async () => {
        const token = getToken()
        if (!token) return

        try {
            const response = await fetch('/api/doctors/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            const data = await response.json()
            if (data.profile) {
                setProfileSettings({
                    available_days: data.profile.available_days || ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
                    start_time: data.profile.start_time || '08:00',
                    end_time: data.profile.end_time || '17:00',
                    appointment_duration: data.profile.appointment_duration || 30
                })
            }
        } catch (err) {
            console.error('Error loading profile:', err)
        }
    }, [])

    const markNotificationRead = async (notificationId: string) => {
        const token = getToken()
        if (!token) return

        try {
            await fetch('/api/doctors/notifications', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ notificationIds: [notificationId] })
            })
            loadNotifications()
        } catch (err) {
            console.error('Error marking notification as read:', err)
        }
    }

    const markAllNotificationsRead = async () => {
        const token = getToken()
        if (!token) return

        try {
            await fetch('/api/doctors/notifications', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ markAllRead: true })
            })
            loadNotifications()
        } catch (err) {
            console.error('Error:', err)
        }
    }

    const clearAllNotifications = async () => {
        const token = getToken()
        if (!token) return

        try {
            await fetch('/api/doctors/notifications', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            setNotifications([])
        } catch (err) {
            console.error('Error clearing notifications:', err)
        }
    }

    const handleAppointmentAction = async (appointmentId: string, action: string, appointment?: Appointment) => {
        const token = getToken()
        if (!token) return

        // Validaciones basadas en la acción
        if (action === 'start') {
            // Comprueba si ya hay una consulta activa.
            if (activeConsultation && activeConsultation.id !== appointmentId) {
                setValidationError(`Ya tiene una consulta activa con ${activeConsultation.patient.name}. Debe completarla primero.`)
                return
            }
        }

        setActionLoading(appointmentId)
        setValidationError('')
        
        try {
            const response = await fetch('/api/doctors/appointments', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ appointmentId, action })
            })

            const data = await response.json()
            
            if (response.ok) {
                // Actualizar inmediatamente el estado de consulta activa
                if (action === 'start' && appointment) {
                    setActiveConsultation({ ...appointment, status: 'in_progress' })
                } else if (action === 'complete' || action === 'cancel') {
                    setActiveConsultation(null)
                }
                loadDashboardData()
            } else {
                setValidationError(data.error || 'Error al actualizar la cita')
            }
        } catch (err) {
            console.error('Error updating appointment:', err)
            setValidationError('Error de conexión')
        } finally {
            setActionLoading(null)
        }
    }

    const handleReviewResult = async (resultId: string) => {
        const token = getToken()
        if (!token) return

        setActionLoading(resultId)
        try {
            const response = await fetch(`/api/doctors/lab-results`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    resultId,
                    status: 'reviewed'
                })
            })

            if (response.ok) {
                loadDashboardData()
            } else {
                const data = await response.json()
                setValidationError(data.error || 'Error al revisar resultado')
            }
        } catch (err) {
            console.error('Error reviewing result:', err)
            setValidationError('Error de conexión')
        } finally {
            setActionLoading(null)
        }
    }

    const handleSendResultsByEmail = async (resultId: string, patientEmail?: string) => {
        const token = getToken()
        if (!token) return

        setActionLoading(`email-${resultId}`)
        try {
            const response = await fetch('/api/doctors/results/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    resultId,
                    patientEmail
                })
            })

            const data = await response.json()
            if (response.ok) {
                setValidationError('')
                // Mostrar mensaje de éxito
                alert('Resultados enviados exitosamente por email')
                loadDashboardData()
                loadNotifications() // <-- Recarga notificaciones tras enviar resultados
            } else {
                setValidationError(data.error || 'Error al enviar resultados')
            }
        } catch (err) {
            console.error('Error sending results:', err)
            setValidationError('Error de conexión')
        } finally {
            setActionLoading(null)
        }
    }

    const handleDownloadResultPDF = async (resultId: string, examName: string) => {
        const token = getToken()
        if (!token) return

        setActionLoading(`pdf-${resultId}`)
        try {
            const response = await fetch(`/api/doctors/results/${resultId}/pdf`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const html = await response.text()
                // Crear un blob y descargar directamente
                const blob = new Blob([html], { type: 'text/html' })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `resultado-${examName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.html`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                window.URL.revokeObjectURL(url)
            } else {
                const data = await response.json()
                setValidationError(data.error || 'Error al generar PDF')
            }
        } catch (err) {
            console.error('Error downloading PDF:', err)
            setValidationError('Error de conexión')
        } finally {
            setActionLoading(null)
        }
    }

    const handleDeleteResult = async (resultId: string) => {
        const token = getToken()
        if (!token) return

        if (!confirm('¿Está seguro que desea eliminar este resultado?')) {
            return
        }

        setActionLoading(`delete-${resultId}`)
        try {
            const response = await fetch(`/api/doctors/lab-results?id=${resultId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()

            if (data.success) {
                loadDashboardData()
            } else {
                setValidationError(data.error || 'Error al eliminar resultado')
            }
        } catch (err) {
            console.error('Error deleting result:', err)
            setValidationError('Error de conexión')
        } finally {
            setActionLoading(null)
        }
    }

    // Gestionar la creación de un nuevo resultado de laboratorio
    const handleCreateResult = async () => {
        const token = getToken()
        if (!token) return

        if (!resultsForm.patientId || !resultsForm.examType || !resultsForm.examName || !resultsForm.resultValue) {
            setValidationError('Complete todos los campos requeridos')
            return
        }

        setActionLoading('result')
        setValidationError('')

        try {
            const response = await fetch('/api/doctors/results', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    patientId: resultsForm.patientId,
                    examType: resultsForm.examType,
                    examName: resultsForm.examName,
                    resultValue: resultsForm.resultValue,
                    notes: resultsForm.notes,
                    isAbnormal: resultsForm.isAbnormal
                })
            })

            const data = await response.json()

            if (data.success) {
                setShowResultsDialog(false)
                setResultsForm({
                    patientId: '',
                    examType: '',
                    examName: '',
                    resultValue: '',
                    notes: '',
                    isAbnormal: false
                })
                loadDashboardData()
            } else {
                setValidationError(data.error || 'Error al registrar resultado')
            }
        } catch (err) {
            console.error('Error creating result:', err)
            setValidationError('Error de conexión')
        } finally {
            setActionLoading(null)
        }
    }

    // Validar que la receta requiere una consulta activa o una cita reciente completada.
    const canCreatePrescription = (patientId: string): { valid: boolean; reason?: string } => {
        const patientAppointments = dashboardData?.appointments.filter(
            a => a.patient.id === patientId && 
            (a.status === 'in_progress' || a.status === 'completed')
        ) || []
        
        if (patientAppointments.length === 0) {
            return { 
                valid: false, 
                reason: 'Debe iniciar una consulta con este paciente antes de crear una receta.' 
            }
        }
        return { valid: true }
    }

    const handleCreatePrescription = async () => {
        const token = getToken()
        if (!token) return

        if (!prescriptionForm.patientId || !prescriptionForm.medicationName || 
            !prescriptionForm.dosage || !prescriptionForm.frequency) {
            setValidationError('Complete todos los campos requeridos')
            return
        }

        // Se puede crear una receta válida.
        const validation = canCreatePrescription(prescriptionForm.patientId)
        if (!validation.valid) {
            setValidationError(validation.reason || 'No se puede crear la receta')
            return
        }

        setActionLoading('prescription')
        setValidationError('')
        
        try {
            const response = await fetch('/api/doctors/prescriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...prescriptionForm,
                    appointmentId: activeConsultation?.id || prescriptionForm.appointmentId
                })
            })

            if (response.ok) {
                setShowPrescriptionDialog(false)
                setPrescriptionForm({
                    patientId: '',
                    appointmentId: '',
                    medicationName: '',
                    dosage: '',
                    frequency: '',
                    duration: '',
                    instructions: '',
                    refillsAllowed: 0
                })
                loadDashboardData()
            } else {
                const data = await response.json()
                setValidationError(data.error || 'Error al crear receta')
            }
        } catch (err) {
            console.error('Error creating prescription:', err)
            setValidationError('Error de conexión')
        } finally {
            setActionLoading(null)
        }
    }

    // Eliminar el controlador de recetas
    const handleDeletePrescription = async (prescriptionId: string) => {
        const token = getToken()
        if (!token) return

        if (!confirm('¿Está seguro de eliminar esta receta?')) return

        setActionLoading(prescriptionId)
        try {
            const response = await fetch(`/api/doctors/prescriptions?id=${prescriptionId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                loadDashboardData()
            } else {
                const data = await response.json()
                alert(data.error || 'Error al eliminar receta')
            }
        } catch (err) {
            console.error('Error deleting prescription:', err)
            alert('Error de conexión')
        } finally {
            setActionLoading(null)
        }
    }

    // Enviar receta por correo electrónico
    const handleSendPrescriptionEmail = async (prescription: any) => {
        const token = getToken()
        if (!token) return

        setActionLoading(prescription.id)
        try {
            const response = await fetch('/api/doctors/prescriptions/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prescriptionId: prescription.id,
                    patientId: prescription.patientId
                })
            })

            if (response.ok) {
                alert('Receta enviada por correo exitosamente')
            } else {
                const data = await response.json()
                alert(data.error || 'Error al enviar receta')
            }
        } catch (err) {
            console.error('Error sending prescription:', err)
            alert('Error de conexión')
        } finally {
            setActionLoading(null)
        }
    }

    // Controlador de edición de pacientes
    const handleEditPatient = async () => {
        const token = getToken()
        if (!token || !selectedPatient) return

        setActionLoading('editPatient')
        try {
            const response = await fetch(`/api/doctors/patients/${selectedPatient.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    bloodType: patientEditForm.bloodType,
                    allergies: patientEditForm.allergies,
                    email: patientEditForm.email || undefined,
                    phone: patientEditForm.phone || undefined
                })
            })

            if (response.ok) {
                setIsEditingPatient(false)
                loadDashboardData()
                alert('Datos del paciente actualizados')
            } else {
                const data = await response.json()
                alert(data.error || 'Error al actualizar paciente')
            }
        } catch (err) {
            console.error('Error updating patient:', err)
            alert('Error de conexión')
        } finally {
            setActionLoading(null)
        }
    }

    // Comenzar a editar paciente
    const startEditingPatient = () => {
        if (selectedPatient) {
            setPatientEditForm({
                bloodType: selectedPatient.bloodType || '',
                allergies: selectedPatient.allergies?.join(', ') || '',
                email: selectedPatient.email || '',
                phone: selectedPatient.phone || ''
            })
            setIsEditingPatient(true)
        }
    }

    // Cargar el historial de resultados de laboratorio del paciente
    const loadPatientResults = useCallback(async (patientId: string) => {
        const token = getToken()
        if (!token || !patientId) return

        setLoadingPatientResults(true)
        try {
            const response = await fetch(`/api/doctors/patients/${patientId}/results`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            const data = await response.json()
            if (data.success) {
                setPatientResults(data.results || [])
            }
        } catch (err) {
            console.error('Error loading patient results:', err)
        } finally {
            setLoadingPatientResults(false)
        }
    }, [])

    // Eliminar el resultado de un paciente
    const handleDeletePatientResult = async (resultId: string) => {
        const token = getToken()
        if (!token || !selectedPatient) return

        if (!confirm('¿Está seguro que desea eliminar este resultado?')) {
            return
        }

        setActionLoading(`delete-result-${resultId}`)
        try {
            const response = await fetch(`/api/doctors/lab-results?id=${resultId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            const data = await response.json()

            if (data.success) {
                loadPatientResults(selectedPatient.id)
                loadDashboardData()
            } else {
                setValidationError(data.error || 'Error al eliminar resultado')
            }
        } catch (err) {
            console.error('Error deleting result:', err)
            setValidationError('Error de conexión')
        } finally {
            setActionLoading(null)
        }
    }

    // Controlador de edición de recetas
    const handleEditPrescription = async () => {
        const token = getToken()
        if (!token) return

        setActionLoading('editPrescription')
        try {
            const response = await fetch('/api/doctors/prescriptions', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: editPrescriptionForm.id,
                    medicationName: editPrescriptionForm.medicationName,
                    dosage: editPrescriptionForm.dosage,
                    frequency: editPrescriptionForm.frequency,
                    duration: editPrescriptionForm.duration,
                    instructions: editPrescriptionForm.instructions,
                    refillsAllowed: editPrescriptionForm.refillsAllowed
                })
            })

            if (response.ok) {
                setShowEditPrescriptionDialog(false)
                loadDashboardData()
                alert('Receta actualizada exitosamente')
            } else {
                const data = await response.json()
                alert(data.error || 'Error al actualizar receta')
            }
        } catch (err) {
            console.error('Error updating prescription:', err)
            alert('Error de conexión')
        } finally {
            setActionLoading(null)
        }
    }

    // Comenzar a editar la receta
    const startEditingPrescription = (rx: any) => {
        setEditPrescriptionForm({
            id: rx.id,
            medicationName: rx.medicationName || '',
            dosage: rx.dosage || '',
            frequency: rx.frequency || '',
            duration: rx.duration || '',
            instructions: rx.instructions || '',
            refillsAllowed: rx.refillsAllowed || rx.refillsRemaining || 0
        })
        setShowEditPrescriptionDialog(true)
    }

    // Reprogramar el controlador de citas
    const handleRescheduleAppointment = async () => {
        const token = getToken()
        if (!token) return

        if (!rescheduleForm.appointmentId || !rescheduleForm.newDate || !rescheduleForm.newTime) {
            setValidationError('Seleccione nueva fecha y hora')
            return
        }

        setActionLoading('reschedule')
        setValidationError('')
        
        try {
            const response = await fetch('/api/doctors/appointments/reschedule', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(rescheduleForm)
            })

            if (response.ok) {
                setShowRescheduleDialog(false)
                setRescheduleForm({
                    appointmentId: '',
                    newDate: '',
                    newTime: '',
                    reason: ''
                })
                setSelectedAppointment(null)
                loadDashboardData()
            } else {
                const data = await response.json()
                setValidationError(data.error || 'Error al reprogramar cita')
            }
        } catch (err) {
            console.error('Error rescheduling appointment:', err)
            setValidationError('Error de conexión')
        } finally {
            setActionLoading(null)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('doctor_access_token')
        router.push('/doctores/login')
    }

    useEffect(() => {
        loadDashboardData(true) // La carga inicial muestra la pantalla de carga.
        loadNotifications()
        loadProfile()

        const timer = setInterval(() => setCurrentTime(new Date()), 60000)
        const refreshTimer = setInterval(() => {
            loadDashboardData(false) // Al actualizar no aparece la pantalla de carga.
            loadNotifications()
        }, 300000)

        return () => {
            clearInterval(timer)
            clearInterval(refreshTimer)
        }
    }, [loadDashboardData, loadNotifications, loadProfile])

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'scheduled': return 'bg-slate-100 text-slate-700'
            case 'confirmed': return 'bg-yellow-100 text-yellow-700'
            case 'in_progress': return 'bg-blue-100 text-blue-700'
            case 'completed': return 'bg-green-100 text-green-700'
            case 'cancelled': return 'bg-red-100 text-red-700'
            default: return 'bg-slate-100 text-slate-700'
        }
    }

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            scheduled: 'Agendada', confirmed: 'Confirmada', in_progress: 'En Consulta',
            completed: 'Completada', cancelled: 'Cancelada', stable: 'Estable'
        }
        return labels[status] || status
    }

    const getPriorityColor = (priority: number) => {
        if (priority <= 2) return 'bg-red-500'
        if (priority <= 4) return 'bg-orange-500'
        return 'bg-green-500'
    }

    const getConsultationTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            primera_vez: 'Primera Vez', control: 'Control', emergencia: 'Emergencia'
        }
        return labels[type] || type
    }

    const getNotificationIcon = (type: string, priority: string) => {
        if (priority === 'urgent' || priority === 'alta') return (
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
        )
        switch (type) {
            case 'appointment': 
            case 'cita': 
                return (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <CalendarDays className="h-4 w-4 text-blue-600" />
                    </div>
                )
            case 'result': 
            case 'resultado': 
                return (
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-4 w-4 text-orange-600" />
                    </div>
                )
            default: 
                return (
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Bell className="h-4 w-4 text-slate-600" />
                    </div>
                )
        }
    }

    const filteredPatients = dashboardData?.patients.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cedula.includes(searchTerm)
    ) || []

    const getWeekDays = () => {
        const start = startOfWeek(selectedDate, { weekStartsOn: 1 })
        const end = endOfWeek(selectedDate, { weekStartsOn: 1 })
        return eachDayOfInterval({ start, end })
    }

    const getMonthDays = () => {
        const start = startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 })
        const end = endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 })
        return eachDayOfInterval({ start, end })
    }

    const getAppointmentsForDate = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd')
        return dashboardData?.appointments.filter(a => a.date === dateStr) || []
    }

    const unreadNotificationCount = notifications.filter(n => !n.is_read).length

    if (isInitialLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 text-teal-600 animate-spin mx-auto mb-4" />
                    <p className="text-slate-600">Cargando portal médico...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-teal-50 flex items-center justify-center">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6 text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Error</h2>
                        <p className="text-slate-600 mb-4">{error}</p>
                        <Button onClick={() => loadDashboardData(true)}>Reintentar</Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-teal-50/30">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 flex items-center justify-center overflow-hidden">
                                <img src="/logo-transparent.png" alt="MedComLabs" className="w-full h-full object-contain" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                                    Bienvenido, {(() => {
                                        const name = dashboardData?.doctor?.name || ''
                                        // Eliminar el prefijo Dr./Dra. si está presente para evitar «Dr. Dr».
                                        const cleanName = name.replace(/^(Dr\.|Dra\.|Dr |Dra )/i, '').trim()
                                        const firstName = cleanName.split(' ')[0]
                                        return `Dr. ${firstName}`
                                    })()}
                                </h1>
                                <p className="text-slate-600 text-sm flex items-center gap-2">
                                    <span className="font-medium text-teal-600">{dashboardData?.doctor?.specialty}</span>
                                    <span className="text-slate-400">•</span>
                                    <span>{format(currentTime, "EEEE, d 'de' MMMM", { locale: es })}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => loadDashboardData(false)}
                                disabled={isRefreshing}
                            >
                                <RefreshCw className={cn("h-5 w-5", isRefreshing && "animate-spin")} />
                            </Button>
                            
                            <Popover open={showNotifications} onOpenChange={setShowNotifications}>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="relative">
                                        <Bell className="h-5 w-5" />
                                        {unreadNotificationCount > 0 && (
                                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                                {unreadNotificationCount}
                                            </span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-96 p-0 bg-white" align="end">
                                    <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
                                        <h3 className="font-semibold">Notificaciones</h3>
                                        <div className="flex items-center gap-1">
                                            {unreadNotificationCount > 0 && (
                                                <Button variant="ghost" size="sm" onClick={markAllNotificationsRead}>
                                                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                                    Leídas
                                                </Button>
                                            )}
                                            {notifications.length > 0 && (
                                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={clearAllNotifications}>
                                                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                                                    Limpiar
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <ScrollArea className="h-80">
                                        {notifications.length === 0 ? (
                                            <div className="p-8 text-center text-slate-500">
                                                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                <p>No hay notificaciones</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y">
                                                {notifications.map((notification) => (
                                                    <div
                                                        key={notification.id}
                                                        className={cn(
                                                            "p-4 hover:bg-slate-50 cursor-pointer",
                                                            !notification.is_read && "bg-blue-50/50"
                                                        )}
                                                        onClick={() => markNotificationRead(notification.id)}
                                                    >
                                                        <div className="flex gap-3">
                                                            {getNotificationIcon(notification.type, notification.priority)}
                                                            <div className="flex-1">
                                                                <p className="font-medium text-sm">{notification.title}</p>
                                                                <p className="text-xs text-slate-600 mt-0.5">{notification.message}</p>
                                                                <p className="text-xs text-slate-400 mt-1">
                                                                    {format(new Date(notification.created_at), "d MMM, HH:mm", { locale: es })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </PopoverContent>
                            </Popover>

                            <Button variant="outline" className="gap-2" onClick={handleLogout}>
                                <LogOut className="h-4 w-4" />
                                Cerrar Sesión
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-6 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-blue-100">Citas Hoy</CardTitle>
                                <CalendarIcon className="h-5 w-5 text-blue-200" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold">{dashboardData?.stats.todayAppointments || 0}</div>
                                <p className="text-xs text-blue-200 mt-1">
                                    {dashboardData?.stats.waitingPatients || 0} en espera
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-emerald-100">Mis Pacientes</CardTitle>
                                <Users className="h-5 w-5 text-emerald-200" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold">{dashboardData?.stats.totalPatients || 0}</div>
                                <p className="text-xs text-emerald-200 mt-1 flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    +2 esta semana
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-orange-100">Resultados Pendientes</CardTitle>
                                <FileText className="h-5 w-5 text-orange-200" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold">{dashboardData?.stats.pendingResults || 0}</div>
                                <p className="text-xs text-orange-200 mt-1">Por revisar</p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-purple-100">Próxima Cita</CardTitle>
                                <Clock className="h-5 w-5 text-purple-200" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold">
                                    {dashboardData?.nextAppointment?.time?.slice(0, 5) || '--:--'}
                                </div>
                                <p className="text-xs text-purple-200 mt-1 truncate">
                                    {dashboardData?.nextAppointment?.patient?.name || 'Sin citas'}
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* Contenido principal */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Agenda */}
                    <Card className="lg:col-span-2 border-0 shadow-lg overflow-hidden rounded-xl">
                        <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-t-xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <ClipboardList className="h-5 w-5 text-teal-600" />
                                        Agenda
                                    </CardTitle>
                                    <CardDescription>
                                        {format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: es })}
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Navegación por semana/mes */}
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setSelectedDate(calendarView === 'week' ? subWeeks(selectedDate, 1) : subMonths(selectedDate, 1))}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSelectedDate(new Date())}
                                        >
                                            Hoy
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setSelectedDate(calendarView === 'week' ? addWeeks(selectedDate, 1) : addMonths(selectedDate, 1))}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex border rounded-lg overflow-hidden">
                                        <Button
                                            variant={calendarView === 'day' ? 'default' : 'ghost'}
                                            size="sm"
                                            onClick={() => setCalendarView('day')}
                                            className={calendarView === 'day' ? 'bg-teal-600 text-white hover:bg-teal-700' : ''}
                                        >
                                            Hoy
                                        </Button>
                                        <Button
                                            variant={calendarView === 'week' ? 'default' : 'ghost'}
                                            size="sm"
                                            onClick={() => setCalendarView('week')}
                                            className={calendarView === 'week' ? 'bg-teal-600 text-white hover:bg-teal-700' : ''}
                                        >
                                            Semana
                                        </Button>
                                        <Button
                                            variant={calendarView === 'month' ? 'default' : 'ghost'}
                                            size="sm"
                                            onClick={() => setCalendarView('month')}
                                            className={calendarView === 'month' ? 'bg-teal-600 text-white hover:bg-teal-700' : ''}
                                        >
                                            Mes
                                        </Button>
                                    </div>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" size="sm" className="gap-2">
                                                <CalendarIcon className="h-4 w-4" />
                                                {format(selectedDate, 'd MMM', { locale: es })}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-white" align="end">
                                            <Calendar
                                                mode="single"
                                                selected={selectedDate}
                                                onSelect={(date) => date && setSelectedDate(date)}
                                                locale={es}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {calendarView === 'day' ? (
                                <ScrollArea className="h-[450px]">
                                    <AnimatePresence>
                                        {getAppointmentsForDate(selectedDate).length === 0 ? (
                                            <div className="p-12 text-center">
                                                <CalendarIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                                <p className="text-slate-500">No hay citas para {isToday(selectedDate) ? 'hoy' : format(selectedDate, "d 'de' MMMM", { locale: es })}</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y">
                                                {getAppointmentsForDate(selectedDate).map((appointment, index) => (
                                                    <motion.div
                                                        key={appointment.id}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: index * 0.05 }}
                                                        className="p-4 hover:bg-slate-50/50"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="text-center min-w-[70px]">
                                                                <div className="text-lg font-bold">
                                                                    {appointment.time?.slice(0, 5)}
                                                                </div>
                                                                {appointment.estimatedWait && (
                                                                    <div className="text-xs text-slate-500">
                                                                        ~{appointment.estimatedWait} min
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className={cn(
                                                                "w-1.5 h-16 rounded-full",
                                                                getPriorityColor(appointment.priority)
                                                            )} />
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold">
                                                                        {appointment.patient.name}
                                                                    </span>
                                                                    {(appointment.patient.allergies?.length ?? 0) > 0 && (
                                                                        <Badge variant="outline" className="bg-red-50 text-red-600 text-xs">
                                                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                                                            Alergias
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <div className="text-sm text-slate-500 flex items-center gap-2">
                                                                    <span>{getConsultationTypeLabel(appointment.type)}</span>
                                                                    {appointment.patient.bloodType && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span className="flex items-center gap-1">
                                                                                <Droplet className="h-3 w-3 text-red-400" />
                                                                                {appointment.patient.bloodType}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                                {appointment.reason && (
                                                                    <div className="text-xs text-slate-400 mt-1 italic line-clamp-1">
                                                                        "{appointment.reason}"
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <Badge className={getStatusColor(appointment.status)}>
                                                                {getStatusLabel(appointment.status)}
                                                            </Badge>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" disabled={actionLoading === appointment.id}>
                                                                        {actionLoading === appointment.id ? (
                                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                                        ) : (
                                                                            <MoreHorizontal className="h-4 w-4" />
                                                                        )}
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="bg-white">
                                                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                                                    <DropdownMenuSeparator />
                                                                    {/* Iniciar consulta: solo si está programada/confirmada y no hay ninguna consulta activa */}
                                                                    {(appointment.status === 'scheduled' || appointment.status === 'confirmed') && (
                                                                        <DropdownMenuItem 
                                                                            onClick={() => handleAppointmentAction(appointment.id, 'start', appointment)}
                                                                            className="text-blue-600"
                                                                            disabled={activeConsultation !== null && activeConsultation.id !== appointment.id}
                                                                        >
                                                                            <Play className="h-4 w-4 mr-2" />
                                                                            Iniciar Consulta
                                                                            {activeConsultation && activeConsultation.id !== appointment.id && (
                                                                                <span className="text-xs text-slate-400 ml-2">(Hay consulta activa)</span>
                                                                            )}
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    {/* Consulta completada */}
                                                                    {appointment.status === 'in_progress' && (
                                                                        <DropdownMenuItem 
                                                                            onClick={() => handleAppointmentAction(appointment.id, 'complete', appointment)}
                                                                            className="text-green-600"
                                                                        >
                                                                            <CheckCircle className="h-4 w-4 mr-2" />
                                                                            Completar Consulta
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    {/* Ver paciente */}
                                                                    <DropdownMenuItem onClick={() => {
                                                                        const patientData = {
                                                                            id: appointment.patient.id,
                                                                            name: appointment.patient.name,
                                                                            cedula: appointment.patient.cedula,
                                                                            bloodType: appointment.patient.bloodType,
                                                                            allergies: appointment.patient.allergies,
                                                                            dob: appointment.patient.dob,
                                                                            status: 'active' as const,
                                                                            lastVisit: appointment.date
                                                                        }
                                                                        setSelectedPatient(patientData)
                                                                        setSelectedAppointment(appointment)
                                                                        loadPatientResults(patientData.id)
                                                                        setShowPatientDialog(true)
                                                                    }}>
                                                                        <Eye className="h-4 w-4 mr-2" />
                                                                        Ver Paciente
                                                                    </DropdownMenuItem>
                                                                    {/* Receta médica: solo si la consulta está en curso o ha finalizado */}
                                                                    {(appointment.status === 'in_progress' || appointment.status === 'completed') && (
                                                                        <DropdownMenuItem onClick={() => {
                                                                            setPrescriptionForm({ 
                                                                                ...prescriptionForm, 
                                                                                patientId: appointment.patient.id,
                                                                                appointmentId: appointment.id 
                                                                            })
                                                                            setShowPrescriptionDialog(true)
                                                                        }}>
                                                                            <Pill className="h-4 w-4 mr-2" />
                                                                            Nueva Receta
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    <DropdownMenuSeparator />
                                                                    {/* Reprogramar: solo si no está en curso, completado o cancelado */}
                                                                    {(appointment.status === 'scheduled' || appointment.status === 'confirmed') && (
                                                                        <DropdownMenuItem onClick={() => {
                                                                            setSelectedAppointment(appointment)
                                                                            setRescheduleForm({
                                                                                appointmentId: appointment.id,
                                                                                newDate: '',
                                                                                newTime: '',
                                                                                reason: ''
                                                                            })
                                                                            setShowRescheduleDialog(true)
                                                                        }}>
                                                                            <CalendarIcon className="h-4 w-4 mr-2" />
                                                                            Reprogramar
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    {/* Cancelar: solo si no se ha completado o ya se ha cancelado */}
                                                                    {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                                                                        <DropdownMenuItem 
                                                                            onClick={() => handleAppointmentAction(appointment.id, 'cancel', appointment)}
                                                                            className="text-red-600"
                                                                        >
                                                                            <X className="h-4 w-4 mr-2" />
                                                                            Cancelar Cita
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </ScrollArea>
                            ) : calendarView === 'week' ? (
                                <div className="overflow-x-auto">
                                    <div className="min-w-[700px]">
                                        <div className="grid grid-cols-7 border-b">
                                            {getWeekDays().map((day) => (
                                                <div 
                                                    key={day.toISOString()}
                                                    className={cn(
                                                        "p-3 text-center border-r last:border-r-0",
                                                        isToday(day) && "bg-teal-50"
                                                    )}
                                                >
                                                    <div className="text-xs text-slate-500 uppercase">
                                                        {format(day, 'EEE', { locale: es })}
                                                    </div>
                                                    <div className={cn(
                                                        "text-lg font-semibold",
                                                        isToday(day) ? "text-teal-600" : "text-slate-900"
                                                    )}>
                                                        {format(day, 'd')}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-7 min-h-[350px]">
                                            {getWeekDays().map((day) => {
                                                const dayAppointments = getAppointmentsForDate(day)
                                                return (
                                                    <div 
                                                        key={day.toISOString()}
                                                        className={cn(
                                                            "p-2 border-r last:border-r-0",
                                                            isToday(day) && "bg-teal-50/30"
                                                        )}
                                                    >
                                                        {dayAppointments.map((apt) => (
                                                            <div
                                                                key={apt.id}
                                                                className={cn(
                                                                    "text-xs p-2 rounded-lg mb-1",
                                                                    apt.type === 'emergencia' ? 'bg-red-100 border-l-2 border-red-500' :
                                                                    apt.type === 'primera_vez' ? 'bg-blue-100 border-l-2 border-blue-500' :
                                                                    'bg-slate-100 border-l-2 border-slate-400'
                                                                )}
                                                            >
                                                                <div className="font-medium">{apt.time?.slice(0, 5)}</div>
                                                                <div className="truncate">{apt.patient.name}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <div className="min-w-[700px]">
                                        <div className="grid grid-cols-7 border-b">
                                            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
                                                <div key={day} className="p-2 text-center text-xs text-slate-500 uppercase font-medium border-r last:border-r-0">
                                                    {day}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-7">
                                            {getMonthDays().map((day) => {
                                                const dayAppointments = getAppointmentsForDate(day)
                                                const isCurrentMonth = isSameMonth(day, selectedDate)
                                                return (
                                                    <div 
                                                        key={day.toISOString()}
                                                        className={cn(
                                                            "min-h-[80px] p-1 border-r border-b last:border-r-0",
                                                            isToday(day) && "bg-teal-50",
                                                            !isCurrentMonth && "bg-slate-50/50"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "text-xs font-medium mb-1",
                                                            isToday(day) ? "text-teal-600" : isCurrentMonth ? "text-slate-900" : "text-slate-400"
                                                        )}>
                                                            {format(day, 'd')}
                                                        </div>
                                                        {dayAppointments.slice(0, 2).map((apt) => (
                                                            <div
                                                                key={apt.id}
                                                                className={cn(
                                                                    "text-[10px] p-1 rounded mb-0.5 truncate",
                                                                    apt.type === 'emergencia' ? 'bg-red-100 text-red-700' :
                                                                    apt.type === 'primera_vez' ? 'bg-blue-100 text-blue-700' :
                                                                    'bg-slate-100 text-slate-700'
                                                                )}
                                                            >
                                                                {apt.time?.slice(0, 5)} {apt.patient.name.split(' ')[0]}
                                                            </div>
                                                        ))}
                                                        {dayAppointments.length > 2 && (
                                                            <div className="text-[10px] text-slate-500 text-center">
                                                                +{dayAppointments.length - 2} más
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Acciones rápidas */}
                    <div className="space-y-6">
                        {/* Banner de error de validación */}
                        {validationError && (
                            <Card className="border-0 shadow-lg border-l-4 border-l-red-500 bg-red-50">
                                <CardContent className="py-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-red-700">
                                            <AlertCircle className="h-4 w-4" />
                                            <span className="text-sm font-medium">{validationError}</span>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            onClick={() => setValidationError('')}
                                            className="text-red-700 hover:text-red-900 hover:bg-red-100"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Banner de consulta activa */}
                        {activeConsultation && (
                            <Card className="border-0 shadow-lg border-l-4 border-l-blue-500 bg-blue-50">
                                <CardContent className="py-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-blue-700">
                                            <Activity className="h-4 w-4 animate-pulse" />
                                            <span className="text-sm">
                                                <span className="font-medium">Consulta activa:</span> {activeConsultation.patient.name}
                                            </span>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            onClick={() => handleAppointmentAction(activeConsultation.id, 'complete', activeConsultation)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            <CheckCircle className="h-4 w-4 mr-1" />
                                            Completar
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Card className="border-0 shadow-lg">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Activity className="h-5 w-5 text-teal-600" />
                                    Acciones Rápidas
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Button 
                                    className={cn(
                                        "w-full justify-start gap-3 h-12 transition-all",
                                        activeConsultation 
                                            ? "bg-green-600 hover:bg-green-700 text-white"
                                            : "bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white shadow-md hover:shadow-lg"
                                    )}
                                    disabled={actionLoading !== null}
                                    onClick={() => {
                                        if (activeConsultation) {
                                            handleAppointmentAction(activeConsultation.id, 'complete', activeConsultation)
                                        } else {
                                            const next = dashboardData?.appointments.find(
                                                a => a.status === 'confirmed' || a.status === 'scheduled'
                                            )
                                            if (next) {
                                                handleAppointmentAction(next.id, 'start', next)
                                            } else {
                                                setValidationError('No hay citas programadas para iniciar.')
                                            }
                                        }
                                    }}
                                >
                                    {activeConsultation ? (
                                        <CheckCircle className="h-5 w-5" />
                                    ) : (
                                        <Play className="h-5 w-5" />
                                    )}
                                    <span className="font-medium">
                                        {activeConsultation ? 'Completar Consulta' : 'Iniciar Consulta'}
                                    </span>
                                </Button>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button 
                                        variant="outline" 
                                        className={cn(
                                            "flex-col h-auto py-3 gap-1.5",
                                            !activeConsultation && "opacity-60"
                                        )}
                                        disabled={!activeConsultation}
                                        onClick={() => {
                                            if (!activeConsultation) {
                                                setValidationError('Debe iniciar una consulta antes de crear una receta.')
                                                return
                                            }
                                            setPrescriptionForm({
                                                ...prescriptionForm,
                                                patientId: activeConsultation.patient.id,
                                                appointmentId: activeConsultation.id
                                            })
                                            setShowPrescriptionDialog(true)
                                        }}
                                    >
                                        <Pill className="h-5 w-5 text-blue-600" />
                                        <span className="text-xs font-medium">Nueva Receta</span>
                                    </Button>
                                    <Button 
                                        variant="outline" 
                                        className="flex-col h-auto py-3 gap-1.5 col-span-1"
                                        onClick={() => {
                                            setResultsForm({
                                                patientId: activeConsultation?.patient.id || '',
                                                examType: '',
                                                examName: '',
                                                resultValue: '',
                                                notes: '',
                                                isAbnormal: false
                                            })
                                            setShowResultsDialog(true)
                                        }}
                                    >
                                        <FileText className="h-5 w-5 text-purple-600" />
                                        <span className="text-xs font-medium">Subir Resultado</span>
                                    </Button>
                                </div>
                                {!activeConsultation && (
                                    <p className="text-xs text-center text-slate-400">
                                        Inicie una consulta para habilitar más acciones
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-lg border-l-4 border-l-orange-500">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
                                    <AlertCircle className="h-5 w-5" />
                                    Atención Requerida
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors cursor-pointer" onClick={() => document.querySelector('[value="results"]')?.dispatchEvent(new Event('click', { bubbles: true }))}>
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-orange-600" />
                                        <span className="text-sm font-medium">Resultados por revisar</span>
                                    </div>
                                    <Badge className="bg-red-500 text-white text-xs">{dashboardData?.stats.pendingResults || 0}</Badge>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-yellow-600" />
                                        <span className="text-sm font-medium">Pacientes en espera</span>
                                    </div>
                                    <Badge className="bg-yellow-500 text-xs">{dashboardData?.stats.waitingPatients || 0}</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Alertas clínicas: se muestra cuando hay elementos pendientes */}
                {((dashboardData?.stats.pendingResults || 0) > 3 || (dashboardData?.stats.waitingPatients || 0) > 5) && (
                    <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-amber-100 rounded-lg">
                                    <AlertTriangle className="w-5 h-5 text-amber-700" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-amber-900 mb-1">Alertas Clínicas</p>
                                    <div className="space-y-1 text-sm text-amber-800">
                                        {(dashboardData?.stats.pendingResults || 0) > 3 && (
                                            <p>• {dashboardData?.stats.pendingResults} resultados pendientes de revisión - priorice críticos</p>
                                        )}
                                        {(dashboardData?.stats.waitingPatients || 0) > 5 && (
                                            <p>• {dashboardData?.stats.waitingPatients} pacientes en espera - considere asistencia</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Tabs */}
                <Tabs defaultValue="results" className="space-y-4">
                    <TabsList className="bg-white border shadow-sm p-1">
                        <TabsTrigger value="results" className="gap-2 data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                            <FileText className="h-4 w-4" />
                            Resultados
                            {(dashboardData?.stats.pendingResults || 0) > 0 && (
                                <Badge variant="destructive" className="ml-1">
                                    {dashboardData?.stats.pendingResults}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="patients" className="gap-2 data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                            <Users className="h-4 w-4" />
                            Mis Pacientes
                        </TabsTrigger>
                        <TabsTrigger value="prescriptions" className="gap-2 data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                            <Pill className="h-4 w-4" />
                            Recetas
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="gap-2 data-[state=active]:bg-teal-600 data-[state=active]:text-white">
                            <Settings className="h-4 w-4" />
                            Configuración
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="results">
                        <Card className="border-0 shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-teal-600" />
                                    Resultados Pendientes
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {(dashboardData?.pendingResults || []).length === 0 ? (
                                    <div className="text-center py-16">
                                        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                                            <CheckCircle className="h-8 w-8 text-green-600" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-slate-700 mb-1">Todo al día</h3>
                                        <p className="text-slate-500 text-sm">No hay resultados pendientes por revisar</p>
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Paciente</TableHead>
                                                <TableHead>Examen</TableHead>
                                                <TableHead>Fecha</TableHead>
                                                <TableHead>Estado</TableHead>
                                                <TableHead>Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {dashboardData?.pendingResults.map((result) => (
                                                <TableRow key={result.id}>
                                                    <TableCell className="font-medium">{result.patientName}</TableCell>
                                                    <TableCell>{result.examName}</TableCell>
                                                    <TableCell>
                                                        {result.completedDate 
                                                            ? format(new Date(result.completedDate), 'd MMM', { locale: es })
                                                            : '-'
                                                        }
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={result.status === 'completado' ? 'default' : 'secondary'}>
                                                            {result.status === 'completado' ? 'Listo' : 
                                                             result.status === 'revisado' ? 'Revisado' : 
                                                             result.status === 'entregado' ? 'Entregado' : 'Pendiente'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-1">
                                                            {/* Botón de reseña */}
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                onClick={() => handleReviewResult(result.id)}
                                                                disabled={actionLoading === result.id || result.status === 'revisado'}
                                                                title="Marcar como revisado"
                                                            >
                                                                {actionLoading === result.id ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Check className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                            {/* Botón Enviar por correo electrónico */}
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                onClick={() => {
                                                                    const patientEmail = dashboardData?.patients?.find(p => p.id === result.patientId)?.email
                                                                    if (patientEmail) {
                                                                        handleSendResultsByEmail(result.id, patientEmail)
                                                                    } else {
                                                                        const email = prompt('El paciente no tiene email registrado. Ingrese el email para enviar:')
                                                                        if (email) handleSendResultsByEmail(result.id, email)
                                                                    }
                                                                }}
                                                                disabled={actionLoading === `email-${result.id}`}
                                                                title="Enviar por email"
                                                            >
                                                                {actionLoading === `email-${result.id}` ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Mail className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                            {/* Botón Descargar PDF */}
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                                                onClick={() => handleDownloadResultPDF(result.id, result.examName)}
                                                                disabled={actionLoading === `pdf-${result.id}`}
                                                                title="Descargar PDF"
                                                            >
                                                                {actionLoading === `pdf-${result.id}` ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <FileDown className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                            {/* Botón Eliminar */}
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => handleDeleteResult(result.id)}
                                                                disabled={actionLoading === `delete-${result.id}`}
                                                                title="Eliminar resultado"
                                                            >
                                                                {actionLoading === `delete-${result.id}` ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="patients">
                        <Card className="border-0 shadow-lg">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>Mis Pacientes</CardTitle>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input
                                            placeholder="Buscar..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-9 w-64"
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Paciente</TableHead>
                                            <TableHead>Cédula</TableHead>
                                            <TableHead>Sangre</TableHead>
                                            <TableHead>Última Visita</TableHead>
                                            <TableHead>Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredPatients.map((patient) => (
                                            <TableRow key={patient.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center">
                                                            <User className="h-4 w-4 text-teal-600" />
                                                        </div>
                                                        <span className="font-medium">{patient.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{patient.cedula}</TableCell>
                                                <TableCell>
                                                    {patient.bloodType && (
                                                        <Badge variant="outline" className="gap-1">
                                                            <Droplet className="h-3 w-3 text-red-500" />
                                                            {patient.bloodType}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {patient.lastVisit 
                                                        ? format(new Date(patient.lastVisit), 'd MMM', { locale: es })
                                                        : '-'
                                                    }
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm"
                                                            title="Ver ficha del paciente"
                                                            onClick={() => {
                                                                setSelectedPatient(patient)
                                                                loadPatientResults(patient.id)
                                                                setShowPatientDialog(true)
                                                            }}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm"
                                                            title="Cargar/Enviar Resultados"
                                                            onClick={() => {
                                                                setResultsForm({
                                                                    ...resultsForm,
                                                                    patientId: patient.id
                                                                })
                                                                setShowResultsDialog(true)
                                                            }}
                                                        >
                                                            <Send className="h-4 w-4 text-teal-600" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="prescriptions">
                        <Card className="border-0 shadow-lg">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>Recetas Emitidas</CardTitle>
                                    <Button onClick={() => setShowPrescriptionDialog(true)}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Nueva Receta
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Paciente</TableHead>
                                            <TableHead>Medicamento</TableHead>
                                            <TableHead>Dosis</TableHead>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Refills</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(dashboardData?.prescriptions || []).map((rx) => (
                                            <TableRow key={rx.id}>
                                                <TableCell className="font-medium">{rx.patientName}</TableCell>
                                                <TableCell className="max-w-[150px]">
                                                    <span className="block truncate" title={rx.medication}>
                                                        {rx.medication}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{rx.dosage}</TableCell>
                                                <TableCell>
                                                    {format(new Date(rx.startDate), 'd MMM', { locale: es })}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{rx.refillsRemaining}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => startEditingPrescription(rx)}
                                                            disabled={actionLoading === rx.id}
                                                            title="Editar receta"
                                                        >
                                                            <Pencil className="h-4 w-4 text-amber-600" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleSendPrescriptionEmail(rx)}
                                                            disabled={actionLoading === rx.id}
                                                            title="Enviar por correo"
                                                        >
                                                            {actionLoading === rx.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Mail className="h-4 w-4 text-blue-600" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeletePrescription(rx.id)}
                                                            disabled={actionLoading === rx.id}
                                                            title="Eliminar receta"
                                                        >
                                                            <Trash2 className="h-4 w-4 text-red-600" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Configuraciones Tab */}
                    <TabsContent value="settings">
                        <Card className="border-0 shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Settings className="h-5 w-5 text-teal-600" />
                                    Configuración de Disponibilidad
                                </CardTitle>
                                <CardDescription>
                                    Configure sus días y horarios de atención
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Días disponibles */}
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Días Disponibles</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map((day) => (
                                            <Button
                                                key={day}
                                                variant={profileSettings.available_days.includes(day) ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => {
                                                    setProfileSettings(prev => ({
                                                        ...prev,
                                                        available_days: prev.available_days.includes(day)
                                                            ? prev.available_days.filter(d => d !== day)
                                                            : [...prev.available_days, day]
                                                    }))
                                                }}
                                                className={profileSettings.available_days.includes(day) ? 'bg-teal-600 hover:bg-teal-700' : ''}
                                            >
                                                {day.charAt(0).toUpperCase() + day.slice(1)}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                {/* Horas de trabajo */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="start_time">Hora de Inicio</Label>
                                        <Input
                                            id="start_time"
                                            type="time"
                                            value={profileSettings.start_time}
                                            onChange={(e) => setProfileSettings(prev => ({ ...prev, start_time: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="end_time">Hora de Fin</Label>
                                        <Input
                                            id="end_time"
                                            type="time"
                                            value={profileSettings.end_time}
                                            onChange={(e) => setProfileSettings(prev => ({ ...prev, end_time: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="duration">Duración de Cita (minutos)</Label>
                                        <Select
                                            value={profileSettings.appointment_duration.toString()}
                                            onValueChange={(value) => setProfileSettings(prev => ({ ...prev, appointment_duration: parseInt(value) }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Duración" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white">
                                                <SelectItem value="15">15 minutos</SelectItem>
                                                <SelectItem value="20">20 minutos</SelectItem>
                                                <SelectItem value="30">30 minutos</SelectItem>
                                                <SelectItem value="45">45 minutos</SelectItem>
                                                <SelectItem value="60">60 minutos</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Botón Guardar */}
                                <div className="flex items-center gap-4 pt-4 border-t">
                                    <Button
                                        onClick={async () => {
                                            setIsSavingProfile(true)
                                            setProfileSaveMessage('')
                                            try {
                                                const token = localStorage.getItem('doctor_access_token')
                                                const response = await fetch('/api/doctors/profile', {
                                                    method: 'PATCH',
                                                    headers: {
                                                        'Content-Type': 'application/json',
                                                        'Authorization': `Bearer ${token}`
                                                    },
                                                    body: JSON.stringify(profileSettings)
                                                })
                                                const data = await response.json()
                                                if (response.ok) {
                                                    setProfileSaveMessage('Configuración guardada correctamente')
                                                } else {
                                                    setProfileSaveMessage(data.error || 'Error al guardar')
                                                }
                                            } catch {
                                                setProfileSaveMessage('Error de conexión')
                                            } finally {
                                                setIsSavingProfile(false)
                                                setTimeout(() => setProfileSaveMessage(''), 3000)
                                            }
                                        }}
                                        disabled={isSavingProfile || profileSettings.available_days.length === 0}
                                        className="bg-teal-600 hover:bg-teal-700 text-white"
                                    >
                                        {isSavingProfile ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Save className="h-4 w-4 mr-2" />
                                        )}
                                        Guardar Configuración
                                    </Button>
                                    {profileSaveMessage && (
                                        <span className={`text-sm ${profileSaveMessage.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                                            {profileSaveMessage}
                                        </span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>

            {/* Paciente Dialog */}
            <Dialog open={showPatientDialog} onOpenChange={(open) => {
                setShowPatientDialog(open)
                if (!open) setIsEditingPatient(false)
            }}>
                <DialogContent className="max-w-2xl bg-white">
                    <DialogHeader className="pr-10">
                        <div className="flex items-center justify-between">
                            <DialogTitle>Ficha del Paciente</DialogTitle>
                            {selectedPatient && !isEditingPatient && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={startEditingPatient}
                                    className="mr-2"
                                >
                                    <Pencil className="h-4 w-4 mr-1" />
                                    Editar
                                </Button>
                            )}
                        </div>
                    </DialogHeader>
                    {selectedPatient && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
                                    <User className="h-8 w-8 text-teal-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">{selectedPatient.name}</h3>
                                    <p className="text-slate-500">{selectedPatient.cedula}</p>
                                </div>
                            </div>
                            
                            {/* Información de acceso al portal del paciente */}
                            <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl">
                                <Label className="text-xs text-teal-700 font-semibold flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    DATOS PARA VER RESULTADOS EN PORTAL
                                </Label>
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <div>
                                        <span className="text-xs text-slate-500">Cédula:</span>
                                        <p className="font-mono font-medium text-slate-900">{selectedPatient.cedula}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-500">Código de Acceso:</span>
                                        <p className="font-mono font-medium text-teal-600">{selectedPatient.accessCode || 'No asignado'}</p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Datos editables del paciente */}
                            {isEditingPatient ? (
                                <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                    <Label className="text-xs text-blue-600 font-semibold">EDITAR DATOS DEL PACIENTE</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="bloodType">Tipo de Sangre</Label>
                                            <Select
                                                value={patientEditForm.bloodType}
                                                onValueChange={(value) => setPatientEditForm(prev => ({ ...prev, bloodType: value }))}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccione tipo de sangre" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white">
                                                    <SelectItem value="A+">A+</SelectItem>
                                                    <SelectItem value="A-">A-</SelectItem>
                                                    <SelectItem value="B+">B+</SelectItem>
                                                    <SelectItem value="B-">B-</SelectItem>
                                                    <SelectItem value="AB+">AB+</SelectItem>
                                                    <SelectItem value="AB-">AB-</SelectItem>
                                                    <SelectItem value="O+">O+</SelectItem>
                                                    <SelectItem value="O-">O-</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="allergies">Alergias (separadas por coma)</Label>
                                            <Input
                                                id="allergies"
                                                value={patientEditForm.allergies}
                                                onChange={(e) => setPatientEditForm(prev => ({ ...prev, allergies: e.target.value }))}
                                                placeholder="Penicilina, Mariscos, Polen..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="patientEmail">Email del Paciente</Label>
                                            <Input
                                                id="patientEmail"
                                                type="email"
                                                value={patientEditForm.email}
                                                onChange={(e) => setPatientEditForm(prev => ({ ...prev, email: e.target.value }))}
                                                placeholder="paciente@email.com"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="patientPhone">Teléfono</Label>
                                            <Input
                                                id="patientPhone"
                                                type="tel"
                                                value={patientEditForm.phone}
                                                onChange={(e) => setPatientEditForm(prev => ({ ...prev, phone: e.target.value }))}
                                                placeholder="+507 6000-0000"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <Button
                                            className="flex-1 bg-teal-600 text-white hover:bg-teal-700"
                                            onClick={handleEditPatient}
                                            disabled={actionLoading === 'editPatient'}
                                        >
                                            {actionLoading === 'editPatient' ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <Save className="h-4 w-4 mr-2" />
                                            )}
                                            Guardar Cambios
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => setIsEditingPatient(false)}
                                        >
                                            Cancelar
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-slate-50 rounded-lg">
                                            <Label className="text-xs text-slate-500">Tipo de Sangre</Label>
                                            <p className="font-medium flex items-center gap-2">
                                                <Droplet className="h-4 w-4 text-red-500" />
                                                {selectedPatient.bloodType || 'No registrado'}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-lg">
                                            <Label className="text-xs text-slate-500">Última Visita</Label>
                                            <p className="font-medium">
                                                {selectedPatient.lastVisit 
                                                    ? format(new Date(selectedPatient.lastVisit), "d MMM yyyy", { locale: es })
                                                    : 'Sin visitas'
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                                            <Label className="text-xs text-red-600 font-semibold">ALERGIAS</Label>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {selectedPatient.allergies.map((allergy, i) => (
                                                    <Badge key={i} className="bg-red-500 text-white">{allergy}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Historial de Resultados del Paciente */}
                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                        <Label className="text-xs text-slate-600 font-semibold flex items-center gap-2">
                                            <FileText className="h-3 w-3" />
                                            HISTORIAL DE RESULTADOS
                                        </Label>
                                        
                                        {loadingPatientResults ? (
                                            <div className="flex items-center justify-center py-4">
                                                <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                                                <span className="ml-2 text-sm text-slate-500">Cargando resultados...</span>
                                            </div>
                                        ) : patientResults.length === 0 ? (
                                            <p className="text-sm text-slate-500 mt-2">No hay resultados registrados para este paciente</p>
                                        ) : (
                                            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                                                {patientResults.map((result) => (
                                                    <div key={result.id} className="flex items-center justify-between p-2 bg-white rounded-lg border">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-medium text-sm">{result.examName}</span>
                                                                <Badge 
                                                                    variant={result.status === 'completado' ? 'default' : 'secondary'}
                                                                    className="text-xs"
                                                                >
                                                                    {result.status === 'completado' ? 'Listo' : 
                                                                     result.status === 'revisado' ? 'Revisado' : 
                                                                     result.status === 'en_proceso' ? 'En proceso' : 'Pendiente'}
                                                                </Badge>
                                                            </div>
                                                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                                                                <span>{result.examType}</span>
                                                                <span>•</span>
                                                                <span>{result.orderedDate ? format(new Date(result.orderedDate), 'd MMM yyyy', { locale: es }) : '-'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                                                onClick={() => handleDownloadResultPDF(result.id, result.examName)}
                                                                disabled={actionLoading === `pdf-${result.id}` || result.status !== 'completado'}
                                                                title="Descargar PDF"
                                                            >
                                                                {actionLoading === `pdf-${result.id}` ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <FileDown className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                onClick={() => {
                                                                    if (selectedPatient?.email) {
                                                                        handleSendResultsByEmail(result.id, selectedPatient.email)
                                                                    } else {
                                                                        const email = prompt('El paciente no tiene email registrado. Ingrese el email para enviar:')
                                                                        if (email) handleSendResultsByEmail(result.id, email)
                                                                    }
                                                                }}
                                                                disabled={actionLoading === `email-${result.id}` || (result.status !== 'completado' && result.status !== 'revisado')}
                                                                title="Enviar por email"
                                                            >
                                                                {actionLoading === `email-${result.id}` ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Mail className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => handleDeletePatientResult(result.id)}
                                                                disabled={actionLoading === `delete-result-${result.id}`}
                                                                title="Eliminar resultado"
                                                            >
                                                                {actionLoading === `delete-result-${result.id}` ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Notas del paciente de la cita */}
                            {selectedAppointment?.reason && (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                    <Label className="text-xs text-blue-600 font-semibold">NOTAS DEL PACIENTE</Label>
                                    <p className="mt-2 text-sm text-slate-700">{selectedAppointment.reason}</p>
                                </div>
                            )}

                            <div className="flex gap-2">
                                {/* Botón para iniciar la consulta: solo si hay una cita y no hay ninguna consulta activa */}
                                {selectedAppointment && (selectedAppointment.status === 'scheduled' || selectedAppointment.status === 'confirmed') && !activeConsultation && (
                                    <Button 
                                        className="flex-1 bg-teal-600 text-white hover:bg-teal-700"
                                        onClick={() => {
                                            handleAppointmentAction(selectedAppointment.id, 'start', selectedAppointment)
                                            setShowPatientDialog(false)
                                        }}
                                    >
                                        <Activity className="h-4 w-4 mr-2" />
                                        Iniciar Consulta
                                    </Button>
                                )}
                                {/* Botón de consulta completa: si el paciente tiene una consulta activa */}
                                {selectedAppointment && selectedAppointment.status === 'in_progress' && (
                                    <Button 
                                        className="flex-1 bg-green-600 text-white hover:bg-green-700"
                                        onClick={() => {
                                            handleAppointmentAction(selectedAppointment.id, 'complete', selectedAppointment)
                                            setShowPatientDialog(false)
                                        }}
                                    >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Completar Consulta
                                    </Button>
                                )}
                                {/* Botón de receta: solo si la consulta está activa o completada */}
                                <Button 
                                    variant="outline" 
                                    className="flex-1"
                                    disabled={!selectedAppointment || (selectedAppointment.status !== 'in_progress' && selectedAppointment.status !== 'completed')}
                                    onClick={() => {
                                        if (!selectedAppointment || (selectedAppointment.status !== 'in_progress' && selectedAppointment.status !== 'completed')) {
                                            setValidationError('Debe iniciar una consulta antes de crear una receta.')
                                            return
                                        }
                                        setPrescriptionForm({ 
                                            ...prescriptionForm, 
                                            patientId: selectedPatient.id,
                                            appointmentId: selectedAppointment.id 
                                        })
                                        setShowPatientDialog(false)
                                        setShowPrescriptionDialog(true)
                                    }}
                                >
                                    <Pill className="h-4 w-4 mr-2" />
                                    Nueva Receta
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Receta Dialog */}
            <Dialog open={showPrescriptionDialog} onOpenChange={(open) => {
                setShowPrescriptionDialog(open)
                if (!open) setValidationError('')
            }}>
                <DialogContent className="max-w-lg bg-white">
                    <DialogHeader>
                        <DialogTitle>Nueva Receta Médica</DialogTitle>
                        <DialogDescription>
                            {activeConsultation 
                                ? `Consulta activa con ${activeConsultation.patient.name}`
                                : 'Seleccione un paciente con consulta activa'}
                        </DialogDescription>
                    </DialogHeader>
                    
                    {validationError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {validationError}
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Paciente</Label>
                            {/* Check if any patients have active/completed consultations */}
                            {(dashboardData?.appointments.filter(a => a.status === 'in_progress' || a.status === 'completed').length || 0) === 0 ? (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    No tiene pacientes con consultas activas o completadas. Inicie una consulta primero.
                                </div>
                            ) : (
                                <Select 
                                    value={prescriptionForm.patientId}
                                    onValueChange={(value) => setPrescriptionForm({ ...prescriptionForm, patientId: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar paciente" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white">
                                        {/* Mostrar solo pacientes con consultas activas o completadas, utilizando el ID de la cita como clave para evitar duplicados */}
                                        {dashboardData?.appointments
                                            .filter(a => a.status === 'in_progress' || a.status === 'completed')
                                            .reduce((unique: typeof dashboardData.appointments, apt) => {
                                                // Desduplicar por ID de paciente, conservar la cita más reciente.
                                                const existing = unique.find(u => u.patient.id === apt.patient.id)
                                                if (!existing) unique.push(apt)
                                                return unique
                                            }, [])
                                            .map((apt) => (
                                                <SelectItem key={apt.id} value={apt.patient.id}>
                                                    {apt.patient.name} 
                                                    <span className="text-xs text-slate-500 ml-2">
                                                        ({apt.status === 'in_progress' ? 'En consulta' : 'Consulta completada'})
                                                    </span>
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Medicamento</Label>
                            <Input
                                placeholder="Ej: Losartán 50mg"
                                value={prescriptionForm.medicationName}
                                onChange={(e) => setPrescriptionForm({ ...prescriptionForm, medicationName: e.target.value })}
                                maxLength={100}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Dosis</Label>
                                <Input
                                    placeholder="Ej: 1 tableta"
                                    value={prescriptionForm.dosage}
                                    onChange={(e) => setPrescriptionForm({ ...prescriptionForm, dosage: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Frecuencia</Label>
                                <Input
                                    placeholder="Ej: Cada 8 horas"
                                    value={prescriptionForm.frequency}
                                    onChange={(e) => setPrescriptionForm({ ...prescriptionForm, frequency: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Duración</Label>
                                <Input
                                    placeholder="Ej: 7 días"
                                    value={prescriptionForm.duration}
                                    onChange={(e) => setPrescriptionForm({ ...prescriptionForm, duration: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Recargas Permitidas</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="10"
                                    placeholder="0"
                                    value={prescriptionForm.refillsAllowed}
                                    onChange={(e) => setPrescriptionForm({ ...prescriptionForm, refillsAllowed: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Instrucciones</Label>
                            <Textarea
                                placeholder="Instrucciones adicionales..."
                                value={prescriptionForm.instructions}
                                onChange={(e) => setPrescriptionForm({ ...prescriptionForm, instructions: e.target.value })}
                            />
                            <AINotesAssistant
                                noteType="prescription"
                                value={prescriptionForm.instructions}
                                onSuggestion={(text) => setPrescriptionForm({ ...prescriptionForm, instructions: text })}
                                medication={prescriptionForm.medicationName}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPrescriptionDialog(false)}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleCreatePrescription}
                            disabled={actionLoading === 'prescription' || !prescriptionForm.patientId}
                        >
                            {actionLoading === 'prescription' ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Check className="h-4 w-4 mr-2" />
                            )}
                            Crear Receta
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Editar Receta Dialog */}
            <Dialog open={showEditPrescriptionDialog} onOpenChange={(open) => {
                setShowEditPrescriptionDialog(open)
            }}>
                <DialogContent className="max-w-lg bg-white">
                    <DialogHeader>
                        <DialogTitle>Editar Receta</DialogTitle>
                        <DialogDescription>
                            Modifique los datos de la receta
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="editMedicationName">Medicamento</Label>
                                <Input
                                    id="editMedicationName"
                                    value={editPrescriptionForm.medicationName}
                                    onChange={(e) => setEditPrescriptionForm(prev => ({ ...prev, medicationName: e.target.value }))}
                                    placeholder="Nombre del medicamento"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="editDosage">Dosis</Label>
                                <Input
                                    id="editDosage"
                                    value={editPrescriptionForm.dosage}
                                    onChange={(e) => setEditPrescriptionForm(prev => ({ ...prev, dosage: e.target.value }))}
                                    placeholder="Ej: 500mg"
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="editFrequency">Frecuencia</Label>
                                <Input
                                    id="editFrequency"
                                    value={editPrescriptionForm.frequency}
                                    onChange={(e) => setEditPrescriptionForm(prev => ({ ...prev, frequency: e.target.value }))}
                                    placeholder="Ej: cada 8 horas"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="editDuration">Duración</Label>
                                <Input
                                    id="editDuration"
                                    value={editPrescriptionForm.duration}
                                    onChange={(e) => setEditPrescriptionForm(prev => ({ ...prev, duration: e.target.value }))}
                                    placeholder="Ej: 7 días"
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="editRefills">Recargas Permitidas</Label>
                            <Input
                                id="editRefills"
                                type="number"
                                min="0"
                                max="12"
                                value={editPrescriptionForm.refillsAllowed}
                                onChange={(e) => setEditPrescriptionForm(prev => ({ ...prev, refillsAllowed: parseInt(e.target.value) || 0 }))}
                            />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="editInstructions">Instrucciones</Label>
                            <Textarea
                                id="editInstructions"
                                value={editPrescriptionForm.instructions}
                                onChange={(e) => setEditPrescriptionForm(prev => ({ ...prev, instructions: e.target.value }))}
                                placeholder="Instrucciones adicionales..."
                                rows={3}
                            />
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditPrescriptionDialog(false)}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleEditPrescription}
                            disabled={actionLoading === 'editPrescription'}
                        >
                            {actionLoading === 'editPrescription' ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reprogramar Cita Dialog */}
            <Dialog open={showRescheduleDialog} onOpenChange={(open) => {
                setShowRescheduleDialog(open)
                if (!open) {
                    setValidationError('')
                    setSelectedAppointment(null)
                }
            }}>
                <DialogContent className="max-w-lg bg-white">
                    <DialogHeader>
                        <DialogTitle>Reprogramar Cita</DialogTitle>
                        {selectedAppointment && (
                            <DialogDescription>
                                Paciente: {selectedAppointment.patient.name} | 
                                Fecha actual: {format(new Date(selectedAppointment.date), "d 'de' MMMM", { locale: es })} a las {selectedAppointment.time?.slice(0, 5)}
                            </DialogDescription>
                        )}
                    </DialogHeader>
                    
                    {validationError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {validationError}
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nueva Fecha</Label>
                            <Input
                                type="date"
                                value={rescheduleForm.newDate}
                                min={format(new Date(), 'yyyy-MM-dd')}
                                onChange={(e) => setRescheduleForm({ ...rescheduleForm, newDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Nueva Hora</Label>
                            <Select 
                                value={rescheduleForm.newTime}
                                onValueChange={(value) => setRescheduleForm({ ...rescheduleForm, newTime: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar hora" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                    {['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
                                      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'].map(time => (
                                        <SelectItem key={time} value={time}>{time}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Motivo (opcional)</Label>
                            <Textarea
                                placeholder="Razón de la reprogramación..."
                                value={rescheduleForm.reason}
                                onChange={(e) => setRescheduleForm({ ...rescheduleForm, reason: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRescheduleDialog(false)}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleRescheduleAppointment}
                            disabled={actionLoading === 'reschedule' || !rescheduleForm.newDate || !rescheduleForm.newTime}
                        >
                            {actionLoading === 'reschedule' ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <CalendarIcon className="h-4 w-4 mr-2" />
                            )}
                            Reprogramar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Crear Resultado Dialog */}
            <Dialog open={showResultsDialog} onOpenChange={(open) => {
                setShowResultsDialog(open)
                if (!open) setValidationError('')
            }}>
                <DialogContent className="max-w-lg bg-white">
                    <DialogHeader>
                        <DialogTitle>Registrar Resultado de Laboratorio</DialogTitle>
                        <DialogDescription>
                            Ingrese los resultados del examen para el paciente
                        </DialogDescription>
                    </DialogHeader>
                    
                    {validationError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {validationError}
                        </div>
                    )}
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Paciente</Label>
                            {resultsForm.patientId ? (
                                <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-teal-600" />
                                        <span className="font-medium">
                                            {dashboardData?.patients?.find(p => p.id === resultsForm.patientId)?.name || 
                                             dashboardData?.appointments?.find(a => a.patient.id === resultsForm.patientId)?.patient.name ||
                                             'Paciente seleccionado'}
                                        </span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setResultsForm({ ...resultsForm, patientId: '' })}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <Select 
                                    value={resultsForm.patientId}
                                    onValueChange={(value) => setResultsForm({ ...resultsForm, patientId: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar paciente" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white">
                                        {dashboardData?.appointments
                                            .filter((apt, idx, arr) => 
                                                arr.findIndex(a => a.patient.id === apt.patient.id) === idx
                                            )
                                            .map(apt => (
                                                <SelectItem key={apt.patient.id} value={apt.patient.id}>
                                                    {apt.patient.name}
                                                </SelectItem>
                                            ))}
                                        {dashboardData?.patients?.filter(p => 
                                            !dashboardData?.appointments?.some(a => a.patient.id === p.id)
                                        ).map(patient => (
                                            <SelectItem key={patient.id} value={patient.id}>
                                                {patient.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tipo de Examen</Label>
                                <Select 
                                    value={resultsForm.examType}
                                    onValueChange={(value) => setResultsForm({ ...resultsForm, examType: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar tipo" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white">
                                        <SelectItem value="hematologia">Hematología</SelectItem>
                                        <SelectItem value="bioquimica">Bioquímica</SelectItem>
                                        <SelectItem value="microbiologia">Microbiología</SelectItem>
                                        <SelectItem value="urinalisis">Urianálisis</SelectItem>
                                        <SelectItem value="imagenologia">Imagenología</SelectItem>
                                        <SelectItem value="otro">Otro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Nombre del Examen</Label>
                                <Input
                                    placeholder="Ej: Hemograma completo"
                                    value={resultsForm.examName}
                                    onChange={(e) => setResultsForm({ ...resultsForm, examName: e.target.value })}
                                    maxLength={100}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Resultado</Label>
                            <Textarea
                                placeholder="Ingrese los valores del resultado..."
                                value={resultsForm.resultValue}
                                onChange={(e) => setResultsForm({ ...resultsForm, resultValue: e.target.value })}
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Notas adicionales (opcional)</Label>
                            <Textarea
                                placeholder="Observaciones, interpretación..."
                                value={resultsForm.notes}
                                onChange={(e) => setResultsForm({ ...resultsForm, notes: e.target.value })}
                                rows={2}
                            />
                            <AINotesAssistant
                                noteType="result"
                                value={resultsForm.notes}
                                onSuggestion={(text) => setResultsForm({ ...resultsForm, notes: text })}
                                examType={resultsForm.examType}
                                resultContext={resultsForm.resultValue}
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="isAbnormal"
                                checked={resultsForm.isAbnormal}
                                onChange={(e) => setResultsForm({ ...resultsForm, isAbnormal: e.target.checked })}
                                className="h-4 w-4 text-red-600 rounded border-gray-300"
                                title="Marcar como resultado anormal"
                            />
                            <Label htmlFor="isAbnormal" className="text-sm font-normal cursor-pointer">
                                Marcar como resultado anormal (requiere atención)
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowResultsDialog(false)}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleCreateResult}
                            disabled={actionLoading === 'result' || !resultsForm.patientId || !resultsForm.examType || !resultsForm.examName || !resultsForm.resultValue}
                        >
                            {actionLoading === 'result' ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Check className="h-4 w-4 mr-2" />
                            )}
                            Registrar Resultado
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
