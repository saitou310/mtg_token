import { useStore } from '../state/store';

export function HelpPage() {
  const setTab = useStore((s) => s.setTab);
  return (
    <div className="page help">
      <h1>使い方</h1>

      <section>
        <h2>1. トークンを作る</h2>
        <ol className="tips">
          <li>「作成」画面で、プリセットを選ぶか、名前・タイプ行・P/T・能力を入力します。</li>
          <li>「色と枠」で色を選びます。2色以上を選ぶと本物の多色カードと同じゴールド枠になり、「ハイブリッド」で枠を左右のグラデーションに、「カスタム」で部位ごとに色を決められます。</li>
          <li>好きな画像をページにドラッグ＆ドロップ（またはクリックで選択、Ctrl+V で貼り付け）します。プレビュー上でドラッグして位置、ホイールやピンチで大きさを調整できます。</li>
          <li>能力欄では <code>{'{T}'}</code> <code>{'{2}'}</code> <code>{'{G}'}</code> のように書くとマナ記号になります。</li>
        </ol>
      </section>

      <section>
        <h2>2. 印刷する</h2>
        <ol className="tips">
          <li>「印刷リストに追加」で枚数を指定して追加します。</li>
          <li>「印刷」画面で形式を選んで作成します。
            <ul>
              <li><strong>A4 PDF</strong>：コンビニの文書プリント（ネットプリント／ネットワークプリント）。1枚に9枚。</li>
              <li><strong>L判・2L判 JPEG</strong>：コンビニのマルチコピー機の写真プリントや、家電量販店の写真プリント機。光沢紙でカードらしく仕上がります。</li>
            </ul>
          </li>
          <li>カードは実寸の 63×88mm で出力されます。印刷サービスによってはわずかに拡大・縮小されることがあるので、はじめはテストシートで定規の長さを確かめ、「倍率補正」で合わせてください。</li>
          <li>切り取ったらカードスリーブに入れて使うのがおすすめです。薄い紙でも、後ろに不要なカードを重ねて入れればしっかりします。</li>
        </ol>
      </section>

      <section>
        <h2>データの保存について</h2>
        <p>
          入力内容や画像はすべてお使いのブラウザの中（IndexedDB）に保存され、サーバーには送信されません。ブラウザのデータを消すと消えてしまうので、大切なトークンは「マイトークン」画面のバックアップで書き出しておいてください。
        </p>
      </section>

      <section>
        <h2>本物らしさをもっと上げたいとき</h2>
        <p>
          「詳細設定」で、お使いの端末にインストールされているフォント名を指定したり、手持ちの枠画像（透過PNG）を重ねたりできます。これらはその端末の中だけで使われます。
        </p>
      </section>

      <section className="legal">
        <h2>おことわり</h2>
        <p>
          このサイトは非公式のファンメイドツールで、Wizards of the Coast とは関係がなく、承認も受けていません。Magic: The Gathering
          およびマナシンボルは Wizards of the Coast LLC の商標です。マナシンボルの描画に{' '}
          <a href="https://mana.andrewgioia.com/" target="_blank" rel="noreferrer">
            Mana（Andrew Gioia）
          </a>{' '}
          を使用しています。作成したトークンは個人的な遊びの範囲でお使いください。イラストに使う画像の権利にもご注意ください。
        </p>
      </section>

      <button type="button" className="btn primary" onClick={() => setTab('editor')}>
        作成をはじめる
      </button>
    </div>
  );
}
