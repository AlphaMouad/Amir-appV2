import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Image as ImageIcon } from 'lucide-react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function LazyImage({ src, alt, className = '' }: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
      {!isLoaded && !hasError && (
        <motion.div 
          className="absolute inset-0 bg-slate-200 animate-pulse"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}
      
      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
          <ImageIcon className="h-8 w-8 mb-2 opacity-20" />
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Image Unavailable</span>
        </div>
      ) : (
        <motion.img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          className={`w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.5 }}
        />
      )}
    </div>
  );
}
