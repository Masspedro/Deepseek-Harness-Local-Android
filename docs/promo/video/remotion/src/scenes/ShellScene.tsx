import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {theme} from '../theme';
import {card, gradientText} from '../layout';
import {SceneLayout, ChapterBar, usePortrait} from '../ui';
import {facts, copy} from '../data';

const links = [
  {name: '真 PTY', detail: `${facts.engineering.ptyLines} 行 C`},
  {name: '自带 OCR', detail: 'MLKit'},
  {name: '内置 SSH', detail: 'ssh2'},
];

export const ShellScene = () => {
  const frame = useCurrentFrame();
  const portrait = usePortrait();
  return <AbsoluteFill style={{background: theme.colors.bg}}>
    <AbsoluteFill style={{zIndex: 0, background: `radial-gradient(circle at 68% 48%, ${theme.colors.accent}18, transparent 58%)`}} />
    <SceneLayout eyebrow="NATIVE CONNECTIONS" title={['引擎相同。', '路，铺得更完整。']} titleSize={portrait ? 78 : 65}
      footer={<><span style={{color: theme.colors.text}}>我们的实现覆盖 {facts.shell.coverage} 项 / 抽查竞品 {facts.shell.sampledCoverage}。</span><br />{copy.shell.lowerBound}</>}>
      <div data-layout-stack style={{display: 'flex', flexDirection: 'column', gap: portrait ? 28 : 32}}>
        <div data-layout-siblings style={{display: 'flex', gap: portrait ? 14 : 18}}>
          {links.map((link) => <div key={link.name} style={{flex: 1, minWidth: 0, padding: portrait ? '24px 18px' : '28px 22px',
            borderRadius: 20, background: theme.colors.surfaceAlt, border: `1px solid ${theme.colors.accent}44`, display: 'flex', flexDirection: 'column', gap: 12}}>
            <div style={{fontSize: portrait ? 38 : 28, lineHeight: 1.2, fontWeight: 700, whiteSpace: 'nowrap'}}>{link.name}</div>
            <div style={{fontSize: portrait ? 36 : 24, lineHeight: 1.2, fontFamily: theme.fonts.mono, color: theme.colors.accent}}>{link.detail}</div>
          </div>)}
        </div>
        <div style={{...card({glow: true}), padding: portrait ? '30px 28px' : '34px 32px', display: 'flex', flexDirection: 'column', gap: portrait ? 26 : 30}}>
          <div data-layout-siblings style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 20}}>
            <span style={{fontSize: portrait ? 36 : 24, lineHeight: 1.3, color: theme.colors.secondary}}>同为 bionic 路线 · dex 体量</span>
            <span style={{fontFamily: theme.fonts.numeric, fontSize: portrait ? 55 : 50, lineHeight: 1, fontWeight: 700, ...gradientText}}>15×</span>
          </div>
          {facts.shell.dex.map((dex, index) => {
            const grow = interpolate(frame, [12 + index * 7, 65 + index * 7], [0.12, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)});
            return <div key={dex.id} style={{display: 'flex', flexDirection: 'column', gap: 12}}>
              <div data-layout-siblings style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 20}}>
                <span style={{fontSize: portrait ? (dex.ours ? 42 : 38) : 26, lineHeight: 1.2,
                  fontWeight: dex.ours ? 700 : 400, color: dex.ours ? theme.colors.text : theme.colors.secondary}}>{dex.label}</span>
                <span style={{fontFamily: theme.fonts.numeric, fontSize: portrait ? (dex.ours ? 50 : 40) : 28, lineHeight: 1,
                  fontWeight: dex.ours ? 700 : 400, color: dex.ours ? theme.colors.accent : theme.colors.secondary}}>{dex.value} MB</span>
              </div>
              <div style={{height: dex.ours ? 14 : 10, borderRadius: 8, background: theme.colors.surfaceAlt, overflow: 'hidden'}}>
                <div style={{height: '100%', width: `${dex.value / 10 * grow * 100}%`, borderRadius: 8,
                  background: dex.ours ? `linear-gradient(90deg, ${theme.colors.accent}, ${theme.colors.success})` : theme.colors.muted}} />
              </div>
            </div>;
          })}
          <div style={{fontSize: portrait ? 36 : 24, color: theme.colors.secondary, lineHeight: 1.35}}>{copy.shell.dexNote}</div>
        </div>
      </div>
    </SceneLayout>
    <ChapterBar progress={frame / 300} />
  </AbsoluteFill>;
};
