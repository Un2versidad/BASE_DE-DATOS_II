'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
    Database, 
    Play, 
    Pause, 
    Activity, 
    Shield, 
    Clock,
    AlertCircle,
    CheckCircle2,
    Loader2
} from 'lucide-react'

interface ETLStats {
    totalPipelines: number
    activePipelines: number
    totalDataSources: number
    encryptedRecords: number
    lastProcessedAt: string | null
    errorCount: number
}

interface Pipeline {
    id: string
    name: string
    description: string
    status: 'active' | 'inactive' | 'running' | 'error'
    last_run_at: string | null
    data_sources?: {
        name: string
        source_type: string
    }
}

export default function ETLDashboard() {
    const [stats, setStats] = useState<ETLStats | null>(null)
    const [pipelines, setPipelines] = useState<Pipeline[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const [statsRes, pipelinesRes] = await Promise.all([
                fetch('/api/etl/stats'),
                fetch('/api/etl/pipelines')
            ])

            const statsData = await statsRes.json()
            const pipelinesData = await pipelinesRes.json()

            setStats(statsData.stats)
            setPipelines(pipelinesData.pipelines)
        } catch (error) {
            console.error('Error loading ETL data:', error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: any; icon: any; label: string }> = {
            active: { variant: 'default', icon: CheckCircle2, label: 'Activo' },
            inactive: { variant: 'secondary', icon: Pause, label: 'Inactivo' },
            running: { variant: 'default', icon: Loader2, label: 'Ejecutando' },
            error: { variant: 'destructive', icon: AlertCircle, label: 'Error' },
        }

        const config = variants[status] || variants.inactive
        const Icon = config.icon

        return (
            <Badge variant={config.variant} className="flex items-center gap-1">
                <Icon className={`w-3 h-3 ${status === 'running' ? 'animate-spin' : ''}`} />
                {config.label}
            </Badge>
        )
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
            <div>
                <h1 className="text-3xl font-bold text-slate-900">Sistema ETL</h1>
                <p className="text-slate-600 mt-2">
                    Gestión de pipelines de datos y cifrado
                </p>
            </div>

            {/* Estadisticas Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pipelines Totales</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalPipelines || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.activePipelines || 0} activos
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Fuentes de Datos</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalDataSources || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Conectadas
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Registros Cifrados</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.encryptedRecords || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            AES-256-GCM
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Errores (24h)</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.errorCount || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Últimas 24 horas
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Pipelines Lista */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Pipelines ETL</CardTitle>
                            <CardDescription>
                                Gestiona tus pipelines de extracción, transformación y carga
                            </CardDescription>
                        </div>
                        <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                            <Database className="w-4 h-4 mr-2" />
                            Nuevo Pipeline
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {pipelines.length === 0 ? (
                        <div className="text-center py-12">
                            <Database className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-600">No hay pipelines configurados</p>
                            <p className="text-sm text-slate-500 mt-2">
                                Crea tu primer pipeline para comenzar a procesar datos
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pipelines.map((pipeline) => (
                                <div
                                    key={pipeline.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold text-slate-900">
                                                {pipeline.name}
                                            </h3>
                                            {getStatusBadge(pipeline.status)}
                                        </div>
                                        <p className="text-sm text-slate-600 mb-2">
                                            {pipeline.description || 'Sin descripción'}
                                        </p>
                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                            {pipeline.data_sources && (
                                                <span className="flex items-center gap-1">
                                                    <Database className="w-3 h-3" />
                                                    {pipeline.data_sources.name}
                                                </span>
                                            )}
                                            {pipeline.last_run_at && (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    Última ejecución: {new Date(pipeline.last_run_at).toLocaleString('es-PA')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={pipeline.status === 'running'}
                                        >
                                            {pipeline.status === 'running' ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Ejecutando
                                                </>
                                            ) : (
                                                <>
                                                    <Play className="w-4 h-4 mr-2" />
                                                    Ejecutar
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Cifrado Info */}
            <Card className="border-teal-200 bg-teal-50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-teal-900">
                        <Shield className="w-5 h-5" />
                        Cifrado de Datos
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2 text-sm text-teal-800">
                        <p>✓ Algoritmo: AES-256-GCM (estándar militar)</p>
                        <p>✓ Cada campo tiene su propio IV único</p>
                        <p>✓ Autenticación integrada para detectar manipulaciones</p>
                        <p>✓ Claves derivadas con PBKDF2 (100,000 iteraciones)</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
