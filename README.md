# condorsky-admin

Panel administrativo del proyecto **Condor Sky**.
Stack: React + Vite + Tailwind + Firebase.

## Los 8 módulos

| Módulo | Ruta | Colecciones |
|---|---|---|
| Resumen | `/` | `bookings` |
| Reservas | `/reservas` | `bookings`, `services`, `additionals` |
| Calendario | `/calendario` | `settings/schedule`, `blocked/*`, `availability/*` |
| Servicios | `/servicios` | `services` |
| Adicionales | `/adicionales` | `additionals` |
| Testimonios | `/testimonios` | `testimonials` |
| Galería | `/galeria` | `gallery` + Firebase Storage |
| Ajustes | `/ajustes` | `settings/{general,bold,legal,faq,…}` |

- **Acceso:** login con Firebase Auth. Solo entran usuarios con el rol
  `admin` (custom claim).
- **Tiempo real:** los hooks `useCollection` / `useDoc` usan `onSnapshot`;
  todo cambio se refleja al instante.
- **Errores:** `useMutation` envuelve cada escritura → toast si Firestore falla.

## Cómo conecta con el sitio

Panel y sitio comparten las mismas colecciones Firestore — sin API
intermedia. El sitio lee contenido (`services`, `testimonials`, `gallery`,
`settings/*`) y escribe `bookings`; el panel lee y escribe todo.

`condorsky-web` es dueño de la config del proyecto Firebase (reglas,
índices, Cloud Functions). Este panel es un frontend aparte.

## Estructura

```
src/
├── App.jsx              Router + gate de auth y rol admin
├── lib/
│   ├── firebase.js      Cliente (→ caidalibre-prod)
│   ├── constantes.js    Estados, sedes, datos semilla
│   └── upload.js        Subida de imágenes a Storage
├── hooks/useFirestore.js  useCollection · useDoc · useMutation
├── components/
│   ├── Login.jsx · Layout.jsx · Toast.jsx
└── pages/
    └── Dashboard · Reservas · Calendario · Servicios
       · Adicionales · Testimonios · Galeria · Ajustes
```

## Puesta en marcha

1. `npm install`
2. Copiar `.env.example` a `.env` y llenar la config de Firebase.
3. `npm run dev`.

El catálogo arranca vacío: Servicios y Adicionales traen un botón para
**sembrar** el catálogo inicial de Condor Sky.

## Primer administrador

El gate exige el custom claim `admin`. El **primer** admin se asigna una
sola vez de forma manual (Admin SDK o consola). Después, ese admin habilita
al resto con la Cloud Function `setAdminClaim`.

## Deploy

```
firebase use caidalibre-prod
firebase hosting:sites:create condorsky-admin   # una sola vez
npm run build && firebase deploy --only hosting:admin
```

## Pendiente

Alinear el repo `condorsky-web` (sitio + Cloud Functions) al modelo
unificado v2. Hasta entonces, el panel funciona
contra el modelo nuevo y el sitio aún escribe el modelo viejo.
