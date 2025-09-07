# 🚛 GUÍA DE IMPLEMENTACIÓN: APIs DE ENVÍOS LOCALES

## 📋 Resumen de APIs Disponibles

### ✅ **APIs Verificadas y Funcionales:**

1. **🟢 99 Minutos** - Ya integrado en SkyDropX
2. **🟡 Uber Direct** - API robusta para envíos express
3. **🔵 Rappi Business** - Requiere proceso empresarial
4. **🟠 DiDi Delivery** - API en desarrollo
5. **🟣 Mensajeros Urbanos** - API mexicana especializada

---

## 🚀 **IMPLEMENTACIÓN RECOMENDADA POR PRIORIDAD:**

### **FASE 1: Uber Direct (Más fácil de implementar)**

#### Registro:
1. Ve a: https://developer.uber.com/
2. Crea cuenta de desarrollador
3. Solicita acceso a "Uber Direct API"
4. Obtén tus credenciales

#### Implementación:
```javascript
// Variables de entorno necesarias:
UBER_DIRECT_API_KEY=tu_api_key
UBER_DIRECT_CUSTOMER_ID=tu_customer_id

// Endpoint principal:
POST https://api.uber.com/v1/customers/{customer_id}/deliveries/quote
```

#### Ventajas:
- ✅ API bien documentada
- ✅ Cobertura en Monterrey
- ✅ Tracking en tiempo real
- ✅ Entrega en 1-3 horas

---

### **FASE 2: 99 Minutos API Directa**

#### Registro:
1. Ve a: https://99minutos.com/empresas
2. Contacta al equipo comercial
3. Solicita API empresarial

#### Implementación:
```javascript
// Variables de entorno:
NINETY_NINE_API_KEY=tu_api_key
NINETY_NINE_CUSTOMER_ID=tu_customer_id

// Endpoint:
POST https://delivery-api.99minutos.com/v2/quote
```

#### Ventajas:
- ✅ Ya tienes acceso vía SkyDropX
- ✅ Especialista en México
- ✅ Precios competitivos
- ✅ Cobertura nacional

---

### **FASE 3: Rappi Business**

#### Registro:
1. Ve a: https://business.rappi.com.mx
2. Llena formulario empresarial
3. Proceso de onboarding (2-4 semanas)

#### Implementación:
```javascript
// Variables de entorno:
RAPPI_API_KEY=tu_api_key
RAPPI_STORE_ID=tu_store_id

// Endpoint:
POST https://services.grability.rappi.com/api/partners/deliveries/quote
```

#### Ventajas:
- ✅ Entrega ultra rápida (30-60 min)
- ✅ Brand recognition alto
- ✅ App del cliente muy usada

---

## 🛠️ **CÓDIGO DE IMPLEMENTACIÓN PRÁCTICA:**

### 1. **Servicio Uber Direct Real:**

```javascript
class UberDirectService {
  constructor() {
    this.apiKey = process.env.UBER_DIRECT_API_KEY;
    this.customerId = process.env.UBER_DIRECT_CUSTOMER_ID;
    this.baseUrl = 'https://api.uber.com/v1/customers';
  }

  async getQuote(pickup, dropoff, items) {
    const response = await axios.post(
      `${this.baseUrl}/${this.customerId}/deliveries/quote`,
      {
        pickup_address: pickup.address,
        dropoff_address: dropoff.address,
        pickup_phone_number: pickup.phone,
        dropoff_phone_number: dropoff.phone,
        manifest_items: items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          size: this.mapSize(item.weight)
        }))
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      provider: 'Uber Direct',
      price: response.data.fee / 100,
      currency: 'MXN',
      estimatedTime: `${response.data.dropoff_eta} min`,
      trackingUrl: response.data.tracking_url
    };
  }

  async createDelivery(quoteId, pickup, dropoff) {
    const response = await axios.post(
      `${this.baseUrl}/${this.customerId}/deliveries`,
      {
        quote_id: quoteId,
        pickup_address: pickup.address,
        pickup_phone_number: pickup.phone,
        pickup_name: pickup.name,
        dropoff_address: dropoff.address,
        dropoff_phone_number: dropoff.phone,
        dropoff_name: dropoff.name,
        delivery_instructions: 'Llamar al llegar'
      },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  }

  mapSize(weight) {
    if (weight <= 2) return 'small';
    if (weight <= 10) return 'medium';
    if (weight <= 20) return 'large';
    return 'xlarge';
  }
}
```

