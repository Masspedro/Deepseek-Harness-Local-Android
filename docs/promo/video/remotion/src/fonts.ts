import {delayRender, continueRender, staticFile} from 'remotion';

const fonts = [
  {family: 'DSHSegoe', file: 'segoeui.ttf', weight: '400'},
  {family: 'DSHSegoe', file: 'segoeuib.ttf', weight: '700'},
  {family: 'DSHSegoe', file: 'segoeuil.ttf', weight: '300'},
  {family: 'DSHMono', file: 'consola.ttf', weight: '400'},
  {family: 'DSHChinese', file: 'msyh.ttc', weight: '400'},
];

if (typeof document !== 'undefined') {
  const handle = delayRender('Load bundled Segoe UI, Microsoft YaHei and Consolas');
  Promise.all(fonts.map(async ({family, file, weight}) => {
    const face = new FontFace(family, `url("${staticFile(`fonts/${file}`)}")`, {weight});
    const loaded = await face.load();
    document.fonts.add(loaded);
  })).then(() => continueRender(handle)).catch((error) => {
    // The exported video must never silently fall back to an unapproved font.
    throw error;
  });
}
