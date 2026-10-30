import React from 'react';

interface GradientSphereProps {
  from: string;
  via?: string;
  to: string;
  size?: number | string;
  className?: string;
}

export const GradientSphere: React.FC<GradientSphereProps> = ({
  from,
  via,
  to,
  size = 40,
  className = '',
}) => {
  const gradient = via
    ? `radial-gradient(circle at 32% 28%, ${from} 0%, ${via} 50%, ${to} 100%)`
    : `radial-gradient(circle at 32% 28%, ${from} 0%, ${to} 100%)`;

  const sizeStyle = typeof size === 'number' ? `${size}px` : size;

  return (
    <div
      className={`relative rounded-full flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${className}`}
      style={{
        width: sizeStyle,
        height: sizeStyle,
        background: gradient,
        boxShadow: 'inset -2px -2px 6px rgba(0, 0, 0, 0.22), inset 2px 2px 5px rgba(255, 255, 255, 0.65), 0 3px 8px rgba(0,0,0,0.08)',
      }}
    >
      {/* Specular glare overlay for enhanced 3D glass/pearl feel */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0) 45%)',
        }}
      />
    </div>
  );
};
