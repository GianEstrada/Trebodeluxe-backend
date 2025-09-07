import React, { useState, useEffect } from 'react';
import { 
  SUPPORTED_COUNTRIES, 
  getCountryByCode, 
  detectCountryByPostalCode,
  getCountriesByPriority 
} from './countries-config';

/**
 * 🌍 COMPONENTE SELECTOR DE PAÍS Y CÓDIGO POSTAL
 * Incluye dropdown con banderas y validación de CP
 */
const CountryPostalSelector = ({ 
  onShippingCalculate, 
  cartId,
  className = '',
  showCalculateButton = true 
}) => {
  // Estados
  const [selectedCountry, setSelectedCountry] = useState(getCountryByCode('MX')); // México por defecto
  const [postalCode, setPostalCode] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [detectedCountry, setDetectedCountry] = useState(null);
  const [validationMessage, setValidationMessage] = useState('');

  // Efecto para detectar país automáticamente según el CP
  useEffect(() => {
    if (postalCode.length >= 4) {
      const detected = detectCountryByPostalCode(postalCode);
      setDetectedCountry(detected);
      
      if (detected && detected.code !== selectedCountry.code) {
        setValidationMessage(
          `💡 Código postal detectado como ${detected.flag} ${detected.name}`
        );
      } else {
        setValidationMessage('');
      }
    } else {
      setDetectedCountry(null);
      setValidationMessage('');
    }
  }, [postalCode, selectedCountry]);

  // Manejar selección de país
  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);
    setValidationMessage('');
  };

  // Manejar cambio en código postal
  const handlePostalCodeChange = (e) => {
    const value = e.target.value.toUpperCase();
    setPostalCode(value);
  };

  // Calcular envío
  const handleCalculateShipping = async () => {
    if (!postalCode.trim()) {
      setValidationMessage('❌ Por favor ingresa un código postal');
      return;
    }

    setIsCalculating(true);
    setValidationMessage('🔄 Calculando costos de envío...');

    try {
      // Determinar si usar país detectado o seleccionado
      const finalCountry = detectedCountry || selectedCountry;
      const forceCountry = finalCountry.code === 'MX' ? null : finalCountry.code;

      // Llamar al backend con la función híbrida
      const response = await fetch('/api/shipping/quote-hybrid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartId: cartId,
          postalCode: postalCode.trim(),
          forceCountry: forceCountry
        })
      });

      const result = await response.json();

      if (result.success) {
        setValidationMessage(`✅ Cotización obtenida para ${finalCountry.flag} ${finalCountry.name}`);
        
        // Enviar resultado al componente padre
        if (onShippingCalculate) {
          onShippingCalculate({
            success: true,
            country: finalCountry,
            postalCode: postalCode.trim(),
            quotations: result.quotations,
            isInternational: result.isInternational,
            isHybrid: result.isHybrid
          });
        }
      } else {
        setValidationMessage(`❌ Error: ${result.error || 'No se pudo calcular el envío'}`);
        
        if (onShippingCalculate) {
          onShippingCalculate({
            success: false,
            error: result.error,
            country: finalCountry,
            postalCode: postalCode.trim()
          });
        }
      }
    } catch (error) {
      console.error('Error calculando envío:', error);
      setValidationMessage('❌ Error de conexión. Intenta nuevamente.');
      
      if (onShippingCalculate) {
        onShippingCalculate({
          success: false,
          error: 'Error de conexión',
          country: selectedCountry,
          postalCode: postalCode.trim()
        });
      }
    } finally {
      setIsCalculating(false);
    }
  };

  // Función para manejar Enter en el input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleCalculateShipping();
    }
  };

  return (
    <div className={`country-postal-selector ${className}`}>
      {/* Título */}
      <div className="selector-header">
        <h3 className="selector-title">
          🚚 Calcular Costo de Envío
        </h3>
        <p className="selector-subtitle">
          Selecciona el país y código postal de destino
        </p>
      </div>

      {/* Container principal */}
      <div className="selector-container">
        
        {/* Dropdown de países */}
        <div className="country-dropdown-container">
          <label className="country-label">País de destino:</label>
          
          <div className="country-dropdown">
            <button
              type="button"
              className={`country-button ${isDropdownOpen ? 'open' : ''}`}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <span className="country-flag">{selectedCountry.flag}</span>
              <span className="country-name">{selectedCountry.name}</span>
              <span className={`dropdown-arrow ${isDropdownOpen ? 'up' : 'down'}`}>
                {isDropdownOpen ? '▲' : '▼'}
              </span>
            </button>

            {isDropdownOpen && (
              <div className="country-dropdown-menu">
                {getCountriesByPriority().map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    className={`country-option ${
                      country.code === selectedCountry.code ? 'selected' : ''
                    }`}
                    onClick={() => handleCountrySelect(country)}
                  >
                    <span className="country-flag">{country.flag}</span>
                    <div className="country-info">
                      <span className="country-name">{country.name}</span>
                      <span className="country-type">
                        {country.type === 'national' ? '🏠 Nacional' : '🌍 Internacional'}
                      </span>
                    </div>
                    {country.code === selectedCountry.code && (
                      <span className="selected-check">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Input de código postal */}
        <div className="postal-code-container">
          <label className="postal-label">Código postal:</label>
          
          <div className="postal-input-container">
            <input
              type="text"
              className="postal-input"
              value={postalCode}
              onChange={handlePostalCodeChange}
              onKeyPress={handleKeyPress}
              placeholder={selectedCountry.example}
              maxLength={20}
            />
            
            {selectedCountry && (
              <div className="postal-format-hint">
                📝 {selectedCountry.postalCodeFormat}
              </div>
            )}
          </div>
        </div>

        {/* Botón de calcular */}
        {showCalculateButton && (
          <div className="calculate-container">
            <button
              type="button"
              className={`calculate-button ${isCalculating ? 'calculating' : ''}`}
              onClick={handleCalculateShipping}
              disabled={isCalculating || !postalCode.trim()}
            >
              {isCalculating ? (
                <>
                  <span className="spinner">🔄</span>
                  Calculando...
                </>
              ) : (
                <>
                  <span className="calc-icon">💰</span>
                  Calcular Envío
                </>
              )}
            </button>
          </div>
        )}

        {/* Mensaje de validación */}
        {validationMessage && (
          <div className={`validation-message ${
            validationMessage.startsWith('❌') ? 'error' : 
            validationMessage.startsWith('✅') ? 'success' : 
            validationMessage.startsWith('💡') ? 'info' : 'loading'
          }`}>
            {validationMessage}
          </div>
        )}

        {/* Información del país detectado */}
        {detectedCountry && detectedCountry.code !== selectedCountry.code && (
          <div className="detected-country-info">
            <div className="detected-header">
              <span className="detected-icon">🎯</span>
              <span>País detectado automáticamente:</span>
            </div>
            <div className="detected-country">
              <span className="detected-flag">{detectedCountry.flag}</span>
              <span className="detected-name">{detectedCountry.name}</span>
              <button
                type="button"
                className="use-detected-button"
                onClick={() => handleCountrySelect(detectedCountry)}
              >
                Usar este país
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Información adicional */}
      <div className="selector-footer">
        <div className="shipping-info">
          <div className="info-item">
            <span className="info-icon">🇲🇽</span>
            <span>Envíos nacionales: Automático para México</span>
          </div>
          <div className="info-item">
            <span className="info-icon">🌍</span>
            <span>Envíos internacionales: {getInternationalCountries().length} países</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountryPostalSelector;
