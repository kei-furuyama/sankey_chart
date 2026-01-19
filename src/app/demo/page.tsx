'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamic import with SSR disabled to avoid d3-sankey SSR issues
const SankeyChart = dynamic(
  () => import('@/lib').then((mod) => mod.SankeyChart),
  { ssr: false }
);

// Sample datasets
const datasets = {
  // 東京都港区 財政収支 (令和4年度決算ベース、単位：億円)
  minatoFiscal: {
    nodes: [
      // 歳入 - 自主財源
      { id: 'local_tax', name: '特別区税' },
      { id: 'charges', name: '使用料・手数料' },
      { id: 'property_income', name: '財産収入' },
      { id: 'donations', name: '寄附金' },
      { id: 'transfer_in', name: '繰入金' },
      { id: 'carryover', name: '繰越金' },
      { id: 'other_income', name: '諸収入' },
      // 歳入 - 依存財源
      { id: 'special_grant', name: '特別区交付金' },
      { id: 'national_grant', name: '国庫支出金' },
      { id: 'metro_grant', name: '都支出金' },
      { id: 'local_bonds', name: '特別区債' },
      { id: 'other_grant', name: 'その他交付金' },
      // 中間カテゴリ
      { id: 'independent', name: '自主財源' },
      { id: 'dependent', name: '依存財源' },
      // 歳入歳出
      { id: 'total', name: '歳入歳出' },
      // 歳出カテゴリ
      { id: 'admin_cat', name: '行政運営' },
      { id: 'welfare_cat', name: '生活福祉' },
      { id: 'urban_cat', name: '都市整備' },
      { id: 'education_cat', name: '教育文化' },
      // 歳出 - 行政運営
      { id: 'assembly', name: '議会費' },
      { id: 'general_admin', name: '総務費' },
      // 歳出 - 生活福祉
      { id: 'welfare', name: '民生費' },
      { id: 'health', name: '衛生費' },
      // 歳出 - 都市整備
      { id: 'commerce', name: '産業経済費' },
      { id: 'civil_eng', name: '土木費' },
      { id: 'fire', name: '消防費' },
      // 歳出 - 教育文化
      { id: 'education', name: '教育費' },
      // その他
      { id: 'debt', name: '公債費' },
      { id: 'reserve', name: '諸支出金' },
    ],
    links: [
      // 自主財源への流入（港区は自主財源率が非常に高い）
      { source: 'local_tax', target: 'independent', value: 980 },
      { source: 'charges', target: 'independent', value: 45 },
      { source: 'property_income', target: 'independent', value: 35 },
      { source: 'donations', target: 'independent', value: 15 },
      { source: 'transfer_in', target: 'independent', value: 120 },
      { source: 'carryover', target: 'independent', value: 85 },
      { source: 'other_income', target: 'independent', value: 60 },
      // 依存財源への流入
      { source: 'special_grant', target: 'dependent', value: 25 },
      { source: 'national_grant', target: 'dependent', value: 180 },
      { source: 'metro_grant', target: 'dependent', value: 95 },
      { source: 'local_bonds', target: 'dependent', value: 30 },
      { source: 'other_grant', target: 'dependent', value: 40 },
      // 中間→合計
      { source: 'independent', target: 'total', value: 1340 },
      { source: 'dependent', target: 'total', value: 370 },
      // 合計→歳出カテゴリ
      { source: 'total', target: 'admin_cat', value: 250 },
      { source: 'total', target: 'welfare_cat', value: 780 },
      { source: 'total', target: 'urban_cat', value: 320 },
      { source: 'total', target: 'education_cat', value: 280 },
      { source: 'total', target: 'debt', value: 45 },
      { source: 'total', target: 'reserve', value: 35 },
      // 行政運営→詳細
      { source: 'admin_cat', target: 'assembly', value: 8 },
      { source: 'admin_cat', target: 'general_admin', value: 242 },
      // 生活福祉→詳細
      { source: 'welfare_cat', target: 'welfare', value: 620 },
      { source: 'welfare_cat', target: 'health', value: 160 },
      // 都市整備→詳細
      { source: 'urban_cat', target: 'commerce', value: 45 },
      { source: 'urban_cat', target: 'civil_eng', value: 240 },
      { source: 'urban_cat', target: 'fire', value: 35 },
      // 教育文化→詳細
      { source: 'education_cat', target: 'education', value: 280 },
    ],
  },
  energy: {
    nodes: [
      { id: 'coal', name: 'Coal' },
      { id: 'gas', name: 'Natural Gas' },
      { id: 'oil', name: 'Oil' },
      { id: 'nuclear', name: 'Nuclear' },
      { id: 'renewable', name: 'Renewable' },
      { id: 'electricity', name: 'Electricity' },
      { id: 'heat', name: 'Heat' },
      { id: 'transport', name: 'Transport' },
      { id: 'residential', name: 'Residential' },
      { id: 'industrial', name: 'Industrial' },
      { id: 'commercial', name: 'Commercial' },
    ],
    links: [
      { source: 'coal', target: 'electricity', value: 100 },
      { source: 'coal', target: 'industrial', value: 50 },
      { source: 'gas', target: 'electricity', value: 80 },
      { source: 'gas', target: 'heat', value: 60 },
      { source: 'gas', target: 'residential', value: 40 },
      { source: 'oil', target: 'transport', value: 120 },
      { source: 'oil', target: 'industrial', value: 30 },
      { source: 'nuclear', target: 'electricity', value: 70 },
      { source: 'renewable', target: 'electricity', value: 90 },
      { source: 'electricity', target: 'residential', value: 100 },
      { source: 'electricity', target: 'industrial', value: 80 },
      { source: 'electricity', target: 'commercial', value: 60 },
      { source: 'heat', target: 'residential', value: 30 },
      { source: 'heat', target: 'industrial', value: 30 },
    ],
  },
  budget: {
    nodes: [
      { id: 'salary', name: 'Salary' },
      { id: 'investments', name: 'Investments' },
      { id: 'freelance', name: 'Freelance' },
      { id: 'income', name: 'Total Income' },
      { id: 'housing', name: 'Housing' },
      { id: 'food', name: 'Food' },
      { id: 'transport', name: 'Transport' },
      { id: 'entertainment', name: 'Entertainment' },
      { id: 'savings', name: 'Savings' },
    ],
    links: [
      { source: 'salary', target: 'income', value: 5000 },
      { source: 'investments', target: 'income', value: 500 },
      { source: 'freelance', target: 'income', value: 1000 },
      { source: 'income', target: 'housing', value: 2000 },
      { source: 'income', target: 'food', value: 800 },
      { source: 'income', target: 'transport', value: 500 },
      { source: 'income', target: 'entertainment', value: 700 },
      { source: 'income', target: 'savings', value: 2500 },
    ],
  },
  conversion: {
    nodes: [
      { id: 'visitors', name: 'Website Visitors' },
      { id: 'signup', name: 'Sign Up Page' },
      { id: 'bounce', name: 'Bounced' },
      { id: 'trial', name: 'Free Trial' },
      { id: 'abandoned', name: 'Abandoned' },
      { id: 'paid', name: 'Paid Customer' },
      { id: 'churned', name: 'Churned' },
      { id: 'retained', name: 'Retained' },
    ],
    links: [
      { source: 'visitors', target: 'signup', value: 1000 },
      { source: 'visitors', target: 'bounce', value: 4000 },
      { source: 'signup', target: 'trial', value: 600 },
      { source: 'signup', target: 'abandoned', value: 400 },
      { source: 'trial', target: 'paid', value: 200 },
      { source: 'trial', target: 'abandoned', value: 400 },
      { source: 'paid', target: 'retained', value: 150 },
      { source: 'paid', target: 'churned', value: 50 },
    ],
  },
};

