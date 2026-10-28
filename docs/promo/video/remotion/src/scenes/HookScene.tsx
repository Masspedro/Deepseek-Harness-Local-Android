/**
 * 01 Hook —— 0:00–0:04（240 帧）
 *
 * v2 重制：v1 竖屏把 5 块内容散在 4 个位置（左上标题 / 右手机 / 左中数字 /
 * 左下注释 / 底部分隔线），字号从 22 跳到 168 毫无层级，手机上眼睛不知道看哪。
 *
 * v2 规矩：**一屏一个焦点** = 3.4 秒。它占垂直中心，字号 210px，
 * 其余元素全部降级为配角（眉标 + 一行来源说明）。
 * 手机录屏在这一场**移除**——它是「真机」佐证，但会和主角数字抢注意力，
 * 移到第 2 场做背景层。
 */
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';
import {type} from '../layout';
import {Stage, Eyebrow, Headline, HeroNumber, Body, ChapterBar} from '../ui';
import {facts} from '../data';

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

export const HookScene = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // 数字从 0 滚到 3.4：占前 1.9 秒，给足「看着它涨」的时间
  const count = interpolate(frame, [0.4 * fps, 2.0 * fps], [0, facts.startup.seconds], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });

  // 光晕在数字落定时亮起，把视线上锁到主角
  const glow = interpolate(frame, [1.7 * fps, 2.5 * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{background: theme.colors.bg}}>
      {/* 背景：以主角为圆心的径向光，形成天然的视觉焦点 */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 34% 54%, ${theme.colors.accent}26 0%, transparent 46%)`,
          opacity: glow,
        }}
      />
      {/* 极缓的横向光带，避免背景死板 */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(105deg, transparent 30%, ${theme.colors.accent}0D 50%, transparent 70%)`,
          translate: `${interpolate(frame, [0, 240], [-8, 8], {extrapolateRight: 'clamp'})}% 0px`,
        }}
      />

      <Stage>
        <Eyebrow delay={0.08}>Android · Native</Eyebrow>

        <Headline lines={['完整 Node.js', 'Agent 引擎。']} delay={0.14} size={92} />

        <div style={{height: 84}} />

        {/* ── 全帧唯一主角：3.4 s ── */}
        <HeroNumber
          value={count.toFixed(1)}
          suffix="s"
          delay={0.25}
          size={type.hero}
          label="冷启动到引擎就绪"
        />

        <div style={{height: 52}} />

        <Body delay={2.0} color={theme.colors.muted} maxWidth="80%">
          {facts.startup.device} · {facts.startup.source}
        </Body>
              <ChapterBar progress={frame / 240} />
      </Stage>
    </AbsoluteFill>
  );
};
