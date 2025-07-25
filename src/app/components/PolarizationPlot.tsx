"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// 基本計算パラメータの型定義
interface BaseCalculationParams {
  initialPolarization: number;  // 初期偏極度
  relaxationTimeConstant: number;  // 緩和時定数
}

// 中性子パラメータの型定義
interface NeutronParams {
  gasThickness: number;  // ガス厚さ
  wavelength: number;    // 波長
  he3Polarization: number;  // He-3偏極度
}

// 全パラメータの型定義
interface Params extends BaseCalculationParams {
  xAxisUnit: 'wavelength' | 'energy';  // X軸の単位（波長またはエネルギー）
  neutronParams: NeutronParams;
}

// データポイントの型定義
interface DataPoint {
  time: number;
  wavelength: number;
  energy: number;
  he3Polarization: number;
  neutronPolarization: number;
  neutronTransmission: number;
  figureOfMerit: number;
  [key: string]: number;
}

// 物理定数の定義
const PHYSICAL_CONSTANTS = {
  V: 22.4e3,  // モル体積 (cm^3/mol)
  Na: 6.0221409e23,  // アボガドロ数 (/mol)
  sigma0: 5333,      // barn @ λ = 1.8Å
  barn_to_cm2: 1e-24 // barn から cm^2 への変換係数
};

// 共通因子の計算
function calculateCommonFactors(wavelength: number) {
  const n = PHYSICAL_CONSTANTS.Na/PHYSICAL_CONSTANTS.V;  // 数密度
  const sigma = PHYSICAL_CONSTANTS.sigma0 * (wavelength / 1.8);  // 断面積（barn）
  return n * sigma * PHYSICAL_CONSTANTS.barn_to_cm2;  // 単位変換後の値
}

// 中性子偏極度の計算
function calculateNeutronPolarization(wavelength: number, he3Polarization: number, gasThickness: number): number {
  const commonFactor = calculateCommonFactors(wavelength);
  const neutronPolarization = Math.tanh(commonFactor * he3Polarization * gasThickness);
  return neutronPolarization * 100;  // パーセント表示に変換
}

// 中性子透過率の計算
function calculateNeutronTransmission(wavelength: number, he3Polarization: number, gasThickness: number): number {
  const commonFactor = calculateCommonFactors(wavelength);
  const factor = commonFactor * gasThickness;
  const neutronTransmission = Math.exp(-factor) * Math.cosh(factor*he3Polarization);
  return neutronTransmission * 100;  // パーセント表示に変換
}

// 性能指数の計算
function calculateFigureOfMerit(wavelength: number, he3Polarization: number, gasThickness: number): number {
  const commonFactor = calculateCommonFactors(wavelength);
  const factor = commonFactor * gasThickness;
  const neutronPolarization = Math.tanh(commonFactor * he3Polarization * gasThickness);
  const neutronTransmission = Math.exp(-factor) * Math.cosh(factor*he3Polarization);
  const FigureOfMerit = neutronPolarization*neutronPolarization*neutronTransmission;
  return FigureOfMerit * 100;  // パーセント表示に変換
}

