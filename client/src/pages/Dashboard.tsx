import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, ComposedChart, Line, Legend,
} from 'recharts';
import {
  TrendingUp, Calendar, Store, Package, Euro, Zap,
  AlertCircle, Minus, Plus, Loader2, Send, Bot, User, ChevronDown,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

// ─── Types ───────────────────────────────────────────────────────────────────
type Message = { role: 'user' | 'ai'; text: string };

// ─── Constants ────────────────────────────────────────────────────────────────
const DAY_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const FEATURE_IMPORTANCE = [
  { feature: 'Store',               importance: 0.28 },
  { feature: 'DayOfWeek',           importance: 0.22 },
  { feature: 'Promo',               importance: 0.18 },
  { feature: 'Month',               importance: 0.15 },
  { feature: 'CompetitionDistance', importance: 0.12 },
  { feature: 'StoreType',           importance: 0.05 },
];

const SUGGESTED_QUESTIONS = [
  'Which month has the highest sales?',
  'How much do promotions boost sales?',
  'What is the sales forecast for next 6 months?',
  'Which day of the week has the best sales?',
  'How does this store compare overall?',
];

// ─── Spinner ─────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex items-center justify-center py-16 text-[#ea7e5d]">
      <Loader2 className="w-8 h-8 animate-spin" />
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [selectedStore,  setSelectedStore]  = useState<string>('1');
  const [forecastMonths, setForecastMonths] = useState<string>('6');
  const [showForecast,   setShowForecast]   = useState(false);
  const [isGenerating,   setIsGenerating]   = useState(false);
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);

  // AI chat state
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [inputText,   setInputText]   = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const storeId = parseInt(selectedStore);

  // ── tRPC queries ────────────────────────────────────────────────────────────
  const { data: storeList,  isLoading: loadingStores }  = trpc.sales.stores.useQuery();
  const { data: kpis,       isLoading: loadingKpis }    = trpc.sales.kpis.useQuery({ storeId });
  const { data: monthlySales, isLoading: loadingMonthly } = trpc.sales.monthly.useQuery({ storeId });
  const { data: dowData,    isLoading: loadingDow }     = trpc.sales.dayOfWeek.useQuery({ storeId });
  const { data: promoData,  isLoading: loadingPromo }   = trpc.sales.promoComparison.useQuery({ storeId });
  const { data: storeInfo }                             = trpc.sales.storeInfo.useQuery({ storeId });
  const { data: forecastData, isLoading: loadingForecast } = trpc.sales.forecast.useQuery(
    { storeId, months: parseInt(forecastMonths) },
    { enabled: showForecast }
  );

  const askAIMutation = trpc.sales.askAI.useMutation();

  // ── Chart data ──────────────────────────────────────────────────────────────
  const monthlyChartData = useMemo(() => {
    if (!monthlySales) return [];
    return [...monthlySales]
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((row) => ({
        month: new Date(row.month + '-01').toLocaleDateString('en-GB', {
          month: 'short', year: '2-digit',
        }),
        sales: row.sales,
      }));
  }, [monthlySales]);

  const dowChartData = useMemo(() => {
    if (!dowData) return [];
    return [...dowData]
      .filter(d => d.day && d.day !== 'Unknown')
      .sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day))
      .map(d => ({ ...d, day: d.day.slice(0, 3) }));
  }, [dowData]);

  const forecastChartData = useMemo(() => {
    if (!forecastData) return [];
    return forecastData.map((f) => ({
      day: new Date(f.date).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
      }),
      predicted: f.predicted,
      lower:     f.lower,
      upper:     f.upper,
    }));
  }, [forecastData]);

  const promoLift = useMemo(() => {
    if (!promoData || promoData.length < 2) return null;
    const noPromo = promoData.find(d => d.category === 'No Promo')?.avgSales ?? 0;
    const promo   = promoData.find(d => d.category === 'Promo Active')?.avgSales ?? 0;
    if (!noPromo) return null;
    return Math.round(((promo - noPromo) / noPromo) * 100);
  }, [promoData]);

  // ── AI chat ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiLoading]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setStoreDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleStoreChange = (val: string) => {
    setSelectedStore(val);
    setShowForecast(false);
    setMessages([]);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isAiLoading) return;
    const question = text.trim();
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', text: question }]);
    setIsAiLoading(true);
    try {
      const result = await askAIMutation.mutateAsync({ question, storeId });
      setMessages(prev => [...prev, { role: 'ai', text: result.answer }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: 'Sorry, I could not get a response. Please check your API key in the .env file.',
      }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf8f3] via-[#fdf9f5] to-[#f5f1e8]">

      {/* Hero */}
      <div className="relative overflow-hidden rounded-b-3xl shadow-lg">
        {/* Animated gradient background */}
        <div className="absolute inset-0 animate-gradient"
          style={{
            background: 'linear-gradient(270deg, #94a894, #f4b860, #ea7e5d, #d97548, #f4b860, #94a894)',
            backgroundSize: '400% 400%',
            animation: 'gradientShift 8s ease infinite',
          }}
        />
        {/* Floating circles */}
        <div className="absolute top-4 right-20 w-32 h-32 rounded-full opacity-20 bg-white"
          style={{ animation: 'float 6s ease-in-out infinite' }} />
        <div className="absolute bottom-2 right-40 w-16 h-16 rounded-full opacity-10 bg-white"
          style={{ animation: 'float 4s ease-in-out infinite reverse' }} />
        <div className="absolute top-2 left-1/2 w-20 h-20 rounded-full opacity-10 bg-white"
          style={{ animation: 'float 5s ease-in-out infinite 1s' }} />

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />

        {/* Content */}
        <div className="relative container mx-auto px-6 py-12 text-white">
          <div style={{ animation: 'fadeSlideUp 0.8s ease forwards' }}>
            <h1 className="text-5xl font-bold mb-2">Rossmann Sales Dashboard</h1>
            <p className="text-lg opacity-90">
              AI-Powered Retail Demand Forecasting
            </p>
          </div>
          {/* Animated stats row */}
          <div className="flex gap-6 mt-6"
            style={{ animation: 'fadeSlideUp 0.8s ease 0.3s both' }}>
            {[
              { label: 'Stores', value: '1,115' },
              { label: 'Records', value: '1M+' },
              { label: 'Model Accuracy', value: '~84%' },
              { label: 'Forecast Horizon', value: '12 Months' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/30">
                <div className="text-lg font-bold">{value}</div>
                <div className="text-xs opacity-80">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4d8] p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div>
              <label className="block text-sm font-semibold text-[#2d2d2d] mb-3">
                Select Store
              </label>
              {loadingStores ? (
                <div className="h-10 bg-[#f5f1e8] rounded-xl animate-pulse" />
              ) : (
                <div className="relative w-48">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setStoreDropdownOpen(prev => !prev);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-[#e8e4d8] bg-[#f5f1e8] text-left text-sm flex items-center justify-between"
                  >
                    <span>Store #{selectedStore}</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${storeDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {storeDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-[#e8e4d8] bg-white shadow-lg z-50">
                      {(storeList ?? []).map(store => (
                        <div
                          key={store}
                          onClick={() => {
                            handleStoreChange(store.toString());
                            setStoreDropdownOpen(false);
                          }}
                          className="px-3 py-2 hover:bg-[#ea7e5d]/10 cursor-pointer"
                        >
                          Store #{store}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#2d2d2d] mb-3">
                Forecast Period: {forecastMonths} Month{parseInt(forecastMonths) > 1 ? 's' : ''}
              </label>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setForecastMonths(Math.max(1, parseInt(forecastMonths) - 1).toString())}
                  variant="outline" size="sm" className="rounded-lg border-[#e8e4d8] hover:bg-[#f5f1e8]"
                ><Minus className="w-4 h-4" /></Button>
                <input
                  type="range" min="1" max="12" value={forecastMonths}
                  onChange={e => setForecastMonths(e.target.value)}
                  className="flex-1 h-2 bg-[#e8e4d8] rounded-lg appearance-none cursor-pointer accent-[#ea7e5d]"
                />
                <Button
                  onClick={() => { setIsGenerating(true); setShowForecast(true); setTimeout(() => setIsGenerating(false), 1200); }}
                  disabled={isGenerating}
                  className="rounded-xl bg-[#ea7e5d] hover:bg-[#d97548] text-white font-semibold py-6"
                >
                  {isGenerating
                    ? <><Zap className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                    : <><TrendingUp className="w-4 h-4 mr-2" />Generate Forecast</>}
                </Button>
            </div>
            </div>
          </div>

          {/* Store info pills */}
          {storeInfo && (
            <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-[#e8e4d8]">
              {[
                ['Type', storeInfo.storeType?.toUpperCase()],
                ['Assortment', storeInfo.assortment?.toUpperCase()],
                ['Competition', storeInfo.competitionDistance ? `${storeInfo.competitionDistance.toLocaleString()}m` : 'N/A'],
                ['Promo2', storeInfo.promo2Active ? 'Active' : 'Inactive'],
              ].map(([label, value]) => (
                <span key={label} className="text-xs bg-[#f5f1e8] text-[#6b6b6b] px-3 py-1 rounded-full border border-[#e8e4d8]">
                  {label}: <strong className="text-[#2d2d2d]">{value}</strong>
                </span>
              ))}
            </div>
          )}
        </div>  

        {/* KPI Cards */}
        {loadingKpis ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-white rounded-2xl border border-[#e8e4d8] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { icon: Store,    color: '#ea7e5d', label: 'Store ID',        value: `#${storeId}` },
              { icon: Package,  color: '#94a894', label: 'Total Records',   value: kpis?.totalRecords?.toLocaleString() ?? '—' },
              { icon: Euro,     color: '#f4b860', label: 'Avg Daily Sales', value: kpis?.avgDailySales ? `€${kpis.avgDailySales.toLocaleString()}` : '—' },
              { icon: Calendar, color: '#d97548', label: 'Date Range',      value: kpis?.dateRange ?? '—' },
            ].map(({ icon: Icon, color, label, value }) => (
              <Card key={label} className="rounded-2xl border-[#e8e4d8] shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-[#6b6b6b] flex items-center gap-2">
                    <Icon className="w-4 h-4" style={{ color }} />{label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold" style={{ color }}>{value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="history" className="space-y-6">
          <TabsList className="rounded-xl bg-[#f5f1e8] border border-[#e8e4d8] p-1">
            <TabsTrigger value="history"   className="rounded-lg">Sales History</TabsTrigger>
            <TabsTrigger value="forecast"  className="rounded-lg">Forecast</TabsTrigger>
            <TabsTrigger value="insights"  className="rounded-lg">Insights</TabsTrigger>
            <TabsTrigger value="assistant" className="rounded-lg">Ask Whiskey</TabsTrigger>
          </TabsList>

          {/* ── Sales History ───────────────────────────────────────────────── */}
          <TabsContent value="history" className="space-y-6">
            <Card className="rounded-2xl border-[#e8e4d8] shadow-sm">
              <CardHeader>
                <CardTitle>Monthly Sales Trend</CardTitle>
                <CardDescription>Actual daily-average sales aggregated by month · Store #{storeId}</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingMonthly ? <Spinner /> : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthlyChartData}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#ea7e5d" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ea7e5d" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8e4d8" />
                      <XAxis dataKey="month" stroke="#6b6b6b" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                      <YAxis stroke="#6b6b6b" tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={{ backgroundColor:'#fff', border:'1px solid #e8e4d8', borderRadius:'12px' }}
                        formatter={(v: number) => [`€${v.toLocaleString()}`, 'Avg Daily Sales']}
                      />
                      <Area type="monotone" dataKey="sales" stroke="#ea7e5d" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" name="Avg Daily Sales" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="rounded-2xl border-[#e8e4d8] shadow-sm">
                <CardHeader>
                  <CardTitle>Sales by Day of Week</CardTitle>
                  <CardDescription>Average sales per day</CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingDow ? <Spinner /> : (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={dowChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e8e4d8" />
                        <XAxis dataKey="day" stroke="#6b6b6b" />
                        <YAxis stroke="#6b6b6b" tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                        <Tooltip
                          contentStyle={{ backgroundColor:'#fff', border:'1px solid #e8e4d8', borderRadius:'12px' }}
                          formatter={(v: number) => [`€${v.toLocaleString()}`, 'Avg Sales']}
                        />
                        <Bar dataKey="avgSales" fill="#94a894" radius={[8,8,0,0]} name="Avg Sales" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-[#e8e4d8] shadow-sm">
                <CardHeader>
                  <CardTitle>Promo Impact</CardTitle>
                  <CardDescription>
                    Average sales with vs without promotion
                    {promoLift !== null && (
                      <span className="ml-2 font-bold text-[#94a894]">+{promoLift}% lift</span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingPromo ? <Spinner /> : (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={promoData ?? []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e8e4d8" />
                        <XAxis dataKey="category" stroke="#6b6b6b" />
                        <YAxis stroke="#6b6b6b" tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                        <Tooltip
                          contentStyle={{ backgroundColor:'#fff', border:'1px solid #e8e4d8', borderRadius:'12px' }}
                          formatter={(v: number) => [`€${v.toLocaleString()}`, 'Avg Sales']}
                        />
                        <Bar dataKey="avgSales" fill="#f4b860" radius={[8,8,0,0]} name="Avg Sales" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Forecast ────────────────────────────────────────────────────── */}
          <TabsContent value="forecast" className="space-y-6">
            {!showForecast ? (
              <Card className="rounded-2xl border-[#e8e4d8] shadow-sm bg-gradient-to-br from-[#faf8f3] to-[#f5f1e8]">
                <CardContent className="pt-12 pb-12 text-center">
                  <div className="mb-6 flex justify-center">
                    <div className="w-32 h-32 bg-gradient-to-br from-[#f4b860] to-[#ea7e5d] rounded-full flex items-center justify-center text-white">
                      <TrendingUp className="w-16 h-16" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-[#2d2d2d] mb-2">Ready to Generate Forecast?</h3>
                  <p className="text-[#6b6b6b] mb-6">Click <strong>Generate Forecast</strong> above to see Prophet-based predictions for Store #{storeId}</p>
                  <Button
                    onClick={() => { setIsGenerating(true); setShowForecast(true); setTimeout(() => setIsGenerating(false), 1200); }}
                    className="rounded-xl bg-[#ea7e5d] hover:bg-[#d97548] text-white font-semibold px-8 py-6"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />Generate Now
                  </Button>
                </CardContent>
              </Card>
            ) : loadingForecast ? (
              <Card className="rounded-2xl border-[#e8e4d8] shadow-sm"><CardContent><Spinner /></CardContent></Card>
            ) : (
              <>
                <Card className="rounded-2xl border-[#e8e4d8] shadow-sm">
                  <CardHeader>
                    <CardTitle>{forecastMonths}-Month Sales Forecast · Store #{storeId}</CardTitle>
                    <CardDescription>Prophet model predictions with 95% confidence interval</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <ComposedChart data={forecastChartData}>
                        <defs>
                          <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#ea7e5d" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#ea7e5d" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e8e4d8" />
                        <XAxis dataKey="day" stroke="#6b6b6b" tick={{ fontSize: 10 }} interval={Math.floor(forecastChartData.length / 6)} />
                        <YAxis stroke="#6b6b6b" tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                        <Tooltip
                          contentStyle={{ backgroundColor:'#fff', border:'1px solid #e8e4d8', borderRadius:'12px' }}
                          formatter={(v: number) => `€${v.toLocaleString()}`}
                        />
                        <Legend />
                        <Area type="monotone" dataKey="upper" fill="#e8e4d8" stroke="none" fillOpacity={0.5} name="Upper Bound" />
                        <Area type="monotone" dataKey="lower" fill="#ffffff"  stroke="none" fillOpacity={0.5} name="Lower Bound" />
                        <Line type="monotone" dataKey="predicted" stroke="#ea7e5d" strokeWidth={3} name="Predicted Sales" dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-[#e8e4d8] shadow-sm">
                  <CardHeader><CardTitle>Forecast Details (First 30 Days)</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#e8e4d8]">
                            {['Day','Predicted Sales','Lower Bound','Upper Bound'].map(h => (
                              <th key={h} className={`py-3 px-4 font-semibold text-[#2d2d2d] ${h === 'Day' ? 'text-left' : 'text-right'}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {forecastChartData.slice(0, 30).map((row, i) => (
                            <tr key={i} className="border-b border-[#e8e4d8] hover:bg-[#f5f1e8] transition-colors">
                              <td className="py-3 px-4 text-[#2d2d2d]">{row.day}</td>
                              <td className="text-right py-3 px-4 font-semibold text-[#ea7e5d]">€{row.predicted.toLocaleString()}</td>
                              <td className="text-right py-3 px-4 text-[#6b6b6b]">€{row.lower.toLocaleString()}</td>
                              <td className="text-right py-3 px-4 text-[#6b6b6b]">€{row.upper.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* ── Insights ────────────────────────────────────────────────────── */}
          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="rounded-2xl border-[#e8e4d8] shadow-sm">
                <CardHeader>
                  <CardTitle>Feature Importance</CardTitle>
                  <CardDescription>XGBoost model — what drives sales most?</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={FEATURE_IMPORTANCE} layout="vertical" margin={{ top:5, right:30, left:110, bottom:5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8e4d8" />
                      <XAxis type="number" stroke="#6b6b6b" tickFormatter={v => `${(v*100).toFixed(0)}%`} />
                      <YAxis dataKey="feature" type="category" stroke="#6b6b6b" width={105} />
                      <Tooltip
                        contentStyle={{ backgroundColor:'#fff', border:'1px solid #e8e4d8', borderRadius:'12px' }}
                        formatter={(v: number) => [`${(v*100).toFixed(1)}%`, 'Importance']}
                      />
                      <Bar dataKey="importance" fill="#94a894" radius={[0,8,8,0]} name="Importance" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-[#e8e4d8] shadow-sm">
                <CardHeader>
                  <CardTitle>Model Performance</CardTitle>
                  <CardDescription>Trained on real Rossmann dataset</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Model Type',    value: 'XGBoost v2',    color: '#2d2d2d' },
                    { label: 'RMSE',          value: '1,357.24',      color: '#ea7e5d' },
                    { label: 'MAPE',          value: '15.99%',        color: '#94a894' },
                    { label: 'Accuracy',      value: '~84%',          color: '#f4b860' },
                    { label: 'Training Data', value: '1,017,209 rows',color: '#2d2d2d' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="p-4 bg-[#f5f1e8] rounded-xl flex justify-between items-center">
                      <p className="text-sm text-[#6b6b6b]">{label}</p>
                      <p className="text-lg font-bold" style={{ color }}>{value}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl border-[#e8e4d8] shadow-sm bg-gradient-to-r from-[#f4b860]/10 to-[#ea7e5d]/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-[#ea7e5d]" />Key Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-[#2d2d2d]"><span className="font-semibold">Store ID</span> is the strongest predictor (28%) — each store has unique baseline demand.</p>
                <p className="text-[#2d2d2d]"><span className="font-semibold">Day of Week</span> (22%) shows significant weekday vs weekend patterns — visible in Sales History.</p>
                <p className="text-[#2d2d2d]">
                  <span className="font-semibold">Promotions</span> (18%) drive a{' '}
                  <span className="font-bold text-[#94a894]">{promoLift !== null ? `+${promoLift}%` : 'significant'}</span>{' '}
                  sales lift for Store #{storeId}.
                </p>
                <p className="text-[#2d2d2d]"><span className="font-semibold">Competition Distance</span> has the least impact — suggesting strong brand loyalty.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── AI Assistant ─────────────────────────────────────────────────── */}
          <TabsContent value="assistant" className="space-y-6">
            <Card className="rounded-2xl border-[#e8e4d8] shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-[#ea7e5d]" />
                  Whiskey · Store #{storeId}
                </CardTitle>
                <CardDescription>
                  Powered by Groq · Ask Whiskey anything about this store's data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-w-2xl mx-auto">
                  
                  {/* Suggested questions */}
                  {messages.length === 0 && (
                    <div className="mb-6">
                      <p className="text-sm font-semibold text-[#6b6b6b] mb-3">Suggested questions:</p>
                      <div className="flex flex-wrap gap-2">
                        {SUGGESTED_QUESTIONS.map(q => (
                          <button
                            key={q}
                            onClick={() => sendMessage(q)}
                            className="text-xs bg-[#f5f1e8] hover:bg-[#ea7e5d] hover:text-white text-[#6b6b6b] px-3 py-2 rounded-full border border-[#e8e4d8] transition-all duration-200 cursor-pointer"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Chat messages */}
                  <div className="bg-[#faf8f3] rounded-xl border border-[#e8e4d8] p-4 h-80 overflow-y-auto mb-4 space-y-4">
                    {messages.length === 0 && (
                      <div className="flex items-center justify-center h-full text-[#6b6b6b]">
                        <div className="text-center">
                          <Bot className="w-12 h-12 mx-auto mb-3 text-[#ea7e5d] opacity-50" />
                          <p className="text-sm">Ask Whiskey anything about Store #{storeId}</p>
                        </div>
                      </div>
                    )}

                    {messages.map((msg, i) => (
                      <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'ai' && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ea7e5d] to-[#f4b860] flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-[#ea7e5d] text-white rounded-tr-sm'
                            : 'bg-white border border-[#e8e4d8] text-[#2d2d2d] rounded-tl-sm'
                        }`}>
                          {msg.text}
                        </div>
                        {msg.role === 'user' && (
                          <div className="w-8 h-8 rounded-full bg-[#94a894] flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    ))}

                    {isAiLoading && (
                      <div className="flex gap-3 justify-start">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ea7e5d] to-[#f4b860] flex items-center justify-center">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="bg-white border border-[#e8e4d8] rounded-2xl rounded-tl-sm px-4 py-3">
                          <div className="flex gap-1 items-center h-5">
                            {[0,1,2].map(i => (
                              <div key={i} className="w-2 h-2 rounded-full bg-[#ea7e5d] animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Input box */}
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendMessage(inputText)}
                      placeholder={`Ask Whiskey about Store #${storeId}...`}
                      disabled={isAiLoading}
                      className="flex-1 px-4 py-3 rounded-xl border border-[#e8e4d8] bg-[#f5f1e8] text-[#2d2d2d] text-sm focus:outline-none focus:ring-2 focus:ring-[#ea7e5d] focus:border-transparent disabled:opacity-50"
                    />
                    <Button
                      onClick={() => sendMessage(inputText)}
                      disabled={isAiLoading || !inputText.trim()}
                      className="rounded-xl bg-[#ea7e5d] hover:bg-[#d97548] text-white px-4"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>

                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <div className="border-t border-[#e8e4d8] bg-white mt-12">
        <div className="container mx-auto px-6 py-8 text-center text-[#6b6b6b]">
          <p>Rossmann Sales Forecasting</p>
        </div>
      </div>
    </div>
  );
}