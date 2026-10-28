import {useCurrentFrame, useVideoConfig} from 'remotion';
import {Background, Caption, CountUp, Eyebrow, Reveal, Title} from '../components/primitives';
import {PhoneFrame, Screenshot} from '../components/PhoneFrame';
import {copy, facts} from '../data';
import {progress} from '../motion';
import {theme} from '../theme';

export const EcosystemScene = () => {
  const {height, width} = useVideoConfig();
  const frame = useCurrentFrame();
  const portrait = height > width;
  const phoneWidth = portrait ? 365 : 310;
  const phoneHeight = phoneWidth * (2300 / 1080);
  const shift = progress(frame, 116, 45);
  return <Background>
    <Reveal direction="left" style={{position: 'absolute', left: 80, top: portrait ? 100 : 144}}>
      <Eyebrow>{copy.ecosystem.eyebrow}</Eyebrow>
      <Title size={portrait ? 85 : 92}>{copy.ecosystem.title[0]}<br />{copy.ecosystem.title[1]}</Title>
      <Caption size={portrait ? 29 : 32} style={{marginTop: 22, maxWidth: portrait ? 900 : 930}}>{copy.ecosystem.sub}</Caption>
    </Reveal>
    <div style={{position: 'absolute', left: portrait ? 80 : 80, top: portrait ? 465 : 555,
      display: 'flex', gap: portrait ? 40 : 50, alignItems: 'baseline'}}>
      <Reveal delay={22} direction="left"><div>
        <CountUp value={facts.ecosystem.extensions} delay={22} size={portrait ? 89 : 103} color={theme.colors.text} />
        <Caption size={25}>{copy.ecosystem.extensions}</Caption>
      </div></Reveal>
      <Reveal delay={42} direction="left"><div>
        <CountUp value={facts.ecosystem.plugins} delay={42} size={portrait ? 109 : 115} color={theme.colors.accent} />
        <Caption size={25}>{copy.ecosystem.plugins}</Caption>
      </div></Reveal>
      <Reveal delay={62} direction="left"><div>
        <CountUp value={facts.ecosystem.categories} delay={62} size={portrait ? 64 : 70} />
        <Caption size={25}>{copy.ecosystem.categories}</Caption>
      </div></Reveal>
    </div>
    <div style={{position: 'absolute', left: portrait ? 120 : 1100, top: portrait ? 690 : 170,
      display: 'flex', gap: portrait ? 95 : 68, alignItems: 'flex-start'}}>
      <Reveal delay={13} direction="right" style={{transformOrigin: 'bottom center'}}>
        <div style={{transform: `translateY(${shift * 12}px)`}}>
          <PhoneFrame width={phoneWidth} height={phoneHeight}><Screenshot src="04-extensions.png" /></PhoneFrame>
          <Caption size={19} style={{marginTop: 18, textAlign: 'center'}}>{copy.ecosystem.extensionTag}</Caption>
        </div>
      </Reveal>
      <Reveal delay={25} direction="right">
        <div style={{transform: `translateY(${-shift * 12}px)`}}>
          <PhoneFrame width={phoneWidth} height={phoneHeight}><Screenshot src="05-plugins.png" /></PhoneFrame>
          <Caption size={19} style={{marginTop: 18, textAlign: 'center'}}>{copy.ecosystem.pluginTag}</Caption>
        </div>
      </Reveal>
    </div>
    <Reveal delay={100} style={{position: 'absolute', left: 80, top: portrait ? 1560 : 950,
      maxWidth: portrait ? 920 : 950}}><Caption size={portrait ? 23 : 25}>{copy.ecosystem.note}</Caption></Reveal>
  </Background>;
};
