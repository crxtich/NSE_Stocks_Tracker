import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMarketData } from '../lib/MarketDataContext'
import { rollingMovingAverage, METRIC_COPY } from '../lib/analysis'
import PriceChart from '../components/PriceChart'
import VolumeChart from '../components/VolumeChart'
import MetricTile from '../components/MetricTile'
import SignalScoreBadge from '../components/SignalScoreBadge'
import ChangeValue from '../components/ChangeValue'
import Disclaimer from '../components/Disclaimer'
import { formatEatTime, formatKsh, formatPct } from '../lib/format'
import { LoadingState, ErrorState, EmptyState } from '../components/StateViews'

const RANGE_OPTIONS = [30, 90] as const

const PV_SIGNAL_LABEL: Record<string, string> = {
  'confirmed-uptrend': 'Confirmed uptrend',
  'confirmed-downtrend': 'Confirmed downtrend',
  'weakening-rally': 'Weakening rally',
  'weakening-selloff': 'Weakening selloff',
  'insufficient-data': 'Not enough data',
}

const PV_SIGNAL_COPY: Record<string, string> = {
  'confirmed-uptrend': 'Rising volume is backing up the recent gains.',
  'confirmed-downtrend': 'Rising volume is backing up the recent decline.',
  'weakening-rally': 'Price is up, but on thinning volume — fewer participants driving it.',
  'weakening-selloff': 'Price is down, but on thinning volume — selling pressure may be fading.',
  'insufficient-data': 'Not enough recent data to read volume conviction yet.',
}

