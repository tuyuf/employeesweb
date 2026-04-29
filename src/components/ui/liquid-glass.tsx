'use client';

import { cn } from '@/lib/utils';
import { forwardRef, useMemo } from 'react';

interface LiquidGlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glowIntensity?: 'none' | 'sm' | 'md' | 'lg';
  shadowIntensity?: 'none' | 'sm' | 'md' | 'lg';
  borderRadius?: string;
  blurIntensity?: 'sm' | 'md' | 'lg';
  draggable?: boolean;
}

const LiquidGlassCard = forwardRef<HTMLDivElement, LiquidGlassCardProps>(
  (
    {
      className,
      children,
      glowIntensity = 'md',
      shadowIntensity = 'md',
      borderRadius = '16px',
      blurIntensity = 'md',
      draggable = false,
      style,
      ...props
    },
    ref
  ) => {
    const blurAmount = useMemo(() => {
      switch (blurIntensity) {
        case 'sm':
          return '4px';
        case 'md':
          return '8px';
        case 'lg':
          return '12px';
        default:
          return '8px';
      }
    }, [blurIntensity]);

    const glowStyle = useMemo(() => {
      switch (glowIntensity) {
        case 'none':
          return {};
        case 'sm':
          return {
            boxShadow:
              '0 0 20px rgba(255, 255, 255, 0.15), inset 0 0 20px rgba(255, 255, 255, 0.1)',
          };
        case 'md':
          return {
            boxShadow:
              '0 0 30px rgba(255, 255, 255, 0.2), inset 0 0 30px rgba(255, 255, 255, 0.15)',
          };
        case 'lg':
          return {
            boxShadow:
              '0 0 40px rgba(255, 255, 255, 0.25), inset 0 0 40px rgba(255, 255, 255, 0.2)',
          };
        default:
          return {};
      }
    }, [glowIntensity]);

    const shadowStyle = useMemo(() => {
      switch (shadowIntensity) {
        case 'none':
          return {};
        case 'sm':
          return { boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' };
        case 'md':
          return { boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)' };
        case 'lg':
          return { boxShadow: '0 12px 36px rgba(0, 0, 0, 0.16)' };
        default:
          return {};
      }
    }, [shadowIntensity]);

    return (
      <div
        ref={ref}
        className={cn('relative overflow-hidden', className)}
        style={{
          ...style,
          borderRadius,
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: `blur(${blurAmount}) saturate(150%)`,
          WebkitBackdropFilter: `blur(${blurAmount}) saturate(150%)`,
          border: '1px solid rgba(255, 255, 255, 0.2)',
          ...glowStyle,
          ...shadowStyle,
        }}
        draggable={draggable}
        {...props}
      >
        {children}
      </div>
    );
  }
);

LiquidGlassCard.displayName = 'LiquidGlassCard';

export { LiquidGlassCard };