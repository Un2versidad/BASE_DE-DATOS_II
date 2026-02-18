import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyToken } from '@/lib/auth'
import { decryptData, encryptData, deriveKey, safeDecrypt, encrypt } from '@/lib/encryption'

// GET /api/doctors/patients/[id] - Get patient details
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // Get auth token from header
        const authHeader = request.headers.get('authorization')
        const token = authHeader?.replace('Bearer ', '')

        if (!token) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const payload = await verifyToken(token)
        if (!payload || payload.role !== 'doctor') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const adminClient = createAdminClient()
        const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
        const key = await deriveKey(secret)

        // Get patient
        const { data: patient, error } = await adminClient
            .from('pacientes')
            .select('*')
            .eq('id', id)
            .single()

        if (error || !patient) {
            return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })
        }

        // Decrypt patient data
        let name = ''
        let cedula = ''
        let email = ''
        let phone = ''

        try {
            name = await decryptData(patient.nombre_encrypted, patient.nombre_iv, key)
        } catch (e) {}
        try {
            cedula = await decryptData(patient.cedula_encrypted, patient.cedula_iv, key)
        } catch (e) {}
        try {
            if (patient.email_encrypted && patient.email_iv) {
                email = await decryptData(patient.email_encrypted, patient.email_iv, key)
            }
        } catch (e) {}
        try {
            if (patient.telefono_encrypted && patient.telefono_iv) {
                phone = await decryptData(patient.telefono_encrypted, patient.telefono_iv, key)
            }
        } catch (e) {}

        // Decrypt allergies
        let allergies: string[] = []
        try {
            if (patient.alergias_encrypted && patient.alergias_iv) {
                const raw = await decryptData(patient.alergias_encrypted, patient.alergias_iv, key)
                try { allergies = JSON.parse(raw) } catch { allergies = [raw] }
            }
        } catch (e) {}

        // Get patient appointments with this doctor
        const { data: appointments } = await adminClient
            .from('citas')
            .select('*')
            .eq('paciente_id', id)
            .eq('doctor_id', payload.userId)
            .order('fecha_cita', { ascending: false })
            .limit(10)

        // Get patient lab results
        const { data: labResults } = await adminClient
            .from('resultados_laboratorio')
            .select('*')
            .eq('paciente_id', id)
            .order('fecha_orden', { ascending: false })
            .limit(10)

        // Get patient prescriptions from this doctor
        const { data: prescriptions } = await adminClient
            .from('recetas')
            .select('*')
            .eq('paciente_id', id)
            .eq('doctor_id', payload.userId)
            .order('created_at', { ascending: false })
            .limit(10)

        // Get medical notes
        const { data: notes } = await adminClient
            .from('notas_medicas')
            .select('*')
            .eq('paciente_id', id)
            .eq('doctor_id', payload.userId)
            .order('created_at', { ascending: false })
            .limit(10)

        // Decrypt notes content
        const decryptedNotes = await Promise.all(
            (notes || []).map(async (note) => {
                let content = note.contenido || ''
                try {
                    if (note.contenido_cifrado && note.contenido_iv) {
                        content = await decryptData(note.contenido_cifrado, note.contenido_iv, key)
                    }
                } catch (e) {}
                return {
                    id: note.id,
                    type: note.tipo,
                    title: note.titulo,
                    content,
                    createdAt: note.created_at
                }
            })
        )

        return NextResponse.json({
            success: true,
            patient: {
                id: patient.id,
                name,
                cedula,
                email,
                phone,
                dob: await safeDecrypt(patient.fecha_nacimiento, key),
                bloodType: await safeDecrypt(patient.tipo_sangre, key),
                allergies,
                createdAt: patient.created_at
            },
            appointments: await Promise.all((appointments || []).map(async (a) => {
                const notes = a.notas ? await safeDecrypt(a.notas, key) : null
                const reason = a.motivo_consulta ? await safeDecrypt(a.motivo_consulta, key) : null

                return {
                    id: a.id,
                    date: a.fecha_cita,
                    time: a.hora_cita,
                    type: a.tipo_consulta,
                    status: a.estado,
                    reason,
                    notes
                }
            })),
            labResults: labResults?.map(r => ({
                id: r.id,
                examName: r.nombre_examen,
                examType: r.tipo_examen,
                status: r.estado,
                orderedDate: r.fecha_orden,
                completedDate: r.fecha_completado
            })) || [],
            prescriptions: prescriptions?.map(p => ({
                id: p.id,
                medications: p.medicamentos,
                diagnosis: p.diagnostico,
                instructions: p.indicaciones_generales,
                startDate: p.fecha_emision,
                endDate: p.fecha_vencimiento,
                status: p.estado
            })) || [],
            medicalNotes: decryptedNotes
        })
    } catch (error: any) {
        console.error('Get patient error:', error)
        return NextResponse.json(
            { error: 'Error al obtener paciente' },
            { status: 500 }
        )
    }
}

