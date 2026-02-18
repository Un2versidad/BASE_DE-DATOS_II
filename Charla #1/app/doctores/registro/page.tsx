'use client'

import { useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2, Stethoscope, Lock, Eye, EyeOff, ChevronLeft, Mail, User, Phone, Calendar, Shield, Wand2, Copy, Check, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { motion } from 'framer-motion'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import HCaptcha, { HCaptchaRef } from '@/components/ui/hcaptcha'

// Evaluación de la seguridad de la contraseña
interface PasswordStrength {
    score: number // 0-5
    label: string
    color: string
    requirements: {
        length: boolean
        uppercase: boolean
        lowercase: boolean
        number: boolean
        special: boolean
    }
}

function evaluatePasswordStrength(password: string): PasswordStrength {
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    }

    const score = Object.values(requirements).filter(Boolean).length

    let label: string
    let color: string

    switch (score) {
        case 0:
        case 1:
            label = 'Muy débil'
            color = 'bg-red-500'
            break
        case 2:
            label = 'Débil'
            color = 'bg-orange-500'
            break
        case 3:
            label = 'Media'
            color = 'bg-yellow-500'
            break
        case 4:
            label = 'Fuerte'
            color = 'bg-lime-500'
            break
        case 5:
            label = 'Muy fuerte'
            color = 'bg-green-500'
            break
        default:
            label = ''
            color = ''
    }

    return { score, label, color, requirements }
}

// Generador de contraseñas seguras
function generateSecurePassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lowercase = 'abcdefghijklmnopqrstuvwxyz'
    const numbers = '0123456789'
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?'
    
    const allChars = uppercase + lowercase + numbers + special
    
    // Asegúrese de que haya al menos uno de cada tipo.
    let password = ''
    password += uppercase[Math.floor(Math.random() * uppercase.length)]
    password += lowercase[Math.floor(Math.random() * lowercase.length)]
    password += numbers[Math.floor(Math.random() * numbers.length)]
    password += special[Math.floor(Math.random() * special.length)]
    
    // Rellena el resto al azar.
    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)]
    }
    
    // Mezclar la contraseña
    return password.split('').sort(() => Math.random() - 0.5).join('')
}

