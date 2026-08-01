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
  const cardBorderClass = isRojo ? 'ninja-card-rojo' : 'ninja-card-image';
  const hoverTitleClass = isRojo ? 'group-hover:text-naranja-naruto' : 'group-hover:text-oro';
  const actionTextClass = isRojo ? 'text-naranja-naruto' : 'text-oro';

  const cardContent = (
    <>
      {/* Top Section */}
      <div className="h-2/3 flex-shrink-0 relative overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className={`w-full h-full object-cover opacity-90 ninja-clip-top ${imageClassName}`}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-oro/5" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/40 to-transparent pointer-events-none" />

        {headerBgIcon}

        <div className="absolute bottom-4 left-6 right-6 z-10">
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

      {/* Bottom Section */}
      <div className="h-1/3 flex-shrink-0 p-5 xl:p-6 flex flex-col justify-between relative z-10">
        {description && (
          <p className="text-gris-texto/80 text-sm sm:text-base md:text-lg leading-normal line-clamp-3 mb-4 flex-shrink-0">
            {description}
          </p>
        )}

        <div className="flex items-center justify-between gap-4 flex-shrink-0 w-full mt-auto">
          {actionText && (
            <div className={`flex items-center gap-2 ${actionTextClass} font-black uppercase tracking-[0.2em] text-xs sm:text-sm xl:text-base group-hover:brightness-125 transition-all whitespace-nowrap`}>
              <span>{actionText}</span>
            </div>
          )}
          <svg
            viewBox="0 0 26 7"
            className={`w-9 sm:w-11 xl:w-12 h-auto shrink-0 fill-current ${actionTextClass} group-hover:brightness-125 transition-all`}
          >
            <path d="M16.172,7,26,3.412,16.213,0l-4,2.66H5.692A2.913,2.913,0,0,0,2.912.527,2.942,2.942,0,0,0,0,3.5,2.942,2.942,0,0,0,2.912,6.473,2.913,2.913,0,0,0,5.692,4.34h6.431ZM2.912,4.792a1.293,1.293,0,0,1,0-2.584,1.293,1.293,0,0,1,0,2.584" />
          </svg>
          {footerRight && (
            <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
              {footerRight}
            </div>
          )}
        </div>
      </div>
    </>
  );

  const containerClasses = `group relative ${cardBorderClass} flex flex-col h-[500px] xl:h-[600px] hover-ninja ${className}`;

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
