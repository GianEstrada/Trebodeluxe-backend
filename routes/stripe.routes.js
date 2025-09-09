const express = require('express');
// Validar que existe la clave de Stripe antes de inicializar
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.warn('⚠️ [STRIPE] STRIPE_SECRET_KEY no encontrada en variables de entorno');
  console.warn('⚠️ [STRIPE] Las rutas de Stripe no estarán disponibles');
}
const stripe = stripeKey ? require('stripe')(stripeKey) : null;
const router = express.Router();

// Middleware para parsear JSON en los webhooks de Stripe
const bodyParser = require('body-parser');

// Crear un Payment Intent
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'mxn', metadata = {} } = req.body;

    console.log('💳 [STRIPE] Creando Payment Intent:', { amount, currency, metadata });

    // Validar que se proporcione el monto
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false,
        error: 'El monto debe ser mayor a 0' 
      });
    }

    // Validar moneda
    const validCurrencies = ['mxn', 'usd', 'eur'];
    const normalizedCurrency = currency.toLowerCase();
    
    if (!validCurrencies.includes(normalizedCurrency)) {
      return res.status(400).json({
        success: false,
        error: 'Moneda no soportada'
      });
    }

    // Crear el Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Ya viene en centavos desde el frontend
      currency: normalizedCurrency,
      payment_method_types: ['card'],
      metadata: {
        ...metadata,
        integration_check: 'trebodeluxe_checkout',
        timestamp: new Date().toISOString()
      },
    });

    console.log('✅ [STRIPE] Payment Intent creado:', paymentIntent.id);

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    });

  } catch (error) {
    console.error('❌ [STRIPE] Error creando Payment Intent:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
});

// Confirmar el estado de un pago
router.get('/payment-intent/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const paymentIntent = await stripe.paymentIntents.retrieve(id);
    
    res.json({
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      created: paymentIntent.created,
      metadata: paymentIntent.metadata
    });

  } catch (error) {
    console.error('Error obteniendo Payment Intent:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
});

// Webhook de Stripe para manejar eventos
router.post('/webhook', bodyParser.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Manejar el evento
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntentSucceeded = event.data.object;
      console.log('PaymentIntent was successful!', paymentIntentSucceeded.id);
      
      // Aquí puedes actualizar la base de datos, enviar emails, etc.
      // Ejemplo: marcar el pedido como pagado
      
      break;
    
    case 'payment_intent.payment_failed':
      const paymentIntentFailed = event.data.object;
      console.log('PaymentIntent failed!', paymentIntentFailed.id);
      
      // Manejar el pago fallido
      
      break;
    
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});

// Crear un reembolso
router.post('/refund', async (req, res) => {
  try {
    const { paymentIntentId, amount, reason = 'requested_by_customer' } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ 
        error: 'Payment Intent ID es requerido' 
      });
    }

    const refundData = {
      payment_intent: paymentIntentId,
      reason: reason
    };

    // Si se especifica un monto, hacer reembolso parcial
    if (amount) {
      refundData.amount = Math.round(amount * 100);
    }

    const refund = await stripe.refunds.create(refundData);

    res.json({
      id: refund.id,
      amount: refund.amount,
      status: refund.status,
      currency: refund.currency
    });

  } catch (error) {
    console.error('Error creando reembolso:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: error.message 
    });
  }
});

module.exports = router;
