import type {CSSProperties, ReactNode} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {progress, settle} from '../motion';
import {theme} from '../theme';

export const Background = ({children}: {children: ReactNode}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const drift = Math.sin(frame / 320) * 7;
  return <AbsoluteFill style={{backgroundColor: theme.colors.bg, color: theme.colors.text,
    fontFamily: theme.fonts.sans, overflow: 'hidden'}}>
    <div style={{position: 'absolute', inset: -80, opacity: 0.65,
      background: `radial-gradient(ellipse at ${65 + drift}% 24%, ${theme.colors.accent}0c, transparent 47%), radial-gradient(ellipse at 12% ${78 - drift}%, ${theme.colors.accentAlt}09, transparent 42%)`}} />
    <svg width={width} height={height} style={{position: 'absolute', inset: 0, opacity: 0.08}}>
      <defs><pattern id="ambient-grid" width="88" height="88" patternUnits="userSpaceOnUse" patternTransform={`translate(${frame / 90} ${frame / 180})`}><path d="M88 0H0V88" stroke={theme.colors.secondary} strokeWidth="0.5" fill="none" /></pattern></defs>
      <rect width="100%" height="100%" fill="url(#ambient-grid)" />
    </svg>
    {children}
  </AbsoluteFill>;
};

export const Reveal = ({children, delay = 0, direction = 'up', style}: {
  children: ReactNode; delay?: number; direction?: 'up' | 'left' | 'right'; style?: CSSProperties;
}) => {
  const frame = useCurrentFrame();
  const amount = 1 - settle(frame, delay);
  const x = direction === 'left' ? -24 * amount : direction === 'right' ? 24 * amount : 0;
  const y = direction === 'up' ? 24 * amount : 0;
  return <div style={{...style, opacity: progress(frame, delay, 20), transform: `translate(${x}px,${y}px)`}}>{children}</div>;
};

export const Eyebrow = ({children}: {children: ReactNode}) => <div style={{
  color: theme.colors.secondary, fontFamily: theme.fonts.mono, fontSize: 22,
  letterSpacing: 3.2, lineHeight: 1.4, marginBottom: 20,
}}>{children}</div>;

export const Title = ({children, size = 88, style}: {children: ReactNode; size?: number; style?: CSSProperties}) => <div style={{
  fontFamily: theme.fonts.sans, fontSize: size, fontWeight: 700, letterSpacing: -3,
  lineHeight: 1.13, ...style,
}}>{children}</div>;

export const Caption = ({children, size = 32, style}: {children: ReactNode; size?: number; style?: CSSProperties}) => <div style={{
  color: theme.colors.secondary, fontSize: size, lineHeight: 1.5, ...style,
}}>{children}</div>;

export const CountUp = ({value, delay = 0, duration = 46, decimals = 0, size = 86,
  suffix = '', color = theme.colors.text, prefix = '', style}: {
  value: number; delay?: number; duration?: number; decimals?: number; size?: number;
  suffix?: string; color?: string; prefix?: string; style?: CSSProperties;
}) => {
  const frame = useCurrentFrame();
  const current = value * progress(frame, delay, duration);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(current);
  return <span style={{fontFamily: theme.fonts.numeric, fontWeight: 300, fontSize: size,
    fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.035em', color,
    whiteSpace: 'nowrap', ...style}}>{prefix}{formatted}{suffix}</span>;
};
