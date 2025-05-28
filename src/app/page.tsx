import dynamic from 'next/dynamic';

const PolarizationPlot = dynamic(() => import('./components/PolarizationPlot'), {
  ssr: false
});

export default function Home() {
  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">3He偏極度測定・解析</h1>
        <div className="prose max-w-none mb-8">
          <p>
            このツールは3He偏極度の時間変化を測定・解析するためのものです。
            偏極過程（SEOP法による偏極の生成）と緩和過程（T1による偏極の減衰）を考慮した
            理論曲線との比較が可能です。
          </p>
        </div>
        <PolarizationPlot />
      </div>
    </main>
  );
}
