/**
 * 竖屏大字组件库（v2）。
 *
 * 每个组件都遵守同一套规矩：
 * - 字号只用 `type` 阶梯，不出现临时数字
 * - 主角元素自带光晕，配角一律低对比
 * - 进场一律 ease-out + 小幅位移（不超过画面 1/3）
 */
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {ReactNode, CSSProperties} from 'react';
import {theme} from './theme';
import {type, gradientText, card} from './layout';

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

/** 竖屏安全区容器：内容永远落在平台 UI 不会遮挡的带子里 */
export const Stage = ({children, style}: {children: ReactNode; style?: CSSProperties}) => (
  <AbsoluteFill
    style={{
      // 竖屏安全区：顶部 13%、底部 18% 会被平台 UI 遮挡，左右各 8%
      // 内容从上三分之一开始（视线落点），底部由 ChapterBar 收住
      paddingTop: '20%',
      paddingBottom: '18%',
      paddingLeft: '8%',
      paddingRight: '8%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      ...style,
    }}
  >
    {children}
  </AbsoluteFill>
);

/**
 * 底部锚点：画面下方的一个极简进度指示。
 *
 * 为什么需要：竖屏内容集中在上半部时，下半部会空出一大块，
 * 视觉重心上浮、显得「没做完」。底部放一条细进度条既填补空白，
 * 又给观众「还剩多少」的空间感 —— 它是配角，对比度压到很低。
 */
export const ChapterBar = ({progress}: {progress: number}) => (
  <div
    style={{
      position: 'absolute',
      left: '8%',
      right: '8%',
      bottom: '8%',
      height: 3,
      borderRadius: 2,
      background: theme.colors.surfaceAlt,
    }}
  >
    <div
      style={{
        height: '100%',
        width: `${Math.min(1, Math.max(0, progress)) * 100}%`,
        borderRadius: 2,
        background: `linear-gradient(90deg, ${theme.colors.accent}88, ${theme.colors.accent})`,
      }}
    />
  </div>
);

/** 眉标：一行等宽大写小字，给画面一个「章节感」 */
export const Eyebrow = ({children, delay = 0}: {children: ReactNode; delay?: number}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame - delay * fps) / (0.5 * fps);
  return (
    <div
      style={{
        fontFamily: theme.fonts.mono,
        fontSize: type.eyebrow,
        letterSpacing: '0.34em',
        textTransform: 'uppercase',
        color: theme.colors.muted,
        opacity: interpolate(t, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        marginBottom: 28,
      }}
    >
      {children}
    </div>
  );
};

/** 主标题：一屏唯一的文字主角，按行做遮罩上滑 */
export const Headline = ({
  lines,
  delay = 0,
  size = type.title,
  align = 'left',
}: {
  lines: string[];
  delay?: number;
  size?: number;
  align?: 'left' | 'center';
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <div style={{textAlign: align}}>
      {lines.map((line, i) => {
        const t = (frame - (delay + i * 0.09) * fps) / (0.62 * fps);
        const y = interpolate(t, [0, 1], ['115%', '0%'], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: easeOut,
        });
        const op = interpolate(t, [0, 0.55], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <div key={i} style={{overflow: 'hidden', lineHeight: 1.14}}>
            <div
              style={{
                fontFamily: theme.fonts.chinese,
                fontSize: size,
                fontWeight: 700,
                color: theme.colors.text,
                letterSpacing: '-0.02em',
                translate: `0px ${y}`,
                opacity: op,
              }}
            >
              {line}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** 主角数字：整帧的视觉中心，带渐变与轻微放大 */
export const HeroNumber = ({
  value,
  suffix,
  label,
  delay = 0,
  size = type.hero,
}: {
  value: string;
  suffix?: string;
  label?: string;
  delay?: number;
  size?: number;
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame - delay * fps) / (0.7 * fps);
  const scale = interpolate(t, [0, 1], [0.86, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });
  const op = interpolate(t, [0, 0.5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{scale: String(scale), opacity: op, transformOrigin: 'left bottom'}}>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 18}}>
        <span
          style={{
            fontFamily: theme.fonts.numeric,
            fontSize: size,
            fontWeight: 300,
            lineHeight: 1,
            letterSpacing: '-0.045em',
            fontVariantNumeric: 'tabular-nums',
            ...gradientText,
          }}
        >
          {value}
        </span>
        {suffix ? (
          <span
            style={{
              fontFamily: theme.fonts.sans,
              fontSize: size * 0.34,
              fontWeight: 500,
              color: theme.colors.accent,
              lineHeight: 1,
            }}
          >
            {suffix}
          </span>
        ) : null}
      </div>
      {label ? (
        <div
          style={{
            marginTop: 18,
            fontFamily: theme.fonts.chinese,
            fontSize: type.body,
            color: theme.colors.secondary,
            letterSpacing: '0.01em',
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
};

/** 说明文字：比 v1 的 caption 大得多，且限制宽度形成舒适行宽 */
export const Body = ({
  children,
  delay = 0,
  color = theme.colors.secondary,
  maxWidth = '88%',
}: {
  children: ReactNode;
  delay?: number;
  color?: string;
  maxWidth?: string;
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame - delay * fps) / (0.5 * fps);
  return (
    <div
      style={{
        fontFamily: theme.fonts.chinese,
        fontSize: type.body,
        lineHeight: 1.5,
        color,
        maxWidth,
        opacity: interpolate(t, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        translate: interpolate(t, [0, 1], ['0px 18px', '0px 0px'], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: easeOut,
        }),
      }}
    >
      {children}
    </div>
  );
};

/** 玻璃卡片容器，用于承载主角 */
export const Panel = ({
  children,
  delay = 0,
  glow = false,
  style,
}: {
  children: ReactNode;
  delay?: number;
  glow?: boolean;
  style?: CSSProperties;
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = (frame - delay * fps) / (0.6 * fps);
  return (
    <div
      style={{
        ...card({glow}),
        padding: '48px 44px',
        opacity: interpolate(t, [0, 0.4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
        scale: String(
          interpolate(t, [0, 1], [0.96, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: easeOut,
          }),
        ),
        ...style,
      }}
    >
      {children}
    </div>
  );
};
