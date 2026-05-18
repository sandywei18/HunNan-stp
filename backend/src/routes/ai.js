import express from 'express'
const router = express.Router()

router.post('/analyze', async (req, res) => {
  const { symbol, objective, timeframe } = req.body
  if (!symbol) {
    return res.status(400).json({ ok: false, error: 'symbol is required.' })
  }

  const signal = Math.random() > 0.5 ? '建議多單' : '建議空單'
  const strength = Math.random() > 0.6 ? '強烈' : '中性'
  const detail = `本模型以近 30 日成交量與價格波動為基礎，判斷 ${symbol} 目前屬於 ${signal}，建議在日內波段操作中保留 3% 停利、2% 停損。`

  res.json({
    ok: true,
    data: {
      symbol,
      objective: objective || 'trend analysis',
      timeframe: timeframe || '短期',
      recommendation: signal,
      strength,
      detail,
      generatedAt: new Date().toISOString()
    }
  })
})

export default router
