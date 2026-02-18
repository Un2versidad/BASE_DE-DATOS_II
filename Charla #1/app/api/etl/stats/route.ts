import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
    try {
        const adminClient = createAdminClient()

        // Obtener estadísticas de la canalización
        const { data: pipelines, error: pipelineError } = await adminClient
            .from('pipelines_etl')
            .select('id, estado, ultima_ejecucion')

        // Obtener el recuento de fuentes de datos
        const { count: sourcesCount } = await adminClient
            .from('fuentes_datos')
            .select('*', { count: 'exact', head: true })
            .eq('activo', true)

        // Obtener estadísticas de trabajos de importación
        const { data: jobs } = await adminClient
            .from('import_jobs')
            .select('successful_records, failed_records, created_at')
            .order('created_at', { ascending: false })
            .limit(100)

        // Obtener el recuento de pacientes cifrados
        const { count: encryptedCount } = await adminClient
            .from('pacientes')
            .select('*', { count: 'exact', head: true })

        // Calcular el último procesado
        const lastJob = jobs?.[0]
        
        // Calcular el recuento de errores en las últimas 24 horas.
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const recentJobs = jobs?.filter(j => new Date(j.created_at) >= yesterday) || []
        const errorCount = recentJobs.reduce((acc, j) => acc + (j.failed_records || 0), 0)

        return NextResponse.json({
            stats: {
                totalPipelines: pipelines?.length || 0,
                activePipelines: pipelines?.filter(p => p.estado === 'active').length || 0,
                totalDataSources: sourcesCount || 0,
                encryptedRecords: encryptedCount || 0,
                lastProcessedAt: lastJob?.created_at || null,
                errorCount: errorCount,
            }
        })
    } catch (error) {
        console.error('Error fetching ETL stats:', error)
        // Devuelve las estadísticas predeterminadas en caso de error.
        return NextResponse.json({
            stats: {
                totalPipelines: 0,
                activePipelines: 0,
                totalDataSources: 0,
                encryptedRecords: 0,
                lastProcessedAt: null,
                errorCount: 0,
            }
        })
    }
}
