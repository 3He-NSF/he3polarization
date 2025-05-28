import dynamic from 'next/dynamic';

const PolarizationPlot = dynamic(() => import('./components/PolarizationPlot'), {
  ssr: false
});

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-8">3He偏極度測定</h1>
      <PolarizationPlot />
    </main>
  );
}
