/** @deprecated Legacy v1 runtime swap diagram; active video scenes render DepthScene directly. */
import {useCurrentFrame} from 'remotion';
import {Caption} from './primitives';
import {copy} from '../data';
import {progress} from '../motion';
import {theme} from '../theme';

export const RuntimeSwap = ({portrait}: {portrait: boolean}) => {
  const frame = useCurrentFrame();
  const start = 156;
  const selected = Math.max(0, Math.min(4, Math.floor((frame - start) / 28)));
  const w = portrait ? 920 : 980;
  const nodeW = portrait ? 158 : 165;
  const gap = (w - nodeW * 5) / 4;
  const recover = progress(frame, 310, 28);
  return <div style={{padding: '26px 0', borderTop: `1px solid ${theme.colors.divider}`}}>
    <div style={{fontSize: portrait ? 30 : 30, fontWeight: 700, marginBottom: 12}}>{copy.depth.swapTitle}</div>
    <Caption size={portrait ? 23 : 24}>{copy.depth.swapNote}</Caption>
    <svg width={w} height={portrait ? 177 : 177} viewBox={`0 0 ${w} 177`} style={{marginTop: 12}}>
      <line x1="30" y1="55" x2={w - 30} y2="55" stroke={theme.colors.muted} strokeOpacity="0.4" />
      {copy.depth.states.map((state, index) => {
        const x = index * (nodeW + gap);
        const on = progress(frame, start + index * 28, 22);
        const active = selected === index && frame >= start;
        const color = index === 4 ? theme.colors.success : theme.colors.accent;
        return <g key={state.code} opacity={0.3 + on * 0.7}>
          <rect x={x} y="22" width={nodeW} height="65" rx="12" fill={theme.colors.surface}
            stroke={active ? color : theme.colors.muted} strokeWidth={active ? 2 : 1} />
          <text x={x + nodeW / 2} y="62" textAnchor="middle" fontFamily={theme.fonts.mono}
            fontSize="22" fill={index === 4 ? theme.colors.success : theme.colors.text}>{state.code}</text>
          <text x={x + nodeW / 2} y="119" textAnchor="middle" fontFamily={theme.fonts.sans}
            fontSize="18" fill={theme.colors.secondary}>{state.label}</text>
        </g>;
      })}
      <path d={`M${nodeW + gap + nodeW / 2} 134V155H${nodeW / 2}V134`} fill="none"
        stroke={theme.colors.muted} opacity={recover} />
      <text x={w - 2} y="163" textAnchor="end" fontFamily={theme.fonts.sans} fontSize="20"
        fill={theme.colors.secondary} opacity={recover}>{copy.depth.recovery}</text>
    </svg>
  </div>;
};
