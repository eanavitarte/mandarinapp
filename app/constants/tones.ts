export interface ToneStyle {
  label: string;
  description: string;
  name: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
  hoverBgClass: string;
  hoverBorderClass: string;
  hex: string;
}

export const TONE_STYLES: Record<number, ToneStyle> = {
  1: {
    label: '1° Tono',
    description: 'Alto sostenido ( ¯ )',
    name: 'Naranja / Ámbar',
    textClass: 'text-orange-600',
    bgClass: 'bg-orange-500/15',
    borderClass: 'border-orange-500/40',
    hoverBgClass: 'hover:bg-orange-50',
    hoverBorderClass: 'hover:border-orange-500',
    hex: '#EA580C'
  },
  2: {
    label: '2° Tono',
    description: 'Ascendente ( ´ )',
    name: 'Verde',
    textClass: 'text-emerald-600',
    bgClass: 'bg-emerald-500/15',
    borderClass: 'border-emerald-500/40',
    hoverBgClass: 'hover:bg-emerald-50',
    hoverBorderClass: 'hover:border-emerald-500',
    hex: '#059669'
  },
  3: {
    label: '3° Tono',
    description: 'Baja y sube ( ˇ )',
    name: 'Rojo',
    textClass: 'text-rose-600',
    bgClass: 'bg-rose-500/15',
    borderClass: 'border-rose-500/40',
    hoverBgClass: 'hover:bg-rose-50',
    hoverBorderClass: 'hover:border-rose-500',
    hex: '#E11D48'
  },
  4: {
    label: '4° Tono',
    description: 'Bajando ( ˋ )',
    name: 'Azul',
    textClass: 'text-sky-600',
    bgClass: 'bg-sky-500/15',
    borderClass: 'border-sky-500/40',
    hoverBgClass: 'hover:bg-sky-50',
    hoverBorderClass: 'hover:border-sky-500',
    hex: '#0284C7'
  },
  5: {
    label: '5° Tono',
    description: 'Neutro ( · )',
    name: 'Gris',
    textClass: 'text-slate-500',
    bgClass: 'bg-slate-400/15',
    borderClass: 'border-slate-400/40',
    hoverBgClass: 'hover:bg-slate-50',
    hoverBorderClass: 'hover:border-slate-400',
    hex: '#64748B'
  }
};

export const getToneStyle = (tone: number): ToneStyle => {
  return TONE_STYLES[tone] || TONE_STYLES[5];
};
