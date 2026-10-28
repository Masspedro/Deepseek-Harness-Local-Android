/**
 * 05 Ecosystem —— 0:24–0:29（300 帧）
 *
 * v2 重制：v1 把 21 / 3540 / 23 三个数字并排、加两台手机截图、
 * 加每台手机的说明文字、加底部免责 —— 数字和截图互相稀释。
 *
 * v2 规矩：**主角是 3,540 这一个数字**（它最有冲击力），占满上半屏；
 * 21 和 23 降级成一行小字；手机截图缩到右下一台，只作佐证。
 */
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig, Img, staticFile} from 'remotion';
import {theme} from '../theme';
import {type, gradientText} from '../layout';
import {Stage, Eyebrow, Headline, Body, ChapterBar} from '../ui';
import {facts} from '../data';

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

/** 手机框：真实截图只做缩放裁剪圆角 */
const Phone = ({src, w}: {src: string; w: number}) => (
  <div
    style={{
      width: w,
      borderRadius: 42,
      padding: 10,
      background: 'linear-gradient(160deg, #2A333F, #141A22)',
      boxShadow: '0 40px 80px -30px #000000CC, 0 0 0 1px #ffffff14 inset',
    }}
  >
    <Img
      src={staticFile(src)}
      style={{width: '100%', borderRadius: 34, display: 'block'}}
    />
  </div>
);

export const EcosystemScene = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const count = interpolate(frame, [0.5 * fps, 1.8 * fps], [0, facts.ecosystem.plugins], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });

  const phoneIn = interpolate(frame, [1.6 * fps, 2.3 * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });

  return (
    <AbsoluteFill style={{background: theme.colors.bg}}>
      <AbsoluteFill
        style={{background: `radial-gradient(circle at 34% 40%, ${theme.colors.accent}1F 0%, transparent 46%)`}}
      />
      <Stage>
        <Eyebrow delay={0.08}>A Workstation in Your Pocket</Eyebrow>
        <Headline lines={['环境与生态，', '一起带走。']} delay={0.14} size={80} />

        <div style={{height: 48}} />

        {/* ── 主角：3,540 ── */}
        <div style={{display: 'flex', alignItems: 'baseline', gap: 20}}>
          <span
            style={{
              fontFamily: theme.fonts.numeric,
              fontSize: 200,
              fontWeight: 300,
              lineHeight: 0.92,
              letterSpacing: '-0.05em',
              fontVariantNumeric: 'tabular-nums',
              ...gradientText,
            }}
          >
            {Math.round(count).toLocaleString('en-US')}
          </span>
        </div>
        <div
          style={{
            fontFamily: theme.fonts.chinese,
            fontSize: type.subtitle,
            color: theme.colors.secondary,
            marginTop: 12,
          }}
        >
          社区插件 · 一键装卸
        </div>

        <div style={{height: 20}} />

        <div
          style={{
            fontFamily: theme.fonts.chinese,
            fontSize: type.body,
            color: theme.colors.muted,
            opacity: interpolate(frame, [1.4 * fps, 1.9 * fps], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          {facts.ecosystem.extensions} 项环境扩展 · {facts.ecosystem.categories} 个分类
        </div>

        <div style={{height: 56}} />

        {/* 佐证：一台手机，右下 */
        }
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: 0}}>
          <div style={{opacity: phoneIn, translate: `0px ${(1 - phoneIn) * 40}px`}}>
            <Phone src="assets/05-plugins.png" w={420} />
          </div>
        </div>

        <div style={{height: 24}} />

        <Body delay={2.2} color={theme.colors.muted} maxWidth="94%">
          目录快照，不代表全部插件兼容 Android。
        </Body>
              <ChapterBar progress={frame / 300} />
      </Stage>
    </AbsoluteFill>
  );
};
