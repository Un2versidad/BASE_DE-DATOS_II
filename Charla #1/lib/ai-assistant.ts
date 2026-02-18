// Servicio de asistente de IA que utiliza OpenRouter con DeepSeek R1.

import { OpenRouter } from '@openrouter/sdk'

const SYSTEM_PROMPT = `Eres MedComBot, un asistente virtual de MedComLabs, un sistema hospitalario moderno.

Tu rol es ayudar a:
1. **Pacientes**: Responder preguntas sobre citas, resultados de laboratorio, preparación para exámenes, horarios de atención
2. **Médicos**: Asistir con información sobre protocolos, interpretación de resultados, dosificación de medicamentos (solo como referencia)
3. **Administradores**: Ayudar con reportes, estadísticas y gestión del sistema

**Reglas importantes:**
- NUNCA des diagnósticos médicos definitivos. Siempre recomienda consultar con un profesional
- Sé empático y profesional en todas las respuestas
- Si no sabes algo, admítelo y sugiere consultar con el personal apropiado
- Responde en español por defecto, pero puedes cambiar al idioma del usuario
- Mantén las respuestas concisas pero completas
- Para emergencias médicas, siempre indica llamar al número de emergencias

**Información del sistema:**
- Horario de atención: Lunes a Viernes 8:00 AM - 5:00 PM
- Emergencias: 24/7
- Departamentos: Cardiología, Pediatría, Neurología, Ortopedia, Oncología, Medicina General
- Tiempo de resultados de laboratorio: 24-72 horas dependiendo del examen

Comienza cada conversación de forma amigable y pregunta cómo puedes ayudar.`

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system'
    content: string
}

export interface AIResponse {
    success: boolean
    message?: string
    error?: string
    thinking?: string // DeepSeek R1
}

// Inicializar el cliente OpenRouter
function getOpenRouterClient(): OpenRouter | null {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
        return null
    }
    return new OpenRouter({ apiKey })
}

// Comprueba si la IA está configurada.
export function isAIConfigured(): boolean {
    return !!process.env.OPENROUTER_API_KEY
}

/**
 * Enviar un mensaje al asistente de IA.
 */
export async function chatWithAssistant(
    messages: ChatMessage[],
    context?: {
        userRole?: 'patient' | 'doctor' | 'admin'
        patientName?: string
        doctorSpecialty?: string
    }
): Promise<AIResponse> {
    const client = getOpenRouterClient()
    
    if (!client) {
        // Recurso alternativo para el desarrollo
        if (process.env.NODE_ENV === 'development') {
            console.log('🤖 [DEV MODE] AI response (Simulado) - configure el OPENROUTER_API_KEY')
            return {
                success: true,
                message: '¡Hola! Soy MedComBot. En modo desarrollo el asistente de IA no está activo. Configure OPENROUTER_API_KEY para habilitarlo.'
            }
        }
        return {
            success: false,
            error: 'AI assistant no configurado. Agregue OPENROUTER_API_KEY a su variables de entorno.'
        }
    }

    try {
        // Crear un sistema de avisos sensible al contexto
        let systemPrompt = SYSTEM_PROMPT
        if (context?.userRole === 'doctor') {
            systemPrompt += `\n\nEl usuario es un médico${context.doctorSpecialty ? ` de ${context.doctorSpecialty}` : ''}. Puedes usar terminología médica más técnica. Cuando generes notas clínicas, interpretaciones o instrucciones, escribe siempre en primera persona como si fueras el médico redactando (ejemplo: "Solicito...", "Indico...", "Observo..."). Nunca hables del médico en tercera persona.`
        } else if (context?.userRole === 'patient' && context.patientName) {
            systemPrompt += `\n\nEl usuario es un paciente llamado ${context.patientName}. Usa un tono amable y evita jerga médica compleja.`
        }

        // Preparar mensajes con indicaciones del sistema
        const fullMessages = [
            { role: 'system' as const, content: systemPrompt },
            ...messages
        ]

        // Llamar a DeepSeek R1 a través de OpenRouter
        const response = await client.chat.send({
            chatGenerationParams: {
                model: 'deepseek/deepseek-r1-0528:free',
                messages: fullMessages.map(m => ({
                    role: m.role,
                    content: m.content
                })),
                maxTokens: 2048,
                temperature: 0.7,
            }
        })

        // Gestionar la respuesta (puede ser stream o ChatResponse)
        const chatResponse = response as any
        const assistantMessage = chatResponse?.choices?.[0]?.message?.content

        if (!assistantMessage) {
            return {
                success: false,
                error: 'No response from AI'
            }
        }

        // DeepSeek R1 a veces incluye etiquetas <think> para el razonamiento.
        let message = assistantMessage
        let thinking: string | undefined

        const thinkMatch = assistantMessage.match(/<think>([\s\S]*?)<\/think>/)
        if (thinkMatch) {
            thinking = thinkMatch[1].trim()
            message = assistantMessage.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
        }

        return {
            success: true,
            message,
            thinking
        }
    } catch (error: any) {
        console.error('AI Assistant error:', error)
        return {
            success: false,
            error: error.message || 'Error communicating with AI'
        }
    }
}

/**
 * Consultas rápidas para preguntas frecuentes
 */
export const QUICK_QUERIES = [
    { label: '¿Cómo agendar una cita?', query: '¿Cómo puedo agendar una cita médica?' },
    { label: '¿Cuánto tardan los resultados?', query: '¿Cuánto tiempo tardan los resultados de laboratorio?' },
    { label: 'Preparación para exámenes', query: '¿Qué preparación necesito para un examen de sangre?' },
    { label: 'Horarios de atención', query: '¿Cuáles son los horarios de atención?' },
    { label: 'Contactar emergencias', query: '¿Cómo contacto emergencias?' },
]

/**
 * Consultas médicas específicas para médicos.
 */
export const DOCTOR_QUICK_QUERIES = [
    { label: 'Interpretar hemograma', query: 'Ayúdame a interpretar valores anormales en un hemograma' },
    { label: 'Dosis pediátricas', query: '¿Cómo calcular dosis pediátricas de amoxicilina?' },
    { label: 'Interacciones medicamentosas', query: 'Verificar interacciones entre medicamentos comunes' },
    { label: 'Protocolos de emergencia', query: '¿Cuáles son los protocolos de código azul?' },
]
