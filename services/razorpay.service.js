import crypto from 'crypto';

// MOCK RAZORPAY FOR TESTING - NO REAL API NEEDED
const mockRazorpay = {
  orders: {
    create: async (options) => {
      console.log('🧪 MOCK: Creating test order', options);
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        id: 'order_mock_' + Date.now(),
        entity: 'order',
        amount: options.amount,
        amount_paid: 0,
        amount_due: options.amount,
        currency: options.currency,
        receipt: options.receipt,
        status: 'created',
        created_at: Math.floor(Date.now() / 1000),
      };
    }
  },
  payments: {
    fetch: async (paymentId) => {
      console.log('🧪 MOCK: Fetching payment', paymentId);
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        id: paymentId,
        entity: 'payment',
        status: 'captured',
        amount: 100000,
        currency: 'INR',
        method: 'card',
        captured: true,
      };
    }
  }
};

export const createOrder = async (amount, currency = 'INR', receipt) => {
  try {
    console.log('🧪 Creating MOCK Razorpay order:', { amount, currency, receipt });
    
    const options = {
      amount: amount * 100, // Convert to paise
      currency,
      receipt,
      payment_capture: 1,
    };

    const order = await mockRazorpay.orders.create(options);
    console.log('✅ MOCK Order created successfully:', order.id);
    return order;
  } catch (error) {
    console.error('❌ Order creation error:', error);
    throw new Error(`Failed to create payment order: ${error.message}`);
  }
};

export const verifyPaymentSignature = (
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature
) => {
  console.log('🧪 MOCK: Payment signature verification');
  console.log('   Order ID:', razorpay_order_id);
  console.log('   Payment ID:', razorpay_payment_id);
  console.log('   Signature:', razorpay_signature);
  console.log('✅ MOCK: Signature verified (auto-pass)');
  
  // Always return true in mock mode
  return true;
};

export const fetchPaymentDetails = async (paymentId) => {
  try {
    console.log('🧪 MOCK: Fetching payment details');
    const payment = await mockRazorpay.payments.fetch(paymentId);
    console.log('✅ MOCK: Payment details fetched');
    return payment;
  } catch (error) {
    console.error('❌ Payment fetch error:', error);
    throw new Error('Failed to fetch payment details');
  }
};

export default mockRazorpay;
export const createRazorpayOrder = createOrder;