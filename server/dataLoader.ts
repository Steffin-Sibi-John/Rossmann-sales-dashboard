import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

// ─── Types ──────────────────────────────────────────────────────────────────
export interface TrainRecord {
  Store: number;
  DayOfWeek: number;
  Date: string;
  Sales: number;
  Customers: number;
  Open: number;
  Promo: number;
  StateHoliday: string;
  SchoolHoliday: string;
}

interface ProphetForecast {
  ds: string;
  yhat: number;
  yhat_lower: number;
  yhat_upper: number;
  [key: string]: any;
}

// ─── JSON helpers ────────────────────────────────────────────────────────────
function readJson<T>(filename: string): T {
  const filePath = path.join(DATA_DIR, filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

// ─── Caches ──────────────────────────────────────────────────────────────────
let trainDataCache: TrainRecord[] | null = null;
let prophetForecastCache: ProphetForecast[] | null = null;

// ─── Raw CSV loaders (fallback only) ─────────────────────────────────────────
export async function loadTrainData(): Promise<TrainRecord[]> {
  if (trainDataCache) return trainDataCache;

  try {
    const filePath = path.join(DATA_DIR, 'train.csv');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const rawRecords = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    }) as any[];

    trainDataCache = rawRecords.map((r) => ({
      Store:         parseInt(r.Store),
      DayOfWeek:     parseInt(r.DayOfWeek),
      Date:          r.Date,
      Sales:         parseInt(r.Sales),
      Customers:     parseInt(r.Customers),
      Open:          parseInt(r.Open),
      Promo:         parseInt(r.Promo),
      StateHoliday:  r.StateHoliday,
      SchoolHoliday: r.SchoolHoliday,
    }));

    console.log(`[Data Loader] Loaded ${trainDataCache.length} training records`);
    return trainDataCache;
  } catch (error) {
    console.error('[Data Loader] Failed to load train.csv:', error);
    return [];
  }
}

export async function loadProphetForecast(): Promise<ProphetForecast[]> {
  if (prophetForecastCache) return prophetForecastCache;

  try {
    const filePath = path.join(DATA_DIR, 'prophet_forecast.csv');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    }) as ProphetForecast[];

    prophetForecastCache = records.map((r) => ({
      ...r,
      yhat:       parseFloat(r.yhat as any),
      yhat_lower: parseFloat(r.yhat_lower as any),
      yhat_upper: parseFloat(r.yhat_upper as any),
    }));

    console.log(`[Data Loader] Loaded ${prophetForecastCache.length} prophet forecast records`);
    return prophetForecastCache;
  } catch (error) {
    console.error('[Data Loader] Failed to load prophet_forecast.csv:', error);
    return [];
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ── Fast JSON-based functions (used by all routes) ──────────────────────────
// ════════════════════════════════════════════════════════════════════════════

/**
 * All unique store IDs
 */
export async function getAllStores(): Promise<number[]> {
  try {
    const kpis = readJson<Record<string, any>>('store_kpis.json');
    return Object.keys(kpis).map(Number).sort((a, b) => a - b);
  } catch {
    // fallback to CSV
    const trainData = await loadTrainData();
    return Array.from(new Set(trainData.map((r) => r.Store))).sort((a, b) => a - b);
  }
}

/**
 * KPI metrics for a single store
 */
export async function getStoreKPIs(storeId: number) {
  try {
    const kpis = readJson<Record<string, any>>('store_kpis.json');
    const data = kpis[storeId.toString()];
    if (!data) throw new Error('Store not found');
    return {
      totalRecords:  data.totalRecords,
      avgDailySales: data.avgDailySales,
      totalSales:    data.totalSales,
      dateRange:     data.dateRange,
    };
  } catch {
    // fallback
    const trainData = await loadTrainData();
    const storeRecords = trainData.filter((r) => r.Store === storeId);
    if (storeRecords.length === 0) return { totalRecords: 0, avgDailySales: 0, totalSales: 0, dateRange: 'N/A' };
    const dates      = storeRecords.map((r) => new Date(r.Date));
    const minDate    = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate    = new Date(Math.max(...dates.map((d) => d.getTime())));
    const totalSales = storeRecords.reduce((sum, r) => sum + r.Sales, 0);
    return {
      totalRecords:  storeRecords.length,
      avgDailySales: Math.round(totalSales / storeRecords.length),
      totalSales,
      dateRange:     `${minDate.getFullYear()}-${maxDate.getFullYear()}`,
    };
  }
}

/**
 * Monthly aggregated sales for a store
 */
export async function getMonthlySalesData(storeId: number) {
  try {
    const monthly = readJson<Record<string, any[]>>('monthly_sales.json');
    const data    = monthly[storeId.toString()];
    if (!data) throw new Error('Store not found');
    return data.map((row) => ({
      month:      row.month   ?? row.Month,
      sales:      Math.round(row.sales   ?? row.Sales),
      totalSales: Math.round(row.totalSales ?? row.TotalSales ?? row.sales ?? row.Sales),
    }));
  } catch {
    // fallback
    const trainData    = await loadTrainData();
    const storeRecords = trainData.filter((r) => r.Store === storeId);
    const monthlyData: Record<string, { sales: number; count: number }> = {};
    storeRecords.forEach((r) => {
      const date     = new Date(r.Date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { sales: 0, count: 0 };
      monthlyData[monthKey].sales += r.Sales;
      monthlyData[monthKey].count += 1;
    });
    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      sales:      Math.round(data.sales / data.count),
      totalSales: data.sales,
    }));
  }
}

