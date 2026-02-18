import { NextResponse, NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth-middleware'

// Crear una nueva entrada en el registro de seguridad
export async function logSecurityEvent(params: {
    eventType: string
    description: string
    userId?: string
    userEmail?: string
    userRole?: string
    ipAddress?: string
    userAgent?: string
    metadata?: Record<string, any>
    success?: boolean
}) {
    try {
        // Utilizar el cliente de administración para bypass el RLS para el registro.
        const adminClient = createAdminClient()
        
        // Asignar tipos de eventos a valores permitidos en la restricción de la base de datos:
        // “LOGIN”, “LOGOUT”, “LOGIN_FAILED”, “REGISTER”,
        // “PASSWORD_CHANGE”, “PASSWORD_RESET”,
        // “DATA_ACCESS”, “DATA_MODIFICATION”, “DATA_DELETION”,
        // «DATA_EXPORT», «UNAUTHORIZED_ACCESS»,
        // «DOCTOR_APPROVAL», «DOCTOR_REJECTION»,
        // «ETL_IMPORT», «ETL_EXPORT»
        const eventTypeMap: Record<string, string> = {
            'DOCTOR_REGISTRATION_APPROVED': 'DOCTOR_APPROVAL',
            'DOCTOR_REGISTRATION_REJECTED': 'DOCTOR_REJECTION',
            'DOCTOR_REGISTRATION_REQUEST': 'REGISTER',
            'DOCTOR_UPDATED': 'DATA_MODIFICATION',
            'DOCTOR_DELETED': 'DATA_DELETION',
            'LOGIN_SUCCESS': 'LOGIN',
            'LOGIN': 'LOGIN',
            'LOGIN_FAILED': 'LOGIN_FAILED',
            'LOGOUT': 'LOGOUT',
            'REGISTRATION': 'REGISTER',
            'REGISTER': 'REGISTER',
            'DATA_ACCESS': 'DATA_ACCESS',
            'acceso_datos': 'DATA_ACCESS',
            'DATA_MODIFICATION': 'DATA_MODIFICATION',
            'DATA_DELETION': 'DATA_DELETION',
            'DATA_EXPORT': 'DATA_EXPORT',
            'UNAUTHORIZED_ACCESS': 'UNAUTHORIZED_ACCESS',
            'APPOINTMENT_CREATED': 'DATA_MODIFICATION',
            'APPOINTMENT_UPDATED': 'DATA_MODIFICATION',
            'APPOINTMENT_CANCELLED': 'DATA_MODIFICATION',
            'APPOINTMENT_COMPLETED': 'DATA_MODIFICATION',
            'PASSWORD_CHANGE': 'PASSWORD_CHANGE',
            'PASSWORD_RECOVERY': 'PASSWORD_RESET',
            'PASSWORD_RESET': 'PASSWORD_RESET',
            'ETL_IMPORT': 'ETL_IMPORT',
            'ETL_EXPORT': 'ETL_EXPORT',
            'DOCTOR_APPROVAL': 'DOCTOR_APPROVAL',
            'DOCTOR_REJECTION': 'DOCTOR_REJECTION'
        }
        
        // Por defecto, DATA_ACCESS si no está asignado (valor de restricción válido)
        const tipoEvento = eventTypeMap[params.eventType] || 'DATA_ACCESS'
        
        const { error } = await adminClient
            .from('registros_seguridad')
            .insert({
                tipo_evento: tipoEvento,
                descripcion: params.description,
                usuario_id: params.userId,
                usuario_email: params.userEmail,
                usuario_tipo: params.userRole || 'system',
                direccion_ip: params.ipAddress || 'unknown',
                user_agent: params.userAgent,
                metadatos: params.metadata || {},
                exitoso: params.success !== false
            })
        
        if (error) {
            console.error('Error logging security event:', error)
        }
    } catch (error) {
        console.error('Failed to log security event:', error)
    }
}

// Helper para extraer la IP de la solicitud
export function getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIP = request.headers.get('x-real-ip')
    
    if (forwarded) {
        return forwarded.split(',')[0].trim()
    }
    if (realIP) {
        return realIP
    }
    return '127.0.0.1'
}

async function handleGet(request: NextRequest) {
    try {
        // Utilizar el cliente de administración para omitir RLS para leer registros.
        const adminClient = createAdminClient()
        const { searchParams } = new URL(request.url)
        const limit = parseInt(searchParams.get('limit') || '50')
        const eventType = searchParams.get('eventType')
        const severity = searchParams.get('severity')

        let query = adminClient
            .from('registros_seguridad')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit)

        if (eventType) {
            query = query.eq('tipo_evento', eventType)
        }
        if (severity) {
            query = query.eq('severidad', severity)
        }

        const { data, error } = await query

        if (error) throw error

        const mappedLogs = (data || []).map(log => ({
            id: log.id,
            event_type: log.tipo_evento,
            event_description: log.descripcion,
            user_id: log.usuario_id,
            user_email: log.usuario_email,
            user_role: log.usuario_tipo,
            ip_address: log.direccion_ip,
            user_agent: log.user_agent,
            metadata: log.metadatos,
            success: log.exitoso,
            severity: log.exitoso === false ? 'error' : 'info',
            created_at: log.created_at
        }))

        return NextResponse.json({ logs: mappedLogs })
    } catch (error) {
        console.error('Error fetching security logs:', error)
        return NextResponse.json(
            { error: 'Error al obtener logs de seguridad' },
            { status: 500 }
        )
    }
}

async function handlePost(request: NextRequest) {
    try {
        const body = await request.json()
        const ip = getClientIP(request)
        const userAgent = request.headers.get('user-agent') || undefined

        await logSecurityEvent({
            eventType: body.eventType,
            description: body.description,
            userId: body.userId,
            userEmail: body.userEmail,
            userRole: body.userRole,
            ipAddress: ip,
            userAgent: userAgent,
            metadata: body.metadata
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error creating security log:', error)
        return NextResponse.json(
            { error: 'Error al crear log de seguridad' },
            { status: 500 }
        )
    }
}

export async function GET(request: NextRequest) {
    return withAuth(request, handleGet)
}

export async function POST(request: NextRequest) {
    return withAuth(request, handlePost)
}
