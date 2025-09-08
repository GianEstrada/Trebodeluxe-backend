# 🚀 GUÍA: Configuración de Variables de Entorno en Render

## Para el BACKEND (trebodeluxe-backend):

1. Ve a: https://dashboard.render.com
2. Busca tu servicio: `trebodeluxe-backend`
3. Ve a la pestaña: **Environment**
4. Agrega/actualiza estas variables:

### Variables de Stripe para SANDBOX/TEST:
```
STRIPE_PUBLISHABLE_KEY=pk_test_[tu_clave_publica_de_test]
STRIPE_SECRET_KEY=sk_test_[tu_clave_secreta_de_test]
STRIPE_WEBHOOK_SECRET=whsec_test_[tu_webhook_secret_de_test]
```

### Variables de Stripe para PRODUCCIÓN:
```
STRIPE_PUBLISHABLE_KEY=pk_live_51RcYc8GMXUffSj5q4KrfsiSvlgNGRGMH2RYiRikhHOVLIL3QuDHRyFPZkV5ik8vjZLR5602IQocunLC344Llrks100w6E4BNaj
STRIPE_SECRET_KEY=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
STRIPE_WEBHOOK_SECRET=whsec_[tu_webhook_secret_de_produccion]
```

## Para el FRONTEND (trebodeluxe-front):

1. Ve a: https://dashboard.render.com
2. Busca tu servicio: `trebodeluxe-front`
3. Ve a la pestaña: **Environment**
4. Agrega/actualiza esta variable:

### Para SANDBOX/TEST:
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_[tu_clave_publica_de_test]
```

### Para PRODUCCIÓN:
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51RcYc8GMXUffSj5q4KrfsiSvlgNGRGMH2RYiRikhHOVLIL3QuDHRyFPZkV5ik8vjZLR5602IQocunLC344Llrks100w6E4BNaj
```

## 🔄 Después de configurar:

1. **Manual Deploy** en ambos servicios
2. Espera a que se reinicien (2-3 minutos)
3. Prueba el sistema de pagos

## 🔍 Para obtener las claves de TEST de Stripe:

1. Ve a: https://dashboard.stripe.com
2. Cambia a **"View test data"** (interruptor en la barra lateral)
3. Ve a: **Developers > API Keys**
4. Copia las claves que empiecen con `pk_test_` y `sk_test_`

## ✅ Ventajas de esta configuración:

- ✅ Claves seguras (no en el código)
- ✅ Fácil cambio entre test/producción
- ✅ Sin riesgo de subir claves al repositorio
- ✅ Variables específicas por entorno

## 🚨 IMPORTANTE:

- NUNCA subas las claves reales al repositorio
- Usa SIEMPRE las claves de test para desarrollo
- Solo cambia a producción cuando todo funcione perfectamente
