import { NextResponse, NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { encryptData, deriveKey, hashData } from '@/lib/encryption'
import { withAuth } from '@/lib/auth-middleware'

async function handlePost(request: NextRequest) {
    try {
        const body = await request.json()
        const { pipelineId, data: rawData, encryptFields } = body

        if (!pipelineId || !rawData) {
            return NextResponse.json(
                { error: 'Pipeline ID y datos son requeridos' },
                { status: 400 }
            )
        }

        const adminClient = createAdminClient()

        // Actualizar el estado del proceso
        await adminClient
            .from('pipelines_etl')
            .update({ 
                estado: 'running',
                ultima_ejecucion: new Date().toISOString()
            })
            .eq('id', pipelineId)

        // Inicio del registro
        await adminClient
            .from('logs_pipeline')
            .insert({
                pipeline_id: pipelineId,
                nivel: 'info',
                mensaje: `Iniciando procesamiento de ${rawData.length} registros`,
                metadatos: { count: rawData.length }
            })

        const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
        const key = await deriveKey(secret)

        let processedCount = 0
        let errorCount = 0

        // Procesar cada registro
        for (const record of rawData) {
            try {
                let processedData = { ...record }

                // Cifrar los campos especificados
                if (encryptFields && encryptFields.length > 0) {
                    for (const field of encryptFields) {
                        if (record[field]) {
                            const encrypted = await encryptData(String(record[field]), key)
                            processedData[`${field}_encrypted`] = encrypted.encrypted
                            processedData[`${field}_iv`] = encrypted.iv
                            delete processedData[field]
                        }
                    }
                }

                processedCount++
            } catch (error: any) {
                errorCount++
                await adminClient
                    .from('logs_pipeline')
                    .insert({
                        pipeline_id: pipelineId,
                        nivel: 'error',
                        mensaje: `Error procesando registro: ${error.message}`,
                        metadatos: { record, error: error.message }
                    })
            }
        }

        // Actualizar el estado del proceso
        await adminClient
            .from('pipelines_etl')
            .update({ 
                estado: errorCount > 0 ? 'error' : 'active'
            })
            .eq('id', pipelineId)

        // Finalización del registro
        await adminClient
            .from('logs_pipeline')
            .insert({
                pipeline_id: pipelineId,
                nivel: errorCount > 0 ? 'warning' : 'info',
                mensaje: `Procesamiento completado: ${processedCount} exitosos, ${errorCount} errores`,
                metadatos: { processedCount, errorCount }
            })

        return NextResponse.json({
            success: true,
            processedCount,
            errorCount,
        })
    } catch (error: any) {
        console.error('Error processing ETL:', error)
        return NextResponse.json(
            { error: 'Error al procesar datos' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    return withAuth(request, handlePost)
}
