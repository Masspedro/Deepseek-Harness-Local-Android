import {useVideoConfig} from 'remotion';
import {Background, Caption, Eyebrow, Reveal, Title} from '../components/primitives';
import {VolumeChart} from '../components/VolumeChart';
import {copy, facts} from '../data';
import {theme} from '../theme';

export const ScaleScene = () => {
  const {height, width} = useVideoConfig();
  const portrait = height > width;
  return <Background>
    <Reveal direction="left" style={{position: 'absolute', left: 80, top: portrait ? 100 : 85}}>
      <Eyebrow>{copy.scale.eyebrow}</Eyebrow>
      <Title size={portrait ? 78 : 91}>{copy.scale.title}</Title>
      <Caption size={portrait ? 29 : 32} style={{marginTop: 18}}>{copy.scale.sub}</Caption>
    </Reveal>
    <div style={{position: 'absolute', left: portrait ? 80 : 85, right: portrait ? 80 : 85,
      top: portrait ? 325 : 315, display: 'flex', flexDirection: portrait ? 'column' : 'row', gap: portrait ? 16 : 22}}>
      {[facts.install, facts.firstUse, facts.extracted].map((rows, index) => <Reveal key={copy.scale.charts[index]}
        delay={12 + index * 38} style={{display: 'flex', flex: 1, minWidth: 0}}>
        <VolumeChart rows={rows} chartIndex={index} delay={12 + index * 38} />
      </Reveal>)}
    </div>
    <Reveal delay={142} style={{position: 'absolute', left: 80, right: 80,
      top: portrait ? 1490 : 925}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 30}}>
        <div style={{fontSize: portrait ? 31 : 32, fontWeight: 700, color: theme.colors.text}}>{copy.scale.honest}</div>
        <Caption size={portrait ? 22 : 24}>{copy.scale.downloadNote}</Caption>
      </div>
      <Caption size={portrait ? 21 : 22} style={{marginTop: 10}}>{copy.scale.unknownNote} {copy.scale.source}</Caption>
    </Reveal>
  </Background>;
};
