// 書き出し処理本体（pdf-lib・jszip を含む exporter.ts）は重いので、ここには軽い関数だけを置く

export function downloadFile(file: Blob, name: string) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** スマホの共有シート（netprint アプリ・写真アプリ等へ）でファイルを渡せるか */
export function canShareFiles(sample?: File[]): boolean {
  const files = sample ?? [new File([''], 'a.jpg', { type: 'image/jpeg' })];
  return typeof navigator !== 'undefined' && !!navigator.canShare && navigator.canShare({ files });
}

/** 書き出し処理を必要になったときに読み込む */
export const loadExporter = () => import('./exporter');
