import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {theme} from '../theme';
import {card} from '../layout';
import {SceneLayout, ChapterBar, usePortrait} from '../ui';
import {copy} from '../data';

const routes = [
  {name: 'Termux', nodes: ['Perl / bash', 'apt', '环境初始化', 'Node']},
  {name: 'proot + Ubuntu', nodes: ['proot', 'glibc', '发行版', 'Node']},
  {name: '冻结快照', nodes: ['解压 rootfs', '路径重定位', 'Node']},
];

export const PathScene = () => {
  const frame = useCurrentFrame();
  const portrait = usePortrait();
  return <AbsoluteFill style={{background: theme.colors.bg}}>
    <AbsoluteFill style={{zIndex: 0, background: `radial-gradient(circle at 65% 55%, ${theme.colors.accent}18, transparent 58%)`}} />
    <SceneLayout eyebrow="LESS BETWEEN" title={['把路径，', '拉成直线。']}
      footer={<><span style={{color: theme.colors.accent}}>{copy.path.shared}</span><br />{copy.path.peers} · {copy.path.disclaimer}</>}>
      <div style={{...card(), padding: portrait ? 30 : 32, display: 'flex', flexDirection: 'column', gap: portrait ? 28 : 32}}>
        {routes.map((route, index) => {
          const lit = interpolate(frame, [index * 12, index * 12 + 35], [0.25, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          return <div key={route.name} style={{display: 'flex', flexDirection: 'column', gap: 14}}>
            <div style={{fontSize: portrait ? 38 : 32, lineHeight: 1.2, color: theme.colors.secondary}}>{route.name}</div>
            <div data-layout-siblings style={{display: 'flex', alignItems: 'center', gap: 10, minWidth: 0}}>
              {route.nodes.map((node, nodeIndex) => <div key={node} style={{display: 'flex', alignItems: 'center', gap: 10, flex: nodeIndex === route.nodes.length - 1 ? '0 0 auto' : 1, minWidth: 0}}>
                <div style={{flexShrink: 0, padding: portrait ? '10px 12px' : '8px 10px', borderRadius: 12,
                  background: theme.colors.surfaceAlt, border: `1px solid ${theme.colors.divider}`, fontSize: portrait ? 36 : 24,
                  color: theme.colors.secondary, lineHeight: 1.15, whiteSpace: 'nowrap'}}>{node}</div>
                {nodeIndex < route.nodes.length - 1 ? <div style={{height: 2, flex: 1, minWidth: 12, background: theme.colors.muted, opacity: lit * 0.6}} /> : null}
              </div>)}
            </div>
          </div>;
        })}
        <div style={{borderTop: `1px solid ${theme.colors.divider}`, paddingTop: 28, display: 'flex', flexDirection: 'column', gap: 18}}>
          <div data-layout-siblings style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 20}}>
            <span style={{fontSize: portrait ? 42 : 36, fontWeight: 700}}>本作 · bionic 直跑</span>
            <span style={{fontFamily: theme.fonts.mono, color: theme.colors.accent, fontSize: portrait ? 36 : 24}}>execve()</span>
          </div>
          <div data-layout-siblings style={{display: 'flex', alignItems: 'center', gap: 18}}>
            <span style={{fontSize: portrait ? 36 : 24, color: theme.colors.secondary}}>Android</span>
            <div style={{height: 8, borderRadius: 5, flex: 1, background: `linear-gradient(90deg, ${theme.colors.accent}, ${theme.colors.success})`,
              scale: `${interpolate(frame, [22, 75], [0.1, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})} 1`, transformOrigin: 'left center'}} />
            <span style={{fontSize: portrait ? 36 : 24, color: theme.colors.success}}>Node.js</span>
          </div>
        </div>
      </div>
    </SceneLayout>
    <ChapterBar progress={frame / 360} />
  </AbsoluteFill>;
};
