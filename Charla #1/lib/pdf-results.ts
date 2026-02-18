// Generación de PDF para resultados de laboratorio

export interface PrescriptionData {
    medicationName: string
    dosage: string
    frequency: string
    duration?: string
    instructions?: string
}

export interface LabResultPDFData {
    // Información del paciente
    patientName: string
    patientId: string
    dateOfBirth?: string
    
    // Información sobre el examen
    examName: string
    examType: string
    orderDate: string
    completionDate: string
    
    // Información sobre el médico
    orderedBy: string
    reviewedBy?: string
    
    // Resultados
    results: Array<{
        parameter: string
        value: string
        unit: string
        referenceRange: string
        status: 'normal' | 'low' | 'high' | 'critical'
    }>
    
    // Recetas (opcional)
    prescriptions?: PrescriptionData[]
    
    // Interpretación
    interpretation?: string
    requiresFollowup: boolean
    
    // Código de acceso para verificación
    accessCode: string
}

/**
 * Generar HTML para el PDF de resultados de laboratorio.
 */
export function generateLabResultHTML(data: LabResultPDFData): string {
    const statusColors = {
        normal: '#059669',
        low: '#d97706',
        high: '#d97706',
        critical: '#dc2626'
    }

    const statusLabels = {
        normal: 'Normal',
        low: 'Bajo',
        high: 'Alto',
        critical: 'Crítico'
    }

    const resultsRows = data.results.map(r => `
        <tr>
            <td style="padding: 14px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 500;">${r.parameter}</td>
            <td style="padding: 14px 16px; border-bottom: 1px solid #e5e7eb; text-align: center; font-weight: 700; font-size: 14px;">${r.value}</td>
            <td style="padding: 14px 16px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #6b7280;">${r.unit}</td>
            <td style="padding: 14px 16px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #6b7280;">${r.referenceRange}</td>
            <td style="padding: 14px 16px; border-bottom: 1px solid #e5e7eb; text-align: center;">
                <span style="display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; background: ${statusColors[r.status]}15; color: ${statusColors[r.status]}; border: 1px solid ${statusColors[r.status]}30;">
                    ${statusLabels[r.status]}
                </span>
            </td>
        </tr>
    `).join('')

    const prescriptionsSection = data.prescriptions && data.prescriptions.length > 0 ? `
    <div style="margin-top: 40px; page-break-inside: avoid;">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: white; padding: 12px 20px; border-radius: 12px 12px 0 0; display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 18px;">💊</span>
            <span style="font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Recetas Médicas</span>
        </div>
        <div style="border: 2px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 20px; background: #faf5ff;">
            ${data.prescriptions.map((rx, i) => `
                <div style="background: white; border-radius: 10px; padding: 16px 20px; margin-bottom: ${i < data.prescriptions!.length - 1 ? '12px' : '0'}; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <div style="font-weight: 700; font-size: 15px; color: #1e293b;">${rx.medicationName}</div>
                        <div style="background: #7c3aed15; color: #7c3aed; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;">${rx.dosage}</div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
                        <div><span style="color: #64748b;">Frecuencia:</span> <span style="font-weight: 500;">${rx.frequency}</span></div>
                        ${rx.duration ? `<div><span style="color: #64748b;">Duración:</span> <span style="font-weight: 500;">${rx.duration}</span></div>` : ''}
                    </div>
                    ${rx.instructions ? `<div style="font-size: 12px; color: #64748b; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #e5e7eb;"><em>${rx.instructions}</em></div>` : ''}
                </div>
            `).join('')}
        </div>
    </div>
    ` : ''

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Resultados de Laboratorio - ${data.examName}</title>
    <style>
        @page { size: A4; margin: 15mm; }
        * { box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 30px;
            color: #1e293b;
            font-size: 13px;
            line-height: 1.6;
            background: #f8fafc;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        @media print {
            body { background: white; padding: 0; }
            .container { box-shadow: none; border-radius: 0; }
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            #print-controls { display: none !important; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); color: white; padding: 24px 30px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">🏥 MedComLabs</div>
                    <div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">Centro de Diagnóstico Médico</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8;">Reporte Generado</div>
                    <div style="font-size: 14px; font-weight: 600;">${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
            </div>
        </div>

        <!-- Patient & Exam Info -->
        <div style="padding: 24px 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; border-bottom: 2px solid #e5e7eb;">
            <div>
                <div style="font-size: 11px; text-transform: uppercase; color: #0d9488; font-weight: 700; margin-bottom: 14px; letter-spacing: 1px; display: flex; align-items: center; gap: 6px;">
                    <span>👤</span> Paciente
                </div>
                <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #1e293b;">${data.patientName}</div>
                <div style="display: grid; gap: 6px; font-size: 13px;">
                    <div><span style="color: #64748b;">ID:</span> <span style="font-weight: 600; font-family: monospace;">${data.patientId}</span></div>
                    ${data.dateOfBirth ? `<div><span style="color: #64748b;">Nacimiento:</span> <span style="font-weight: 500;">${data.dateOfBirth}</span></div>` : ''}
                </div>
            </div>
            <div>
                <div style="font-size: 11px; text-transform: uppercase; color: #0d9488; font-weight: 700; margin-bottom: 14px; letter-spacing: 1px; display: flex; align-items: center; gap: 6px;">
                    <span>🔬</span> Examen
                </div>
                <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #1e293b;">${data.examType}</div>
                <div style="display: grid; gap: 6px; font-size: 13px;">
                    <div><span style="color: #64748b;">Ordenado:</span> <span style="font-weight: 500;">${data.orderDate}</span></div>
                    <div><span style="color: #64748b;">Completado:</span> <span style="font-weight: 500;">${data.completionDate}</span></div>
                    <div><span style="color: #64748b;">Dr(a):</span> <span style="font-weight: 500;">${data.orderedBy}</span></div>
                </div>
            </div>
        </div>

        <!-- Results Table -->
        <div style="padding: 24px 30px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                <span style="font-size: 18px;">📊</span>
                <span style="font-size: 16px; font-weight: 700; color: #1e293b;">${data.examName}</span>
            </div>
            <table style="width: 100%; border-collapse: collapse; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                <thead>
                    <tr style="background: linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 100%);">
                        <th style="text-align: left; padding: 14px 16px; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 700; letter-spacing: 0.5px;">Parámetro</th>
                        <th style="text-align: center; padding: 14px 16px; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 700; letter-spacing: 0.5px;">Resultado</th>
                        <th style="text-align: center; padding: 14px 16px; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 700; letter-spacing: 0.5px;">Unidad</th>
                        <th style="text-align: center; padding: 14px 16px; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 700; letter-spacing: 0.5px;">Referencia</th>
                        <th style="text-align: center; padding: 14px 16px; font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 700; letter-spacing: 0.5px;">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${resultsRows}
                </tbody>
            </table>

            ${data.interpretation ? `
            <div style="margin-top: 24px; background: linear-gradient(90deg, #fef3c7 0%, #fef9c3 100%); border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 0 10px 10px 0;">
                <div style="font-weight: 700; color: #92400e; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                    <span>📋</span> Interpretación Médica
                </div>
                <div style="color: #78350f; font-size: 13px;">${data.interpretation}</div>
            </div>
            ` : ''}

            ${data.requiresFollowup ? `
            <div style="margin-top: 16px; background: linear-gradient(90deg, #fee2e2 0%, #fecaca 100%); border-left: 4px solid #dc2626; padding: 14px 20px; border-radius: 0 10px 10px 0;">
                <span style="color: #991b1b; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                    <span>⚠️</span> Este resultado requiere seguimiento médico. Contacte a su doctor.
                </span>
            </div>
            ` : ''}

            ${prescriptionsSection}
        </div>

        <!-- Verification Footer -->
        <div style="background: linear-gradient(90deg, #f0f9ff 0%, #e0f2fe 100%); padding: 20px 30px; border-top: 2px dashed #0ea5e9;">
            <div style="text-align: center;">
                <div style="font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Código de Verificación</div>
                <div style="font-size: 24px; font-weight: 800; color: #0369a1; font-family: 'Courier New', monospace; letter-spacing: 3px;">${data.accessCode}</div>
            </div>
        </div>

        <!-- Final Footer -->
        <div style="padding: 16px 30px; background: #1e293b; color: #94a3b8; font-size: 10px; display: flex; justify-content: space-between;">
            <div>
                <div>Documento generado digitalmente • Válido sin firma</div>
                <div style="color: #64748b;">Verificar en: medcomlabs.com/verificar</div>
            </div>
            <div style="text-align: right;">
                <div style="color: #94a3b8;">© ${new Date().getFullYear()} MedComLabs</div>
                <div style="color: #64748b;">Documento confidencial</div>
            </div>
        </div>
    </div>

    <!-- Print button (hidden when printing) -->
    <div id="print-controls" style="max-width: 800px; margin: 20px auto; text-align: center;">
        <button onclick="window.print()" style="background: linear-gradient(135deg, #0d9488, #0f766e); color: white; border: none; padding: 14px 40px; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(13,148,136,0.3);">📄 Guardar como PDF</button>
        <p style="color: #64748b; font-size: 12px; margin-top: 8px;">Seleccione &quot;Guardar como PDF&quot; en el diálogo de impresión</p>
    </div>
</body>
</html>
    `.trim()
}

/**
 * Generación de PDF
 */
export async function generatePDFFromHTML(html: string): Promise<Buffer> {
    return Buffer.from(html, 'utf-8')
}

/**
 * Generar una versión de texto simple de los resultados para facilitar la accesibilidad.
 */
export function generateLabResultText(data: LabResultPDFData): string {
    const lines = [
        '='.repeat(60),
        'MEDCOMLABS - RESULTADOS DE LABORATORIO',
        '='.repeat(60),
        '',
        'PACIENTE:',
        `  Nombre: ${data.patientName}`,
        `  ID: ${data.patientId}`,
        data.dateOfBirth ? `  Fecha de Nacimiento: ${data.dateOfBirth}` : null,
        '',
        'EXAMEN:',
        `  Tipo: ${data.examType}`,
        `  Nombre: ${data.examName}`,
        `  Fecha de Orden: ${data.orderDate}`,
        `  Fecha de Resultado: ${data.completionDate}`,
        `  Ordenado por: Dr(a). ${data.orderedBy}`,
        data.reviewedBy ? `  Revisado por: Dr(a). ${data.reviewedBy}` : null,
        '',
        '-'.repeat(60),
        'RESULTADOS:',
        '-'.repeat(60),
        '',
        ...data.results.map(r => 
            `${r.parameter}: ${r.value} ${r.unit} (Ref: ${r.referenceRange}) - ${r.status.toUpperCase()}`
        ),
        '',
        data.interpretation ? [
            '-'.repeat(60),
            'INTERPRETACIÓN:',
            data.interpretation
        ].join('\n') : null,
        '',
        data.requiresFollowup ? '⚠️ REQUIERE SEGUIMIENTO MÉDICO' : null,
        '',
        '-'.repeat(60),
        `Código de verificación: ${data.accessCode}`,
        '='.repeat(60),
    ]

    return lines.filter(Boolean).join('\n')
}
