import { listStrikeAudit } from '@/lib/admin/queries'
import { EmptyState } from '@/components/features/shared/EmptyState'
import { ShieldAlert, CheckCircle2, RotateCcw } from 'lucide-react'
import type { Database } from '@/types/database'

type MotivoStrikeEnum = Database['public']['Enums']['motivo_strike_enum']

const MOTIVO_LABELS: Record<MotivoStrikeEnum, string> = {
  no_entrego: 'No entregó el proyecto',
  abandono_proyecto: 'Abandonó el proyecto',
  conducta_inapropiada: 'Conducta inapropiada',
  calificacion_baja_repetida: 'Calificación baja repetida',
  fraude: 'Fraude o engaño',
  ghosting: 'Ghosting (sin respuesta)',
  otro: 'Otro motivo',
}

export async function StrikeAuditHistory() {
  const result = await listStrikeAudit(100)
  const logs = result.ok ? result.data : []

  if (logs.length === 0) {
    return (
      <EmptyState
        title="Sin historial de moderación"
        description="Cuando se apliquen o revoquen strikes, aparecerán aquí con su motivo detallado."
        icon={ShieldAlert}
      />
    )
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-surface shadow-sm overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Historial de Auditoría de Moderación ({logs.length} registros)
      </div>

      <div className="divide-y divide-gray-50">
        {logs.map((log) => (
          <div
            key={log.id_strike}
            className="px-5 py-4 hover:bg-gray-50/60 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              {/* Left: user + action badge */}
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    log.revocado
                      ? 'bg-green-50 text-green-600'
                      : 'bg-orange-50 text-orange-500'
                  }`}
                >
                  {log.revocado ? (
                    <RotateCcw className="h-4 w-4" />
                  ) : (
                    <ShieldAlert className="h-4 w-4" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {log.nombre_usuario}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        log.revocado
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-orange-50 text-orange-700 border border-orange-200'
                      }`}
                    >
                      {log.revocado ? 'Strike revocado' : 'Strike aplicado'}
                    </span>
                    {/* Motivo enum badge */}
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                      {MOTIVO_LABELS[log.motivo]}
                    </span>
                  </div>

                  {/* Descripción del strike */}
                  {log.descripcion && (
                    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">
                        Motivo:
                      </span>
                      {log.descripcion}
                    </div>
                  )}

                  {/* Motivo de revocación */}
                  {log.revocado && log.motivo_revocacion && (
                    <div className="rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700">
                      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-500 mb-0.5">
                        <CheckCircle2 className="h-3 w-3" /> Motivo de
                        revocación:
                      </span>
                      {log.motivo_revocacion}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: dates */}
              <div className="ml-11 sm:ml-0 shrink-0 text-right space-y-0.5">
                <p className="text-xs text-gray-400">
                  Aplicado:{' '}
                  {new Date(log.aplicado_at).toLocaleString('es', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                {log.revocado && log.revocado_at && (
                  <p className="text-xs text-green-500">
                    Revocado:{' '}
                    {new Date(log.revocado_at).toLocaleString('es', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
