'use client';

import * as Icons from 'lucide-react';
import { LucideProps } from 'lucide-react';

interface DynamicIconProps extends LucideProps {
  name: string;
}

/**
 * Renderiza un icono de Lucide a partir de su nombre en string.
 * Ejemplo: name="BookOpen" -> <BookOpen />
 */
export default function DynamicIcon({ name, ...props }: DynamicIconProps) {
  const IconComponent = (Icons as any)[name];

  if (!IconComponent) {
    // Icono por defecto si el nombre no existe
    return <Icons.FileText {...props} />;
  }

  return <IconComponent {...props} />;
}
