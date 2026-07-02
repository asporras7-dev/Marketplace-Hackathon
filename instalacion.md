# instalacion.md — Cómo instalar y cómo hacer commits

Guía para el equipo. Para las reglas del proyecto ver `reglas.md`; la fuente de verdad es el brief oficial `Marketplace_FWD_Brief.pdf`.

---

## 1. Requisitos

- **Node.js 20 LTS o superior** (§4.8 del brief).
- **npm** como package manager (no usar yarn ni pnpm).
- Cuenta de Supabase del equipo para las variables de entorno.
- **DNS configurado en 8.8.8.8** (ver sección 1.1).

Verificá tu versión:

```bash
node -v
npm -v
```

---

## 1.1. Configuración de DNS (obligatorio antes de desarrollar)

Supabase usa el TLD `.co` para sus URLs de proyecto. Algunos ISPs y routers en Latinoamérica no resuelven este dominio correctamente, lo que causa `DNS_PROBE_FINISHED_NXDOMAIN` al intentar autenticarse con Google o Magic Link.

**Este paso es obligatorio para todos los miembros del equipo. Sin esto, el login no funciona en local.**

En producción (Vercel) no hay problema — Vercel usa sus propios servidores DNS. El issue es exclusivo del entorno de desarrollo local.

### Pasos en Windows

1. `Win + R` → escribí `ncpa.cpl` → Enter
2. Clic derecho en tu adaptador activo (Wi-Fi o Ethernet) → **Propiedades**
3. Seleccioná **"Protocolo de Internet versión 4 (TCP/IPv4)"** → **Propiedades**
4. Marcá **"Usar las siguientes direcciones de servidor DNS"**
5. DNS preferido: `8.8.8.8` | DNS alternativo: `8.8.4.4`
6. Aceptar → Aceptar

### Pasos en macOS

1. Preferencias del Sistema → Red → seleccioná tu conexión activa → Avanzado
2. Pestaña **DNS** → agregá `8.8.8.8` y `8.8.4.4`
3. OK → Aplicar

### Verificar que funciona

```bash
nslookup mgowuyflhiavquztxpqh.supabase.co
```

Debe devolver una dirección IP (ej. `172.64.149.246`). Si dice `NXDOMAIN`, el DNS todavía no está correcto.

---

---

## 2. Después de clonar el repositorio

```bash
git clone https://github.com/ErrolFallas/Marketplace_FWD.git
cd Marketplace_FWD

npm ci

cp .env.local.example .env.local
```

Luego llená `.env.local` con las llaves reales (las comparte el equipo, **nunca se commitean**):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` → públicas, van al cliente.
- `SUPABASE_SERVICE_ROLE_KEY` → **solo servidor**, jamás exponer al cliente (§13 FAQ).
- `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` → según la feature en la que trabajés.

Arrancar en local:

```bash
npm run dev
```

---

## 3. `npm ci` vs `npm install` — cuándo usar cada uno

La diferencia es **por situación**, no por persona.

| Situación | Comando |
|---|---|
| Acabás de clonar el repo | `npm ci` |
| Hiciste `pull` y cambió `package-lock.json` | `npm ci` |
| Vas a **agregar o quitar** una dependencia a propósito | `npm install <paquete>` (o `npm uninstall <paquete>`) |

- **`npm ci`** borra `node_modules` y lo reconstruye **exacto** desde `package-lock.json`. Es reproducible y rápido. No modifica el lock.
- **`npm install`** puede recalcular y modificar el lock. Solo se usa cuando cambiás dependencias de forma intencional; después se commitea el `package-lock.json` actualizado.

> Regla práctica: si no estás cambiando una dependencia a propósito, usá `npm ci`.

Si agregás una dependencia, recordá que tiene que estar justificada respecto al brief (§8.2) y documentada (ver `reglas.md` §1).

### 3.1. Dependencias agregadas fuera del set inicial (justificadas)

Estas dependencias no vienen en la lista canónica del brief (§8.2), se agregaron de forma justificada y documentada (requisito de `reglas.md` §1). Son **necesarias para todo el equipo**: después de hacer `pull`, corré `npm ci` para instalarlas (el `package-lock.json` ya las trae).

| Paquete | Tipo | Por qué |
|---|---|---|
| `server-only` | runtime | Marca módulos que solo pueden correr en el servidor (`lib/supabase/admin.ts`, `lib/supabase/server.ts`, `lib/auth/queries.ts`, `lib/auth/guards.ts`). Si alguien los importa por error desde un Componente de Cliente, el **build falla** en vez de filtrar la `SUPABASE_SERVICE_ROLE_KEY` o romper en runtime. Hace cumplir `reglas.md` §6 ("service key solo en servidor") a nivel de compilación. Es el patrón oficial de Next.js, pesa ~3 KB y no tiene costo en runtime. |

---

## 4. Cómo hacer commits

El repo tiene **Husky + commitlint + lint-staged** configurados. Hay dos hooks automáticos:

- **pre-commit**: corre `lint-staged` (Prettier `--write` + ESLint `--fix`) sobre los `.ts`/`.tsx` que estés commiteando. Si ESLint encuentra un error que no se autocorrige, el commit se cancela.
- **commit-msg**: corre `commitlint`. Si el mensaje no sigue Conventional Commits, el commit se rechaza.

### Formato del mensaje (Conventional Commits)

```
tipo(scope opcional): descripción en minúscula

cuerpo opcional explicando el porqué

footer opcional
```

Tipos válidos:

| Tipo | Cuándo |
|---|---|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de bug |
| `docs` | Solo documentación |
| `style` | Formato, sin cambio de lógica |
| `refactor` | Reescritura sin cambiar comportamiento |
| `test` | Agregar o ajustar tests |
| `chore` | Tooling, configuración, dependencias |
| `build` | Sistema de build o dependencias |
| `ci` | Configuración de CI |
| `perf` | Mejora de rendimiento |

Ejemplos:

```bash
git commit -m "feat: listado de proyectos filtrable por stack"
git commit -m "fix: validacion de cover letter vacia en postulacion"
git commit -m "chore: actualizar dependencias de testing"
```

### Reglas del equipo para commits

- **Cada miembro tiene que commitear.** Si solo una persona aparece en el historial, se penaliza al equipo (§12.1 del brief).
- Trabajá en tu propia rama y abrí Pull Request hacia la rama de integración; no se empuja directo sin revisar.
- Un commit, un cambio coherente. No mezclar features distintas en el mismo commit.
- No commitear `.env.local`, llaves, ni `node_modules` (ya están en `.gitignore`).

---

## 5. Al traer cambios del equipo

```bash
git pull
```

Si el `pull` modificó `package-lock.json`, corré:

```bash
npm ci
```

Así tu árbol de dependencias queda idéntico al del resto del equipo.

---

## 6. Antes de abrir un Pull Request — checklist

```bash
npm run typecheck   # cero errores
npm run lint        # cero errores
npm run test        # tests pasan
```

Más el checklist de Definition of Done en `reglas.md` §11 (i18n sin hardcoded, accesibilidad básica, mobile a 375 px).
