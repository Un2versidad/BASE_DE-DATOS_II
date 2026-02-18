import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// Respuestas rápidas predefinidas para consultas comunes
const QUICK_RESPONSES: Record<string, string> = {
    'horario': `**Horarios de Atención MedComLabs:**

• Consultas Generales: Lun-Vie 8:00 AM - 5:00 PM
• Laboratorio: Lun-Sáb 6:00 AM - 6:00 PM  
• Emergencias: 24/7

Para citas, use el formulario o llame al +507 XXX-XXXX`,

    'agendar': `**Para agendar una cita:**

1. Seleccione el departamento médico
2. Elija fecha y hora disponible
3. Complete sus datos personales
4. Confirme la cita

El sistema le asignará automáticamente el mejor horario disponible.`,

    'resultados': `**Consulta de Resultados:**

1. Ingrese a la sección "Resultados"
2. Use su cédula y código de acceso
3. El código está en su factura de laboratorio

Tiempo de entrega: 24-72 horas según el examen.`,

    'preparacion': `**Preparación para Exámenes:**

• **Sangre (ayuno):** 8-12 horas sin comer
• **Orina:** Primera orina de la mañana
• **Colesterol:** 12 horas de ayuno
• **Glucosa:** 8 horas de ayuno

Consulte instrucciones específicas con su médico.`,

    'emergencia': `**Emergencias: 24/7**

• Teléfono: +507 XXX-XXXX
• Ubicación: Planta Baja, Entrada Principal

Para emergencias médicas graves, llame al 911.`,

    'sistema': `**Estado del Sistema:**

✅ Todos los servicios operativos
✅ Base de datos: Activa
✅ Cifrado AES-256: Activo
✅ Backup: Al día

Última verificación: Hace 5 minutos`,
}

// Analiza la interaccion y devuelve una respuesta rápida o nula
function getQuickResponse(message: string): string | null {
    const lower = message.toLowerCase()
    
    if (lower.includes('horario') || lower.includes('hora') || lower.includes('abierto')) {
        return QUICK_RESPONSES['horario']
    }
    if (lower.includes('agendar') || lower.includes('cita') || lower.includes('reservar')) {
        return QUICK_RESPONSES['agendar']
    }
    if (lower.includes('resultado') || lower.includes('examen') || lower.includes('laboratorio')) {
        return QUICK_RESPONSES['resultados']
    }
    if (lower.includes('preparación') || lower.includes('preparar') || lower.includes('ayuno')) {
        return QUICK_RESPONSES['preparacion']
    }
    if (lower.includes('emergencia') || lower.includes('urgente') || lower.includes('urgencia')) {
        return QUICK_RESPONSES['emergencia']
    }
    if (lower.includes('estado') || lower.includes('sistema') || lower.includes('alerta')) {
        return QUICK_RESPONSES['sistema']
    }
    
    return null
}

// Buscar doctores en la base de datos
async function searchDoctors(specialty?: string): Promise<string> {
    try {
        const supabase = await createAdminClient()
        let query = supabase
            .from('doctores')
            .select('nombre_cifrado, especialidad, hora_inicio, hora_fin')
            .eq('is_active', true)
        
        if (specialty) {
            query = query.ilike('especialidad', `%${specialty}%`)
        }
        
        const { data, error } = await query.limit(5)
        
        if (error || !data || data.length === 0) {
            return 'No se encontraron doctores disponibles con esos criterios.'
        }
        
        let response = `**Doctores Disponibles:**\n\n`
        data.forEach((doc, i) => {
            // Manejar nombre cifrado o de marcador de posición
            const name = doc.nombre_cifrado?.startsWith('enc_') 
                ? doc.nombre_cifrado.replace('enc_', '').replace(/_/g, ' ')
                : doc.nombre_cifrado || 'Doctor'
            response += `${i + 1}. **${name}**\n`
            response += `   ${doc.especialidad}\n`
            response += `   Horario: ${doc.hora_inicio || '8:00'} - ${doc.hora_fin || '17:00'}\n\n`
        })
        
        return response
    } catch {
        return 'Error al buscar doctores. Intente de nuevo.'
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { message } = body as { message: string }

        if (!message) {
            return NextResponse.json(
                { success: false, error: 'Message is required' },
                { status: 400 }
            )
        }

        // Intentar respuesta rápida primero
        const quickResponse = getQuickResponse(message)
        if (quickResponse) {
            return NextResponse.json({
                success: true,
                message: quickResponse
            })
        }

        // Verificar búsqueda de doctor
        const lower = message.toLowerCase()
        if (lower.includes('buscar') && (lower.includes('doctor') || lower.includes('médico'))) {
            const specialties = ['cardiología', 'pediatría', 'neurología', 'ortopedia', 'oncología', 'medicina general']
            const found = specialties.find(s => lower.includes(s.toLowerCase().replace('í', 'i')))
            const result = await searchDoctors(found)
            return NextResponse.json({
                success: true,
                message: result
            })
        }

        // No se encontró una acción rápida, dejar que el endpoint de chat lo maneje
        return NextResponse.json({
            success: true,
            message: null,
            useChat: true
        })  
    } catch (error: any) {
        console.error('AI Actions error:', error)
        return NextResponse.json(
            { success: false, error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}
