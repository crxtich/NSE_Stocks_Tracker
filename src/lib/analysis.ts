// src/lib/analysis.ts
//
// The quantitative core of NSE Market Intelligence.
//
// Everything here is derived exclusively from price and volume history —
// there is no news, sentiment, or fundamental data involved anywhere in
// this file. That is a deliberate scope boundary: the app labels this
// section "Quantitative Analysis" and every score produced here is a
// mathematical signal, not investment advice.
//
// Trading days per year used for annualising volatility. The NSE trades
// Mon–Fri excluding public holidays; 252 is the standard convention used
// across most equity markets and is close enough for this purpose.
const TRADING_DAYS_PER_YEAR = 252

import type { PriceSnapshot } from './supabase'

export interface DailyClose {
  /** Calendar date in EAT, formatted YYYY-MM-DD. */
  date: string
  price: number
  volume: number | null
}

// ---------------------------------------------------------------------------
// Series construction
// ---------------------------------------------------------------------------

/**
 * Collapses a ticker's raw (possibly multiple-per-day) snapshots into one
 * closing price per calendar day — the last snapshot recorded that day,
 * which approximates a end-of-session close since the scraper runs every
 * 30 minutes through the trading session.
 */
export function toDailyCloses(snapshots: PriceSnapshot[]): DailyClose[] {
  const byDate = new Map<string, PriceSnapshot>()
  for (const snap of snapshots) {
    const eatMs = new Date(snap.scraped_at).getTime() + 3 * 60 * 60 * 1000
    const date = new Date(eatMs).toISOString().slice(0, 10)
    const existing = byDate.get(date)
    if (!existing || new Date(snap.scraped_at) > new Date(existing.scraped_at)) {
      byDate.set(date, snap)
    }
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, snap]) => ({ date, price: snap.price, volume: snap.volume }))
}

// ---------------------------------------------------------------------------
// Small statistics helpers
// ---------------------------------------------------------------------------

