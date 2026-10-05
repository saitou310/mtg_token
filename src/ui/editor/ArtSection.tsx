import { DEFAULT_ART_TRANSFORM } from '../../model/token';
import { useStore } from '../../state/store';
import { useImage } from '../../storage/images';
import { Field, FileButton, Section } from '../common';
import { fitCurrentArt, setArtFromFile } from './art';

export function ArtSection() {
  const t = useStore((s) => s.token);
  const update = useStore((s) => s.update);
  const art = useImage(t.artId);
  const logScale = Math.log2(t.artTransform.scale);

  return (
    <Section title="イラスト">
      <FileButton accept="image/*" onFile={setArtFromFile} className="dropzone">
        <strong>{art ? '画像を差し替える' : '画像を選ぶ'}</strong>
        <span>またはページのどこかにドラッグ＆ドロップ / Ctrl+V で貼り付け</span>
      </FileButton>

      {art && (
        <>
          <p className="hint">
            プレビュー上をドラッグして位置を調整、マウスホイールやピンチで拡大縮小できます。（{art.width}×{art.height}px）
          </p>
          <Field label={`拡大率 ${Math.round(t.artTransform.scale * 100)}%`}>
            <input
              type="range"
              min={-3}
              max={3}
              step={0.01}
              value={logScale}
              onChange={(e) => update({ artTransform: { ...t.artTransform, scale: 2 ** Number(e.target.value) } })}
            />
          </Field>
          <div className="row wrap gap">
            <button type="button" className="btn" onClick={() => fitCurrentArt('cover')}>
              枠を埋める
            </button>
            <button type="button" className="btn" onClick={() => fitCurrentArt('contain')}>
              全体を表示
            </button>
            <button type="button" className="btn" onClick={() => update({ artTransform: { ...t.artTransform, x: 0, y: 0 } })}>
              中央に戻す
            </button>
            <button
              type="button"
              className="btn danger-outline"
              onClick={() => update({ artId: null, artTransform: { ...DEFAULT_ART_TRANSFORM } })}
            >
              画像を外す
            </button>
          </div>
        </>
      )}

      <Field label="イラストレーター名（任意）" hint="カード下部に絵筆マークと一緒に表示されます">
        <input type="text" value={t.artist} onChange={(e) => update({ artist: e.target.value })} />
      </Field>
    </Section>
  );
}
