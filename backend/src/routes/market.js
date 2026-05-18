import express from 'express'
const router = express.Router()

const DEFAULT_SYMBOLS = {
  '2330.TW': { name: '台積電' },
  '2317.TW': { name: '鴻海' },
  '2454.TW': { name: '聯發科' },
  '0050.TW': { name: '台灣50' }
}

async function fetchYahooTWStock(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d&lang=zh-TW`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Market fetch failed')
  const json = await res.json()
  const result = json?.chart?.result?.[0]
  if (!result) throw new Error('No market data')
  const meta = result.meta
  const quote = result.indicators.quote?.[0]
  const currentPrice = meta.regularMarketPrice || quote.close?.at(-1)
  const prevClose = meta.chartPreviousClose || quote.close?.at(-2)
  return {
    symbol,
    name: meta.longName || meta.shortName || DEFAULT_SYMBOLS[symbol]?.name || symbol,
    price: parseFloat(currentPrice?.toFixed(2) || '0'),
    prevClose: parseFloat(prevClose?.toFixed(2) || '0'),
    change: parseFloat(((currentPrice || 0) - (prevClose || 0)).toFixed(2)),
    pct: parseFloat((prevClose ? (((currentPrice || 0) - prevClose) / prevClose) * 100 : 0).toFixed(2)),
    timestamp: new Date().toISOString()
  }
}

router.get('/twstock', async (req, res) => {
  const symbols = (req.query.symbols || '2330.TW,2317.TW,2454.TW,0050.TW').split(',')
  try {
    const results = await Promise.all(symbols.map(symbol => fetchYahooTWStock(symbol.trim())))
    res.json({ ok: true, data: results })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

export default router
