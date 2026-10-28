import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';
import {card} from '../layout';
import {SceneLayout, HeroNumber, ChapterBar, usePortrait} from '../ui';
import {facts} from '../data';

export const HookScene = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const portrait = usePortrait();
  const count = interpolate(frame, [0, 1.2 * fps], [0, facts.startup.seconds], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  return <AbsoluteFill style={{background: theme.colors.bg}}>
    <AbsoluteFill style={{zIndex: 0, background: `radial-gradient(circle at 55% 48%, ${theme.colors.accent}1F, transparent 58%)`}} />
    <SceneLayout eyebrow="ANDROID · NATIVE" title={['完整 Node.js', 'Agent 引擎。']}
      footer={<>{facts.startup.device} · {facts.startup.source}<br />冷启动至引擎就绪，非竞品同条件测试。</>}>
      <div data-layout-stack style={{display: 'flex', flexDirection: 'column', gap: portrait ? 56 : 42}}>
        <HeroNumber value={count.toFixed(1)} suffix="s" size={portrait ? 280 : 238} label="冷启动到引擎就绪" />
        <div style={{...card(), padding: portrait ? 34 : 32, display: 'flex', flexDirection: 'column', gap: 22}}>
          <div style={{fontSize: portrait ? 38 : 26, lineHeight: 1.3}}>在 Android 上，原生运行。</div>
          <div data-layout-siblings style={{display: 'flex', alignItems: 'center', gap: 16, fontFamily: theme.fonts.mono, fontSize: portrait ? 36 : 24, color: theme.colors.accent}}>
            <span>Android</span><span style={{color: theme.colors.muted}}>→</span><span>execve()</span><span style={{color: theme.colors.muted}}>→</span><span>Node.js</span>
          </div>
          <div style={{fontSize: portrait ? 36 : 24, lineHeight: 1.4, color: theme.colors.secondary}}>不用先搭一套 Linux。</div>
        </div>
      </div>
    </SceneLayout>
    <ChapterBar progress={frame / 240} />
  </AbsoluteFill>;
};
