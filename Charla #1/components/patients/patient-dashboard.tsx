'use client'

import { useState, useCallback } from 'react'
import useSWR, { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
} from '@/components/ui/alert-dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Plus,
    FileUp,
    Shield,
    RefreshCw,
    Users,
    UserCheck,
    Activity,
    AlertCircle,
    Search,
    Edit,
    Trash2,
    Eye,
    Lock,
    Upload,
    Download,
    Loader2,
    Calendar,
    Phone,
    Mail,
    MapPin,
    Heart,
    FileText
} from 'lucide-react'
import {
    getPatients,
    getPatientStats,
    createPatient,
    updatePatient,
    deletePatient,
    importPatients,
    seedDemoPatients,
} from '@/app/patient-actions'
import type { Patient, PatientFormData, PatientImportData, PatientStats, ImportJob } from '@/lib/patient-types'
import { useToast } from '@/hooks/use-toast'

export function PatientDashboard() {
    const [showForm, setShowForm] = useState(false)
    const [showImport, setShowImport] = useState(false)
    const [showDetail, setShowDetail] = useState(false)
    const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [dataError, setDataError] = useState<string | null>(null)
    const { toast } = useToast()

    // Buscar pacientes
    const { data: patientsData, isLoading: loadingPatients } = useSWR('patients', async () => {
        try {
            const result = await getPatients()
            if (result.error) {
                setDataError(`Error al cargar pacientes: ${result.error}`)
                return []
            }
            if (!result.data || result.data.length === 0) {
                // Generar pacientes de demostración si no existen.
                const seedResult = await seedDemoPatients()
                if (seedResult.success && seedResult.count > 0) {
                    mutate('stats')
                    const newResult = await getPatients()
                    return newResult.data || []
                }
            }
            setDataError(null)
            return result.data || []
        } catch (err: any) {
            setDataError(err.message || 'Error de conexión')
            return []
        }
    })

    // Obtener estadísticas
    const { data: statsData } = useSWR('stats', async () => {
        const result = await getPatientStats()
        return result.data || {
            totalPatients: 0,
            activePatients: 0,
            inactivePatients: 0,
            etlImported: 0,
            manualCreated: 0,
            newThisWeek: 0,
            newThisMonth: 0
        }
    })

    const refreshData = useCallback(() => {
        mutate('patients')
        mutate('stats')
    }, [])

    // Filtrar pacientes por término de búsqueda
    const filteredPatients = (patientsData || []).filter(patient =>
        patient.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.cedula.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (patient.email && patient.email.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    const handleCreateOrUpdate = async (formData: PatientFormData) => {
        setIsLoading(true)
        try {
            if (editingPatient) {
                const result = await updatePatient(editingPatient.id, formData)
                if (result.error) {
                    toast({ title: 'Error', description: result.error, variant: 'destructive' })
                } else {
                    toast({ title: 'Éxito', description: 'Paciente actualizado correctamente' })
                }
            } else {
                const result = await createPatient(formData)
                if (result.error) {
                    toast({ title: 'Error', description: result.error, variant: 'destructive' })
                } else {
                    toast({ title: 'Éxito', description: 'Paciente creado correctamente' })
                }
            }
            refreshData()
            setShowForm(false)
            setEditingPatient(null)
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async () => {
        if (deleteId) {
            setIsLoading(true)
            try {
                const result = await deletePatient(deleteId)
                if (result.error) {
                    toast({ title: 'Error', description: result.error, variant: 'destructive' })
                } else {
                    toast({ title: 'Éxito', description: 'Paciente eliminado correctamente' })
                }
                refreshData()
            } finally {
                setDeleteId(null)
                setIsLoading(false)
            }
        }
    }

    const handleImport = async (data: PatientImportData[], fileName: string) => {
        setIsLoading(true)
        try {
            const result = await importPatients(data, fileName)
            if (result.error) {
                toast({ title: 'Error', description: result.error, variant: 'destructive' })
            } else if (result.job) {
                toast({
                    title: 'Importación completada',
                    description: `${result.job.successful_records} registros importados, ${result.job.failed_records} fallidos`
                })
            }
            refreshData()
            setShowImport(false)
        } finally {
            setIsLoading(false)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <Badge className="bg-green-100 text-green-700">Activo</Badge>
            case 'inactive':
                return <Badge className="bg-gray-100 text-gray-700">Inactivo</Badge>
            case 'deceased':
                return <Badge className="bg-red-100 text-red-700">Fallecido</Badge>
            default:
                return <Badge>{status}</Badge>
        }
    }

    const getSourceBadge = (source: string) => {
        switch (source) {
            case 'etl_import':
                return <Badge variant="outline" className="text-blue-600 border-blue-300"><Upload className="w-3 h-3 mr-1" />ETL</Badge>
            case 'manual':
                return <Badge variant="outline" className="text-purple-600 border-purple-300"><Edit className="w-3 h-3 mr-1" />Manual</Badge>
            case 'api':
                return <Badge variant="outline" className="text-orange-600 border-orange-300">API</Badge>
            default:
                return <Badge variant="outline">{source}</Badge>
        }
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b shadow-sm sticky top-0 z-10">
                <div className="px-6 py-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                <Shield className="h-6 w-6 text-blue-600" />
                                Gestión de Pacientes
                            </h1>
                            <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                                <Lock className="h-3 w-3" />
                                Datos cifrados con AES-256-GCM
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={refreshData}>
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Actualizar
                            </Button>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="sm" onClick={() => setShowImport(true)}>
                                <FileUp className="h-4 w-4 mr-1" />
                                Importar ETL
                            </Button>
                            <Button className="bg-teal-600 hover:bg-teal-700 text-white" size="sm" onClick={() => setShowForm(true)}>
                                <Plus className="h-4 w-4 mr-1" />
                                Nuevo Paciente
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Contenido principal */}
            <main className="p-6 space-y-6">
                {/* Error Banner */}
                {dataError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <div>
                            <p className="text-sm font-medium text-red-800">{dataError}</p>
                            <p className="text-xs text-red-600 mt-1">Verifica que la tabla 'pacientes' existe en Supabase</p>
                        </div>
                    </div>
                )}

                {/* Estadisticas Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">Total Pacientes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold">{statsData?.totalPatients || 0}</span>
                                <Users className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">Activos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold">{statsData?.activePatients || 0}</span>
                                <UserCheck className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">Importados ETL</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold">{statsData?.etlImported || 0}</span>
                                <Upload className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium opacity-90">Nuevos (7 días)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-bold">{statsData?.newThisWeek || 0}</span>
                                <Activity className="h-8 w-8 opacity-80" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Búsqueda y tablas */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <CardTitle>Listado de Pacientes</CardTitle>
                                <CardDescription>
                                    {filteredPatients.length} paciente{filteredPatients.length !== 1 ? 's' : ''} encontrado{filteredPatients.length !== 1 ? 's' : ''}
                                </CardDescription>
                            </div>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Buscar por nombre, cédula..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loadingPatients ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            </div>
                        ) : filteredPatients.length === 0 ? (
                            <div className="text-center py-12">
                                <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-500">No se encontraron pacientes</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Paciente</TableHead>
                                            <TableHead>Cédula</TableHead>
                                            <TableHead>Contacto</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Origen</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredPatients.map((patient) => (
                                            <TableRow key={patient.id}>
                                                <TableCell>
                                                    <div className="font-medium">{patient.nombre}</div>
                                                    {patient.fecha_nacimiento && (
                                                        <div className="text-xs text-slate-500">
                                                            {new Date(patient.fecha_nacimiento).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    {patient.cedula}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        {patient.telefono && (
                                                            <div className="flex items-center gap-1 text-xs">
                                                                <Phone className="h-3 w-3" />
                                                                {patient.telefono}
                                                            </div>
                                                        )}
                                                        {patient.email && (
                                                            <div className="flex items-center gap-1 text-xs">
                                                                <Mail className="h-3 w-3" />
                                                                {patient.email}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{getStatusBadge(patient.status)}</TableCell>
                                                <TableCell>{getSourceBadge(patient.source)}</TableCell>
                                                <TableCell>
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedPatient(patient)
                                                                setShowDetail(true)
                                                            }}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setEditingPatient(patient)
                                                                setShowForm(true)
                                                            }}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => setDeleteId(patient.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>

            {/* Formulario de Pacientes Dialog */}
            <PatientFormDialog
                open={showForm}
                onOpenChange={(open) => {
                    setShowForm(open)
                    if (!open) setEditingPatient(null)
                }}
                patient={editingPatient}
                onSubmit={handleCreateOrUpdate}
                isLoading={isLoading}
            />

            {/* Importar Dialog */}
            <ImportDialog
                open={showImport}
                onOpenChange={setShowImport}
                onImport={handleImport}
                isLoading={isLoading}
            />

            {/* Detalles Dialog */}
            <PatientDetailDialog
                open={showDetail}
                onOpenChange={setShowDetail}
                patient={selectedPatient}
            />

            {/* Confirmacion de Eliminacion */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar paciente?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminarán todos los datos cifrados del paciente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

// Componente de diálogo del formulario del paciente
function PatientFormDialog({
    open,
    onOpenChange,
    patient,
    onSubmit,
    isLoading
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    patient: Patient | null
    onSubmit: (data: PatientFormData) => void
    isLoading: boolean
}) {
    const [formData, setFormData] = useState<PatientFormData>({
        cedula: '',
        nombre: '',
        email: '',
        telefono: '',
        direccion: '',
        fecha_nacimiento: '',
        tipo_sangre: '',
        genero: '',
        alergias: '',
        condiciones: '',
        contacto_emergencia: '',
        status: 'active',
        notas: ''
    })

    // Restablecer el formulario cuando se abre/cierra el cuadro de diálogo o cambia el paciente.
    useState(() => {
        if (patient) {
            setFormData({
                cedula: patient.cedula,
                nombre: patient.nombre,
                email: patient.email || '',
                telefono: patient.telefono || '',
                direccion: patient.direccion || '',
                fecha_nacimiento: patient.fecha_nacimiento || '',
                tipo_sangre: patient.tipo_sangre || '',
                genero: patient.genero || '',
                alergias: patient.alergias || '',
                condiciones: patient.condiciones || '',
                contacto_emergencia: patient.contacto_emergencia || '',
                status: patient.status,
                notas: patient.notas || ''
            })
        } else {
            setFormData({
                cedula: '',
                nombre: '',
                email: '',
                telefono: '',
                direccion: '',
                fecha_nacimiento: '',
                tipo_sangre: '',
                genero: '',
                alergias: '',
                condiciones: '',
                contacto_emergencia: '',
                status: 'active',
                notas: ''
            })
        }
    })

    // Efecto para rellenar el formulario cuando el paciente cambia
    if (open && patient && formData.cedula !== patient.cedula) {
        setFormData({
            cedula: patient.cedula,
            nombre: patient.nombre,
            email: patient.email || '',
            telefono: patient.telefono || '',
            direccion: patient.direccion || '',
            fecha_nacimiento: patient.fecha_nacimiento || '',
            tipo_sangre: patient.tipo_sangre || '',
            genero: patient.genero || '',
            alergias: patient.alergias || '',
            condiciones: patient.condiciones || '',
            contacto_emergencia: patient.contacto_emergencia || '',
            status: patient.status,
            notas: patient.notas || ''
        })
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit(formData)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-blue-600" />
                        {patient ? 'Editar Paciente' : 'Nuevo Paciente'}
                    </DialogTitle>
                    <DialogDescription>
                        Todos los datos sensibles serán cifrados con AES-256-GCM
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="cedula">Cédula *</Label>
                            <Input
                                id="cedula"
                                value={formData.cedula}
                                onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                                placeholder="000-0000000-0"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="nombre">Nombre Completo *</Label>
                            <Input
                                id="nombre"
                                value={formData.nombre}
                                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                placeholder="Nombre completo del paciente"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="correo@ejemplo.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="telefono">Teléfono</Label>
                            <Input
                                id="telefono"
                                value={formData.telefono}
                                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                placeholder="809-555-0000"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="direccion">Dirección</Label>
                        <Input
                            id="direccion"
                            value={formData.direccion}
                            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                            placeholder="Dirección completa"
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
                            <Input
                                id="fecha_nacimiento"
                                type="date"
                                value={formData.fecha_nacimiento}
                                onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tipo_sangre">Tipo de Sangre</Label>
                            <Select
                                value={formData.tipo_sangre}
                                onValueChange={(value) => setFormData({ ...formData, tipo_sangre: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
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
                            <Label htmlFor="genero">Género</Label>
                            <Select
                                value={formData.genero}
                                onValueChange={(value) => setFormData({ ...formData, genero: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="masculino">Masculino</SelectItem>
                                    <SelectItem value="femenino">Femenino</SelectItem>
                                    <SelectItem value="otro">Otro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="alergias">Alergias</Label>
                            <Textarea
                                id="alergias"
                                value={formData.alergias}
                                onChange={(e) => setFormData({ ...formData, alergias: e.target.value })}
                                placeholder="Alergias conocidas"
                                rows={2}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="condiciones">Condiciones Médicas</Label>
                            <Textarea
                                id="condiciones"
                                value={formData.condiciones}
                                onChange={(e) => setFormData({ ...formData, condiciones: e.target.value })}
                                placeholder="Condiciones médicas preexistentes"
                                rows={2}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="contacto_emergencia">Contacto de Emergencia</Label>
                            <Input
                                id="contacto_emergencia"
                                value={formData.contacto_emergencia}
                                onChange={(e) => setFormData({ ...formData, contacto_emergencia: e.target.value })}
                                placeholder="Nombre y teléfono"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Estado</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(value: 'active' | 'inactive' | 'deceased') => setFormData({ ...formData, status: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Activo</SelectItem>
                                    <SelectItem value="inactive">Inactivo</SelectItem>
                                    <SelectItem value="deceased">Fallecido</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notas">Notas</Label>
                        <Textarea
                            id="notas"
                            value={formData.notas}
                            onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                            placeholder="Notas adicionales"
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            {patient ? 'Actualizar' : 'Crear'} Paciente
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

// Componente de dialog de importación
function ImportDialog({
    open,
    onOpenChange,
    onImport,
    isLoading
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onImport: (data: PatientImportData[], fileName: string) => void
    isLoading: boolean
}) {
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<PatientImportData[]>([])
    const [error, setError] = useState<string | null>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return

        setFile(selectedFile)
        setError(null)

        try {
            const text = await selectedFile.text()

            if (selectedFile.name.endsWith('.json')) {
                const jsonData = JSON.parse(text)
                const data = Array.isArray(jsonData) ? jsonData : jsonData.data || jsonData.pacientes || []
                setPreview(data.slice(0, 5))
            } else if (selectedFile.name.endsWith('.csv')) {
                const lines = text.split('\n')
                const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
                const data: PatientImportData[] = []

                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(',').map(v => v.trim())
                    if (values.length >= 2) {
                        const record: any = {}
                        headers.forEach((header, index) => {
                            record[header] = values[index] || ''
                        })
                        data.push(record as PatientImportData)
                    }
                }
                setPreview(data.slice(0, 5))
            }
        } catch (err: any) {
            setError(`Error al leer archivo: ${err.message}`)
            setPreview([])
        }
    }

    const handleImport = async () => {
        if (!file) return

        try {
            const text = await file.text()
            let data: PatientImportData[] = []

            if (file.name.endsWith('.json')) {
                const jsonData = JSON.parse(text)
                data = Array.isArray(jsonData) ? jsonData : jsonData.data || jsonData.pacientes || []
            } else if (file.name.endsWith('.csv')) {
                const lines = text.split('\n')
                const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(',').map(v => v.trim())
                    if (values.length >= 2) {
                        const record: any = {}
                        headers.forEach((header, index) => {
                            record[header] = values[index] || ''
                        })
                        data.push(record as PatientImportData)
                    }
                }
            }

            onImport(data, file.name)
        } catch (err: any) {
            setError(`Error en importación: ${err.message}`)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5 text-blue-600" />
                        Importar Pacientes (ETL)
                    </DialogTitle>
                    <DialogDescription>
                        Carga un archivo CSV o JSON. Los datos sensibles serán cifrados automáticamente.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="border-2 border-dashed rounded-lg p-6">
                        <Input
                            type="file"
                            accept=".csv,.json"
                            onChange={handleFileChange}
                            className="hidden"
                            id="file-upload"
                        />
                        <Label htmlFor="file-upload" className="cursor-pointer block">
                            <div className="flex flex-col items-center justify-center space-y-2">
                                <FileUp className="h-10 w-10 text-slate-400" />
                                <p className="text-sm text-slate-600 text-center">
                                    {file ? file.name : 'Haz clic para seleccionar un archivo'}
                                </p>
                                <p className="text-xs text-slate-400 text-center">CSV o JSON (máx. 10MB)</p>
                            </div>
                        </Label>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    {preview.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Vista previa ({preview.length} registros):</p>
                            <div className="bg-slate-50 rounded p-3 text-xs font-mono max-h-40 overflow-auto">
                                {preview.map((record, i) => (
                                    <div key={i} className="py-1 border-b last:border-0">
                                        {record.cedula} - {record.nombre}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <p className="text-sm text-blue-800 font-medium">Campos esperados:</p>
                        <p className="text-xs text-blue-600 mt-1">
                            cedula*, nombre*, email, telefono, direccion, fecha_nacimiento, tipo_sangre, genero, alergias, condiciones, notas
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleImport} disabled={!file || isLoading}>
                        {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Importar y Cifrar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// Paciente Detalle Dialog
function PatientDetailDialog({
    open,
    onOpenChange,
    patient
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    patient: Patient | null
}) {
    if (!patient) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Detalle del Paciente
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Header */}
                    <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                            {patient.nombre.charAt(0)}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold">{patient.nombre}</h3>
                            <p className="text-sm text-slate-500 font-mono">{patient.cedula}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge className="bg-green-100 text-green-700">{patient.status}</Badge>
                                {patient.tipo_sangre && (
                                    <Badge variant="outline" className="text-red-600 border-red-300">
                                        <Heart className="h-3 w-3 mr-1" />
                                        {patient.tipo_sangre}
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-400">Código de acceso</p>
                            <p className="font-mono text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                {patient.codigo_acceso}
                            </p>
                        </div>
                    </div>

                    {/* Detalles Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <DetailItem icon={<Mail className="h-4 w-4" />} label="Email" value={patient.email} />
                        <DetailItem icon={<Phone className="h-4 w-4" />} label="Teléfono" value={patient.telefono} />
                        <DetailItem icon={<MapPin className="h-4 w-4" />} label="Dirección" value={patient.direccion} />
                        <DetailItem icon={<Calendar className="h-4 w-4" />} label="Fecha Nacimiento" value={patient.fecha_nacimiento} />
                    </div>

                    {/* Informacion Medica */}
                    {(patient.alergias || patient.condiciones) && (
                        <div className="border-t pt-4">
                            <h4 className="font-medium mb-3">Información Médica</h4>
                            <div className="grid grid-cols-2 gap-4">
                                {patient.alergias && (
                                    <div className="bg-red-50 p-3 rounded">
                                        <p className="text-xs text-red-600 font-medium">ALERGIAS</p>
                                        <p className="text-sm mt-1 text-red-800">{patient.alergias}</p>
                                    </div>
                                )}
                                {patient.condiciones && (
                                    <div className="bg-amber-50 p-3 rounded">
                                        <p className="text-xs text-amber-600 font-medium">Condiciones</p>
                                        <p className="text-sm mt-1">{patient.condiciones}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Notas */}
                    {patient.notas && (
                        <div className="border-t pt-4">
                            <h4 className="font-medium mb-2 flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Notas
                            </h4>
                            <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded">{patient.notas}</p>
                        </div>
                    )}

                    {/* Aviso sobre cifrado */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 border-t pt-4">
                        <Lock className="h-3 w-3" />
                        <span>Datos cifrados con AES-256-GCM • Origen: {patient.source}</span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function DetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
    if (!value) return null
    return (
        <div className="flex items-start gap-2">
            <span className="text-slate-400 mt-0.5">{icon}</span>
            <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-sm">{value}</p>
            </div>
        </div>
    )
}
