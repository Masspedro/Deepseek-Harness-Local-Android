/**
 * 03 Scale —— 0:10–0:19（540 帧）
 *
 * v2 重制：v1 把「安装包 / 首次下载 / 解压占用」三组柱状图**同时**堆在一屏，
 * 每根柱子配 18px 小字标签，手机上根本读不出来。
 *
 * v2 规矩：三组数据**分三个时段**依次独占画面（每组 3 秒），
 * 主标题在顶部固定不动给出「现在是第几组」，柱状图占满中部，
 * 一行结论压在底部。任何时刻只有一组在说话。
 */
import {AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';
import {type, card} from '../layout';
import {Stage, Eyebrow, Headline, ChapterBar} from '../ui';

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

type Row = {label: string; value: number; display: string; ours?: boolean; note?: string; dim?: boolean};

const GROUPS: {title: string; caption: string; max: number; rows: Row[]; verdict: string}[] = [
  {
    title: '安装包体积',
    caption: '用户点下载时看到的数字',
    max: 400,
    rows: [
      {label: 'dphmoblie', value: 392, display: '392'},
      {label: 'DSHA', value: 279, display: '279'},
      {label: 'woaiys3', value: 155, display: '155'},
      {label: '本作 · 完整包', value: 149, display: '149', ours: true},
      {label: 'guzhou079', value: 118, display: '118'},
      {label: 'DSHBox', value: 112, display: '112'},
      {label: 'dsh-phone-root', value: 41, display: '41', note: '需另装 Termux'},
      {label: '本作 · 简单包', value: 24, display: '24', note: '另需首启下载 128'},
    ],
    verdict: '我们不是最小的 —— 但比 proot 系小一半以上。',
  },
  {
    title: '首次可用总下载',
    caption: '用户真正付出的流量',
    max: 400,
    rows: [
      {label: 'dphmoblie', value: 392, display: '392'},
      {label: 'DSHA', value: 279, display: '279'},
      {label: 'woaiys3', value: 155, display: '155'},
      {label: '本作 · 任一种包', value: 150, display: '≈150', ours: true},
      {label: 'guzhou079', value: 118, display: '118'},
      {label: 'DSHBox', value: 112, display: '112'},
      {label: 'dsh-phone-root', value: 41, display: '41', note: '不含 Termux'},
    ],
    verdict: '完整包零二次下载，装完即用。',
  },
  {
    title: '解压后磁盘占用',
    caption: '安装完成后真正吃掉的空间',
    max: 1300,
    rows: [
      {label: 'dphmoblie', value: 1297, display: '1297'},
      {label: 'woaiys3', value: 462, display: '462'},
      {label: 'DSHA', value: 440, display: '440'},
      {label: '本作', value: 404, display: '404', ours: true},
      {label: 'guzhou079', value: 370, display: '370'},
    ],
    verdict: '本作排第 4 —— 只有 dphmoblie 的三分之一。',
  },
];

const Bar = ({row, max, index, frame, fps}: {row: Row; max: number; index: number; frame: number; fps: number}) => {
  const t = (frame - (0.25 + index * 0.07) * fps) / (0.62 * fps);
  const grow = interpolate(t, [0, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easeOut,
  });
  const op = interpolate(t, [0, 0.4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const ours = row.ours;
  const widthPct = (row.value / max) * 100;

  return (
    <div style={{marginBottom: 18, opacity: op}}>
      <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8}}>
        <span
          style={{
            fontFamily: theme.fonts.chinese,
            fontSize: ours ? type.body : type.caption,
            fontWeight: ours ? 700 : 400,
            color: ours ? theme.colors.text : theme.colors.secondary,
          }}
        >
          {row.label}
        </span>
        <span
          style={{
            fontFamily: theme.fonts.numeric,
            fontSize: ours ? type.subtitle : type.body,
            fontWeight: ours ? 600 : 300,
            fontVariantNumeric: 'tabular-nums',
            color: ours ? theme.colors.accent : theme.colors.muted,
          }}
        >
          {row.display}
        </span>
      </div>
      <div style={{height: ours ? 24 : 16, background: theme.colors.surfaceAlt, borderRadius: 12, overflow: 'hidden', display: 'flex'}}>
        <div
          style={{
            height: '100%',
            // 用 flexBasis 百分比而非 width：父容器是 flex，width 会被内容压缩
            flex: `0 0 ${widthPct * grow}%`,
            borderRadius: 12,
            background: ours
              ? `linear-gradient(90deg, ${theme.colors.accent}, ${theme.colors.success})`
              : theme.colors.muted,
            opacity: ours ? 1 : 0.55,
            boxShadow: ours ? `0 0 22px ${theme.colors.accent}66` : 'none',
          }}
        />
      </div>
      {row.note ? (
        <div
          style={{
            marginTop: 7,
            fontFamily: theme.fonts.chinese,
            fontSize: type.eyebrow,
            color: theme.colors.warning,
            opacity: op,
          }}
        >
          + {row.note}
        </div>
      ) : null}
    </div>
  );
};

const Group = ({group, index}: {group: (typeof GROUPS)[number]; index: number}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{justifyContent: 'center'}}>
      <div style={{marginBottom: 26}}>
        <div
          style={{
            fontFamily: theme.fonts.chinese,
            fontSize: type.subtitle,
            fontWeight: 700,
            color: theme.colors.text,
            marginBottom: 10,
          }}
        >
          {String(index + 1).padStart(2, '0')} / {group.title}
        </div>
        <div style={{fontFamily: theme.fonts.chinese, fontSize: type.caption, color: theme.colors.muted}}>
          {group.caption}
        </div>
      </div>

      <div style={{...card(), padding: '38px 36px'}}>
        {group.rows.map((r, i) => (
          <Bar key={r.label} row={r} max={group.max} index={i} frame={frame} fps={fps} />
        ))}
      </div>

      <div
        style={{
          marginTop: 30,
          fontFamily: theme.fonts.chinese,
          fontSize: type.body,
          fontWeight: 600,
          color: theme.colors.success,
          opacity: interpolate(frame, [1.1 * fps, 1.6 * fps], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        {group.verdict}
      </div>
    </AbsoluteFill>
  );
};

export const ScaleScene = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const SEG = 3 * fps;

  return (
    <AbsoluteFill style={{background: theme.colors.bg}}>
      <AbsoluteFill
        style={{background: `radial-gradient(circle at 68% 40%, ${theme.colors.accent}14 0%, transparent 50%)`}}
      />
      <Stage>
        <Eyebrow delay={0.06}>The Complete Picture</Eyebrow>
        <Headline lines={['体积，完整地看。']} delay={0.1} size={78} />
        <div style={{height: 40}} />

        <div style={{position: 'relative', flex: 1, minHeight: 0}}>
          {GROUPS.map((g, i) => (
            <Sequence key={g.title} from={i * SEG} durationInFrames={SEG} layout="absolute-fill">
              <Group group={g} index={i} />
            </Sequence>
          ))}
        </div>
              <ChapterBar progress={frame / 540} />
      </Stage>
    </AbsoluteFill>
  );
};
