/**
 * 04 Shell —— 0:19–0:24（300 帧）
 *
 * v2 重制：v1 把三条连线（PTY/OCR/SSH）、三个 so 文件名、dex 柱状图、
 * 覆盖率文字、下界说明同时铺开，五类信息抢注意力。
 *
 * v2 规矩：**主角是 dex 体量的对比**（15 倍差距是最强的一击）。
 * 三条能力改成一行三个「亮起的接口」，只给名字不给文件名。
 */
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';
import {type, card, gradientText} from '../layout';
import {Stage, Eyebrow, Headline, Body, ChapterBar} from '../ui';
import {facts} from '../data';

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

const LINKS = [
  {name: '真 PTY', detail: '581 行 C'},
  {name: '自带 OCR', detail: 'MLKit'},
  {name: '内置 SSH', detail: 'ssh2'},
];

export const ShellScene = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const dexMax = 10;
  const oursDex = facts.shell.dex[0];

  return (
    <AbsoluteFill style={{background: theme.colors.bg}}>
      <AbsoluteFill
        style={{background: `radial-gradient(circle at 70% 34%, ${theme.colors.accent}1A 0%, transparent 48%)`}}
      />
      <Stage>
        <Eyebrow delay={0.08}>Same Engine · Native Connections</Eyebrow>
        <Headline lines={['引擎相同。', '路，铺得更完整。']} delay={0.14} size={80} />

        <div style={{height: 52}} />

        {/* 三个接口：一行横排，只给名字 */}
        <div style={{display: 'flex', gap: 16, marginBottom: 52}}>
          {LINKS.map((l, i) => {
            const t = (frame - (0.5 + i * 0.14) * fps) / (0.4 * fps);
            const on = interpolate(t, [0, 1], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: easeOut,
            });
            return (
              <div
                key={l.name}
                style={{
                  flex: 1,
                  padding: '26px 20px',
                  borderRadius: 22,
                  background: theme.colors.surfaceAlt,
                  border: `1.5px solid ${theme.colors.accent}${on > 0.5 ? '55' : '22'}`,
                  opacity: on,
                  translate: `0px ${interpolate(on, [0, 1], ['16px', '0px'], {extrapolateRight: 'clamp'})}`,
                }}
              >
                <div
                  style={{
                    fontFamily: theme.fonts.chinese,
                    fontSize: type.body,
                    fontWeight: 700,
                    color: theme.colors.text,
                    marginBottom: 8,
                  }}
                >
                  {l.name}
                </div>
                <div
                  style={{
                    fontFamily: theme.fonts.mono,
                    fontSize: type.eyebrow,
                    color: theme.colors.accent,
                  }}
                >
                  {l.detail}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── 主角：dex 体量 15 倍差 ── */}
        <div style={{...card({glow: true}), padding: '44px 40px'}}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 30,
            }}
          >
            <span style={{fontFamily: theme.fonts.chinese, fontSize: type.caption, color: theme.colors.muted}}>
              同为 bionic 路线 · 原生代码体量
            </span>
            <span
              style={{
                fontFamily: theme.fonts.numeric,
                fontSize: type.subtitle,
                fontWeight: 600,
                ...gradientText,
              }}
            >
              15×
            </span>
          </div>

          {facts.shell.dex.map((d, i) => {
            const t = (frame - (1.1 + i * 0.12) * fps) / (0.6 * fps);
            const grow = interpolate(t, [0, 1], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: easeOut,
            });
            const pct = (d.value / dexMax) * 100;
            return (
              <div key={d.id} style={{marginBottom: i === facts.shell.dex.length - 1 ? 0 : 22}}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontFamily: theme.fonts.chinese,
                      fontSize: d.ours ? type.body : type.caption,
                      fontWeight: d.ours ? 700 : 400,
                      color: d.ours ? theme.colors.text : theme.colors.secondary,
                    }}
                  >
                    {d.label}
                  </span>
                  <span
                    style={{
                      fontFamily: theme.fonts.numeric,
                      fontSize: d.ours ? type.subtitle : type.body,
                      fontWeight: d.ours ? 600 : 300,
                      fontVariantNumeric: 'tabular-nums',
                      color: d.ours ? theme.colors.accent : theme.colors.muted,
                    }}
                  >
                    {d.value} MB
                  </span>
                </div>
                <div
                  style={{
                    height: d.ours ? 16 : 10,
                    background: theme.colors.surfaceAlt,
                    borderRadius: 8,
                    overflow: 'hidden',
                    display: 'flex',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      flex: `0 0 ${pct * grow}%`,
                      borderRadius: 8,
                      background: d.ours
                        ? `linear-gradient(90deg, ${theme.colors.accent}, ${theme.colors.success})`
                        : theme.colors.muted,
                      opacity: d.ours ? 1 : 0.5,
                      boxShadow: d.ours ? `0 0 24px ${theme.colors.accent}70` : 'none',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{height: 28}} />

        <Body delay={2.2} color={theme.colors.muted} maxWidth="94%">
          我们的实现覆盖 {facts.shell.coverage} 项 / 抽查竞品 {facts.shell.sampledCoverage}。
          特征匹配，下界估计。
        </Body>
              <ChapterBar progress={frame / 300} />
      </Stage>
    </AbsoluteFill>
  );
};
