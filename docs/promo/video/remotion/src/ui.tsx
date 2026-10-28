import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {ReactNode, CSSProperties} from 'react';
import {theme} from './theme';
import {type, gradientText, card, stageInsets} from './layout';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

export const usePortrait = () => {
  const {width, height} = useVideoConfig();
  return height > width;
};

// The stage reserves a separate 46/32px lane for the chapter bar.
export const Stage = ({children, style}: {children: ReactNode; style?: CSSProperties}) => {
  const portrait = usePortrait();
  const inset = portrait ? stageInsets.portrait : stageInsets.landscape;
  return <AbsoluteFill data-safe-stage style={{
    boxSizing: 'border-box', paddingTop: inset.top,
    paddingBottom: inset.bottom + (portrait ? 46 : 32),
    paddingLeft: inset.side, paddingRight: inset.side,
    display: 'flex', flexDirection: 'column', color: theme.colors.text,
    fontFamily: theme.fonts.chinese, zIndex: 1, ...style,
  }}>{children}</AbsoluteFill>;
};

export const SceneLayout = ({eyebrow, title, children, footer, titleSize}: {
  eyebrow: string; title: string[]; children: ReactNode; footer?: ReactNode; titleSize?: number;
}) => {
  const portrait = usePortrait();
  return <Stage>
    <div data-layout-stack style={{display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: portrait ? 24 : 28}}>
      <div data-layout-siblings style={{display: 'flex', flexDirection: portrait ? 'column' : 'row', flex: 1, minHeight: 0, gap: portrait ? 28 : 70}}>
        <div data-layout-block="heading" style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: portrait ? '0 0 auto' : '0 0 520px', minWidth: 0}}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <Headline lines={title} size={titleSize ?? (portrait ? 84 : 68)} />
        </div>
        <div data-layout-block="main" style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, minWidth: 0, minHeight: 0}}>{children}</div>
      </div>
      {footer ? <div data-layout-block="footer" style={{flexShrink: 0, color: theme.colors.secondary, fontSize: portrait ? 36 : 26, lineHeight: 1.4}}>{footer}</div> : null}
    </div>
  </Stage>;
};

export const ChapterBar = ({progress}: {progress: number}) => {
  const portrait = usePortrait();
  const inset = portrait ? stageInsets.portrait : stageInsets.landscape;
  return <div data-chapter-bar style={{position: 'absolute', left: inset.side, right: inset.side,
    bottom: inset.bottom + 18, height: 3, background: theme.colors.surfaceAlt, borderRadius: 2, zIndex: 2}}>
    <div style={{height: '100%', width: `${Math.min(1, Math.max(0, progress)) * 100}%`, borderRadius: 2,
      background: `linear-gradient(90deg, ${theme.colors.accent}88, ${theme.colors.accent})`}} />
  </div>;
};

export const Eyebrow = ({children, delay = 0}: {children: ReactNode; delay?: number}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const portrait = usePortrait();
  return <div style={{fontFamily: theme.fonts.mono, fontSize: portrait ? 36 : 24, lineHeight: 1.3,
    letterSpacing: '0.15em', textTransform: 'uppercase', color: theme.colors.secondary,
    marginBottom: portrait ? 18 : 22, flexShrink: 0,
    opacity: interpolate(frame, [delay * fps, delay * fps + 24], [0.72, 1], clamp)}}>{children}</div>;
};

export const Headline = ({lines, delay = 0, size = type.title, align = 'left'}: {
  lines: readonly string[]; delay?: number; size?: number; align?: 'left' | 'center';
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return <div data-text-block style={{textAlign: align, fontFamily: theme.fonts.chinese, fontSize: size,
    fontWeight: 700, lineHeight: 1.14, letterSpacing: '-0.025em', color: theme.colors.text,
    display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0,
    opacity: interpolate(frame, [delay * fps, delay * fps + 28], [0.72, 1], clamp)}}>
    {lines.map((line) => <div key={line}>{line}</div>)}
  </div>;
};

export const HeroNumber = ({value, suffix, label, delay = 0, size = type.hero}: {
  value: string; suffix?: string; label?: string; delay?: number; size?: number;
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const portrait = usePortrait();
  return <div style={{opacity: interpolate(frame, [delay * fps, delay * fps + 32], [0.72, 1], clamp)}}>
    <div data-text-block style={{display: 'flex', alignItems: 'baseline', gap: 18}}>
      <span style={{fontFamily: theme.fonts.numeric, fontSize: size, fontWeight: 300, lineHeight: 1.05,
        letterSpacing: '-0.045em', fontVariantNumeric: 'tabular-nums', ...gradientText}}>{value}</span>
      {suffix ? <span style={{fontSize: size * 0.3, lineHeight: 1, color: theme.colors.accent}}>{suffix}</span> : null}
    </div>
    {label ? <div data-text-block style={{marginTop: 10, fontSize: portrait ? 45 : 38, lineHeight: 1.3, color: theme.colors.secondary}}>{label}</div> : null}
  </div>;
};

export const Body = ({children, delay = 0, color = theme.colors.secondary, maxWidth = '100%'}: {
  children: ReactNode; delay?: number; color?: string; maxWidth?: string;
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const portrait = usePortrait();
  return <div data-text-block style={{fontFamily: theme.fonts.chinese, fontSize: portrait ? 36 : 28,
    lineHeight: 1.4, color, maxWidth, flexShrink: 0,
    opacity: interpolate(frame, [delay * fps, delay * fps + 28], [0.72, 1], clamp)}}>{children}</div>;
};

export const Panel = ({children, delay = 0, glow = false, style}: {
  children: ReactNode; delay?: number; glow?: boolean; style?: CSSProperties;
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return <div style={{...card({glow}), padding: 32,
    opacity: interpolate(frame, [delay * fps, delay * fps + 28], [0.72, 1], {...clamp, easing: easeOut}), ...style}}>{children}</div>;
};
