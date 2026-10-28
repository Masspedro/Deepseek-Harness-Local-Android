import {useCurrentFrame, useVideoConfig} from 'remotion';
import {Background, Caption, CountUp, Eyebrow, Reveal, Title} from '../components/primitives';
import {ColdStartVideo, PhoneFrame} from '../components/PhoneFrame';
import {copy, facts} from '../data';
import {theme} from '../theme';

export const HookScene = () => {
  const {width, height} = useVideoConfig();
  const frame = useCurrentFrame();
  const portrait = height > width;
  const phoneWidth = portrait ? 358 : 348;
  const phoneHeight = phoneWidth * (2400 / 1080);
  return <Background>
    <div style={{position: 'absolute', left: portrait ? 80 : 112, top: portrait ? 126 : 172,
      width: portrait ? 920 : 1050}}>
      <Eyebrow>{copy.hook.eyebrow}</Eyebrow>
      <Title size={portrait ? 90 : 100}>
        {copy.hook.title[0]}<br />{copy.hook.title[1]}
      </Title>
      <Reveal delay={8} direction="left"><Caption size={portrait ? 38 : 42} style={{marginTop: 24}}>{copy.hook.sub}</Caption></Reveal>
    </div>
    <Reveal delay={10} direction="right" style={{position: 'absolute',
      left: portrait ? 620 : 1390, top: portrait ? 650 : 124}}>
      <PhoneFrame width={phoneWidth} height={phoneHeight}><ColdStartVideo /></PhoneFrame>
      <Caption size={portrait ? 22 : 23} style={{marginTop: 20, textAlign: 'center'}}>{facts.recording.label}</Caption>
    </Reveal>
    <Reveal delay={30} direction="left" style={{position: 'absolute', left: portrait ? 80 : 116,
      top: portrait ? 755 : 570, width: portrait ? 500 : 1080}}>
      <Caption size={26}>{copy.hook.metric}</Caption>
      <div style={{lineHeight: 1, marginTop: 12}}><CountUp value={facts.startup.seconds}
        decimals={1} delay={30} duration={84} size={portrait ? 168 : 170}
        color={theme.colors.success} suffix={` ${copy.units.seconds}`} /></div>
      <div style={{width: portrait ? 430 : 640, height: 2, background: theme.colors.divider, marginTop: 30}} />
      <Caption size={portrait ? 27 : 29} style={{marginTop: 22, color: theme.colors.text}}>{facts.startup.device}</Caption>
      <Caption size={24} style={{marginTop: 9}}>{facts.startup.source}</Caption>
    </Reveal>
    <Reveal delay={90} style={{position: 'absolute', left: portrait ? 80 : 116,
      top: portrait ? 1290 : 930, width: portrait ? 490 : 1050}}>
      <div style={{fontSize: portrait ? 26 : 25, lineHeight: 1.55, color: theme.colors.secondary}}>
        {facts.recording.note}<br />{copy.hook.noLayer}
      </div>
    </Reveal>
    <div style={{position: 'absolute', left: portrait ? 80 : 116, top: portrait ? 1515 : 1020,
      right: portrait ? 80 : 116, height: 1, background: theme.colors.divider}}>
      <div style={{height: 1, width: `${Math.min(1, frame / 240) * 100}%`, background: theme.colors.muted}} />
    </div>
  </Background>;
};