/**
 * Average sales by day of week for a store
 */
export async function getDayOfWeekAnalysis(storeId: number) {
  try {
    const dow  = readJson<Record<string, any[]>>('dow_sales.json');
    const data = dow[storeId.toString()];
    if (!data) throw new Error('Store not found');
    return data.map((row) => ({
      day:      row.day ?? row.Day,
      avgSales: Math.round(row.avgSales ?? row.AvgSales ?? row.Sales),
    }));
  } catch {
    // fallback
    const trainData    = await loadTrainData();
    const storeRecords = trainData.filter((r) => r.Store === storeId);
    const dayNames: Record<number, string> = {
      1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
      4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday',
    };
    const dayData: Record<number, number[]> = {};
    storeRecords.forEach((r) => {
      if (!dayData[r.DayOfWeek]) dayData[r.DayOfWeek] = [];
      dayData[r.DayOfWeek].push(r.Sales);
    });
    return Object.entries(dayData).map(([day, sales]) => ({
      day:      dayNames[parseInt(day)] ?? 'Unknown',
      avgSales: Math.round(sales.reduce((a, b) => a + b, 0) / sales.length),
    }));
  }
}

/**
 * Store metadata
 */
export async function getStoreInfo(storeId: number) {
  try {
    const info = readJson<Record<string, any>>('store_info.json');
    const data = info[storeId.toString()];
    if (!data) throw new Error('Store not found');
    return {
      storeId,
      storeType:           data.storeType           ?? data.StoreType,
      assortment:          data.assortment          ?? data.Assortment,
      competitionDistance: data.competitionDistance ?? data.CompetitionDistance,
      promo2Active:        data.promo2Active         ?? data.Promo2Active ?? false,
      promo2Interval:      data.promo2Interval       ?? data.PromoInterval ?? 'None',
    };
  } catch {
    return {
      storeId,
      storeType:           'Unknown',
      assortment:          'Unknown',
      competitionDistance: null,
      promo2Active:        false,
      promo2Interval:      'None',
    };
  }
}

/**
 * Promo vs no-promo comparison for a store
 */
export async function getPromoComparison(storeId: number) {
  try {
    const promo = readJson<Record<string, any[]>>('promo_data.json');
    const data  = promo[storeId.toString()];
    if (!data) throw new Error('Store not found');
    return data.map((row) => ({
      category: row.category ?? row.Category,
      avgSales: Math.round(row.avgSales ?? row.AvgSales),
    }));
  } catch {
    // fallback
    const trainData    = await loadTrainData();
    const storeRecords = trainData.filter(
      (r) => r.Store === storeId && r.Open === 1 && r.Sales > 0
    );
    const avg = (arr: number[]) =>
      arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    return [
      { category: 'No Promo',     avgSales: avg(storeRecords.filter((r) => r.Promo === 0).map((r) => r.Sales)) },
      { category: 'Promo Active', avgSales: avg(storeRecords.filter((r) => r.Promo === 1).map((r) => r.Sales)) },
    ];
  }
}

/**
 * Prophet forecast — future dates only
 */
export async function getProphetForecast(storeId: number, months: number = 6) {
  try {
    const forecastList = readJson<any[]>('forecast.json');

    // forecast.json is global (not per-store), filter to future N months
    // The JSON was generated from prophet_forecast.csv which already covers future dates
    return forecastList.slice(0, months * 30).map((f) => ({
      date:      f.date ?? f.ds,
      predicted: Math.round(f.predicted ?? f.yhat),
      lower:     Math.round(f.lower     ?? f.yhat_lower),
      upper:     Math.round(f.upper     ?? f.yhat_upper),
    }));
  } catch {
    // fallback to CSV
    const [prophetData, trainData] = await Promise.all([
      loadProphetForecast(),
      loadTrainData(),
    ]);
    const storeDates = trainData
      .filter((r) => r.Store === storeId)
      .map((r) => new Date(r.Date).getTime());
    const lastTrainDate = storeDates.length
      ? new Date(Math.max(...storeDates))
      : new Date('2015-07-31');
    return prophetData
      .filter((f) => new Date(f.ds) > lastTrainDate)
      .slice(0, months * 30)
      .map((f) => ({
        date:      f.ds,
        predicted: Math.round(f.yhat),
        lower:     Math.round(f.yhat_lower),
        upper:     Math.round(f.yhat_upper),
      }));
  }
}
