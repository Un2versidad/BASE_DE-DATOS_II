'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2, Shield, Lock, Eye, EyeOff, ChevronLeft } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { motion } from 'framer-motion'

function LoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    })

    useEffect(() => {
        const reason = searchParams.get('reason')
        if (reason === 'session_expired') {
            setError('Su sesión ha expirado. Por favor, inicie sesión nuevamente.')
        }
    }, [searchParams])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
                credentials: 'include',
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Error de autenticación')
            }

            // Redirigir a la página a la que intentaban acceder o al panel de control.
            const from = searchParams.get('from') || '/dashboard'
            router.push(from)
            router.refresh()
        } catch (err: any) {
            setError(err.message)
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Imagen de fondo con superposición */}
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

            {/* Contenido */}
            {/* Navegación superior izquierda */}
            <div className="absolute top-6 left-6 z-50">
                <Link href="/">
                    <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10 gap-2 transition-all duration-300 group">
                        <div className="bg-white/10 p-1.5 rounded-full group-hover:bg-teal-500/20 transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                        </div>
                        <span className="font-medium tracking-wide text-sm">Volver al Inicio</span>
                    </Button>
                </Link>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10 px-4"
            >

                <div className="flex flex-col items-center mb-8">
                    <h1 className="text-3xl font-bold text-white tracking-tight">MedComLabs</h1>
                    <p className="text-teal-200/80 mt-2 font-medium">Portal del Personal Autorizado</p>
                </div>

                <Card className="border-white/10 bg-black/40 backdrop-blur-md shadow-2xl ring-1 ring-white/10">
                    <CardHeader className="justify-center pb-2">
                        <div className="w-full h-1 bg-gradient-to-r from-transparent via-teal-500 to-transparent opacity-50 mb-4"></div>
                        <CardTitle className="text-white text-center text-xl flex flex-col items-center gap-2">
                            Acceso Seguro
                        </CardTitle>
                        <CardDescription className="text-slate-300 text-center text-sm">
                            Ingrese sus credenciales corporativas
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <form onSubmit={handleLogin} className="space-y-4">
                            {error && (
                                <Alert variant="destructive" className="bg-red-500/10 border-red-500/50 text-red-200">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-slate-200 text-xs uppercase tracking-wider font-semibold">Usuario / ID</Label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-400 transition-colors">
                                        <Shield className="h-4 w-4" />
                                    </div>
                                    <Input
                                        id="username"
                                        placeholder="admin"
                                        required
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        disabled={loading}
                                        className="bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-600 pl-10 focus:border-teal-500/50 focus:ring-teal-500/20 transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-slate-200 text-xs uppercase tracking-wider font-semibold">Contraseña</Label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-teal-400 transition-colors">
                                        <Lock className="h-4 w-4" />
                                    </div>
                                    <Input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        disabled={loading}
                                        className="bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-600 pl-10 pr-10 focus:border-teal-500/50 focus:ring-teal-500/20 transition-all [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-teal-400 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-900/20 transition-all duration-300 font-medium h-11"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Verificando Credenciales...
                                    </>
                                ) : (
                                    <>
                                        Iniciar Sesión
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 border-t border-white/5 pt-6">
                        <div className="flex items-center justify-center gap-2 text-xs text-teal-200/60 bg-teal-900/20 py-1.5 px-3 rounded-full border border-teal-500/10">
                            <Shield className="w-3 h-3" />
                            <span>Conexión Encriptada TLS 1.3 · AES-256</span>
                        </div>
                        <p className="text-[10px] text-slate-500 text-center leading-relaxed max-w-xs mx-auto">
                            Este sistema está monitoreado. El acceso no autorizado será perseguido legalmente según la Ley 81 de Protección de Datos Personales.
                        </p>
                    </CardFooter>
                </Card>

                <p className="text-center text-slate-500 text-xs mt-8">
                    © 2026 MedComLabs Global Health Systems
                </p>
            </motion.div >
        </div >
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        }>
            <LoginForm />
        </Suspense>
    )
}
