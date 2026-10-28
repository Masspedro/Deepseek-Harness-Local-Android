import {useVideoConfig} from 'remotion';
import {Background, Caption, CountUp, Eyebrow, Reveal, Title} from '../components/primitives';
import {ModuleNetwork} from '../components/ModuleNetwork';
import {RuntimeSwap} from '../components/RuntimeSwap';
import {copy, facts} from '../data';
import {theme} from '../theme';

export const DepthScene = () => {
  const {height, width} = useVideoConfig();
  const portrait = height > width;
  const metrics = [facts.engineering.patches, facts.engineering.ptyLines, facts.engineering.probes];
  return <Background>
    <Reveal direction="left" style={{position: 'absolute', left: 80, top: portrait ? 100 : 85}}>
      <Eyebrow>{copy.depth.eyebrow}</Eyebrow>
      <Title size={portrait ? 81 : 88}>{copy.depth.title[0]}<br />{copy.depth.title[1]}</Title>
    </Reveal>
    <Reveal delay={10} style={{position: 'absolute', left: portrait ? 42 : 24,
      top: portrait ? 437 : 340}}>
      <ModuleNetwork width={portrait ? 670 : 760} height={portrait ? 580 : 650} />
    </Reveal>
    <Reveal delay={26} direction="right" style={{position: 'absolute', left: portrait ? 720 : 900,
      top: portrait ? 505 : 135}}>
      <div style={{marginBottom: portrait ? 20 : 10}}>
        <CountUp value={facts.engineering.modules} delay={26} size={portrait ? 108 : 118} color={theme.colors.accent} />
        <Caption size={portrait ? 28 : 28}>{copy.depth.moduleLabel}</Caption>
      </div>
      <div style={{display: portrait ? 'block' : 'flex', gap: 45}}>
        <div style={{marginTop: 12}}><CountUp value={facts.engineering.kotlinFiles} delay={40} size={portrait ? 53 : 56} />
          <Caption size={22}>{copy.depth.filesLabel}</Caption></div>
        <div style={{marginTop: 12}}><CountUp value={facts.engineering.lines} delay={54} size={portrait ? 48 : 56} />
          <Caption size={22}>{copy.depth.linesLabel}</Caption></div>
      </div>
    </Reveal>
    <Reveal delay={132} style={{position: 'absolute', left: portrait ? 80 : 845,
      top: portrait ? 1055 : 470}}><RuntimeSwap portrait={portrait} /></Reveal>
    <div style={{position: 'absolute', left: portrait ? 80 : 845, right: portrait ? 80 : 95,
      top: portrait ? 1430 : 850, display: 'flex', justifyContent: 'space-between', gap: 30}}>
      {metrics.map((value, i) => <Reveal key={copy.depth.metrics[i]} delay={285 + i * 12}>
        <CountUp value={value} delay={285 + i * 12} size={portrait ? 55 : 62} color={theme.colors.text} />
        <Caption size={portrait ? 23 : 23}>{copy.depth.metrics[i]}</Caption>
      </Reveal>)}
    </div>
  </Background>;
};
