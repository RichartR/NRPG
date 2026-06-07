import React from 'react';

interface PaginationContainerProps {
  children: React.ReactNode;
  isRenegado?: boolean;
  className?: string;
  maxWidthClass?: string;
}

export function PaginationContainer({
  children,
  isRenegado = false,
  className = '',
  maxWidthClass = 'max-w-xs',
}: PaginationContainerProps) {
  const borderColorClass = isRenegado ? 'bg-rojo-sangre/20' : 'bg-oro/20';
  const backgroundImageStyle = isRenegado
    ? 'radial-gradient(circle at center, rgba(185, 28, 28, 0.05) 0%, transparent 70%), linear-gradient(rgba(5, 3, 9, 0.55), rgba(5, 3, 9, 0.55)), url("/assets/ui/bg-list.jpg")'
    : 'radial-gradient(circle at center, rgba(255, 230, 159, 0.05) 0%, transparent 70%), linear-gradient(rgba(5, 3, 9, 0.55), rgba(5, 3, 9, 0.55)), url("/assets/ui/bg-list.jpg")';

  return (
    <div
      className={`relative p-[1px] ${borderColorClass} mx-auto ${maxWidthClass} ${className}`}
      style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
    >
      <div
        className="flex justify-center items-center gap-6 px-6 py-3 backdrop-blur-md w-full"
        style={{
          clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
          backgroundColor: 'var(--color-neutral-900)',
          backgroundImage: backgroundImageStyle,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {children}
      </div>
    </div>
  );
}