export default function DoctorRegisterPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [captchaToken, setCaptchaToken] = useState<string | null>(null)
    const captchaRef = useRef<HCaptchaRef>(null)
    const [copiedPassword, setCopiedPassword] = useState(false)
    const [showGeneratedWarning, setShowGeneratedWarning] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        specialty: '',
        license_number: '',
        password: '',
        confirmPassword: ''
    })

    const specialties = [
        'Medicina General',
        'Cardiología',
        'Neurología',
        'Pediatría',
        'Ginecología',
        'Traumatología',
        'Dermatología',
        'Oftalmología',
        'Psiquiatría',
        'Oncología'
    ]

    const passwordStrength = useMemo(() => 
        evaluatePasswordStrength(formData.password), 
        [formData.password]
    )

    const handleGeneratePassword = () => {
        const newPassword = generateSecurePassword(16)
        setFormData({ 
            ...formData, 
            password: newPassword, 
            confirmPassword: newPassword 
        })
        setShowPassword(true) // Mostrar la contraseña para que el usuario pueda verla.
        setShowGeneratedWarning(true)
        setCopiedPassword(false)
    }

    const handleCopyPassword = async () => {
        try {
            await navigator.clipboard.writeText(formData.password)
            setCopiedPassword(true)
            setTimeout(() => setCopiedPassword(false), 3000)
        } catch (err) {
            console.error('Failed to copy password:', err)
        }
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        // Validar que las contraseñas coincidan
        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden')
            setLoading(false)
            return
        }

        // Validar la seguridad de la contraseña (debe cumplir al menos 4 requisitos)
        if (passwordStrength.score < 4) {
            setError('La contraseña debe cumplir con al menos 4 requisitos de seguridad')
            setLoading(false)
            return
        }

        // Validar todos los campos obligatorios
        if (!formData.name || !formData.email || !formData.phone || !formData.specialty || !formData.license_number || !formData.password) {
            setError('Todos los campos son requeridos')
            setLoading(false)
            return
        }

        // Validar captcha si está configurado
        const siteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY
        if (siteKey && !captchaToken) {
            setError('Por favor complete la verificación de seguridad')
            setLoading(false)
            return
        }

        try {
            const response = await fetch('/api/doctor-registrations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    specialty: formData.specialty,
                    license_number: formData.license_number,
                    password: formData.password,
                    captchaToken
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Error al registrar')
            }
            
            // Redirigir al inicio de sesión con un mensaje de éxito.
            router.push('/doctores/login?registered=true&pending=true')
        } catch (err: any) {
            setError(err.message || 'Error al registrar')
            // Restablecer captcha en caso de error
            captchaRef.current?.reset()
            setCaptchaToken(null)
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-12">
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
                className="w-full max-w-2xl relative z-10 px-4"
            >
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4">
                        <Stethoscope className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Registro de Doctor</h1>
                    <p className="text-blue-200/80 mt-2 font-medium">Únete al equipo médico de MedComLabs</p>
                </div>

                <Card className="border-white/10 bg-black/40 backdrop-blur-md shadow-2xl ring-1 ring-white/10">
                    <CardHeader className="justify-center pb-2">
                        <div className="w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50 mb-4"></div>
                        <CardTitle className="text-white text-center text-xl">
                            Crear Cuenta Médica
                        </CardTitle>
                        <CardDescription className="text-slate-300 text-center text-sm">
                            Complete el formulario para solicitar acceso
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <form onSubmit={handleRegister} className="space-y-4">
                            {error && (
                                <Alert variant="destructive" className="bg-red-500/10 border-red-500/50 text-red-200">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-slate-200 text-xs uppercase tracking-wider font-semibold">
                                        Nombre Completo
                                    </Label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
                                            <User className="h-4 w-4" />
                                        </div>
                                        <Input
                                            id="name"
                                            placeholder="Dr. Juan Pérez"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            disabled={loading}
                                            className="bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-600 pl-10 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all"
                                        />
                                    </div>
                                </div>

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
                                    <Label htmlFor="phone" className="text-slate-200 text-xs uppercase tracking-wider font-semibold">
                                        Teléfono
                                    </Label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
                                            <Phone className="h-4 w-4" />
                                        </div>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            placeholder="+507 6000-0000"
                                            required
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            disabled={loading}
                                            className="bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-600 pl-10 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="license" className="text-slate-200 text-xs uppercase tracking-wider font-semibold">
                                        Número de Licencia
                                    </Label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
                                            <Calendar className="h-4 w-4" />
                                        </div>
                                        <Input
                                            id="license"
                                            placeholder="LIC-12345"
                                            required
                                            value={formData.license_number}
                                            onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                                            disabled={loading}
                                            className="bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-600 pl-10 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="specialty" className="text-slate-200 text-xs uppercase tracking-wider font-semibold">
                                    Especialidad
                                </Label>
                                <Select
                                    value={formData.specialty}
                                    onValueChange={(value) => setFormData({ ...formData, specialty: value })}
                                    disabled={loading}
                                >
                                    <SelectTrigger className="bg-slate-900/50 border-slate-700/50 text-white focus:border-blue-500/50 focus:ring-blue-500/20">
                                        <SelectValue placeholder="Seleccione su especialidad" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-slate-700 text-white">
                                        {specialties.map((specialty) => (
                                            <SelectItem 
                                                key={specialty} 
                                                value={specialty}
                                                className="text-white focus:bg-blue-600 focus:text-white"
                                            >
                                                {specialty}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Sección de contraseñas con generador */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label className="text-slate-200 text-xs uppercase tracking-wider font-semibold">
                                        Contraseña Segura
                                    </Label>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleGeneratePassword}
                                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 gap-1.5 h-7 text-xs"
                                        disabled={loading}
                                    >
                                        <Wand2 className="h-3.5 w-3.5" />
                                        Generar Contraseña
                                    </Button>
                                </div>

                                {/* Advertencia sobre contraseña generada */}
                                {showGeneratedWarning && formData.password && (
                                    <Alert className="bg-amber-500/10 border-amber-500/50 text-amber-200">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertDescription className="flex items-center justify-between gap-3">
                                            <span className="text-sm">
                                                <span className="font-medium">Contraseña generada.</span>
                                                {' '}Guárdela en un lugar seguro.
                                            </span>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleCopyPassword}
                                                className="bg-amber-500 text-white hover:bg-amber-600 border-amber-600 shrink-0 h-7 text-xs gap-1.5 font-semibold shadow-md"
                                            >
                                                {copiedPassword ? (
                                                    <>
                                                        <Check className="h-3 w-3" />
                                                        Copiada
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="h-3 w-3" />
                                                        Copiar
                                                    </>
                                                )}
                                            </Button>
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
                                                <Lock className="h-4 w-4" />
                                            </div>
                                            <Input
                                                id="password"
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="Ingrese contraseña"
                                                required
                                                value={formData.password}
                                                onChange={(e) => {
                                                    setFormData({ ...formData, password: e.target.value })
                                                    setShowGeneratedWarning(false)
                                                }}
                                                disabled={loading}
                                                className="bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-600 pl-10 pr-10 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all"
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

                                    <div className="space-y-2">
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-400 transition-colors">
                                                <Lock className="h-4 w-4" />
                                            </div>
                                            <Input
                                                id="confirmPassword"
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="Confirmar contraseña"
                                                required
                                                value={formData.confirmPassword}
                                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                disabled={loading}
                                                className="bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-600 pl-10 focus:border-blue-500/50 focus:ring-blue-500/20 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Indicador de seguridad de la contraseña */}
                                {formData.password && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                                                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                                                />
                                            </div>
                                            <span className={`text-xs font-medium ${
                                                passwordStrength.score <= 2 ? 'text-red-400' : 
                                                passwordStrength.score === 3 ? 'text-yellow-400' : 
                                                'text-green-400'
                                            }`}>
                                                {passwordStrength.label}
                                            </span>
                                        </div>

                                        {/* Requisitos de contraseña */}
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <RequirementItem 
                                                met={passwordStrength.requirements.length} 
                                                text="Mínimo 8 caracteres" 
                                            />
                                            <RequirementItem 
                                                met={passwordStrength.requirements.uppercase} 
                                                text="Una mayúscula (A-Z)" 
                                            />
                                            <RequirementItem 
                                                met={passwordStrength.requirements.lowercase} 
                                                text="Una minúscula (a-z)" 
                                            />
                                            <RequirementItem 
                                                met={passwordStrength.requirements.number} 
                                                text="Un número (0-9)" 
                                            />
                                            <RequirementItem 
                                                met={passwordStrength.requirements.special} 
                                                text="Un carácter especial (!@#$...)" 
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Verificación hCaptcha */}
                            <div className="flex flex-col items-center gap-3 pt-2">
                                <div className="flex items-center gap-2 text-sm text-slate-400">
                                    <Shield className="w-4 h-4 text-blue-400" />
                                    <span>Verificación de seguridad</span>
                                </div>
                                <HCaptcha
                                    ref={captchaRef}
                                    onVerify={(token) => setCaptchaToken(token)}
                                    onExpire={() => setCaptchaToken(null)}
                                    onError={() => {
                                        setCaptchaToken(null)
                                        setError('Error en la verificación. Por favor recargue la página.')
                                    }}
                                    theme="dark"
                                />
                            </div>

                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition-all duration-300 font-medium h-11 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={loading || (formData.password.length > 0 && passwordStrength.score < 4)}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Registrando...
                                    </>
                                ) : (
                                    'Crear Cuenta'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4 border-t border-white/5 pt-6">
                        <p className="text-center text-sm text-slate-400">
                            ¿Ya tienes cuenta?{' '}
                            <Link href="/doctores/login" className="text-blue-400 hover:text-blue-300 underline">
                                Inicia sesión aquí
                            </Link>
                        </p>
                        <p className="text-xs text-slate-500 text-center">
                            Al registrarte, aceptas nuestros términos de servicio y política de privacidad.
                            Tu cuenta será revisada por el equipo administrativo.
                        </p>
                    </CardFooter>
                </Card>

                <p className="text-center text-slate-500 text-xs mt-8">
                    © 2026 MedComLabs - Portal Médico
                </p>
            </motion.div>
        </div>
    )
}

// Componente auxiliar para requisitos de contraseña
function RequirementItem({ met, text }: { met: boolean; text: string }) {
    return (
        <div className={`flex items-center gap-1.5 ${met ? 'text-green-400' : 'text-slate-500'}`}>
            {met ? (
                <CheckCircle2 className="h-3 w-3" />
            ) : (
                <div className="h-3 w-3 rounded-full border border-current" />
            )}
            <span>{text}</span>
        </div>
    )
}
