// Palette and font families are transcribed from MATERIALS.md.
// MATERIALS defines no spacing scale; the spacing below is a layout choice.
export const theme = {
  colors: {
    bg: '#101418', surface: '#161D29', surfaceAlt: '#1B2330',
    text: '#F2F5F9', secondary: '#9CA3AF', muted: '#6B7684',
    accent: '#7DD3FC', accentAlt: '#A78BFA', success: '#6EE7B7',
    warning: '#F2B36B', danger: '#FF8A80', divider: '#FFFFFF22',
  },
  fonts: {
    sans: 'DSHSegoe, DSHChinese, "Segoe UI", "Microsoft YaHei", sans-serif',
    chinese: 'DSHChinese, DSHSegoe, "Microsoft YaHei", sans-serif',
    numeric: 'DSHSegoe, "Segoe UI", Consolas, monospace',
    mono: 'DSHMono, Consolas, DSHChinese, monospace',
  },
  spacing: {xs: 8, sm: 16, md: 24, lg: 40, xl: 64, xxl: 96},
  motion: {travel: 24, enterFrames: 26, transitionFrames: 18, staggerFrames: 4},
} as const;
