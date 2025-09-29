"use client"; // Next.js（App Router）でクライアント側で実行するコンポーネントであることを宣言

import { useState, useEffect, useCallback } from 'react'; // React のフックをインポート
import {
  LineChart,  // 折れ線グラフ本体
  Line,       // 折れ線系列
  XAxis,      // X軸
  YAxis,      // Y軸
  CartesianGrid, // グリッド線
  Tooltip,    // ホバー時ツールチップ
  Legend,     // 凡例
  ResponsiveContainer // 親に合わせて自動リサイズ
} from 'recharts';

// 基本計算パラメータの型定義
interface BaseCalculationParams {
  initialPolarization: number;  // 初期偏極度（%）
  relaxationTimeConstant: number;  // 緩和時定数（時間）
}

// 中性子パラメータの型定義
interface NeutronParams {
  gasThickness: number;  // He-3 ガス厚さ（atm·cm）
  energy: number;        // エネルギー（meV）
  he3Polarization: number;  // He-3 偏極度（%）
}

// 全パラメータの型定義（基底＋中性子＋軸単位）
interface Params extends BaseCalculationParams {
  xAxisUnit: 'wavelength' | 'energy';  // X軸の単位（波長 or エネルギー）
  neutronParams: NeutronParams;        // 中性子関連パラメータ
}

// グラフ1点のデータ型
interface DataPoint {
  time: number;                 // 時間（h）
  wavelength: number;           // 波長（Å）
  energy: number;               // エネルギー（meV）
  he3Polarization: number;      // He-3 偏極度（%）
  neutronPolarization: number;  // 中性子偏極度（%）
  neutronTransmission: number;  // 中性子透過率（%）
  figureOfMerit: number;        // FOM（%単位換算後の値）
  [key: string]: number;        // 拡張用の数値プロパティ
}

// 物理定数
const PHYSICAL_CONSTANTS = {
  V: 22.4e3,             // モル体積 (cm^3/mol) @標準
  Na: 6.0221409e23,      // アボガドロ数 (/mol)
  sigma0: 5333,          // 吸収断面積 barn @ λ=1.8Å（スケーリング用）
  barn_to_cm2: 1e-24     // barn→cm^2 変換
};

// 共通因子 n * σ(λ) の計算（cm^2単位へ変換込み）
function calculateCommonFactors(wavelength: number) {
  // const n = PHYSICAL_CONSTANTS.Na/PHYSICAL_CONSTANTS.V;  // 数密度 n
  const n = 2.687e19;  // 数密度 n
  const sigma = PHYSICAL_CONSTANTS.sigma0 * (wavelength / 1.8);  // σ(λ) を1.8Å基準で線形スケール
  return n * sigma * PHYSICAL_CONSTANTS.barn_to_cm2;  // nσ を cm^2 に直して返す
}

// 中性子偏極度 Pn = tanh(nσ·P_He3·t)
function calculateNeutronPolarization(wavelength: number, he3Polarization: number, gasThickness: number): number {
  const commonFactor = calculateCommonFactors(wavelength); // nσ(λ)
  const neutronPolarization = Math.tanh(commonFactor * he3Polarization * gasThickness); // tanh(nσ P t)
  return neutronPolarization * 100;  // %
}

// 中性子透過率 T = e^{-nσt} cosh(nσ P t)
function calculateNeutronTransmission(wavelength: number, he3Polarization: number, gasThickness: number): number {
  const commonFactor = calculateCommonFactors(wavelength); // nσ(λ)
  const factor = commonFactor * gasThickness;              // nσ t
  const neutronTransmission = Math.exp(-factor) * Math.cosh(factor*he3Polarization); // e^{-nσt} cosh(nσPt)
  return neutronTransmission * 100;  // %
}

