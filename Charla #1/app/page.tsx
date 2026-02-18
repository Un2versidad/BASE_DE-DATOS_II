'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  ShieldCheck,
  Database,
  Lock,
  Calendar,
  Activity,
  Users,
  FileText,
  ArrowRight,
  Stethoscope,
  Heart,
  Brain,
  Baby,
  Microscope,
  Syringe,
  Phone,
  MapPin,
  Mail,
  Clock,
  Award,
  CheckCircle2
} from 'lucide-react'
import { motion } from 'framer-motion'

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Barra superior */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-600 text-white py-2 px-4">
        <div className="container mx-auto flex flex-wrap items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              <span>(507) 204-8000</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <span>info@medcomlabs.com</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Emergencias 24/7</span>
          </div>
        </div>
      </div>

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="relative w-48 h-12 flex-shrink-0">
                <Image src="/banner-transparent.png" alt="MedComLabs Banner" fill className="object-contain object-left" />
              </div>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="#servicios" className="text-slate-600 hover:text-teal-600 transition-colors">
                Servicios
              </Link>
              <Link href="#nosotros" className="text-slate-600 hover:text-teal-600 transition-colors">
                Nosotros
              </Link>
              <Link href="#instalaciones" className="text-slate-600 hover:text-teal-600 transition-colors">
                Instalaciones
              </Link>
              <Link href="#contacto" className="text-slate-600 hover:text-teal-600 transition-colors">
                Contacto
              </Link>
              <Link
                href="/acceso"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-teal-600 to-blue-600 text-white hover:from-teal-700 hover:to-blue-700 transition-all"
              >
                Acceso Staff
              </Link>
            </nav>
          </div>
        </div>
      </header>



      {/* Sección principal con imagen de fondo */}
      <section className="relative h-[600px] lg:h-[700px] overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/hospital-hero.jpg"
            alt="MedComLabs Hospital"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-transparent"></div>
        </div>

        <div className="relative container mx-auto px-4 h-full flex items-center">
          <motion.div
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="max-w-2xl text-white"
          >
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500/20 backdrop-blur-sm border border-teal-400/30 rounded-full mb-6">
              <Award className="w-4 h-4 text-teal-300" />
              <span className="text-sm font-medium text-teal-100">Afiliado a Johns Hopkins Medicine International</span>
            </motion.div>

            <motion.h1 variants={fadeInUp} className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Lo más valioso
              <span className="block text-teal-400">eres tú</span>
            </motion.h1>

            <motion.p variants={fadeInUp} className="text-xl text-slate-200 mb-8 leading-relaxed">
              Atención médica de calidad en Panamá con equipo médico capacitado, tecnología avanzada y los más altos estándares de seguridad.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-wrap gap-4">
              <Button
                onClick={() => document.getElementById('agendar-cita')?.scrollIntoView({ behavior: 'smooth' })}
                size="lg"
                className="bg-teal-600 hover:bg-teal-700 text-white h-14 px-8 text-lg shadow-xl group"
              >
                <Calendar className="mr-2 h-5 w-5" />
                Agendar Cita
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Link href="#servicios">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20">
                  Nuestros Servicios
                </Button>
              </Link>
            </motion.div>

            <motion.div variants={fadeInUp} className="flex items-center gap-6 mt-12 pt-8 border-t border-white/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-teal-400" />
                <span className="text-sm">ISO 27001</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-teal-400" />
                <span className="text-sm">IEEE 11073</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-teal-400" />
                <span className="text-sm">Cifrado AES-256</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Sección de reserva de citas */}
      <section id="agendar-cita" className="py-20 bg-slate-50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-teal-200 to-transparent"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              Gestione su Salud en Línea
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
              Sin filas, sin esperas innecesarias. Utilice nuestros servicios digitales.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/citas">
                <Button size="lg" className="h-16 px-8 text-xl bg-teal-600 hover:bg-teal-700 text-white shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1">
                  <Calendar className="mr-2 h-6 w-6" />
                  Agendar Cita Ahora
                </Button>
              </Link>
              <Link href="/resultados">
                <Button size="lg" variant="outline" className="h-16 px-8 text-xl border-2 border-slate-200 hover:border-teal-600 hover:text-teal-600 hover:bg-white">
                  <FileText className="mr-2 h-6 w-6" />
                  Consultar Resultados
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Decoraciones de fondo */}
        <div className="absolute top-1/4 left-0 w-64 h-64 bg-teal-100/50 rounded-full blur-3xl -translate-x-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>
      </section>

      {/* Sección de instalaciones */}
      <section id="instalaciones" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Instalaciones de Primer Nivel</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Equipos de última generación y espacios diseñados para su confort y seguridad.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative h-64 rounded-2xl overflow-hidden shadow-lg group">
              <Image src="/operating-room.jpg" alt="Sala de Operaciones" fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
                <h3 className="text-white text-xl font-bold">Quirófanos Híbridos</h3>
              </div>
            </div>
            <div className="relative h-64 rounded-2xl overflow-hidden shadow-lg group">
              <Image src="/private-room.png" alt="Habitaciones Privadas" fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-teal-900/10 mix-blend-overlay"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
                <h3 className="text-white text-xl font-bold">Habitaciones Privadas</h3>
              </div>
            </div>
            <div className="relative h-64 rounded-2xl overflow-hidden shadow-lg group">
              <Image src="/robotic-lab.png" alt="Laboratorio Robótico" fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-blue-900/10 mix-blend-overlay"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
                <h3 className="text-white text-xl font-bold">Laboratorio Robótico</h3>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sección de estadísticas */}
      <section className="py-20 bg-slate-50 border-y border-slate-200">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Nuestra Trayectoria Habla por Nosotros</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Resultados reales que demuestran nuestro compromiso con su salud y bienestar.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '20+', label: 'Años de Experiencia', icon: Award },
              { value: '50K+', label: 'Pacientes Atendidos', icon: Users },
              { value: '99.9%', label: 'Disponibilidad', icon: Activity },
              { value: '24/7', label: 'Emergencias', icon: Clock },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow text-center border border-slate-100"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-50 mb-4 text-teal-600">
                  <stat.icon className="w-8 h-8" />
                </div>
                <div className="text-4xl font-bold text-slate-900 mb-2">{stat.value}</div>
                <div className="text-sm font-medium text-slate-600">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section >

      {/* Sección de servicios */}
      < section id="servicios" className="py-20 bg-white" >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-slate-900 mb-4">Nuestros Servicios</h2>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Brindamos servicios de alta calidad con tecnología de punta y personal altamente capacitado
              </p>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Heart,
                title: 'Cardiología',
                description: 'Diagnóstico y tratamiento de enfermedades cardiovasculares con tecnología avanzada.',
                color: 'from-red-500 to-pink-500'
              },
              {
                icon: Brain,
                title: 'Neurología',
                description: 'Atención especializada en trastornos del sistema nervioso y cerebral.',
                color: 'from-purple-500 to-indigo-500'
              },
              {
                icon: Baby,
                title: 'Pediatría',
                description: 'Cuidado integral para niños desde el nacimiento hasta la adolescencia.',
                color: 'from-blue-500 to-cyan-500'
              },
              {
                icon: Stethoscope,
                title: 'Medicina General',
                description: 'Atención primaria y chequeos preventivos para toda la familia.',
                color: 'from-teal-500 to-emerald-500'
              },
              {
                icon: Microscope,
                title: 'Laboratorio Clínico',
                description: 'Análisis clínicos con resultados precisos y entrega rápida.',
                color: 'from-orange-500 to-amber-500'
              },
              {
                icon: Syringe,
                title: 'Emergencias 24/7',
                description: 'Atención de emergencias médicas las 24 horas del día, todo el año.',
                color: 'from-rose-500 to-red-500'
              },
            ].map((service, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full hover:shadow-2xl transition-all duration-300 border-0 shadow-lg group hover:-translate-y-2">
                  <CardContent className="p-6">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <service.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">{service.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{service.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section >

      {/* Acerca de la sección con imagen */}
      < section id="nosotros" className="py-20 bg-gradient-to-b from-slate-50 to-white" >
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-slate-900 mb-6">¿Por qué elegir MedComLabs?</h2>
              <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                Hace más de 20 años nació como una idea de traer la mejor medicina a Panamá a través de una afiliación con Johns Hopkins Medicine International, líder y pionero mundial en la industria de la salud.
              </p>
              <div className="space-y-4">
                {[
                  'Equipo médico altamente capacitado',
                  'Tecnología de última generación',
                  'Instalaciones de clase mundial',
                  'Atención personalizada y cálida',
                  'Certificaciones internacionales'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    </div>
                    <span className="text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative h-[500px] rounded-2xl overflow-hidden shadow-2xl"
            >
              <Image
                src="/medical-team.jpg"
                alt="Equipo Médico"
                fill
                className="object-cover"
              />
            </motion.div>
          </div>
        </div>
      </section >

      {/* Sección de seguridad */}
      < section id="seguridad" className="py-20 bg-slate-900 text-white" >
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Seguridad de Nivel Empresarial</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Sus datos están protegidos con las tecnologías de cifrado más avanzadas del mundo
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: ShieldCheck,
                title: 'Cifrado AES-256-GCM',
                description: 'Cifrado de grado militar para todos los datos de pacientes. La información se cifra antes de almacenarse en la base de datos.',
                gradient: 'from-teal-500 to-cyan-500'
              },
              {
                icon: Database,
                title: 'Pipelines ETL Seguros',
                description: 'Importe grandes volúmenes de datos desde sistemas legados con nuestro motor seguro de Extracción, Transformación y Carga.',
                gradient: 'from-blue-500 to-indigo-500'
              },
              {
                icon: Lock,
                title: 'Control de Acceso Estricto',
                description: 'Acceso basado en roles, geo-bloqueo regional y rotación de tokens para garantizar que solo personal autorizado acceda a los registros.',
                gradient: 'from-emerald-500 to-teal-500'
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative p-8 rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-teal-500/50 transition-all duration-300 overflow-hidden group"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${feature.gradient} opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition-opacity`}></div>
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} mb-6`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section >

      {/* Sección de instalaciones */}
      < section className="py-20 bg-white" >
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative h-[500px] rounded-2xl overflow-hidden shadow-2xl"
            >
              <Image
                src="/facilities.jpg"
                alt="Instalaciones"
                fill
                className="object-cover"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-bold text-slate-900 mb-6">Nuestras Facilidades son de Clase Mundial</h2>
              <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                Contamos con instalaciones modernas equipadas con tecnología de punta para brindar la mejor atención médica.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  'Habitaciones Privadas',
                  'Equipos de Alta Tecnología',
                  'Quirófanos Modernos',
                  'UCI Especializada',
                  'Laboratorio Avanzado',
                  'Radiología Digital'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0" />
                    <span className="text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section >

      {/* Sección CTA */}
      < section className="py-20 bg-gradient-to-r from-teal-600 via-teal-500 to-blue-600" >
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              ¿Listo para cuidar tu salud?
            </h2>
            <p className="text-lg text-teal-100 mb-8 max-w-2xl mx-auto">
              Agenda tu cita hoy mismo y experimenta la diferencia de un sistema de salud de clase mundial.
            </p>
            <Link href="/citas">
              <Button size="lg" className="bg-white text-teal-600 hover:bg-slate-100 h-14 px-10 text-lg shadow-xl">
                <Calendar className="mr-2 h-5 w-5" />
                Agendar Cita Ahora
              </Button>
            </Link>
          </motion.div>
        </div>
      </section >

      {/* Sección de contacto */}
      <section id="contacto" className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Visítanos</h2>
            <p className="text-lg text-slate-600">Estamos aquí para atenderte</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="text-center p-6 border-0 shadow-lg">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal-100 mb-4">
                <MapPin className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Ubicación</h3>
              <p className="text-sm text-slate-600">Punta Pacífica, Ciudad de Panamá</p>
            </Card>

            <Card className="text-center p-6 border-0 shadow-lg">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal-100 mb-4">
                <Phone className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Teléfono</h3>
              <p className="text-sm text-slate-600">(507) 204-8000</p>
            </Card>

            <Card className="text-center p-6 border-0 shadow-lg">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal-100 mb-4">
                <Clock className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">Horario</h3>
              <p className="text-sm text-slate-600">Emergencias 24/7</p>
            </Card>
          </div>
        </div>
      </section >

      {/* Sección de certificaciones */}
      <section className="py-12 bg-white border-t border-slate-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h3 className="text-xl font-bold text-slate-800 uppercase tracking-wide">Certificaciones y Calidad</h3>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-12 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
            {/* ISO 9001 Badge */}
            <div className="flex flex-col items-center gap-2">
              <Image src="/iso-9001.png" alt="ISO 9001 Certified" width={100} height={100} className="object-contain h-20 w-auto" />
            </div>
            {/* ISO 27001 Badge */}
            <div className="flex flex-col items-center gap-2">
              <Image src="/iso-27001.png" alt="ISO 27001 Certified" width={100} height={100} className="object-contain h-20 w-auto" />
            </div>
            {/* HIPAA Badge */}
            <div className="flex flex-col items-center gap-2">
              <Image src="/hipaa-compliant.png" alt="HIPAA Compliant" width={100} height={100} className="object-contain h-20 w-auto" />
            </div>
            {/* JCI Badge */}
            <div className="flex flex-col items-center gap-2">
              <Image src="/jci-accredited.png" alt="JCI Accredited" width={100} height={100} className="object-contain h-20 w-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      < footer className="bg-slate-900 text-white py-16 border-t border-slate-800" >
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-3 mb-6">
                <Image src="/logo.png" alt="Logo" width={50} height={50} />
                <span className="text-2xl font-bold tracking-tight">MedComLabs</span>
              </div>
              <p className="text-slate-400 leading-relaxed mb-6">
                Liderando la transformación digital en salud con estándares internacionales de calidad y seguridad.
              </p>
            </div>

            <div className="col-span-1">
              <h4 className="font-bold text-lg mb-6 text-white">Servicios</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="#" className="hover:text-white transition-colors">Cardiología</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Neurología</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Pediatría</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Laboratorio</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Información</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="#" className="hover:text-white transition-colors">Sobre Nosotros</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Equipo Médico</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Instalaciones</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contacto</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Contacto</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  (507) 204-8000
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  info@medcomlabs.com
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Punta Pacífica, Panamá
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-400">
            <p>© 2026 MedComLabs. Todos los derechos reservados.</p>
            <p className="mt-2">
              Cumplimiento: ISO 27001 · ISO 9001 · IEEE 11073 · Solo Personal Autorizado
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
