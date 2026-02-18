'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Calendar as CalendarIcon, Clock, User, CheckCircle2, AlertCircle, Stethoscope, Shield, Lightbulb, Info } from 'lucide-react'
import { getOptimalTimeSlots, calculatePriority, type TimeSlot } from '@/lib/operations-research/scheduling'
import { cn } from '@/lib/utils'
import HCaptcha, { HCaptchaRef } from '@/components/ui/hcaptcha'

// Consejos inteligentes para la preparación por departamento: sugerencias contextuales basadas en inteligencia artificial.
const DEPARTMENT_TIPS: Record<string, { prep: string; bring: string[]; note?: string }> = {
    'Cardiología': {
        prep: 'Evite cafeína y ejercicio intenso 24h antes',
        bring: ['Electrocardiogramas previos', 'Lista de medicamentos actuales', 'Historial de presión arterial'],
        note: 'Si tiene marcapasos, informe al momento de agendar'
    },
    'Pediatría': {
        prep: 'Traiga el carnet de vacunación actualizado',
        bring: ['Carnet de vacunas', 'Historial de peso/talla', 'Lista de alergias conocidas'],
    },
    'Neurología': {
        prep: 'Duerma bien la noche anterior a su cita',
        bring: ['Estudios de imagen previos (MRI/CT)', 'Diario de síntomas si aplica', 'Lista de medicamentos'],
    },
    'Ortopedia': {
        prep: 'Use ropa cómoda que permita examinar la zona afectada',
        bring: ['Radiografías previas', 'Historial de lesiones', 'Lista de tratamientos realizados'],
    },
    'Oncología': {
        prep: 'Venga acompañado si es su primera consulta',
        bring: ['Biopsias y estudios previos', 'Historial médico completo', 'Lista de medicamentos y tratamientos'],
        note: 'Reservamos tiempo adicional para responder todas sus preguntas'
    },
    'Medicina General': {
        prep: 'Ayuno de 8 horas si requiere exámenes de sangre',
        bring: ['Resultados de exámenes recientes', 'Lista de medicamentos actuales'],
    },
    'Ginecología': {
        prep: 'Use ropa cómoda. Evite duchas vaginales 24h antes',
        bring: ['Resultados de exámenes previos', 'Historial menstrual', 'Lista de medicamentos actuales'],
    },
    'Traumatología': {
        prep: 'Use ropa cómoda que permita examinar la zona afectada',
        bring: ['Radiografías o resonancias previas', 'Historial de lesiones', 'Lista de tratamientos realizados'],
    },
    'Dermatología': {
        prep: 'Acuda sin maquillaje ni cremas en la zona a evaluar',
        bring: ['Fotos de la evolución de la lesión', 'Lista de productos usados', 'Historial de tratamientos'],
    },
    'Oftalmología': {
        prep: 'No conduzca si le aplicarán gotas de dilatación',
        bring: ['Lentes actuales', 'Recetas ópticas previas', 'Historial de enfermedades oculares'],
        note: 'La dilatación puede afectar su visión por 3-4 horas'
    },
    'Psiquiatría': {
        prep: 'Anote sus síntomas y preocupaciones principales',
        bring: ['Lista de medicamentos actuales', 'Historial de tratamientos previos', 'Diario de síntomas si lo tiene'],
        note: 'La primera consulta suele durar más tiempo para una evaluación completa'
    },
}

const DEPARTMENTS = [
    'Medicina General',
    'Cardiología',
    'Neurología',
    'Pediatría',
    'Ginecología',
    'Traumatología',
    'Dermatología',
    'Oftalmología',
    'Psiquiatría',
    'Oncología',
    'Ortopedia',
]

const CONSULTATION_TYPES = [
    { value: 'primera_vez', label: 'Primera Vez' },
    { value: 'control', label: 'Control' },
    { value: 'emergencia', label: 'Emergencia' },
]

const BLOOD_TYPES = [
    'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
]

interface Doctor {
    id: string
    name: string
    specialty: string
    photo_url?: string
}

interface FormData {
    department: string
    doctor_id: string
    date: string
    time: string
    type: 'primera_vez' | 'control' | 'emergencia'
    name: string
    cedula: string
    bloodType: string
    email: string
    phone: string
    notes: string
}

