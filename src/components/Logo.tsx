import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showImage?: boolean;
}

export function Logo({ size = 'md', className = '', showImage = false }: LogoProps) {
  // Define size mappings
  const sizeClasses = {
    sm: { kynex: 'text-lg', dev: 'text-sm', image: 'h-6' },
    md: { kynex: 'text-2xl', dev: 'text-base', image: 'h-8' },
    lg: { kynex: 'text-3xl', dev: 'text-lg', image: 'h-10' },
    xl: { kynex: 'text-6xl', dev: 'text-4xl', image: 'h-16' },
  };

  const { kynex, dev, image } = sizeClasses[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showImage && (
        <img 
          src="/logo.png" 
          alt="Kynex" 
          className={`${image} w-auto`}
        />
      )}
      <div className="flex items-baseline gap-0">
        <span 
          className={`font-quador logo-text tracking-tight ${kynex} text-white`}
          style={{ 
            fontFamily: '"quador", Arial, sans-serif',
            fontWeight: 700,
            fontStyle: 'italic',
            letterSpacing: '-0.02em',
            textRendering: 'optimizeLegibility',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale'
          }}
        >
          KYNEX
        </span>
        <span 
          className={`font-quador logo-text ${dev} text-gray-500`}
          style={{ 
            fontFamily: '"quador", Arial, sans-serif',
            fontWeight: 700,
            fontStyle: 'italic',
            letterSpacing: '-0.02em',
            textRendering: 'optimizeLegibility',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale'
          }}
        >
          .dev
        </span>
      </div>
    </div>
  );
}