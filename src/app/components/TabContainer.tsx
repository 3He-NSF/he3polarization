"use client";

import { useState } from "react";
import PolarizationPlot from "./PolarizationPlot";
import FunctionDescription from "./FunctionDescription";

export default function TabContainer() {
  const [activeTab, setActiveTab] = useState<"plot" | "functions">("plot");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500 to-indigo-500 text-white">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-2 tracking-tight">
            He-3 Polarization Calculator
          </h1>
          <p className="text-sm text-sky-100 font-medium">Version 1.0.0</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex -mb-px">
            <button
              onClick={() => setActiveTab("plot")}
              className={`px-8 py-4 text-sm font-medium border-b-2 transition-colors duration-200 ${
                activeTab === "plot"
                  ? "border-sky-500 text-sky-600"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              Visualization
            </button>
            <button
              onClick={() => setActiveTab("functions")}
              className={`px-8 py-4 text-sm font-medium border-b-2 transition-colors duration-200 ${
                activeTab === "functions"
                  ? "border-sky-500 text-sky-600"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
              }`}
            >
              Functions
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {activeTab === "plot" ? <PolarizationPlot /> : <FunctionDescription />}
        </div>
      </div>
    </div>
  );
}