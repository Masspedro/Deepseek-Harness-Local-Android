# 素材与字体（不入库）

本目录内容体积较大（字体 22 MB、素材 7.3 MB），**不提交到仓库**。
首次运行前需按下面步骤准备好，否则 `npx remotion studio` 会报找不到资源。

## 字体（`fonts/`）

从 Windows 系统字体复制：

```bash
mkdir -p public/fonts
cp /c/Windows/Fonts/consola.ttf  public/fonts/
cp /c/Windows/Fonts/msyh.ttc     public/fonts/
cp /c/Windows/Fonts/segoeui.ttf  public/fonts/
cp /c/Windows/Fonts/segoeuib.ttf public/fonts/
cp /c/Windows/Fonts/segoeuil.ttf public/fonts/
```

## 素材（`assets/`）

从 `docs/promo/video/assets/` 复制（该目录的采集方法见 `docs/promo/video/MATERIALS.md`）：

```bash
cp docs/promo/video/assets/*.png docs/promo/video/assets/*.mp4 \
   docs/promo/video/remotion/public/assets/
```

需要打横屏版时还要 `ui-flow.mp4` 与 `coldstart.mp4`。
