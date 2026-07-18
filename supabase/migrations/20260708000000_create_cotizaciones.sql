-- ============================================================
-- Migración: Calculadora y Herramienta de Cotizaciones
-- Fecha: 2026-07-08
-- ============================================================

-- 1. Crear tabla de cotizaciones
CREATE TABLE public.cotizaciones (
  id_cotizacion              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_estudiante              UUID NOT NULL REFERENCES public.estudiantes(id_estudiante) ON DELETE CASCADE,
  id_proyecto                UUID REFERENCES public.proyectos(id_proyecto) ON DELETE SET NULL,
  nombre_cotizacion          VARCHAR(100) NOT NULL,
  
  -- Variables de cálculo
  duracion_semanas           INTEGER NOT NULL,
  horas_estimadas            INTEGER NOT NULL,
  complejidad                VARCHAR(20) NOT NULL, -- 'baja', 'media', 'alta'
  stack                      VARCHAR(50)[] NOT NULL,
  tipo_entregable            VARCHAR(100) NOT NULL,
  funcionalidades            TEXT[] NOT NULL,
  tarifa_base_hora           NUMERIC NOT NULL,
  modalidad                  VARCHAR(20) NOT NULL, -- 'remoto', 'hibrido', 'presencial'
  incluye_iva                BOOLEAN NOT NULL DEFAULT true,
  
  -- Montos finales
  subtotal_usd               NUMERIC NOT NULL,
  subtotal_crc               NUMERIC NOT NULL,
  iva_usd                    NUMERIC NOT NULL,
  iva_crc                    NUMERIC NOT NULL,
  total_usd                  NUMERIC NOT NULL,
  total_crc                  NUMERIC NOT NULL,
  rango_min_usd              NUMERIC NOT NULL,
  rango_max_usd              NUMERIC NOT NULL,
  rango_min_crc              NUMERIC NOT NULL,
  rango_max_crc              NUMERIC NOT NULL,
  desglose_calculo           JSONB NOT NULL,
  explicacion_ia             TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Modificar la tabla participaciones
ALTER TABLE public.participaciones ADD COLUMN id_cotizacion UUID REFERENCES public.cotizaciones(id_cotizacion) ON DELETE SET NULL;
ALTER TABLE public.participaciones ADD COLUMN monto_propuesto NUMERIC;

-- 3. Habilitar RLS en cotizaciones y definir políticas
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cotizaciones_select_owner" ON public.cotizaciones
  FOR SELECT USING (
    auth.uid() = (SELECT id_usuario FROM public.estudiantes WHERE id_estudiante = cotizaciones.id_estudiante)
  );

CREATE POLICY "cotizaciones_select_empresario" ON public.cotizaciones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.participaciones p
      JOIN public.proyectos pr ON pr.id_proyecto = p.id_proyecto
      JOIN public.empresarios e ON e.id_empresario = pr.id_empresario
      WHERE p.id_cotizacion = cotizaciones.id_cotizacion
      AND e.id_usuario = auth.uid()
    )
  );

CREATE POLICY "cotizaciones_insert_egresado" ON public.cotizaciones
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT id_usuario FROM public.estudiantes WHERE id_estudiante = id_estudiante)
  );

CREATE POLICY "cotizaciones_update_owner" ON public.cotizaciones
  FOR UPDATE USING (
    auth.uid() = (SELECT id_usuario FROM public.estudiantes WHERE id_estudiante = cotizaciones.id_estudiante)
  );

CREATE POLICY "cotizaciones_delete_owner" ON public.cotizaciones
  FOR DELETE USING (
    auth.uid() = (SELECT id_usuario FROM public.estudiantes WHERE id_estudiante = cotizaciones.id_estudiante)
  );

