-- Migración para crear sistema de Mensajes Directos (Módulo Talento)

create table chats_directos (
  id_chat         uuid       primary key default gen_random_uuid(),
  id_empresario   uuid       not null references empresarios(id_empresario),
  id_estudiante   uuid       not null references estudiantes(id_estudiante),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id_empresario, id_estudiante)
);

create table mensajes_directos (
  id_mensaje      uuid       primary key default gen_random_uuid(),
  id_chat         uuid       not null references chats_directos(id_chat),
  id_remitente    uuid       not null references usuarios(id_usuario),
  contenido       text       not null check(length(trim(contenido)) > 0),
  leido           boolean    not null default false,
  fecha_envio     timestamptz not null default now()
);

-- Habilitar RLS (acceso bloqueado por defecto)
alter table chats_directos enable row level security;
alter table mensajes_directos enable row level security;

-- Al igual que la tabla 'mensajes' original, NO agregaremos políticas de RLS,
-- ya que la lectura y escritura se realizará estrictamente desde las Server Actions
-- usando el cliente Admin de Supabase, validando las condiciones a nivel de código.

-- Índices para mejorar rendimiento
create index idx_chats_directos_empresario on chats_directos(id_empresario);
create index idx_chats_directos_estudiante on chats_directos(id_estudiante);
create index idx_mensajes_directos_chat on mensajes_directos(id_chat, fecha_envio desc);
