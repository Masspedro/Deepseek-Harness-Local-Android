/**
 * 02 Path —— 0:04–0:10（360 帧）
 *
 * v2 重制：v1 在这一场同时铺了标题、副标题、4 条路线、每个节点的说明、
 * 独立的本作直线图、共享路线圆点、脚注、免责说明 —— 6 个文字块抢注意力。
 *
 * v2 规矩：**主角是那张「长链 vs 直线」对照图**。
 * 文字只留标题和四个方案名，其余全删。让图形自己说话。
 */
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {theme} from '../theme';
import {type, card} from '../layout';
import {Stage, Eyebrow, Headline, Body, ChapterBar} from '../ui';

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);

type Route = {label: string; nodes: string[]; cost: string; ours?: boolean};

const ROUTES: Route[] = [
  {label: 'Termux', nodes: ['apt', '编译', '环境', 'Node'], cost: '分钟级'},
  {label: 'proot', nodes: ['proot', 'glibc', '发行版', 'Node'], cost: '十几秒起'},
  {label: '快照', nodes: ['解压', '重定位', 'Node'], cost: '数十秒'},
  {label: '本作', nodes: [], cost: '3 秒级', ours: true},
];

const RouteRow = ({route, index, frame, fps}: {route: Route; index: number; frame: number; fps: number}) => {
  const start = (0.8 + index * 0.3) * fps;
  const lit = (offset: number) => {
    const p = (frame - start - offset * 0.18 * fps) / (0.32 * fps);
    return interpolate(p, [0, 1], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: easeOut,
    });
  };

  const ours = route.ours;

  return (
    <div style={{marginBottom: ours ? 0 : 40}}>
      <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16}}>
        <span
          style={{
            fontFamily: theme.fonts.chinese,
            fontSize: ours ? type.subtitle : type.body,
            fontWeight: ours ? 700 : 400,
            color: ours ? theme.colors.text : theme.colors.secondary,
            opacity: lit(0),
          }}
        >
          {route.label}
        </span>
        <span
          style={{
            fontFamily: theme.fonts.chinese,
            fontSize: type.caption,
            fontWeight: ours ? 600 : 400,
            color: ours ? theme.colors.success : theme.colors.muted,
            opacity: lit(0.15),
          }}
        >
          {route.cost}
        </span>
      </div>

      <div style={{position: 'relative', height: ours ? 30 : 46, display: 'flex', alignItems: 'center'}}>
        {ours ? (
          <>
            <div
              style={{
                height: 9,
                width: '100%',
                borderRadius: 5,
                background: `linear-gradient(90deg, ${theme.colors.accent}, ${theme.colors.success})`,
                scale: `${lit(0.05)} 1`,
                transformOrigin: 'left center',
                boxShadow: `0 0 28px ${theme.colors.accent}70`,
              }}
            />
            <span
              style={{
                position: 'absolute',
                right: 0,
                top: -46,
                fontFamily: theme.fonts.mono,
                fontSize: type.eyebrow,
                color: theme.colors.accent,
                opacity: lit(0.4),
              }}
            >
              execve()
            </span>
          </>
        ) : (
          <div style={{display: 'flex', alignItems: 'center', gap: 8, width: '100%'}}>
            {route.nodes.map((n, i) => (
              <div key={n} style={{display: 'flex', alignItems: 'center', gap: 8, flex: 1}}>
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: theme.colors.surfaceAlt,
                    border: `1px solid ${theme.colors.divider}`,
                    fontFamily: theme.fonts.chinese,
                    fontSize: type.eyebrow,
                    color: theme.colors.secondary,
                    whiteSpace: 'nowrap',
                    opacity: lit(i * 0.55),
                  }}
                >
                  {n}
                </div>
                {i < route.nodes.length - 1 ? (
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      background: theme.colors.muted,
                      opacity: lit(i * 0.55 + 0.25) * 0.45,
                    }}
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const PathScene = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill style={{background: theme.colors.bg}}>
      <AbsoluteFill
        style={{background: `radial-gradient(circle at 60% 74%, ${theme.colors.accent}1C 0%, transparent 46%)`}}
      />
      <Stage>
        <Eyebrow delay={0.1}>Less Between You and the Engine</Eyebrow>
        <Headline lines={['把路径，', '拉成直线。']} delay={0.16} size={84} />

        <div style={{height: 56}} />

        {/* ── 主角：四条路径对照 ── */}
        <div style={{...card(), padding: '44px 40px'}}>
          {ROUTES.map((r, i) => (
            <RouteRow key={r.label} route={r} index={i} frame={frame} fps={fps} />
          ))}
        </div>

        <div style={{height: 32}} />

        <Body delay={2.5} color={theme.colors.muted} maxWidth="94%">
          bionic 直跑不止我们一家 —— guzhou079、woaiys3 同在这条线上。
        </Body>
              <ChapterBar progress={frame / 360} />
      </Stage>
    </AbsoluteFill>
  );
};
