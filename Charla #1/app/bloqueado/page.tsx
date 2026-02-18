'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Globe, Lock } from 'lucide-react'
import { motion } from 'framer-motion'

export default function BloqueadoPage() {
    const [showRickRoll, setShowRickRoll] = useState(false)

    useEffect(() => {
        // Mostrar rickroll después de 3 segundos
        const timer = setTimeout(() => {
            setShowRickRoll(true)
        }, 3000)
        return () => clearTimeout(timer)
    }, [])

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center max-w-2xl"
            >
                {!showRickRoll ? (
                    <>
                        <motion.div
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="w-24 h-24 mx-auto mb-8 bg-red-500/20 rounded-full flex items-center justify-center"
                        >
                            <AlertTriangle className="w-12 h-12 text-red-500" />
                        </motion.div>

                        <h1 className="text-4xl font-bold mb-4 text-red-500">
                            ⚠️ Acceso Denegado
                        </h1>

                        <div className="flex items-center justify-center gap-2 text-slate-400 mb-6">
                            <Globe className="w-5 h-5" />
                            <span>Región No Autorizada Detectada</span>
                        </div>

                        <p className="text-lg text-slate-300 mb-4">
                            Este sistema está restringido exclusivamente para acceso desde <strong className="text-teal-400">Panamá</strong>.
                        </p>

                        <p className="text-slate-500 mb-8">
                            Su ubicación geográfica ha sido detectada fuera de la región autorizada.
                            Por razones de seguridad y cumplimiento normativo (ISO 27001, IEEE 11073),
                            el acceso desde su ubicación no está permitido.
                        </p>

                        <div className="p-4 bg-slate-800 rounded-lg border border-slate-700 inline-flex items-center gap-3">
                            <Lock className="w-5 h-5 text-teal-500" />
                            <span className="text-sm text-slate-400">
                                Código de Error: <code className="text-red-400">GEO_BLOCK_403</code>
                            </span>
                        </div>

                        <p className="text-xs text-slate-600 mt-8">
                            Verificando su conexión...
                        </p>
                    </>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-6"
                    >
                        <h2 className="text-2xl font-bold text-teal-400 mb-4">
                            🎵 ¡Has sido Rick Rolled! 🎵
                        </h2>

                        <div className="aspect-video w-full max-w-xl mx-auto rounded-xl overflow-hidden shadow-2xl">
                            <iframe
                                width="100%"
                                height="100%"
                                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                                title="Rick Roll"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="border-0"
                            />
                        </div>

                        <p className="text-slate-400 text-sm mt-4">
                            Never gonna give you up, never gonna let you down... 🎶
                        </p>
                    </motion.div>
                )}
            </motion.div>
        </div>
    )
}
