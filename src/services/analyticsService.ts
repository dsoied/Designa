import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export type EventType = 
  | 'page_view' 
  | 'image_processed' 
  | 'user_signup' 
  | 'plan_upgrade' 
  | 'login' 
  | 'error'
  | 'click_pricing'
  | 'cookie_consent';

interface EventData {
  type: EventType;
  path?: string;
  tool?: string;
  userId?: string;
  email?: string;
  metadata?: any;
  timestamp: any;
}

export const trackEvent = async (type: EventType, metadata: any = {}) => {
  try {
    const user = auth.currentUser;
    
    // Get referrer
    const referrer = typeof document !== 'undefined' ? document.referrer : '';
    let source = 'Direto';
    
    if (referrer) {
      if (referrer.includes('google')) source = 'Google';
      else if (referrer.includes('facebook')) source = 'Facebook';
      else if (referrer.includes('instagram')) source = 'Instagram';
      else if (referrer.includes('youtube')) source = 'YouTube';
      else if (referrer.includes('twitter') || referrer.includes('t.co')) source = 'Twitter';
      else if (referrer.includes('linkedin')) source = 'LinkedIn';
      else if (referrer.includes('tiktok')) source = 'TikTok';
      else {
        try {
          const url = new URL(referrer);
          source = url.hostname;
        } catch (e) {
          source = 'Outro';
        }
      }
    }

    // Try to get country if not already in session/localStorage
    let country = 'Desconhecido';
    try {
      const savedCountry = localStorage.getItem('designa_user_country');
      if (savedCountry) {
        country = savedCountry;
      } else {
        // Fetch country from IP API (lazy load)
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.country_name) {
          country = data.country_name;
          localStorage.setItem('designa_user_country', country);
        }
      }
    } catch (e) {
      // Quiet fail for country detection
    }

    const event = {
      type,
      userId: user?.uid || 'anonymous',
      email: user?.email || 'anonymous',
      path: window.location.pathname,
      referrer,
      source,
      country,
      ...metadata,
      timestamp: serverTimestamp()
    };

    await addDoc(collection(db, 'events'), event);

    // Also send to Google Analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', type, {
        ...metadata,
        user_id: user?.uid || 'anonymous',
        page_path: window.location.pathname
      });
    }
  } catch (error) {
    console.error('Analytics: Error tracking event:', error);
  }
};

export const trackPageView = (path: string) => trackEvent('page_view', { path });
export const trackImageProcessed = (tool: string) => trackEvent('image_processed', { tool });
export const trackPlanUpgrade = (plan: string) => trackEvent('plan_upgrade', { plan });
export const trackCookieConsent = (accepted: boolean) => trackEvent('cookie_consent', { accepted });
