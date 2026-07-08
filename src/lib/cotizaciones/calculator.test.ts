import { describe, it, expect } from 'vitest'
import { calcularCotizacion } from './calculator'

describe('calcularCotizacion', () => {
  it('debe realizar los calculos basicos sin IVA', () => {
    const res = calcularCotizacion({
      horas_estimadas: 10,
      tarifa_base_hora: 20,
      complejidad: 'baja',
      modalidad: 'remoto',
      incluye_iva: false,
    })

    expect(res.costoBase).toBe(200)
    expect(res.subtotalUsd).toBe(200)
    expect(res.ivaUsd).toBe(0)
    expect(res.totalUsd).toBe(200)
    expect(res.totalCrc).toBe(200 * 515)
  })

  it('debe aplicar el multiplicador de complejidad alta y modalidad presencial con IVA', () => {
    const res = calcularCotizacion({
      horas_estimadas: 100,
      tarifa_base_hora: 10,
      complejidad: 'alta',
      modalidad: 'presencial',
      incluye_iva: true,
    })

    // costoBase = 1000
    // multComplejidad = 1.5
    // multModalidad = 1.15
    // subtotal = 1000 * 1.5 * 1.15 = 1725
    // iva = 1725 * 0.13 = 224.25
    // total = 1725 + 224.25 = 1949.25

    expect(res.costoBase).toBe(1000)
    expect(res.subtotalUsd).toBeCloseTo(1725)
    expect(res.totalUsd).toBeCloseTo(1949.25)
  })

  it('debe calcular los rangos de cotizacion sugeridos (-15% y +20%)', () => {
    const res = calcularCotizacion({
      horas_estimadas: 80,
      tarifa_base_hora: 25,
      complejidad: 'media',
      modalidad: 'hibrido',
      incluye_iva: true,
    })

    // costoBase = 2000
    // multComplejidad = 1.25
    // multModalidad = 1.05
    // subtotal = 2000 * 1.25 * 1.05 = 2625
    // iva = 2625 * 0.13 = 341.25
    // total = 2625 + 341.25 = 2966.25
    // minUsd = 2966.25 * 0.85 = 2521.3125
    // maxUsd = 2966.25 * 1.20 = 3559.5

    expect(res.minUsd).toBeCloseTo(2521.3125)
    expect(res.maxUsd).toBeCloseTo(3559.5)
  })
})
