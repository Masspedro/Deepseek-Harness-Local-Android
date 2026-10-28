import {Easing, interpolate, spring} from 'remotion';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const ease = Easing.bezier(0.22, 1, 0.36, 1);
export const progress = (frame: number, start: number, duration = 28) =>
  interpolate(frame, [start, start + duration], [0, 1], {...clamp, easing: ease});
export const settle = (frame: number, start = 0) => spring({
  frame: Math.max(0, frame - start), fps: 60,
  config: {damping: 26, stiffness: 170, mass: 0.9},
  durationInFrames: 34,
});
