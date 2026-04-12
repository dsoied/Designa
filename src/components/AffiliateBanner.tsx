import React from 'react';
import { motion } from 'motion/react';
import { ExternalLink } from 'lucide-react';
import { AffiliateLink } from '../types';

interface AffiliateBannerProps {
  link: AffiliateLink;
  aspectRatio?: string;
  className?: string;
  showBadge?: boolean;
  badgeText?: string;
}

export const AffiliateBanner: React.FC<AffiliateBannerProps> = ({ 
  link, 
  aspectRatio = "aspect-[21/9]", 
  className = "", 
  showBadge = true,
  badgeText = "Parceiro"
}) => {
  return (
    <motion.a
      href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ y: -5, scale: 1.02 }}
      className={`relative group rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm ${aspectRatio} ${className}`}
    >
      {link.type === 'video' && link.videoUrl ? (
        <video 
          src={link.videoUrl} 
          autoPlay 
          muted 
          loop 
          playsInline 
          poster={link.imageUrl}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
      ) : (
        <img 
          src={link.imageUrl} 
          alt={link.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
          referrerPolicy="no-referrer"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent flex flex-col justify-end p-6">
        <div className="flex items-center justify-between mb-1">
          {showBadge && (
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
              {link.type === 'video' ? 'Vídeo' : badgeText}
            </span>
          )}
          <ExternalLink size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <h4 className="text-lg font-black text-white leading-tight truncate">{link.title}</h4>
      </div>
    </motion.a>
  );
}
