/**
 * 竖屏优先的版式系统（v2 重制）。
 *
 * ## 为什么要重做
 * v1 的字号是 18–29px（相对 1080 宽），换算到手机上只有 6–9sp，
 * 而且信息散落在画面各处、没有视觉中心。手机上完全看不清。
 *
 * ## v2 的规矩（来自 shot-composition 技能）
 * - **一屏一个焦点**：每帧只有一个「主角」，其他元素都是配角
 * - **焦点放三分点**：不居中，放 33% / 67% 的黄金位置
 * - **层级：尺寸 > 对比 > 颜色 > 位置**：主角靠「大」取胜，不靠位置取胜
 * - **字号下限**：竖屏 1080 宽下，正文 ≥ 44px，小字 ≥ 36px，主角数字 ≥ 140px
 * - **留白是主动元素**：焦点周围必须留空，不许填满
 */
import {theme} from './theme';

/** 竖屏 1080 宽的字号阶梯（相对 v1 全部放大约 2.5–3 倍） */
export const type = {
  /** 超大数字：一屏唯一主角，如 3.4 / 3540 */
  hero: 210,
  /** 次大数字：并列对比用 */
  display: 132,
  /** 主标题（2–6 字） */
  title: 96,
  /** 副标题 / 说明 */
  subtitle: 56,
  /** 正文 */
  body: 44,
  /** 小字注释（下限，再小就不可读） */
  caption: 36,
  /** 等宽标签 */
  eyebrow: 32,
} as const;

/** 三分点坐标（占画面百分比） */
export const thirds = {
  left: '33.3%',
  right: '66.6%',
  top: '33.3%',
  bottom: '66.6%',
} as const;

/**
 * 竖屏安全区：顶部 12%、底部 18% 会被平台 UI 遮挡。
 * 关键内容必须落在这条带子里。
 */
export const safe = {
  portrait: {top: 0.12, bottom: 0.18, side: 0.06},
  landscape: {top: 0.05, bottom: 0.05, side: 0.05},
} as const;

/** 1920x1080 / 1080x1920 composition dimensions converted to pixel insets. */
export const stageInsets = {
  portrait: {top: 230, bottom: 346, side: 65},
  landscape: {top: 54, bottom: 54, side: 96},
} as const;

/** 玻璃卡片：主角的容器 */
export const card = (opts: {glow?: boolean} = {}) => ({
  background: `linear-gradient(160deg, ${theme.colors.surfaceAlt} 0%, ${theme.colors.surface} 100%)`,
  border: `1.5px solid ${theme.colors.divider}`,
  borderRadius: 36,
  boxShadow: opts.glow
    ? `0 30px 90px -30px ${theme.colors.accent}55, 0 2px 0 0 #ffffff10 inset`
    : '0 24px 64px -24px #000000AA, 0 1px 0 0 #ffffff0A inset',
});

/** 强调数字的渐变（品牌天蓝 → 薄荷绿） */
export const numberGradient = `linear-gradient(135deg, ${theme.colors.text} 0%, ${theme.colors.accent} 55%, ${theme.colors.success} 100%)`;

export const gradientText = {
  background: numberGradient,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
} as const;
