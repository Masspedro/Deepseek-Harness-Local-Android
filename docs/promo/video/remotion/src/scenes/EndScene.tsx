import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {theme} from '../theme';
import {gradientText} from '../layout';
import {Stage, Eyebrow, ChapterBar, usePortrait} from '../ui';
import {copy} from '../data';

export const EndScene = () => {
  const frame = useCurrentFrame();
  const portrait = usePortrait();
  const opacity = interpolate(frame, [0, 36], [0.72, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const titleSize = portrait ? 86 : 100;
  return <AbsoluteFill style={{background: theme.colors.bg}}>
    <AbsoluteFill style={{zIndex: 0, background: `radial-gradient(circle at 50% 42%, ${theme.colors.accent}22, transparent 58%)`}} />
    <Stage style={{justifyContent: 'center', alignItems: portrait ? 'stretch' : 'center'}}>
      <div data-layout-stack style={{display: 'flex', flexDirection: 'column', alignItems: portrait ? 'flex-start' : 'center',
        width: '100%', maxWidth: portrait ? '100%' : 1500, gap: portrait ? 30 : 28, textAlign: portrait ? 'left' : 'center', opacity}}>
        <Eyebrow>DSH Mobile</Eyebrow>
        <div data-layout-block="end-title" style={{fontFamily: theme.fonts.sans, fontSize: titleSize, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.035em'}}>
          <div>DeepSeek Harness.</div>
          <div style={{marginTop: 8, ...gradientText}}>Now in your pocket.</div>
        </div>
        <div data-layout-block="end-positioning" style={{fontSize: portrait ? 49 : 39, lineHeight: 1.4, color: theme.colors.secondary}}>完整 Agent 引擎，在 Android 上原生运行。</div>
        <div data-layout-siblings style={{display: 'flex', gap: portrait ? 14 : 22, flexWrap: 'wrap', marginTop: portrait ? 12 : 4}}>
          {copy.end.no.map((name) => <div key={name} style={{padding: portrait ? '18px 22px' : '17px 26px', borderRadius: 18,
            background: theme.colors.surfaceAlt, border: `1px solid ${theme.colors.accent}55`, fontFamily: theme.fonts.sans,
            fontSize: portrait ? 42 : 33, lineHeight: 1.1, fontWeight: 700, color: theme.colors.accent}}>{name}</div>)}
        </div>
        <div data-layout-block="end-download" style={{display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8}}>
          <div style={{fontSize: portrait ? 36 : 24, lineHeight: 1.4}}>完整包 149 MB · 无需二次下载 · Android 8.0 → 16</div>
          <div style={{fontSize: portrait ? 38 : 26, lineHeight: 1.4, color: theme.colors.secondary, overflowWrap: 'anywhere'}}>github.com/Soodok/Deepseek-Harness-Local-Android</div>
          <div style={{fontSize: portrait ? 36 : 24, lineHeight: 1.4, color: theme.colors.secondary}}>{copy.end.boundary}</div>
        </div>
      </div>
    </Stage>
    <ChapterBar progress={frame / 420} />
  </AbsoluteFill>;
};