// FOM = Pn^2 * T （%換算して返す）
function calculateFigureOfMerit(wavelength: number, he3Polarization: number, gasThickness: number): number {
  const commonFactor = calculateCommonFactors(wavelength);        // nσ(λ)
  const factor = commonFactor * gasThickness;                     // nσ t
  const neutronPolarization = Math.tanh(commonFactor * he3Polarization * gasThickness); // Pn
  const neutronTransmission = Math.exp(-factor) * Math.cosh(factor*he3Polarization);    // T
  const FigureOfMerit = neutronPolarization*neutronPolarization*neutronTransmission;    // Pn^2 T
  return FigureOfMerit * 100;  // %
}

export default function PolarizationPlot() {
  const [params, setParams] = useState<Params>({ // 実際に計算に使う現在値
    initialPolarization: 70.0,                   // He-3 初期偏極度（%）
    relaxationTimeConstant: 100.0,               // 緩和時定数（h）
    xAxisUnit: 'wavelength',                     // X軸は波長表示
    neutronParams: {
      gasThickness: 10.0,                        // 厚さ（atm·cm）
      energy: 14.7,                              // 代表エネルギー（meV）
      he3Polarization: 70,                       // He-3 偏極度（%）
    }
  });

  const [axisRanges, setAxisRanges] = useState({ // 軸レンジ（文字列で持ち、入力と同期）
    he3: {
      xMin: "0",      // He-3 グラフの X最小（h）
      xMax: "100",    // He-3 グラフの X最大（h）
      yMin: "0",      // He-3 グラフの Y最小（%）
      yMax: "100"      // He-3 グラフの Y最大（%）
    },
    neutron: {
      xMin: "0",      // Neutron グラフ X最小（Å or meV）
      xMax: "100",    // Neutron グラフ X最大（Å or meV）
      yMin: "0",      // Neutron グラフ Y最小（%）
      yMax: "100"     // Neutron グラフ Y最大（%）
    }
  });

  const [he3Data, setHe3Data] = useState<DataPoint[]>([]);       // He-3 グラフ用データ配列
  const [neutronData, setNeutronData] = useState<DataPoint[]>([]); // Neutron グラフ用データ配列

  const [tempParams, setTempParams] = useState<Params>({ // 入力フォームの一時値（確定ボタンで params に反映）
    initialPolarization: 70.0,
    relaxationTimeConstant: 100.0,
    xAxisUnit: 'wavelength',
    neutronParams: {
      gasThickness: 10.0,
      energy: 14.7,
      he3Polarization: 70,
    }
  });

  const [isLogScale, setIsLogScale] = useState(false); // Neutron X軸の対数表示フラグ
  const [energyUnit, setEnergyUnit] = useState<'meV' | 'Å'>('meV'); // He-3 Polarization グラフのエネルギー単位

  // x（波長 or エネルギー）から1点分の中性子特性を計算して points へ push
  const addDataPoint = useCallback((x: number, currentParams: Params, points: DataPoint[]) => {
    const wavelength = currentParams.xAxisUnit === 'wavelength' ? x : Math.sqrt(81.81 / x); // E↔λ 変換: E[meV]=81.81/λ^2
    const energy = currentParams.xAxisUnit === 'wavelength' ? 81.81 / (x * x) : x;          // 逆変換

    const neutronPolarization = calculateNeutronPolarization(       // 中性子偏極度（%）
      wavelength,
      currentParams.neutronParams.he3Polarization / 100,            // He-3 偏極度を 0–1 に正規化
      currentParams.neutronParams.gasThickness
    );

    const neutronTransmission = calculateNeutronTransmission(       // 透過率（%）
      wavelength,
      currentParams.neutronParams.he3Polarization / 100,
      currentParams.neutronParams.gasThickness
    );

    const figureOfMerit = calculateFigureOfMerit(                   // FOM（%）
      wavelength,
      currentParams.neutronParams.he3Polarization / 100,
      currentParams.neutronParams.gasThickness
    );

    points.push({                // 計算点を配列へ追加
      time: 0,                   // Neutron グラフでは時間は未使用のため 0 に固定
      wavelength,
      energy,
      he3Polarization: currentParams.neutronParams.he3Polarization, // 表示用に % 値を保持
      neutronPolarization,
      neutronTransmission,
      figureOfMerit
    });
  }, []);

  // He-3 偏極度の指数減衰カーブを生成
  const calculateHe3Polarization = useCallback((currentParams: Params) => {
    const points: DataPoint[] = [];                       // 出力配列
    const xMin = Number(axisRanges.he3.xMin) || 0;        // 時間の最小値
    const xMax = Number(axisRanges.he3.xMax) || 24;       // 時間の最大値
    const step = (xMax - xMin) / 100;                     // サンプル点数を100分割

    for (let time = xMin; time <= xMax; time += step) {   // 時間でループ
      const he3Polarization = currentParams.initialPolarization *
        Math.exp(-time / currentParams.relaxationTimeConstant);     // P(t)=P0 exp(-t/T1)
      const wavelength = Math.sqrt(81.81 / currentParams.neutronParams.energy); // E = 81.81/λ^2 から λ = √(81.81/E)
      const NeutronPolarization_decay = Math.tanh(calculateCommonFactors(wavelength) * he3Polarization/100 * currentParams.neutronParams.gasThickness);
      const NeutronTransmission_decay = Math.exp(-calculateCommonFactors(wavelength)*currentParams.neutronParams.gasThickness) * Math.cosh(he3Polarization/100 * currentParams.neutronParams.gasThickness*calculateCommonFactors(wavelength));


      points.push({                                       // 点を追加
        time,
        wavelength: wavelength,
        energy: currentParams.neutronParams.energy,
        he3Polarization,
        neutronPolarization: NeutronPolarization_decay * 100, // パーセントに変換
        neutronTransmission: NeutronTransmission_decay * 100,
        figureOfMerit: 0
      });
    }

    return points; // 配列を返す
  }, [axisRanges.he3.xMin, axisRanges.he3.xMax, params.neutronParams.energy, params.neutronParams.gasThickness]); // x範囲とneutronパラメータの変更で再生成

  // 中性子特性（Pn, T, FOM）を X 軸（λ or E、lin or log）に沿って生成
  const calculateNeutronProperties = useCallback((currentParams: Params) => {
    const xMin = Number(axisRanges.neutron.xMin) || 0;    // X最小
    const xMax = Number(axisRanges.neutron.xMax) || 10;   // X最大
    const effectiveXMin = isLogScale ? Math.max(0.1, xMin) : xMin; // 対数では0以下不可
    const points: DataPoint[] = [];                       // 出力配列
    const numPoints = 200;                                // サンプル点数

    if (isLogScale) {                                     // 対数スケールの場合
      const logMin = Math.log10(effectiveXMin);           // 10^均等刻み
      const logMax = Math.log10(xMax);
      const logStep = (logMax - logMin) / numPoints;

      for (let i = 0; i <= numPoints; i++) {              // 対数均等刻みでループ
        const x = Math.pow(10, logMin + i * logStep);
        addDataPoint(x, currentParams, points);           // 1点を追加
      }
    } else {                                              // 線形スケールの場合
      const step = (xMax - effectiveXMin) / numPoints;
      for (let x = effectiveXMin; x <= xMax; x += step) {
        addDataPoint(x, currentParams, points);           // 1点を追加
      }
    }

    return points; // 配列を返す
  }, [axisRanges.neutron.xMin, axisRanges.neutron.xMax, isLogScale, addDataPoint]); // 依存

  // 軸レンジ入力変更ハンドラ（対象グラフ・フィールド・値）
  const handleAxisRangeChange = (graph: 'he3' | 'neutron', field: keyof typeof axisRanges.he3, value: string) => {
    setAxisRanges(prev => ({           // 対象グラフの該当フィールドのみ更新
      ...prev,
      [graph]: {
        ...prev[graph],
        [field]: value
      }
    }));

    // 軸変更に応じて即再計算（操作感向上）
    setHe3Data(calculateHe3Polarization(params));
    setNeutronData(calculateNeutronProperties(params));
  };

  useEffect(() => {                                    // He-3 or Neutron の再計算トリガー
    setHe3Data(calculateHe3Polarization(params));      // He-3 再計算
    setNeutronData(calculateNeutronProperties(params));// Neutron 再計算
  }, [calculateHe3Polarization, calculateNeutronProperties, params, axisRanges.he3.yMin, axisRanges.he3.yMax]); // 依存

  useEffect(() => {                                    // 尤も Neutron はログスケール変更でも再計算
    setNeutronData(calculateNeutronProperties(params));
  }, [isLogScale, calculateNeutronProperties, params,axisRanges.neutron.yMin,axisRanges.neutron.yMax]);

  // He-3 グラフのデータ（そのまま渡すだけ）
  const he3GraphData = he3Data;

  // Neutron グラフのデータ（そのまま渡すだけ）
  const neutronGraphData = neutronData;

  // 対数目盛り用の補助目盛を生成（1,2,4,6,8×10^n）
  const generateLogTicks = (min: number, max: number) => {
    const ticks: number[] = [];
    const minExp = Math.floor(Math.log10(min));
    const maxExp = Math.ceil(Math.log10(max));

    for (let exp = minExp; exp <= maxExp; exp++) {
      const base = Math.pow(10, exp);         // 10^exp
      if (base >= min && base <= max) {
        ticks.push(base);                      // 主目盛
      }
      if (exp < maxExp) {
        [2, 4, 6, 8].forEach(n => {           // 補助目盛
          const value = n * base;
          if (value >= min && value <= max) {
            ticks.push(value);
          }
        });
      }
    }
    return ticks.sort((a, b) => a - b);       // 昇順ソート
  };

  // 線形/対数どちらでも使える tick 生成ヘルパ
  const generateTicks = (min: number, max: number, useLogScale: boolean = false) => {
    if (useLogScale) {
      return generateLogTicks(Math.max(0.1, min), max); // 0以下回避
    }

    const range = max - min; // 範囲に応じてステップを粗密調整
    let step = 1;

    if (range <= 5) step = 1;
    else if (range <= 10) step = 2;
    else if (range <= 20) step = 5;
    else if (range <= 50) step = 10;
    else step = 20;

    const ticks = [];
    for (let current = min; current <= max + 0.0001; current += step) { // 端数誤差対策で+ε
      ticks.push(Number(current.toFixed(3))); // 小数3桁で整形
    }
    return ticks;
  };

  // X軸のラベルと dataKey を現在の単位に応じて返す
  const getXAxisProps = () => {
    return {
      label: params.xAxisUnit === 'wavelength' ? 'Wavelength (Å)' : 'Energy (meV)', // 軸ラベル
      dataKey: params.xAxisUnit === 'wavelength' ? 'wavelength' : 'energy'          // データキー
    };
  };

  return (
    <div className="space-y-6">
      {/* ルートコンテナ。縦に6の間隔を空けてボックスを並べる */}

      {/* He-3 Polarization Box */}
      <div className="bg-white rounded-lg shadow p-4">
        {/* ボックス見出し */}
        <h2 className="text-2xl font-bold text-center mb-4">He-3 Polarization</h2>

        {/* パラメータ設定とレンジ設定を横並び */}
        <div className="flex gap-8 mb-6">
          {/* 左側：He-3 パラメータ入力 */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-3">Parameters</h3>
            <div className="grid grid-cols-1 gap-4">
              {/* 初期偏極度入力 */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 w-48">
                  Initial Polarization (%)
                </label>
                <input
                  type="number"               /* 数値入力 */
                  step="any"                  /* 任意精度の小数を許可 */
                  value={tempParams.initialPolarization} /* 一時値を表示 */
                  onChange={(e) => {         /* 入力変更で一時値を更新 */
                    const value = parseFloat(e.target.value) || 0;
                    setTempParams({
                      ...tempParams,
                      initialPolarization: value
                    });
                  }}
                  className="w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" /* 見た目 */
                />
              </div>
              {/* 緩和時定数入力 */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 w-48">
                  Relaxation Time (hour)
                </label>
                <input
                  type="number"
                  step="any"
                  value={tempParams.relaxationTimeConstant}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setTempParams({
                      ...tempParams,
                      relaxationTimeConstant: value
                    });
                  }}
                  className="w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
                            {/* He-3 厚さ（atm·cm） */}
                            <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 w-48">
                  He-3 Gas Thickness (amg cm)
                </label>
                <input
                  type="number"
                  step="any"
                  value={tempParams.neutronParams.gasThickness}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setTempParams({
                      ...tempParams,
                      neutronParams: {
                        ...tempParams.neutronParams,
                        gasThickness: value
                      }
                    });
                  }}
                  className="w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              {/* Neutron Energy (meV or Å) 入力 */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 w-48">
                  Energy or Wavelength
                </label>
                <input
                  type="number"
                  step="any"
                  // 表示値は単位に応じて λ ↔ E 変換して見せる
                  value={
                    energyUnit === 'meV'
                      ? Number(tempParams.neutronParams.energy.toFixed(1))                      // E (meV)
                      : Number(Math.sqrt(81.81 / tempParams.neutronParams.energy).toFixed(1))  // λ = √(81.81/E)
                  }
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    let energy = tempParams.neutronParams.energy;

                    if (energyUnit === 'meV') {
                      // 入力は E そのまま
                      energy = val;
                    } else {
                      // 入力は λ → E に換算
                      energy = val > 0 ? 81.81 / (val * val) : 0;
                    }

                    setTempParams({
                      ...tempParams,
                      neutronParams: {
                        ...tempParams.neutronParams,
                        energy: energy
                      }
                    });
                  }}
                  className="w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />

                {/* ▼ 単位選択プルダウン */}
                <select
                  value={energyUnit}
                  onChange={(e) => setEnergyUnit(e.target.value as 'meV' | 'Å')}
                  className="ml-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="meV">meV</option>
                  <option value="Å">Å</option>
                </select>
              </div>
            </div>
          </div>

          {/* 右側：He-3 グラフの軸レンジ設定 */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-3">Graph Range Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* X最小（時間） */}
              <div>
                <label className="block text-sm font-medium text-gray-700">X Min (hour)</label>
                <input
                  type="number"
                  step="any"
                  value={axisRanges.he3.xMin}
                  onChange={(e) => handleAxisRangeChange("he3", "xMin", e.target.value)} /* ステート反映＋再計算 */
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              {/* X最大（時間） */}
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
              {/* Y最小（%） */}
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
              {/* Y最大（%） */}
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

        {/* He-3 パラメータの確定ボタン（temp→params 反映） */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => {
              const newParams = {
                ...params,
                initialPolarization: tempParams.initialPolarization,
                relaxationTimeConstant: tempParams.relaxationTimeConstant,
                neutronParams: tempParams.neutronParams
              };
              setParams(newParams);                         /* 確定 */
              setHe3Data(calculateHe3Polarization(newParams)); /* 即再計算 */
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Set Parameters
          </button>
        </div>

        {/* He-3 グラフ領域（高さ固定） */}
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              key={`he3-${Number(axisRanges.he3.xMin)}-${Number(axisRanges.he3.xMax)}-${Number(axisRanges.he3.yMin)}-${Number(axisRanges.he3.yMax)}`} /* 軸変更で完全再マウント */
              data={he3GraphData}            /* データソース */
              margin={{                      /* 余白設定 */
                top: 20,
                right: 30,
                left: 30,
                bottom: 20
              }}
            >
              <CartesianGrid strokeDasharray="3 3" /> {/* 点線グリッド */}
              <XAxis
                dataKey="time"               /* Xは時間 */
                label={{ value: 'Time (hour)', position: 'bottom', offset: 0 }} /* 軸ラベル */
                type="number"                /* 数値軸 */
                scale="auto"                 /* 自動スケール */
                domain={[
                  Number(axisRanges.he3.xMin) || 0,
                  Number(axisRanges.he3.xMax) || 24
                ]}                            /* 表示範囲 */
                ticks={generateTicks(         /* 目盛り */
                  Number(axisRanges.he3.xMin) || 0,
                  Number(axisRanges.he3.xMax) || 24,
                  false
                )}
                tickFormatter={(value) => value.toFixed(1)} /* 表示桁 */
              />
              <YAxis
                label={{
                  value: 'Polarization (%)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: -5
                }}                           /* Y軸ラベル */
                domain={[
                  Number(axisRanges.he3.yMin),
                  Number(axisRanges.he3.yMax)
                ]}                           /* 表示範囲 */
                allowDataOverflow={true}     /* データ外も描画可 */
                ticks={generateTicks(        /* 目盛り */
                  Number(axisRanges.he3.yMin),
                  Number(axisRanges.he3.yMax),
                  false
                )}
                tickFormatter={(value) => value.toFixed(1)} /* 表示桁 */
              />
              <Tooltip
                formatter={(value: number) => value.toFixed(1)} /* 値の表示桁 */
                labelFormatter={(label: number) => `Time: ${label.toFixed(1)} hour`} /* ラベル表示 */
              />
              <Legend verticalAlign="top" height={36} /> {/* 凡例 */}
              <Line
                type="monotone"              /* 曲線形状 */
                dataKey="he3Polarization"    /* y=He-3 偏極度 */
                name="He-3 Polarization"     /* 凡例名 */
                stroke="#82ca9d"              /* 線色 */
                dot={false}                   /* マーカー非表示 */
                isAnimationActive={false}     /* アニメ無効（数値安定） */
              />
              <Line
                type="monotone"              /* 曲線形状 */
                dataKey="neutronPolarization" /* y=中性子偏極度 */
                name="Neutron Polarization"  /* 凡例名 */
                stroke="#8884d8"              /* 線色 */
                dot={false}                   /* マーカー非表示 */
                isAnimationActive={false}     /* アニメ無効（数値安定） */
              />
              <Line
                type="monotone"              /* 曲線形状 */
                dataKey="neutronTransmission" /* y=中性子透過率 */
                name="Neutron Transmission"  /* 凡例名 */
                stroke="#ff7300"              /* 線色 */
                dot={false}                   /* マーカー非表示 */
                isAnimationActive={false}     /* アニメ無効（数値安定） */
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Neutron Polarization Box */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-2xl font-bold text-center mb-4">Neutron Polarization</h2>

        {/* 上段：パラメータ入力＋レンジ設定 */}
        <div className="flex gap-8 mb-6">
          {/* 左：中性子計算パラメータ */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-3">Parameters</h3>
            <div className="grid grid-cols-1 gap-4">
              {/* He-3 偏極度（%） */}
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
              {/* He-3 厚さ（atm·cm） */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 w-48">
                  He-3 Gas Thickness (amg cm)
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
              {/* X軸の単位（λ or E） */}
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
                        const newParams: Params = { ...params, xAxisUnit: 'wavelength' }; // 単位切替
                        setParams(newParams);                                             // 反映
                        const neutronData = calculateNeutronProperties(newParams);        // 再計算
                        setNeutronData(neutronData);                                      // セット
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
                        const newParams: Params = { ...params, xAxisUnit: 'energy' };     // 単位切替
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
              {/* X軸スケール（Linear / Log） */}
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
                        setIsLogScale(false);                            // 線形へ
                        setNeutronData(calculateNeutronProperties(params)); // 再計算
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
                        setIsLogScale(true);                             // 対数へ
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

          {/* 右：Neutron グラフの軸レンジ設定 */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-3">Graph Range Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* X最小（単位は現在の選択に追従） */}
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
              {/* X最大 */}
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
              {/* Y最小（%） */}
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
              {/* Y最大（%） */}
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

        {/* Neutron パラメータの確定ボタン（temp→params 反映） */}
        <div className="flex justify-end mb-6">
          <button
            onClick={() => {
              const newParams = {
                ...params,
                neutronParams: tempParams.neutronParams
              };
              setParams(newParams);                            // 反映
              setNeutronData(calculateNeutronProperties(newParams)); // 再計算
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Set Parameters
          </button>
        </div>

        {/* Neutron グラフ */}
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              key={`neutron-${axisRanges.neutron.xMin}-${axisRanges.neutron.xMax}-${axisRanges.neutron.yMin}-${axisRanges.neutron.yMax}-${isLogScale}`} /* 軸やスケール変更で再マウント */
              data={neutronGraphData}        /* データソース */
              margin={{
                top: 20,
                right: 30,
                left: 90,  // 左余白を広げて複数ラベルに対応
                bottom: 20
              }}
            >
              <CartesianGrid strokeDasharray="3 3" /> {/* 点線グリッド */}
              <XAxis
                dataKey={getXAxisProps().dataKey}      /* λ or E を選択的に使用 */
                label={{
                  value: getXAxisProps().label,        /* ラベル文字列 */
                  position: 'bottom',
                  offset: 0
                }}
                type="number"                           /* 数値軸 */
                scale={isLogScale ? 'log' : 'auto'}     /* スケール切替 */
                domain={[
                  isLogScale ?
                    Math.max(0.1, Number(axisRanges.neutron.xMin) || 0.1) : // 対数で0回避
                    Number(axisRanges.neutron.xMin) || 0,
                  Number(axisRanges.neutron.xMax) || 10
                ]}
                ticks={generateTicks(                   /* 目盛り */
                  isLogScale ?
                    Math.max(0.1, Number(axisRanges.neutron.xMin) || 0.1) :
                    Number(axisRanges.neutron.xMin) || 0,
                  Number(axisRanges.neutron.xMax) || 10,
                  isLogScale
                )}
                tickFormatter={(value) => value.toFixed(1)} /* 表示桁 */
              />
              <YAxis
                label={{
                  value: ['Polarization /', 'Transmission /', 'Figure of Merit'].join('\n'), // 縦書きふうに3行
                  angle: -90,
                  position: 'insideLeft',
                  offset: -10,
                  style: { textAnchor: 'middle' }
                }}
                domain={[
                  Number(axisRanges.neutron.yMin) || 0,
                  Number(axisRanges.neutron.yMax) || 100
                ]}                                     /* 表示範囲 */
                allowDataOverflow={true}               /* データ外も描画可 */
                ticks={generateTicks(                  /* 目盛り */
                  Number(axisRanges.neutron.yMin) || 0,
                  Number(axisRanges.neutron.yMax) || 100,
                  false
                )}
                tickFormatter={(value) => value.toFixed(1)} /* 表示桁 */
              />
              <Tooltip
                formatter={(value: number) => value.toFixed(1)} /* 値の桁 */
                labelFormatter={(label: number) => {
                  const unit = params.xAxisUnit === 'wavelength' ? 'Å' : 'meV'; // 単位を付与
                  return `${isLogScale ? 'log ' : ''}${getXAxisProps().label}: ${label.toFixed(1)} ${unit}`;
                }}
              />
              <Legend verticalAlign="top" height={36} /> {/* 凡例 */}
              <Line
                type="monotone"
                dataKey="neutronPolarization"    /* y=中性子偏極度 */
                name="Neutron Polarization"
                stroke="#8884d8"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="neutronTransmission"    /* y=透過率 */
                name="Neutron Transmission"
                stroke="#ff7300"
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="figureOfMerit"          /* y=FOM */
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
