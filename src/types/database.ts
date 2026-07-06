export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      areas_negocio: {
        Row: {
          descripcion: string | null
          id_area: string
          is_active: boolean
          nombre: string
        }
        Insert: {
          descripcion?: string | null
          id_area?: string
          is_active?: boolean
          nombre: string
        }
        Update: {
          descripcion?: string | null
          id_area?: string
          is_active?: boolean
          nombre?: string
        }
        Relationships: []
      }
      auditoria: {
        Row: {
          accion: string
          entidad: string
          id_actor: string | null
          id_auditoria: string
          id_entidad: string
          ip_origen: string | null
          ocurrida_at: string
          valores_antes: Json | null
          valores_despues: Json | null
        }
        Insert: {
          accion: string
          entidad: string
          id_actor?: string | null
          id_auditoria?: string
          id_entidad: string
          ip_origen?: string | null
          ocurrida_at?: string
          valores_antes?: Json | null
          valores_despues?: Json | null
        }
        Update: {
          accion?: string
          entidad?: string
          id_actor?: string | null
          id_auditoria?: string
          id_entidad?: string
          ip_origen?: string | null
          ocurrida_at?: string
          valores_antes?: Json | null
          valores_despues?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'auditoria_id_actor_fkey'
            columns: ['id_actor']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id_usuario']
          },
        ]
      }
      categorias: {
        Row: {
          id_categoria: string
          is_active: boolean
          nombre: string
        }
        Insert: {
          id_categoria?: string
          is_active?: boolean
          nombre: string
        }
        Update: {
          id_categoria?: string
          is_active?: boolean
          nombre?: string
        }
        Relationships: []
      }
      chats_directos: {
        Row: {
          created_at: string
          id_chat: string
          id_empresario: string
          id_estudiante: string
        }
        Insert: {
          created_at?: string
          id_chat?: string
          id_empresario: string
          id_estudiante: string
        }
        Update: {
          created_at?: string
          id_chat?: string
          id_empresario?: string
          id_estudiante?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chats_directos_id_empresario_fkey'
            columns: ['id_empresario']
            isOneToOne: false
            referencedRelation: 'empresarios'
            referencedColumns: ['id_empresario']
          },
          {
            foreignKeyName: 'chats_directos_id_estudiante_fkey'
            columns: ['id_estudiante']
            isOneToOne: false
            referencedRelation: 'estudiantes'
            referencedColumns: ['id_estudiante']
          },
        ]
      }
      comentarios_entregables: {
        Row: {
          comentado_at: string
          contenido: string
          id_autor: string
          id_comentario_entregable: string
          id_entregable: string
          tipo_comentario: Database['public']['Enums']['tipo_comentario_enum']
        }
        Insert: {
          comentado_at?: string
          contenido: string
          id_autor: string
          id_comentario_entregable?: string
          id_entregable: string
          tipo_comentario: Database['public']['Enums']['tipo_comentario_enum']
        }
        Update: {
          comentado_at?: string
          contenido?: string
          id_autor?: string
          id_comentario_entregable?: string
          id_entregable?: string
          tipo_comentario?: Database['public']['Enums']['tipo_comentario_enum']
        }
        Relationships: [
          {
            foreignKeyName: 'comentarios_entregables_id_autor_fkey'
            columns: ['id_autor']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id_usuario']
          },
          {
            foreignKeyName: 'comentarios_entregables_id_entregable_fkey'
            columns: ['id_entregable']
            isOneToOne: false
            referencedRelation: 'entregables'
            referencedColumns: ['id_entregable']
          },
        ]
      }
      mensajes_directos: {
        Row: {
          contenido: string
          fecha_envio: string
          id_chat: string
          id_mensaje: string
          id_remitente: string
          leido: boolean
        }
        Insert: {
          contenido: string
          fecha_envio?: string
          id_chat: string
          id_mensaje?: string
          id_remitente: string
          leido?: boolean
        }
        Update: {
          contenido?: string
          fecha_envio?: string
          id_chat?: string
          id_mensaje?: string
          id_remitente?: string
          leido?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'mensajes_directos_id_chat_fkey'
            columns: ['id_chat']
            isOneToOne: false
            referencedRelation: 'chats_directos'
            referencedColumns: ['id_chat']
          },
          {
            foreignKeyName: 'mensajes_directos_id_remitente_fkey'
            columns: ['id_remitente']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id_usuario']
          },
        ]
      }
      configuracion_sistema: {
        Row: {
          clave: string
          descripcion: string | null
          modificado_at: string
          modificado_por: string | null
          tipo_dato: Database['public']['Enums']['tipo_dato_enum']
          valor: string
        }
        Insert: {
          clave: string
          descripcion?: string | null
          modificado_at?: string
          modificado_por?: string | null
          tipo_dato: Database['public']['Enums']['tipo_dato_enum']
          valor: string
        }
        Update: {
          clave?: string
          descripcion?: string | null
          modificado_at?: string
          modificado_por?: string | null
          tipo_dato?: Database['public']['Enums']['tipo_dato_enum']
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: 'configuracion_sistema_modificado_por_fkey'
            columns: ['modificado_por']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id_usuario']
          },
        ]
      }
      consentimientos: {
        Row: {
          consentimiento_at: string
          id_consentimiento: string
          id_usuario: string
          ip_origen: string | null
          otorgado: boolean
          tipo_consentimiento: Database['public']['Enums']['tipo_consentimiento_enum']
          user_agent: string | null
          version_documento: string | null
        }
        Insert: {
          consentimiento_at?: string
          id_consentimiento?: string
          id_usuario: string
          ip_origen?: string | null
          otorgado: boolean
          tipo_consentimiento: Database['public']['Enums']['tipo_consentimiento_enum']
          user_agent?: string | null
          version_documento?: string | null
        }
        Update: {
          consentimiento_at?: string
          id_consentimiento?: string
          id_usuario?: string
          ip_origen?: string | null
          otorgado?: boolean
          tipo_consentimiento?: Database['public']['Enums']['tipo_consentimiento_enum']
          user_agent?: string | null
          version_documento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'consentimientos_id_usuario_fkey'
            columns: ['id_usuario']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id_usuario']
          },
        ]
      }
      contrataciones: {
        Row: {
          condiciones_especiales: string | null
          estado_periodo: Database['public']['Enums']['estado_periodo_enum']
          fecha_fin_estimada: string | null
          fecha_fin_real: string | null
          fecha_inicio: string | null
          id_contratacion: string
          id_participacion: string
          moneda: Database['public']['Enums']['moneda_enum']
          monto_acordado: number | null
          motivo_cancelacion: string | null
          updated_at: string
        }
        Insert: {
          condiciones_especiales?: string | null
          estado_periodo?: Database['public']['Enums']['estado_periodo_enum']
          fecha_fin_estimada?: string | null
          fecha_fin_real?: string | null
          fecha_inicio?: string | null
          id_contratacion?: string
          id_participacion: string
          moneda?: Database['public']['Enums']['moneda_enum']
          monto_acordado?: number | null
          motivo_cancelacion?: string | null
          updated_at?: string
        }
        Update: {
          condiciones_especiales?: string | null
          estado_periodo?: Database['public']['Enums']['estado_periodo_enum']
          fecha_fin_estimada?: string | null
          fecha_fin_real?: string | null
          fecha_inicio?: string | null
          id_contratacion?: string
          id_participacion?: string
          moneda?: Database['public']['Enums']['moneda_enum']
          monto_acordado?: number | null
          motivo_cancelacion?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'contrataciones_id_participacion_fkey'
            columns: ['id_participacion']
            isOneToOne: true
            referencedRelation: 'participaciones'
            referencedColumns: ['id_participacion']
          },
        ]
      }
      conversaciones_ia: {
        Row: {
          contexto_inicial: string | null
          contexto_inicial_pdf_url: string | null
          estado: Database['public']['Enums']['estado_conv_ia_enum']
          fecha_fin: string | null
          fecha_inicio: string
          historial: Json | null
          id_conversacion: string
          id_empresario: string
          id_proyecto: string | null
          logistica: Json | null
          modelo_ia: string | null
          nivel_tecnico_empresario:
            | Database['public']['Enums']['nivel_tecnico_enum']
            | null
          propuesta_aprobada: Json | null
          propuesta_generada: Json | null
          stack_sugerido: Json | null
        }
        Insert: {
          contexto_inicial?: string | null
          contexto_inicial_pdf_url?: string | null
          estado?: Database['public']['Enums']['estado_conv_ia_enum']
          fecha_fin?: string | null
          fecha_inicio?: string
          historial?: Json | null
          id_conversacion?: string
          id_empresario: string
          id_proyecto?: string | null
          logistica?: Json | null
          modelo_ia?: string | null
          nivel_tecnico_empresario?:
            | Database['public']['Enums']['nivel_tecnico_enum']
            | null
          propuesta_aprobada?: Json | null
          propuesta_generada?: Json | null
          stack_sugerido?: Json | null
        }
        Update: {
          contexto_inicial?: string | null
          contexto_inicial_pdf_url?: string | null
          estado?: Database['public']['Enums']['estado_conv_ia_enum']
          fecha_fin?: string | null
          fecha_inicio?: string
          historial?: Json | null
          id_conversacion?: string
          id_empresario?: string
          id_proyecto?: string | null
          logistica?: Json | null
          modelo_ia?: string | null
          nivel_tecnico_empresario?:
            | Database['public']['Enums']['nivel_tecnico_enum']
            | null
          propuesta_aprobada?: Json | null
          propuesta_generada?: Json | null
          stack_sugerido?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: 'conversaciones_ia_id_empresario_fkey'
            columns: ['id_empresario']
            isOneToOne: false
            referencedRelation: 'empresarios'
            referencedColumns: ['id_empresario']
          },
          {
            foreignKeyName: 'conversaciones_ia_id_proyecto_fkey'
            columns: ['id_proyecto']
            isOneToOne: false
            referencedRelation: 'proyectos'
            referencedColumns: ['id_proyecto']
          },
        ]
      }
      egresados_fwd_oficial: {
        Row: {
          correo: string
          fecha_agregado: string
        }
        Insert: {
          correo: string
          fecha_agregado?: string
        }
        Update: {
          correo?: string
          fecha_agregado?: string
        }
        Relationships: []
      }
      empresarios: {
        Row: {
          alcance_operativo: Database['public']['Enums']['alcance_enum'] | null
          cedula: string | null
          region_sede: string | null
          descripcion: string | null
          estado_verificacion: Database['public']['Enums']['estado_verif_enum']
          id_empresario: string
          id_usuario: string
          logo: string | null
          nombre_empresa: string | null
          pais_iso_sede: string | null
          reputacion: number | null
          sector: string | null
          sitio_web: string | null
          tipo_empresario: Database['public']['Enums']['tipo_empresario_enum']
          updated_at: string
          verificado_at: string | null
          verificado_por: string | null
        }
        Insert: {
          alcance_operativo?: Database['public']['Enums']['alcance_enum'] | null
          cedula?: string | null
          region_sede?: string | null
          descripcion?: string | null
          estado_verificacion?: Database['public']['Enums']['estado_verif_enum']
          id_empresario?: string
          id_usuario: string
          logo?: string | null
          nombre_empresa?: string | null
          pais_iso_sede?: string | null
          reputacion?: number | null
          sector?: string | null
          sitio_web?: string | null
          tipo_empresario: Database['public']['Enums']['tipo_empresario_enum']
          updated_at?: string
          verificado_at?: string | null
          verificado_por?: string | null
        }
        Update: {
          alcance_operativo?: Database['public']['Enums']['alcance_enum'] | null
          cedula?: string | null
          region_sede?: string | null
          descripcion?: string | null
          estado_verificacion?: Database['public']['Enums']['estado_verif_enum']
          id_empresario?: string
          id_usuario?: string
          logo?: string | null
          nombre_empresa?: string | null
          pais_iso_sede?: string | null
          reputacion?: number | null
          sector?: string | null
          sitio_web?: string | null
          tipo_empresario?: Database['public']['Enums']['tipo_empresario_enum']
          updated_at?: string
          verificado_at?: string | null
          verificado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'empresarios_id_usuario_fkey'
            columns: ['id_usuario']
            isOneToOne: true
            referencedRelation: 'usuarios'
            referencedColumns: ['id_usuario']
          },
          {
            foreignKeyName: 'empresarios_verificado_por_fkey'
            columns: ['verificado_por']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id_usuario']
          },
        ]
      }
      entregables: {
        Row: {
          archivo_hash: string | null
          archivo_url: string | null
          cargado_at: string
          comentario_empresario: string | null
          estado: Database['public']['Enums']['estado_entregable_enum']
          id_contratacion: string
          id_entregable: string
          tipo_entregable: Database['public']['Enums']['tipo_entregable_enum']
          updated_at: string
          version: number
        }
        Insert: {
          archivo_hash?: string | null
          archivo_url?: string | null
          cargado_at?: string
          comentario_empresario?: string | null
          estado?: Database['public']['Enums']['estado_entregable_enum']
          id_contratacion: string
          id_entregable?: string
          tipo_entregable: Database['public']['Enums']['tipo_entregable_enum']
          updated_at?: string
          version?: number
        }
        Update: {
          archivo_hash?: string | null
          archivo_url?: string | null
          cargado_at?: string
          comentario_empresario?: string | null
          estado?: Database['public']['Enums']['estado_entregable_enum']
          id_contratacion?: string
          id_entregable?: string
          tipo_entregable?: Database['public']['Enums']['tipo_entregable_enum']
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: 'entregables_id_contratacion_fkey'
            columns: ['id_contratacion']
            isOneToOne: false
            referencedRelation: 'contrataciones'
            referencedColumns: ['id_contratacion']
          },
        ]
      }
      estudiantes: {
        Row: {
          descripcion: string | null
          estado_verificacion: Database['public']['Enums']['estado_verif_enum']
          id_estudiante: string
          id_usuario: string
          modalidad_preferida:
            | Database['public']['Enums']['modalidad_enum']
            | null
          pais_iso_residencia: string | null
          participaciones_activas: number
          portafolio_visible_publicamente: boolean
          proyectos_completados: number
          region_residencia: string | null
          reputacion: number | null
          titulo_fwd: Database['public']['Enums']['titulo_fwd_enum'] | null
          updated_at: string
          url_curriculum: string | null
          url_portafolio: string | null
          verificado_at: string | null
          verificado_por: string | null
        }
        Insert: {
          descripcion?: string | null
          estado_verificacion?: Database['public']['Enums']['estado_verif_enum']
          id_estudiante?: string
          id_usuario: string
          modalidad_preferida?:
            | Database['public']['Enums']['modalidad_enum']
            | null
          pais_iso_residencia?: string | null
          participaciones_activas?: number
          portafolio_visible_publicamente?: boolean
          proyectos_completados?: number
          region_residencia?: string | null
          reputacion?: number | null
          titulo_fwd?: Database['public']['Enums']['titulo_fwd_enum'] | null
          updated_at?: string
          url_curriculum?: string | null
          url_portafolio?: string | null
          verificado_at?: string | null
          verificado_por?: string | null
        }
        Update: {
          descripcion?: string | null
          estado_verificacion?: Database['public']['Enums']['estado_verif_enum']
          id_estudiante?: string
          id_usuario?: string
          modalidad_preferida?:
            | Database['public']['Enums']['modalidad_enum']
            | null
          pais_iso_residencia?: string | null
          participaciones_activas?: number
          portafolio_visible_publicamente?: boolean
          proyectos_completados?: number
          region_residencia?: string | null
          reputacion?: number | null
          titulo_fwd?: Database['public']['Enums']['titulo_fwd_enum'] | null
          updated_at?: string
          url_curriculum?: string | null
          url_portafolio?: string | null
          verificado_at?: string | null
          verificado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'estudiantes_id_usuario_fkey'
            columns: ['id_usuario']
            isOneToOne: true
            referencedRelation: 'usuarios'
            referencedColumns: ['id_usuario']
          },
          {
            foreignKeyName: 'estudiantes_verificado_por_fkey'
            columns: ['verificado_por']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id_usuario']
          },
        ]
      }
      evaluaciones: {
        Row: {
          comentario: string | null
          evaluado_at: string
          id_contratacion: string
          id_empresario: string
          id_estudiante: string
          id_evaluacion: string
          puntuacion: number
          respuesta_evaluado: string | null
        }
        Insert: {
          comentario?: string | null
          evaluado_at?: string
          id_contratacion: string
          id_empresario: string
          id_estudiante: string
          id_evaluacion?: string
          puntuacion: number
          respuesta_evaluado?: string | null
        }
        Update: {
          comentario?: string | null
          evaluado_at?: string
          id_contratacion?: string
          id_empresario?: string
          id_estudiante?: string
          id_evaluacion?: string
          puntuacion?: number
          respuesta_evaluado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'evaluaciones_id_contratacion_fkey'
            columns: ['id_contratacion']
            isOneToOne: false
            referencedRelation: 'contrataciones'
            referencedColumns: ['id_contratacion']
          },
          {
            foreignKeyName: 'evaluaciones_id_empresario_fkey'
            columns: ['id_empresario']
            isOneToOne: false
            referencedRelation: 'empresarios'
            referencedColumns: ['id_empresario']
          },
          {
            foreignKeyName: 'evaluaciones_id_estudiante_fkey'
            columns: ['id_estudiante']
            isOneToOne: false
            referencedRelation: 'estudiantes'
            referencedColumns: ['id_estudiante']
          },
        ]
      }
      evaluaciones_empresarios: {
        Row: {
          comentario: string | null
          evaluado_at: string
          id_contratacion: string
          id_empresario: string
          id_estudiante: string
          id_evaluacion: string
          puntuacion: number
        }
        Insert: {
          comentario?: string | null
          evaluado_at?: string
          id_contratacion: string
          id_empresario: string
          id_estudiante: string
          id_evaluacion?: string
          puntuacion: number
        }
        Update: {
          comentario?: string | null
          evaluado_at?: string
          id_contratacion?: string
          id_empresario?: string
          id_estudiante?: string
          id_evaluacion?: string
          puntuacion?: number
        }
        Relationships: [
          {
            foreignKeyName: 'evaluaciones_empresarios_id_contratacion_fkey'
            columns: ['id_contratacion']
            isOneToOne: false
            referencedRelation: 'contrataciones'
            referencedColumns: ['id_contratacion']
          },
          {
            foreignKeyName: 'evaluaciones_empresarios_id_empresario_fkey'
            columns: ['id_empresario']
            isOneToOne: false
            referencedRelation: 'empresarios'
            referencedColumns: ['id_empresario']
          },
          {
            foreignKeyName: 'evaluaciones_empresarios_id_estudiante_fkey'
            columns: ['id_estudiante']
            isOneToOne: false
            referencedRelation: 'estudiantes'
            referencedColumns: ['id_estudiante']
          },
        ]
      }
      habilidades_tecnicas: {
        Row: {
          id_estudiante: string
          id_tecnologia: string
          nivel: Database['public']['Enums']['nivel_habilidad_enum']
        }
        Insert: {
          id_estudiante: string
          id_tecnologia: string
          nivel: Database['public']['Enums']['nivel_habilidad_enum']
        }
        Update: {
          id_estudiante?: string
          id_tecnologia?: string
          nivel?: Database['public']['Enums']['nivel_habilidad_enum']
        }
        Relationships: [
          {
            foreignKeyName: 'habilidades_tecnicas_id_estudiante_fkey'
            columns: ['id_estudiante']
            isOneToOne: false
            referencedRelation: 'estudiantes'
            referencedColumns: ['id_estudiante']
          },
          {
            foreignKeyName: 'habilidades_tecnicas_id_tecnologia_fkey'
            columns: ['id_tecnologia']
            isOneToOne: false
            referencedRelation: 'tecnologias'
            referencedColumns: ['id_tecnologia']
          },
        ]
      }
      mensajes: {
        Row: {
          contenido: string
          fecha_envio: string
          id_mensaje: string
          id_proyecto: string
          id_remitente: string
          leido: boolean
        }
        Insert: {
          contenido: string
          fecha_envio?: string
          id_mensaje?: string
          id_proyecto: string
          id_remitente: string
          leido?: boolean
        }
        Update: {
          contenido?: string
          fecha_envio?: string
          id_mensaje?: string
          id_proyecto?: string
          id_remitente?: string
          leido?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'mensajes_id_proyecto_fkey'
            columns: ['id_proyecto']
            isOneToOne: false
            referencedRelation: 'proyectos'
            referencedColumns: ['id_proyecto']
          },
          {
            foreignKeyName: 'mensajes_id_remitente_fkey'
            columns: ['id_remitente']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id_usuario']
          },
        ]
      }
      notificaciones: {
        Row: {
          generada_at: string
          id_notificacion: string
          id_usuario: string
          leida: boolean
          mensaje: string
          params: Json | null
          tipo_evento: Database['public']['Enums']['tipo_notificacion_enum']
          url_destino: string | null
        }
        Insert: {
          generada_at?: string
          id_notificacion?: string
          id_usuario: string
          leida?: boolean
          mensaje: string
          params?: Json | null
          tipo_evento: Database['public']['Enums']['tipo_notificacion_enum']
          url_destino?: string | null
        }
        Update: {
          generada_at?: string
          id_notificacion?: string
          id_usuario?: string
          leida?: boolean
          mensaje?: string
          params?: Json | null
          tipo_evento?: Database['public']['Enums']['tipo_notificacion_enum']
          url_destino?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'notificaciones_id_usuario_fkey'
            columns: ['id_usuario']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id_usuario']
          },
        ]
      }
      participaciones: {
        Row: {
          adjudicada_at: string | null
          calificacion_prototipo: number | null
          carta_postulacion: string | null
          comentario_prototipo: string | null
          documentacion_tecnica: string | null
          estado: Database['public']['Enums']['estado_participacion_enum']
          fecha_entrega_prototipo: string | null
          fecha_postulacion: string
          id_estudiante: string
          id_participacion: string
          id_proyecto: string
          motivo_retiro: string | null
          no_seleccionada_at: string | null
          planteamiento_solucion: string
          plazo_aviso_enviado_at: string | null
          prototipo_enlaces: string[]
          retirada_at: string | null
          revision_iniciada_at: string | null
          updated_at: string
          url_repositorio_proyecto: string | null
        }
        Insert: {
          adjudicada_at?: string | null
          calificacion_prototipo?: number | null
          carta_postulacion?: string | null
          comentario_prototipo?: string | null
          documentacion_tecnica?: string | null
          estado?: Database['public']['Enums']['estado_participacion_enum']
          fecha_entrega_prototipo?: string | null
          fecha_postulacion?: string
          id_estudiante: string
          id_participacion?: string
          id_proyecto: string
          motivo_retiro?: string | null
          no_seleccionada_at?: string | null
          planteamiento_solucion: string
          plazo_aviso_enviado_at?: string | null
          prototipo_enlaces: string[]
          retirada_at?: string | null
          revision_iniciada_at?: string | null
          updated_at?: string
          url_repositorio_proyecto?: string | null
        }
        Update: {
          adjudicada_at?: string | null
          calificacion_prototipo?: number | null
          carta_postulacion?: string | null
          comentario_prototipo?: string | null
          documentacion_tecnica?: string | null
          estado?: Database['public']['Enums']['estado_participacion_enum']
          fecha_entrega_prototipo?: string | null
          fecha_postulacion?: string
          id_estudiante?: string
          id_participacion?: string
          id_proyecto?: string
          motivo_retiro?: string | null
          no_seleccionada_at?: string | null
          planteamiento_solucion?: string
          plazo_aviso_enviado_at?: string | null
          prototipo_enlaces?: string[]
          retirada_at?: string | null
          revision_iniciada_at?: string | null
          updated_at?: string
          url_repositorio_proyecto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'participaciones_id_estudiante_fkey'
            columns: ['id_estudiante']
            isOneToOne: false
            referencedRelation: 'estudiantes'
            referencedColumns: ['id_estudiante']
          },
          {
            foreignKeyName: 'participaciones_id_proyecto_fkey'
            columns: ['id_proyecto']
            isOneToOne: false
            referencedRelation: 'proyectos'
            referencedColumns: ['id_proyecto']
          },
        ]
      }
      portafolio_tecnologias: {
        Row: {
          id_portafolio: string
          id_tecnologia: string
        }
        Insert: {
          id_portafolio: string
          id_tecnologia: string
        }
        Update: {
          id_portafolio?: string
          id_tecnologia?: string
        }
        Relationships: [
          {
            foreignKeyName: 'portafolio_tecnologias_id_portafolio_fkey'
            columns: ['id_portafolio']
            isOneToOne: false
            referencedRelation: 'proyectos_portafolio'
            referencedColumns: ['id_portafolio']
          },
          {
            foreignKeyName: 'portafolio_tecnologias_id_tecnologia_fkey'
            columns: ['id_tecnologia']
            isOneToOne: false
            referencedRelation: 'tecnologias'
            referencedColumns: ['id_tecnologia']
          },
        ]
      }
      proyecto_categorias: {
        Row: {
          id_categoria: string
          id_proyecto: string
        }
        Insert: {
          id_categoria: string
          id_proyecto: string
        }
        Update: {
          id_categoria?: string
          id_proyecto?: string
        }
        Relationships: [
          {
            foreignKeyName: 'proyecto_categorias_id_categoria_fkey'
            columns: ['id_categoria']
            isOneToOne: false
            referencedRelation: 'categorias'
            referencedColumns: ['id_categoria']
          },
          {
            foreignKeyName: 'proyecto_categorias_id_proyecto_fkey'
            columns: ['id_proyecto']
            isOneToOne: false
            referencedRelation: 'proyectos'
            referencedColumns: ['id_proyecto']
          },
        ]
      }
      proyecto_tecnologias: {
        Row: {
          id_proyecto: string
          id_tecnologia: string
        }
        Insert: {
          id_proyecto: string
          id_tecnologia: string
        }
        Update: {
          id_proyecto?: string
          id_tecnologia?: string
        }
        Relationships: [
          {
            foreignKeyName: 'proyecto_tecnologias_id_proyecto_fkey'
            columns: ['id_proyecto']
            isOneToOne: false
            referencedRelation: 'proyectos'
            referencedColumns: ['id_proyecto']
          },
          {
            foreignKeyName: 'proyecto_tecnologias_id_tecnologia_fkey'
            columns: ['id_tecnologia']
            isOneToOne: false
            referencedRelation: 'tecnologias'
            referencedColumns: ['id_tecnologia']
          },
        ]
      }
      proyectos: {
        Row: {
          region_proyecto: string | null
          created_at: string
          descripcion: string
          estado: Database['public']['Enums']['estado_proyecto_enum']
          fecha_cierre: string | null
          fecha_publicacion: string | null
          generado_por_ia: boolean
          id_area_negocio: string | null
          id_empresario: string
          id_proyecto: string
          involucra_ia: boolean
          is_active: boolean
          modalidad: Database['public']['Enums']['modalidad_enum']
          moneda: Database['public']['Enums']['moneda_enum']
          motivo_cancelacion: string | null
          pais_iso_proyecto: string | null
          postulaciones_pendientes_revisar: number
          presupuesto_max: number | null
          presupuesto_min: number | null
          titulo: string
          updated_at: string
        }
        Insert: {
          region_proyecto?: string | null
          created_at?: string
          descripcion: string
          estado?: Database['public']['Enums']['estado_proyecto_enum']
          fecha_cierre?: string | null
          fecha_publicacion?: string | null
          generado_por_ia?: boolean
          id_area_negocio?: string | null
          id_empresario: string
          id_proyecto?: string
          involucra_ia?: boolean
          is_active?: boolean
          modalidad: Database['public']['Enums']['modalidad_enum']
          moneda?: Database['public']['Enums']['moneda_enum']
          motivo_cancelacion?: string | null
          pais_iso_proyecto?: string | null
          postulaciones_pendientes_revisar?: number
          presupuesto_max?: number | null
          presupuesto_min?: number | null
          titulo: string
          updated_at?: string
        }
        Update: {
          region_proyecto?: string | null
          created_at?: string
          descripcion?: string
          estado?: Database['public']['Enums']['estado_proyecto_enum']
          fecha_cierre?: string | null
          fecha_publicacion?: string | null
          generado_por_ia?: boolean
          id_area_negocio?: string | null
          id_empresario?: string
          id_proyecto?: string
          involucra_ia?: boolean
          is_active?: boolean
          modalidad?: Database['public']['Enums']['modalidad_enum']
          moneda?: Database['public']['Enums']['moneda_enum']
          motivo_cancelacion?: string | null
          pais_iso_proyecto?: string | null
          postulaciones_pendientes_revisar?: number
          presupuesto_max?: number | null
          presupuesto_min?: number | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'proyectos_id_area_negocio_fkey'
            columns: ['id_area_negocio']
            isOneToOne: false
            referencedRelation: 'areas_negocio'
            referencedColumns: ['id_area']
          },
          {
            foreignKeyName: 'proyectos_id_empresario_fkey'
            columns: ['id_empresario']
            isOneToOne: false
            referencedRelation: 'empresarios'
            referencedColumns: ['id_empresario']
          },
        ]
      }
      proyectos_portafolio: {
        Row: {
          consentimiento_at: string | null
          descripcion: string | null
          estado_consentimiento:
            | Database['public']['Enums']['estado_consent_portafolio_enum']
            | null
          fecha: string | null
          id_estudiante: string
          id_participacion: string | null
          id_portafolio: string
          imagen_url: string | null
          is_active: boolean
          origen: Database['public']['Enums']['origen_portafolio_enum']
          titulo: string
          url_demo: string | null
          url_repositorio: string | null
        }
        Insert: {
          consentimiento_at?: string | null
          descripcion?: string | null
          estado_consentimiento?:
            | Database['public']['Enums']['estado_consent_portafolio_enum']
            | null
          fecha?: string | null
          id_estudiante: string
          id_participacion?: string | null
          id_portafolio?: string
          imagen_url?: string | null
          is_active?: boolean
          origen: Database['public']['Enums']['origen_portafolio_enum']
          titulo: string
          url_demo?: string | null
          url_repositorio?: string | null
        }
        Update: {
          consentimiento_at?: string | null
          descripcion?: string | null
          estado_consentimiento?:
            | Database['public']['Enums']['estado_consent_portafolio_enum']
            | null
          fecha?: string | null
          id_estudiante?: string
          id_participacion?: string | null
          id_portafolio?: string
          imagen_url?: string | null
          is_active?: boolean
          origen?: Database['public']['Enums']['origen_portafolio_enum']
          titulo?: string
          url_demo?: string | null
          url_repositorio?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'proyectos_portafolio_id_estudiante_fkey'
            columns: ['id_estudiante']
            isOneToOne: false
            referencedRelation: 'estudiantes'
            referencedColumns: ['id_estudiante']
          },
          {
            foreignKeyName: 'proyectos_portafolio_id_participacion_fkey'
            columns: ['id_participacion']
            isOneToOne: false
            referencedRelation: 'participaciones'
            referencedColumns: ['id_participacion']
          },
        ]
      }
      reportes_moderacion: {
        Row: {
          descripcion: string
          estado_moderacion: Database['public']['Enums']['estado_moderacion_enum']
          id_entregable: string | null
          id_mensaje: string | null
          id_portafolio: string | null
          id_proyecto: string | null
          id_reportado: string | null
          id_reportante: string
          id_reporte: string
          reportado_at: string
          resolucion: string | null
          resuelto_at: string | null
          resuelto_por: string | null
          tipo_reporte: Database['public']['Enums']['tipo_reporte_enum']
        }
        Insert: {
          descripcion: string
          estado_moderacion?: Database['public']['Enums']['estado_moderacion_enum']
          id_entregable?: string | null
          id_mensaje?: string | null
          id_portafolio?: string | null
          id_proyecto?: string | null
          id_reportado?: string | null
          id_reportante: string
          id_reporte?: string
          reportado_at?: string
          resolucion?: string | null
          resuelto_at?: string | null
          resuelto_por?: string | null
          tipo_reporte: Database['public']['Enums']['tipo_reporte_enum']
        }
        Update: {
          descripcion?: string
          estado_moderacion?: Database['public']['Enums']['estado_moderacion_enum']
          id_entregable?: string | null
          id_mensaje?: string | null
          id_portafolio?: string | null
          id_proyecto?: string | null
          id_reportado?: string | null
          id_reportante?: string
          id_reporte?: string
          reportado_at?: string
          resolucion?: string | null
          resuelto_at?: string | null
          resuelto_por?: string | null
          tipo_reporte?: Database['public']['Enums']['tipo_reporte_enum']
        }
        Relationships: [
          {
            foreignKeyName: 'reportes_moderacion_id_entregable_fkey'
            columns: ['id_entregable']
            isOneToOne: false
            referencedRelation: 'entregables'
            referencedColumns: ['id_entregable']
          },
          {
            foreignKeyName: 'reportes_moderacion_id_mensaje_fkey'
            columns: ['id_mensaje']
            isOneToOne: false
            referencedRelation: 'mensajes'
            referencedColumns: ['id_mensaje']
          },
          {
            foreignKeyName: 'reportes_moderacion_id_portafolio_fkey'
            columns: ['id_portafolio']
            isOneToOne: false
            referencedRelation: 'proyectos_portafolio'
            referencedColumns: ['id_portafolio']
          },
          {
            foreignKeyName: 'reportes_moderacion_id_proyecto_fkey'
            columns: ['id_proyecto']
            isOneToOne: false
            referencedRelation: 'proyectos'
            referencedColumns: ['id_proyecto']
          },
          {
            foreignKeyName: 'reportes_moderacion_id_reportado_fkey'
            columns: ['id_reportado']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id_usuario']
          },
          {
            foreignKeyName: 'reportes_moderacion_id_reportante_fkey'
            columns: ['id_reportante']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id_usuario']
          },
          {
            foreignKeyName: 'reportes_moderacion_resuelto_por_fkey'
            columns: ['resuelto_por']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id_usuario']
          },
        ]
      }
      roles: {
        Row: {
          descripcion: string | null
          id_rol: number
          nombre_rol: string
        }
        Insert: {
          descripcion?: string | null
          id_rol?: never
          nombre_rol: string
        }
        Update: {
          descripcion?: string | null
          id_rol?: never
          nombre_rol?: string
        }
        Relationships: []
      }
      soporte_tickets: {
        Row: {
          created_at: string
          descripcion: string
          id_ticket: string
          id_usuario: string
        }
        Insert: {
          created_at?: string
          descripcion: string
          id_ticket?: string
          id_usuario: string
        }
        Update: {
          created_at?: string
          descripcion?: string
          id_ticket?: string
          id_usuario?: string
        }
        Relationships: [
          {
            foreignKeyName: 'soporte_tickets_id_usuario_fkey'
            columns: ['id_usuario']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id_usuario']
          },
        ]
      }
      strikes: {
        Row: {
          aplicado_at: string
          aplicado_por: string
          descripcion: string | null
          id_proyecto: string | null
          id_reporte: string | null
          id_strike: string
          id_usuario: string
          motivo: Database['public']['Enums']['motivo_strike_enum']
          motivo_revocacion: string | null
          revocado: boolean
          revocado_at: string | null
          revocado_por: string | null
        }
        Insert: {
          aplicado_at?: string
          aplicado_por: string
          descripcion?: string | null
          id_proyecto?: string | null
          id_reporte?: string | null
          id_strike?: string
          id_usuario: string
          motivo: Database['public']['Enums']['motivo_strike_enum']
          motivo_revocacion?: string | null
          revocado?: boolean
          revocado_at?: string | null
          revocado_por?: string | null
        }
        Update: {
          aplicado_at?: string
          aplicado_por?: string
          descripcion?: string | null
          id_proyecto?: string | null
          id_reporte?: string | null
          id_strike?: string
          id_usuario?: string
          motivo?: Database['public']['Enums']['motivo_strike_enum']
          motivo_revocacion?: string | null
          revocado?: boolean
          revocado_at?: string | null
          revocado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'fk_strikes_reporte'
            columns: ['id_reporte']
            isOneToOne: false
            referencedRelation: 'reportes_moderacion'
            referencedColumns: ['id_reporte']
          },
          {
            foreignKeyName: 'strikes_aplicado_por_fkey'
            columns: ['aplicado_por']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id_usuario']
          },
          {
            foreignKeyName: 'strikes_id_proyecto_fkey'
            columns: ['id_proyecto']
            isOneToOne: false
            referencedRelation: 'proyectos'
            referencedColumns: ['id_proyecto']
          },
          {
            foreignKeyName: 'strikes_id_usuario_fkey'
            columns: ['id_usuario']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id_usuario']
          },
          {
            foreignKeyName: 'strikes_revocado_por_fkey'
            columns: ['revocado_por']
            isOneToOne: false
            referencedRelation: 'usuarios'
            referencedColumns: ['id_usuario']
          },
        ]
      }
      tecnologias: {
        Row: {
          id_tecnologia: string
          is_active: boolean
          nombre: string
        }
        Insert: {
          id_tecnologia?: string
          is_active?: boolean
          nombre: string
        }
        Update: {
          id_tecnologia?: string
          is_active?: boolean
          nombre?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          apellido_1: string
          apellido_2: string | null
          bloqueado_hasta: string | null
          cantidad_strikes: number
          correo: string
          estado_cuenta: Database['public']['Enums']['estado_cuenta_enum']
          fecha_nacimiento: string | null
          fecha_registro: string
          foto_perfil: string | null
          id_rol: number | null
          id_usuario: string
          intentos_fallidos: number
          is_active: boolean
          nivel_admin: Database['public']['Enums']['nivel_admin_enum'] | null
          nombre: string
          suspendido_at: string | null
          tipos_notificacion_silenciados: Database['public']['Enums']['tipo_notificacion_enum'][]
          ultimo_login_at: string | null
        }
        Insert: {
          apellido_1: string
          apellido_2?: string | null
          bloqueado_hasta?: string | null
          cantidad_strikes?: number
          correo: string
          estado_cuenta?: Database['public']['Enums']['estado_cuenta_enum']
          fecha_nacimiento?: string | null
          fecha_registro?: string
          foto_perfil?: string | null
          id_rol?: number | null
          id_usuario: string
          intentos_fallidos?: number
          is_active?: boolean
          nivel_admin?: Database['public']['Enums']['nivel_admin_enum'] | null
          nombre: string
          suspendido_at?: string | null
          tipos_notificacion_silenciados?: Database['public']['Enums']['tipo_notificacion_enum'][]
          ultimo_login_at?: string | null
        }
        Update: {
          apellido_1?: string
          apellido_2?: string | null
          bloqueado_hasta?: string | null
          cantidad_strikes?: number
          correo?: string
          estado_cuenta?: Database['public']['Enums']['estado_cuenta_enum']
          fecha_nacimiento?: string | null
          fecha_registro?: string
          foto_perfil?: string | null
          id_rol?: number | null
          id_usuario?: string
          intentos_fallidos?: number
          is_active?: boolean
          nivel_admin?: Database['public']['Enums']['nivel_admin_enum'] | null
          nombre?: string
          suspendido_at?: string | null
          tipos_notificacion_silenciados?: Database['public']['Enums']['tipo_notificacion_enum'][]
          ultimo_login_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'usuarios_id_rol_fkey'
            columns: ['id_rol']
            isOneToOne: false
            referencedRelation: 'roles'
            referencedColumns: ['id_rol']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      actualizar_url_participacion: {
        Args: { p_id_participacion: string; p_url: string | null }
        Returns: undefined
      }
      adjudicar_participacion: {
        Args: { p_id_participacion: string; p_id_proyecto: string }
        Returns: undefined
      }
      assign_my_role: { Args: { p_role: string }; Returns: boolean }
      finalizar_proyecto_por_entregable: {
        Args: { p_comentario: string; p_id_entregable: string }
        Returns: undefined
      }
      get_my_account_status: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      get_participaciones_de_proyecto: {
        Args: { p_id_proyecto: string }
        // Nullabilidad corregida a mano: `supabase gen` marca todo el retorno de
        // funciones SETOF/TABLE como no-nulo, pero la v2 "sobre cerrado" devuelve
        // null en los campos sellados de las ofertas `enviada`, y varios campos de
        // datos son opcionales. Mantener al regenerar (ver migración 20260617180000).
        Returns: {
          calificacion_prototipo: number | null
          carta_postulacion: string | null
          comentario_prototipo: string | null
          documentacion_tecnica: string | null
          estado: Database['public']['Enums']['estado_participacion_enum']
          estudiante_apellido_1: string
          estudiante_apellido_2: string | null
          estudiante_nombre: string
          fecha_entrega_prototipo: string | null
          fecha_postulacion: string
          foto_perfil: string | null
          id_participacion: string
          planteamiento_solucion: string | null
          prototipo_enlaces: string[] | null
          reputacion: number | null
          tiene_documentacion: boolean
          tiene_prototipo: boolean
          tiene_repositorio: boolean
          titulo_fwd: Database['public']['Enums']['titulo_fwd_enum'] | null
          url_repositorio_proyecto: string | null
        }[]
      }
      mis_proyectos_como_empresario: { Args: never; Returns: string[] }
      mis_proyectos_como_estudiante: { Args: never; Returns: string[] }
      publicar_proyecto: {
        // Nullabilidad corregida a mano: `supabase gen` emite todos los args de
        // función como no-nulos (el catálogo de PG no guarda nulabilidad de
        // parámetros), pero la firma SQL acepta null en ubicación y área —los
        // proyectos `remoto` se publican sin país/ciudad y sin área asignada.
        Args: {
          p_categorias: string[]
          p_region: string | null
          p_conversacion: string
          p_descripcion: string
          p_generado_por_ia: boolean
          p_id_area: string | null
          p_involucra_ia: boolean
          p_modalidad: Database['public']['Enums']['modalidad_enum']
          p_moneda: Database['public']['Enums']['moneda_enum']
          p_pais_iso: string | null
          p_plazo_dias: number
          p_presupuesto_max: number
          p_presupuesto_min: number
          p_propuesta: Json
          p_tecnologias: string[]
          p_titulo: string
        }
        Returns: string
      }
      register_failed_login: { Args: { p_email: string }; Returns: undefined }
    }
    Enums: {
      alcance_enum: 'nacional' | 'internacional' | 'ambos'
      estado_consent_portafolio_enum: 'pendiente' | 'aprobado' | 'revocado'
      estado_conv_ia_enum: 'en_curso' | 'finalizada' | 'abandonada'
      estado_cuenta_enum:
        | 'pendiente'
        | 'activa'
        | 'suspendida'
        | 'suspendida_severa'
      estado_entregable_enum:
        | 'enviado'
        | 'en_revision'
        | 'aprobado'
        | 'con_cambios'
      estado_moderacion_enum:
        | 'pendiente'
        | 'en_revision'
        | 'resuelto_a_favor'
        | 'resuelto_en_contra'
        | 'descartado'
      estado_participacion_enum:
        | 'enviada'
        | 'en_revision'
        | 'contratada'
        | 'no_seleccionada'
        | 'retirada'
        | 'finalizada'
        | 'cancelada'
      estado_periodo_enum: 'vigente' | 'pausado' | 'finalizado' | 'cancelado'
      estado_proyecto_enum:
        | 'borrador'
        | 'abierto'
        | 'en_recepcion'
        | 'adjudicado'
        | 'en_desarrollo'
        | 'finalizado'
        | 'cancelado'
      estado_verif_enum: 'pendiente' | 'verificado' | 'rechazado'
      modalidad_enum: 'remoto' | 'hibrido' | 'presencial'
      moneda_enum: 'USD' | 'CRC'
      motivo_strike_enum:
        | 'no_entrego'
        | 'abandono_proyecto'
        | 'conducta_inapropiada'
        | 'calificacion_baja_repetida'
        | 'fraude'
        | 'ghosting'
        | 'otro'
      nivel_admin_enum: 'superadmin' | 'admin' | 'moderador'
      nivel_habilidad_enum: 'basico' | 'intermedio' | 'avanzado'
      nivel_tecnico_enum: 'no_tecnico' | 'basico' | 'intermedio' | 'avanzado'
      origen_portafolio_enum:
        | 'plataforma_no_contratada'
        | 'plataforma_contratada'
        | 'independiente'
      tipo_comentario_enum:
        | 'revision_solicitada'
        | 'aclaracion'
        | 'aprobacion'
        | 'rechazo'
      tipo_consentimiento_enum:
        | 'ia'
        | 'cotejo_fwd'
        | 'terminos_servicio'
        | 'politica_privacidad'
      tipo_dato_enum: 'integer' | 'decimal' | 'boolean' | 'string'
      tipo_empresario_enum: 'empresa_formal' | 'emprendedor'
      tipo_entregable_enum: 'parcial' | 'final'
      tipo_notificacion_enum:
        | 'mensaje_nuevo'
        | 'postulacion_recibida'
        | 'plazo_vence'
        | 'participacion_no_seleccionada'
        | 'participacion_contratada'
        | 'participacion_en_revision'
        | 'entregable_aprobado'
        | 'entregable_rechazado'
        | 'entregable_enviado'
        | 'evaluacion_recibida'
        | 'cuenta_verificada'
        | 'cuenta_suspendida'
        | 'strike_recibido'
        | 'proyecto_modificado'
      tipo_reporte_enum:
        | 'conducta_abusiva'
        | 'contenido_inapropiado'
        | 'spam'
        | 'fraude'
        | 'otro'
      titulo_fwd_enum: 'frontend' | 'backend' | 'fullstack'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alcance_enum: ['nacional', 'internacional', 'ambos'],
      estado_consent_portafolio_enum: ['pendiente', 'aprobado', 'revocado'],
      estado_conv_ia_enum: ['en_curso', 'finalizada', 'abandonada'],
      estado_cuenta_enum: [
        'pendiente',
        'activa',
        'suspendida',
        'suspendida_severa',
      ],
      estado_entregable_enum: [
        'enviado',
        'en_revision',
        'aprobado',
        'con_cambios',
      ],
      estado_moderacion_enum: [
        'pendiente',
        'en_revision',
        'resuelto_a_favor',
        'resuelto_en_contra',
        'descartado',
      ],
      estado_participacion_enum: [
        'enviada',
        'en_revision',
        'contratada',
        'no_seleccionada',
        'retirada',
        'finalizada',
        'cancelada',
      ],
      estado_periodo_enum: ['vigente', 'pausado', 'finalizado', 'cancelado'],
      estado_proyecto_enum: [
        'borrador',
        'abierto',
        'en_recepcion',
        'adjudicado',
        'en_desarrollo',
        'finalizado',
        'cancelado',
      ],
      estado_verif_enum: ['pendiente', 'verificado', 'rechazado'],
      modalidad_enum: ['remoto', 'hibrido', 'presencial'],
      moneda_enum: ['USD', 'CRC'],
      motivo_strike_enum: [
        'no_entrego',
        'abandono_proyecto',
        'conducta_inapropiada',
        'calificacion_baja_repetida',
        'fraude',
        'ghosting',
        'otro',
      ],
      nivel_admin_enum: ['superadmin', 'admin', 'moderador'],
      nivel_habilidad_enum: ['basico', 'intermedio', 'avanzado'],
      nivel_tecnico_enum: ['no_tecnico', 'basico', 'intermedio', 'avanzado'],
      origen_portafolio_enum: [
        'plataforma_no_contratada',
        'plataforma_contratada',
        'independiente',
      ],
      tipo_comentario_enum: [
        'revision_solicitada',
        'aclaracion',
        'aprobacion',
        'rechazo',
      ],
      tipo_consentimiento_enum: [
        'ia',
        'cotejo_fwd',
        'terminos_servicio',
        'politica_privacidad',
      ],
      tipo_dato_enum: ['integer', 'decimal', 'boolean', 'string'],
      tipo_empresario_enum: ['empresa_formal', 'emprendedor'],
      tipo_entregable_enum: ['parcial', 'final'],
      tipo_notificacion_enum: [
        'mensaje_nuevo',
        'postulacion_recibida',
        'plazo_vence',
        'participacion_no_seleccionada',
        'participacion_contratada',
        'participacion_en_revision',
        'entregable_aprobado',
        'entregable_rechazado',
        'entregable_enviado',
        'evaluacion_recibida',
        'cuenta_verificada',
        'cuenta_suspendida',
        'strike_recibido',
        'proyecto_modificado',
      ],
      tipo_reporte_enum: [
        'conducta_abusiva',
        'contenido_inapropiado',
        'spam',
        'fraude',
        'otro',
      ],
      titulo_fwd_enum: ['frontend', 'backend', 'fullstack'],
    },
  },
} as const
