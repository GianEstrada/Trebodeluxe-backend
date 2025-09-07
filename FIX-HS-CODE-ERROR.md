# FIX: Error de Código Armonizado HS en Envíos Internacionales

## 🔍 PROBLEMA IDENTIFICADO

**Error:** `6109.10.00: No existe el código harmonizado del producto.`

### 📋 Análisis del Error:
- SkyDropX estaba auto-clasificando productos con código HS `6109.10.00`
- Este código específico ya no es válido en el sistema armonizado actual
- El error se producía al solicitar cotizaciones internacionales
- El código se refiere a "T-shirts, singlets and other vests of cotton, knitted or crocheted"

## ✅ SOLUCIÓN IMPLEMENTADA

### 🎯 Estrategia: No Enviar Código HS Específico

En lugar de enviar códigos HS específicos que pueden volverse obsoletos, ahora:

1. **Usamos descripción genérica**: `"Cotton clothing items"`
2. **Valor declarado real**: `Math.ceil(cartData.totalValue)` en lugar de valor fijo
3. **Dejamos que SkyDropX clasifique automáticamente** basándose en la descripción

### 📝 Cambios Realizados:

#### Envíos Internacionales:
```javascript
parcels: [
  {
    length: Math.ceil(cartData.dimensions.length),
    width: Math.ceil(cartData.dimensions.width),
    height: Math.ceil(cartData.dimensions.height),
    weight: Math.ceil(cartData.totalWeight),
    declared_value: Math.ceil(cartData.totalValue), // ✅ Valor real
    description: "Cotton clothing items" // ✅ Descripción genérica
  }
]
```

#### Envíos Nacionales:
```javascript
parcels: [
  {
    length: Math.ceil(cartData.dimensions.length),
    width: Math.ceil(cartData.dimensions.width),
    height: Math.ceil(cartData.dimensions.height),
    weight: Math.ceil(cartData.totalWeight),
    declared_value: Math.ceil(cartData.totalValue), // ✅ Valor real
    description: "Cotton clothing items" // ✅ Consistencia
  }
]
```

## 🎯 BENEFICIOS DE ESTA SOLUCIÓN

### ✅ **Ventajas:**
1. **Evita errores de códigos HS obsoletos**
2. **Simplifica el mantenimiento** - no necesitamos actualizar códigos HS
3. **Valor declarado real** - mejor para cálculos de impuestos y seguros
4. **Flexibilidad** - SkyDropX puede clasificar según sus propias reglas actuales
5. **Consistencia** - mismo payload para nacional e internacional

### 🚀 **Alternativas Consideradas:**

#### Opción 1: ✅ **Sin código HS (Implementada)**
- Dejar que SkyDropX clasifique automáticamente
- Usar descripción genérica
- Menos mantenimiento

#### Opción 2: ❌ **Código HS genérico**
```javascript
hs_code: "6109.90.00" // Más genérico pero aún puede volverse obsoleto
```

#### Opción 3: ❌ **Mapeo dinámico de códigos HS**
```javascript
// Requeriría mantener una tabla de códigos HS por categoría
// Más complejo y propenso a errores
```

## 📊 RESULTADO ESPERADO

### Antes del Fix:
```
❌ Error 422: 6109.10.00: No existe el código harmonizado del producto.
```

### Después del Fix:
```
✅ Cotización exitosa con clasificación automática de SkyDropX
✅ Valor declarado real del carrito
✅ Descripción genérica que no falla
```

## 🔧 TESTING

Para probar el fix:

1. **Test Local:**
```bash
cd Trebodeluxe-backend
node test-hybrid-routes-local.js
```

2. **Test de Producción:**
```bash
node test-hybrid-routes.js
```

3. **Test específico CP 61422:**
```bash
# Probar con el CP que falló originalmente
# Debería ahora funcionar sin error HS
```

## 📝 NOTAS TÉCNICAS

### 🔍 **Por qué falló el código 6109.10.00:**
- Los códigos del Sistema Armonizado (HS) se actualizan periódicamente
- La versión actual puede haber reemplazado o modificado este código específico
- SkyDropX usa una base de datos actualizada de códigos HS válidos

### 💡 **Mejores Prácticas:**
1. **Usar descripciones en lugar de códigos HS específicos** cuando sea posible
2. **Dejar que el sistema de envío clasifique automáticamente**
3. **Usar valores declarados reales para mayor precisión**
4. **Mantener descripciones genéricas y estables**

---

**Archivo:** `shipping-quote.service.js`  
**Líneas modificadas:** 907-915 (internacional), 1052-1060 (nacional)  
**Fecha:** 7 de septiembre de 2025  
**Resultado:** Fix del error HS code para envíos internacionales
