'use client';

import { useEffect, useState } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { CharacterStats } from '@/domain/types';

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div 
        className="bg-black/95 border border-oro/30 px-4 py-2.5 shadow-[0_0_20px_rgba(223,184,87,0.2)] backdrop-blur-md text-center rounded-sm"
        style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
      >
        <p className="text-[9px] font-black text-oro/40 tracking-[0.2em] uppercase mb-1">
          {data.subject} ({data.kanji})
        </p>
        <p className="text-xl font-black text-oro italic leading-none">
          {data.value}
          <span className="text-oro/20 text-xs ml-1.5 font-normal">/ {data.fullMark}</span>
        </p>
      </div>
    );
  }
  return null;
};

interface CharacterRadarChartProps {
  stats: CharacterStats;
  maxVal: number;
}

export function CharacterRadarChart({ stats, maxVal }: CharacterRadarChartProps) {
  const [mounted, setMounted] = useState(false);

  // Evitar advertencias de hidratación de SSR y IDs duplicados en Next.js
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-[380px] flex items-center justify-center text-oro/20 font-black tracking-widest text-xs">
        CARGANDO DIAGRAMA...
      </div>
    );
  }

  // Orden exacto de las 8 estadísticas (en sentido horario, empezando desde las 12 en punto)
  // 1. NIN (忍) - 12:00
  // 2. TAI (体) - 01:30
  // 3. GEN (幻) - 03:00
  // 4. INT (賢) - 04:30
  // 5. FUE (力) - 06:00
  // 6. AGI (速) - 07:30
  // 7. EST (精) - 09:00
  // 8. SM (印) - 10:30
  const data = [
    { subject: 'NIN', value: stats.NIN || 0, fullMark: maxVal, kanji: '忍' },
    { subject: 'TAI', value: stats.TAI || 0, fullMark: maxVal, kanji: '体' },
    { subject: 'GEN', value: stats.GEN || 0, fullMark: maxVal, kanji: '幻' },
    { subject: 'INT', value: stats.INT || 0, fullMark: maxVal, kanji: '賢' },
    { subject: 'FUE', value: stats.FUE || 0, fullMark: maxVal, kanji: '力' },
    { subject: 'AGI', value: stats.AGI || 0, fullMark: maxVal, kanji: '速' },
    { subject: 'EST', value: stats.EST || 0, fullMark: maxVal, kanji: '精' },
    { subject: 'SM', value: stats.SM || 0, fullMark: maxVal, kanji: '印' },
  ];

  // Renderizado personalizado de las etiquetas (ticks) usando vectores para desplazarlas radialmente
  const renderCustomTick = (props: any) => {
    const { payload, x, y, cx, cy, index } = props;
    if (!payload) return null;

    // Calcular vector de dirección desde el centro
    const dx = x - cx;
    const dy = y - cy;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Vector unitario normalizado
    const nx = dx / distance;
    const ny = dy / distance;

    // Ajustar las distancias (en píxeles) para alejar las etiquetas del gráfico y separarlas entre sí
    const kanjiOffset = 16; 
    const kanjiX = x + nx * kanjiOffset;
    const kanjiY = y + ny * kanjiOffset;

    const abbrOffset = 42;
    const abbrX = x + nx * abbrOffset;
    const abbrY = y + ny * abbrOffset;

    const item = data[index];
    const kanji = item ? item.kanji : '';

    return (
      <g className="select-none pointer-events-none">
        {/* Kanji grande en rojo brillante */}
        <text
          x={kanjiX}
          y={kanjiY}
          textAnchor="middle"
          dominantBaseline="central"
          className="font-serif font-black"
          style={{
            fontSize: '24px',
            fill: '#ef4444', // Rojo brillante / rojo-sangre
            filter: 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.9))'
          }}
        >
          {kanji}
        </text>
        {/* Abreviación pequeña en oro */}
        <text
          x={abbrX}
          y={abbrY}
          textAnchor="middle"
          dominantBaseline="central"
          className="font-mono font-bold tracking-widest"
          style={{
            fontSize: '10px',
            fill: '#dfb857', // Oro
            filter: 'drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.9))'
          }}
        >
          {payload.value}
        </text>
      </g>
    );
  };

  return (
    <div className="w-full max-w-[485px] min-w-0 mx-auto flex items-center justify-center relative my-0">
      <ResponsiveContainer width="100%" aspect={1} minWidth={0}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          {/* Rejilla octagonal en oro sutil y líneas radiales */}
          <PolarGrid 
            gridType="polygon"
            stroke="#dfb857"
            strokeOpacity={0.25}
            strokeWidth={1}
          />
          {/* Ejes angulares con nuestro renderizador de Kanji y Abreviación */}
          <PolarAngleAxis 
            dataKey="subject" 
            tick={renderCustomTick}
          />
          {/* Eje de radio invisible para guiar los límites dinámicos */}
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, maxVal]} 
            tickCount={maxVal === 10 ? 11 : undefined}
            tick={false}
            axisLine={false}
          />
          {/* Polígono de estadísticas del Shinobi en rojo sangre con borde */}
          <Radar
            name="Estadísticas"
            dataKey="value"
            stroke="#ef4444"
            strokeWidth={2.5}
            fill="#ef4444"
            fillOpacity={0.3}
            activeDot={{ r: 5, stroke: '#dfb857', strokeWidth: 1.5, fill: '#ef4444' }}
          />
          {/* Tooltip premium personalizado al pasar el ratón */}
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