### 2. **Integración con tu sistema actual:**

```javascript
// En tu shipping-quote.service.js
const HybridShippingService = require('./hybrid-shipping.service');

class ShippingQuoteService {
  constructor() {
    this.skyDropXAuth = new SkyDropXAuth();
    this.hybridService = new HybridShippingService();
    // ... resto de tu código actual
  }

  async getShippingQuote(cartId, postalCodeTo) {
    try {
      // Obtener datos del carrito y destino
      const cartData = await this.getCartShippingData(cartId);
      const destination = await this.getAddressFromPostalCode(postalCodeTo);
      
      // Verificar si es envío local
      const hybridQuotes = await this.hybridService.getShippingQuotes(
        this.addressFrom, 
        destination, 
        {
          weight: cartData.totalWeight,
          length: cartData.dimensions.length,
          width: cartData.dimensions.width,
          height: cartData.dimensions.height,
          description: 'Productos Trebode Luxe'
        }
      );

      // Si hay opciones locales, usarlas
      if (hybridQuotes.isLocalDelivery && hybridQuotes.localOptions.length > 0) {
        return {
          success: true,
          type: 'local',
          zone: hybridQuotes.zone,
          distance: hybridQuotes.distance,
          quotations: hybridQuotes.localOptions,
          recommendation: hybridQuotes.recommendation
        };
      }

      // Si no hay opciones locales, usar SkyDropX (tu código actual)
      const token = await this.skyDropXAuth.getBearerToken();
      // ... resto de tu código SkyDropX actual

    } catch (error) {
      console.error('Error en cotización híbrida:', error);
      throw error;
    }
  }
}
```

---

## 📊 **COSTOS ESTIMADOS:**

### Uber Direct:
- Setup: **Gratis**
- Por entrega: **$80-150 MXN** (dependiendo distancia)
- Comisión: **Sin comisión adicional**

### 99 Minutos:
- Setup: **Gratis**
- Por entrega: **$60-120 MXN**
- Comisión: **Negociable según volumen**

### Rappi Business:
- Setup: **Proceso comercial**
- Por entrega: **$50-100 MXN**
- Comisión: **5-10% del valor del producto**

---

## 🎯 **PLAN DE IMPLEMENTACIÓN SUGERIDO:**

### **Semana 1:**
- ✅ Registrarse en Uber Direct
- ✅ Implementar integración básica
- ✅ Probar en entorno de desarrollo

### **Semana 2:**
- ✅ Integrar con tu sistema actual
- ✅ Crear lógica de decisión local vs nacional
- ✅ Implementar tracking

### **Semana 3:**
- ✅ Contactar 99 Minutos para API directa
- ✅ Implementar segunda opción
- ✅ Testing completo

### **Semana 4:**
- ✅ Contactar Rappi Business
- ✅ Optimizar algoritmo de selección
- ✅ Deploy a producción

---

## 🔧 **VARIABLES DE ENTORNO NECESARIAS:**

```bash
# Uber Direct
UBER_DIRECT_API_KEY=your_api_key_here
UBER_DIRECT_CUSTOMER_ID=your_customer_id_here

# 99 Minutos
NINETY_NINE_API_KEY=your_api_key_here
NINETY_NINE_CUSTOMER_ID=your_customer_id_here

# Rappi
RAPPI_API_KEY=your_api_key_here
RAPPI_STORE_ID=your_store_id_here

# Google Maps (para calcular distancias)
GOOGLE_MAPS_API_KEY=your_google_maps_key
```

---

¿Quieres que implemente alguna de estas APIs específicamente, o prefieres que integre el sistema híbrido con tu servicio SkyDropX actual?
