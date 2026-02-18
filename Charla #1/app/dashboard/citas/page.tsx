'use client'

import { useEffect, useState } from 'react'
import { CalendarView } from '@/components/dashboard/CalendarView'
import { apiClient } from '@/lib/api-client'

export default function AppointmentsPage() {
    const [appointments, setAppointments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadAppointments()
    }, [])

    const loadAppointments = async () => {
        setLoading(true)
        try {
            const response = await apiClient('/api/appointments')
            const data = await response.json()
            setAppointments(data.appointments || [])
        } catch (error) {
            console.error('Error loading appointments:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-8">
            <CalendarView 
                appointments={appointments} 
                loading={loading} 
                onRefresh={loadAppointments}
            />
        </div>
    )
}
