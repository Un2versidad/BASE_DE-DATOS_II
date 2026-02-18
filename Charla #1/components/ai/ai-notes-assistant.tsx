'use client'

import { useState, useCallback } from 'react'
import { 
    Sparkles, 
    Loader2, 
    Wand2,
    ChevronDown,
    ChevronUp,
    CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SuggestionTemplate {
    label: string
    text: string
}

interface AINotesAssistantProps {
    /** Tipo de notas que se están escribiendo */
    noteType: 'prescription' | 'exam' | 'consultation' | 'result'
    /** Current value of the notes field */
    value: string
    /** Callback cuando se selecciona una sugerencia */
    onSuggestion: (text: string) => void
    /** Contexto opcional del paciente */
    patientName?: string
    /** Tipo de examen opcional para pedidos de laboratorio */
    examType?: string
    /** Medicamentos opcionales para recetas médicas */
    medication?: string
    /** Contexto de valores de resultado para generar notas de interpretación */
    resultContext?: string
    /** Nombres de clases adicionales */
    className?: string
}

// Plantillas predefinidas para situaciones comunes
const PRESCRIPTION_TEMPLATES: SuggestionTemplate[] = [
    { label: 'Antes de comer', text: 'Tomar 30 minutos antes de las comidas. No consumir alcohol durante el tratamiento.' },
    { label: 'Con alimentos', text: 'Tomar con alimentos para evitar malestar estomacal. Completar todo el tratamiento.' },
    { label: 'En ayunas', text: 'Tomar en ayunas, al menos 1 hora antes del desayuno. Evitar antiácidos.' },
    { label: 'Antes de dormir', text: 'Tomar antes de acostarse. Puede causar somnolencia, no manejar vehículos.' },
    { label: 'Con abundante agua', text: 'Tomar con un vaso lleno de agua. Mantener buena hidratación durante el tratamiento.' },
]

const EXAM_TEMPLATES: SuggestionTemplate[] = [
    { label: 'Ayuno 8-12h', text: 'Paciente debe presentarse en ayuno de 8-12 horas. Solo agua permitida.' },
    { label: 'Sin ayuno', text: 'No requiere ayuno. Puede comer normalmente antes del examen.' },
    { label: 'Muestra 24h', text: 'Recolectar muestra de orina de 24 horas. Iniciar después de primera micción de la mañana.' },
    { label: 'Urgente', text: 'URGENTE: Resultados requeridos lo antes posible. Notificar al médico tratante inmediatamente.' },
    { label: 'Control de medicación', text: 'Examen de control. Paciente en tratamiento con [medicamento]. Verificar niveles séricos.' },
]

const CONSULTATION_TEMPLATES: SuggestionTemplate[] = [
    { label: 'Seguimiento', text: 'Paciente acude a control de seguimiento. Refiere mejoría de síntomas. Continuar tratamiento actual.' },
    { label: 'Primera consulta', text: 'Primera consulta. Paciente refiere [síntomas principales]. Signos vitales dentro de límites normales.' },
    { label: 'Alta médica', text: 'Evolución favorable. Se otorga alta médica. Control en [X] semanas o antes si hay cambios.' },
    { label: 'Interconsulta', text: 'Se solicita interconsulta con [especialidad] para evaluación complementaria.' },
]

const RESULT_TEMPLATES: SuggestionTemplate[] = [
    { label: 'Valores normales', text: 'Todos los valores se encuentran dentro de los rangos de referencia. Sin hallazgos clínicamente significativos.' },
    { label: 'Valor elevado', text: 'Se observa elevación de [parámetro]. Se recomienda repetir examen en [X] días y evaluación clínica.' },
    { label: 'Valor bajo', text: 'Se observa disminución de [parámetro] por debajo del rango normal. Correlacionar con cuadro clínico.' },
    { label: 'Requiere seguimiento', text: 'Resultados requieren seguimiento. Se recomienda control en [X] semanas. Evaluar respuesta al tratamiento.' },
    { label: 'Resultado crítico', text: 'ALERTA: Valor crítico detectado. Notificar al médico tratante de inmediato. Se recomienda atención urgente.' },
]

export function AINotesAssistant({
    noteType,
    value,
    onSuggestion,
    patientName,
    examType,
    medication,
    resultContext,
    className
}: AINotesAssistantProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [lastError, setLastError] = useState<string | null>(null)

    // Obtener plantillas según el tipo de nota
    const templates = noteType === 'prescription' 
        ? PRESCRIPTION_TEMPLATES 
        : noteType === 'exam' 
            ? EXAM_TEMPLATES 
            : noteType === 'result'
                ? RESULT_TEMPLATES
                : CONSULTATION_TEMPLATES

    // Gestionar la selección de plantillas
    const handleTemplateSelect = useCallback((template: SuggestionTemplate) => {
        const newValue = value 
            ? `${value}\n${template.text}` 
            : template.text
        onSuggestion(newValue)
    }, [value, onSuggestion])

    // Generar sugerencias de IA basadas en el contexto y aplicarlas directamente.
    const generateAISuggestion = useCallback(async () => {
        setIsLoading(true)
        setLastError(null)

        // Crear controlador de aborto por tiempo de espera: 15 segundos
        const controller = new AbortController()
        const timeoutId = setTimeout(() => {
            controller.abort()
            setIsLoading(false)
            setLastError('Usando sugerencia predeterminada')
        }, 15000)

        try {
            // Crear un mensaje contextual: solicitar una respuesta BREVE en primera persona (voz del médico).
            let prompt = ''
            let fallbackText = ''
            
            if (noteType === 'prescription' && medication) {
                prompt = `Escribe en primera persona como médico, en máximo 2 líneas, las instrucciones para que el paciente tome ${medication}. Solo el texto de las instrucciones, nada más.`
                fallbackText = `Tomar según indicación médica. Completar el tratamiento prescrito.`
            } else if (noteType === 'exam' && examType) {
                const examNames: Record<string, string> = {
                    'sangre': 'examen de sangre',
                    'orina': 'examen de orina',
                    'imagen': 'estudio de imagen',
                    'cardiaco': 'examen cardíaco',
                }
                prompt = `Escribe en primera persona como médico, en máximo 2 líneas, las instrucciones de preparación para ${examNames[examType] || 'examen'}. Solo el texto, nada más.`
                fallbackText = `Presentarse en ayuno de 8-12 horas. Solo agua permitida.`
            } else if (noteType === 'result' && resultContext) {
                const examLabel = examType ? ` (tipo: ${examType})` : ''
                prompt = `Escribe en primera persona como el médico tratante. Basado en estos resultados de laboratorio${examLabel}, genera mi interpretación clínica breve (máximo 3 líneas). Resultados: ${resultContext.slice(0, 500)}. Solo el texto de la interpretación, sin encabezados ni formato.`
                fallbackText = `Resultados registrados. Pendiente de interpretación clínica.`
            } else {
                prompt = `Escribe en primera persona como médico, en máximo 3 líneas, una nota clínica básica de consulta. Solo el texto estructurado, nada más.`
                fallbackText = `Paciente acude a consulta. Signos vitales dentro de límites normales.`
            }

            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: prompt }],
                    context: { userRole: 'doctor' }
                }),
                signal: controller.signal
            })

            const data = await response.json()
            
            // Comprueba si hemos obtenido una respuesta válida con el mensaje.
            if (data.success && data.message && data.message.trim().length > 0) {
                // Truncar si es demasiado largo (máximo 200 caracteres para recetas/exámenes, 400 para consultas).
                const maxLength = noteType === 'consultation' ? 400 : 200
                let suggestion = data.message.trim()
                if (suggestion.length > maxLength) {
                    suggestion = suggestion.substring(0, maxLength).trim() + '...'
                }
                
                // Aplicar directamente
                const newValue = value 
                    ? `${value}\n${suggestion}` 
                    : suggestion
                onSuggestion(newValue)
            } else if (data.error) {
                // La API devolvió un error: utilice la alternativa.
                setLastError(`Error de IA: ${data.error}`)
                const newValue = value ? `${value}\n${fallbackText}` : fallbackText
                onSuggestion(newValue)
            } else {
                // No se ha devuelto ningún mensaje: utilice la opción alternativa.
                setLastError('Sin respuesta de IA, usando sugerencia predeterminada')
                const newValue = value ? `${value}\n${fallbackText}` : fallbackText
                onSuggestion(newValue)
            }
        } catch (error: any) {
            // Gestionar abortos/tiempos de espera y otros errores
            if (error?.name === 'AbortError') {
                setLastError('Tiempo de espera agotado')
            } else {
                console.error('Error generating AI suggestion:', error)
                setLastError('Error de conexión')
            }
            
            // Utilizar una solución alternativa sencilla en caso de error.
            const fallback = noteType === 'prescription' 
                ? 'Tomar según indicación médica.'
                : noteType === 'exam' 
                    ? 'Presentarse en ayuno si el examen lo requiere.'
                    : 'Nota clínica pendiente de completar.'
            const newValue = value ? `${value}\n${fallback}` : fallback
            onSuggestion(newValue)
        } finally {
            clearTimeout(timeoutId)
            setIsLoading(false)
        }
    }, [noteType, medication, examType, resultContext, value, onSuggestion])

    return (
        <div className={cn('space-y-2', className)}>
            {/* Boton Toggle */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-teal-600 transition-colors"
            >
                <Sparkles className="h-3 w-3" />
                <span>Sugerencias de IA</span>
                {isExpanded ? (
                    <ChevronUp className="h-3 w-3" />
                ) : (
                    <ChevronDown className="h-3 w-3" />
                )}
            </button>

            {/* Panel expandido */}
            {isExpanded && (
                <div className="p-3 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg border border-teal-100 space-y-3">
                    {/* Plantillas rápidas */}
                    <div>
                        <p className="text-xs font-medium text-slate-600 mb-2">Plantillas rápidas:</p>
                        <div className="flex flex-wrap gap-1.5">
                            {templates.map((template, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleTemplateSelect(template)}
                                    className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-md hover:border-teal-300 hover:bg-teal-50 transition-colors"
                                >
                                    {template.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Generación de IA */}
                    <div className="pt-2 border-t border-teal-100">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={generateAISuggestion}
                                disabled={isLoading}
                                className="text-xs h-7 gap-1.5"
                            >
                                {isLoading ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <Wand2 className="h-3 w-3" />
                                )}
                                Generar con IA
                            </Button>
                            {medication && (
                                <span className="text-xs text-slate-500">
                                    para {medication.length > 20 ? medication.slice(0, 20) + '...' : medication}
                                </span>
                            )}
                            {examType && (
                                <span className="text-xs text-slate-500">
                                    para examen de {examType}
                                </span>
                            )}
                            {isLoading && (
                                <span className="text-xs text-slate-400">
                                    Generando...
                                </span>
                            )}
                        </div>
                        {lastError && (
                            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                Sugerencia aplicada
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