export default function PolarizationPlot() {
  const [params, setParams] = useState<Params>({
    initialPolarization: 70.0,
    relaxationTimeConstant: 100.0,
    xAxisUnit: 'wavelength',
    neutronParams: {
      gasThickness: 10.0,
      wavelength: 5.0,
      he3Polarization: 70,
    }
  });

  const [axisRanges, setAxisRanges] = useState({
    he3: {
      xMin: "0",
      xMax: "100",
      yMin: "0",
      yMax: "80"  // 最大値を80%に調整
    },
    neutron: {
      xMin: "0",
      xMax: "100",
      yMin: "0",
      yMax: "100"
    }
  });

  const [he3Data, setHe3Data] = useState<DataPoint[]>([]);
  const [neutronData, setNeutronData] = useState<DataPoint[]>([]);

  const [tempParams, setTempParams] = useState<Params>({
    initialPolarization: 70.0,
    relaxationTimeConstant: 100.0,
    xAxisUnit: 'wavelength',
    neutronParams: {
      gasThickness: 10.0,
      wavelength: 5.0,
      he3Polarization: 70,
    }
  });

  const [isLogScale, setIsLogScale] = useState(false);

  // データポイントの計算を別関数に分離
  const addDataPoint = useCallback((x: number, currentParams: Params, points: DataPoint[]) => {
    const wavelength = currentParams.xAxisUnit === 'wavelength' ? x : Math.sqrt(81.81 / x);
    const energy = currentParams.xAxisUnit === 'wavelength' ? 81.81 / (x * x) : x;

    const neutronPolarization = calculateNeutronPolarization(
      wavelength,
      currentParams.neutronParams.he3Polarization / 100,
      currentParams.neutronParams.gasThickness
    );

    const neutronTransmission = calculateNeutronTransmission(
      wavelength,
      currentParams.neutronParams.he3Polarization / 100,
      currentParams.neutronParams.gasThickness
    );

    const figureOfMerit = calculateFigureOfMerit(
      wavelength,
      currentParams.neutronParams.he3Polarization / 100,
      currentParams.neutronParams.gasThickness
    );

    points.push({
      time: 0,
      wavelength,
      energy,
      he3Polarization: currentParams.neutronParams.he3Polarization,
      neutronPolarization,
      neutronTransmission,
      figureOfMerit
    });
  }, []);

  const calculateHe3Polarization = useCallback((currentParams: Params) => {
    const points: DataPoint[] = [];
    const xMin = Number(axisRanges.he3.xMin) || 0;
    const xMax = Number(axisRanges.he3.xMax) || 24;
    const step = (xMax - xMin) / 100;

    for (let time = xMin; time <= xMax; time += step) {
      const he3Polarization = currentParams.initialPolarization *
        Math.exp(-time / currentParams.relaxationTimeConstant);

      points.push({
        time,
        wavelength: currentParams.neutronParams.wavelength,
        energy: 81.81 / (currentParams.neutronParams.wavelength * currentParams.neutronParams.wavelength),
        he3Polarization,
        neutronPolarization: 0,
        neutronTransmission: 0,
        figureOfMerit: 0
      });
    }

    return points;
  }, [axisRanges.he3.xMin, axisRanges.he3.xMax]);

  const calculateNeutronProperties = useCallback((currentParams: Params) => {
    const xMin = Number(axisRanges.neutron.xMin) || 0;
    const xMax = Number(axisRanges.neutron.xMax) || 10;
    const effectiveXMin = isLogScale ? Math.max(0.1, xMin) : xMin;
    const points: DataPoint[] = [];
    const numPoints = 200;

    if (isLogScale) {
      const logMin = Math.log10(effectiveXMin);
      const logMax = Math.log10(xMax);
      const logStep = (logMax - logMin) / numPoints;

      for (let i = 0; i <= numPoints; i++) {
        const x = Math.pow(10, logMin + i * logStep);
        addDataPoint(x, currentParams, points);
      }
    } else {
      const step = (xMax - effectiveXMin) / numPoints;
      for (let x = effectiveXMin; x <= xMax; x += step) {
        addDataPoint(x, currentParams, points);
      }
    }

    return points;
  }, [axisRanges.neutron.xMin, axisRanges.neutron.xMax, isLogScale, addDataPoint]);

  const handleAxisRangeChange = (graph: 'he3' | 'neutron', field: keyof typeof axisRanges.he3, value: string) => {
    setAxisRanges(prev => ({
      ...prev,
      [graph]: {
        ...prev[graph],
        [field]: value
      }
    }));

    // 軸の変更時はデータを再計算
    setHe3Data(calculateHe3Polarization(params));
    setNeutronData(calculateNeutronProperties(params));
  };

  useEffect(() => {
    setHe3Data(calculateHe3Polarization(params));
    setNeutronData(calculateNeutronProperties(params));
  }, [calculateHe3Polarization, calculateNeutronProperties, params,axisRanges.he3.yMin,axisRanges.he3.yMax]);

  useEffect(() => {
    setNeutronData(calculateNeutronProperties(params));
  }, [isLogScale, calculateNeutronProperties, params,axisRanges.neutron.yMin,axisRanges.neutron.yMax]);

  // He-3グラフのデータ
  const he3GraphData = he3Data;

  // Neutronグラフのデータ
  const neutronGraphData = neutronData;

  const generateLogTicks = (min: number, max: number) => {
    const ticks: number[] = [];
    const minExp = Math.floor(Math.log10(min));
    const maxExp = Math.ceil(Math.log10(max));

    for (let exp = minExp; exp <= maxExp; exp++) {
      const base = Math.pow(10, exp);
      if (base >= min && base <= max) {
        ticks.push(base);
      }
      if (exp < maxExp) {
        [2, 4, 6, 8].forEach(n => {
          const value = n * base;
          if (value >= min && value <= max) {
            ticks.push(value);
          }
        });
      }
    }
    return ticks.sort((a, b) => a - b);
  };

  const generateTicks = (min: number, max: number, useLogScale: boolean = false) => {
    if (useLogScale) {
      return generateLogTicks(Math.max(0.1, min), max);
    }

    const range = max - min;
    let step = 1;

    if (range <= 5) step = 1;
    else if (range <= 10) step = 2;
    else if (range <= 20) step = 5;
    else if (range <= 50) step = 10;
    else step = 20;

    const ticks = [];
    for (let current = min; current <= max + 0.0001; current += step) {
      ticks.push(Number(current.toFixed(3)));
    }
    return ticks;
  };

  const getXAxisProps = () => {
    return {
      label: params.xAxisUnit === 'wavelength' ? 'Wavelength (Å)' : 'Energy (meV)',
      dataKey: params.xAxisUnit === 'wavelength' ? 'wavelength' : 'energy'
    };
  };

  return (
    <div className="space-y-6">
      {/* He-3 Polarization Box */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-2xl font-bold text-center mb-4">He-3 Polarization</h2>

        {/* Parameters and Graph Range Settings in a row */}
        <div className="flex gap-8 mb-6">
          {/* He-3 Parameters */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-3">Parameters</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 w-48">
                  Initial Polarization (%)
                </label>
                <input
                  type="number"
                  step="any"  // 任意の小数値を許可
                  value={tempParams.initialPolarization}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setTempParams({
                      ...tempParams,
                      initialPolarization: isNaN(value) ? 0 : value
                    });
                  }}
                  className="w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 w-48">
                  Relaxation Time (hour)
                </label>
                <input
                  type="number"
                  step="any"
                  value={tempParams.relaxationTimeConstant}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setTempParams({
                      ...tempParams,
                      relaxationTimeConstant: isNaN(value) ? 0 : value
                    });
                  }}
                  className="w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* He-3 Graph Range Settings */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-3">Graph Range Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">X Min (hour)</label>
                <input
                  type="number"
                  step="any"
                  value={axisRanges.he3.xMin}
                  onChange={(e) => handleAxisRangeChange("he3", "xMin", e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">X Max (hour)</label>
                <input
                  type="number"
                  step="any"
                  value={axisRanges.he3.xMax}
                  onChange={(e) => handleAxisRangeChange("he3", "xMax", e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Y Min (%)</label>
                <input
                  type="number"
                  step="any"
                  value={axisRanges.he3.yMin}
                  onChange={(e) => handleAxisRangeChange("he3", "yMin", e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Y Max (%)</label>
                <input
                  type="number"
                  step="any"
                  value={axisRanges.he3.yMax}
                  onChange={(e) => handleAxisRangeChange("he3", "yMax", e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Set Parameters Button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => {
              const newParams = {
                ...params,
                initialPolarization: tempParams.initialPolarization,
                relaxationTimeConstant: tempParams.relaxationTimeConstant
              };
              setParams(newParams);
              setHe3Data(calculateHe3Polarization(newParams));
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Set Parameters
          </button>
        </div>

        {/* He-3 Graph */}
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              key={`he3-${Number(axisRanges.he3.xMin)}-${Number(axisRanges.he3.xMax)}-${Number(axisRanges.he3.yMin)}-${Number(axisRanges.he3.yMax)}`}
              data={he3GraphData}
              margin={{
                top: 20,
                right: 30,
                left: 30,
                bottom: 20
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="time"
                label={{
                  value: 'Time (hour)',
                  position: 'bottom',
                  offset: 0
                }}
                type="number"
                scale="auto"
                domain={[
                  Number(axisRanges.he3.xMin) || 0,
                  Number(axisRanges.he3.xMax) || 24
                ]}
                ticks={generateTicks(
                  Number(axisRanges.he3.xMin) || 0,
                  Number(axisRanges.he3.xMax) || 24,
                  false
                )}
                tickFormatter={(value) => value.toFixed(1)}
              />
              <YAxis
                label={{
                  value: 'Polarization (%)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: -5
                }}
                domain={[
                  Number(axisRanges.he3.yMin),
                  Number(axisRanges.he3.yMax)
                ]}
                allowDataOverflow={true}
                ticks={generateTicks(
                  Number(axisRanges.he3.yMin),
                  Number(axisRanges.he3.yMax),
                  false
                )}
                tickFormatter={(value) => value.toFixed(1)}
              />
              <Tooltip
                formatter={(value: number) => value.toFixed(1)}
                labelFormatter={(label: number) => `Time: ${label.toFixed(1)} hour`}
              />
              <Legend verticalAlign="top" height={36} />
              <Line
                type="monotone"
                dataKey="he3Polarization"
                name="He-3 Polarization"
                stroke="#82ca9d"
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Neutron Polarization Box */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-2xl font-bold text-center mb-4">Neutron Polarization</h2>

        {/* Parameters and Graph Range Settings in a row */}
        <div className="flex gap-8 mb-6">
          {/* Neutron Parameters */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-3">Parameters</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 w-48">
                  He-3 Polarization (%)
                </label>
                <input
                  type="number"
                  step="any"
                  value={tempParams.neutronParams.he3Polarization}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setTempParams({
                      ...tempParams,
                      neutronParams: {
                        ...tempParams.neutronParams,
                        he3Polarization: isNaN(value) ? 0 : value
                      }
                    });
                  }}
                  className="w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 w-48">
                  He-3 Gas Thickness (atm cm)
                </label>
                <input
                  type="number"
                  step="any"
                  value={tempParams.neutronParams.gasThickness}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setTempParams({
                      ...tempParams,
                      neutronParams: {
                        ...tempParams.neutronParams,
                        gasThickness: isNaN(value) ? 0 : value
                      }
                    });
                  }}
                  className="w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700 w-40">
                  X-Axis Unit
                </label>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      checked={params.xAxisUnit === 'wavelength'}
                      onChange={() => {
                        const newParams: Params = { ...params, xAxisUnit: 'wavelength' };
                        setParams(newParams);
                        const neutronData = calculateNeutronProperties(newParams);
                        setNeutronData(neutronData);
                      }}
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Wavelength (Å)
                    </span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      checked={params.xAxisUnit === 'energy'}
                      onChange={() => {
                        const newParams: Params = { ...params, xAxisUnit: 'energy' };
                        setParams(newParams);
                        const neutronData = calculateNeutronProperties(newParams);
                        setNeutronData(neutronData);
                      }}
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Energy (meV)
                    </span>
                  </label>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700 w-40">
                  X-Axis Scale
                </label>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      checked={!isLogScale}
                      onChange={() => {
                        setIsLogScale(false);
                        setNeutronData(calculateNeutronProperties(params));
                      }}
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Linear
                    </span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      checked={isLogScale}
                      onChange={() => {
                        setIsLogScale(true);
                        setNeutronData(calculateNeutronProperties(params));
                      }}
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Log
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Neutron Graph Range Settings */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-3">Graph Range Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  X Min ({params.xAxisUnit === 'wavelength' ? 'Å' : 'meV'})
                </label>
                <input
                  type="number"
                  step="any"
                  value={axisRanges.neutron.xMin}
                  onChange={(e) => handleAxisRangeChange("neutron", "xMin", e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  X Max ({params.xAxisUnit === 'wavelength' ? 'Å' : 'meV'})
                </label>
                <input
                  type="number"
                  step="any"
                  value={axisRanges.neutron.xMax}
                  onChange={(e) => handleAxisRangeChange("neutron", "xMax", e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Y Min (%)</label>
                <input
                  type="number"
                  step="any"
                  value={axisRanges.neutron.yMin}
                  onChange={(e) => handleAxisRangeChange("neutron", "yMin", e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Y Max (%)</label>
                <input
                  type="number"
                  step="any"
                  value={axisRanges.neutron.yMax}
                  onChange={(e) => handleAxisRangeChange("neutron", "yMax", e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Set Parameters Button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => {
              const newParams = {
                ...params,
                neutronParams: tempParams.neutronParams
              };
              setParams(newParams);
              setNeutronData(calculateNeutronProperties(newParams));
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Set Parameters
          </button>
        </div>

        {/* Neutron Graph */}
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              key={`neutron-${axisRanges.neutron.xMin}-${axisRanges.neutron.xMax}-${axisRanges.neutron.yMin}-${axisRanges.neutron.yMax}-${isLogScale}`}
              data={neutronGraphData}
              margin={{
                top: 20,
                right: 30,
                left: 90,  // 左マージンを70から90に増やす
                bottom: 20
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey={getXAxisProps().dataKey}
                label={{
                  value: getXAxisProps().label,
                  position: 'bottom',
                  offset: 0
                }}
                type="number"
                scale={isLogScale ? 'log' : 'auto'}
                domain={[
                  isLogScale ?
                    Math.max(0.1, Number(axisRanges.neutron.xMin) || 0.1) :
                    Number(axisRanges.neutron.xMin) || 0,
                  Number(axisRanges.neutron.xMax) || 10
                ]}
                ticks={generateTicks(
                  isLogScale ?
                    Math.max(0.1, Number(axisRanges.neutron.xMin) || 0.1) :
                    Number(axisRanges.neutron.xMin) || 0,
                  Number(axisRanges.neutron.xMax) || 10,
                  isLogScale
                )}
                tickFormatter={(value) => value.toFixed(1)}
              />
              <YAxis
                label={{
                  value: ['Polarization /', 'Transmission /', 'Figure of Merit'].join('\n'),
                  angle: -90,
                  position: 'insideLeft',
                  offset: -10,
                  style: { textAnchor: 'middle' }
                }}
                domain={[
                  Number(axisRanges.neutron.yMin) || 0,
                  Number(axisRanges.neutron.yMax) || 100
                ]}
                allowDataOverflow={true}
                ticks={generateTicks(
                  Number(axisRanges.neutron.yMin) || 0,
                  Number(axisRanges.neutron.yMax) || 100,
                  false
                )}
                tickFormatter={(value) => value.toFixed(1)}
              />
              <Tooltip
                formatter={(value: number) => value.toFixed(1)}
                labelFormatter={(label: number) => {
                  const unit = params.xAxisUnit === 'wavelength' ? 'Å' : 'meV';
                  return `${isLogScale ? 'log ' : ''}${getXAxisProps().label}: ${label.toFixed(1)} ${unit}`;
                }}
              />
              <Legend verticalAlign="top" height={36} />
              <Line
                type="monotone"
                dataKey="neutronPolarization"
                name="Neutron Polarization"
                stroke="#8884d8"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="neutronTransmission"
                name="Neutron Transmission"
                stroke="#ff7300"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="figureOfMerit"
                name="Figure of Merit"
                stroke="#82ca9d"
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}