export function AppointmentBooking() {
    const [formData, setFormData] = useState<FormData>({
        department: '',
        doctor_id: '',
        date: '',
        time: '',
        type: 'primera_vez',
        name: '',
        cedula: '',
        bloodType: '',
        email: '',
        phone: '',
        notes: '',
    })
    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
    const [doctors, setDoctors] = useState<Doctor[]>([])
    const [loadingDoctors, setLoadingDoctors] = useState(false)
    const [loading, setLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [appointmentNumber, setAppointmentNumber] = useState('')
    const [assignedDoctor, setAssignedDoctor] = useState<Doctor | null>(null)
    const [captchaToken, setCaptchaToken] = useState<string | null>(null)
    const [formError, setFormError] = useState<string | null>(null)
    const captchaRef = useRef<HCaptchaRef>(null)

    // Cargar médicos cuando se selecciona el departamento
    useEffect(() => {
        if (formData.department) {
            setLoadingDoctors(true)
            // Utilizar punto final público con filtro especializado
            fetch(`/api/doctors/public?specialty=${encodeURIComponent(formData.department)}`)
                .then(res => res.json())
                .then(data => {
                    setDoctors(data.doctors || [])
                })
                .catch(err => console.error('Error fetching doctors:', err))
                .finally(() => setLoadingDoctors(false))
        } else {
            setDoctors([])
        }
    }, [formData.department])

    // Cargar franjas horarias cuando se seleccionan el departamento y la fecha.
    useEffect(() => {
        if (formData.department && formData.date) {
            const slots = getOptimalTimeSlots(formData.department, formData.date)
            setAvailableSlots(slots.filter((s) => s.available))
        } else {
            setAvailableSlots([])
        }
    }, [formData.department, formData.date])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormError(null)
        setLoading(true)

        // Validar captcha si está configurado
        const siteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY
        if (siteKey && !captchaToken) {
            setFormError('Por favor complete la verificación de seguridad')
            setLoading(false)
            return
        }

        try {
            const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    captchaToken
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                // Restablecer captcha en caso de error
                captchaRef.current?.reset()
                setCaptchaToken(null)
                
                if (response.status === 429) {
                    setFormError(data.error || 'Ha excedido el límite de citas. Por favor espere.')
                } else {
                    throw new Error(data.error || 'Error al crear la cita')
                }
                return
            }

            const priority = calculatePriority(formData.type, formData.department)
            const appointmentNum = data.appointment.appointmentNumber
            
            // Almacenar médico asignado para confirmación
            const selectedDoctor = doctors.find(d => d.id === formData.doctor_id)
            if (selectedDoctor) {
                setAssignedDoctor(selectedDoctor)
            }

            setAppointmentNumber(appointmentNum)
            setSubmitted(true)
        } catch (error: any) {
            setFormError(error.message || 'Error al crear la cita. Por favor intente nuevamente.')
            // Restablecer captcha en caso de error
            captchaRef.current?.reset()
            setCaptchaToken(null)
        } finally {
            setLoading(false)
        }
    }

    const getTodayDate = () => {
        const today = new Date()
        const year = today.getFullYear()
        const month = String(today.getMonth() + 1).padStart(2, '0')
        const day = String(today.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    if (submitted) {
        return (
            <div className="bg-gradient-to-br from-teal-50 to-blue-50 p-8 rounded-2xl border border-teal-200">
                <div className="text-center max-w-2xl mx-auto">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-600 rounded-full mb-4">
                        <CheckCircle2 className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-2">
                        ¡Cita Agendada Exitosamente!
                    </h3>
                    <p className="text-slate-600 mb-6">
                        Su consulta ha sido programada. Por favor conserve este número de turno:
                    </p>

                    <div className="bg-white p-6 rounded-xl border-2 border-teal-600 mb-6">
                        <p className="text-sm text-slate-600 font-medium mb-1">Número de Turno</p>
                        <p className="text-4xl font-bold text-teal-600 tracking-wider mb-4">{appointmentNumber}</p>

                        <div className="grid grid-cols-2 gap-4 text-left mt-4 pt-4 border-t border-slate-200">
                            <div>
                                <p className="text-xs text-slate-500">Departamento</p>
                                <p className="font-semibold text-slate-900">{formData.department}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Fecha y Hora</p>
                                <p className="font-semibold text-slate-900">
                                    {new Date(formData.date).toLocaleDateString('es-PA')} a las {formData.time}
                                </p>
                            </div>
                            {assignedDoctor && (
                                <div>
                                    <p className="text-xs text-slate-500">Doctor Asignado</p>
                                    <p className="font-semibold text-slate-900">{assignedDoctor.name}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-xs text-slate-500">Tipo de Consulta</p>
                                <p className="font-semibold text-slate-900">
                                    {CONSULTATION_TYPES.find((t) => t.value === formData.type)?.label}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Tiempo de Espera Estimado</p>
                                <p className="font-semibold text-slate-900">
                                    {availableSlots.find((s) => s.time === formData.time)?.waitTime || 15} min
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-blue-900 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>
                                Por favor llegue 15 minutos antes de su cita. Recibirá un mensaje de confirmación
                                al número {formData.phone}.
                            </span>
                        </p>
                    </div>

                    <Button
                        onClick={() => {
                            setSubmitted(false)
                            setAssignedDoctor(null)
                                            setFormData({
                                department: '',
                                doctor_id: '',
                                date: '',
                                time: '',
                                type: 'primera_vez',
                                name: '',
                                cedula: '',
                                bloodType: '',
                                email: '',
                                phone: '',
                                notes: '',
                            })
                        }}
                        variant="outline"
                        className="border-teal-600 text-teal-600 hover:bg-teal-50"
                    >
                        Agendar Otra Cita
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 lg:p-8 rounded-2xl shadow-xl border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Selección de departamento */}
                <div className="space-y-2">
                    <Label htmlFor="department" className="text-slate-700 font-medium">
                        Departamento Médico *
                    </Label>
                    <Select
                        value={formData.department}
                        onValueChange={(value) => setFormData({ ...formData, department: value, time: '' })}
                        required
                    >
                        <SelectTrigger className="border-slate-300 focus:border-teal-500 focus:ring-teal-500">
                            <SelectValue placeholder="Seleccione departamento" />
                        </SelectTrigger>
                        <SelectContent className="z-[100] bg-white shadow-xl">
                            {DEPARTMENTS.map((dept) => (
                                <SelectItem key={dept} value={dept}>
                                    {dept}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Tipo de consulta */}
                <div className="space-y-2">
                    <Label htmlFor="type" className="text-slate-700 font-medium">
                        Tipo de Consulta *
                    </Label>
                    <Select
                        value={formData.type}
                        onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                        required
                    >
                        <SelectTrigger className="border-slate-300 focus:border-teal-500 focus:ring-teal-500">
                            <SelectValue placeholder="Seleccione tipo" />
                        </SelectTrigger>
                        <SelectContent className="z-[100] bg-white shadow-xl">
                            {CONSULTATION_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Consejos inteligentes: se muestra cuando se selecciona el departamento */}
                {formData.department && DEPARTMENT_TIPS[formData.department] && (
                    <div className="md:col-span-2 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <div className="p-1.5 bg-teal-100 rounded-md">
                                <Lightbulb className="w-4 h-4 text-teal-700" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-teal-900 mb-1">
                                    Preparación para {formData.department}
                                </p>
                                <p className="text-sm text-teal-800 mb-2">
                                    {DEPARTMENT_TIPS[formData.department].prep}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {DEPARTMENT_TIPS[formData.department].bring.map((item, i) => (
                                        <span key={i} className="inline-flex items-center text-xs bg-white/60 text-teal-700 px-2 py-1 rounded border border-teal-200">
                                            {item}
                                        </span>
                                    ))}
                                </div>
                                {DEPARTMENT_TIPS[formData.department].note && (
                                    <p className="mt-2 text-xs text-teal-600 flex items-center gap-1">
                                        <Info className="w-3 h-3" />
                                        {DEPARTMENT_TIPS[formData.department].note}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Selección de médico */}
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="doctor" className="text-slate-700 font-medium flex items-center gap-2">
                        <Stethoscope className="h-4 w-4" />
                        Doctor {doctors.length > 0 ? '(Opcional)' : ''}
                    </Label>
                    {!formData.department ? (
                        <div className="text-sm text-slate-500 p-3 bg-slate-50 rounded-lg border border-slate-200">
                            Seleccione un departamento primero
                        </div>
                    ) : loadingDoctors ? (
                        <div className="text-sm text-slate-500 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                            Cargando doctores...
                        </div>
                    ) : doctors.length === 0 ? (
                        <div className="text-sm text-amber-700 p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            No hay doctores disponibles en {formData.department}. Por favor seleccione otro departamento.
                        </div>
                    ) : (
                        <Select
                            value={formData.doctor_id}
                            onValueChange={(value) => setFormData({ ...formData, doctor_id: value })}
                        >
                            <SelectTrigger className="border-slate-300 focus:border-teal-500 focus:ring-teal-500">
                                <SelectValue placeholder="Seleccione doctor (o asignación automática)" />
                            </SelectTrigger>
                            <SelectContent className="z-[100] bg-white shadow-xl">
                                <SelectItem value="auto">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-slate-400" />
                                        <span>Asignación Automática</span>
                                    </div>
                                </SelectItem>
                                {doctors.map((doctor) => (
                                    <SelectItem key={doctor.id} value={doctor.id}>
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-teal-600" />
                                            <span>{doctor.name}</span>
                                            <span className="text-xs text-slate-500">({doctor.specialty})</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                {/* Selección de fecha */}
                <div className="space-y-2">
                    <Label htmlFor="date" className="text-slate-700 font-medium">
                        Fecha Deseada *
                    </Label>
                    <div className="relative">
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            id="date"
                            type="date"
                            min={getTodayDate()}
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value, time: '' })}
                            className="pl-10 border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                            required
                        />
                    </div>
                </div>

                {/* Selección de hora */}
                <div className="space-y-2">
                    <Label htmlFor="time" className="text-slate-700 font-medium">
                        Hora Preferida *
                    </Label>
                    <Select
                        value={formData.time}
                        onValueChange={(value) => setFormData({ ...formData, time: value })}
                        disabled={!formData.department || !formData.date || availableSlots.length === 0}
                        required
                    >
                        <SelectTrigger className="border-slate-300 focus:border-teal-500 focus:ring-teal-500">
                            <SelectValue placeholder={
                                !formData.department || !formData.date
                                    ? 'Seleccione dept. y fecha primero'
                                    : availableSlots.length === 0
                                        ? 'No hay slots disponibles'
                                        : 'Seleccione hora'
                            } />
                        </SelectTrigger>
                        <SelectContent className="z-[100] bg-white shadow-xl">
                            {availableSlots.map((slot, index) => {
                                const isRecommended = slot.load < 50 && index < 3
                                return (
                                    <SelectItem key={slot.time} value={slot.time}>
                                        <div className="flex items-center justify-between gap-4">
                                            <span className="flex items-center gap-2">
                                                {slot.time}
                                                {isRecommended && (
                                                    <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-medium">
                                                        Recomendado
                                                    </span>
                                                )}
                                            </span>
                                            <span className={cn(
                                                'text-xs px-2 py-0.5 rounded',
                                                slot.load < 50 ? 'bg-green-100 text-green-700' :
                                                    slot.load < 75 ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-orange-100 text-orange-700'
                                            )}>
                                                {slot.waitTime}min espera
                                            </span>
                                        </div>
                                    </SelectItem>
                                )
                            })}
                        </SelectContent>
                    </Select>
                    {availableSlots.length > 0 && availableSlots.some(s => s.load < 50) && !formData.time && (
                        <p className="text-xs text-teal-600 flex items-center gap-1">
                            <Lightbulb className="w-3 h-3" />
                            Los horarios marcados tienen menor tiempo de espera
                        </p>
                    )}
                </div>

                {/* Nombre del paciente */}
                <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-700 font-medium">
                        Nombre Completo *
                    </Label>
                    <Input
                        id="name"
                        type="text"
                        placeholder="Juan Pérez"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                        required
                    />
                </div>

                {/* Cedula */}
                <div className="space-y-2">
                    <Label htmlFor="cedula" className="text-slate-700 font-medium">
                        Cédula *
                    </Label>
                    <Input
                        id="cedula"
                        type="text"
                        placeholder="8-888-8888"
                        value={formData.cedula}
                        onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                        className="border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                        required
                    />
                </div>

                {/* Tipo de sangre */}
                <div className="space-y-2">
                    <Label htmlFor="bloodType" className="text-slate-700 font-medium flex items-center gap-2">
                        Tipo de Sangre
                        <span className="text-xs font-normal text-slate-500">(Opcional)</span>
                    </Label>
                    <Select
                        value={formData.bloodType}
                        onValueChange={(value) => setFormData({ ...formData, bloodType: value })}
                    >
                        <SelectTrigger className="border-slate-300 focus:border-teal-500 focus:ring-teal-500">
                            <SelectValue placeholder="Seleccione tipo de sangre" />
                        </SelectTrigger>
                        <SelectContent className="z-[100] bg-white shadow-xl">
                            <SelectItem value="unknown">No sé</SelectItem>
                            {BLOOD_TYPES.map((type) => (
                                <SelectItem key={type} value={type}>
                                    {type}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Teléfono */}
                <div className="space-y-2">
                    <Label htmlFor="phone" className="text-slate-700 font-medium">
                        Teléfono de Contacto *
                    </Label>
                    <Input
                        id="phone"
                        type="tel"
                        placeholder="6XXX-XXXX"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                        required
                        maxLength={9}
                    />
                    <p className="text-xs text-slate-500">Formato Panamá: 7-8 dígitos</p>
                </div>

                {/* Email (Optional) */}
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-700 font-medium flex items-center gap-2">
                        Correo Electrónico
                        <span className="text-xs font-normal text-slate-500">(Opcional)</span>
                    </Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="ejemplo@correo.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="border-slate-300 focus:border-teal-500 focus:ring-teal-500"
                    />
                    <p className="text-xs text-slate-500">Para recibir recordatorios y confirmaciones</p>
                </div>

                {/* Notas del paciente (opcional) */}
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes" className="text-slate-700 font-medium flex items-center gap-2">
                        Notas para el Doctor
                        <span className="text-xs font-normal text-slate-500">(Opcional)</span>
                    </Label>
                    <Textarea
                        id="notes"
                        placeholder="Describa brevemente el motivo de su consulta, síntomas o información relevante que desee compartir con el médico..."
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="border-slate-300 focus:border-teal-500 focus:ring-teal-500 min-h-[80px] resize-none"
                        maxLength={500}
                    />
                    <p className="text-xs text-slate-500">
                        {formData.notes.length}/500 caracteres
                    </p>
                </div>
            </div>

            {/* Visualización de error */}
            {formError && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-700 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{formError}</span>
                    </p>
                </div>
            )}

            {/* Verificación hCaptcha */}
            <div className="mt-6 flex flex-col items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Shield className="w-4 h-4" />
                    <span>Verificación de seguridad</span>
                </div>
                <HCaptcha
                    ref={captchaRef}
                    onVerify={(token) => setCaptchaToken(token)}
                    onExpire={() => setCaptchaToken(null)}
                    onError={() => {
                        setCaptchaToken(null)
                        setFormError('Error en la verificación. Por favor recargue la página.')
                    }}
                    theme="light"
                />
            </div>

            {/* Botón Enviar */}
            <div className="mt-6">
                <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white py-6 text-lg font-semibold shadow-lg"
                >
                    {loading ? (
                        <>
                            <Clock className="mr-2 h-5 w-5 animate-spin" />
                            Procesando...
                        </>
                    ) : (
                        <>
                            <CalendarIcon className="mr-2 h-5 w-5" />
                            Confirmar Cita
                        </>
                    )}
                </Button>
            </div>

            {formData.type === 'emergencia' && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-900 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>
                            <strong>Emergencias:</strong> Para casos críticos, llame al <strong>+507 XXX-XXXX</strong> o
                            acuda directamente a nuestra sala de emergencias 24/7.
                        </span>
                    </p>
                </div>
            )}
        </form>
    )
}