// PATCH /api/doctors/patients/[id] - Update patient data (blood type, allergies)
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // Get auth token from header
        const authHeader = request.headers.get('authorization')
        const token = authHeader?.replace('Bearer ', '')

        if (!token) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const payload = await verifyToken(token)
        if (!payload || payload.role !== 'doctor') {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const body = await request.json()
        const { bloodType, allergies, email, phone } = body

        const adminClient = createAdminClient()
        const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production'
        const key = await deriveKey(secret)

        // Check if patient exists and doctor has access (has had a consultation with them)
        const { data: hasAccess } = await adminClient
            .from('citas')
            .select('id')
            .eq('paciente_id', id)
            .eq('doctor_id', payload.userId)
            .limit(1)

        if (!hasAccess || hasAccess.length === 0) {
            return NextResponse.json({ error: 'No tiene acceso a este paciente' }, { status: 403 })
        }

        // Build update object
        const updateData: any = {
            updated_at: new Date().toISOString()
        }

        // Update blood type if provided - encrypt it
        if (bloodType !== undefined) {
            updateData.tipo_sangre = bloodType ? await encrypt(bloodType, key) : null
        }

        // Update email if provided - encrypt it
        if (email !== undefined) {
            if (email) {
                const { encrypted, iv } = await encryptData(email, key)
                updateData.email_encrypted = encrypted
                updateData.email_iv = iv
            } else {
                updateData.email_encrypted = null
                updateData.email_iv = null
            }
        }

        // Update phone if provided - encrypt it
        if (phone !== undefined) {
            if (phone) {
                const { encrypted, iv } = await encryptData(phone, key)
                updateData.telefono_encrypted = encrypted
                updateData.telefono_iv = iv
            } else {
                updateData.telefono_encrypted = null
                updateData.telefono_iv = null
            }
        }

        // Update allergies if provided - encrypt them
        if (allergies !== undefined) {
            // Parse allergies string (comma-separated) into array
            const allergiesArray = allergies
                ? allergies.split(',').map((a: string) => a.trim()).filter((a: string) => a)
                : []
            
            // Encrypt allergies for storage
            if (allergiesArray.length > 0) {
                const { encrypted, iv } = await encryptData(JSON.stringify(allergiesArray), key)
                updateData.alergias_encrypted = encrypted
                updateData.alergias_iv = iv
            } else {
                updateData.alergias_encrypted = null
                updateData.alergias_iv = null
            }
        }

        // Update patient record
        const { error: updateError } = await adminClient
            .from('pacientes')
            .update(updateData)
            .eq('id', id)

        if (updateError) {
            console.error('Update patient error:', updateError)
            return NextResponse.json({ error: 'Error al actualizar paciente' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'Paciente actualizado correctamente'
        })
    } catch (error: any) {
        console.error('Update patient error:', error)
        return NextResponse.json(
            { error: 'Error al actualizar paciente' },
            { status: 500 }
        )
    }
}
