'use client'

import { useState, useRef, useEffect, lazy, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import Link from 'next/link'
import Image from 'next/image'
import { 
    ChevronLeft, Search, FileText, Download, Lock, Loader2, 
    Eye, CheckCircle2, Clock, AlertCircle, Calendar, User,
    Stethoscope, Microscope, X, Printer, ChevronRight, Shield,
    Activity, Droplets, Heart, Play, Film, HelpCircle
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion, AnimatePresence } from 'framer-motion'

// Cargar diferidamente el reproductor Remotion
const ResultsPlayer = lazy(() => import('@/components/remotion/ResultsPlayer'))

interface LabResult {
    id: string
    examName: string
    examType: string
    status: string
    orderedDate: string
    completedDate: string | null
    canDownload: boolean
}

interface ResultsData {
    patient: {
        name: string
        cedula: string
    }
    results: LabResult[]
}

interface ResultDetail {
    id: string
    examName: string
    examType: string
    status: string
    orderedDate: string
    completedDate: string | null
    reviewedDate: string | null
    orderedBy: string
    orderedBySpecialty: string
    reviewedBy: string
    priority: string
    patientName: string
    patientCedula: string
    patientDob: string
    patientBloodType: string
    data: {
        type: 'table' | 'text'
        title: string
        items?: Array<{
            name: string
            value: string
            unit: string
            reference: string
            status: 'normal' | 'high' | 'low'
        }>
        sections?: Array<{
            heading: string
            content: string
        }>
    }
}

export default function ResultsPageWrapper() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full" /></div>}>
            <ResultsPage />
        </Suspense>
    )
}

