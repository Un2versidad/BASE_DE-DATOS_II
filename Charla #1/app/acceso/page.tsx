'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, Stethoscope, ChevronLeft } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AccessSelectionPage() {
    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/hospital-hero.jpg"
                    alt="Hospital Background"
                    fill
                    className="object-cover"
                    quality={100}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-teal-900/80"></div>
            </div>

            {/* Back Button */}
            <div className="absolute top-6 left-6 z-50">
                <Link href="/">
                    <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 gap-2">
                        <ChevronLeft className="w-4 h-4" />
                        Volver al Inicio
                    </Button>
                </Link>
            </div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-5xl px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-4xl font-bold text-white mb-4">Acceso al Sistema</h1>
                    <p className="text-teal-200 text-lg">Seleccione su tipo de acceso</p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Staff Access */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Link href="/login">
                            <Card className="border-white/10 bg-black/40 backdrop-blur-md shadow-2xl ring-1 ring-white/10 hover:ring-teal-500/50 transition-all duration-300 cursor-pointer group h-full">
                                <CardHeader className="text-center pb-4">
                                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-teal-500 to-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Shield className="w-10 h-10 text-white" />
                                    </div>
                                    <CardTitle className="text-white text-2xl">Personal Administrativo</CardTitle>
                                    <CardDescription className="text-slate-300">
                                        Acceso para personal autorizado del hospital
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <ul className="space-y-2 text-sm text-slate-300">
                                        <li className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-teal-400"></div>
                                            Dashboard administrativo
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-teal-400"></div>
                                            Gestión de citas y pacientes
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-teal-400"></div>
                                            Importación ETL
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-teal-400"></div>
                                            Analytics y reportes
                                        </li>
                                    </ul>
                                    <Button className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white">
                                        Iniciar Sesión
                                    </Button>
                                </CardContent>
                            </Card>
                        </Link>
                    </motion.div>

                    {/* Doctor Access */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Link href="/doctores/login">
                            <Card className="border-white/10 bg-black/40 backdrop-blur-md shadow-2xl ring-1 ring-white/10 hover:ring-blue-500/50 transition-all duration-300 cursor-pointer group h-full">
                                <CardHeader className="text-center pb-4">
                                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Stethoscope className="w-10 h-10 text-white" />
                                    </div>
                                    <CardTitle className="text-white text-2xl">Personal Médico</CardTitle>
                                    <CardDescription className="text-slate-300">
                                        Acceso para doctores y especialistas
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <ul className="space-y-2 text-sm text-slate-300">
                                        <li className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                            Agenda de citas personal
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                            Historial de pacientes
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                            Resultados de laboratorio
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                                            Prescripciones médicas
                                        </li>
                                    </ul>
                                    <Button className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                                        Iniciar Sesión
                                    </Button>
                                </CardContent>
                            </Card>
                        </Link>
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-center mt-8"
                >
                    <p className="text-slate-400 text-sm">
                        ¿Eres doctor y no tienes cuenta?{' '}
                        <Link href="/doctores/registro" className="text-teal-400 hover:text-teal-300 underline">
                            Regístrate aquí
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    )
}
