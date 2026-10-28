import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {theme} from '../theme';
import {gradientText} from '../layout';
import {SceneLayout, ChapterBar, usePortrait} from '../ui';
import {facts, copy} from '../data';

export const EcosystemScene = () => {
  const frame = useCurrentFrame();
  const portrait = usePortrait();
  const count = interpolate(frame, [0, 66], [0, facts.ecosystem.plugins], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const phoneWidth = portrait ? 270 : 292;
  const phoneHeight = Math.round(phoneWidth * 2400 / 1080);
  return <AbsoluteFill style={{background: theme.colors.bg}}>
    <AbsoluteFill style={{zIndex: 0, background: `radial-gradient(circle at 55% 45%, ${theme.colors.accent}1B, transparent 57%)`}} />
    <SceneLayout eyebrow="IN YOUR POCKET" title={['环境与生态，', '一起带走。']}
      footer={copy.ecosystem.note}>
      <div data-layout-siblings style={{display: 'flex', flexDirection: portrait ? 'column' : 'row', alignItems: 'center', gap: portrait ? 18 : 38}}>
        <div data-layout-block="ecosystem-metrics" style={{display: 'flex', flexDirection: 'column', gap: portrait ? 10 : 20, flex: portrait ? '0 0 auto' : 1, alignSelf: portrait ? 'stretch' : 'center', minWidth: 0}}>
          <div style={{fontFamily: theme.fonts.numeric, fontSize: portrait ? 160 : 128, lineHeight: 1.04, fontWeight: 300, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.05em', ...gradientText}}>{Math.round(count).toLocaleString('en-US')}</div>
          <div style={{fontSize: portrait ? 42 : 28, lineHeight: 1.25, color: theme.colors.secondary}}>社区插件 · 一键装卸</div>
          <div style={{fontSize: portrait ? 36 : 24, lineHeight: 1.3, color: theme.colors.secondary}}>{facts.ecosystem.extensions} 项环境扩展<br />{facts.ecosystem.categories} 个分类</div>
        </div>
        <div data-device="phone" style={{width: phoneWidth, height: phoneHeight, flexShrink: 0, padding: 9, boxSizing: 'border-box', borderRadius: 32,
          background: 'linear-gradient(160deg, #2A333F, #141A22)', border: `1px solid ${theme.colors.divider}`, boxShadow: '0 24px 48px -24px #000000BB'}}>
          <Img src={staticFile('assets/05-plugins.png')} style={{width: '100%', height: '100%', display: 'block', borderRadius: 24, objectFit: 'contain'}} />
        </div>
      </div>
    </SceneLayout>
    <ChapterBar progress={frame / 300} />
  </AbsoluteFill>;
};
