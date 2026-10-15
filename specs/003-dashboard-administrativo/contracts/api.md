# Contrato de la API REST: Sprint 3 — Dashboard administrativo

Base: `http://localhost:3000/api`. Se mantienen las convenciones de los Sprints 1 y 2: JSON en
UTF-8, `Authorization: Bearer <token>`, respuestas `{ "data": ... }` y errores
`{ "error": { "code", "message", "details?" } }`. Montos como texto con 2 decimales; fechas
`AAAA-MM-DD`; fecha y hora en ISO 8601. Reglas de cálculo en [data-model.md](../data-model.md).

## Matriz de permisos

| Endpoint | Admin | Recep. | Entren. | Cliente |
|----------|:-----:|:------:|:-------:|:-------:|
| `GET /dashboard` | ✅ | ❌ | ❌ | ❌ |

Sin sesión → 401 `UNAUTHENTICATED`; otro rol → 403 `FORBIDDEN`.

## `GET /dashboard?periodo=mes&desde=&hasta=`

| Parámetro | Valores | Reglas |
|-----------|---------|--------|
| `periodo` | `hoy`, `7d`, `mes`, `rango` | Opcional; por omisión `mes` |
| `desde`, `hasta` | `AAAA-MM-DD` | Obligatorios solo con `periodo=rango`; `desde ≤ hasta`; máximo 366 días; se ignoran con los otros periodos |

200:

```json
{
  "data": {
    "periodo": { "tipo": "mes", "desde": "2026-10-01", "hasta": "2026-10-12" },
    "generado_en": "2026-10-12T18:30:05.120Z",
    "clientes": { "activos": 412, "inactivos": 37 },
    "membresias": { "vigentes": 365, "vencidas": 41, "por_vencer": 18 },
    "por_vencer": [
      { "id_cliente": 15, "nombre": "Luis", "apellido": "Pérez", "tipo": "Mensual", "fecha_fin": "2026-10-13" }
    ],
    "pagos": { "cantidad": 290, "ingresos": "128450.00" },
    "adeudo_total": "9350.00",
    "accesos": {
      "autorizados": 3120,
      "rechazados": 84,
      "rechazos_por_motivo": {
        "rostro_no_identificado": 40,
        "cliente_inactivo": 2,
        "sin_membresia_vigente": 11,
        "membresia_vencida": 25,
        "membresia_suspendida": 4,
        "membresia_cancelada": 2
      }
    },
    "rechazos_recientes": [
      {
        "id_acceso": 9002,
        "fecha_hora": "2026-10-12T16:20:01.120Z",
        "cliente": { "nombre": "Luis", "apellido": "Pérez" },
        "motivo": "membresia_vencida"
      }
    ],
    "tendencia": [
      { "fecha": "2026-10-01", "ingresos": "10450.00", "autorizados": 260, "rechazados": 7 }
    ]
  }
}
```

- Los tres valores de `membresias` cuentan **clientes**, no membresías (spec FR-003); la interfaz
  los muestra como "Clientes con membresía vigente", "Clientes con membresía vencida" y "Clientes
  con membresía por vencer".
- `por_vencer` tiene como máximo 20 elementos; `rechazos_recientes`, como máximo 10.
- `tendencia` tiene exactamente un elemento por día del periodo, en orden ascendente.
- `cliente` es `null` en los rechazos por rostro no identificado.
- La respuesta nunca contiene datos de contacto, datos faciales, `similitud` ni montos por cliente.

Errores: 400 `VALIDATION_ERROR` si `periodo` no es válido, si faltan `desde`/`hasta` con
`periodo=rango`, si el rango está invertido o supera 366 días.

## Rutas del frontend

| Ruta | Pantalla | Roles |
|------|----------|-------|
| `/` | Dashboard para el administrador; inicio actual para los demás roles | Todos |
| `/dashboard` | Dashboard | Administrador |