-- 4. Modificar trigger para copiar monto_propuesto a contrataciones
CREATE OR REPLACE FUNCTION public.crear_contratacion_al_adjudicar()
RETURNS TRIGGER AS $$
BEGIN
  IF new.estado = 'contratada' AND (old.estado IS NULL OR old.estado <> 'contratada') THEN
    INSERT INTO public.contrataciones (id_participacion, fecha_inicio, estado_periodo, monto_acordado)
    VALUES (new.id_participacion, current_date, 'vigente', new.monto_propuesto)
    ON CONFLICT (id_participacion) DO NOTHING;
  END IF;
  RETURN new;
END; $$ LANGUAGE plpgsql;

-- 5. Actualizar la función RPC para que respete sobre cerrado
DROP FUNCTION IF EXISTS public.get_participaciones_de_proyecto(uuid);

CREATE FUNCTION public.get_participaciones_de_proyecto(
  p_id_proyecto uuid
)
RETURNS TABLE (
  id_participacion         uuid,
  estado                   public.estado_participacion_enum,
  estudiante_nombre        varchar,
  estudiante_apellido_1    varchar,
  estudiante_apellido_2    varchar,
  foto_perfil              varchar,
  reputacion               numeric,
  titulo_fwd               public.titulo_fwd_enum,
  carta_postulacion        text,
  planteamiento_solucion   text,
  prototipo_enlaces        text[],
  documentacion_tecnica    varchar,
  url_repositorio_proyecto varchar,
  fecha_postulacion        timestamptz,
  fecha_entrega_prototipo  timestamptz,
  calificacion_prototipo   integer,
  comentario_prototipo     text,
  tiene_prototipo          boolean,
  tiene_repositorio        boolean,
  tiene_documentacion      boolean,
  monto_propuesto          numeric,
  id_cotizacion            uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    pa.id_participacion,
    pa.estado,
    u.nombre,
    u.apellido_1,
    u.apellido_2,
    u.foto_perfil,
    e.reputacion,
    e.titulo_fwd,
    -- Contenido SELLADO mientras la oferta no se abrió (`enviada`)
    CASE WHEN pa.estado = 'enviada' THEN NULL ELSE pa.carta_postulacion END,
    CASE WHEN pa.estado = 'enviada' THEN NULL ELSE pa.planteamiento_solucion END,
    CASE WHEN pa.estado = 'enviada' THEN NULL::text[] ELSE pa.prototipo_enlaces END,
    CASE WHEN pa.estado = 'enviada' THEN NULL ELSE pa.documentacion_tecnica END,
    CASE WHEN pa.estado = 'enviada' THEN NULL ELSE pa.url_repositorio_proyecto END,
    pa.fecha_postulacion,
    pa.fecha_entrega_prototipo,
    pa.calificacion_prototipo,
    pa.comentario_prototipo,
    -- Booleanos de la tapa: existencia, NO contenido
    COALESCE(cardinality(pa.prototipo_enlaces), 0) > 0,
    pa.url_repositorio_proyecto IS NOT NULL,
    pa.documentacion_tecnica IS NOT NULL,
    -- Monto propuesto y cotización sellados mientras sea 'enviada'
    CASE WHEN pa.estado = 'enviada' THEN NULL ELSE pa.monto_propuesto END,
    CASE WHEN pa.estado = 'enviada' THEN NULL ELSE pa.id_cotizacion END
  FROM public.participaciones pa
  JOIN public.estudiantes e ON e.id_estudiante = pa.id_estudiante
  JOIN public.usuarios    u ON u.id_usuario    = e.id_usuario
  WHERE pa.id_proyecto = p_id_proyecto
    AND EXISTS (
      SELECT 1
      FROM public.proyectos   p
      JOIN public.empresarios emp ON emp.id_empresario = p.id_empresario
      WHERE p.id_proyecto = p_id_proyecto
        AND emp.id_usuario = auth.uid()
    )
  ORDER BY pa.fecha_postulacion DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_participaciones_de_proyecto(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.get_participaciones_de_proyecto(uuid) TO authenticated;
