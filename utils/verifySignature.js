import { verifyPaymentSignature } from '../services/razorpay.service.js';

/**
 * Verify Razorpay payment signature
 * @param {string} orderId - Razorpay Order ID
 * @param {string} paymentId - Razorpay Payment ID
 * @param {string} signature - Razorpay Signature
 * @returns {boolean} True if signature is valid
 */
export const verifySignature = (orderId, paymentId, signature) => {
  return verifyPaymentSignature(orderId, paymentId, signature);
};

/**
 * Validate payment data
 * @param {object} paymentData - Payment data object
 * @returns {object} { isValid: boolean, errors: array }
 */
export const validatePaymentData = (paymentData) => {
  const errors = [];
  
  if (!paymentData.razorpay_order_id) {
    errors.push('Missing razorpay_order_id');
  }
  
  if (!paymentData.razorpay_payment_id) {
    errors.push('Missing razorpay_payment_id');
  }
  
  if (!paymentData.razorpay_signature) {
    errors.push('Missing razorpay_signature');
  }
  
  if (!paymentData.amount || paymentData.amount <= 0) {
    errors.push('Invalid amount');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Sanitize payment data
 */
export const sanitizePaymentData = (data) => {
  return {
    razorpay_order_id: String(data.razorpay_order_id || '').trim(),
    razorpay_payment_id: String(data.razorpay_payment_id || '').trim(),
    razorpay_signature: String(data.razorpay_signature || '').trim(),
    amount: parseFloat(data.amount) || 0,
  };
};
export const verifyRazorpaySignature = verifySignature;