const datasetDescriptions = {
  minatoFiscal: '東京都港区の財政収支（令和4年度決算、単位：億円）',
  energy: 'Visualize how energy flows from primary sources through conversion to end uses',
  budget: 'Track income sources and how money flows to different expense categories',
  conversion: 'Analyze user journey from website visitors to retained customers',
};

export default function DemoPage() {
  const [selectedDataset, setSelectedDataset] = useState<keyof typeof datasets>('energy');
  const [showLabels, setShowLabels] = useState(true);
  const [showTooltips, setShowTooltips] = useState(true);
  const [useGradient, setUseGradient] = useState(true);
  const [showValue, setShowValue] = useState(false);
  const [labelPosition, setLabelPosition] = useState<'left' | 'right' | 'outside' | 'inside'>('outside');
  const [nodeWidth, setNodeWidth] = useState(24);
  const [nodePadding, setNodePadding] = useState(20);
  const [nodeAlign, setNodeAlign] = useState<'left' | 'right' | 'center' | 'justify'>('justify');

  const data = datasets[selectedDataset] ?? datasets.energy;

  return (
    <div className="min-h-screen bg-[#FAFBFC] dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white/90 backdrop-blur-md dark:border-gray-800/60 dark:bg-slate-900/90">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="group flex items-center gap-2">
              <div className="relative h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md transition-transform duration-200 group-hover:scale-105">
                <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-transparent to-white/20" />
              </div>
              <span className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">Sankey Chart</span>
            </Link>
            <span className="hidden sm:inline-block text-gray-300 dark:text-gray-600">/</span>
            <span className="hidden sm:inline-block text-sm font-medium text-gray-500 dark:text-gray-400">
              Demo
            </span>
          </div>
          <Link
            href="/docs"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
          >
            Docs
          </Link>
        </div>
      </header>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Chart Area */}
          <div className="relative">
            <div className="rounded-2xl border border-gray-200/60 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-slate-900">
              {/* Chart Header */}
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedDataset === 'minatoFiscal' && '東京都港区 財政収支'}
                    {selectedDataset === 'energy' && 'Energy Flow'}
                    {selectedDataset === 'budget' && 'Budget Flow'}
                    {selectedDataset === 'conversion' && 'Conversion Funnel'}
                  </h1>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    {datasetDescriptions[selectedDataset]}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="tabular-nums">{data.nodes.length} nodes</span>
                  <span className="tabular-nums">{data.links.length} links</span>
                </div>
              </div>

              {/* Chart Container - Clean white background */}
              <div className="flex justify-center rounded-xl bg-white p-2 dark:bg-slate-900">
                <SankeyChart
                  key={`${selectedDataset}-${nodeWidth}-${nodePadding}-${nodeAlign}-${useGradient}-${showLabels}-${labelPosition}-${showValue}`}
                  data={data}
                  width={680}
                  height={460}
                  showLabels={showLabels}
                  showTooltips={showTooltips}
                  layout={{
                    nodeWidth,
                    nodePadding,
                    nodeAlign,
                    margin: { top: 20, right: 130, bottom: 20, left: 130 },
                  }}
                  style={{
                    node: {
                      borderRadius: 3,
                      opacity: 0.92,
                    },
                    link: {
                      gradient: useGradient,
                      opacity: 0.35,
                      hoverOpacity: 0.65,
                    },
                    label: {
                      fontSize: 11,
                      fontWeight: 500,
                      position: labelPosition,
                      showValue: showValue,
                    },
                  }}
                />
              </div>

              {/* Chart Footer - Total Flow */}
              <div className="mt-4 flex items-center justify-center border-t border-gray-100 pt-4 dark:border-gray-800">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Total Flow</p>
                  <p className="text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">
                    {data.links.reduce((sum, l) => sum + l.value, 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="space-y-4">
            {/* Dataset Selector */}
            <div className="rounded-xl border border-gray-200/60 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-slate-900">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Dataset</h3>
              <select
                value={selectedDataset}
                onChange={(e) => setSelectedDataset(e.target.value as keyof typeof datasets)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900 transition-colors hover:border-gray-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="minatoFiscal">港区 財政収支</option>
                <option value="energy">Energy Flow</option>
                <option value="budget">Personal Budget</option>
                <option value="conversion">Conversion Funnel</option>
              </select>
            </div>

            {/* Display Options */}
            <div className="rounded-xl border border-gray-200/60 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-slate-900">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Display</h3>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={showLabels}
                    onChange={(e) => setShowLabels(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Labels</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={showValue}
                    onChange={(e) => setShowValue(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Values</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={showTooltips}
                    onChange={(e) => setShowTooltips(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Tooltips</span>
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={useGradient}
                    onChange={(e) => setUseGradient(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Gradients</span>
                </label>
              </div>
            </div>

            {/* Label Position */}
            <div className="rounded-xl border border-gray-200/60 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-slate-900">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Label Position</h3>
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-slate-800">
                {(['outside', 'left', 'right', 'inside'] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setLabelPosition(pos)}
                    className={`rounded-md px-2 py-1.5 text-xs font-medium capitalize transition-all ${
                      labelPosition === pos
                        ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white'
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                    }`}
                  >
                    {pos === 'outside' ? 'Auto' : pos === 'inside' ? 'Inside' : pos === 'left' ? 'Left' : 'Right'}
                  </button>
                ))}
              </div>
            </div>

            {/* Layout Options */}
            <div className="rounded-xl border border-gray-200/60 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-slate-900">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Layout</h3>
              <div className="space-y-4">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm text-gray-600 dark:text-gray-400">Width</label>
                    <span className="tabular-nums text-sm font-medium text-gray-900 dark:text-white">{nodeWidth}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="40"
                    value={nodeWidth}
                    onChange={(e) => setNodeWidth(Number(e.target.value))}
                    className="w-full cursor-pointer accent-indigo-600"
                  />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm text-gray-600 dark:text-gray-400">Padding</label>
                    <span className="tabular-nums text-sm font-medium text-gray-900 dark:text-white">{nodePadding}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    value={nodePadding}
                    onChange={(e) => setNodePadding(Number(e.target.value))}
                    className="w-full cursor-pointer accent-indigo-600"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-gray-600 dark:text-gray-400">Alignment</label>
                  <div className="grid grid-cols-4 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-slate-800">
                    {(['justify', 'left', 'center', 'right'] as const).map((align) => (
                      <button
                        key={align}
                        onClick={() => setNodeAlign(align)}
                        className={`rounded-md px-2 py-1.5 text-xs font-medium capitalize transition-all ${
                          nodeAlign === align
                            ? 'bg-white text-gray-900 shadow-sm dark:bg-slate-700 dark:text-white'
                            : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                        }`}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Resources */}
            <div className="rounded-xl border border-gray-200/60 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-slate-900">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Resources</h3>
              <div className="space-y-1">
                <Link
                  href="/docs/getting-started"
                  className="group flex items-center justify-between rounded-lg px-2 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-800"
                >
                  Getting Started
                  <svg className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link
                  href="/docs/api"
                  className="group flex items-center justify-between rounded-lg px-2 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-800"
                >
                  API Reference
                  <svg className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link
                  href="/docs/examples"
                  className="group flex items-center justify-between rounded-lg px-2 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-800"
                >
                  Examples
                  <svg className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
