/**
 * 06 Depth —— 0:29–0:37（480 帧）
 *
 * v2 重制：v1 把 54 模块星系图、换装状态机、14 补丁、581 行 C、16 探针
 * 五组信息同时铺满，全部用小字，是整片最拥挤的一场。
 *
 * v2 规矩：**两段式**——
 *   前 4 秒：主角是 54（模块数），星系图只作背景纹理
 *   后 4 秒：主角是 581（行 C 代码），数字直接砸出来
 * 每段只有一个主角数字，其余降级。
 */
import {AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';
import {type, gradientText, card} from '../layout';
import {Stage, Eyebrow, Headline, Body, ChapterBar} from '../ui';
import {facts} from '../data';

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

/** 星系图：只作背景纹理，低对比 */
const Starfield = ({frame, fps}: {frame: number; fps: number}) => {
  const nodes = Array.from({length: facts.engineering.modules}, (_, i) => {
    const angle = (i / facts.engineering.modules) * Math.PI * 2;
    const ring = i % 3;
    const r = 130 + ring * 62;
    return {
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r * 0.82,
      d: (i % 8) * 0.045,
    };
  });
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', opacity: 0.16}}>
      {nodes.map((n, i) => {
        const t = (frame - n.d * fps) / (0.5 * fps);
        const o = interpolate(t, [0, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: ring(i) * 5,
              height: ring(i) * 5,
              borderRadius: 99,
              background: i % 3 === 0 ? theme.colors.accent : theme.colors.muted,
              translate: `${n.x}px ${n.y}px`,
              opacity: o,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const ring = (i: number) => (i % 3 === 0 ? 6 : i % 3 === 1 ? 4 : 3);

/** 第一段：54 模块 */
const ModulesSegment = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const count = interpolate(frame, [0.3 * fps, 1.6 * fps], [0, facts.engineering.modules], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });

  return (
    <AbsoluteFill style={{justifyContent: 'center'}}>
      <Starfield frame={frame} fps={fps} />
      <div style={{position: 'relative'}}>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 22}}>
          <span
            style={{
              fontFamily: theme.fonts.numeric,
              fontSize: 190,
              fontWeight: 300,
              lineHeight: 0.94,
              letterSpacing: '-0.05em',
              fontVariantNumeric: 'tabular-nums',
              ...gradientText,
            }}
          >
            {Math.round(count)}
          </span>
          <span style={{fontFamily: theme.fonts.chinese, fontSize: type.subtitle, color: theme.colors.secondary}}>
            个核心模块
          </span>
        </div>
        <div style={{height: 18}} />
        <div style={{fontFamily: theme.fonts.chinese, fontSize: type.body, color: theme.colors.muted}}>
          {facts.engineering.kotlinFiles} 个 Kotlin 文件 · {facts.engineering.lines.toLocaleString('en-US')} 行
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** 第二段：581 行 C */
const PtySegment = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const count = interpolate(frame, [0.2 * fps, 1.4 * fps], [0, facts.engineering.ptyLines], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });
  const detail = interpolate(frame, [1.2 * fps, 1.7 * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{justifyContent: 'center'}}>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 22}}>
        <span
          style={{
            fontFamily: theme.fonts.numeric,
            fontSize: 190,
            fontWeight: 300,
            lineHeight: 0.94,
            letterSpacing: '-0.05em',
            fontVariantNumeric: 'tabular-nums',
            ...gradientText,
          }}
        >
          {Math.round(count)}
        </span>
        <span style={{fontFamily: theme.fonts.chinese, fontSize: type.subtitle, color: theme.colors.secondary}}>
          行 C 代码
        </span>
      </div>
      <div style={{height: 22}} />
      <div
        style={{
          fontFamily: theme.fonts.chinese,
          fontSize: type.body,
          color: theme.colors.muted,
          opacity: detail,
        }}
      >
        只为写一个真的 PTY —— 别人那里是个一调用就抛错的空壳。
      </div>

      <div style={{height: 56}} />

      <div
        style={{
          display: 'flex',
          gap: 48,
          opacity: detail,
          ...card(),
          padding: '34px 38px',
        }}
      >
        {[
          {n: facts.engineering.patches, l: 'Android 适配补丁'},
          {n: facts.engineering.probes, l: '回归探针'},
        ].map((x) => (
          <div key={x.l}>
            <div
              style={{
                fontFamily: theme.fonts.numeric,
                fontSize: type.display,
                fontWeight: 300,
                color: theme.colors.text,
                lineHeight: 1,
              }}
            >
              {x.n}
            </div>
            <div style={{marginTop: 8, fontFamily: theme.fonts.chinese, fontSize: type.caption, color: theme.colors.muted}}>
              {x.l}
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const DepthScene = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const SEG = 4 * fps;

  return (
    <AbsoluteFill style={{background: theme.colors.bg}}>
      <AbsoluteFill
        style={{background: `radial-gradient(circle at 50% 50%, ${theme.colors.accentAlt}12 0%, transparent 52%)`}}
      />
      <Stage>
        <Eyebrow delay={0.06}>Details Make It Work</Eyebrow>
        <Headline lines={['看得见的流畅，', '看不见的工程。']} delay={0.1} size={74} />
        <div style={{height: 44}} />

        <div style={{position: 'relative', flex: 1, minHeight: 0}}>
          <Sequence from={0} durationInFrames={SEG} layout="absolute-fill">
            <ModulesSegment />
          </Sequence>
          <Sequence from={SEG} durationInFrames={SEG} layout="absolute-fill">
            <PtySegment />
          </Sequence>
        </div>

        <Body delay={0.4} color={theme.colors.muted} maxWidth="94%">
          两阶段提交换装：中途被 OEM 杀进程，也不会留下半新半旧的坏状态。
        </Body>
              <ChapterBar progress={frame / 480} />
      </Stage>
    </AbsoluteFill>
  );
};
