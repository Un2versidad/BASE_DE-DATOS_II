import { NextResponse } from 'next/server'
import { getOptimalTimeSlots } from '@/lib/operations-research/scheduling'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { department, date } = body

        if (!department || !date) {
            return NextResponse.json(
                { error: 'Department and date are required' },
                { status: 400 }
            )
        }
        const existingAppointments: any[] = []

        const slots = getOptimalTimeSlots(department, date, existingAppointments)

        return NextResponse.json({ slots })
    } catch (error) {
        console.error('Error optimizing schedule:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
