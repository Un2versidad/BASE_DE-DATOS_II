'use client'

import { AppointmentBooking } from '@/components/appointments/AppointmentBooking'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronLeft } from 'lucide-react'

export default function BookingPage() {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <ChevronLeft className="w-5 h-5 text-slate-500 group-hover:text-teal-600 transition-colors" />
                        <div className="relative w-40 h-10">
                            <Image src="/banner-transparent.png" alt="MedComLabs" fill className="object-contain object-left" />
                        </div>
                    </Link>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-600"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
                        <span>Conexión segura</span>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-12">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold text-slate-900 mb-4">Agendar Cita Médica</h1>
                        <p className="text-slate-600">
                            Complete el formulario para solicitar su atención.
                            <br />
                            Usamos tecnología inteligente para optimizar su tiempo de espera.
                        </p>
                    </div>

                    <AppointmentBooking />
                </div>
            </main>

            <footer className="bg-white border-t border-slate-200 mt-20 py-8">
                <div className="container mx-auto px-4 text-center text-slate-500 text-sm">
                    <p>© 2026 MedComLabs. Todos los derechos reservados.</p>
                </div>
            </footer>
        </div>
    )
}
