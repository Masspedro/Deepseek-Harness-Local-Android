import {useCurrentFrame, useVideoConfig} from 'remotion';
import {Background, Caption, Eyebrow, Reveal, Title} from '../components/primitives';
import {copy} from '../data';
import {progress} from '../motion';
import {theme} from '../theme';

const Route = ({index, width}: {index: number; width: number}) => {
  const frame = useCurrentFrame();
  const route = copy.path.routes[index];
  const active = progress(frame, 16 + index * 14, 55);
  const x1 = 40;
  const x2 = width - 40;
  return <div style={{marginBottom: 25}}>
    <div style={{color: theme.colors.secondary, fontSize: 26, marginBottom: 14}}>{route.name}</div>
    <svg width={width} height="91" viewBox={`0 0 ${width} 91`}>
      <path d={`M${x1} 21H${x2}`} fill="none" stroke={theme.colors.muted} strokeWidth="2" strokeOpacity="0.35" />
      <path d={`M${x1} 21H${x2}`} fill="none" stroke={theme.colors.secondary} strokeWidth="2"
        pathLength="1" strokeDasharray="1" strokeDashoffset={1 - active} />
      {route.nodes.map((name, i) => {
        const x = x1 + ((x2 - x1) * i) / (route.nodes.length - 1);
        const show = progress(frame, 16 + index * 14 + i * 7, 18);
        return <g key={name} opacity={0.32 + show * 0.68}>
          <circle cx={x} cy="21" r="7" fill={theme.colors.secondary} />
          <text x={x} y="66" textAnchor={i === 0 ? 'start' : i === route.nodes.length - 1 ? 'end' : 'middle'}
            fontFamily={theme.fonts.mono} fontSize="22" fill={theme.colors.secondary}>{name}</text>
        </g>;
      })}
    </svg>
  </div>;
};

const NativePath = ({width}: {width: number}) => {
  const frame = useCurrentFrame();
  const length = width - 80;
  const p = progress(frame, 78, 50);
  return <div>
    <div style={{fontSize: 28, fontWeight: 700, color: theme.colors.text}}>{copy.path.native}</div>
    <svg width={width} height="128" viewBox={`0 0 ${width} 128`}>
      <path d={`M40 58H${width - 40}`} stroke={theme.colors.accent} strokeWidth="4" fill="none"
        pathLength="1" strokeDasharray="1" strokeDashoffset={1 - p} />
      <circle cx="40" cy="58" r="9" fill={theme.colors.accent} />
      <circle cx={40 + length * p} cy="58" r="9" fill={theme.colors.accent} />
      <text x="40" y="109" fill={theme.colors.text} fontSize="24" fontFamily={theme.fonts.sans}>{copy.path.nativeNodes[0]}</text>
      <text x={width - 40} y="109" textAnchor="end" fill={theme.colors.accent} fontSize="24" fontFamily={theme.fonts.mono}>{copy.path.nativeNodes[1]}</text>
      <text x={width / 2} y="36" textAnchor="middle" fill={theme.colors.accent} fontSize="23" fontFamily={theme.fonts.mono}>{copy.path.syscall}</text>
    </svg>
  </div>;
};

export const PathScene = () => {
  const {height, width} = useVideoConfig();
  const portrait = height > width;
  return <Background>
    <Reveal direction="left" style={{position: 'absolute', left: 80, top: portrait ? 124 : 130}}>
      <Eyebrow>{copy.path.eyebrow}</Eyebrow>
      <Title size={portrait ? 92 : 100}>{copy.path.title[0]}<br />{copy.path.title[1]}</Title>
      <Caption size={portrait ? 31 : 32} style={{marginTop: 24, maxWidth: portrait ? 850 : 560}}>{copy.path.sub}</Caption>
    </Reveal>
    <div style={{position: 'absolute', left: portrait ? 80 : 780, top: portrait ? 550 : 135,
      width: portrait ? 920 : 1020}}>
      {copy.path.routes.map((route, index) => <Route key={route.name} index={index} width={portrait ? 920 : 1020} />)}
    </div>
    <Reveal delay={76} style={{position: 'absolute', left: portrait ? 80 : 780,
      top: portrait ? 1110 : 660, width: portrait ? 920 : 1020}}>
      <NativePath width={portrait ? 920 : 1020} />
    </Reveal>
    <Reveal delay={118} style={{position: 'absolute', left: 80, right: 80, top: portrait ? 1375 : 897}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
        <div style={{display: 'flex', gap: 8}}>{[0, 1, 2].map((i) => <div key={i} style={{width: 9, height: 9,
          borderRadius: 9, background: i === 0 ? theme.colors.accent : theme.colors.muted}} />)}</div>
        <Caption size={portrait ? 30 : 28} style={{color: theme.colors.text}}>{copy.path.shared}</Caption>
      </div>
      <Caption size={25} style={{marginTop: 12}}>{copy.path.peers}</Caption>
      <Caption size={22} style={{marginTop: 20}}>{copy.path.disclaimer}</Caption>
    </Reveal>
  </Background>;
};
