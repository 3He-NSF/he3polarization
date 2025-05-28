"use client";

import { useState, useEffect } from 'react';
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
import PolarizationCalculator, { calculatePolarization } from './PolarizationCalculator';

export default function PolarizationPlot() {
  const [params, setParams] = useState({
    gasThickness: 1.0,
    initialPolarization: 70,
    relaxationTimeConstant: 100,
  });

  const [theoreticalData, setTheoreticalData] = useState<Array<{time: number, theoretical: number}>>([]);

  useEffect(() => {
    // 理論曲線のデータポイントを生成（24時間分、1分間隔）
    const newData = Array.from({ length: 24 * 60 + 1 }, (_, i) => {
      const time = i; // 分単位
      return {
        time,
        theoretical: calculatePolarization(time, params)
      };
    });
    setTheoreticalData(newData);
  }, [params]);

  return (
    <div className="space-y-6">
      <PolarizationCalculator />

      <div className="h-[500px] p-4 bg-white rounded-lg shadow">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={theoreticalData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              label={{ value: '時間 (分)', position: 'bottom' }}
            />
            <YAxis
              label={{ value: '偏極度 (%)', angle: -90, position: 'left' }}
              domain={[0, 100]}
            />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="theoretical"
              name="He-3 polarization"
              stroke="#82ca9d"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}