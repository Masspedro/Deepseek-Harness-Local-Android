import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {theme} from '../theme';
import {card, gradientText} from '../layout';
import {SceneLayout, ChapterBar, usePortrait} from '../ui';
import {facts} from '../data';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const DepthScene = () => {
  const frame = useCurrentFrame();
  const portrait = usePortrait();
  const modules = frame < 240;
  const value = modules ? facts.engineering.modules : facts.engineering.ptyLines;
  return <AbsoluteFill style={{background: theme.colors.bg}}>
    <AbsoluteFill style={{zIndex: 0, background: `radial-gradient(circle at 60% 50%, ${theme.colors.accentAlt}12, transparent 60%)`}} />
    <SceneLayout eyebrow="DETAILS MAKE IT WORK" title={['看得见的流畅，', '看不见的工程。']} titleSize={portrait ? 74 : 62}
      footer={modules ? '按实际领域模块数绘制；每个圆点对应一个核心模块。' : '两阶段提交换装：先解压校验，再逐条换名；引擎健康确认后清理旧版。'}>
      <div data-layout-stack style={{display: 'flex', flexDirection: 'column', gap: portrait ? 30 : 32}}>
        <div data-layout-block="engineering-metric" style={{display: 'flex', flexDirection: 'column', gap: 16}}>
          <div data-layout-siblings style={{display: 'flex', alignItems: 'baseline', gap: 22}}>
            <span style={{fontFamily: theme.fonts.numeric, fontSize: portrait ? 186 : 166, lineHeight: 1.04, fontWeight: 300, letterSpacing: '-0.05em', fontVariantNumeric: 'tabular-nums', ...gradientText}}>{value}</span>
            <span style={{fontSize: portrait ? 43 : 38, lineHeight: 1.2, color: theme.colors.secondary, whiteSpace: 'nowrap'}}>{modules ? '个核心模块' : '行 C · 真 PTY'}</span>
          </div>
          <div style={{fontSize: portrait ? 38 : 24, lineHeight: 1.35, color: theme.colors.secondary}}>{modules ? `${facts.engineering.kotlinFiles} 个 Kotlin 文件 · ${facts.engineering.lines.toLocaleString('en-US')} 行` : '用原生 C 助手，接通真正的终端。'}</div>
        </div>
        {modules ? <div data-layout-block="module-domains" style={{display: 'flex', flexWrap: 'wrap', gap: portrait ? 14 : 16}}>
          {facts.domains.map((domain, index) => <div key={domain.name} style={{...card(), borderRadius: 20, flex: '0 0 calc(50% - 8px)', minWidth: 0, boxSizing: 'border-box', padding: portrait ? '20px 22px' : '22px 24px', display: 'flex', flexDirection: 'column', gap: 18}}>
            <div data-layout-siblings style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12}}>
              <span style={{fontSize: portrait ? 38 : 24, lineHeight: 1.2, color: theme.colors.secondary, whiteSpace: 'nowrap'}}>{domain.name}</span>
              <span style={{fontSize: portrait ? 40 : 28, lineHeight: 1, color: theme.colors.accent, fontFamily: theme.fonts.numeric}}>{domain.count}</span>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: portrait ? 13 : 15, height: 14}}>
              {Array.from({length: domain.count}, (_, dot) => <div key={dot} style={{width: portrait ? 13 : 14, height: portrait ? 13 : 14, borderRadius: 10, background: theme.colors.accent,
                opacity: interpolate(frame, [index * 5 + dot * 2, index * 5 + dot * 2 + 22], [0.28, 0.9], clamp)}} />)}
            </div>
          </div>)}
        </div> : <div data-layout-stack style={{display: 'flex', flexDirection: 'column', gap: portrait ? 28 : 32}}>
          <div data-layout-block="native-terminal" style={{...card(), padding: portrait ? 28 : 32, display: 'flex', flexDirection: 'column', gap: 22}}>
            <div style={{fontSize: portrait ? 38 : 24, color: theme.colors.secondary}}>Android 原生终端连接</div>
            <div style={{fontFamily: theme.fonts.mono, fontSize: portrait ? 38 : 24, lineHeight: 1.6, color: theme.colors.accent}}>openpty()<br />↓<br />C 助手 → bash</div>
          </div>
          <div data-layout-siblings style={{display: 'flex', gap: 20}}>
            {[{n: facts.engineering.patches, label: 'Android 适配补丁'}, {n: facts.engineering.probes, label: '回归探针'}].map((metric) => <div key={metric.label} style={{...card(), padding: portrait ? 25 : 28, flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10}}>
              <div style={{fontFamily: theme.fonts.numeric, fontSize: portrait ? 104 : 72, lineHeight: 1.05, fontWeight: 300}}>{metric.n}</div>
              <div style={{fontSize: portrait ? 36 : 24, lineHeight: 1.3, color: theme.colors.secondary}}>{metric.label}</div>
            </div>)}
          </div>
        </div>}
      </div>
    </SceneLayout>
    <ChapterBar progress={frame / 480} />
  </AbsoluteFill>;
};
