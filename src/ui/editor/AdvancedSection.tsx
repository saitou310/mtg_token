import type { FontPreset } from '../../model/token';
import { useStore } from '../../state/store';
import { Field, FileButton, Section, Segmented, Toggle } from '../common';
import { importAuxImage } from './art';

export function AdvancedSection() {
  const t = useStore((s) => s.token);
  const update = useStore((s) => s.update);
  const setFonts = (patch: Partial<typeof t.fonts>) => update({ fonts: { ...t.fonts, ...patch } });

  return (
    <Section title="詳細設定">
      <div className="field">
        <span className="field-label">フォント</span>
        <Segmented<FontPreset>
          ariaLabel="フォント"
          value={t.fonts.preset}
          onChange={(preset) => setFonts({ preset })}
          options={[
            { value: 'serif', label: '標準（本文明朝）' },
            { value: 'sans', label: 'すべてゴシック' },
            { value: 'custom', label: '端末のフォント' },
          ]}
        />
      </div>
      {t.fonts.preset === 'custom' && (
        <>
          <Field label="名前・タイプ行のフォント名" hint="お使いの端末にインストール済みのフォント名を入力（例：Beleren Bold）。無ければ標準フォントになります">
            <input type="text" value={t.fonts.customTitle} onChange={(e) => setFonts({ customTitle: e.target.value })} />
          </Field>
          <Field label="能力テキストのフォント名" hint="例：MPlantin、ヒラギノ明朝 ProN">
            <input type="text" value={t.fonts.customRules} onChange={(e) => setFonts({ customRules: e.target.value })} />
          </Field>
        </>
      )}

      <div className="field">
        <span className="field-label">セット記号（任意）</span>
        <div className="row gap wrap">
          <FileButton accept="image/*" onFile={(f) => importAuxImage(f, 'setSymbolId')}>
            {t.setSymbolId ? '差し替える' : '画像を選ぶ'}
          </FileButton>
          {t.setSymbolId && (
            <button type="button" className="btn danger-outline" onClick={() => update({ setSymbolId: null })}>
              外す
            </button>
          )}
        </div>
        <span className="field-hint">タイプ行の右端に表示されます（透過PNG推奨）</span>
      </div>

      <div className="field">
        <span className="field-label">枠画像を重ねる（任意）</span>
        <div className="row gap wrap">
          <FileButton accept="image/png,image/webp" onFile={(f) => importAuxImage(f, 'overlayId')}>
            {t.overlayId ? '差し替える' : '透過PNGを選ぶ'}
          </FileButton>
          {t.overlayId && (
            <button type="button" className="btn danger-outline" onClick={() => update({ overlayId: null })}>
              外す
            </button>
          )}
        </div>
        {t.overlayId && (
          <Toggle
            checked={t.overlayReplacesFrame}
            onChange={(v) => update({ overlayReplacesFrame: v })}
            label="サイト標準の枠を描かない（重ねた画像を枠として使う）"
          />
        )}
        <span className="field-hint">
          63:88 の比率の透過PNGをカード全体に重ねます。画像はこの端末のブラウザ内だけで使われ、どこにも送信されません。
        </span>
      </div>

      <Field label="カード下部の小さな文字（任意）" hint="右下に表示。例：© 2026 自作トークン">
        <input type="text" value={t.footer} onChange={(e) => update({ footer: e.target.value })} />
      </Field>
    </Section>
  );
}
