/**
 * 07 End —— 0:37–0:44（420 帧）
 *
 * v2 重制：v1 结尾放了标语、三个 No、Android 版本、下载链接、
 * 一台手机、模型 API 边界说明 —— 六块内容同时在场。
 *
 * v2 规矩：**主角是标语**（大字、居中偏上），
 * 三个 No 做成一行大号标签，其余信息压到底部一行小字。
 */
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';
import {type, gradientText} from '../layout';
import {Eyebrow, Body, ChapterBar} from '../ui';

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

const NOS = ['No Root', 'No Termux', 'No PC'];

export const EndScene = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const t1 = (frame - 0.3 * fps) / (0.8 * fps);
  const titleOp = interpolate(t1, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const titleY = interpolate(t1, [0, 1], ['40px', '0px'], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });

  const glow = interpolate(frame, [1.4 * fps, 2.6 * fps], [0.2, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{background: theme.colors.bg}}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 40%, ${theme.colors.accent}26 0%, transparent 56%)`,
          opacity: glow,
        }}
      />
      <AbsoluteFill
        style={{
          paddingTop: '18%',
          paddingBottom: '16%',
          paddingLeft: '9%',
          paddingRight: '9%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <Eyebrow delay={0.1}>DSH Mobile</Eyebrow>

        {/* ── 主角：标语 ── */}
        <div style={{opacity: titleOp, translate: `0px ${titleY}`}}>
          <div
            style={{
              fontFamily: theme.fonts.sans,
              fontSize: 86,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: '-0.035em',
              color: theme.colors.text,
            }}
          >
            DeepSeek Harness.
          </div>
          <div
            style={{
              fontFamily: theme.fonts.sans,
              fontSize: 86,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: '-0.035em',
              marginTop: 6,
              ...gradientText,
            }}
          >
            Now in your pocket.
          </div>
        </div>

        <div style={{height: 26}} />

        <div
          style={{
            fontFamily: theme.fonts.chinese,
            fontSize: type.subtitle,
            color: theme.colors.secondary,
            opacity: interpolate(frame, [1.0 * fps, 1.5 * fps], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          完整 Agent 引擎，在 Android 上原生运行。
        </div>

        <div style={{height: 88}} />

        {/* 三个 No：一行大标签 */}
        <div style={{display: 'flex', gap: 18}}>
          {NOS.map((n, i) => {
            const t = (frame - (1.3 + i * 0.16) * fps) / (0.5 * fps);
            const o = interpolate(t, [0, 1], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: easeOut,
            });
            return (
              <div
                key={n}
                style={{
                  padding: '22px 26px',
                  borderRadius: 20,
                  background: theme.colors.surfaceAlt,
                  border: `1.5px solid ${theme.colors.accent}44`,
                  fontFamily: theme.fonts.sans,
                  fontSize: type.body,
                  fontWeight: 600,
                  color: theme.colors.accent,
                  opacity: o,
                  translate: `0px ${interpolate(o, [0, 1], ['20px', '0px'], {extrapolateRight: 'clamp'})}`,
                }}
              >
                {n}
              </div>
            );
          })}
        </div>

        <div style={{height: 44}} />

        <Body delay={2.3} color={theme.colors.text} maxWidth="94%">
          完整包 149 MB · 无需二次下载 · Android 8.0 → 16
        </Body>

        <div style={{height: 18}} />

        <Body delay={2.6} color={theme.colors.muted} maxWidth="94%">
          github.com/Soodok/Deepseek-Harness-Local-Android
        </Body>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
