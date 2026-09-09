import { Route, Routes } from 'react-router-dom'
import { MarketDataProvider } from './lib/MarketDataContext'
import Layout from './components/Layout'
import MarketOverview from './pages/MarketOverview'
import TopPicks from './pages/TopPicks'
import Watchlist from './pages/Watchlist'
import StockDetail from './pages/StockDetail'

export default function App() {
  return (
    <MarketDataProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<MarketOverview />} />
          <Route path="/top-picks" element={<TopPicks />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/stock/:ticker" element={<StockDetail />} />
        </Routes>
      </Layout>
    </MarketDataProvider>
  )
}
