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
  polarization: number;
  theoretical?: number;
}

export default function PolarizationPlot() {
  const [data, setData] = useState<DataPoint[]>([]);
  const [timeInput, setTimeInput] = useState('');
  const [polarizationInput, setPolarizationInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleExportData = () => {
    const csvContent = "Time (min),Polarization (%)\n" +
      data.map(point => `${point.time},${point.polarization}`).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'polarization_data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const newData: DataPoint[] = [];

      // Skip header line
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          const [time, polarization] = line.split(',').map(Number);
          if (!isNaN(time) && !isNaN(polarization)) {
            newData.push({ time, polarization });
          }
        }
      }

      setData(newData.sort((a, b) => a.time - b.time));
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <PolarizationCalculator />

      <div className="p-4 bg-white rounded-lg shadow">
        <h3 className="text-xl font-bold mb-4">測定データ</h3>
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
          <div className="flex items-end space-x-2">
            <button
              onClick={handleAddData}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              データ追加
            </button>
            <button
              onClick={handleClearData}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              クリア
            </button>
          </div>
        </div>

        <div className="flex gap-4 mb-4">
          <button
            onClick={handleExportData}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            CSVエクスポート
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            CSVインポート
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportData}
            accept=".csv"
            className="hidden"
          />
        </div>
      </div>

      <div className="h-[500px] p-4 bg-white rounded-lg shadow">
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
              name="測定値"
              stroke="#8884d8"
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="theoretical"
              name="理論曲線"
              stroke="#82ca9d"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}