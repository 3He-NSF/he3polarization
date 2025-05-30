"use client";

import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';

// 関数情報の型定義
interface FunctionInfo {
  name: string;
  description?: string;
  formula?: string;
  parameters?: { name: string; description: string }[];
}

// 計算に使用する関数の定義
const functions: FunctionInfo[] = [
  {
    // 3He偏極の時間変化を計算する関数
    name: "He-3 Polarization",
    formula: "P_\\mathrm{He} = P_0\\exp(-t/\\tau)",
    parameters: [
      { name: "P_0", description: "Initial He-3 polarization" },
      { name: "\\tau", description: "Relaxation time constant" },
    ]
  },
  {
    // 中性子偏極度を計算する関数
    name: "Neutron Polarization",
    formula: "P_n = \\tanh(\\rho d \\sigma P_{\\text{He}})",
    parameters: [
      { name: "\\rho d", description: "He-3 gas thickness (atm cm), where ρ is the number density and d is the gas length" },
      { name: "\\sigma", description: "Neutron absorption cross section (barn)" },
      { name: "P_\\mathrm{He}", description: "He-3 polarization" },
    ]
  },
  {
    // 中性子透過率を計算する関数
    name: "Neutron Transmission",
    formula: "T_n = \\exp(-\\rho d \\sigma)\\cosh(\\rho d \\sigma P_{\\text{He}})",
  },
  {
    // 性能指数を計算する関数
    name: "Figure Of Merit",
    formula: "\\text{FOM} = P_n^2 T_n",
  }
];

export default function FunctionDescription() {
  return (
    <div className="space-y-8">
      {/* セクションタイトル */}
      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
        Function Reference
      </h2>
      {/* 関数リスト */}
      <div className="grid gap-6">
        {functions.map((func) => (
          // 各関数の説明カード
          <div key={func.name} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            {/* 関数名とその説明 */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-sky-600">{func.name}</h3>
              <p className="mt-1 text-slate-600">{func.description}</p>
            </div>
            {/* 数式とパラメータの表示部分 */}
            <div className="px-6 py-4">
              {/* 数式の表示 */}
              {func.formula && (
                <div className="mb-4">
                  <span className="text-sm font-medium text-slate-700">Formula</span>
                  <div className="mt-2 bg-slate-50 px-4 py-3 rounded-md overflow-x-auto">
                    <InlineMath math={func.formula} />
                  </div>
                </div>
              )}
              {/* パラメータリストの表示 */}
              {func.parameters && func.parameters.length > 0 && (
                <div>
                  <span className="text-sm font-medium text-slate-700">Parameters</span>
                  <div className="mt-2 divide-y divide-slate-200">
                    {func.parameters.map((param) => (
                      <div key={param.name} className="py-3 flex items-start">
                        <code className="text-sm font-mono text-sky-600 min-w-[120px]">
                          <InlineMath math={param.name} />
                        </code>
                        <span className="text-sm text-slate-600">{param.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}