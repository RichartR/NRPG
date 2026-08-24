'use client';

import { useEffect, useState, useMemo } from 'react';
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

const KANJI_MAP: Record<string, string> = {
  NIN: '忍',
  TAI: '体',
  GEN: '幻',
  INT: '賢',
  FUE: '力',
  AGI: '速',
  EST: '精',
  SM: '印',
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        className="bg-black/95 border border-oro/30 px-4 py-2.5 shadow-[0_0_20px_rgba(223,184,87,0.2)] backdrop-blur-md text-center rounded-sm"
        style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
      >
        <p className="text-caption font-black text-oro/40 tracking-[0.2em] uppercase mb-1">
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

// Renderizador estático pura fuera del ciclo de vida del componente
const renderCustomTick = (props: any) => {
  const { payload, x, y, cx, cy } = props;
  if (!payload) return null;

  const dx = x - cx;
  const dy = y - cy;
  const distance = Math.sqrt(dx * dx + dy * dy) || 1;

  const nx = dx / distance;
  const ny = dy / distance;

  const kanjiOffset = 16;
  const kanjiX = x + nx * kanjiOffset;
  const kanjiY = y + ny * kanjiOffset;

  const abbrOffset = 42;
  const abbrX = x + nx * abbrOffset;
  const abbrY = y + ny * abbrOffset;

  const kanji = KANJI_MAP[payload.value] || '';

  return (
    <g className="select-none pointer-events-none">
      <text
        x={kanjiX}
        y={kanjiY}
        textAnchor="middle"
        dominantBaseline="central"
        className="font-serif font-black"
        style={{
          fontSize: '24px',
          fill: '#FA9427',
          filter: 'drop-shadow(0px 2px 4px rgba(209, 175, 82, 0.56))'
        }}
      >
        {kanji}
      </text>
      <text
        x={abbrX}
        y={abbrY}
        textAnchor="middle"
        dominantBaseline="central"
        className="font-mono font-bold tracking-widest"
        style={{
          fontSize: '10px',
          fill: '#dfb857',
          filter: 'drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.9))'
        }}
      >
        {payload.value}
      </text>
    </g>
  );
};

interface CharacterRadarChartProps {
  stats: CharacterStats;
  maxVal: number;
}

export function CharacterRadarChart({ stats, maxVal }: CharacterRadarChartProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const data = useMemo(() => [
    { subject: 'NIN', value: stats.NIN || 0, fullMark: maxVal, kanji: '忍' },
    { subject: 'TAI', value: stats.TAI || 0, fullMark: maxVal, kanji: '体' },
    { subject: 'GEN', value: stats.GEN || 0, fullMark: maxVal, kanji: '幻' },
    { subject: 'INT', value: stats.INT || 0, fullMark: maxVal, kanji: '賢' },
    { subject: 'FUE', value: stats.FUE || 0, fullMark: maxVal, kanji: '力' },
    { subject: 'AGI', value: stats.AGI || 0, fullMark: maxVal, kanji: '速' },
    { subject: 'EST', value: stats.EST || 0, fullMark: maxVal, kanji: '精' },
    { subject: 'SM', value: stats.SM || 0, fullMark: maxVal, kanji: '印' },
  ], [stats.NIN, stats.TAI, stats.GEN, stats.INT, stats.FUE, stats.AGI, stats.EST, stats.SM, maxVal]);

  if (!mounted) {
    return (
      <div className="w-full h-[380px] flex items-center justify-center text-oro/20 font-black tracking-widest text-xs">
        CARGANDO DIAGRAMA...
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px] sm:max-w-[485px] min-w-0 mx-auto flex items-center justify-center relative my-0">
      <ResponsiveContainer width="100%" aspect={1} minWidth={0}>
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid
            gridType="polygon"
            stroke="#dfb857"
            strokeOpacity={0.25}
            strokeWidth={1}
          />
          <PolarAngleAxis
            dataKey="subject"
            tick={renderCustomTick}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, maxVal]}
            tickCount={maxVal === 10 ? 11 : undefined}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="Estadísticas"
            dataKey="value"
            stroke="#D6852D"
            strokeWidth={2.5}
            fill="#D6852D"
            fillOpacity={0.35}
            activeDot={{ r: 5, stroke: '#dfb857', strokeWidth: 1.5, fill: '#D6852D' }}
            isAnimationActive={false}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
