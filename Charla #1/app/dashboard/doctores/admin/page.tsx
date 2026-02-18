'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
    UserPlus, 
    UserCheck, 
    Clock, 
    Loader2, 
    Stethoscope, 
    Mail, 
    Phone, 
    FileText,
    CheckCircle,
    XCircle,
    Trash2,
    Eye,
    Search,
    AlertTriangle,
    ArrowLeft,
    Calendar,
    Users,
    MessageSquare,
    Send
} from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { apiClient } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

interface DoctorRegistration {
    id: string
    name: string
    email: string
    phone: string
    specialty: string
    license_number: string
    status: 'pending' | 'approved' | 'rejected'
    rejection_reason?: string
    created_at: string
    reviewed_at?: string
}

interface Doctor {
    id: string
    name: string
    email: string
    phone: string
    specialty: string
    license_number: string
    is_active: boolean
    created_at: string
}

export default function DoctorAdminPage() {
    const [registrations, setRegistrations] = useState<DoctorRegistration[]>([])
    const [doctors, setDoctors] = useState<Doctor[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [selectedRegistration, setSelectedRegistration] = useState<DoctorRegistration | null>(null)
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
    const [showDetailsDialog, setShowDetailsDialog] = useState(false)
    const [showRejectDialog, setShowRejectDialog] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [showMessageDialog, setShowMessageDialog] = useState(false)
    const [messageForm, setMessageForm] = useState({ title: '', message: '', priority: 'normal' })
    const [rejectionReason, setRejectionReason] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [pendingAppointments, setPendingAppointments] = useState(0)
    const [deleteAction, setDeleteAction] = useState<'cancel' | 'reassign'>('cancel')
    const [reassignDoctorId, setReassignDoctorId] = useState('')
    const { toast } = useToast()

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [regResponse, docResponse] = await Promise.all([
                apiClient('/api/doctor-registrations'),
                apiClient('/api/doctors')
            ])
            
            const regData = await regResponse.json()
            const docData = await docResponse.json()
            
            setRegistrations(regData.registrations || [])
            setDoctors(docData.doctors || [])
        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (registration: DoctorRegistration) => {
        setActionLoading(true)
        try {
            const response = await apiClient(`/api/doctor-registrations/${registration.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ action: 'approve' })
            })

            if (response.ok) {
                toast({
                    title: "Doctor Aprobado",
                    description: `${registration.name} ha sido aprobado y su cuenta ha sido creada.`,
                })
                loadData()
            } else {
                const error = await response.json()
                throw new Error(error.error || 'Error al aprobar')
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

    const handleReject = async () => {
        if (!selectedRegistration || !rejectionReason) return
        setActionLoading(true)
        
        try {
            const response = await apiClient(`/api/doctor-registrations/${selectedRegistration.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ 
                    action: 'reject',
                    rejectionReason 
                })
            })

            if (response.ok) {
                toast({
                    title: "Solicitud Rechazada",
                    description: `La solicitud de ${selectedRegistration.name} ha sido rechazada.`,
                })
                setShowRejectDialog(false)
                setRejectionReason('')
                loadData()
            } else {
                const error = await response.json()
                throw new Error(error.error || 'Error al rechazar')
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

    const handleDeleteDoctor = async () => {
        if (!selectedDoctor) return
        setActionLoading(true)
        
        try {
            // Si hay citas pendientes, ocúpate primero de ellas.
            if (pendingAppointments > 0) {
                if (deleteAction === 'cancel') {
                    // Cancelar todas las citas pendientes
                    const cancelResponse = await apiClient(`/api/doctors/${selectedDoctor.id}/appointments/cancel-all`, {
                        method: 'POST'
                    })
                    if (!cancelResponse.ok) {
                        const error = await cancelResponse.json()
                        throw new Error(error.error || 'Error al cancelar citas')
                    }
                } else if (deleteAction === 'reassign' && reassignDoctorId) {
                    // Reasignar a otro médico
                    const reassignResponse = await apiClient(`/api/doctors/${selectedDoctor.id}/appointments/reassign`, {
                        method: 'POST',
                        body: JSON.stringify({ newDoctorId: reassignDoctorId })
                    })
                    if (!reassignResponse.ok) {
                        const error = await reassignResponse.json()
                        throw new Error(error.error || 'Error al reasignar citas')
                    }
                }
            }

            // Ahora elimina al médico.
            const response = await apiClient(`/api/doctors/${selectedDoctor.id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                toast({
                    title: "Doctor Eliminado",
                    description: `${selectedDoctor.name} ha sido eliminado del sistema.`,
                })
                setShowDeleteDialog(false)
                setPendingAppointments(0)
                setDeleteAction('cancel')
                setReassignDoctorId('')
                loadData()
            } else {
                const error = await response.json()
                throw new Error(error.error || 'Error al eliminar')
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

    const checkPendingAppointments = async (doctor: Doctor) => {
        try {
            const response = await apiClient(`/api/doctors/${doctor.id}/appointments/pending`)
            const data = await response.json()
            setPendingAppointments(data.count || 0)
        } catch {
            setPendingAppointments(0)
        }
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

    const openDeleteDialog = async (doctor: Doctor) => {
        setSelectedDoctor(doctor)
        setDeleteAction('cancel')
        setReassignDoctorId('')
        await checkPendingAppointments(doctor)
        setShowDeleteDialog(true)
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pendiente</Badge>
            case 'approved':
                return <Badge className="bg-green-100 text-green-700 border-green-200">Aprobado</Badge>
            case 'rejected':
                return <Badge className="bg-red-100 text-red-700 border-red-200">Rechazado</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const pendingCount = registrations.filter(r => r.status === 'pending').length
    const approvedCount = registrations.filter(r => r.status === 'approved').length
    const rejectedCount = registrations.filter(r => r.status === 'rejected').length

    const filteredDoctors = doctors.filter(doc => 
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.specialty.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/doctores">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Administración de Doctores</h1>
                        <p className="text-slate-500 mt-2">
                            Aprueba solicitudes y gestiona cuentas de doctores
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Doctores Activos</CardTitle>
                        <UserCheck className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{doctors.filter(d => d.is_active).length}</div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Pendientes</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Aprobados</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{approvedCount}</div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Rechazados</CardTitle>
                        <XCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{rejectedCount}</div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="requests" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="requests" className="gap-2">
                        <UserPlus className="h-4 w-4" />
                        Solicitudes {pendingCount > 0 && <Badge variant="destructive" className="ml-1">{pendingCount}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="doctors" className="gap-2">
                        <Stethoscope className="h-4 w-4" />
                        Eliminar Doctores
                    </TabsTrigger>
                </TabsList>

                {/* Solicitudes Tab */}
                <TabsContent value="requests">
                    <Card className="border-0 shadow-md">
                        <CardHeader>
                            <CardTitle>Solicitudes de Registro</CardTitle>
                            <CardDescription>
                                Revisa y aprueba las solicitudes de nuevos doctores
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex items-center justify-center h-40">
                                    <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                                </div>
                            ) : registrations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                                    <UserPlus className="h-12 w-12 mb-4 text-slate-300" />
                                    <p className="font-medium">No hay solicitudes</p>
                                    <p className="text-sm">Las nuevas solicitudes aparecerán aquí</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Especialidad</TableHead>
                                            <TableHead>Licencia</TableHead>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {registrations.map((registration) => (
                                            <TableRow key={registration.id}>
                                                <TableCell className="font-medium">{registration.name}</TableCell>
                                                <TableCell>{registration.email}</TableCell>
                                                <TableCell>{registration.specialty}</TableCell>
                                                <TableCell className="font-mono text-sm">{registration.license_number}</TableCell>
                                                <TableCell>
                                                    {new Date(registration.created_at).toLocaleDateString('es-PA')}
                                                </TableCell>
                                                <TableCell>{getStatusBadge(registration.status)}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedRegistration(registration)
                                                                setShowDetailsDialog(true)
                                                            }}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        {registration.status === 'pending' && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                    onClick={() => handleApprove(registration)}
                                                                    disabled={actionLoading}
                                                                >
                                                                    <CheckCircle className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                    onClick={() => {
                                                                        setSelectedRegistration(registration)
                                                                        setShowRejectDialog(true)
                                                                    }}
                                                                    disabled={actionLoading}
                                                                >
                                                                    <XCircle className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
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

                {/* Doctores Tab */}
                <TabsContent value="doctors">
                    <Card className="border-0 shadow-md">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Eliminar Doctores</CardTitle>
                                    <CardDescription>
                                        Gestiona y elimina cuentas de doctores del sistema
                                    </CardDescription>
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <Input
                                        placeholder="Buscar doctor..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9 w-64"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex items-center justify-center h-40">
                                    <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                                </div>
                            ) : filteredDoctors.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                                    <Stethoscope className="h-12 w-12 mb-4 text-slate-300" />
                                    <p className="font-medium">No hay doctores registrados</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Teléfono</TableHead>
                                            <TableHead>Especialidad</TableHead>
                                            <TableHead>Licencia</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredDoctors.map((doctor) => (
                                            <TableRow key={doctor.id}>
                                                <TableCell className="font-medium">{doctor.name}</TableCell>
                                                <TableCell>{doctor.email || '-'}</TableCell>
                                                <TableCell>{doctor.phone || '-'}</TableCell>
                                                <TableCell>{doctor.specialty}</TableCell>
                                                <TableCell className="font-mono text-sm">{doctor.license_number}</TableCell>
                                                <TableCell>
                                                    <Badge className={doctor.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                                        {doctor.is_active ? 'Activo' : 'Inactivo'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                            onClick={() => {
                                                                setSelectedDoctor(doctor)
                                                                setShowMessageDialog(true)
                                                            }}
                                                            title="Enviar mensaje"
                                                        >
                                                            <MessageSquare className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => openDeleteDialog(doctor)}
                                                            title="Eliminar doctor"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
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
            </Tabs>

            {/* Cuadro de diálogo Detalles */}
            <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                <DialogContent className="max-w-lg bg-white border border-slate-200 shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-slate-900">Detalles de Solicitud</DialogTitle>
                        <DialogDescription className="text-slate-600">
                            Información completa del solicitante
                        </DialogDescription>
                    </DialogHeader>
                    {selectedRegistration && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs text-slate-500">Nombre Completo</Label>
                                    <p className="font-medium text-slate-900">{selectedRegistration.name}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Estado</Label>
                                    <div className="mt-1">{getStatusBadge(selectedRegistration.status)}</div>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Email</Label>
                                    <p className="font-medium text-slate-900 flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        {selectedRegistration.email}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Teléfono</Label>
                                    <p className="font-medium text-slate-900 flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {selectedRegistration.phone}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Especialidad</Label>
                                    <p className="font-medium text-slate-900">{selectedRegistration.specialty}</p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Número de Licencia</Label>
                                    <p className="font-mono font-medium text-slate-900 flex items-center gap-1">
                                        <FileText className="h-3 w-3" />
                                        {selectedRegistration.license_number}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-xs text-slate-500">Fecha de Solicitud</Label>
                                    <p className="font-medium text-slate-900">
                                        {new Date(selectedRegistration.created_at).toLocaleString('es-PA')}
                                    </p>
                                </div>
                                {selectedRegistration.reviewed_at && (
                                    <div>
                                        <Label className="text-xs text-slate-500">Fecha de Revisión</Label>
                                        <p className="font-medium text-slate-900">
                                            {new Date(selectedRegistration.reviewed_at).toLocaleString('es-PA')}
                                        </p>
                                    </div>
                                )}
                            </div>
                            {selectedRegistration.rejection_reason && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                    <Label className="text-xs text-red-600">Motivo de Rechazo</Label>
                                    <p className="text-red-700">{selectedRegistration.rejection_reason}</p>
                                </div>
                            )}
                            {selectedRegistration.status === 'pending' && (
                                <DialogFooter className="gap-2 pt-4 border-t">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setShowDetailsDialog(false)
                                            setShowRejectDialog(true)
                                        }}
                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                    >
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Rechazar
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            handleApprove(selectedRegistration)
                                            setShowDetailsDialog(false)
                                        }}
                                        disabled={actionLoading}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                        Aprobar
                                    </Button>
                                </DialogFooter>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Rechazar Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent className="max-w-md bg-white border border-slate-200 shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-slate-900 flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-red-500" />
                            Rechazar Solicitud
                        </DialogTitle>
                        <DialogDescription className="text-slate-600">
                            Proporcione un motivo para rechazar la solicitud de {selectedRegistration?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Motivo del Rechazo *</Label>
                            <Textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Explique el motivo del rechazo..."
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleReject}
                            disabled={!rejectionReason || actionLoading}
                            variant="destructive"
                        >
                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Confirmar Rechazo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Eliminar Doctor Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent className="bg-white border border-slate-200 max-w-lg">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-slate-900">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            Eliminar Doctor
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-600">
                            ¿Está seguro de que desea eliminar a <strong>{selectedDoctor?.name}</strong>? 
                            Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    
                    {pendingAppointments > 0 && (
                        <div className="space-y-4 py-4 border-t border-b">
                            <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                <Calendar className="h-5 w-5 text-amber-600" />
                                <div>
                                    <p className="font-medium text-amber-800">
                                        {pendingAppointments} cita{pendingAppointments > 1 ? 's' : ''} pendiente{pendingAppointments > 1 ? 's' : ''}
                                    </p>
                                    <p className="text-xs text-amber-600">
                                        Debe decidir qué hacer con las citas antes de eliminar
                                    </p>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <Label>¿Qué desea hacer con las citas?</Label>
                                <Select value={deleteAction} onValueChange={(v: 'cancel' | 'reassign') => setDeleteAction(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white">
                                        <SelectItem value="cancel">
                                            <div className="flex items-center gap-2">
                                                <XCircle className="h-4 w-4 text-red-500" />
                                                Cancelar todas las citas
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="reassign">
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-blue-500" />
                                                Reasignar a otro doctor
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                
                                {deleteAction === 'reassign' && (
                                    <div className="space-y-2">
                                        <Label>Seleccionar nuevo doctor</Label>
                                        <Select value={reassignDoctorId} onValueChange={setReassignDoctorId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar doctor..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white">
                                                {doctors
                                                    .filter(d => d.id !== selectedDoctor?.id && d.is_active)
                                                    .map(d => (
                                                        <SelectItem key={d.id} value={d.id}>
                                                            {d.name} - {d.specialty}
                                                        </SelectItem>
                                                    ))
                                                }
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDeleteDoctor}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={actionLoading || (pendingAppointments > 0 && deleteAction === 'reassign' && !reassignDoctorId)}
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                            Eliminar Doctor
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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
