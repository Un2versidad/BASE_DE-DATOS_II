'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload, Database, FileText, AlertCircle, Loader2, X, RefreshCw, Clock, FileCheck, FileWarning, Trash2, Users, TestTube } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getImportJobs, importPatients, clearImportHistory, importLabResults } from '@/app/patient-actions'
import type { ImportJob, PatientImportData } from '@/lib/patient-types'
import type { LabResultImportData } from '@/app/patient-actions'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

type ImportType = 'patients' | 'labResults'

export default function ImportPage() {
    const [isDragging, setIsDragging] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [history, setHistory] = useState<ImportJob[]>([])
    const [loading, setLoading] = useState(true)
    const [importType, setImportType] = useState<ImportType>('patients')
    const [stats, setStats] = useState<{ totalRecordsToday: number; lastSync: string | null }>({
        totalRecordsToday: 0,
        lastSync: null
    })

    useEffect(() => {
        loadHistory()
    }, [])

    const loadHistory = async () => {
        setLoading(true)
        try {
            const result = await getImportJobs()
            if (result.data) {
                setHistory(result.data)
                const today = new Date().toDateString()
                const todayRecords = result.data
                    .filter(job => new Date(job.created_at).toDateString() === today)
                    .reduce((acc, job) => acc + (job.successful_records || 0), 0)
                const lastJob = result.data[0]
                setStats({
                    totalRecordsToday: todayRecords,
                    lastSync: lastJob?.completed_at || lastJob?.created_at || null
                })
            }
        } catch (error) {
            console.error('Error loading import history:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0])
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0])
        }
    }

    const validateAndSetFile = (selectedFile: File) => {
        const validExtensions = ['.csv', '.json']
        const isValid = validExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext))
        if (!isValid) {
            toast.error('Formato no soportado', { description: 'Solo se aceptan archivos CSV o JSON' })
            return
        }
        if (selectedFile.size > 50 * 1024 * 1024) {
            toast.error('Archivo muy grande', { description: 'El tamaño máximo permitido es 50MB' })
            return
        }
        setFile(selectedFile)
    }

    const parseFile = async (file: File): Promise<PatientImportData[]> => {
        const text = await file.text()
        if (file.name.endsWith('.json')) {
            const json = JSON.parse(text)
            return Array.isArray(json) ? json : (json.data || json.pacientes || json.patients || [])
        } else {
            const lines = text.split('\n').filter(line => line.trim())
            if (lines.length < 2) return []
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
            const records: PatientImportData[] = []
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
                const record: any = {}
                headers.forEach((header, index) => {
                    const normalizedHeader = header
                        .replace('nombre_completo', 'nombre')
                        .replace('full_name', 'nombre')
                        .replace('name', 'nombre')
                        .replace('id_number', 'cedula')
                        .replace('phone', 'telefono')
                        .replace('address', 'direccion')
                        .replace('birth_date', 'fecha_nacimiento')
                        .replace('blood_type', 'tipo_sangre')
                        .replace('allergies', 'alergias')
                        .replace('conditions', 'condiciones')
                        .replace('notes', 'notas')
                    if (values[index]) record[normalizedHeader] = values[index]
                })
                if (record.cedula && record.nombre) records.push(record as PatientImportData)
            }
            return records
        }
    }

    const parseLabResultsFile = async (file: File): Promise<LabResultImportData[]> => {
        const text = await file.text()
        if (file.name.endsWith('.json')) {
            const json = JSON.parse(text)
            // Manejar resultados de laboratorio estructurados JSON
            if (json.resultados) {
                return json.resultados.map((r: any) => ({
                    paciente_cedula: r.paciente?.cedula || r.paciente_cedula,
                    nombre_examen: r.examen?.nombre || r.nombre_examen,
                    tipo_examen: r.examen?.tipo || r.tipo_examen || 'quimica_sanguinea',
                    estado: r.estado || 'completado',
                    prioridad: r.prioridad || 'normal',
                    fecha_orden: r.fecha_orden || r.fecha || new Date().toISOString().split('T')[0],
                    fecha_completado: r.fecha_completado,
                    resultados: r.resultados,
                    interpretacion: r.interpretacion,
                    notas: r.notas
                }))
            }
            return Array.isArray(json) ? json : (json.data || [])
        } else {
            const lines = text.split('\n').filter(line => line.trim())
            if (lines.length < 2) return []
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
            const records: LabResultImportData[] = []
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
                const record: any = {}
                headers.forEach((header, index) => {
                    const normalizedHeader = header
                        .replace('cedula', 'paciente_cedula')
                        .replace('cedula_paciente', 'paciente_cedula')
                        .replace('patient_id', 'paciente_cedula')
                        .replace('exam_name', 'nombre_examen')
                        .replace('exam_type', 'tipo_examen')
                        .replace('order_date', 'fecha_orden')
                        .replace('completed_date', 'fecha_completado')
                        .replace('priority', 'prioridad')
                        .replace('status', 'estado')
                    if (values[index]) record[normalizedHeader] = values[index]
                })
                if (record.paciente_cedula && record.nombre_examen && record.tipo_examen) {
                    records.push(record as LabResultImportData)
                }
            }
            return records
        }
    }

    const handleUpload = async () => {
        if (!file) return
        setUploading(true)
        setProgress(0)
        try {
            setProgress(10)
            
            if (importType === 'patients') {
                const records = await parseFile(file)
                if (records.length === 0) throw new Error('No se encontraron registros válidos en el archivo')
                setProgress(30)
                const result = await importPatients(records, file.name)
                setProgress(90)
                if (result.error) throw new Error(result.error)
                setProgress(100)
                await loadHistory()
                toast.success('Importación completada', {
                    description: `${file.name}: ${result.job?.successful_records || 0} pacientes importados, ${result.job?.failed_records || 0} fallidos`
                })
            } else {
                const records = await parseLabResultsFile(file)
                if (records.length === 0) throw new Error('No se encontraron resultados de laboratorio válidos en el archivo')
                setProgress(30)
                const result = await importLabResults(records, file.name)
                setProgress(90)
                if (result.error) throw new Error(result.error)
                setProgress(100)
                await loadHistory()
                toast.success('Importación completada', {
                    description: `${file.name}: ${result.job?.successful_records || 0} resultados importados, ${result.job?.failed_records || 0} fallidos`
                })
            }
            
            setFile(null)
        } catch (error: any) {
            toast.error('Error en la importación', { description: error.message || 'Error desconocido' })
        } finally {
            setUploading(false)
            setProgress(0)
        }
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'N/A'
        try {
            return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: es })
        } catch {
            return 'Fecha inválida'
        }
    }

    // Comprueba si el trabajo tiene todos los duplicados (los completados pero fallidos son duplicados).
    const isAllDuplicates = (job: ImportJob) => {
        if (job.status === 'completed' && job.successful_records === 0 && job.failed_records > 0) {
            // Comprueba si error_log contiene solo duplicados.
            const errorLog = job.error_log as any[] | null
            if (errorLog && errorLog.length > 0) {
                return errorLog.every((e: any) => e.isDuplicate)
            }
        }
        return false
    }

    const getStatusIcon = (job: ImportJob) => {
        if (isAllDuplicates(job)) return <AlertCircle className="h-4 w-4 text-yellow-600" />
        switch (job.status) {
            case 'completed': return <FileCheck className="h-4 w-4 text-green-600" />
            case 'failed': return <FileWarning className="h-4 w-4 text-red-600" />
            case 'processing': return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
            default: return <Clock className="h-4 w-4 text-yellow-600" />
        }
    }

    const getStatusLabel = (job: ImportJob) => {
        if (isAllDuplicates(job)) return 'Ya existen'
        switch (job.status) {
            case 'completed': return 'Completado'
            case 'failed': return 'Fallido'
            case 'processing': return 'Procesando'
            default: return job.status
        }
    }

    const getStatusColor = (job: ImportJob) => {
        if (isAllDuplicates(job)) return 'text-yellow-600'
        switch (job.status) {
            case 'completed': return 'text-green-600'
            case 'failed': return 'text-red-600'
            case 'processing': return 'text-blue-600'
            default: return 'text-yellow-600'
        }
    }

    return (
        <div className="space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Importación ETL</h1>
                    <p className="text-slate-500 mt-2">
                        Carga masiva de datos con cifrado automático (Extract, Transform, Load).
                    </p>
                </div>
                <Button variant="outline" onClick={loadHistory} disabled={loading}>
                    <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                    Actualizar
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Selector de tipo de importación */}
                <Card className="md:col-span-2">
                    <CardContent className="py-4">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm font-medium text-slate-700">Tipo de importación:</span>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant={importType === 'patients' ? 'default' : 'outline'}
                                className={cn(
                                    "flex-1 gap-2",
                                    importType === 'patients' && "bg-teal-600 hover:bg-teal-700"
                                )}
                                onClick={() => { setImportType('patients'); setFile(null) }}
                            >
                                <Users className="h-4 w-4" />
                                Pacientes
                            </Button>
                            <Button
                                variant={importType === 'labResults' ? 'default' : 'outline'}
                                className={cn(
                                    "flex-1 gap-2",
                                    importType === 'labResults' && "bg-purple-600 hover:bg-purple-700"
                                )}
                                onClick={() => { setImportType('labResults'); setFile(null) }}
                            >
                                <TestTube className="h-4 w-4" />
                                Resultados de Laboratorio
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className={cn(
                    "md:col-span-2 border-dashed border-2 transition-colors",
                    isDragging ? "border-teal-500 bg-teal-50" : "border-slate-300"
                )}>
                    <CardContent
                        className="flex flex-col items-center justify-center py-12 cursor-pointer"
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        {!file ? (
                            <>
                                <div className={cn(
                                    "p-4 rounded-full mb-4",
                                    importType === 'patients' ? "bg-teal-50" : "bg-purple-50"
                                )}>
                                    {importType === 'patients' ? (
                                        <Users className="h-8 w-8 text-teal-600" />
                                    ) : (
                                        <TestTube className="h-8 w-8 text-purple-600" />
                                    )}
                                </div>
                                <h3 className="text-lg font-semibold mb-2">
                                    {importType === 'patients' ? 'Importar Pacientes' : 'Importar Resultados de Laboratorio'}
                                </h3>
                                <p className="text-slate-500 text-sm mb-6 text-center max-w-sm">
                                    {importType === 'patients' 
                                        ? 'Carga datos de pacientes. La información sensible será cifrada con AES-256-GCM.'
                                        : 'Carga resultados de laboratorio. Los pacientes deben existir previamente en el sistema.'
                                    }
                                </p>
                                <div className="relative">
                                    <input
                                        type="file"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        accept=".csv,.json"
                                        onChange={handleFileSelect}
                                    />
                                    <Button variant="outline" className="pointer-events-none">Seleccionar Archivo</Button>
                                </div>
                                <p className="text-xs text-slate-400 mt-4">
                                    {importType === 'patients'
                                        ? 'Campos: cedula*, nombre* | Opcionales: email, telefono, fecha_nacimiento, tipo_sangre, alergias'
                                        : 'Campos: paciente_cedula*, nombre_examen*, tipo_examen* | Opcionales: estado, prioridad, fecha_orden, resultados'
                                    }
                                </p>
                            </>
                        ) : (
                            <div className="w-full max-w-md space-y-4">
                                <div className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-8 w-8 text-teal-600" />
                                        <div>
                                            <p className="font-medium text-slate-900">{file.name}</p>
                                            <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setFile(null)} disabled={uploading}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                                {uploading && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-slate-600">
                                            <span>Procesando ETL y cifrando...</span>
                                            <span>{progress}%</span>
                                        </div>
                                        <Progress value={progress} className="h-2" />
                                    </div>
                                )}
                                <Button
                                    className={cn(
                                        "w-full text-white gap-2",
                                        importType === 'patients' 
                                            ? "bg-teal-600 hover:bg-teal-700" 
                                            : "bg-purple-600 hover:bg-purple-700"
                                    )}
                                    onClick={handleUpload}
                                    disabled={uploading}
                                >
                                    {uploading ? (
                                        <><Loader2 className="h-4 w-4 animate-spin" />Procesando...</>
                                    ) : (
                                        <><Upload className="h-4 w-4" />Iniciar Importación</>
                                    )}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5 text-slate-500" />
                            Estado del Sistema ETL
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-green-50 text-green-700 rounded-lg">
                            <span className="text-sm font-medium">Servicio ETL: Activo</span>
                            <div className="h-2 w-2 rounded-full bg-green-600 animate-pulse" />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Última sincronización</span>
                            <span className="font-medium">{stats.lastSync ? formatDate(stats.lastSync) : 'Sin actividad'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Registros importados (Hoy)</span>
                            <span className="font-medium">{stats.totalRecordsToday.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Total de importaciones</span>
                            <span className="font-medium">{history.length}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-slate-500" />
                                    Historial de Cargas
                                </CardTitle>
                                <CardDescription>Últimas {Math.min(history.length, 10)} importaciones</CardDescription>
                            </div>
                            {history.length > 0 && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={async () => {
                                        const result = await clearImportHistory()
                                        if (result.success) {
                                            toast.success('Historial limpiado')
                                            loadHistory()
                                        } else {
                                            toast.error('Error al limpiar', { description: result.error || 'Error desconocido' })
                                        }
                                    }}
                                >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Limpiar
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                            </div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                                <p>No hay importaciones registradas</p>
                                <p className="text-xs mt-1">Sube un archivo CSV o JSON para comenzar</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                {history.slice(0, 10).map((job) => (
                                    <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50/50">
                                        <div className="flex items-center gap-3">
                                            {getStatusIcon(job)}
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{job.file_name}</p>
                                                <p className="text-xs text-slate-500">{formatDate(job.created_at)}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-medium text-slate-700">
                                                {job.successful_records || 0} / {job.total_records} regs
                                            </p>
                                            <p className={cn("text-xs", getStatusColor(job))}>
                                                {getStatusLabel(job)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-blue-500" />
                        Archivos de Ejemplo
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-slate-600 mb-4">
                        Descarga archivos de ejemplo para ver el formato correcto:
                    </p>
                    <div className="flex gap-3 flex-wrap">
                        <a href="/ejemplo-pacientes.csv" download>
                            <Button variant="outline" size="sm">
                                <FileText className="h-4 w-4 mr-2" />ejemplo-pacientes.csv
                            </Button>
                        </a>
                        <a href="/ejemplo-pacientes.json" download>
                            <Button variant="outline" size="sm">
                                <FileText className="h-4 w-4 mr-2" />ejemplo-pacientes.json
                            </Button>
                        </a>
                        <a href="/ejemplo-resultados-lab.csv" download>
                            <Button variant="outline" size="sm">
                                <FileText className="h-4 w-4 mr-2" />ejemplo-resultados-lab.csv
                            </Button>
                        </a>
                        <a href="/ejemplo-resultados-lab.json" download>
                            <Button variant="outline" size="sm">
                                <FileText className="h-4 w-4 mr-2" />ejemplo-resultados-lab.json
                            </Button>
                        </a>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
