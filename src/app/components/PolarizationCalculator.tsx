"use client";

import { useState, useEffect } from 'react';

interface CalculationParams {
  gasThickness: number;  // atm cm単位
  initialPolarization: number;  // %単位
  relaxationTimeConstant: number;  // hour単位
}

export function calculatePolarization(time: number, params: CalculationParams): number {
  const { initialPolarization, relaxationTimeConstant } = params;

  // 時間の単位を分からhourに変換
  const timeInHours = time / 60;

  // 緩和過程による偏極度の減衰を計算
  return initialPolarization * Math.exp(-timeInHours / relaxationTimeConstant);
}

export default function PolarizationCalculator() {
  const [params, setParams] = useState<CalculationParams>({
    gasThickness: 1.0,  // デフォルト値: 1.0 atm cm
    initialPolarization: 70, // デフォルト値: 70%
    relaxationTimeConstant: 100, // デフォルト値: 100時間
  });

  const [theoreticalData, setTheoreticalData] = useState<Array<{time: number, polarization: number}>>([]);

  useEffect(() => {
    // 理論曲線のデータポイントを生成（24時間分、1分間隔）
    const newData = Array.from({ length: 24 * 60 + 1 }, (_, i) => {
      const time = i; // 分単位
      return {
        time,
        polarization: calculatePolarization(time, params)
      };
    });
    setTheoreticalData(newData);
  }, [params]);

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-xl font-bold mb-4">Parameters</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">He-3 gas thickness (atm cm)</label>
          <input
            type="number"
            value={params.gasThickness}
            onChange={(e) => setParams({ ...params, gasThickness: Number(e.target.value) })}
            step="0.1"
            min="0"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">initial polarization </label>
          <input
            type="number"
            value={params.initialPolarization}
            onChange={(e) => setParams({ ...params, initialPolarization: Number(e.target.value) })}
            min="0"
            max="1"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">relaxation time, T1 (hour)</label>
          <input
            type="number"
            value={params.relaxationTimeConstant}
            onChange={(e) => setParams({ ...params, relaxationTimeConstant: Number(e.target.value) })}
            min="0"
            step="0.1"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-600">
          ※ 偏極度の時間変化は、初期偏極度からの緩和過程（T1による減衰）として計算されます。
          グラフは24時間分を表示します。
        </p>
      </div>
    </div>
  );
}