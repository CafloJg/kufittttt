import { loadStripe } from '@stripe/stripe-js';
import { TIER_TO_PRODUCT } from './stripe/products';
import type { UserProfile } from '../types/user';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export async function createSubscription(user: UserProfile, tier: 'basic' | 'premium' | 'premium-plus') {
  try {
    const stripe = await stripePromise;
    if (!stripe) {
      throw new Error('Stripe não inicializado');
    }

    const productId = TIER_TO_PRODUCT[tier];
    if (!productId) {
      throw new Error('Plano inválido');
    }

    // Create checkout session
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.uid,
        productId,
        customerEmail: user.email
      }),
    });

    const session = await response.json();

    if (session.error) {
      throw new Error(session.error);
    }

    // Redirect to checkout
    const result = await stripe.redirectToCheckout({
      sessionId: session.id
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

  } catch (error) {
    console.error('Error creating subscription:', error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Erro ao processar assinatura'
    );
  }
}

export async function updateSubscription(subscriptionId: string, newTier: 'basic' | 'premium' | 'premium-plus') {
  try {
    const newProductId = TIER_TO_PRODUCT[newTier];
    if (!newProductId) {
      throw new Error('Plano inválido');
    }

    const response = await fetch('/api/update-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscriptionId,
        newProductId
      }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Erro ao atualizar assinatura');
    }

    return result;
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Erro ao atualizar assinatura'
    );
  }
}

export async function cancelSubscription(subscriptionId: string) {
  try {
    const response = await fetch('/api/cancel-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscriptionId }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Erro ao cancelar assinatura');
    }

    return result;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Erro ao cancelar assinatura'
    );
  }
}