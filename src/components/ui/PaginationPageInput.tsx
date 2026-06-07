'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface PaginationPageInputProps {
  currentPage: number;
  totalPages: number;
  isRenegado?: boolean;
  onChangePage?: (page: number) => void;
  urlParamName?: string;
}

export function PaginationPageInput({
  currentPage,
  totalPages,
  isRenegado = false,
  onChangePage,
  urlParamName,
}: PaginationPageInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handlePageSubmit = (valStr: string) => {
    const pageNum = Math.max(1, Math.min(totalPages, Number(valStr) || 1));
    if (onChangePage) {
      onChangePage(pageNum);
    } else if (urlParamName) {
      const params = new URLSearchParams(searchParams.toString());
      params.set(urlParamName, String(pageNum));
      router.replace(`${pathname}?${params.toString()}`);
    }
  };

  return (
    <input
      key={currentPage}
      type="number"
      min={1}
      max={totalPages}
      defaultValue={currentPage}
      onBlur={(e) => handlePageSubmit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handlePageSubmit(e.currentTarget.value);
        }
      }}
      className={`w-14 bg-black/60 border ${
        isRenegado
          ? 'border-rojo-sangre/30 focus:border-rojo-sangre/60 text-rojo-sangre'
          : 'border-oro/30 focus:border-oro/60 text-oro'
      } rounded text-center text-xs font-black outline-none py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-colors`}
    />
  );
}
