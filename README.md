# UAX Journey Lab

**Construyendo la experiencia del cliente.** Aplicación web colaborativa para construir un Customer Journey en tiempo real durante la clase de *Digital Business Intelligence* (UAX). El profesor dirige el ejercicio en paralelo a la presentación (caso Decathlon, diapositivas 20–32) y los equipos de estudiantes trabajan desde el móvil, la tablet o el portátil, sin registrarse.

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, componentes estilo shadcn/ui, Lucide.
- **Backend:** Supabase (PostgreSQL + Auth + Realtime) con Row Level Security.
- **Despliegue:** Railway (incluye `railway.json`) o Vercel. Sin servicios de IA ni APIs de pago.

---

## Puesta en marcha (≈ 15 minutos)

### 1. Supabase (gratuito)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. **SQL Editor → New query**: pega [`supabase/setup.sql`](supabase/setup.sql) y pulsa **Run** (tablas, funciones, RLS y Realtime; se puede ejecutar varias veces).
3. **Authentication → Sign In / Providers**: activa **Allow anonymous sign-ins** (alumnos sin cuenta).
4. Autoriza a cada profesor (genera su código de invitación de un solo uso):
   ```sql
   insert into public.teacher_allowlist (email) values ('profesor@uax.es') returning invite_code;
   ```
5. **Project Settings → API**: copia la *Project URL* y la clave pública (*anon* o *publishable*). No hace falta la clave secreta.

### 2. Railway

