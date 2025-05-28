"use client";

import dynamic from 'next/dynamic';

const PolarizationPlot = dynamic(() => import('./components/PolarizationPlot'), {
  ssr: false
});

export default function Home() {
  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">He-3 Polarization and Neutron Polarization</h1>
        <div className="prose max-w-none mb-8">
          <p>
            Calculation of the time dependence of the He-3 polarization and the neutron polarization.
          </p>
        </div>
        <PolarizationPlot />
      </div>
    </main>
  );
}
