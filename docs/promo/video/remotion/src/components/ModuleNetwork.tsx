/** @deprecated Legacy v1 module network; active video scenes render DepthScene directly. */
import {useCurrentFrame} from 'remotion';
import {copy, facts} from '../data';
import {progress} from '../motion';
import {theme} from '../theme';

export const ModuleNetwork = ({width = 690, height = 630}: {width?: number; height?: number}) => {
  const frame = useCurrentFrame();
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.30;
  const domains = facts.domains.map((domain, index) => {
    const a = (index / facts.domains.length) * Math.PI * 2 - Math.PI / 2;
    return {...domain, x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius, a};
  });
  return <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
    {domains.map((d, i) => <g key={d.name}>
      <line x1={cx} y1={cy} x2={d.x} y2={d.y} stroke={theme.colors.secondary} strokeOpacity="0.17" />
      {Array.from({length: d.count}, (_, j) => {
        const angle = (j / d.count) * Math.PI * 2 + frame / 1700;
        const x = d.x + Math.cos(angle) * 32;
        const y = d.y + Math.sin(angle) * 32;
        const p = progress(frame, 10 + i * 8 + j * 2, 20);
        return <g key={j}>
          <line x1={d.x} y1={d.y} x2={x} y2={y} stroke={theme.colors.secondary} strokeOpacity="0.18" />
          <circle cx={x} cy={y} r="3.5" fill={theme.colors.accent} opacity={0.16 + p * 0.7} />
        </g>;
      })}
      <circle cx={d.x} cy={d.y} r="8" fill={theme.colors.surfaceAlt} stroke={theme.colors.secondary} />
      <text x={d.x + Math.cos(d.a) * 60} y={d.y + Math.sin(d.a) * 57 + 6}
        textAnchor={Math.cos(d.a) > 0.3 ? 'start' : Math.cos(d.a) < -0.3 ? 'end' : 'middle'}
        fill={theme.colors.secondary} fontSize="19" fontFamily={theme.fonts.sans}>{d.name}</text>
    </g>)}
    <circle cx={cx} cy={cy} r="68" fill={theme.colors.bg} stroke={theme.colors.accent} strokeOpacity="0.65" />
    <text x={cx} y={cy - 2} textAnchor="middle" fill={theme.colors.text} fontFamily={theme.fonts.sans}
      fontWeight="700" fontSize="28">{copy.brand}</text>
    <text x={cx} y={cy + 26} textAnchor="middle" fill={theme.colors.secondary} fontFamily={theme.fonts.mono}
      fontSize="16">{copy.depth.moduleLabel}</text>
  </svg>;
};
