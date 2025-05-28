"use client";

import { useState, useRef } from 'react';
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

interface DataPoint {
  time: number;
  theoretical: number;
}

export default function PolarizationPlot() {
  return (
    <div className="space-y-6">
      <PolarizationCalculator />

      <div className="h-[500px] p-4 bg-white rounded-lg shadow">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart>
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