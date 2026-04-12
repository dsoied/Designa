import { useEffect } from 'react';
import { MonetizationSettings } from '../types';

interface AdUnitProps {
  monetization?: MonetizationSettings | null;
  className?: string;
}

export function AdUnit({ monetization, className = "" }: AdUnitProps) {
  useEffect(() => {
    if (monetization?.adsenseEnabled && monetization?.adsenseClientId && monetization?.adsenseSlotId) {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error("AdSense error:", e);
      }
    }
  }, [monetization]);

  if (!monetization?.adsenseEnabled || !monetization?.adsenseClientId || !monetization?.adsenseSlotId) {
    return null;
  }

  return (
    <div className={`my-4 overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 ${className}`}>
      <ins className="adsbygoogle"
           style={{ display: 'block' }}
           data-ad-client={monetization.adsenseClientId}
           data-ad-slot={monetization.adsenseSlotId}
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
    </div>
  );
}
