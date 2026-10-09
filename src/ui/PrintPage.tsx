import { useState } from 'react';
import { track } from '../analytics';
import { SHEETS, type SheetFormat } from '../print/layouts';
import { canShareFiles, loadExporter } from '../print/download';
import { useStore } from '../state/store';
import { CardCanvas } from './CardCanvas';
import { Field, Section, Segmented, Stepper, Toggle } from './common';

const FORMAT_INFO: Record<SheetFormat, { title: string; file: string; body: string }> = {
  a4: {
    title: 'A4 PDF',
    file: 'PDF',
    body: 'コンビニの「文書プリント」向け（ネットプリント／ネットワークプリント）。A4普通紙に9枚。',
  },
  l: {
    title: 'L判 写真',
    file: 'JPEG',
    body: 'コンビニや家電量販店の「写真プリント」向け。写真1枚にカード1枚。光沢紙できれいに仕上がります。',
  },
  '2l': {
    title: '2L判 写真',
    file: 'JPEG',
    body: '2L判（横向き）の写真1枚にカード2枚。',
  },
};

export function PrintPage() {
  const queue = useStore((s) => s.queue);
  const print = useStore((s) => s.print);
  const { setPrint, setQueueCount, removeFromQueue, clearQueue, setTab, showToast } = useStore.getState();
  const [format, setFormat] = useState<SheetFormat>('a4');
  const [progress, setProgress] = useState<string | null>(null);
  const share = canShareFiles();

  const total = queue.reduce((s, q) => s + q.count, 0);
  const sheets = Math.ceil(total / SHEETS[format].perSheet);

  const run = async (mode: 'download' | 'share') => {
    if (total === 0) return;
    setProgress('準備中…');
    try {
      const { deliver, exportA4Pdf, exportPhotoSheets } = await loadExporter();
      const onProgress = (d: number, n: number) => setProgress(`作成中… ${d}/${n}`);
      const files =
        format === 'a4' ? [await exportA4Pdf(queue, print, onProgress)] : await exportPhotoSheets(format, queue, print, onProgress);
      setProgress('保存中…');
      await deliver(files, mode, `mtg_tokens_${format}.zip`);
      track('export_print', { format, mode, cards: total, files: files.length });
      showToast(`${files.length} 個のファイルを作成しました`);
    } catch (e) {
      console.error(e);
      track('export_print_failed', { format, mode });
      showToast('作成に失敗しました：' + ((e as Error).message ?? ''));
    } finally {
      setProgress(null);
    }
  };

  const runTest = async (mode: 'download' | 'share') => {
    setProgress('作成中…');
    try {
      const { deliver, exportTestSheet } = await loadExporter();
      const f = await exportTestSheet(format, print);
      await deliver([f], mode, f.name);
      track('export_test_sheet', { format, mode });
    } catch (e) {
      console.error(e);
      showToast('作成に失敗しました：' + ((e as Error).message ?? ''));
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="page print-page">
      <div className="print-queue">
        <div className="page-head">
          <div>
            <h1>印刷リスト</h1>
            <p className="hint">
              合計 {total} 枚 → {SHEETS[format].label}で {sheets} 枚分
            </p>
          </div>
          {queue.length > 0 && (
            <button type="button" className="btn danger-outline" onClick={() => confirm('印刷リストを空にしますか？') && clearQueue()}>
              すべて削除
            </button>
          )}
        </div>
        {queue.length === 0 ? (
          <div className="empty">
            <p>印刷リストは空です。作成画面で「印刷リストに追加」を押してください。</p>
            <button type="button" className="btn primary" onClick={() => setTab('editor')}>
              トークンを作る
            </button>
          </div>
        ) : (
          <ul className="queue-list">
            {queue.map((q) => (
              <li key={q.token.id} className="queue-item">
                <CardCanvas token={q.token} width={84} />
                <div className="queue-meta">
                  <strong>{q.token.name || '（名前なし）'}</strong>
                  <span className="hint">{q.token.typeLine}</span>
                </div>
                <Stepper value={q.count} onChange={(n) => setQueueCount(q.token.id, n)} />
                <button type="button" className="btn small danger-outline" onClick={() => removeFromQueue(q.token.id)} aria-label="削除">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="print-side">
        <Section title="印刷のしかた">
          <div className="format-cards" role="radiogroup" aria-label="出力形式">
            {(Object.keys(FORMAT_INFO) as SheetFormat[]).map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={format === f}
                className={`format-card ${format === f ? 'on' : ''}`}
                onClick={() => setFormat(f)}
              >
                <span className="format-title">
                  {FORMAT_INFO[f].title}
                  <small>{FORMAT_INFO[f].file}</small>
                </span>
                <span className="format-body">{FORMAT_INFO[f].body}</span>
              </button>
            ))}
          </div>

          <div className="row gap wrap">
            <button type="button" className="btn primary grow" disabled={total === 0 || !!progress} onClick={() => run('download')}>
              {progress ?? `${FORMAT_INFO[format].file} を作成して保存`}
            </button>
            {share && (
              <button type="button" className="btn grow" disabled={total === 0 || !!progress} onClick={() => run('share')}>
                共有（アプリへ送る）
              </button>
            )}
          </div>
        </Section>

        <Section title="仕上がりの調整">
          <Field label={`倍率補正 ${(print.scale * 100).toFixed(1)}%`} hint="実際に印刷して定規の長さがずれていたら調整します（例：50mmが51mmなら 98%）">
            <input
              type="range"
              min={0.9}
              max={1.1}
              step={0.005}
              value={print.scale}
              onChange={(e) => setPrint({ scale: Number(e.target.value) })}
            />
          </Field>
          <div className="field">
            <span className="field-label">塗り足し（カードの外側の黒）</span>
            <Segmented<number>
              ariaLabel="塗り足し"
              value={print.bleed}
              onChange={(bleed) => setPrint({ bleed })}
              options={[
                { value: 0, label: 'なし' },
                { value: 1, label: '1mm' },
                { value: 1.5, label: '1.5mm' },
                { value: 2, label: '2mm' },
              ]}
            />
            <span className="field-hint">切るときに少しずれても白い線が出にくくなります</span>
          </div>
          <Toggle checked={print.cropMarks} onChange={(v) => setPrint({ cropMarks: v })} label="トンボ（切り取り位置の目印）" />
          {format === 'a4' && (
            <>
              <div className="field">
                <span className="field-label">カードの間隔</span>
                <Segmented<number>
                  ariaLabel="カードの間隔"
                  value={print.gap}
                  onChange={(gap) => setPrint({ gap })}
                  options={[
                    { value: 0, label: 'くっつける（切る回数が少ない）' },
                    { value: 3, label: '3mm あける' },
                  ]}
                />
              </div>
              <div className="field">
                <span className="field-label">PDF の画質</span>
                <Segmented<number>
                  ariaLabel="PDFの画質"
                  value={print.pdfDpi}
                  onChange={(pdfDpi) => setPrint({ pdfDpi })}
                  options={[
                    { value: 300, label: '標準 300dpi' },
                    { value: 450, label: '高画質 450dpi' },
                    { value: 600, label: '最高 600dpi' },
                  ]}
                />
                <span className="field-hint">ファイルサイズが大きすぎて登録できないときは画質を下げてください</span>
              </div>
            </>
          )}
          <div className="test-sheet">
            <p>
              <strong>はじめての印刷サービスでは、先にテストシートで実寸を確認するのがおすすめです。</strong>
              カードと同じ位置に 63×88mm の枠と定規だけを印刷します。
            </p>
            <div className="row gap wrap">
              <button type="button" className="btn" disabled={!!progress} onClick={() => runTest('download')}>
                テストシート（{FORMAT_INFO[format].title}）を保存
              </button>
              {share && (
                <button type="button" className="btn" disabled={!!progress} onClick={() => runTest('share')}>
                  共有
                </button>
              )}
            </div>
          </div>
        </Section>

        <Section title="印刷のコツ">
          <PrintTips format={format} />
        </Section>
      </div>
    </div>
  );
}

function PrintTips({ format }: { format: SheetFormat }) {
  if (format === 'a4') {
    return (
      <ol className="tips">
        <li>作成した PDF を、セブン-イレブンなら「ネットプリント」、ローソン・ファミリーマート等なら「ネットワークプリント」のアプリやサイトに登録します。</li>
        <li>用紙サイズは <strong>A4</strong>、カラーで、<strong>拡大・縮小しない（等倍）</strong>設定にします。</li>
        <li>印刷したら下の定規が 100mm になっているか確認し、ずれていれば「倍率補正」で調整します。</li>
        <li>トンボに合わせてカッターで切り、スリーブに入れて使います（基本土地などのカードを後ろに入れると丈夫です）。</li>
      </ol>
    );
  }
  return (
    <ol className="tips">
      <li>作成した JPEG を、コンビニのマルチコピー機の「写真プリント」や、家電量販店の写真プリント機・店頭受付に持ち込みます（スマホからは「共有」でアプリへ送れます）。</li>
      <li>サイズは <strong>{format === 'l' ? 'L判' : '2L判'}</strong> を選びます。<strong>「フチあり」</strong>や「トリミングしない」設定があれば選んでください（フチなしは少し拡大されることがあります）。</li>
      <li>日付の印字はオフにします。</li>
      <li>仕上がりの定規が 50mm になっているか確認し、ずれていれば「倍率補正」で調整して作り直します。</li>
    </ol>
  );
}