/** Day-over-day % returns as decimals (0.01 = +1%), same length as input minus 1. */
export function dailyReturns(daily: DailyClose[]): number[] {
  const out: number[] = []
  for (let i = 1; i < daily.length; i++) {
    const prev = daily[i - 1].price
    if (prev > 0) out.push((daily[i].price - prev) / prev)
  }
  return out
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/** Population standard deviation. */
export function stdev(values: number[]): number {
  if (values.length < 2) return 0
  const m = mean(values)
  const variance = mean(values.map((v) => (v - m) ** 2))
  return Math.sqrt(variance)
}

export function simpleMovingAverage(values: number[], window: number): number | null {
  if (values.length < window) return null
  const slice = values.slice(values.length - window)
  return mean(slice)
}

/** Trailing SMA at every point in the series (null until `window` points are available) — used to draw a moving-average overlay on the price chart. */
export function rollingMovingAverage(values: number[], window: number): (number | null)[] {
  return values.map((_, i) => (i + 1 >= window ? mean(values.slice(i + 1 - window, i + 1)) : null))
}

/** Smoothly maps an unbounded value onto 0–100, centred at 50. */
function squashTo100(x: number, scale: number): number {
  return 50 + 50 * Math.tanh(x / scale)
}

// ---------------------------------------------------------------------------
// Price momentum metrics
// ---------------------------------------------------------------------------

/** % return from the close `days` trading-days ago to the latest close. */
export function absoluteReturn(daily: DailyClose[], days: number): number | null {
  if (daily.length < 2) return null
  const endIdx = daily.length - 1
  const startIdx = Math.max(0, endIdx - days)
  if (startIdx === endIdx) return null
  const start = daily[startIdx].price
  const end = daily[endIdx].price
  if (start <= 0) return null
  return ((end - start) / start) * 100
}

/** Stock's N-day return minus the equal-weighted average N-day return of every other tracked stock. */
export function relativeStrength(stockReturnPct: number | null, marketAvgReturnPct: number | null): number | null {
  if (stockReturnPct === null || marketAvgReturnPct === null) return null
  return stockReturnPct - marketAvgReturnPct
}

export interface MovingAverageSignal {
  ma20: number | null
  /** % distance of the latest price above (+) or below (−) its 20-day MA. */
  pctVsMa20: number | null
  /** Whether the MA itself has risen over the last 5 days ("rising") or fallen ("falling"). */
  direction: 'rising' | 'falling' | 'flat' | 'unknown'
}

export function movingAverageSignal(daily: DailyClose[]): MovingAverageSignal {
  const prices = daily.map((d) => d.price)
  const ma20 = simpleMovingAverage(prices, 20)
  if (ma20 === null || prices.length === 0) {
    return { ma20: null, pctVsMa20: null, direction: 'unknown' }
  }
  const latest = prices[prices.length - 1]
  const pctVsMa20 = ((latest - ma20) / ma20) * 100

  const ma20FiveDaysAgo = prices.length >= 25 ? simpleMovingAverage(prices.slice(0, -5), 20) : null
  let direction: MovingAverageSignal['direction'] = 'unknown'
  if (ma20FiveDaysAgo !== null) {
    const delta = ma20 - ma20FiveDaysAgo
    direction = Math.abs(delta) < ma20 * 0.001 ? 'flat' : delta > 0 ? 'rising' : 'falling'
  }
  return { ma20, pctVsMa20, direction }
}

export interface FiftyTwoWeekRange {
  high: number | null
  low: number | null
  /** Current price as % of the 52-week high (100 = at the high). */
  pctOfHigh: number | null
  /** Current price as % above the 52-week low (0 = at the low). */
  pctAboveLow: number | null
}

export function fiftyTwoWeekRange(daily: DailyClose[]): FiftyTwoWeekRange {
  if (daily.length === 0) return { high: null, low: null, pctOfHigh: null, pctAboveLow: null }
  const cutoff = Date.now() - 365 * 24 * 60 * 60 * 1000
  const windowed = daily.filter((d) => new Date(d.date).getTime() >= cutoff)
  const prices = (windowed.length > 0 ? windowed : daily).map((d) => d.price)
  const high = Math.max(...prices)
  const low = Math.min(...prices)
  const latest = daily[daily.length - 1].price
  return {
    high,
    low,
    pctOfHigh: high > 0 ? (latest / high) * 100 : null,
    pctAboveLow: low > 0 ? ((latest - low) / low) * 100 : null,
  }
}

// ---------------------------------------------------------------------------
// Volatility metrics
// ---------------------------------------------------------------------------

/** Annualised standard deviation of daily % returns, using the last 20 trading days: stdev(returns) * sqrt(252) * 100. */
export function historicalVolatility(daily: DailyClose[]): number | null {
  const returns = dailyReturns(daily)
  if (returns.length < 5) return null
  const window = returns.slice(-20)
  return stdev(window) * Math.sqrt(TRADING_DAYS_PER_YEAR) * 100
}

/**
 * Approximate Average True Range over 14 days. True Range normally needs
 * intraday high/low/prior-close; we only have one price per day, so this
 * approximates it as the average absolute day-over-day price move — a
 * reasonable proxy for "typical daily swing in KES" given the data we have.
 */
export function averageTrueRangeApprox(daily: DailyClose[]): number | null {
  if (daily.length < 3) return null
  const window = daily.slice(-15) // 14 differences
  const swings: number[] = []
  for (let i = 1; i < window.length; i++) {
    swings.push(Math.abs(window[i].price - window[i - 1].price))
  }
  if (swings.length === 0) return null
  return mean(swings)
}

/**
 * Beta relative to the average of all tracked stocks (used as an NSE-20
 * proxy when a true index series isn't available): covariance(stock
 * returns, market returns) / variance(market returns), computed over
 * whatever trading days both series share in the last 60 days.
 */
export function beta(stockDaily: DailyClose[], marketDailyReturnByDate: Map<string, number>): number | null {
  const stockReturns = dailyReturns(stockDaily)
  const stockDates = stockDaily.slice(1).map((d) => d.date) // aligns with dailyReturns output
  const pairs: Array<[number, number]> = []
  for (let i = 0; i < stockReturns.length; i++) {
    const marketReturn = marketDailyReturnByDate.get(stockDates[i])
    if (marketReturn !== undefined) pairs.push([stockReturns[i], marketReturn])
  }
  const recent = pairs.slice(-60)
  if (recent.length < 10) return null

  const stockVals = recent.map((p) => p[0])
  const marketVals = recent.map((p) => p[1])
  const stockMean = mean(stockVals)
  const marketMean = mean(marketVals)
  let covariance = 0
  let marketVariance = 0
  for (let i = 0; i < recent.length; i++) {
    covariance += (stockVals[i] - stockMean) * (marketVals[i] - marketMean)
    marketVariance += (marketVals[i] - marketMean) ** 2
  }
  covariance /= recent.length
  marketVariance /= recent.length
  if (marketVariance === 0) return null
  return covariance / marketVariance
}

/** Builds a date -> equal-weighted average daily return map across every ticker, used as the market proxy for relative strength and beta. */
export function buildMarketDailyReturns(allDaily: Map<string, DailyClose[]>): Map<string, number> {
  const returnsByDate = new Map<string, number[]>()
  for (const daily of allDaily.values()) {
    const returns = dailyReturns(daily)
    const dates = daily.slice(1).map((d) => d.date)
    returns.forEach((r, i) => {
      const list = returnsByDate.get(dates[i])
      if (list) list.push(r)
      else returnsByDate.set(dates[i], [r])
    })
  }
  const avgByDate = new Map<string, number>()
  for (const [date, returns] of returnsByDate) avgByDate.set(date, mean(returns))
  return avgByDate
}

export function marketAverageReturn(marketDailyReturnByDate: Map<string, number>, days: number): number | null {
  const dates = Array.from(marketDailyReturnByDate.keys()).sort()
  if (dates.length === 0) return null
  const window = dates.slice(-days)
  const compounded = window.reduce((acc, date) => acc * (1 + (marketDailyReturnByDate.get(date) ?? 0)), 1)
  return (compounded - 1) * 100
}

// ---------------------------------------------------------------------------
// Volume metrics
// ---------------------------------------------------------------------------

export interface VolumeTrend {
  avg5: number | null
  avg20: number | null
  /** avg5 / avg20 — above 1 means recent interest is rising vs. the last month. */
  ratio: number | null
}

export function volumeTrend(daily: DailyClose[]): VolumeTrend {
  const volumes = daily.map((d) => d.volume).filter((v): v is number => v !== null)
  const avg5 = simpleMovingAverage(volumes, 5)
  const avg20 = simpleMovingAverage(volumes, 20)
  return { avg5, avg20, ratio: avg5 !== null && avg20 !== null && avg20 > 0 ? avg5 / avg20 : null }
}

export type PriceVolumeSignal =
  | 'confirmed-uptrend' // price up, volume rising: conviction behind the move
  | 'confirmed-downtrend' // price down, volume rising: conviction behind the move
  | 'weakening-rally' // price up, volume falling: fewer participants driving gains
  | 'weakening-selloff' // price down, volume falling: selling pressure may be fading
  | 'insufficient-data'

/** Compares the direction of the 20-day price trend against the direction of the volume trend. */
export function priceVolumeDivergence(daily: DailyClose[]): PriceVolumeSignal {
  const priceChange = absoluteReturn(daily, 20)
  const { ratio } = volumeTrend(daily)
  if (priceChange === null || ratio === null) return 'insufficient-data'
  const volumeRising = ratio > 1
  if (priceChange >= 0) return volumeRising ? 'confirmed-uptrend' : 'weakening-rally'
  return volumeRising ? 'confirmed-downtrend' : 'weakening-selloff'
}

// ---------------------------------------------------------------------------
// Composite Market Signal Score
// ---------------------------------------------------------------------------

export type SignalBand = 'strong' | 'moderate' | 'neutral' | 'weak'

export interface SignalScore {
  score: number
  band: SignalBand
  components: {
    momentum: number
    trend: number
    volatilityAdjustedReturn: number
    volumeConfirmation: number
  }
}

function bandFor(score: number): SignalBand {
  if (score >= 75) return 'strong'
  if (score >= 50) return 'moderate'
  if (score >= 25) return 'neutral'
  return 'weak'
}

/**
 * Market Signal Score (0–100), a weighted composite of four purely
 * quantitative components:
 *   - Momentum (30%)                — 30-day return vs. the market average
 *   - Trend (25%)                   — price vs. 20-day MA, plus MA direction
 *   - Volatility-adjusted return (25%) — 30-day return / annualised volatility (Sharpe-like)
 *   - Volume confirmation (20%)     — does volume support the price direction?
 *
 * This is a signal, not a recommendation — see the disclaimer shown
 * alongside every score in the UI.
 */
export function computeSignalScore(
  daily: DailyClose[],
  marketDailyReturnByDate: Map<string, number>,
): SignalScore {
  const return30 = absoluteReturn(daily, 30)
  const marketReturn30 = marketAverageReturn(marketDailyReturnByDate, 30)
  const relStrength30 = relativeStrength(return30, marketReturn30)

  // Momentum: relative strength squashed into 0–100. A stock beating the
  // market average by ~15 percentage points over 30 days saturates near 100.
  const momentum = relStrength30 === null ? 50 : squashTo100(relStrength30, 15)

  // Trend: combines distance from the 20-day MA with whether the MA itself
  // is rising or falling, each squashed and then blended 60/40.
  const ma = movingAverageSignal(daily)
  const maDistanceScore = ma.pctVsMa20 === null ? 50 : squashTo100(ma.pctVsMa20, 8)
  const maDirectionScore = ma.direction === 'rising' ? 70 : ma.direction === 'falling' ? 30 : 50
  const trend = ma.pctVsMa20 === null ? 50 : maDistanceScore * 0.6 + maDirectionScore * 0.4

  // Volatility-adjusted return: a Sharpe-like ratio (return / volatility)
  // rewards steady gainers over stocks that are merely volatile.
  const vol = historicalVolatility(daily)
  const volAdjRaw = return30 !== null && vol !== null && vol > 0 ? return30 / vol : null
  const volatilityAdjustedReturn = volAdjRaw === null ? 50 : squashTo100(volAdjRaw, 1.5)

  // Volume confirmation: rewards rising volume behind an uptrend or falling
  // volume behind a downtrend (selling pressure fading); penalises the reverse.
  const pvSignal = priceVolumeDivergence(daily)
  const volumeConfirmation: number = {
    'confirmed-uptrend': 80,
    'confirmed-downtrend': 20,
    'weakening-rally': 45,
    'weakening-selloff': 55,
    'insufficient-data': 50,
  }[pvSignal]

  const score =
    momentum * 0.3 + trend * 0.25 + volatilityAdjustedReturn * 0.25 + volumeConfirmation * 0.2

  const rounded = Math.round(Math.min(100, Math.max(0, score)))
  return {
    score: rounded,
    band: bandFor(rounded),
    components: {
      momentum: Math.round(momentum),
      trend: Math.round(trend),
      volatilityAdjustedReturn: Math.round(volatilityAdjustedReturn),
      volumeConfirmation: Math.round(volumeConfirmation),
    },
  }
}

// ---------------------------------------------------------------------------
// Full per-ticker analysis bundle
// ---------------------------------------------------------------------------

export interface TickerAnalysis {
  ticker: string
  companyName: string
  latestPrice: number
  daily: DailyClose[]
  returns: {
    d7: number | null
    d30: number | null
    d90: number | null
  }
  relativeStrength30: number | null
  movingAverage: MovingAverageSignal
  fiftyTwoWeek: FiftyTwoWeekRange
  volatility: number | null
  atr: number | null
  beta: number | null
  volume: VolumeTrend
  priceVolumeSignal: PriceVolumeSignal
  signal: SignalScore
}

export function analyzeTicker(
  ticker: string,
  companyName: string,
  history: PriceSnapshot[],
  marketDailyReturnByDate: Map<string, number>,
): TickerAnalysis | null {
  if (history.length === 0) return null
  const daily = toDailyCloses(history)
  const marketReturn30 = marketAverageReturn(marketDailyReturnByDate, 30)
  const return30 = absoluteReturn(daily, 30)

  return {
    ticker,
    companyName,
    latestPrice: daily[daily.length - 1].price,
    daily,
    returns: {
      d7: absoluteReturn(daily, 7),
      d30: return30,
      d90: absoluteReturn(daily, 90),
    },
    relativeStrength30: relativeStrength(return30, marketReturn30),
    movingAverage: movingAverageSignal(daily),
    fiftyTwoWeek: fiftyTwoWeekRange(daily),
    volatility: historicalVolatility(daily),
    atr: averageTrueRangeApprox(daily),
    beta: beta(daily, marketDailyReturnByDate),
    volume: volumeTrend(daily),
    priceVolumeSignal: priceVolumeDivergence(daily),
    signal: computeSignalScore(daily, marketDailyReturnByDate),
  }
}

// ---------------------------------------------------------------------------
// Plain-English metric copy (technical name + tooltip) for the UI
// ---------------------------------------------------------------------------

export const METRIC_COPY = {
  return7: { label: '7-Day Return', technical: 'Absolute return (7 trading days)', help: 'How much the price has moved over the last week.' },
  return30: { label: '30-Day Return', technical: 'Absolute return (30 trading days)', help: 'How much the price has moved over the last month.' },
  return90: { label: '90-Day Return', technical: 'Absolute return (90 trading days)', help: 'How much the price has moved over the last three months.' },
  relativeStrength: { label: 'Vs. the Market', technical: 'Relative strength (30-day)', help: "How this stock's monthly return compares to the average of every tracked stock. Positive means it's outperforming the pack." },
  trend: { label: 'Trend Direction', technical: 'Price vs. 20-day moving average', help: 'Whether the price is trading above or below its recent 20-day average — a simple read on short-term trend.' },
  high52w: { label: 'Vs. 52-Week High', technical: '52-week high proximity', help: "How close the current price is to its highest point in the last year." },
  low52w: { label: 'Vs. 52-Week Low', technical: '52-week low proximity', help: "How far the current price has climbed above its lowest point in the last year." },
  volatility: { label: 'Price Stability', technical: 'Historical volatility (20-day, annualised)', help: "How much this stock's price has swung day-to-day over the past month. Lower means more stable." },
  atr: { label: 'Typical Daily Swing', technical: 'Average True Range (approx., 14-day)', help: 'The average size of this stock’s day-to-day price movement, in KES.' },
  beta: { label: 'Market Sensitivity', technical: 'Beta vs. tracked-stock average', help: 'How much this stock tends to move relative to the wider market. Above 1 means it swings more than the market; below 1 means less.' },
  volumeTrend: { label: 'Trading Interest', technical: '5-day vs. 20-day average volume', help: 'Whether more or fewer shares are changing hands recently compared to the past month. Rising interest can signal growing attention.' },
  priceVolume: { label: 'Move Conviction', technical: 'Price-volume divergence', help: 'Whether trading volume is backing up the recent price move, or whether the move is happening on thinning interest.' },
  signalScore: { label: 'Market Signal Score', technical: 'Composite weighted score (0–100)', help: 'A single score blending momentum, trend, volatility-adjusted return, and volume — not a recommendation, just a mathematical summary.' },
} as const
