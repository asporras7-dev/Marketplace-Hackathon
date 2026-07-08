export interface CalculatorInput {
  horas_estimadas: number
  tarifa_base_hora: number
  complejidad: 'baja' | 'media' | 'alta'
  modalidad: 'remoto' | 'hibrido' | 'presencial'
  incluye_iva: boolean
}

export interface CalculatorResult {
  tasaDeCambio: number
  costoBase: number
  adicionalComplejidad: number
  adicionalModalidad: number
  multComplejidad: number
  multModalidad: number
  subtotalUsd: number
  subtotalCrc: number
  ivaUsd: number
  ivaCrc: number
  totalUsd: number
  totalCrc: number
  minUsd: number
  maxUsd: number
  minCrc: number
  maxCrc: number
}

export const TASA_CAMBIO_CRC = 515;
export const IVA_FACTOR = 0.13;

export function calcularCotizacion(input: CalculatorInput): CalculatorResult {
  const horas = Number(input.horas_estimadas) || 0;
  const tarifa = Number(input.tarifa_base_hora) || 0;
  const complejidad = input.complejidad || 'media';
  const modalidad = input.modalidad || 'remoto';
  const incluyeIva = input.incluye_iva ?? true;

  const costoBase = horas * tarifa;

  const multComplejidad = complejidad === 'baja' ? 1.0 : complejidad === 'media' ? 1.25 : 1.5;
  const multModalidad = modalidad === 'remoto' ? 1.0 : modalidad === 'hibrido' ? 1.05 : 1.15;

  const subtotalUsd = costoBase * multComplejidad * multModalidad;
  const subtotalCrc = subtotalUsd * TASA_CAMBIO_CRC;

  const ivaUsd = incluyeIva ? subtotalUsd * IVA_FACTOR : 0;
  const ivaCrc = incluyeIva ? subtotalCrc * IVA_FACTOR : 0;

  const totalUsd = subtotalUsd + ivaUsd;
  const totalCrc = subtotalCrc + ivaCrc;

  const minUsd = totalUsd * 0.85;
  const maxUsd = totalUsd * 1.20;
  const minCrc = totalCrc * 0.85;
  const maxCrc = totalCrc * 1.20;

  return {
    tasaDeCambio: TASA_CAMBIO_CRC,
    costoBase,
    adicionalComplejidad: subtotalUsd - costoBase,
    adicionalModalidad: (costoBase * multComplejidad) * (multModalidad - 1),
    multComplejidad,
    multModalidad,
    subtotalUsd,
    subtotalCrc,
    ivaUsd,
    ivaCrc,
    totalUsd,
    totalCrc,
    minUsd,
    maxUsd,
    minCrc,
    maxCrc
  };
}
