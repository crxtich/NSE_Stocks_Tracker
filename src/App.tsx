import { Route, Routes } from 'react-router-dom'
import { MarketDataProvider } from './lib/MarketDataContext'
import Layout from './components/Layout'
import MarketOverview from './pages/MarketOverview'
import TopPicks from './pages/TopPicks'
import Watchlist from './pages/Watchlist'
import StockDetail from './pages/StockDetail'
import SubscriptionStatus from './pages/SubscriptionStatus'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <MarketDataProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<MarketOverview />} />
          <Route path="/top-picks" element={<TopPicks />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/stock/:ticker" element={<StockDetail />} />
          <Route path="/subscription-status" element={<SubscriptionStatus />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </MarketDataProvider>
  )
}
