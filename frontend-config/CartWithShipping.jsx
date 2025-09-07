import React, { useState, useEffect } from 'react';
import CountryPostalSelector from './CountryPostalSelector';
import './CountryPostalSelector.css';

/**
 * 🛒 COMPONENTE CARRITO CON SELECTOR DE ENVÍO INTERNACIONAL
 * Ejemplo de integración del selector en la página del carrito
 */
const CartWithShipping = () => {
  // Estados del carrito
  const [cartItems, setCartItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [cartId, setCartId] = useState(null);

  // Estados de envío
  const [shippingQuotes, setShippingQuotes] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [shippingCalculated, setShippingCalculated] = useState(false);
  const [shippingCountry, setShippingCountry] = useState(null);
  const [totalWithShipping, setTotalWithShipping] = useState(0);

  // Cargar datos del carrito al montar
  useEffect(() => {
    loadCartData();
  }, []);

  // Calcular total con envío
  useEffect(() => {
    const shippingCost = selectedShipping ? parseFloat(selectedShipping.price) : 0;
    setTotalWithShipping(cartTotal + shippingCost);
  }, [cartTotal, selectedShipping]);

  // Función para cargar datos del carrito
  const loadCartData = async () => {
    try {
      // Aquí harías la llamada real a tu API del carrito
      const response = await fetch('/api/cart');
      const data = await response.json();
      
      if (data.success) {
        setCartItems(data.items || []);
        setCartTotal(data.total || 0);
        setCartId(data.cartId);
      }
    } catch (error) {
      console.error('Error cargando carrito:', error);
      
      // Datos de ejemplo para demostración
      setCartItems([
        {
          id: 1,
          name: 'Producto Ejemplo 1',
          price: 599.99,
          quantity: 2,
          image: '/images/producto1.jpg'
        },
        {
          id: 2,
          name: 'Producto Ejemplo 2',
          price: 899.99,
          quantity: 1,
          image: '/images/producto2.jpg'
        }
      ]);
      setCartTotal(2099.97);
      setCartId('cart_example_123');
    }
  };

  // Manejar resultado de cotización de envío
  const handleShippingCalculate = (result) => {
    console.log('📦 Resultado cotización:', result);

    if (result.success) {
      setShippingQuotes(result.quotations || []);
      setShippingCalculated(true);
      setShippingCountry(result.country);
      
      // Seleccionar automáticamente la opción más barata
      if (result.quotations && result.quotations.length > 0) {
        const cheapest = result.quotations.reduce((min, quote) => 
          parseFloat(quote.price) < parseFloat(min.price) ? quote : min
        );
        setSelectedShipping(cheapest);
      }
    } else {
      setShippingQuotes([]);
      setShippingCalculated(false);
      setSelectedShipping(null);
      alert(`Error calculando envío: ${result.error}`);
    }
  };

  // Manejar selección de opción de envío
  const handleShippingSelect = (quote) => {
    setSelectedShipping(quote);
  };

  // Formatear precio
  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  };

  return (
    <div className="cart-container">
      <div className="cart-header">
        <h1>🛒 Carrito de Compras</h1>
        <p>Revisa tus productos y calcula el costo de envío</p>
      </div>

      <div className="cart-content">
        
        {/* SECCIÓN DE PRODUCTOS */}
        <div className="cart-section">
          <div className="section-header">
            <h2>📦 Productos en tu carrito</h2>
            <span className="item-count">{cartItems.length} artículo(s)</span>
          </div>

          <div className="cart-items">
            {cartItems.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="item-image">
                  <img src={item.image} alt={item.name} />
                </div>
                <div className="item-details">
                  <h3 className="item-name">{item.name}</h3>
                  <div className="item-price-qty">
                    <span className="item-price">{formatPrice(item.price)}</span>
                    <span className="item-quantity">Cantidad: {item.quantity}</span>
                  </div>
                </div>
                <div className="item-subtotal">
                  {formatPrice(item.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>

          <div className="cart-subtotal">
            <div className="subtotal-row">
              <span>Subtotal productos:</span>
              <span className="subtotal-amount">{formatPrice(cartTotal)}</span>
            </div>
          </div>
        </div>

        {/* SECCIÓN DE ENVÍO */}
        <div className="cart-section">
          <div className="section-header">
            <h2>🚚 Calcular Envío</h2>
            <span className="section-description">
              Selecciona el país y código postal de destino
            </span>
          </div>

          {/* SELECTOR DE PAÍS Y CÓDIGO POSTAL */}
          <CountryPostalSelector
            cartId={cartId}
            onShippingCalculate={handleShippingCalculate}
            className="cart-shipping-selector"
          />

          {/* OPCIONES DE ENVÍO */}
          {shippingCalculated && shippingQuotes.length > 0 && (
            <div className="shipping-options">
              <h3 className="options-title">
                📋 Opciones de envío para {shippingCountry?.flag} {shippingCountry?.name}
              </h3>
              
              <div className="shipping-quotes">
                {shippingQuotes.map((quote, index) => (
                  <div
                    key={index}
                    className={`shipping-quote ${
                      selectedShipping?.provider === quote.provider &&
                      selectedShipping?.service === quote.service
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() => handleShippingSelect(quote)}
                  >
                    <div className="quote-header">
                      <div className="quote-provider">
                        <span className="provider-name">{quote.provider}</span>
                        <span className="service-name">{quote.service}</span>
                      </div>
                      <div className="quote-price">
                        {formatPrice(quote.price)}
                      </div>
                    </div>
                    
                    <div className="quote-details">
                      <span className="delivery-time">
                        ⏰ {quote.estimatedTime || quote.days + ' día(s)'}
                      </span>
                      {quote.type && (
                        <span className={`shipping-type ${quote.type}`}>
                          {quote.type === 'national' ? '🏠 Nacional' : '🌍 Internacional'}
                        </span>
                      )}
                    </div>

                    {selectedShipping?.provider === quote.provider &&
                     selectedShipping?.service === quote.service && (
                      <div className="quote-selected-indicator">
                        ✓ Seleccionado
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MENSAJE SI NO HAY OPCIONES */}
          {shippingCalculated && shippingQuotes.length === 0 && (
            <div className="no-shipping-available">
              <span className="no-shipping-icon">📪</span>
              <div className="no-shipping-text">
                <h3>No hay opciones de envío disponibles</h3>
                <p>Intenta con un código postal diferente o contacta a soporte.</p>
              </div>
            </div>
          )}
        </div>

        {/* RESUMEN TOTAL */}
        <div className="cart-section">
          <div className="section-header">
            <h2>💰 Resumen del Pedido</h2>
          </div>

          <div className="order-summary">
            <div className="summary-row">
              <span>Subtotal productos:</span>
              <span>{formatPrice(cartTotal)}</span>
            </div>

            {selectedShipping && (
              <div className="summary-row">
                <span>
                  Envío ({selectedShipping.provider}):
                </span>
                <span>{formatPrice(selectedShipping.price)}</span>
              </div>
            )}

            <div className="summary-row total-row">
              <span>Total a pagar:</span>
              <span className="total-amount">
                {formatPrice(totalWithShipping)}
              </span>
            </div>
          </div>

          <div className="checkout-actions">
            <button
              className="continue-shopping-btn"
              onClick={() => window.history.back()}
            >
              ← Continuar Comprando
            </button>
            
            <button
              className="checkout-btn"
              disabled={!selectedShipping}
            >
              {selectedShipping ? 'Proceder al Pago 💳' : 'Selecciona envío primero'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartWithShipping;
