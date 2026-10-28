import {useVideoConfig} from 'remotion';
import {Background, Caption, Eyebrow, Reveal, Title} from '../components/primitives';
import {PhoneFrame, Screenshot} from '../components/PhoneFrame';
import {copy} from '../data';
import {theme} from '../theme';

export const EndScene = () => {
  const {height, width} = useVideoConfig();
  const portrait = height > width;
  const phoneWidth = portrait ? 350 : 335;
  return <Background>
    <Reveal direction="left" style={{position: 'absolute', left: 80, top: portrait ? 130 : 180}}>
      <Eyebrow>{copy.end.eyebrow}</Eyebrow>
      <Title size={portrait ? 86 : 92} style={{maxWidth: portrait ? 930 : 1140}}>
        {copy.end.headline[0]}<br /><span style={{color: theme.colors.accent}}>{copy.end.headline[1]}</span>
      </Title>
      <Caption size={portrait ? 32 : 34} style={{marginTop: 27}}>{copy.end.positioning}</Caption>
    </Reveal>
    <Reveal delay={15} direction="right" style={{position: 'absolute', left: portrait ? 650 : 1400,
      top: portrait ? 640 : 160}}>
      <PhoneFrame width={phoneWidth} height={phoneWidth * 2300 / 1080}><Screenshot src="04-extensions.png" /></PhoneFrame>
    </Reveal>
    <div style={{position: 'absolute', left: 80, top: portrait ? 690 : 585,
      display: 'flex', flexDirection: 'column', gap: 21}}>
      {copy.end.no.map((text, i) => <Reveal key={text} delay={42 + i * 12} direction="left">
        <div style={{fontSize: portrait ? 43 : 42, lineHeight: 1.2, fontWeight: 300, color: theme.colors.text,
          fontFamily: theme.fonts.sans, display: 'flex', gap: 16, alignItems: 'center'}}>
          <span style={{color: theme.colors.accent, fontSize: 22}}>✓</span>{text}
        </div>
      </Reveal>)}
    <Reveal delay={90}><Caption size={portrait ? 26 : 25} style={{maxWidth: portrait ? 510 : 550, marginTop: 19}}>{copy.end.ready}</Caption>
        <Caption size={portrait ? 27 : 25} style={{marginTop: 12, color: theme.colors.text}}>{copy.end.android}</Caption></Reveal></div>
    <Reveal delay={125} style={{position: 'absolute', left: 80, top: portrait ? 1280 : 895,
      width: portrait ? 520 : 1040}}>
      <div style={{fontSize: portrait ? 32 : 33, fontWeight: 700, color: theme.colors.accent, marginBottom: 20}}>{copy.end.cta} ↗</div>
      <div style={{fontFamily: theme.fonts.mono, fontSize: portrait ? 24 : 26, color: theme.colors.text,
        lineHeight: 1.6}}>{copy.end.host}<br />{copy.end.repository}</div>
      <Caption size={portrait ? 22 : 23} style={{marginTop: 20}}>{copy.end.boundary}</Caption>
    </Reveal>
  </Background>;
};