1. Sube este repositorio a GitHub.
2. En [railway.com](https://railway.com): **New Project → Deploy from GitHub repo**. `railway.json` ya indica cómo compilar y arrancar.
3. **Variables**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `NEXT_PUBLIC_SITE_URL` (la URL pública de Railway). Se leen al compilar: si las cambias, pulsa **Redeploy**.
4. **Settings → Networking → Generate Domain**.
5. Abre `https://TU-DOMINIO/profesor` → **Crear cuenta** con tu correo autorizado, una contraseña y el código de invitación.

### Vercel (alternativa)

Importa el repositorio en [vercel.com/new](https://vercel.com/new) con las mismas variables.

### Desarrollo local

```bash
cp .env.example .env.local   # rellena las variables
npm install
npm run dev                  # http://localhost:3000
npm test                     # pruebas de dominio, renderizado y permisos (no necesitan Supabase)
```

---

## Cómo se usa en clase

1. **Profesor** → `/profesor` → *Crear sesión* (viene precargado el caso Decathlon, 4 equipos, máximo 5 por equipo).
2. Pestaña **Acceso / QR** o **PROYECTAR RESULTADOS → Acceso**: QR a pantalla completa, código y enlace (`/unirse/CÓDIGO`).
3. Los **estudiantes** escanean, escriben su alias y eligen equipo (o asignación automática equilibrada). El profesor ve en directo cómo se reparten y puede moverlos.
4. **INICIAR CLASE** y, al terminar cada diapositiva, **SIGUIENTE ACTIVIDAD →**. Las pantallas de los alumnos cambian solas. El panel muestra la **diapositiva asociada** y un **temporizador** (pausa, +1 min, reinicio; bloqueo automático opcional).
5. En la pestaña **Equipos** cada tarjeta se actualiza en directo (participantes conectados, actividad, progreso, emociones, fricciones, mejoras) → **VER RESPUESTAS** abre el mapa del equipo.
6. **PROYECTAR RESULTADOS** abre una pantalla limpia: Customer Journey de un equipo, comparativa, mapa emocional, fricciones y propuestas más votadas (← → cambia de vista, 1–9 cambia de equipo, F pantalla completa).
7. **Exportar**: PDF, CSV y JSON de la sesión completa o de cada equipo. Los alumnos también pueden descargar el de su equipo desde *Mapa del equipo*.

### Itinerario precargado (120 min, editable)

| # | Actividad | Min | Diapositiva |
|---|---|---|---|
| 1 | Acceso y organización de equipos | 10 | 20 |
| 2 | Entender la necesidad | 10 | 21 |
| 3 | Descubrimiento | 13 | 22–24 |
| 4 | Consideración | 13 | 23 |
| 5 | Compra (debate A/B) | 13 | 25 |
| 6 | Retención y experiencia | 13 | 23 |
| 7 | Recomendación | 13 | 23 |
| 8 | Revisión del mapa emocional | 11 | 27 |
| 9 | Identificación de fricciones (≥ 3) | 11 | 26 |
| 10 | Propuestas de mejora (≥ 3, con votos) | 5 | 28 |
| 11 | Medición y KPIs | 4 | 29 |
| 12 | Presentación y conclusiones (pitch) | 4 | 30–32 |

Textos, preguntas, ejemplos, minutos, diapositiva y campos de respuesta se editan desde **Actividades → ✏️** (sin tocar código). La plantilla base está en [`src/lib/config/activities.ts`](src/lib/config/activities.ts). No incluye buyer personas ni clustering, como se pidió.

---

## Funcionalidades implementadas

**Estudiantes**
- Acceso por enlace, QR o código; sin cuenta (sesión anónima de Supabase) y solo con alias.
- Elección de equipo con plazas visibles o asignación automática equilibrada; el límite por equipo se garantiza en la base de datos.
- Al recargar o volver a abrir el enlace se recupera la sesión y el equipo.
- Actividad actual con número, objetivo, pregunta destacada, instrucciones, ejemplo orientativo y temporizador; navegación por las actividades ya desbloqueadas (solo lectura si están cerradas).
- Aportaciones individuales como tarjetas con alias (nadie sobrescribe a nadie); el equipo marca con ⭐ las que van al mapa final. Borradores guardados en el dispositivo.
- Puntos de contacto digitales y físicos (catálogo + canales propios).
- Selector de emociones grande y accesible (5 niveles, etiqueta textual, teclado), porqué obligatorio, distribución de votos y emoción acordada por el equipo.
- Gráfico emocional en directo (línea continua = acordado; punteada = media provisional).
- Fricciones (≥ 3, gravedad 🟢🟠🔴, consecuencias), mejoras (≥ 3, vinculadas a fricciones, votación y orden por votos), KPIs (catálogo + personalizados, fuente y decisión; avisando de que son propuestas, no datos reales) y pitch final con aviso si otro compañero guarda a la vez.
- Mapa final con 5 columnas × 7 filas y curva emocional; en móvil, fase a fase; detalle por fase.
- «Hemos terminado esta actividad» con animación, mensaje de espera, barra de progreso, compañeros conectados, estado de guardado (Guardando… / Guardado / Sin conexión / Cambios pendientes) y aviso de reconexión.
- Comparativa con otros equipos solo cuando el profesor la activa.

**Profesor**
- Login seguro (Supabase Auth, cookies httpOnly); alta solo para correos autorizados en `teacher_allowlist` y con código de invitación de un solo uso.
- Crear, editar y eliminar sesiones; empresa, caso, instrucciones, equipos y máximo por equipo configurables.
- Código, enlace y QR; estudiantes conectados en directo; mover o quitar estudiantes; añadir, renombrar y borrar equipos.
- INICIAR CLASE, SIGUIENTE ACTIVIDAD →, Anterior, ir a cualquier actividad, bloquear / desbloquear / finalizar, finalizar y reabrir la sesión.
- Temporizador compartido y bloqueo automático opcional al acabar el tiempo.
- Panel de equipos en tiempo real y respuestas completas por equipo.
- Modo proyección sin controles administrativos y comparativa didáctica sin rankings entre equipos.
- Exportación PDF (vista de impresión → «Guardar como PDF», con equipo, empresa, escenario y fecha), CSV (compatible con Excel), JSON y modo impresión.
- Enlace público de solo lectura que el profesor activa o desactiva (sin alias de alumnos).
- Sesión de demostración con datos ficticios claramente marcados como **DEMO**.

## Seguridad y privacidad

- Row Level Security en todas las tablas ([`supabase/migrations`](supabase/migrations)):
  - un alumno solo lee y escribe su equipo, solo con su propio participante y solo cuando la actividad está activa;
  - el `session_id` se deriva del equipo en la base de datos (no se puede falsear);
  - el código público solo permite consultar datos mínimos y unirse (`get_session_by_code`, `join_session`);
  - el profesor solo ve y gestiona sus sesiones; otro profesor no ve nada ajeno.
- La app no necesita la clave `service_role`: el alta de profesores y el enlace de solo lectura se resuelven con funciones de la base de datos que solo exponen lo imprescindible.
- No se guardan datos personales: solo el alias. Las exportaciones no incluyen identificadores internos.

## Pruebas

`npm test` ejecuta 36 pruebas sin necesidad de Supabase:

- **Permisos** (`tests/db/rls.test.ts`): ejecuta las migraciones reales en PostgreSQL embebido (PGlite) y comprueba aislamiento entre equipos, suplantación, límite de plazas, asignación equilibrada, bloqueo de actividades, permisos de profesor, votos emocionales y comparación.
- **Instalación** (`tests/db/setup-sql.test.ts`): `setup.sql` es idempotente.
- **Dominio** (`tests/domain.test.ts`): progreso, emociones, mapa, ranking de mejoras, CSV/JSON, validación, mensajes y temporizador.
- **Renderizado** (`tests/render.test.tsx`): mapa, documento, comparativa, tarjeta del profesor y todas las actividades.

También: `npm run typecheck`, `npm run lint`, `npm run build`.

## Estructura

```
src/
  app/                    rutas: /, /unirse, /lab/[code], /profesor, /proyectar/[id], /imprimir/[id], /ver/[token]
  components/
    student/              SessionJoin, StudentDashboard, ActivityWorkspace, ContributionField, WorkPanels…
    teacher/              TeacherDashboard, SessionControls, TeamProgressCard, TeacherPanels…
    journey/              JourneyTimeline, JourneyMap (+PhaseDetail), EmotionSelector, EmotionJourneyChart,
                          TouchpointEditor, cards (Friction/Improvement/KPI), JourneyExport, PrintView…
    presentation/         PresentationMode, TeamComparison
    ui/                   primitivas (Button, Card, Modal, Tabs…) y elementos de marca
  hooks/                  use-live-bundle (Realtime + reconexión), use-presence, use-timer, use-draft
  lib/
    config/               fases, catálogos (emociones, canales, KPIs) y actividades
    domain/               lógica pura: mapa, emociones, progreso, exportación, validación, errores
    data/                 lectura, escrituras (alumno / profesor), estado de guardado, demo
    supabase/             clientes navegador/servidor y guard de profesor
supabase/
  migrations/             esquema + seguridad
  setup.sql               ambas migraciones en un solo archivo (npm run db:bundle)
tests/
```

## Notas y límites conocidos

- El PDF se genera con el diálogo de impresión del navegador («Guardar como PDF», horizontal): no depende de servicios externos y mantiene la calidad vectorial.
- El bloqueo automático por tiempo lo ejecuta el panel del profesor: si está activado, mantén el panel abierto durante la clase (además, la interfaz del alumno deshabilita la edición al acabar el tiempo).
- La aplicación no controla PowerPoint: solo muestra la diapositiva recomendada para cada actividad.
- Todo lo que depende de Supabase (tiempo real, login, persistencia) requiere configurar el proyecto según los pasos anteriores; sin esas variables la app muestra un aviso y no simula datos.
