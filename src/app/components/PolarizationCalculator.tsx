import { useState, useEffect } from 'react';

interface CalculationParams {
  initialPolarization: number;
  maxPolarization: number;
  polarizationTimeConstant: number;
  relaxationTimeT1: number;
}

export function calculatePolarization(time: number, params: CalculationParams): number {
  const { initialPolarization, maxPolarization, polarizationTimeConstant, relaxationTimeT1 } = params;

  // 偏極過程と緩和過程を考慮した偏極度の計算
  const polarizationTerm = maxPolarization * (1 - Math.exp(-time / polarizationTimeConstant));
  const relaxationTerm = Math.exp(-time / relaxationTimeT1);

  return polarizationTerm * relaxationTerm;
}

export default function PolarizationCalculator() {
  const [params, setParams] = useState<CalculationParams>({
    initialPolarization: 0,
    maxPolarization: 70, // 典型的な最大偏極度（%）
    polarizationTimeConstant: 30, // 典型的な時定数（分）
    relaxationTimeT1: 120, // 典型的な緩和時間（分）
  });

  const [theoreticalData, setTheoreticalData] = useState<Array<{time: number, polarization: number}>>([]);

  useEffect(() => {
    // 理論曲線のデータポイントを生成
    const newData = Array.from({ length: 241 }, (_, i) => {
      const time = i;
      return {
        time,
        polarization: calculatePolarization(time, params)
      };
    });
    setTheoreticalData(newData);
  }, [params]);

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-xl font-bold mb-4">計算パラメータ</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">初期偏極度 (%)</label>
          <input
            type="number"
            value={params.initialPolarization}
            onChange={(e) => setParams({ ...params, initialPolarization: Number(e.target.value) })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">最大偏極度 (%)</label>
          <input
            type="number"
            value={params.maxPolarization}
            onChange={(e) => setParams({ ...params, maxPolarization: Number(e.target.value) })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">偏極時定数 (分)</label>
          <input
            type="number"
            value={params.polarizationTimeConstant}
            onChange={(e) => setParams({ ...params, polarizationTimeConstant: Number(e.target.value) })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">緩和時間 T1 (分)</label>
          <input
            type="number"
            value={params.relaxationTimeT1}
            onChange={(e) => setParams({ ...params, relaxationTimeT1: Number(e.target.value) })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-600">
          ※ 偏極度の時間変化は、偏極過程（最大偏極度に向かう成長）と緩和過程（T1による減衰）の組み合わせで計算されます。
        </p>
      </div>
    </div>
  );
}