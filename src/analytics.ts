// Google アナリティクス（GA4）。測定IDは .env.production の VITE_GA_ID で渡し、開発中は送らない。
// 送るのは画面と操作の種類・選択肢だけで、カード名や能力などの入力内容・画像は送らない
const GA_ID: string = import.meta.env.PROD ? ((import.meta.env.VITE_GA_ID as string | undefined) ?? '') : '';

export const analyticsEnabled = GA_ID !== '';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export function initAnalytics(): void {
  if (!analyticsEnabled) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    // gtag.js は配列ではなく arguments オブジェクトのまま積まれる前提で読む
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  // 画面はタブの切り替えなので、page_view は trackScreen で自前で送る
  window.gtag('config', GA_ID, { send_page_view: false });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(s);
}

export function track(event: string, params?: Record<string, string | number | boolean>): void {
  if (analyticsEnabled) window.gtag('event', event, params);
}

/** タブの表示をページの表示として数える（レポートでは「ページタイトル」で見分ける） */
export function trackScreen(title: string): void {
  track('page_view', { page_title: title });
}
