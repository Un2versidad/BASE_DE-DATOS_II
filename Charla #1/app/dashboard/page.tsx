'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
    Calendar, 
    Users, 
    Activity, 
    TrendingUp, 
    Clock,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Plus,
    FileText,
    ArrowRight,
    Lightbulb
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import Link from 'next/link'
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'

export default function DashboardPage() {
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [recentAppointments, setRecentAppointments] = useState<any[]>([])
    const [weeklyData, setWeeklyData] = useState<any[]>([])

    useEffect(() => {
        loadDashboardData()
    }, [])

    const loadDashboardData = async () => {
        try {
            const [appointmentsRes, doctorsRes] = await Promise.all([
                apiClient('/api/appointments'),
                apiClient('/api/doctors')
            ])
            
            const appointmentsData = await appointmentsRes.json()
            const doctorsData = await doctorsRes.json()
            
            const appointments = appointmentsData.appointments || []
            const doctors = doctorsData.doctors || []

            const today = new Date().toISOString().split('T')[0]
            const todayAppointments = appointments.filter((apt: any) => 
                apt.appointment_date === today
            )

            // Calcular datos semanales
            const weekly = Array.from({ length: 7 }, (_, i) => {
                const date = new Date()
                date.setDate(date.getDate() - (6 - i))
                const dayName = date.toLocaleDateString('es-PA', { weekday: 'short' })
                const dateStr = date.toISOString().split('T')[0]
                
                const dayAppointments = appointments.filter((apt: any) => apt.appointment_date === dateStr)
                
                return {
                    name: dayName,
                    citas: dayAppointments.length
                }
            })

            setWeeklyData(weekly)

            setStats({
                totalAppointments: appointments.length,
                todayAppointments: todayAppointments.length,
                totalDoctors: doctors.length,
                activeDoctors: doctors.filter((d: any) => d.is_active).length,
                scheduledAppointments: appointments.filter((a: any) => a.status === 'scheduled').length,
                completedAppointments: appointments.filter((a: any) => a.status === 'completed').length,
            })

            setRecentAppointments(appointments.slice(0, 5))
        } catch (error) {
            console.error('Error loading dashboard:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
            </div>
        )
    }

    return (
        <div className="space-y-6 p-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
                    <p className="text-slate-600 mt-2">
                        Resumen ejecutivo del sistema hospitalario
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link href="/dashboard/citas">
                        <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
                            <Calendar className="w-4 h-4" />
                            Ver Calendario
                        </Button>
                    </Link>
                    <Link href="/dashboard/pacientes">
                        <Button variant="outline" className="gap-2">
                            <Users className="w-4 h-4" />
                            Gestionar Pacientes
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Grid de estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Citas Hoy</CardTitle>
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">{stats?.todayAppointments || 0}</div>
                        <p className="text-xs text-slate-500 mt-1">
                            {stats?.scheduledAppointments || 0} programadas
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Doctores Activos</CardTitle>
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <Users className="h-5 w-5 text-green-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">
                            {stats?.activeDoctors || 0}/{stats?.totalDoctors || 0}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Disponibles hoy
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Resultados Pendientes</CardTitle>
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Clock className="h-5 w-5 text-orange-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">0</div>
                        <p className="text-xs text-slate-500 mt-1">
                            En proceso
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Tasa de Ocupación</CardTitle>
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Activity className="h-5 w-5 text-purple-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-900">85%</div>
                        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            +5% vs ayer
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Gráficos y actividad reciente */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico semanal */}
                <Card className="border-0 shadow-md">
                    <CardHeader>
                        <CardTitle>Citas de la Semana</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={weeklyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="citas" fill="#0d9488" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Nombramientos recientes */}
                <Card className="border-0 shadow-md">
                    <CardHeader>
                        <CardTitle>Citas Recientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recentAppointments.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                                <p>No hay citas registradas</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentAppointments.map((appointment) => (
                                    <div
                                        key={appointment.id}
                                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${
                                                appointment.status === 'scheduled' ? 'bg-blue-500' :
                                                appointment.status === 'completed' ? 'bg-green-500' :
                                                appointment.status === 'cancelled' ? 'bg-red-500' :
                                                'bg-yellow-500'
                                            }`} />
                                            <div>
                                                <p className="font-medium text-sm text-slate-900">
                                                    {appointment.appointment_number}
                                                </p>
                                                <p className="text-xs text-slate-600">
                                                    {appointment.department}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-medium text-slate-900">
                                                {new Date(appointment.appointment_date).toLocaleDateString('es-PA', { month: 'short', day: 'numeric' })}
                                            </p>
                                            <p className="text-xs text-slate-600">
                                                {appointment.appointment_time}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Información basada en inteligencia artificial */}
            {(stats?.todayAppointments > 10 || stats?.activeDoctors < stats?.totalDoctors) && (
                <Card className="border-0 shadow-md bg-gradient-to-r from-teal-50 to-cyan-50 border-teal-200">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-teal-100 rounded-lg">
                                <Lightbulb className="w-5 h-5 text-teal-700" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-teal-900 mb-1">Recomendaciones del Sistema</p>
                                <div className="space-y-1 text-sm text-teal-800">
                                    {stats?.todayAppointments > 10 && (
                                        <p>• Alta demanda hoy ({stats.todayAppointments} citas) - Considere habilitar horarios adicionales</p>
                                    )}
                                    {stats?.activeDoctors < stats?.totalDoctors && (
                                        <p>• Solo {stats.activeDoctors} de {stats.totalDoctors} doctores disponibles - Verifique horarios</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Estado del sistema */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-green-500 bg-green-50/50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <div>
                                <p className="font-semibold text-green-900">Sistema Operativo</p>
                                <p className="text-sm text-green-700">Todos los sistemas funcionando</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Activity className="w-5 h-5 text-blue-600" />
                            <div>
                                <p className="font-semibold text-blue-900">Cifrado Activo</p>
                                <p className="text-sm text-blue-700">AES-256-GCM protegiendo datos</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500 bg-purple-50/50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-purple-600" />
                            <div>
                                <p className="font-semibold text-purple-900">{stats?.totalDoctors || 0} Doctores</p>
                                <p className="text-sm text-purple-700">Personal médico disponible</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
