/** @deprecated Legacy v1 phone wrapper; active video scenes use local framed screenshot markup. */
import type {ReactNode} from 'react';
import {Img, OffthreadVideo, staticFile} from 'remotion';
import {facts} from '../data';
import {theme} from '../theme';

export const PhoneFrame = ({children, width, height}: {children: ReactNode; width: number; height: number}) => <div
  data-device="phone"
  style={{width, height, boxSizing: 'border-box', position: 'relative', padding: 10,
    borderRadius: width * 0.112, border: `2px solid ${theme.colors.muted}99`,
    background: theme.colors.bg,
    boxShadow: `0 22px 65px ${theme.colors.bg}cc, inset 0 0 0 4px ${theme.colors.surfaceAlt}`}}>
  <div style={{position: 'absolute', left: -5, top: height * 0.22, width: 3, height: 52,
    background: theme.colors.muted, borderRadius: 3}} />
  <div style={{position: 'absolute', right: -5, top: height * 0.28, width: 3, height: 70,
    background: theme.colors.muted, borderRadius: 3}} />
  <div style={{width: '100%', height: '100%', overflow: 'hidden', borderRadius: width * 0.084,
    position: 'relative', background: theme.colors.surface}}>
    {children}
  </div>
</div>;

// The 100px system status-bar crop is permitted by MATERIALS.md.
// No text, icons, dialogs or app content are reconstructed or overpainted.
export const Screenshot = ({src}: {src: string}) => <div style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
  <Img src={staticFile(`assets/${src}`)} style={{position: 'absolute', top: '-4.35%', left: 0,
    width: '100%', height: '104.35%', objectFit: 'cover', objectPosition: 'center top'}} />
</div>;

export const ColdStartVideo = () => <OffthreadVideo
  src={staticFile('assets/coldstart.mp4')}
  playbackRate={facts.recording.speed}
  muted
  style={{width: '100%', height: '100%', objectFit: 'cover'}}
/>;
