export type Screen = 'home' | 'editor' | 'history' | 'objects' | 'tools' | 'settings' | 'upload' | 'upscale' | 'face' | 'filters' | 'crop' | 'layers' | 'magic' | 'signup' | 'notifications' | 'batch' | 'admin' | 'generate' | 'outpaint' | 'variations' | 'terms' | 'privacy';

export interface Project {
  id: string;
  name: string;
  date: string;
  status: 'Finalizado' | 'Em Nuvem';
  type: string;
  imageUrl: string;
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'success' | 'info' | 'warning';
  isRead: boolean;
}

export interface AffiliateLink {
  id: string;
  title: string;
  url: string;
  imageUrl: string;
  videoUrl?: string;
  type: 'image' | 'video';
  active: boolean;
}

export interface MonetizationSettings {
  adsenseClientId: string;
  adsenseSlotId: string;
  adsenseEnabled: boolean;
  affiliateLinks: AffiliateLink[];
}

export interface FooterSettings {
  adminEmail: string;
  contactPhone: string;
  websiteUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  githubUrl: string;
  description: string;
  privacyPolicyUrl: string;
  termsConditionsUrl: string;
}

export interface AppConfig {
  logoUrl?: string;
  faviconUrl?: string;
  appName?: string;
  brandingHeadline?: string;
  footerTeamName?: string;
}

export interface NewsletterSubscription {
  email: string;
  subscribedAt: string;
}
