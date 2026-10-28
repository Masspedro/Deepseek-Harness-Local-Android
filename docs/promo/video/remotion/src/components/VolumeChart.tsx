/** @deprecated Legacy v1 chart; active video scenes render ScaleScene directly. */
import {useVideoConfig} from 'remotion';
import {Caption, CountUp} from './primitives';
import {copy, type VolumeRow} from '../data';
import {useCurrentFrame} from 'remotion';
import {progress} from '../motion';
import {theme} from '../theme';

export const VolumeChart = ({rows, chartIndex, delay}: {
  rows: readonly VolumeRow[]; chartIndex: number; delay: number;
}) => {
  const frame = useCurrentFrame();
  const {height, width} = useVideoConfig();
  const portrait = height > width;
  const max = Math.max(...rows.map((r) => r.value));
  const fontSize = portrait ? 23 : 22;
  return <div style={{minWidth: 0, flex: 1, padding: portrait ? '18px 28px' : '24px 25px',
    background: `${theme.colors.surface}db`, border: `1px solid ${theme.colors.divider}`, borderRadius: 24}}>
    <div style={{display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'baseline', marginBottom: portrait ? 12 : 22}}>
      <div style={{fontSize: portrait ? 29 : 31, fontWeight: 700, letterSpacing: -1}}>{copy.scale.charts[chartIndex]}</div>
      {portrait && <Caption size={18}>{copy.units.mb}</Caption>}
    </div>
    {!portrait && <Caption size={21} style={{marginBottom: 27}}>{copy.scale.units[chartIndex]} · {copy.units.mb}</Caption>}
    <div style={{display: 'flex', flexDirection: 'column', gap: portrait ? 6 : 16}}>
      {rows.map((row, index) => {
        const localDelay = delay + index * 3;
        const p = progress(frame, localDelay, 40);
        return <div key={row.id} style={{display: 'grid',
          gridTemplateColumns: portrait ? '215px 1fr 93px' : '180px 1fr 76px',
          alignItems: 'center', columnGap: portrait ? 17 : 12, minHeight: portrait ? 24 : 29}}>
          <div style={{fontSize, color: row.ours ? theme.colors.text : theme.colors.secondary,
            whiteSpace: 'nowrap', fontWeight: row.ours ? 700 : 400}}>{row.label}</div>
          <div style={{height: portrait ? 11 : 13, background: theme.colors.bg, position: 'relative'}}>
            <div style={{height: '100%', width: `${(row.value / max) * p * 100}%`,
              background: row.ours ? theme.colors.accent : theme.colors.muted}} />
          </div>
          <div style={{textAlign: 'right'}}><CountUp value={row.value} delay={localDelay} duration={40}
            prefix={row.approximate ? '≈' : ''} size={fontSize + 1}
            color={row.ours ? theme.colors.accent : theme.colors.secondary} /></div>
          {row.note && <div style={{gridColumn: '1 / 4', fontSize: portrait ? 19 : 18,
            color: theme.colors.secondary, marginTop: portrait ? 0 : 4, textAlign: 'right'}}>{row.note}</div>}
        </div>;
      })}
    </div>
    {chartIndex === 2 && <Caption size={portrait ? 18 : 21} style={{marginTop: portrait ? 10 : 18,
      color: theme.colors.text}}>{copy.scale.rankNote}</Caption>}
  </div>;
};
