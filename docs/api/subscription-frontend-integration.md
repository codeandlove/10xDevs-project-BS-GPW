# Subscription Management - Frontend Integration Guide

## Quick Start

### 1. Get User Subscription Status

```typescript
// Example: Check if user has access
async function checkUserAccess() {
  const token = await supabase.auth.getSession();
  
  const response = await fetch('/api/subscriptions/status', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token.data.session?.access_token}`,
    },
  });
  
  const data = await response.json();
  
  if (data.success && data.data.has_access) {
    // User has access - show premium features
    return true;
  } else {
    // User needs to subscribe
    return false;
  }
}
```

---

### 2. Create Checkout Session

```typescript
// Example: Start subscription checkout
async function startCheckout(priceId: string) {
  const token = await supabase.auth.getSession();
  
  const response = await fetch('/api/subscriptions/create-checkout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token.data.session?.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      price_id: priceId,
      success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${window.location.origin}/pricing`,
    }),
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Redirect to Stripe Checkout
    window.location.href = data.data.checkout_url;
  } else {
    console.error('Checkout error:', data.error);
    alert(data.error.message);
  }
}
```

---

### 3. Open Customer Portal

```typescript
// Example: Open Stripe Customer Portal
async function openCustomerPortal() {
  const token = await supabase.auth.getSession();
  
  const response = await fetch('/api/subscriptions/create-portal', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token.data.session?.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      return_url: `${window.location.origin}/account`,
    }),
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Redirect to Stripe Customer Portal
    window.location.href = data.data.portal_url;
  } else {
    console.error('Portal error:', data.error);
    alert(data.error.message);
  }
}
```

---

## React Component Example

```tsx
import { useState, useEffect } from 'react';
import { useSupabase } from '@/hooks/useSupabase';

interface SubscriptionStatus {
  subscription_status: string;
  has_access: boolean;
  trial_expires_at: string | null;
  current_period_end: string | null;
}

export function SubscriptionButton() {
  const supabase = useSupabase();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  async function fetchSubscriptionStatus() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/subscriptions/status', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe() {
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/subscriptions/create-checkout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_id: 'price_1ABC123xyz', // Your Stripe price ID
          success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${window.location.origin}/pricing`,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        window.location.href = data.data.checkout_url;
      } else {
        alert(data.error.message);
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to start subscription process');
    } finally {
      setLoading(false);
    }
  }

  async function handleManageSubscription() {
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/subscriptions/create-portal', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          return_url: `${window.location.origin}/account`,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        window.location.href = data.data.portal_url;
      } else {
        alert(data.error.message);
      }
    } catch (error) {
      console.error('Portal error:', error);
      alert('Failed to open customer portal');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <button disabled>Loading...</button>;
  }

  if (!status) {
    return <button disabled>Error loading subscription</button>;
  }

  if (status.has_access) {
    return (
      <div>
        <p>Status: {status.subscription_status}</p>
        <button onClick={handleManageSubscription}>
          Manage Subscription
        </button>
      </div>
    );
  }

  return (
    <button onClick={handleSubscribe}>
      Subscribe Now
    </button>
  );
}
```

---

## Astro Component Example

```astro
---
// src/components/SubscriptionButton.astro
import { Button } from '@/components/ui/button';
---

<div id="subscription-container">
  <button id="subscription-btn" class="btn-primary" disabled>
    Loading...
  </button>
</div>

<script>
  async function init() {
    const btn = document.getElementById('subscription-btn');
    if (!btn) return;

    // Check subscription status
    const response = await fetch('/api/subscriptions/status', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('supabase-token')}`,
      },
    });

    const data = await response.json();

    if (!data.success) {
      btn.textContent = 'Error';
      return;
    }

    const { has_access, subscription_status } = data.data;

    if (has_access) {
      btn.textContent = 'Manage Subscription';
      btn.disabled = false;
      btn.onclick = openPortal;
    } else {
      btn.textContent = 'Subscribe Now';
      btn.disabled = false;
      btn.onclick = startCheckout;
    }
  }

  async function startCheckout() {
    const response = await fetch('/api/subscriptions/create-checkout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('supabase-token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_id: 'price_1ABC123xyz',
        success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}/pricing`,
      }),
    });

    const data = await response.json();

    if (data.success) {
      window.location.href = data.data.checkout_url;
    } else {
      alert(data.error.message);
    }
  }

  async function openPortal() {
    const response = await fetch('/api/subscriptions/create-portal', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('supabase-token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        return_url: `${window.location.origin}/account`,
      }),
    });

    const data = await response.json();

    if (data.success) {
      window.location.href = data.data.portal_url;
    } else {
      alert(data.error.message);
    }
  }

  init();
</script>
```

---

## Error Handling Best Practices

```typescript
async function safeApiCall(endpoint: string, options: RequestInit) {
  try {
    const response = await fetch(endpoint, options);
    const data = await response.json();
    
    if (!data.success) {
      // Handle API error
      switch (data.error.code) {
        case 'UNAUTHORIZED':
          // Redirect to login
          window.location.href = '/login';
          break;
        case 'INVALID_URL':
          console.error('Invalid redirect URL configuration');
          break;
        case 'NO_CUSTOMER':
          console.error('User has no subscription yet');
          break;
        case 'STRIPE_ERROR':
          console.error('Stripe error:', data.error.details);
          break;
        default:
          console.error('Unknown error:', data.error);
      }
      
      return null;
    }
    
    return data.data;
  } catch (error) {
    console.error('Network error:', error);
    return null;
  }
}
```

---

## TypeScript Types

```typescript
// Copy these types to your frontend code

export interface SubscriptionStatusDTO {
  subscription_status: 'trial' | 'active' | 'past_due' | 'canceled' | 'unpaid';
  trial_expires_at: string | null;
  current_period_end: string | null;
  plan_id: string | null;
  stripe_subscription_id: string | null;
  has_access: boolean;
}

export interface CheckoutSessionDTO {
  checkout_url: string;
  session_id: string;
}

export interface PortalSessionDTO {
  portal_url: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: unknown;
  };
  timestamp: string;
}
```

---

## Common Patterns

### Protected Route

```typescript
// Middleware or component guard
async function requireSubscription() {
  const response = await fetch('/api/subscriptions/status');
  const data = await response.json();
  
  if (!data.success || !data.data.has_access) {
    // Redirect to pricing page
    window.location.href = '/pricing';
    return false;
  }
  
  return true;
}
```

### Trial Banner

```typescript
function TrialBanner({ status }: { status: SubscriptionStatusDTO }) {
  if (status.subscription_status !== 'trial' || !status.trial_expires_at) {
    return null;
  }
  
  const daysLeft = Math.ceil(
    (new Date(status.trial_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  
  return (
    <div className="trial-banner">
      {daysLeft} days left in your trial. 
      <button onClick={startCheckout}>Subscribe Now</button>
    </div>
  );
}
```

---

## Testing Checklist

- [ ] Test with valid authentication token
- [ ] Test with expired token (should get 401)
- [ ] Test with invalid price_id
- [ ] Test with URL outside whitelist
- [ ] Test checkout flow end-to-end
- [ ] Test portal access for users without subscription
- [ ] Test subscription status after successful payment
- [ ] Test error handling for all scenarios

