"use client";

import { useState } from 'react';

interface CalculationParams {
  gasThickness: number;  // atm cm unit
  initialPolarization: number;  // % unit
  relaxationTimeConstant: number;  // hour unit
}

// ここに実際の計算ロジックを実装します
export function calculateRelaxationTime(params: CalculationParams): number {
  const { gasThickness } = params;

  // TODO: ここに実際の計算式を実装
  // 現在はダミー値を返しています
  return 100;
}

export function calculatePolarization(time: number, params: CalculationParams): number {
  const { initialPolarization } = params;
  const relaxationTime = calculateRelaxationTime(params);
  return initialPolarization * Math.exp(-time / relaxationTime);
}

export default function PolarizationCalculator({
  onParamsUpdate
}: {
  onParamsUpdate: (params: CalculationParams) => void
}) {
  const [inputValues, setInputValues] = useState({
    gasThickness: "20.0",
    initialPolarization: "70",
    relaxationTimeConstant: "100",
  });

  const handleInputChange = (field: keyof typeof inputValues, value: string) => {
    setInputValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSetParams = () => {
    const params: CalculationParams = {
      gasThickness: parseFloat(inputValues.gasThickness) || 0,
      initialPolarization: parseFloat(inputValues.initialPolarization) || 0,
      relaxationTimeConstant: parseFloat(inputValues.relaxationTimeConstant) || 0,
    };
    onParamsUpdate(params);
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-xl font-bold mb-4">Calculation Parameters</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">3He Gas Thickness (atm cm)</label>
          <input
            type="number"
            value={inputValues.gasThickness}
            onChange={(e) => handleInputChange("gasThickness", e.target.value)}
            step="0.1"
            min="0"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Initial Polarization (%)</label>
          <input
            type="number"
            value={inputValues.initialPolarization}
            onChange={(e) => handleInputChange("initialPolarization", e.target.value)}
            min="0"
            max="100"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Relaxation Time Constant (hour)</label>
          <input
            type="number"
            value={inputValues.relaxationTimeConstant}
            onChange={(e) => handleInputChange("relaxationTimeConstant", e.target.value)}
            min="0"
            step="0.1"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="mt-4">
        <button
          onClick={handleSetParams}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Set Parameters
        </button>
      </div>
    </div>
  );
}