import {useCurrentFrame, useVideoConfig} from 'remotion';
import {Background, Caption, CountUp, Eyebrow, Reveal, Title} from '../components/primitives';
import {copy, facts} from '../data';
import {progress} from '../motion';
import {theme} from '../theme';

const NativeBridge = ({portrait}: {portrait: boolean}) => {
  const frame = useCurrentFrame();
  const w = portrait ? 920 : 980;
  const top = portrait ? 160 : 180;
  return <div style={{position: 'relative', height: portrait ? 400 : 500}}>
    <svg width={w} height={portrait ? 400 : 500}>
      {[0, 1, 2].map((i) => <path key={i} d={`M210 ${top} C330 ${top}, 350 ${68 + i * 128}, 450 ${68 + i * 128}`}
        fill="none" stroke={theme.colors.accent} strokeOpacity={progress(frame, 10 + i * 12, 35) * 0.55}
        strokeWidth="2" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress(frame, 10 + i * 12, 35)} />)}
    </svg>
    <div style={{position: 'absolute', left: 0, top: top - 64, width: 210, height: 128,
      boxSizing: 'border-box', border: `1px solid ${theme.colors.muted}`, borderRadius: 20,
      background: theme.colors.surface, padding: '28px 20px'}}>
      <div style={{fontSize: 27, fontWeight: 700}}>{copy.shell.engine}</div>
      <Caption size={19} style={{marginTop: 10}}>{copy.shell.intent}</Caption>
    </div>
    {copy.shell.bridges.map((bridge, i) => <Reveal key={bridge.name} delay={22 + i * 12} direction="right"
      style={{position: 'absolute', left: 450, top: 15 + i * 128, right: 0}}>
      <div style={{borderLeft: `2px solid ${theme.colors.accent}`, paddingLeft: 22}}>
        <div style={{fontSize: 29, fontWeight: 700}}>{bridge.name}</div>
        <Caption size={22}>{bridge.detail}</Caption>
        <div style={{fontFamily: theme.fonts.mono, fontSize: 18, color: theme.colors.muted, marginTop: 5}}>{bridge.library}</div>
      </div>
    </Reveal>)}
  </div>;
};

const DexEvidence = () => {
  const frame = useCurrentFrame();
  return <div>
    <Caption size={27} style={{color: theme.colors.text, marginBottom: 23}}>{copy.shell.dexTitle}</Caption>
    {facts.shell.dex.map((row, i) => <div key={row.id} style={{marginBottom: 18}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8}}>
        <span style={{fontSize: 24, color: row.ours ? theme.colors.text : theme.colors.secondary}}>{row.label}</span>
        <CountUp value={row.value} decimals={1} delay={44 + i * 7} suffix={` ${copy.units.mb}`}
          size={row.ours ? 46 : 29} color={row.ours ? theme.colors.accent : theme.colors.secondary} />
      </div>
      <div style={{height: 12, background: theme.colors.surfaceAlt}}><div style={{height: '100%',
        width: `${row.value / 9.3 * progress(frame, 44 + i * 7, 43) * 100}%`,
        background: row.ours ? theme.colors.accent : theme.colors.muted}} /></div>
    </div>)}
    <Caption size={21} style={{marginTop: 23}}>{copy.shell.dexNote}</Caption>
  </div>;
};

export const ShellScene = () => {
  const {height, width} = useVideoConfig();
  const portrait = height > width;
  return <Background>
    <Reveal direction="left" style={{position: 'absolute', left: 80, top: portrait ? 115 : 98}}>
      <Eyebrow>{copy.shell.eyebrow}</Eyebrow>
      <Title size={portrait ? 83 : 91}>{copy.shell.title[0]}<br />{copy.shell.title[1]}</Title>
      <Caption size={portrait ? 30 : 32} style={{marginTop: 20, maxWidth: 1000}}>{copy.shell.sub}</Caption>
    </Reveal>
    <div style={{position: 'absolute', left: 80, top: portrait ? 550 : 520}}><NativeBridge portrait={portrait} /></div>
    <Reveal delay={35} style={{position: 'absolute', left: portrait ? 80 : 1200,
      right: portrait ? 80 : 100, top: portrait ? 1010 : 400}}><DexEvidence /></Reveal>
    <Reveal delay={103} style={{position: 'absolute', left: 80, right: 80, top: portrait ? 1410 : 944}}>
      <div style={{display: 'flex', alignItems: 'baseline', gap: 15, fontSize: portrait ? 29 : 30}}>
        <span>{copy.shell.coverageOurs}</span><CountUp value={facts.shell.coverage} delay={103} size={45} suffix={` ${copy.units.item}`} />
        <span style={{color: theme.colors.secondary}}> / {copy.shell.coverageSample} {facts.shell.sampledCoverage}</span>
      </div>
      <Caption size={portrait ? 23 : 23} style={{marginTop: 12}}>{copy.shell.lowerBound}</Caption>
    </Reveal>
  </Background>;
};
