import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';
import {card} from '../layout';
import {SceneLayout, ChapterBar, usePortrait} from '../ui';
import {facts, type VolumeRow} from '../data';

const groups: {title: string; caption: string; rows: readonly VolumeRow[]; verdict: string; note: string}[] = [
  {title: '01 / 安装包体积', caption: '用户点下载时看到的数字 · MB', rows: facts.install,
    verdict: '我们不是最小的。', note: '简单包 24 MB + 首启下载 128 MB。\ndsh-phone-root 另需安装 Termux。'},
  {title: '02 / 首次可用总下载', caption: '用户真正付出的流量 · MB', rows: facts.firstUse,
    verdict: '两种包首次总下载均约 150 MB。', note: '完整包 149 MB；简单包首次约 152 MB。\ndsh-phone-root 的 Termux App 另计。'},
  {title: '03 / 解压后磁盘占用', caption: '安装完成后真正吃掉的空间 · MB', rows: facts.extracted,
    verdict: '本作排第 4（从大到小）。', note: 'DSHBox 解压占用未知，未纳入；本作统计运行时。'},
];

export const ScaleScene = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const portrait = usePortrait();
  const index = Math.min(2, Math.floor(frame / (3 * fps)));
  const local = frame - index * 3 * fps;
  const group = groups[index];
  const max = Math.max(...group.rows.map((row) => row.value));
  const rowLabel = portrait ? 38 : 26;
  const rowValue = portrait ? 40 : 30;
  const rowHeroLabel = portrait ? 42 : 32;
  const rowHeroValue = portrait ? 48 : 36;
  const barHeight = portrait ? 16 : 12;
  const heroBarHeight = portrait ? 20 : 14;
  return <AbsoluteFill style={{background: theme.colors.bg}}>
    <AbsoluteFill style={{zIndex: 0, background: `radial-gradient(circle at 65% 45%, ${theme.colors.accent}13, transparent 56%)`}} />
    <SceneLayout eyebrow="THE COMPLETE PICTURE" title={portrait ? ['体积，完整地看。'] : ['体积，', '完整地看。']} titleSize={portrait ? 78 : 68}>
      <div data-layout-stack style={{display: 'flex', flexDirection: 'column', gap: portrait ? 18 : 16}}>
        <div data-layout-block="chart-heading" style={{display: 'flex', flexDirection: 'column', gap: portrait ? 12 : 10}}>
          <div style={{fontSize: portrait ? 50 : 40, lineHeight: 1.16, fontWeight: 700}}>{group.title}</div>
          <div style={{fontSize: portrait ? 36 : 27, lineHeight: 1.3, color: theme.colors.secondary}}>{group.caption}</div>
        </div>
        <div data-layout-block="chart" style={{...card(), padding: portrait ? '22px 26px' : '22px 28px', display: 'flex', flexDirection: 'column', gap: portrait ? 10 : 9}}>
          {group.rows.map((row, rowIndex) => {
            const grow = interpolate(local, [rowIndex * 3, rowIndex * 3 + 40], [0.08, 1], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1),
            });
            return <div key={row.id} data-volume-row={row.id} style={{display: 'flex', flexDirection: 'column', gap: 7}}>
              <div data-layout-siblings style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 18, minHeight: portrait ? 46 : 36}}>
                <span style={{fontSize: row.ours ? rowHeroLabel : rowLabel, lineHeight: 1.16, fontWeight: row.ours ? 700 : 400,
                  color: row.ours ? theme.colors.text : theme.colors.secondary, whiteSpace: 'nowrap'}}>{row.label}</span>
                <span style={{fontFamily: theme.fonts.numeric, fontSize: row.ours ? rowHeroValue : rowValue,
                  fontWeight: row.ours ? 700 : 400, lineHeight: 1.1, flexShrink: 0, color: row.ours ? theme.colors.accent : theme.colors.secondary}}>{row.approximate ? '≈' : ''}{row.value}</span>
              </div>
              <div data-volume-bar style={{height: row.ours ? heroBarHeight : barHeight, borderRadius: 8, overflow: 'hidden', background: theme.colors.surfaceAlt}}>
                <div style={{height: '100%', width: `${row.value / max * grow * 100}%`, borderRadius: 8,
                  background: row.ours ? `linear-gradient(90deg, ${theme.colors.accent}, ${theme.colors.success})` : theme.colors.muted}} />
              </div>
            </div>;
          })}
        </div>
        <div data-layout-block="chart-conclusion" style={{display: 'flex', flexDirection: 'column', gap: 8}}>
          <div style={{fontSize: portrait ? 38 : 31, lineHeight: 1.3, color: theme.colors.success, fontWeight: 700}}>{group.verdict}</div>
          <div style={{fontSize: portrait ? 36 : 25, lineHeight: 1.3, color: theme.colors.secondary, whiteSpace: 'pre-line'}}>{group.note}</div>
        </div>
      </div>
    </SceneLayout>
    <ChapterBar progress={frame / 540} />
  </AbsoluteFill>;
};
