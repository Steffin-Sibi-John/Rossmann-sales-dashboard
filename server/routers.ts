import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getAllStores,
  getStoreKPIs,
  getMonthlySalesData,
  getDayOfWeekAnalysis,
  getProphetForecast,
  getStoreInfo,
  getPromoComparison,
} from "./dataLoader";

// ─── Groq AI helper ─────────────────────────────────────────────────────────
async function askGroq(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set in .env");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq API error: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "No response from AI.";
}

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  sales: router({
    stores: publicProcedure.query(async () => {
      return getAllStores();
    }),

    kpis: publicProcedure
      .input(z.object({ storeId: z.number() }))
      .query(async ({ input }) => {
        return getStoreKPIs(input.storeId);
      }),

    monthly: publicProcedure
      .input(z.object({ storeId: z.number() }))
      .query(async ({ input }) => {
        return getMonthlySalesData(input.storeId);
      }),

    dayOfWeek: publicProcedure
      .input(z.object({ storeId: z.number() }))
      .query(async ({ input }) => {
        return getDayOfWeekAnalysis(input.storeId);
      }),

    forecast: publicProcedure
      .input(z.object({ storeId: z.number(), months: z.number().min(1).max(12) }))
      .query(async ({ input }) => {
        return getProphetForecast(input.storeId, input.months);
      }),

    storeInfo: publicProcedure
      .input(z.object({ storeId: z.number() }))
      .query(async ({ input }) => {
        return getStoreInfo(input.storeId);
      }),

    promoComparison: publicProcedure
      .input(z.object({ storeId: z.number() }))
      .query(async ({ input }) => {
        return getPromoComparison(input.storeId);
      }),

    askAI: publicProcedure
      .input(z.object({
        question: z.string().min(1),
        storeId:  z.number(),
      }))
      .mutation(async ({ input }) => {
        // Check if user is asking about a different store
        const mentionedStore = input.question.match(/store\s*#?(\d+)/i);
        const targetStoreId = mentionedStore
          ? parseInt(mentionedStore[1])
          : input.storeId;

        const [kpis, monthly, dow, promo, storeInfo, forecast] = await Promise.all([
          getStoreKPIs(targetStoreId),
          getMonthlySalesData(targetStoreId),
          getDayOfWeekAnalysis(targetStoreId),
          getPromoComparison(targetStoreId),
          getStoreInfo(targetStoreId),
          getProphetForecast(targetStoreId, 6),
        ]);

        const sortedMonthly = [...monthly].sort((a, b) => b.sales - a.sales);
        const bestMonth     = sortedMonthly[0];
        const worstMonth    = sortedMonthly[sortedMonthly.length - 1];
        const forecastAvg   = forecast.length
          ? Math.round(forecast.reduce((s, f) => s + f.predicted, 0) / forecast.length)
          : 0;

        const prompt = `
You are Whiskey, an AI sales analyst for the Rossmann retail chain. Answer the user's question using ONLY the real store data provided below. Be concise, specific, and mention actual numbers. Keep answers under 150 words.

${targetStoreId !== input.storeId ? `Note: User asked about Store ${targetStoreId}, so data for Store ${targetStoreId} is provided below.` : ''}

=== STORE ${targetStoreId} DATA ===
Store Type: ${storeInfo?.storeType?.toUpperCase() ?? 'Unknown'}
Assortment: ${storeInfo?.assortment?.toUpperCase() ?? 'Unknown'}
Competition Distance: ${storeInfo?.competitionDistance ? storeInfo.competitionDistance + 'm' : 'Unknown'}
Promo2 Active: ${storeInfo?.promo2Active ? 'Yes' : 'No'}
Total Records: ${kpis.totalRecords}
Average Daily Sales: €${kpis.avgDailySales.toLocaleString()}
Total Revenue: €${kpis.totalSales.toLocaleString()}
Date Range: ${kpis.dateRange}
Best Month: ${bestMonth?.month} (€${bestMonth?.sales?.toLocaleString()} avg daily)
Worst Month: ${worstMonth?.month} (€${worstMonth?.sales?.toLocaleString()} avg daily)
Sales With Promo: €${promo.find(p => p.category === 'Promo Active')?.avgSales?.toLocaleString() ?? 'N/A'}
Sales Without Promo: €${promo.find(p => p.category === 'No Promo')?.avgSales?.toLocaleString() ?? 'N/A'}
6-Month Forecast Average: €${forecastAvg.toLocaleString()} per day
Day of Week: ${dow.map(d => `${d.day}: €${d.avgSales}`).join(', ')}
Model: XGBoost v2 | RMSE: 1357.24 | MAPE: 15.99% | Accuracy: ~84%

=== USER QUESTION ===
${input.question}

Answer clearly and professionally using the actual numbers above.`.trim();

        const answer = await askGroq(prompt);
        return { answer };
      }),
  }),
});

export type AppRouter = typeof appRouter;
