# Logística 7 Cajas — v2

Sistema de reparto de aceite. La planilla de Google Sheets que ya arma el vendedor sigue siendo
la fuente de la verdad del recorrido del día — este sistema no la reemplaza, se conecta a ella
por copy-paste manual (sin ninguna cuenta ni API de Google).

## Cómo funciona, de punta a punta

1. El vendedor arma el recorrido del día en Sheets, como siempre (una pestaña por día).
2. Selecciona toda la pestaña (**Ctrl+A**), copia (**Ctrl+C**).
3. Entra al panel web, pega el contenido y presiona **"Actualizar recorrido"**. La web muestra
   una vista previa de lo que interpretó antes de confirmar.
4. Los choferes (Tito / Meme) abren la app del celular, se identifican, eligen a mano cuáles de
   todos los destinos del día son suyos, ordenan su recorrido y presionan "Empezar".
5. A medida que entregan, el panel web se actualiza en vivo (checklist por chofer: amarillo =
   en espera, verde = entregado, rojo = descartado).

Ver la memoria del proyecto (`project_logistica_7cajas.md` en la memoria de Claude) para la
especificación completa del flujo — quedó ahí registrada tras una sesión larga de diseño.

## Stack

- **Base de datos**: Supabase (PostgreSQL + Auth + Realtime)
- **Web**: React + Vite, hosteado en **Vercel**
- **Mobile**: Expo (React Native)
- **Cero dependencia de Google** (ni API ni OAuth) en ningún punto del sistema

---

## 1. Supabase

1. Crear un proyecto nuevo en [supabase.com](https://supabase.com) (gratis).
2. En el SQL Editor, correr `supabase/migrations/001_schema.sql`.
3. Anotar la `Project URL` y la `anon public key` (Settings → API).
4. En **Authentication → Users**, crear a mano las cuentas (mail + contraseña) de quienes van a
   entrar al panel web. No hay auto-registro: solo entra quien tiene una cuenta creada ahí.
5. En **Authentication → Settings**, deshabilitar "Allow new users to sign up" para que nadie
   más pueda crearse una cuenta propia.

## 2. Web (panel vendedor/admin)

```bash
cd web
cp .env.example .env
# Completar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Pantallas:
- `/` — Actualizar recorrido (pegar planilla, vista previa, confirmar)
- `/panel` — Checklist en vivo por chofer

Para publicarla, conectar el repo a [Vercel](https://vercel.com) apuntando a la carpeta `web/`
(Framework preset: Vite) y cargar las mismas variables de entorno ahí.

## 3. Mobile (app del chofer)

```bash
cd mobile
cp .env.example .env
# Completar EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY
npm install
npx expo install --fix   # alinea versiones al SDK de Expo disponible
npx expo start
```

Instalar en el celu con **Expo Go**, escaneando el QR. No requiere login — la identidad
(Tito/Meme) se elige en pantalla cada vez que se cierra el día.

---

## Notas técnicas

- El parser del pegado (`web/src/lib/parser.js`) es determinístico (no usa IA) — el orden de
  columnas está fijado a partir de la planilla real. Si algún día cambia el formato de la
  planilla, ese es el único archivo a tocar.
- "Actualizar recorrido" congela las paradas que un chofer ya empezó a repartir ese día — no las
  pisa aunque el vendedor vuelva a actualizar.
- Reordenar el recorrido en el celular es con arrastre real (mantener presionado y deslizar),
  vía `react-native-draggable-flatlist` + `react-native-gesture-handler` + `react-native-reanimated`.
  Si al instalar dan problemas de versión, correr `npx expo install --fix` para que Expo alinee
  todo al SDK que tengas.
- Sin RLS estricto por usuario: tanto la web (tras login) como la app mobile (sin login) leen y
  escriben con la misma clave `anon`. Es una simplificación consciente para el tamaño de este
  proyecto — revisar si el negocio crece mucho.
