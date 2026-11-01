import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface EditorialPictureProps {
  src: string;
  alt: string;
  fallbackLabel: string;
  className?: string;
  imgClassName?: string;
  children?: React.ReactNode;
}

export const EditorialPicture: React.FC<EditorialPictureProps> = ({
  src,
  alt,
  fallbackLabel,
  className = '',
  imgClassName = '',
  children,
}) => {
  const [hasError, setHasError] = useState(false);

  return (
    <div
      className={`relative overflow-hidden bg-[#ECE8DF] dark:bg-[#0D0D10] border border-[#E5E0D8] dark:border-[#1E1D1B] ${className}`}
    >
      {!hasError ? (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className={`w-full h-full object-cover ${imgClassName}`}
        />
      ) : (
        <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center gap-2.5 p-6 bg-gradient-to-br from-[#F2EEE6] to-[#E5DFD3] dark:from-[#121110] dark:to-[#08080A] text-[#6E685F] dark:text-[#8E877C]">
          <BookOpen className="w-6 h-6 text-[#C87D00] dark:text-[#F2B705]" />
          <span className="font-display text-sm font-medium text-center">
            {fallbackLabel}
          </span>
        </div>
      )}

      {children && (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none"
          />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6 text-[#F4EFE6]">
            {children}
          </div>
        </>
      )}
    </div>
  );
};