export default function StockDetail() {
  const { ticker = '' } = useParams()
  const { loading, error, getAnalysis, latestByTicker } = useMarketData()
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]>(30)

  const analysis = getAnalysis(ticker.toUpperCase())
  const latest = latestByTicker.get(ticker.toUpperCase())

  const chartData = useMemo(() => {
    if (!analysis) return { price: [], volume: [] }
    const prices = analysis.daily.map((d) => d.price)
    const ma = rollingMovingAverage(prices, 20)
    const windowed = analysis.daily.slice(-range)
    const offset = analysis.daily.length - windowed.length
    return {
      price: windowed.map((d, i) => ({
        date: d.date.slice(5),
        price: d.price,
        ma20: ma[offset + i],
      })),
      volume: windowed.map((d) => ({ date: d.date.slice(5), volume: d.volume })),
    }
  }, [analysis, range])

  if (loading && !analysis) return <LoadingState />
  if (error) return <ErrorState message={error} />
  if (!analysis) {
    return (
      <EmptyState
        title={`No data for ${ticker.toUpperCase()}`}
        description="This ticker hasn't been scraped yet, or the ticker doesn't exist."
      />
    )
  }

  const { signal } = analysis
  const dirLabel = analysis.movingAverage.direction
  const dirCopy =
    dirLabel === 'rising' ? 'and climbing' : dirLabel === 'falling' ? 'and falling' : 'and roughly flat'

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link to="/" className="text-xs text-ink-muted hover:text-ink">
          ← Back to Market Overview
        </Link>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold text-accent">{analysis.ticker}</span>
              <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">{analysis.companyName}</h1>
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-2xl font-semibold tabular text-ink">{formatKsh(analysis.latestPrice)}</span>
              {latest && <ChangeValue value={latest.change_pct} />}
            </div>
            {latest && <p className="mt-1 text-xs text-ink-faint">As of {formatEatTime(latest.scraped_at)} EAT</p>}
          </div>
          <SignalScoreBadge score={signal.score} band={signal.band} size="lg" />
        </div>
      </div>

      <section className="rounded-lg border border-canvas-border bg-canvas-panel p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Price History</h2>
          <div className="flex gap-1 rounded-md bg-canvas p-1 text-xs">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setRange(opt)}
                className={`rounded px-2.5 py-1 font-medium transition-colors ${
                  range === opt ? 'bg-accent text-canvas' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {opt}D
              </button>
            ))}
          </div>
        </div>
        {chartData.price.length > 1 ? (
          <>
            <div className="mt-3 flex items-center gap-4 text-xs text-ink-faint">
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 bg-accent" /> Price</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 border-t border-dashed border-ink-muted" /> 20-day average</span>
            </div>
            <PriceChart data={chartData.price} />
            <h3 className="mt-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Volume</h3>
            <VolumeChart data={chartData.volume} />
          </>
        ) : (
          <div className="py-10 text-center text-sm text-ink-muted">
            Not enough history yet to draw a chart — check back after a few more scrape cycles.
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink">Quantitative Analysis</h2>
        <p className="mt-1 max-w-2xl text-xs text-ink-muted">
          Every metric below is calculated purely from this stock's price and volume history —
          never from news, analyst opinions, or company fundamentals.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <MetricTile {...METRIC_COPY.return7} value={<ChangeValue value={analysis.returns.d7} />} />
          <MetricTile {...METRIC_COPY.return30} value={<ChangeValue value={analysis.returns.d30} />} />
          <MetricTile {...METRIC_COPY.return90} value={<ChangeValue value={analysis.returns.d90} />} />
          <MetricTile
            {...METRIC_COPY.relativeStrength}
            value={<ChangeValue value={analysis.relativeStrength30} />}
            sub="vs. average of all tracked stocks"
          />
          <MetricTile
            {...METRIC_COPY.trend}
            value={
              analysis.movingAverage.pctVsMa20 === null ? (
                '—'
              ) : (
                <span className={analysis.movingAverage.pctVsMa20 >= 0 ? 'text-gain' : 'text-loss'}>
                  {analysis.movingAverage.pctVsMa20 >= 0 ? 'Above' : 'Below'} average
                </span>
              )
            }
            sub={`${formatPct(analysis.movingAverage.pctVsMa20)} ${dirCopy}`}
          />
          <MetricTile
            {...METRIC_COPY.high52w}
            value={analysis.fiftyTwoWeek.pctOfHigh === null ? '—' : `${analysis.fiftyTwoWeek.pctOfHigh.toFixed(1)}%`}
            sub={analysis.fiftyTwoWeek.high !== null ? `High: ${formatKsh(analysis.fiftyTwoWeek.high)}` : undefined}
          />
          <MetricTile
            {...METRIC_COPY.low52w}
            value={analysis.fiftyTwoWeek.pctAboveLow === null ? '—' : `+${analysis.fiftyTwoWeek.pctAboveLow.toFixed(1)}%`}
            sub={analysis.fiftyTwoWeek.low !== null ? `Low: ${formatKsh(analysis.fiftyTwoWeek.low)}` : undefined}
          />
          <MetricTile
            {...METRIC_COPY.volatility}
            value={analysis.volatility === null ? '—' : `${analysis.volatility.toFixed(1)}%`}
            sub="annualised"
          />
          <MetricTile
            {...METRIC_COPY.atr}
            value={analysis.atr === null ? '—' : formatKsh(analysis.atr)}
          />
          <MetricTile
            {...METRIC_COPY.beta}
            value={analysis.beta === null ? '—' : `${analysis.beta.toFixed(2)}×`}
          />
          <MetricTile
            {...METRIC_COPY.volumeTrend}
            value={analysis.volume.ratio === null ? '—' : `${analysis.volume.ratio.toFixed(2)}×`}
            sub={analysis.volume.ratio !== null ? (analysis.volume.ratio > 1 ? 'Rising interest' : 'Cooling interest') : undefined}
          />
          <MetricTile
            {...METRIC_COPY.priceVolume}
            value={PV_SIGNAL_LABEL[analysis.priceVolumeSignal]}
            sub={PV_SIGNAL_COPY[analysis.priceVolumeSignal]}
          />
        </div>
      </section>

      <section className="rounded-lg border border-canvas-border bg-canvas-panel p-4">
        <h2 className="text-sm font-semibold text-ink">Signal Score Breakdown</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Momentum', value: signal.components.momentum, weight: '30%' },
            { label: 'Trend', value: signal.components.trend, weight: '25%' },
            { label: 'Volatility-Adjusted Return', value: signal.components.volatilityAdjustedReturn, weight: '25%' },
            { label: 'Volume Confirmation', value: signal.components.volumeConfirmation, weight: '20%' },
          ].map((c) => (
            <div key={c.label}>
              <div className="flex items-baseline justify-between text-xs text-ink-muted">
                <span>{c.label}</span>
                <span className="text-ink-faint">{c.weight}</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
                <div className="h-full rounded-full bg-accent" style={{ width: `${c.value}%` }} />
              </div>
              <div className="mt-1 text-right text-xs tabular text-ink-muted">{c.value}/100</div>
            </div>
          ))}
        </div>
      </section>

      <Disclaimer />
    </div>
  )
}
