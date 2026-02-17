//backend/services/auth.service.js
import {
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../config/firebase'; // tumhara existing firebase config

// Admin Login
export const loginAdmin = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const token = await userCredential.user.getIdToken();
  
  // Token localStorage mein save karo
  localStorage.setItem('adminToken', token);
  
  return { user: userCredential.user, token };
};

// Admin Logout
export const logoutAdmin = async () => {
  await signOut(auth);
  localStorage.removeItem('adminToken');
};

// Token get karo (API calls ke liye)
export const getAuthToken = async () => {
  const { auth } = await import('../config/firebase');
  if (auth.currentUser) {
    // Fresh token lo (auto refresh)
    return await auth.currentUser.getIdToken();
  }
  return null;
};