import React from 'react';
import Link from 'next/link';

interface NinjaCardProps {
  href?: string;
  onClick?: () => void;
  title: string;
  category?: string;
  imageUrl?: string;
  description?: string;
  actionText?: string;
  theme?: 'oro' | 'rojo';
  headerOverlayRight?: React.ReactNode;
  headerBgIcon?: React.ReactNode;
  footerRight?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  categoryClassName?: string;
  imageClassName?: string;
}

export default function NinjaCard({
  href,
  onClick,
  title,
  category,
  imageUrl,
  description,
  actionText,
  theme = 'oro',
  headerOverlayRight,
  headerBgIcon,
  footerRight,
  className = '',
  titleClassName = '',
  categoryClassName = '',
  imageClassName = '',
}: NinjaCardProps) {
  const isRojo = theme === 'rojo';
  const cardBorderClass = isRojo ? 'ninja-card-rojo' : 'ninja-card-oro';
  const hoverTitleClass = isRojo ? 'group-hover:text-rojo-sangre' : 'group-hover:text-oro';
  const actionTextClass = isRojo ? 'text-rojo-sangre' : 'text-oro';
  const dotBgClass = isRojo ? 'bg-rojo-sangre' : 'bg-oro';
  const borderBottomClass = isRojo ? 'border-rojo-sangre/20' : 'border-oro/10';

  const cardContent = (
    <>
      {/* Top Section */}
      <div className={`h-2/3 flex-shrink-0 relative overflow-hidden border-b ${borderBottomClass} bg-black`}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-90 ${imageClassName}`}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-oro/5" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

        {headerBgIcon}

        <div className="absolute bottom-8 left-8 right-8 z-10">
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 w-full">
            <div className="flex flex-col gap-1 min-w-0">
              <h3 className={`ninja-title ${hoverTitleClass} transition-all leading-tight py-1 ${titleClassName}`}>
                {title}
              </h3>
              {category && (
                <span className={`text-xs font-black text-oro/40 uppercase tracking-[0.4em] ${categoryClassName}`}>
                  {category}
                </span>
              )}
            </div>
            {headerOverlayRight}
          </div>
        </div>
      </div>

      <div className="h-1/3 flex-shrink-0 p-6 xl:p-8 flex flex-col justify-between relative z-10">
        {description && (
          <p className="text-gris-texto/80 text-sm sm:text-base md:text-lg leading-normal line-clamp-3 mb-4 flex-shrink-0">
            {description}
          </p>
        )}

        <div className="flex flex-col gap-1.5 flex-shrink-0 w-full mt-auto">
          {actionText && (
            <div className={`flex items-center gap-2 ${actionTextClass} font-black uppercase tracking-[0.2em] text-xs sm:text-sm xl:text-base group-hover:brightness-125 transition-all whitespace-nowrap flex-shrink-0`}>
              <span>{actionText}</span>
            </div>
          )}
          {footerRight && (
            <div className="flex items-center gap-2 flex-shrink-0 min-w-0 mr-auto mt-0.5">
              {footerRight}
            </div>
          )}
        </div>
      </div>
    </>
  );

  const containerClasses = `group relative overflow-hidden ${cardBorderClass} flex flex-col h-[500px] xl:h-[600px] hover-ninja ${className}`;

  if (href) {
    return (
      <Link href={href} className={containerClasses}>
        {cardContent}
      </Link>
    );
  }

  return (
    <div onClick={onClick} className={`${containerClasses} cursor-pointer`}>
      {cardContent}
    </div>
  );
}