function ResultsPage() {
    const searchParams = useSearchParams()
    const codeFromUrl = searchParams.get('code') || ''

    const [cedula, setCedula] = useState('')
    const [accessCode, setAccessCode] = useState(codeFromUrl)
    const [result, setResult] = useState<ResultsData | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [downloadingId, setDownloadingId] = useState<string | null>(null)
    const [selectedResult, setSelectedResult] = useState<ResultDetail | null>(null)
    const [loadingDetail, setLoadingDetail] = useState(false)
    const [activeTab, setActiveTab] = useState('details')
    const [showResultDialog, setShowResultDialog] = useState(false)
    const printRef = useRef<HTMLDivElement>(null)

    // Sincronizar código desde URL al montar
    useEffect(() => {
        if (codeFromUrl) {
            setAccessCode(codeFromUrl)
        }
    }, [codeFromUrl])

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setResult(null)

        try {
            const response = await fetch('/api/results', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cedula, accessCode }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Error al consultar resultados')
            }

            setResult(data)
        } catch (err: any) {
            setError(err.message || 'Error al consultar resultados')
        } finally {
            setLoading(false)
        }
    }

    const handleViewResult = async (resultId: string) => {
        setLoadingDetail(true)
        setShowResultDialog(true)
        try {
            const response = await fetch(
                `/api/results/${resultId}?accessCode=${accessCode}`
            )
            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Error al cargar detalle')
            }

            setSelectedResult(data.result)
        } catch (err: any) {
            alert(err.message || 'Error al cargar el resultado')
            setShowResultDialog(false)
        } finally {
            setLoadingDetail(false)
        }
    }

    const handlePrint = () => {
        const printContent = printRef.current
        if (!printContent) return

        const printWindow = window.open('', '_blank')
        if (!printWindow) return

        const styles = `
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                .header { text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 20px; margin-bottom: 20px; }
                .logo { font-size: 24px; font-weight: bold; color: #0d9488; }
                .patient-info { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                .patient-info h3 { margin: 0 0 10px 0; color: #0d9488; }
                .patient-info p { margin: 5px 0; }
                .exam-title { font-size: 18px; font-weight: bold; color: #1e293b; margin: 20px 0 10px 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
                th { background: #f1f5f9; font-weight: 600; }
                .normal { color: #16a34a; }
                .high { color: #dc2626; }
                .low { color: #ea580c; }
                .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px; }
                .doctor-info { margin-top: 30px; padding: 15px; background: #f0fdfa; border-radius: 8px; }
            </style>
        `

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Resultado de Laboratorio - MedComLabs</title>
                ${styles}
            </head>
            <body>
                <div class="header">
                    <div class="logo">MedComLabs</div>
                    <p>Sistema de Resultados de Laboratorio</p>
                    <p>Fecha de impresión: ${new Date().toLocaleDateString('es-PA', { dateStyle: 'long' })}</p>
                </div>
                
                <div class="patient-info">
                    <h3>Información del Paciente</h3>
                    <p><strong>Nombre:</strong> ${selectedResult?.patientName}</p>
                    <p><strong>Cédula:</strong> ${selectedResult?.patientCedula}</p>
                    ${selectedResult?.patientDob ? `<p><strong>Fecha de Nacimiento:</strong> ${new Date(selectedResult.patientDob).toLocaleDateString('es-PA')}</p>` : ''}
                    ${selectedResult?.patientBloodType ? `<p><strong>Tipo de Sangre:</strong> ${selectedResult.patientBloodType}</p>` : ''}
                </div>

                <div class="exam-title">${selectedResult?.data.title}</div>
                <p><strong>Fecha del Examen:</strong> ${selectedResult?.orderedDate ? new Date(selectedResult.orderedDate).toLocaleDateString('es-PA') : 'N/A'}</p>
                <p><strong>Estado:</strong> ${getStatusLabel(selectedResult?.status || '')}</p>

                ${selectedResult?.data.type === 'table' ? `
                    <table>
                        <thead>
                            <tr>
                                <th>Parámetro</th>
                                <th>Resultado</th>
                                <th>Unidad</th>
                                <th>Referencia</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${selectedResult.data.items?.map(item => `
                                <tr>
                                    <td>${item.name}</td>
                                    <td><strong>${item.value}</strong></td>
                                    <td>${item.unit}</td>
                                    <td>${item.reference}</td>
                                    <td class="${item.status}">${item.status === 'normal' ? 'Normal' : item.status === 'high' ? 'Alto' : 'Bajo'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : `
                    ${selectedResult?.data.sections?.map(section => `
                        <p><strong>${section.heading}:</strong> ${section.content}</p>
                    `).join('')}
                `}

                <div class="doctor-info">
                    <p><strong>Ordenado por:</strong> ${selectedResult?.orderedBy} ${selectedResult?.orderedBySpecialty ? `(${selectedResult.orderedBySpecialty})` : ''}</p>
                    ${selectedResult?.reviewedBy !== 'Pendiente' ? `<p><strong>Revisado por:</strong> ${selectedResult?.reviewedBy}</p>` : ''}
                </div>

                <div class="footer">
                    <p>MedComLabs - Laboratorio Clínico</p>
                    <p>Este documento es confidencial y solo para uso del paciente</p>
                    <p>Consultas: +507 XXX-XXXX | info@medcomlabs.com</p>
                </div>
            </body>
            </html>
        `)

        printWindow.document.close()
        printWindow.print()
    }

    const handleDownload = async (resultId: string, examName: string) => {
        setDownloadingId(resultId)
        try {
            // Abre el HTML del resultado en una nueva pestaña: el usuario puede imprimirlo o guardarlo como PDF desde allí.
            const url = `/api/results/download?id=${resultId}&accessCode=${accessCode}`
            window.open(url, '_blank')
        } catch (err: any) {
            alert(err.message || 'Error al descargar el resultado')
        } finally {
            setDownloadingId(null)
        }
    }

    const getStatusLabel = (status: string) => {
        const labels: Record<string, string> = {
            pending: 'Pendiente',
            pendiente: 'Pendiente',
            in_progress: 'En Proceso',
            en_proceso: 'En Proceso',
            completed: 'Listo',
            completado: 'Listo',
            reviewed: 'Revisado',
            revisado: 'Revisado',
        }
        return labels[status] || status
    }

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pending: 'text-amber-700 bg-amber-50 border-amber-200',
            pendiente: 'text-amber-700 bg-amber-50 border-amber-200',
            in_progress: 'text-blue-700 bg-blue-50 border-blue-200',
            en_proceso: 'text-blue-700 bg-blue-50 border-blue-200',
            completed: 'text-emerald-700 bg-emerald-50 border-emerald-200',
            completado: 'text-emerald-700 bg-emerald-50 border-emerald-200',
            reviewed: 'text-teal-700 bg-teal-50 border-teal-200',
            revisado: 'text-teal-700 bg-teal-50 border-teal-200',
        }
        return colors[status] || 'text-slate-600 bg-slate-50 border-slate-200'
    }

    const getStatusIcon = (status: string) => {
        switch(status) {
            case 'pending': case 'pendiente': return <Clock className="w-3.5 h-3.5" />
            case 'in_progress': case 'en_proceso': return <Loader2 className="w-3.5 h-3.5 animate-spin" />
            case 'completed': case 'completado': return <CheckCircle2 className="w-3.5 h-3.5" />
            case 'reviewed': case 'revisado': return <CheckCircle2 className="w-3.5 h-3.5" />
            default: return <AlertCircle className="w-3.5 h-3.5" />
        }
    }

    const getExamTypeIcon = (type: string) => {
        switch(type) {
            case 'hematologia': return <Droplets className="w-5 h-5" />
            case 'bioquimica': return <Activity className="w-5 h-5" />
            case 'microbiologia': return <Microscope className="w-5 h-5" />
            default: return <FileText className="w-5 h-5" />
        }
    }

    const getExamTypeColor = (type: string) => {
        switch(type) {
            case 'hematologia': return 'text-red-600 bg-red-50'
            case 'bioquimica': return 'text-purple-600 bg-purple-50'
            case 'microbiologia': return 'text-emerald-600 bg-emerald-50'
            default: return 'text-slate-600 bg-slate-50'
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-cyan-50/30">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-40">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-teal-600 transition-colors" />
                        <div className="relative w-40 h-10">
                            <Image src="/banner-transparent.png" alt="MedComLabs" fill className="object-contain object-left" />
                        </div>
                    </Link>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Shield className="w-4 h-4 text-teal-600" />
                        <span>Conexión segura</span>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-2xl mx-auto"
                >
                    {/* Hero  */}
                    <div className="text-center mb-10">
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/25 mb-6"
                        >
                            <FileText className="w-8 h-8 text-white" />
                        </motion.div>
                        <h1 className="text-4xl font-bold text-slate-900 mb-4">
                            Portal de Resultados
                        </h1>
                        <p className="text-lg text-slate-600 max-w-md mx-auto">
                            Acceda a sus resultados de laboratorio de forma segura y confidencial
                        </p>
                    </div>

                    {/* Card de Busqueda */}
                    <Card className="shadow-xl shadow-slate-200/50 border-0 overflow-hidden">
                        <div className="h-1.5 bg-gradient-to-r from-teal-500 via-cyan-500 to-emerald-500" />
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <div className="p-2 rounded-lg bg-teal-50">
                                    <Lock className="w-5 h-5 text-teal-600" />
                                </div>
                                {codeFromUrl ? 'Verificar Identidad' : 'Acceso Seguro'}
                            </CardTitle>
                            <CardDescription className="text-base">
                                {codeFromUrl 
                                    ? 'Ingrese su número de cédula para ver sus resultados.' 
                                    : 'Ingrese su cédula y el código de acceso proporcionado en su factura.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSearch} className="space-y-5">
                                {codeFromUrl && (
                                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg flex items-center gap-2 text-sm text-teal-700">
                                        <Shield className="w-4 h-4" />
                                        Código de acceso detectado automáticamente
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                        <User className="w-4 h-4 text-slate-400" />
                                        Cédula / Pasaporte
                                    </label>
                                    <Input
                                        placeholder="8-888-8888"
                                        value={cedula}
                                        onChange={(e) => setCedula(e.target.value)}
                                        required
                                        className="h-12 text-base"
                                        autoFocus={!!codeFromUrl}
                                    />
                                </div>
                                {!codeFromUrl && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium flex items-center gap-2">
                                            <Lock className="w-4 h-4 text-slate-400" />
                                            Código de Acceso
                                        </label>
                                        <Input
                                            placeholder="Ej: A1B2C3"
                                            type="password"
                                            value={accessCode}
                                            onChange={(e) => setAccessCode(e.target.value)}
                                            required
                                            className="h-12 text-base"
                                        />
                                    </div>
                                )}
                                <Button 
                                    type="submit" 
                                    className="w-full h-12 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white text-base font-medium shadow-lg shadow-teal-500/25" 
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Buscando...
                                        </>
                                    ) : (
                                        <>
                                            <Search className="w-5 h-5 mr-2" />
                                            Consultar Resultados
                                        </>
                                    )}
                                </Button>
                            </form>

                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        <Alert variant="destructive" className="mt-4">
                                            <AlertCircle className="w-4 h-4" />
                                            <AlertTitle>Error</AlertTitle>
                                            <AlertDescription>{error}</AlertDescription>
                                        </Alert>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <AnimatePresence>
                                {result && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        className="mt-8 space-y-4"
                                    >
                                        <Separator />
                                        
                                        {/* Paciente Info Card */}
                                        <div className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-100">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-full bg-white shadow-sm">
                                                    <User className="w-5 h-5 text-teal-600" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">{result.patient.name}</p>
                                                    <p className="text-sm text-slate-500">Cédula: {result.patient.cedula}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {result.results.length === 0 ? (
                                            <Alert className="border-amber-200 bg-amber-50">
                                                <AlertCircle className="w-4 h-4 text-amber-600" />
                                                <AlertDescription className="text-amber-800">
                                                    No se encontraron resultados disponibles.
                                                </AlertDescription>
                                            </Alert>
                                        ) : (
                                            <div className="space-y-3">
                                                <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
                                                    <FileText className="w-4 h-4" />
                                                    {result.results.length} resultado{result.results.length > 1 ? 's' : ''} encontrado{result.results.length > 1 ? 's' : ''}
                                                </p>
                                                
                                                {result.results.map((exam, index) => (
                                                    <motion.div 
                                                        key={exam.id}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: index * 0.1 }}
                                                        className="group p-4 border rounded-xl hover:shadow-lg hover:border-teal-200 transition-all bg-white"
                                                    >
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                                <div className={`p-2 rounded-lg ${getExamTypeColor(exam.examType)}`}>
                                                                    {getExamTypeIcon(exam.examType)}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
                                                                        {exam.examName}
                                                                    </p>
                                                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                                                        <span className="text-xs text-slate-500 flex items-center gap-1">
                                                                            <Calendar className="w-3 h-3" />
                                                                            {new Date(exam.orderedDate).toLocaleDateString('es-PA', { 
                                                                                day: 'numeric',
                                                                                month: 'short',
                                                                                year: 'numeric'
                                                                            })}
                                                                        </span>
                                                                        <Badge variant="outline" className={`text-xs ${getStatusColor(exam.status)}`}>
                                                                            {getStatusIcon(exam.status)}
                                                                            <span className="ml-1">{getStatusLabel(exam.status)}</span>
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-2">
                                                                {exam.canDownload && (
                                                                    <>
                                                                        <Button 
                                                                            size="sm" 
                                                                            variant="outline"
                                                                            className="text-teal-600 border-teal-200 hover:bg-teal-50"
                                                                            onClick={() => handleViewResult(exam.id)}
                                                                        >
                                                                            <Eye className="w-4 h-4 mr-1" />
                                                                            Ver
                                                                        </Button>
                                                                        <Button 
                                                                            size="sm"
                                                                            className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-700 hover:to-cyan-700"
                                                                            onClick={() => handleDownload(exam.id, exam.examName)}
                                                                            disabled={downloadingId === exam.id}
                                                                        >
                                                                            {downloadingId === exam.id ? (
                                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                            ) : (
                                                                                <>
                                                                                    <Download className="w-4 h-4 mr-1" />
                                                                                    PDF
                                                                                </>
                                                                            )}
                                                                        </Button>
                                                                    </>
                                                                )}
                                                                {!exam.canDownload && (
                                                                    <span className="text-xs text-slate-400 italic">
                                                                        En proceso...
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </CardContent>
                    </Card>

                    {/* Consejos de ayuda rápida */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="mt-8"
                    >
                        <Card className="bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200">
                            <CardContent className="py-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-1.5 bg-teal-100 rounded-md">
                                        <HelpCircle className="w-4 h-4 text-teal-700" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium text-teal-900 mb-2">Preguntas Frecuentes</p>
                                        <div className="grid sm:grid-cols-2 gap-2 text-sm text-teal-800">
                                            <div className="flex items-start gap-2">
                                                <span className="text-teal-500">•</span>
                                                <span><strong>¿Dónde está mi código?</strong> En su factura de laboratorio</span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <span className="text-teal-500">•</span>
                                                <span><strong>¿Tiempo de entrega?</strong> 24-72h según el examen</span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <span className="text-teal-500">•</span>
                                                <span><strong>Valores alterados</strong> consulte a su médico</span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <span className="text-teal-500">•</span>
                                                <span><strong>Descargar PDF</strong> disponible al completar</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Contacto para Ayuda */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="mt-8 text-center"
                    >
                        <Card className="bg-white/50 border-slate-200/50">
                            <CardContent className="py-6">
                                <p className="text-slate-600 mb-2">¿No tiene su código de acceso?</p>
                                <p className="font-medium text-slate-900">Comuníquese con nosotros</p>
                                <p className="text-teal-600 font-semibold text-lg mt-1">+507 XXX-XXXX</p>
                                <p className="text-sm text-slate-500 mt-2">Lunes a Viernes: 7:00 AM - 5:00 PM</p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            </main>

            {/* Resultados Dialog */}
            <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    {loadingDetail ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <DialogHeader>
                                <DialogTitle className="sr-only">Cargando resultado</DialogTitle>
                            </DialogHeader>
                            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                        </div>
                    ) : selectedResult && (
                        <div ref={printRef}>
                            <DialogHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600">
                                            <FileText className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <DialogTitle className="text-xl">{selectedResult.examName}</DialogTitle>
                                            <p className="text-sm text-slate-500 mt-1">
                                                {selectedResult.orderedDate && new Date(selectedResult.orderedDate).toLocaleDateString('es-PA', {
                                                    weekday: 'long',
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge className={getStatusColor(selectedResult.status)}>
                                        {getStatusIcon(selectedResult.status)}
                                        <span className="ml-1">{getStatusLabel(selectedResult.status)}</span>
                                    </Badge>
                                </div>
                            </DialogHeader>

                            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="details" className="flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        Detalles
                                    </TabsTrigger>
                                    <TabsTrigger value="video" className="flex items-center gap-2">
                                        <Film className="w-4 h-4" />
                                        Video Resumen
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="details" className="space-y-6 mt-6">
                                    {/* Paciente Info */}
                                    <div className="p-4 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200">
                                        <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                            <User className="w-4 h-4" />
                                            Información del Paciente
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-slate-500">Nombre:</span>
                                                <p className="font-medium">{selectedResult.patientName}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">Cédula:</span>
                                                <p className="font-medium">{selectedResult.patientCedula}</p>
                                            </div>
                                            {selectedResult.patientDob && (
                                                <div>
                                                    <span className="text-slate-500">Fecha de Nacimiento:</span>
                                                    <p className="font-medium">
                                                        {new Date(selectedResult.patientDob).toLocaleDateString('es-PA')}
                                                    </p>
                                                </div>
                                            )}
                                            {selectedResult.patientBloodType && (
                                                <div>
                                                    <span className="text-slate-500">Tipo de Sangre:</span>
                                                    <p className="font-medium text-red-600">{selectedResult.patientBloodType}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Datos de resultados */}
                                    <div className="p-4 rounded-xl border border-teal-100 bg-teal-50/30">
                                        <h3 className="font-semibold text-teal-800 mb-4 flex items-center gap-2">
                                            <Activity className="w-4 h-4" />
                                            {selectedResult.data.title}
                                        </h3>

                                        {selectedResult.data.type === 'table' && selectedResult.data.items && (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b border-teal-200">
                                                            <th className="text-left py-2 font-semibold text-slate-700">Parámetro</th>
                                                            <th className="text-center py-2 font-semibold text-slate-700">Resultado</th>
                                                            <th className="text-center py-2 font-semibold text-slate-700">Unidad</th>
                                                            <th className="text-center py-2 font-semibold text-slate-700">Referencia</th>
                                                            <th className="text-center py-2 font-semibold text-slate-700">Estado</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {selectedResult.data.items.map((item, idx) => (
                                                            <tr key={idx} className="border-b border-teal-100/50 hover:bg-teal-50/50">
                                                                <td className="py-3 font-medium">{item.name}</td>
                                                                <td className="py-3 text-center font-bold text-lg">{item.value}</td>
                                                                <td className="py-3 text-center text-slate-500">{item.unit}</td>
                                                                <td className="py-3 text-center text-slate-500">{item.reference}</td>
                                                                <td className="py-3 text-center">
                                                                    <Badge 
                                                                        variant="outline" 
                                                                        className={
                                                                            item.status === 'normal' 
                                                                                ? 'bg-green-50 text-green-700 border-green-200' 
                                                                                : item.status === 'high'
                                                                                ? 'bg-red-50 text-red-700 border-red-200'
                                                                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                                                        }
                                                                    >
                                                                        {item.status === 'normal' ? '✓ Normal' : item.status === 'high' ? '↑ Alto' : '↓ Bajo'}
                                                                    </Badge>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {selectedResult.data.type === 'text' && selectedResult.data.sections && (
                                            <div className="space-y-4">
                                                {selectedResult.data.sections.map((section, idx) => (
                                                    <div key={idx}>
                                                        <h4 className="font-medium text-slate-700">{section.heading}</h4>
                                                        <p className="text-slate-600 mt-1">{section.content}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Información del médico */}
                                    <div className="p-4 rounded-xl border border-slate-200 bg-white">
                                        <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                            <Stethoscope className="w-4 h-4" />
                                            Información Médica
                                        </h3>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-slate-500">Ordenado por:</span>
                                                <p className="font-medium">{selectedResult.orderedBy}</p>
                                                {selectedResult.orderedBySpecialty && (
                                                    <p className="text-xs text-teal-600">{selectedResult.orderedBySpecialty}</p>
                                                )}
                                            </div>
                                            <div>
                                                <span className="text-slate-500">Revisado por:</span>
                                                <p className="font-medium">{selectedResult.reviewedBy}</p>
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="video" className="mt-6">
                                    {selectedResult.data.type === 'table' && selectedResult.data.items ? (
                                        <div className="space-y-4">
                                            <div className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border border-teal-100">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="p-2 rounded-lg bg-teal-500/10">
                                                        <Play className="w-5 h-5 text-teal-600" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-teal-800">Video Resumen Animado</h3>
                                                        <p className="text-sm text-teal-600">Vea sus resultados en formato de video interactivo</p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <Suspense fallback={
                                                <div className="flex items-center justify-center py-20 bg-slate-100 rounded-xl">
                                                    <div className="text-center">
                                                        <Loader2 className="w-8 h-8 animate-spin text-teal-600 mx-auto mb-2" />
                                                        <p className="text-slate-500">Cargando reproductor...</p>
                                                    </div>
                                                </div>
                                            }>
                                                <ResultsPlayer
                                                    patientName={selectedResult.patientName}
                                                    examName={selectedResult.examName}
                                                    examDate={selectedResult.orderedDate ? new Date(selectedResult.orderedDate).toLocaleDateString('es-PA', {
                                                        day: 'numeric',
                                                        month: 'long',
                                                        year: 'numeric'
                                                    }) : ''}
                                                    items={selectedResult.data.items}
                                                    doctorName={selectedResult.reviewedBy !== 'Pendiente' ? selectedResult.reviewedBy : undefined}
                                                />
                                            </Suspense>

                                            <p className="text-xs text-slate-500 text-center">
                                                Use los controles del reproductor para pausar, reproducir o navegar por el video
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 bg-slate-50 rounded-xl">
                                            <Film className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                            <p className="text-slate-500">
                                                El video resumen está disponible solo para exámenes con resultados tabulares
                                            </p>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>

                            {/* Acciones */}
                            <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t">
                                <Button variant="outline" onClick={() => setShowResultDialog(false)}>
                                    <X className="w-4 h-4 mr-2" />
                                    Cerrar
                                </Button>
                                <Button variant="outline" onClick={handlePrint}>
                                    <Printer className="w-4 h-4 mr-2" />
                                    Imprimir
                                </Button>
                                <Button 
                                    className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white"
                                    onClick={() => handleDownload(selectedResult.id, selectedResult.examName)}
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Descargar PDF
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
