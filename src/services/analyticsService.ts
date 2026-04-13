import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export type EventType = 
  | 'page_view' 
  | 'image_processed' 
  | 'user_signup' 
  | 'plan_upgrade' 
  | 'login' 
  | 'error'
  | 'click_pricing';

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
    const event = {
      type,
      userId: user?.uid || 'anonymous',
      email: user?.email || 'anonymous',
      path: window.location.pathname,
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
