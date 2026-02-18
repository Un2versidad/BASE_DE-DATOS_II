import { NextRequest, NextResponse } from 'next/server'
import { chatWithAssistant, ChatMessage, isAIConfigured } from '@/lib/ai-assistant'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
    try {
        // Rate Limit: 20 solicitudes por minuto por IP.
        const ip = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown'
        
        const rateLimit = await checkRateLimit(ip, 'ai_chat')
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { success: false, error: 'Rate limit exceeded. Please wait before sending more messages.' },
                { status: 429 }
            )
        }

        const body = await request.json()
        const { messages, context } = body as {
            messages: ChatMessage[]
            context?: {
                userRole?: 'patient' | 'doctor' | 'admin'
                patientName?: string
                doctorSpecialty?: string
            }
        }

        // Validar mensajes
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Messages array is required' },
                { status: 400 }
            )
        }

        // Moderación básica de contenidos: bloquear solicitudes claramente perjudiciales.
        const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || ''
        const blockedPatterns = [
            /how to (make|create|build).*(bomb|explosive|weapon)/i,
            /suicide.*(method|how|way)/i,
            /hack.*(medical|patient|record)/i,
        ]
        
        if (blockedPatterns.some(pattern => pattern.test(lastMessage))) {
            return NextResponse.json({
                success: true,
                message: 'Lo siento, no puedo ayudar con esa solicitud. Si necesitas ayuda médica urgente, por favor contacta a los servicios de emergencia o habla con un profesional de salud.'
            })
        }

        // Comprueba si la IA está configurada.
        if (!isAIConfigured() && process.env.NODE_ENV === 'production') {
            return NextResponse.json(
                { success: false, error: 'AI assistant is not configured on this server' },
                { status: 503 }
            )
        }

        // Obtener respuesta de IA
        const response = await chatWithAssistant(messages, context)

        return NextResponse.json(response)
    } catch (error: any) {
        console.error('AI Chat API error:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// GET para comprobar el estado de la IA
export async function GET() {
    return NextResponse.json({
        configured: isAIConfigured(),
        model: 'deepseek/deepseek-r1-0528',
        provider: 'OpenRouter'
    })
}
