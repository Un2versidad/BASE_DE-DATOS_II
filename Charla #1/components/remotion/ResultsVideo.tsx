'use client'

import { 
    AbsoluteFill, 
    interpolate, 
    useCurrentFrame, 
    useVideoConfig,
    spring,
    Sequence
} from 'remotion'

interface ResultItem {
    name: string
    value: string
    unit: string
    reference: string
    status: 'normal' | 'high' | 'low'
}

interface ResultsVideoProps {
    patientName: string
    examName: string
    examDate: string
    items: ResultItem[]
    doctorName?: string
}

// Componente de animación de introducción
const IntroSlide = ({ patientName, examName, examDate }: { patientName: string, examName: string, examDate: string }) => {
    const frame = useCurrentFrame()
    const { fps } = useVideoConfig()

    const logoScale = spring({
        frame,
        fps,
        config: { damping: 12, stiffness: 100 }
    })

    const titleOpacity = interpolate(frame, [15, 30], [0, 1], { extrapolateRight: 'clamp' })
    const titleY = interpolate(frame, [15, 30], [30, 0], { extrapolateRight: 'clamp' })

    const infoOpacity = interpolate(frame, [35, 50], [0, 1], { extrapolateRight: 'clamp' })
    const infoY = interpolate(frame, [35, 50], [20, 0], { extrapolateRight: 'clamp' })

    return (
        <AbsoluteFill style={{
            background: 'linear-gradient(135deg, #0d9488 0%, #0891b2 50%, #14b8a6 100%)',
            justifyContent: 'center',
            alignItems: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
            {/* Decoración de fondo */}
            <div style={{
                position: 'absolute',
                width: '400px',
                height: '400px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                top: '-100px',
                right: '-100px',
            }} />
            <div style={{
                position: 'absolute',
                width: '300px',
                height: '300px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
                bottom: '-50px',
                left: '-50px',
            }} />

            <div style={{
                textAlign: 'center',
                color: 'white',
            }}>
                {/* Logo */}
                <div style={{
                    transform: `scale(${logoScale})`,
                    marginBottom: '30px',
                }}>
                    <div style={{
                        width: '100px',
                        height: '100px',
                        background: 'white',
                        borderRadius: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                    }}>
                        <span style={{ fontSize: '48px' }}>🏥</span>
                    </div>
                </div>

                {/* Título */}
                <div style={{
                    opacity: titleOpacity,
                    transform: `translateY(${titleY}px)`,
                }}>
                    <h1 style={{
                        fontSize: '48px',
                        fontWeight: 'bold',
                        margin: '0 0 10px 0',
                        textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                    }}>
                        MedComLabs
                    </h1>
                    <p style={{
                        fontSize: '24px',
                        opacity: 0.9,
                        margin: 0,
                    }}>
                        Resultados de Laboratorio
                    </p>
                </div>

                {/* Información del paciente */}
                <div style={{
                    opacity: infoOpacity,
                    transform: `translateY(${infoY}px)`,
                    marginTop: '50px',
                    background: 'rgba(255,255,255,0.15)',
                    padding: '20px 40px',
                    borderRadius: '16px',
                    backdropFilter: 'blur(10px)',
                }}>
                    <p style={{ fontSize: '20px', margin: '0 0 8px 0' }}>
                        <strong>Paciente:</strong> {patientName}
                    </p>
                    <p style={{ fontSize: '20px', margin: '0 0 8px 0' }}>
                        <strong>Examen:</strong> {examName}
                    </p>
                    <p style={{ fontSize: '18px', margin: 0, opacity: 0.8 }}>
                        {examDate}
                    </p>
                </div>
            </div>
        </AbsoluteFill>
    )
}

// Animación de un único elemento de resultado
const ResultItemSlide = ({ item, index, total }: { item: ResultItem, index: number, total: number }) => {
    const frame = useCurrentFrame()
    const { fps } = useVideoConfig()

    const scale = spring({
        frame,
        fps,
        config: { damping: 15, stiffness: 120 }
    })

    const statusColors = {
        normal: { bg: '#dcfce7', color: '#166534', icon: '✓' },
        high: { bg: '#fee2e2', color: '#dc2626', icon: '↑' },
        low: { bg: '#fef3c7', color: '#d97706', icon: '↓' }
    }

    const statusStyle = statusColors[item.status]

    // Analizar rango de referencia: maneja «mínimo - máximo», «< máximo», «> mínimo» con varios tipos de guiones.
    const parseRange = (ref: string): { min: number; max: number } | null => {
        const cleaned = ref.replace(/\s/g, '')
        // Prueba el formato mínimo-máximo (guión, guión corto, guión largo, signo menos)
        const rangeMatch = cleaned.match(/^([\d.]+)[–—\-−]([\d.]+)$/)
        if (rangeMatch) return { min: parseFloat(rangeMatch[1]), max: parseFloat(rangeMatch[2]) }
        // < formato máximo
        const ltMatch = cleaned.match(/^<([\d.]+)$/)
        if (ltMatch) return { min: 0, max: parseFloat(ltMatch[1]) }
        // > mi formato
        const gtMatch = cleaned.match(/^>([\d.]+)$/)
        if (gtMatch) {
            const minVal = parseFloat(gtMatch[1])
            return { min: minVal, max: minVal * 2 }
        }
        return null
    }

    const numValue = parseFloat(item.value)
    const range = parseRange(item.reference)

    // Todas las posiciones en una escala unificada, de modo que la zona verde y el punto coincidan.
    let dotPosition = 50
    let greenStartPct = 20
    let greenWidthPct = 60

    if (range && !isNaN(numValue)) {
        const rangeSpan = range.max - range.min
        const padding = rangeSpan > 0 ? rangeSpan * 0.4 : range.max * 0.3
        const viewMin = Math.max(0, range.min - padding)
        const viewMax = range.max + padding
        const viewSpan = viewMax - viewMin || 1

        greenStartPct = ((range.min - viewMin) / viewSpan) * 100
        greenWidthPct = ((range.max - range.min) / viewSpan) * 100
        dotPosition = Math.max(3, Math.min(97, ((numValue - viewMin) / viewSpan) * 100))
    }

    const animatedDotPos = interpolate(frame, [10, 40], [0, dotPosition], { extrapolateRight: 'clamp' })

    return (
        <AbsoluteFill style={{
            background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
            justifyContent: 'center',
            alignItems: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '60px',
        }}>
            {/* Header */}
            <div style={{
                position: 'absolute',
                top: '30px',
                left: '30px',
                display: 'flex',
                alignItems: 'center',
                gap: '15px',
            }}>
                <div style={{
                    width: '50px',
                    height: '50px',
                    background: 'linear-gradient(135deg, #0d9488, #0891b2)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <span style={{ color: 'white', fontSize: '24px' }}>🏥</span>
                </div>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#0d9488' }}>
                    MedComLabs
                </span>
            </div>

            {/* Indicador de progreso */}
            <div style={{
                position: 'absolute',
                top: '40px',
                right: '30px',
                fontSize: '18px',
                color: '#64748b',
            }}>
                {index + 1} / {total}
            </div>

            {/* Contenido principal */}
            <div style={{
                transform: `scale(${scale})`,
                background: 'white',
                borderRadius: '24px',
                padding: '50px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
                maxWidth: '700px',
                width: '100%',
            }}>
                <h2 style={{
                    fontSize: '32px',
                    color: '#1e293b',
                    margin: '0 0 30px 0',
                    textAlign: 'center',
                }}>
                    {item.name}
                </h2>

                {/* Visualización del valor */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'baseline',
                    gap: '10px',
                    marginBottom: '30px',
                }}>
                    <span style={{
                        fontSize: '72px',
                        fontWeight: 'bold',
                        color: statusStyle.color,
                    }}>
                        {item.value}
                    </span>
                    <span style={{
                        fontSize: '24px',
                        color: '#64748b',
                    }}>
                        {item.unit}
                    </span>
                </div>

                {/* Insignia de estado */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '30px',
                }}>
                    <div style={{
                        background: statusStyle.bg,
                        color: statusStyle.color,
                        padding: '12px 30px',
                        borderRadius: '100px',
                        fontSize: '20px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}>
                        <span style={{ fontSize: '24px' }}>{statusStyle.icon}</span>
                        {item.status === 'normal' ? 'Normal' : item.status === 'high' ? 'Alto' : 'Bajo'}
                    </div>
                </div>

                {/* Rango de referencia */}
                <div style={{
                    background: '#f1f5f9',
                    borderRadius: '12px',
                    padding: '20px',
                }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '10px',
                    }}>
                        <span style={{ color: '#64748b', fontSize: '16px' }}>Rango de referencia:</span>
                        <span style={{ color: '#1e293b', fontWeight: '600', fontSize: '18px' }}>
                            {item.reference}
                        </span>
                    </div>
                    {/* Barra animada con indicadores de rango */}
                    <div style={{ position: 'relative' }}>
                        <div style={{
                            height: '12px',
                            background: '#e2e8f0',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            position: 'relative',
                        }}>
                            {/* Zona de rango normal: situada en una escala unificada */}
                            <div style={{
                                position: 'absolute',
                                left: `${greenStartPct}%`,
                                width: `${greenWidthPct}%`,
                                height: '100%',
                                background: 'rgba(22, 163, 74, 0.2)',
                                borderRadius: '6px',
                            }} />
                        </div>
                        {/* Punto indicador de valor: fuera de overflow:hidden para que sea totalmente visible */}
                        <div style={{
                            position: 'absolute',
                            left: `${animatedDotPos}%`,
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '18px',
                            height: '18px',
                            background: statusStyle.color,
                            borderRadius: '50%',
                            border: '3px solid white',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                            zIndex: 2,
                        }} />
                    </div>
                </div>
            </div>
        </AbsoluteFill>
    )
}

// Diapositiva resumen
const SummarySlide = ({ items, doctorName }: { items: ResultItem[], doctorName?: string }) => {
    const frame = useCurrentFrame()
    const { fps } = useVideoConfig()

    const normalCount = items.filter(i => i.status === 'normal').length
    const abnormalCount = items.length - normalCount

    return (
        <AbsoluteFill style={{
            background: 'linear-gradient(135deg, #0d9488 0%, #0891b2 50%, #14b8a6 100%)',
            justifyContent: 'center',
            alignItems: 'center',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '60px',
        }}>
            <div style={{
                background: 'white',
                borderRadius: '24px',
                padding: '50px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                maxWidth: '600px',
                width: '100%',
                textAlign: 'center',
            }}>
                <h2 style={{
                    fontSize: '36px',
                    color: '#1e293b',
                    margin: '0 0 30px 0',
                }}>
                    Resumen de Resultados
                </h2>

                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '30px',
                    marginBottom: '30px',
                }}>
                    <div style={{
                        background: '#dcfce7',
                        padding: '20px 30px',
                        borderRadius: '16px',
                    }}>
                        <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#166534' }}>
                            {normalCount}
                        </div>
                        <div style={{ fontSize: '16px', color: '#166534' }}>Normales</div>
                    </div>
                    {abnormalCount > 0 && (
                        <div style={{
                            background: '#fee2e2',
                            padding: '20px 30px',
                            borderRadius: '16px',
                        }}>
                            <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#dc2626' }}>
                                {abnormalCount}
                            </div>
                            <div style={{ fontSize: '16px', color: '#dc2626' }}>Requieren atención</div>
                        </div>
                    )}
                </div>

                {doctorName && (
                    <div style={{
                        marginTop: '20px',
                        padding: '15px',
                        background: '#f0fdfa',
                        borderRadius: '12px',
                    }}>
                        <p style={{ margin: 0, color: '#0d9488' }}>
                            Revisado por: <strong>{doctorName}</strong>
                        </p>
                    </div>
                )}

                <p style={{
                    marginTop: '30px',
                    color: '#64748b',
                    fontSize: '14px',
                }}>
                    Consulte con su médico para interpretar estos resultados
                </p>
            </div>
        </AbsoluteFill>
    )
}

// Composición principal
export const ResultsVideoComposition = ({
    patientName,
    examName,
    examDate,
    items,
    doctorName
}: ResultsVideoProps) => {
    const INTRO_DURATION = 90 // 3 segundos a 30 fps
    const ITEM_DURATION = 75 // 2,5 segundos por artículo
    const SUMMARY_DURATION = 90 // 3 segundos

    return (
        <>
            {/* Intro */}
            <Sequence from={0} durationInFrames={INTRO_DURATION}>
                <IntroSlide 
                    patientName={patientName}
                    examName={examName}
                    examDate={examDate}
                />
            </Sequence>

            {/* Cada elemento del resultado */}
            {items.map((item, index) => (
                <Sequence 
                    key={index}
                    from={INTRO_DURATION + (index * ITEM_DURATION)}
                    durationInFrames={ITEM_DURATION}
                >
                    <ResultItemSlide 
                        item={item}
                        index={index}
                        total={items.length}
                    />
                </Sequence>
            ))}

            {/* Resumen */}
            <Sequence 
                from={INTRO_DURATION + (items.length * ITEM_DURATION)}
                durationInFrames={SUMMARY_DURATION}
            >
                <SummarySlide items={items} doctorName={doctorName} />
            </Sequence>
        </>
    )
}

// Calcular la duración total
export const getResultsVideoDuration = (itemCount: number) => {
    return 90 + (itemCount * 75) + 90 // introducción + elementos + resumen
}

export default ResultsVideoComposition
