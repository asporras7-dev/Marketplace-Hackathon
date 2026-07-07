import { describe, it, expect } from 'vitest'
import {
  getNotificationTone,
  getNotificationTypeKey,
  resolveNotificationContent,
} from '@/lib/notifications/format'

describe('getNotificationTone', () => {
  it('asigna magenta a eventos negativos/destructivos', () => {
    expect(getNotificationTone('strike_recibido')).toBe('magenta')
    expect(getNotificationTone('cuenta_suspendida')).toBe('magenta')
    expect(getNotificationTone('participacion_no_seleccionada')).toBe('magenta')
    expect(getNotificationTone('entregable_rechazado')).toBe('magenta')
  })

  it('asigna accent a eventos positivos', () => {
    expect(getNotificationTone('participacion_contratada')).toBe('accent')
    expect(getNotificationTone('entregable_aprobado')).toBe('accent')
    expect(getNotificationTone('cuenta_verificada')).toBe('accent')
  })

  it('asigna warning a vencimientos', () => {
    expect(getNotificationTone('plazo_vence')).toBe('warning')
  })

  it('asigna primary a eventos informativos', () => {
    expect(getNotificationTone('proyecto_modificado')).toBe('primary')
    expect(getNotificationTone('mensaje_nuevo')).toBe('primary')
    expect(getNotificationTone('participacion_en_revision')).toBe('primary')
  })

  it('cae a primary ante un tipo desconocido', () => {
    expect(getNotificationTone('tipo_inexistente')).toBe('primary')
  })
})

describe('getNotificationTypeKey', () => {
  it('devuelve la clave del tipo cuando es conocido', () => {
    expect(getNotificationTypeKey('proyecto_modificado')).toBe(
      'types.proyecto_modificado',
    )
    expect(getNotificationTypeKey('strike_recibido')).toBe(
      'types.strike_recibido',
    )
  })

  it('cae a la clave generica ante un tipo desconocido', () => {
    expect(getNotificationTypeKey('tipo_inexistente')).toBe('types.generic')
  })
})

describe('resolveNotificationContent', () => {
  it('usa el mensaje crudo cuando no hay parametros', () => {
    expect(
      resolveNotificationContent({
        tipo: 'proyecto_modificado',
        mensaje: 'Texto guardado',
      }),
    ).toEqual({ kind: 'raw', text: 'Texto guardado' })
  })

  it('usa el mensaje crudo cuando params es un objeto vacio', () => {
    expect(
      resolveNotificationContent({
        tipo: 'proyecto_modificado',
        mensaje: 'Texto guardado',
        params: {},
      }),
    ).toEqual({ kind: 'raw', text: 'Texto guardado' })
  })

  it('traduce con clave i18n cuando hay params y el tipo tiene plantilla', () => {
    expect(
      resolveNotificationContent({
        tipo: 'proyecto_modificado',
        mensaje: 'Texto guardado',
        params: { titulo: 'Mi Proyecto' },
      }),
    ).toEqual({
      kind: 'i18n',
      key: 'content.proyecto_modificado',
      values: { titulo: 'Mi Proyecto' },
    })
  })

  it('traduce participacion_en_revision con params', () => {
    expect(
      resolveNotificationContent({
        tipo: 'participacion_en_revision',
        mensaje: 'Texto guardado',
        params: { titulo: 'Mi Proyecto' },
      }),
    ).toEqual({
      kind: 'i18n',
      key: 'content.participacion_en_revision',
      values: { titulo: 'Mi Proyecto' },
    })
  })

  it('cae al mensaje crudo si el tipo aun no tiene plantilla, aunque haya params', () => {
    expect(
      resolveNotificationContent({
        tipo: 'evaluacion_recibida',
        mensaje: 'Recibiste una evaluacion',
        params: { de: 'Ana' },
      }),
    ).toEqual({ kind: 'raw', text: 'Recibiste una evaluacion' })
  })

  it('usa clave i18n estática para cuenta_verificada sin params', () => {
    expect(
      resolveNotificationContent({
        tipo: 'cuenta_verificada',
        mensaje: 'content.cuenta_verificada',
      }),
    ).toEqual({ kind: 'i18n', key: 'content.cuenta_verificada', values: {} })
  })

  it('usa clave i18n con plantilla para mensaje_nuevo (RF-45) con remitente fallback si no viene en params', () => {
    expect(
      resolveNotificationContent({
        tipo: 'mensaje_nuevo',
        mensaje: 'Tienes un mensaje nuevo',
        params: { idProyecto: 'abc' },
      }),
    ).toEqual({
      kind: 'i18n',
      key: 'content.mensaje_nuevo',
      values: { idProyecto: 'abc', remitente: 'un usuario' },
    })
  })

  it('usa clave i18n para plazo_vence con params.titulo (RF-33)', () => {
    expect(
      resolveNotificationContent({
        tipo: 'plazo_vence',
        mensaje: 'La ventana de ofertas de "Mi Proyecto" esta por cerrar.',
        params: { titulo: 'Mi Proyecto' },
      }),
    ).toEqual({
      kind: 'i18n',
      key: 'content.plazo_vence',
      values: { titulo: 'Mi Proyecto' },
    })
  })
})
