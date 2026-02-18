// Implementa el modelo de colas M/M/c y la nivelación de recursos para una programación óptima de citas.

export interface TimeSlot {
    time: string
    available: boolean
    waitTime: number // minutos
    doctorId: string
    load: number // 0-100%
}

export interface Doctor {
    id: string
    name: string
    specialty: string
    available: boolean
    currentLoad: number
}

export interface Appointment {
    id: string
    patientName: string
    cedula: string
    department: string
    date: string
    time: string
    type: 'primera_vez' | 'control' | 'emergencia'
    doctorId: string
    priority: number
}

// Duración media de las consultas por departamento (en minutos)
const CONSULTATION_DURATION: Record<string, number> = {
    'Cardiología': 30,
    'Pediatría': 20,
    'Neurología': 40,
    'Ortopedia': 25,
    'Oncología': 45,
    'Medicina General': 15,
    'Ginecología': 30,
    'Traumatología': 25,
    'Dermatología': 20,
    'Oftalmología': 25,
    'Psiquiatría': 50,
    'default': 20
}

// Modelo de cola M/M/c: Calcular el tiempo de espera
function calculateWaitTime(lambda: number, mu: number, c: number): number {
    // lambda = tasa de llegada (pacientes/hora)
    // mu = tasa de servicio (pacientes/hora por médico)
    // c = número de servidores (médicos)

    if (c === 0) return 60 // Sin médicos, espera predeterminada de 60 minutos.
    
    const rho = lambda / (c * mu) // Factor de utilización

    if (rho >= 1) return 90 // Sistema al máximo de su capacidad, tiempo de espera elevado.

    // Fórmula C de Erlang para el tiempo medio de espera
    const p0 = erlangC(lambda, mu, c)
    const avgWait = (p0 * rho) / (c * mu * (1 - rho))

    return Math.max(5, Math.round(avgWait * 60)) // Espera mínima de 5 minutos.
}

// Probabilidad de Erlang C
function erlangC(lambda: number, mu: number, c: number): number {
    const a = lambda / mu
    let sum = 0

    for (let k = 0; k < c; k++) {
        sum += Math.pow(a, k) / factorial(k)
    }

    const numerator = Math.pow(a, c) / factorial(c)
    const denominator = sum + (numerator * c) / (c - a)

    return numerator / denominator
}

function factorial(n: number): number {
    if (n <= 1) return 1
    return n * factorial(n - 1)
}

// Nivelación de recursos: equilibrar la carga de trabajo de los médicos.
export function assignOptimalDoctor(
    doctors: Doctor[],
    specialty: string
): Doctor | null {
    const available = doctors.filter(
        (d) => d.specialty === specialty && d.available && d.currentLoad < 80
    )

    if (available.length === 0) return null

    // Asignar al médico con la menor carga actual.
    return available.reduce((min, doctor) =>
        doctor.currentLoad < min.currentLoad ? doctor : min
    )
}

