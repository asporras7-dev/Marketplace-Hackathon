import { z } from 'zod'

// Esquema de validación para guardar cotización
export const GuardarCotizacionSchema = z.object({
  id_proyecto: z.string().uuid().optional().nullable(),
  nombre_cotizacion: z.string().min(3),
  duracion_semanas: z.number().int().min(1),
  horas_estimadas: z.number().int().min(1),
  complejidad: z.enum(['baja', 'media', 'alta']),
  stack: z.array(z.string()),
  tipo_entregable: z.string(),
  funcionalidades: z.array(z.string()),
  tarifa_base_hora: z.number().min(1),
  modalidad: z.enum(['remoto', 'hibrido', 'presencial']),
  incluye_iva: z.boolean(),
  explicacion_ia: z.string().optional().nullable()
})

export type GuardarCotizacionInput = z.infer<typeof GuardarCotizacionSchema>
