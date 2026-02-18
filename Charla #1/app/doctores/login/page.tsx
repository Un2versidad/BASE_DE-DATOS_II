'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2, Stethoscope, Lock, Eye, EyeOff, ChevronLeft, Mail, CheckCircle2, XCircle, Clock, ShieldAlert } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

function DoctorLoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    })

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const response = await fetch('/api/doctors/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password
                })
            })

            const data = await response.json()

            if (!response.ok) {
                // Mostrar toast según el tipo de error
                switch (data.type) {
                    case 'not_found':
                        toast.error('Correo no registrado', {
                            description: data.error,
                            icon: <XCircle className="w-5 h-5 text-red-500" />
                        })
                        break
                    case 'not_approved':
                        toast.warning('Cuenta pendiente de aprobación', {
                            description: data.error,
                            icon: <Clock className="w-5 h-5 text-amber-500" />,
                            duration: 6000
                        })
                        break
                    case 'inactive':
                        toast.error('Cuenta desactivada', {
                            description: data.error,
                            icon: <ShieldAlert className="w-5 h-5 text-red-500" />
                        })
                        break
                    case 'blocked':
                        toast.error('Cuenta bloqueada', {
                            description: data.error,
                            icon: <ShieldAlert className="w-5 h-5 text-red-500" />,
                            duration: 8000
                        })
                        break
                    case 'invalid_password':
                        toast.error('Contraseña incorrecta', {
                            description: data.error,
                            icon: <XCircle className="w-5 h-5 text-red-500" />
                        })
                        break
                    default:
                        toast.error('Error de autenticación', {
                            description: data.error
                        })
                }
                setLoading(false)
                return
            }

            // Login exitoso
            toast.success(data.message || '¡Bienvenido!', {
                description: 'Redirigiendo al dashboard...',
                icon: <CheckCircle2 className="w-5 h-5 text-green-500" />
            })

            // Guardar access token
            localStorage.setItem('doctor_access_token', data.accessToken)
            localStorage.setItem('doctor_user', JSON.stringify(data.user))
            
            // Redirigir al dashboard de doctor
            setTimeout(() => {
                router.push('/doctores/dashboard')
            }, 1000)
        } catch (err: any) {
            toast.error('Error de conexión', {
                description: 'No se pudo conectar con el servidor. Intente nuevamente.'
            })
            setLoading(false)
        }
    }

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
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-blue-900/80"></div>
            </div>

            {/* Botón de Regresar */}
            <div className="absolute top-6 left-6 z-50">
                <Link href="/acceso">
                    <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 gap-2">
                        <ChevronLeft className="w-4 h-4" />
                        Volver
                    </Button>
                </Link>
            </div>

            {/* Contenido */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10 px-4"
            >
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4">
                        <Stethoscope className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Portal Médico</h1>
                    <p className="text-blue-200/80 mt-2 font-medium">Acceso para Personal Médico</p>
                </div>

                <Card className="border-white/10 bg-black/40 backdrop-blur-md shadow-2xl ring-1 ring-white/10">
                    <CardHeader className="justify-center pb-2">
                        <div className="w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50 mb-4"></div>
                        <CardTitle className="text-white text-center text-xl">
                            Iniciar Sesión
                        </CardTitle>
                        <CardDescription className="text-slate-300 text-center text-sm">
                            Ingrese sus credenciales médicas
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-200 text-xs uppercase tracking-wider font-semibold">
                                    Email Institucional
                                </Label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
                                        <Mail className="h-4 w-4" />
                                    </div>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="doctor@medcomlabs.com"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        disabled={loading}
                                        className="bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-600 pl-10 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-slate-200 text-xs uppercase tracking-wider font-semibold">
                                    Contraseña
                                </Label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
                                        <Lock className="h-4 w-4" />
                                    </div>
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        disabled={loading}
                                        className="bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-600 pl-10 pr-10 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-400 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition-all duration-300 font-medium h-11"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Verificando...
                                    </>
                                ) : (
                                    'Iniciar Sesión'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 border-t border-white/5 pt-6">
                        <p className="text-center text-sm text-slate-400">
                            ¿No tienes cuenta?{' '}
                            <Link href="/doctores/registro" className="text-blue-400 hover:text-blue-300 underline">
                                Regístrate aquí
                            </Link>
                        </p>
                        <div className="flex items-center justify-center gap-2 text-xs text-blue-200/60 bg-blue-900/20 py-1.5 px-3 rounded-full border border-blue-500/10">
                            <Lock className="w-3 h-3" />
                            <span>Conexión Segura · AES-256</span>
                        </div>
                    </CardFooter>
                </Card>

                <p className="text-center text-slate-500 text-xs mt-8">
                    © 2026 MedComLabs - Portal Médico
                </p>
            </motion.div>
        </div>
    )
}

export default function DoctorLoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        }>
            <DoctorLoginForm />
        </Suspense>
    )
}
