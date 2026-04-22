import React from 'react';
import { MonetizationSettings } from '../types';
import { AffiliateBanner } from './AffiliateBanner';

interface AdSectionProps {
  placement: 'home' | 'bg-remover' | 'tools' | 'batch' | 'signup' | 'profile' | 'notifications' | 'history' | 'generate' | 'all' | 'hap-grandi';
  layout: 'top' | 'bottom' | 'sidebar' | 'horizontal' | 'vertical';
  monetization: MonetizationSettings | null | undefined;
  className?: string;
  maxAds?: number;
}

export const AdSection: React.FC<AdSectionProps> = ({ 
  placement, 
  layout, 
  monetization, 
  className = "", 
  maxAds = 10 
}) => {
  if (!monetization || !monetization.affiliateLinks) return null;

  const filteredLinks = monetization.affiliateLinks.filter(link => {
    const isCorrectPlacement = link.placement === placement || link.placement === 'all' || !link.placement;
    const isCorrectLayout = link.layout === layout || (!link.layout && layout === 'bottom');
    return link.active && isCorrectPlacement && isCorrectLayout;
  });

  if (filteredLinks.length === 0) return null;
  
  // Apply slice after filtering but use a larger default or the provided maxAds
  const activeAds = filteredLinks.slice(0, maxAds);

  const getContainerClass = () => {
    switch (layout) {
      case 'sidebar':
        return 'flex flex-col gap-4';
      case 'top':
      case 'bottom':
      case 'horizontal':
        return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full';
      case 'vertical':
        return 'flex flex-col gap-6';
      default:
        return 'grid grid-cols-1 md:grid-cols-3 gap-6';
    }
  };

  return (
    <div className={`ad-section my-8 ${className}`}>
      {layout !== 'horizontal' && layout !== 'vertical' && (
        <div className="flex items-center gap-2 mb-4">
          <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-800" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Publicidade</span>
          <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-800" />
        </div>
      )}
      <div className={getContainerClass()}>
        {activeAds.map((link) => (
          <AffiliateBanner 
            key={link.id} 
            link={link} 
            className={layout === 'sidebar' ? 'w-full' : ''}
          />
        ))}
      </div>
    </div>
  );
};
