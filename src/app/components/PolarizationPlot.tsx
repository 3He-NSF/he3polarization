import { useState } from 'react';
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

interface DataPoint {
  time: number;
  polarization: number;
}

export default function PolarizationPlot() {
  const [data, setData] = useState<DataPoint[]>([]);
  const [timeInput, setTimeInput] = useState('');
  const [polarizationInput, setPolarizationInput] = useState('');

  const handleAddData = () => {
    const time = parseFloat(timeInput);
    const polarization = parseFloat(polarizationInput);

    if (!isNaN(time) && !isNaN(polarization)) {
      setData([...data, { time, polarization }].sort((a, b) => a.time - b.time));
      setTimeInput('');
      setPolarizationInput('');
    }
  };

  const handleClearData = () => {
    setData([]);
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-2xl font-bold mb-4">3He偏極度の時間変化</h2>
        <div className="flex gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">時間 (分)</label>
            <input
              type="number"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">偏極度 (%)</label>
            <input
              type="number"
              value={polarizationInput}
              onChange={(e) => setPolarizationInput(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAddData}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              データ追加
            </button>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleClearData}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              クリア
            </button>
          </div>
        </div>
      </div>

      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
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
              dataKey="polarization"
              name="偏極度"
              stroke="#8884d8"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}