// Generar franjas horarias optimizadas para una fecha y un departamento determinados.
export function getOptimalTimeSlots(
    department: string,
    date: string,
    existingAppointments: Appointment[] = []
): TimeSlot[] {
    const slots: TimeSlot[] = []
    const startHour = 8 // 8 AM
    const endHour = 18 // 6 PM
    const slotDuration = 30 // minutos

    // Simular médicos disponibles para este departamento
    const doctors = getMockDoctors(department)
    const availableDoctors = doctors.filter((d) => d.available).length

    if (availableDoctors === 0) {
        return [] // No hay médicos disponibles.
    }

    // Calcular la tasa de llegada basándose en datos históricos (simulación).
    const baseArrivalRate = getArrivalRate(department, date)
    const consultationDuration = CONSULTATION_DURATION[department] || CONSULTATION_DURATION['default']
    const mu = 60 / consultationDuration // Pacientes por hora por médico

    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += slotDuration) {
            const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`

            // Contar citas en este espacio
            const slotAppointments = existingAppointments.filter(
                (apt) => apt.date === date && apt.time === time && apt.department === department
            )

            const occupied = slotAppointments.length
            const available = occupied < availableDoctors
            
            // Calcular el porcentaje de carga
            const load = Math.min(100, Math.round((occupied / availableDoctors) * 100))

            // Calcular la tasa de llegada dinámica en función de la hora del día.
            // Las horas punta: de 9 a 11 de la mañana y de 2 a 4 de la tarde tienen tasas más altas.
            let timeFactor = 1
            if ((hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16)) {
                timeFactor = 1.5 // 50 % más alto durante las horas punta
            } else if (hour === 12 || hour === 13) {
                timeFactor = 0.7 // Un 30 % menos durante el almuerzo.
            }

            const adjustedLambda = baseArrivalRate * timeFactor * (1 + (occupied / availableDoctors))
            
            // Calcular el tiempo de espera utilizando el modelo M/M/c.
            const waitTime = available 
                ? calculateWaitTime(adjustedLambda, mu, availableDoctors)
                : 0

            // Asignar al médico con menor carga de trabajo.
            const doctor = assignOptimalDoctor(doctors, department)

            slots.push({
                time,
                available,
                waitTime: Math.min(120, Math.max(5, waitTime)), // Entre 5 y 120 minutos
                doctorId: doctor?.id || '',
                load,
            })
        }
    }

    return slots
}

// Calcular la puntuación de prioridad para la cita (escala del 1 al 10)
// 10 = prioridad más alta, 1 = prioridad más baja
export function calculatePriority(
    type: Appointment['type'],
    department: string
): number {
    let priority = 5 // Prioridad media predeterminada

    // Prioridad basada en el tipo
    const typeScores = {
        emergencia: 10,
        primera_vez: 7,
        control: 5,
    }

    priority = typeScores[type]

    // Ajustes por departamento (añadir 1-2 puntos para departamentos urgentes)
    const urgentDepartments = ['Cardiología', 'Neurología', 'Oncología']
    if (urgentDepartments.includes(department)) {
        priority = Math.min(10, priority + 1)
    }

    // Asegúrese de que la prioridad esté dentro del rango válido (1-10).
    return Math.max(1, Math.min(10, priority))
}

// Generadores de datos ficticios
function getMockDoctors(department: string): Doctor[] {
    const doctorsByDept: Record<string, Doctor[]> = {
        'Cardiología': [
            { id: 'D001', name: 'Dr. Carlos Rodríguez', specialty: 'Cardiología', available: true, currentLoad: 45 },
            { id: 'D002', name: 'Dra. Ana Martínez', specialty: 'Cardiología', available: true, currentLoad: 60 },
        ],
        'Pediatría': [
            { id: 'D003', name: 'Dra. Laura Gómez', specialty: 'Pediatría', available: true, currentLoad: 50 },
            { id: 'D004', name: 'Dr. Miguel Ángel Torres', specialty: 'Pediatría', available: true, currentLoad: 35 },
        ],
        'Neurología': [
            { id: 'D005', name: 'Dr. Roberto Sánchez', specialty: 'Neurología', available: true, currentLoad: 55 },
        ],
        'Ortopedia': [
            { id: 'D009', name: 'Dr. Pedro Vargas', specialty: 'Ortopedia', available: true, currentLoad: 40 },
            { id: 'D010', name: 'Dra. Carmen Delgado', specialty: 'Ortopedia', available: true, currentLoad: 50 },
        ],
        'Oncología': [
            { id: 'D011', name: 'Dr. Jorge Medina', specialty: 'Oncología', available: true, currentLoad: 65 },
            { id: 'D012', name: 'Dra. Sofía Ramos', specialty: 'Oncología', available: true, currentLoad: 45 },
        ],
        'Medicina General': [
            { id: 'D006', name: 'Dr. José Hernández', specialty: 'Medicina General', available: true, currentLoad: 40 },
            { id: 'D007', name: 'Dra. María Fernández', specialty: 'Medicina General', available: true, currentLoad: 30 },
            { id: 'D008', name: 'Dr. Luis Castro', specialty: 'Medicina General', available: true, currentLoad: 45 },
        ],
    }

    return doctorsByDept[department] || []
}

function getArrivalRate(department: string, date: string): number {
    // Tasas de llegada (pacientes/hora) según el departamento
    const baseRates: Record<string, number> = {
        'Cardiología': 3,
        'Pediatría': 4,
        'Neurología': 2,
        'Ortopedia': 3,
        'Oncología': 2,
        'Medicina General': 5,
    }

    // Ajustar según el día de la semana
    const dayOfWeek = new Date(date).getDay()
    let dayFactor = 1
    if (dayOfWeek === 1) dayFactor = 1.3 // El lunes es más ajetreado.
    if (dayOfWeek === 5) dayFactor = 1.2 // Viernes algo más ajetreado
    if (dayOfWeek === 0 || dayOfWeek === 6) dayFactor = 0.5 // Fin de semana más tranquilo

    return (baseRates[department] || 3) * dayFactor
}

// Optimizar todo el calendario
export function optimizeSchedule(appointments: Appointment[]): Appointment[] {
    // Ordenar por prioridad (descendente) y hora
    return appointments.sort((a, b) => {
        const priorityDiff = b.priority - a.priority
        if (priorityDiff !== 0) return priorityDiff

        return a.time.localeCompare(b.time)
    })
}
