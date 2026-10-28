import {AbsoluteFill, Composition, Sequence, interpolate, useCurrentFrame} from 'remotion';
import type {ReactNode} from 'react';
import {HookScene} from './scenes/HookScene';
import {PathScene} from './scenes/PathScene';
import {ScaleScene} from './scenes/ScaleScene';
import {ShellScene} from './scenes/ShellScene';
import {EcosystemScene} from './scenes/EcosystemScene';
import {DepthScene} from './scenes/DepthScene';
import {EndScene} from './scenes/EndScene';
import {film} from './data';
import {clamp, ease} from './motion';
import {theme} from './theme';
import './fonts';

const scenes = [HookScene, PathScene, ScaleScene, ShellScene, EcosystemScene, DepthScene, EndScene];
const TRANSITION = theme.motion.transitionFrames;

const DirectionCut = ({children, duration, first, last}: {
  children: ReactNode; duration: number; first: boolean; last: boolean;
}) => {
  const frame = useCurrentFrame();
  const incoming = first ? 1 : interpolate(frame, [0, TRANSITION], [0, 1], {...clamp, easing: ease});
  const outgoing = last ? 0 : interpolate(frame, [duration, duration + TRANSITION], [0, 1], {...clamp, easing: ease});
  const x = (1 - incoming) * 90 - outgoing * 90;
  // A directional blur at the cut only; real media pixels are never filtered.
  // The wrapper moves the complete, unaltered composition.
  return <AbsoluteFill style={{opacity: Math.min(incoming, 1 - outgoing), transform: `translateX(${x}px)`}}>{children}</AbsoluteFill>;
};

export const DSHMobilePromo = () => <AbsoluteFill style={{background: theme.colors.bg}}>
  {film.shots.map((shot, index) => {
    const Scene = scenes[index];
    const first = index === 0;
    const last = index === film.shots.length - 1;
    const start = shot.start * film.fps - (first ? 0 : TRANSITION);
    const nominal = shot.seconds * film.fps;
    return <Sequence key={shot.id} name={shot.id} from={start}
      durationInFrames={nominal + (last ? TRANSITION : TRANSITION * (first ? 1 : 2))}>
      <DirectionCut duration={nominal + (first ? 0 : TRANSITION)} first={first} last={last}>
        <Scene />
      </DirectionCut>
    </Sequence>;
  })}
</AbsoluteFill>;

export const RemotionRoot = () => <>
  <Composition id="DSHMobilePortrait" component={DSHMobilePromo} durationInFrames={film.seconds * film.fps}
    fps={film.fps} width={film.portrait.width} height={film.portrait.height} />
  <Composition id="DSHMobileLandscape" component={DSHMobilePromo} durationInFrames={film.seconds * film.fps}
    fps={film.fps} width={film.landscape.width} height={film.landscape.height} />
</>;
