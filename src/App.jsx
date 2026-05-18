import { useEffect, useMemo, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'
import { createOrder, getOrders, getRanking } from './api.js'
import './App.css'

Chart.register(...registerables)

const INITIAL_CAPITAL = 200_000_000
const YAHOO_PROXY = 'https://api.allorigins.win/raw?url='

const SYMBOLS = {
  '2330.TW': { name: '台積電', type: 'stock', refPrice: 950 },
  '2317.TW': { name: '鴻海', type: 'stock', refPrice: 135 },
  '2454.TW': { name: '聯發科', type: 'stock', refPrice: 1180 },
  '2308.TW': { name: '台達電', type: 'stock', refPrice: 245 },
  '2881.TW': { name: '富邦金', type: 'stock', refPrice: 65 },
  '2882.TW': { name: '國泰金', type: 'stock', refPrice: 55 },
  '2412.TW': { name: '中華電', type: 'stock', refPrice: 130 },
  '2303.TW': { name: '聯電', type: 'stock', refPrice: 48 },
  '2002.TW': { name: '中鋼', type: 'stock', refPrice: 25 },
  '1301.TW': { name: '台塑', type: 'stock', refPrice: 65 },
  '0050.TW': { name: '台灣50', type: 'etf', refPrice: 195 },
  '0056.TW': { name: '高股息', type: 'etf', refPrice: 42 },
  '00878.TW': { name: '國泰永續高股息', type: 'etf', refPrice: 18 },
  '00929.TW': { name: '復華台灣科技優息', type: 'etf', refPrice: 22 },
  '006208.TW': { name: '富邦台灣50', type: 'etf', refPrice: 105 },
  '00631L.TW': { name: '元大台灣50正2', type: 'etf', leverage: 2, refPrice: 68 },
  '00632R.TW': { name: '元大台灣50反1', type: 'etf', leverage: -1, refPrice: 18 },
}

const TABS = [
  { id: 'dashboard', label: '📊 總覽儀表板' },
  { id: 'quotes', label: '📡 即時行情' },
  { id: 'order', label: '📝 下單 / 計劃書' },
  { id: 'holdings', label: '💼 持倉管理' },
  { id: 'roles', label: '👥 角色分工' },
  { id: 'report', label: '📋 績效報告' },
  { id: 'ai', label: '🤖 AI 助理' },
  { id: 'education', label: '📚 金融教育' },
  { id: 'rules', label: '⚠️ 交易規則' },
]

const STRATEGIES = [
  { id: 'buy_hold', name: 'Buy & Hold' },
  { id: 'ma_cross', name: 'MA 黃金交叉' },
  { id: 'rsi', name: 'RSI 超買超賣' },
  { id: 'momentum', name: '動能策略' },
]

const EDU_TOPICS = [
  {
    icon: '📦',
    title: '什麼是 ETF？',
    desc: '指數股票型基金基礎概念',
    content: `ETF（Exchange-Traded Fund）指數股票型基金，像股票一樣在交易所買賣。\n\n🔑 核心概念：\n• 一籃子股票：0050 追蹤台灣前50大公司\n• 低費用率：0050 約 0.43%/年，遠低於主動基金\n• 自動分散：天然避免集中風險\n• 即時買賣：跟股票一樣，盤中隨時可交易\n\n📊 台灣熱門ETF比較：\n• 0050 台灣50：追蹤台灣市值前50大，績效最接近大盤\n• 0056 高股息：選高殖利率股，年化約5-7%配息\n• 00878 國泰永續高股息：ESG 永續 + 月配息\n• 00929 復華科技優息：科技股為主，月配息\n\n💡 適合族群：\n• 工作忙碌、無暇研究個股\n• 投資新手，想先了解市場\n• 希望穩定長期增值的族群`,
  },
  {
    icon: '⚡',
    title: '槓桿 ETF 風險',
    desc: '正2、反1、時間損耗危險',
    content: `槓桿型ETF 每日放大漲跌幅，長期持有有「時間損耗」問題！\n\n🚨 時間損耗（Volatility Decay）範例：\n第1天：大盤 +10%，正2 = +20%\n第2天：大盤 -10%，正2 = -20%\n正2合計：(1+0.2)×(1-0.2) - 1 = -4%\n而大盤：(1+0.1)×(1-0.1) - 1 = -1%\n\n⚠️ 結論：震盪行情中，槓桿ETF比指數跌更多！\n\n00631L 正2 特性：\n• 每日重設：以當日NAV計算2倍\n• 適用：明確趨勢的短線操作（1-5天）\n• 禁忌：長期持有、橫盤震盪行情\n\n00632R 反1 特性：\n• 大盤跌時賺錢，適合做空避險\n• 同樣有時間損耗問題\n• 牛市中長期持有必虧損\n\n💡 STP模擬建議：若ETF組選槓桿ETF，請設嚴格停損（-3%）！`,
  },
  {
    icon: '📊',
    title: '如何看 K 線？',
    desc: '蠟燭圖、型態、多空判讀',
    content: `K線（蠟燭圖）是最重要的技術分析工具。\n\n🕯️ 單根K線解讀：\n• 紅K（陽線）：收盤 > 開盤，多方勝\n• 黑K（陰線）：收盤 < 開盤，空方勝\n• 上影線長：高點賣壓重，股價難突破\n• 下影線長：低點支撐強，逢低買盤進場\n\n📈 均線（MA）系統：\n• MA5（5日）：短線趨勢\n• MA20（月線）：中線趨勢，重要支撐/壓力\n• MA60（季線）：長線趨勢方向\n\n• 多頭排列：MA5 > MA20 > MA60，強勢信號 ✅\n• 死叉：MA5下穿MA20，空頭信號 ⚠️\n• 金叉：MA5上穿MA20，多頭信號 🚀\n\n📉 RSI 指標：\n• RSI > 70：超買，可能回調（考慮賣出）\n• RSI < 30：超賣，可能反彈（考慮買入）\n• 中性區間 30-70：依趨勢操作\n\n💡 建議：結合K線 + 均線 + RSI，三個指標同時看。`,
  },
  {
    icon: '🛑',
    title: '如何停損？',
    desc: '固定比例、技術停損策略',
    content: `停損是投資最重要的技能，保護本金比追求獲利更重要！\n\n📌 常見停損方式：\n\n1️⃣ 固定比例停損（最簡單）\n• 買入後下跌固定比例賣出\n• 個股建議：-5% 到 -8%\n• ETF建議：-3% 到 -5%\n• 優點：規則明確，不受情緒影響\n\n2️⃣ 技術面停損（較精準）\n• 跌破 MA20 → 停損\n• 跌破前低（支撐位）→ 停損\n• K線出現空頭訊號 → 停損\n\n3️⃣ 時間停損\n• 設定持有天數（如7天），到期不管盈虧都執行\n• 適合短線操作策略\n\n⚠️ 停損心理障礙：\n• 「再等等，會漲回來」→ 最危險的想法\n• 小虧是好的，大虧傷元氣\n• STP模擬：虧損15%即Game Over\n\n💡 本次模擬建議：\n• 個股：設 -5% 停損\n• 槓桿ETF：設 -3% 停損\n• 一般ETF：設 -5% 到 -8%`,
  },
  {
    icon: '📐',
    title: '基本面 vs 技術面',
    desc: '兩種分析方法的應用',
    content: `投資分析兩大流派，各有優缺點！\n\n📊 基本面分析：\n• 看「公司值多少」\n• 指標：EPS、P/E、ROE、毛利率、營收\n• 時間框架：中長期（月~年）\n• 適合：長期投資、存股族\n\n• 台積電 EPS 約40元，P/E 約22倍 → 合理\n• P/E 超過30可能偏貴，低於15可能低估\n\n📈 技術面分析：\n• 看「股價何時動」\n• 指標：K線、MA、RSI、MACD、量能\n• 時間框架：短中期（日~月）\n• 適合：波段操作、短線交易\n\n🔀 如何結合：\n① 基本面選股：選好公司（護城河、獲利能力）\n② 技術面找時機：等待回調到支撐買入\n③ 技術面停損：跌破MA20出場保本\n\n💡 ETF 投資：\n• 基本面：選追蹤優質指數的ETF\n• 技術面：觀察大盤MA月線，多頭排列才加碼`,
  },
  {
    icon: '🎯',
    title: 'Sharpe Ratio 解析',
    desc: '風險調整後報酬的計算方式',
    content: `Sharpe Ratio（夏普比率）是衡量投資效率的最重要指標！\n\n📐 計算公式：\nSharpe = (投資報酬率 - 無風險利率) / 投資標準差\n• 無風險利率：約2%（台灣公債）\n• 標準差：報酬率的波動度\n\n📊 解讀標準：\n• Sharpe > 2.0：頂級，極少策略達到\n• Sharpe > 1.0：優秀，持續追求目標\n• Sharpe 0.5-1.0：良好，多數主動基金\n• Sharpe < 0：跑輸無風險資產，需改進\n\n💡 範例比較：\n• 股票組：報酬20%，波動25% → Sharpe ≈ 0.72\n• ETF組：報酬12%，波動10% → Sharpe ≈ 1.00\n→ ETF組風險調整後更佳！\n\n⚠️ Sharpe 的限制：\n• 假設報酬率呈正態分布（實際有厚尾）\n• 不區分上行/下行波動\n• 短期績效 Sharpe 意義不大（需至少1年）\n\n🏆 STP模擬目標：Sharpe > 0.5 即表現不錯！`,
  },
]

const initialState = {
  day: 1,
  stockCash: INITIAL_CAPITAL,
  etfCash: INITIAL_CAPITAL,
  stockHoldings: [],
  etfHoldings: [],
  orders: [],
  dailyLog: [],
  pendingOrders: [],
  closingPrices: {},
}

function formatMoney(value) {
  return '$' + Math.round(value).toLocaleString()
}

function dispSym(symbol) {
  return symbol.replace('.TW', '')
}

function calculateStats(items) {
  const totalValue = items.reduce((sum, item) => sum + item.lots * 1000 * item.currentPrice, 0)
  const totalCost = items.reduce((sum, item) => sum + item.lots * 1000 * item.avgPrice, 0)
  return { totalValue, totalCost }
}

async function fetchYahooPrice(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d&lang=zh-TW`
    const proxyUrl = YAHOO_PROXY + encodeURIComponent(url)
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) })
    const json = await res.json()
    const result = json?.chart?.result?.[0]
    if (!result) throw new Error('No data')
    const meta = result.meta
    const closes = result.indicators?.quote?.[0]?.close || []
    const opens = result.indicators?.quote?.[0]?.open || []
    const currentPrice = meta.regularMarketPrice || closes.at(-1) || SYMBOLS[symbol]?.refPrice || 0
    const prevClose = meta.chartPreviousClose || closes.at(-2) || currentPrice
    const change = currentPrice - prevClose
    const pct = prevClose ? (change / prevClose) * 100 : 0
    return {
      price: parseFloat(currentPrice.toFixed(2)),
      prev: parseFloat(prevClose.toFixed(2)),
      open: parseFloat((opens.at(-1) || currentPrice).toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      pct: parseFloat(pct.toFixed(2)),
      volume: meta.regularMarketVolume || 0,
      name: meta.longName || meta.shortName || SYMBOLS[symbol]?.name || symbol,
      ts: new Date().toLocaleTimeString('zh-TW'),
      fallback: false,
    }
  } catch (error) {
    const info = SYMBOLS[symbol] || { refPrice: 100, name: symbol }
    const fakePct = parseFloat(((Math.random() - 0.5) * 2).toFixed(2))
    const price = parseFloat((info.refPrice * (1 + fakePct / 100)).toFixed(2))
    return {
      price,
      prev: info.refPrice,
      open: info.refPrice,
      change: parseFloat((price - info.refPrice).toFixed(2)),
      pct: fakePct,
      volume: Math.floor(Math.random() * 50000 + 5000),
      name: info.name,
      ts: new Date().toLocaleTimeString('zh-TW'),
      fallback: true,
    }
  }
}

async function fetchYahooHistory(symbol, period) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${period}&lang=zh-TW`
    const proxyUrl = YAHOO_PROXY + encodeURIComponent(url)
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) })
    const json = await res.json()
    const result = json?.chart?.result?.[0]
    if (!result) throw new Error('No data')
    const timestamps = result.timestamp || []
    const quote = result.indicators?.quote?.[0] || {}
    const closes = quote.close || []
    const opens = quote.open || []
    const highs = quote.high || []
    const lows = quote.low || []
    const volumes = quote.volume || []
    return timestamps
      .map((ts, index) => ({
        date: new Date(ts * 1000).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' }),
        close: closes[index] != null ? parseFloat(closes[index].toFixed(2)) : null,
        open: opens[index] != null ? parseFloat(opens[index].toFixed(2)) : null,
        high: highs[index] != null ? parseFloat(highs[index].toFixed(2)) : null,
        low: lows[index] != null ? parseFloat(lows[index].toFixed(2)) : null,
        volume: volumes[index] || 0,
      }))
      .filter((item) => item.close != null)
  } catch (error) {
    const info = SYMBOLS[symbol] || { refPrice: 100 }
    const days = period === '1mo' ? 22 : period === '3mo' ? 66 : period === '6mo' ? 132 : 264
    const result = []
    let price = info.refPrice
    for (let i = days; i >= 0; i -= 1) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      if (date.getDay() === 0 || date.getDay() === 6) continue
      const change = (Math.random() - 0.49) * 0.025
      price = parseFloat(Math.max(price * (1 + change), 0.1).toFixed(2))
      result.push({
        date: date.toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' }),
        close: price,
        open: parseFloat((price * (1 + 0.002)).toFixed(2)),
        high: parseFloat((price * 1.012).toFixed(2)),
        low: parseFloat((price * 0.988).toFixed(2)),
        volume: Math.floor(Math.random() * 5e6),
      })
    }
    return result
  }
}

function calcMA(data, span) {
  return data.map((_, index) => {
    if (index < span - 1) return null
    const slice = data.slice(index - span + 1, index + 1)
    return parseFloat((slice.reduce((sum, value) => sum + value, 0) / span).toFixed(2))
  })
}

function calcBB(data, span) {
  const mid = calcMA(data, span)
  const upper = mid.map((value, index) => {
    if (value == null || index < span - 1) return null
    const slice = data.slice(index - span + 1, index + 1)
    const mean = slice.reduce((sum, v) => sum + v, 0) / span
    const std = Math.sqrt(slice.reduce((sum, v) => sum + (v - mean) ** 2, 0) / span)
    return parseFloat((value + 2 * std).toFixed(2))
  })
  const lower = mid.map((value, index) => {
    if (value == null || index < span - 1) return null
    const slice = data.slice(index - span + 1, index + 1)
    const mean = slice.reduce((sum, v) => sum + v, 0) / span
    const std = Math.sqrt(slice.reduce((sum, v) => sum + (v - mean) ** 2, 0) / span)
    return parseFloat((value - 2 * std).toFixed(2))
  })
  return { upper, lower }
}

function calcRSI(data, span) {
  return data.map((_, index) => {
    if (index < span) return null
    const slice = data.slice(index - span + 1, index + 1)
    const changes = slice.slice(1).map((value, idx) => value - slice[idx])
    const gains = changes.filter((c) => c > 0).reduce((sum, value) => sum + value, 0) / span
    const losses = -changes.filter((c) => c < 0).reduce((sum, value) => sum + value, 0) / span
    if (losses === 0) return 100
    return parseFloat((100 - 100 / (1 + gains / losses)).toFixed(2))
  })
}

function ema(data, span) {
  const result = new Array(data.length).fill(null)
  const multiplier = 2 / (span + 1)
  let prev = null
  for (let i = 0; i < data.length; i += 1) {
    if (data[i] == null) continue
    if (prev == null) {
      if (i >= span - 1) {
        const slice = data.slice(i - span + 1, i + 1)
        if (slice.length === span) {
          prev = slice.reduce((sum, value) => sum + value, 0) / span
          result[i] = parseFloat(prev.toFixed(2))
        }
      }
    } else {
      prev = data[i] * multiplier + prev * (1 - multiplier)
      result[i] = parseFloat(prev.toFixed(2))
    }
  }
  return result
}

function calcMACD(data) {
  const fast = ema(data, 12)
  const slow = ema(data, 26)
  const macd = data.map((_, index) => {
    if (fast[index] == null || slow[index] == null) return null
    return parseFloat((fast[index] - slow[index]).toFixed(2))
  })
  const signal = ema(macd.filter((v) => v != null), 9)
  const signalFull = macd.map((value, index) => (value == null ? null : signal[signal.findIndex((_, idx) => idx === index - (macd.length - signal.length))] || null))
  return { macd, signal: signalFull }
}

function getFallbackReply(message, state) {
  const lower = message.toLowerCase()
  if (lower.includes('etf') && lower.includes('個股')) {
    return 'ETF vs 個股比較：\n\n📦 ETF優點：\n• 自動分散風險\n• 交易成本低\n• 適合長期持有\n\n📈 個股優點：\n• 潛在報酬高\n• 可精選強勢標的\n• 需更多研究\n\n建議：新手可先以ETF為主，熟悉後再逐步佈局個股。'
  }
  if (lower.includes('台積電') || lower.includes('2330')) {
    return '台積電分析：\n\n• AI題材持續強勢\n• 外資仍為重要買方\n• 估值需配合營收成長評估\n• 風險：地緣政治與產業供需變化\n\n建議：可列為核心持股，但仍需搭配風險控管。'
  }
  if (lower.includes('停損')) {
    return '停損策略建議：\n\n1️⃣ 固定比例停損：如-5% ~ -8%\n2️⃣ 技術停損：跌破MA20或重要支撐\n3️⃣ 時間停損：持有天數到期未達目標即出場\n\n本次模擬建議：個股設-5%，槓桿ETF設-3%。'
  }
  if (lower.includes('槓桿') || lower.includes('00631')) {
    return '槓桿ETF風險：\n\n• 正2每日放大漲跌幅\n• 橫盤震盪會造成時間損耗\n• 1-5天短線操作較適合\n\n建議：若持有槓桿ETF，須設嚴格停損並減少持有天數。'
  }
  if (lower.includes('sharpe') || lower.includes('mdd')) {
    return 'Sharpe Ratio：衡量「每單位風險的報酬」。\nMDD：最大回撤，反映策略抗跌能力。\n\n一般來說：Sharpe >1 表示表現優秀；MDD越小越安全。'
  }
  if (lower.includes('績效') || lower.includes('報酬')) {
    const stockPct = (((state.stockCash + calculateStats(state.stockHoldings).totalValue) - INITIAL_CAPITAL) / INITIAL_CAPITAL * 100).toFixed(2)
    const etfPct = (((state.etfCash + calculateStats(state.etfHoldings).totalValue) - INITIAL_CAPITAL) / INITIAL_CAPITAL * 100).toFixed(2)
    return `目前績效：股票組 ${stockPct}% / ETF組 ${etfPct}%。\n\n目前較佳組別：${parseFloat(stockPct) > parseFloat(etfPct) ? '股票組' : parseFloat(etfPct) > parseFloat(stockPct) ? 'ETF組' : '平手'}。`
  }
  return '您好！我是 GPT Trader，請告訴我您想了解：個股vsETF、風險控管、停損策略、或投資計劃書撰寫。'
}

function symbolOptions() {
  return Object.entries(SYMBOLS).map(([key, info]) => ({ key, label: `${key} ${info.name}`, type: info.type }))
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [subTab, setSubTab] = useState('daily')
  const [quoteFilter, setQuoteFilter] = useState('all')
  const [chartSym, setChartSym] = useState('2330.TW')
  const [chartPeriod, setChartPeriod] = useState('3mo')
  const [indicators, setIndicators] = useState({ ma: true, rsi: false, macd: false, bb: false })
  const [orderForm, setOrderForm] = useState({
    trader: '',
    team: 'stock',
    role: 'trader',
    symbol: '2330.TW',
    side: 'buy',
    lots: 1,
    analysis: '',
    strategy: '',
    risk: '',
  })
  const [feedback, setFeedback] = useState('')
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      role: 'ai',
      text: '您好！我是 GPT Trader，華南銀行 STP 平台 AI 投資助理 🤖\n\n我可以協助您：\n• 分析台股個股與ETF特性\n• 比較不同投資策略優劣\n• 解釋財務指標（Sharpe Ratio、MDD等）\n• 評估風險與績效\n• 提供槓桿ETF風險警示\n• 協助撰寫投資計劃書\n\n請輸入您的問題！',
    },
  ])
  const [activeStrategy, setActiveStrategy] = useState('buy_hold')
  const [educationExpanded, setEducationExpanded] = useState(null)
  const [reportConclusion, setReportConclusion] = useState('')
  const [now, setNow] = useState(new Date())
  const [quotesData, setQuotesData] = useState([])
  const [priceCache, setPriceCache] = useState({})
  const [dailyLog, setDailyLog] = useState([])
  const [state, setState] = useState(initialState)
  const [btStats, setBtStats] = useState([])
  const [btActive, setBtActive] = useState(false)
  const [bidFeedback, setBidFeedback] = useState('')
  const [backendStatus, setBackendStatus] = useState('')
  const [backendLoading, setBackendLoading] = useState(false)
  const [remoteOrders, setRemoteOrders] = useState([])
  const [rankingData, setRankingData] = useState([])

  const priceChartRef = useRef(null)
  const subChartRef = useRef(null)
  const equityChartRef = useRef(null)
  const returnDistChartRef = useRef(null)
  const btChartRef = useRef(null)
  const charts = useRef({})

  const stockTotal = useMemo(() => state.stockCash + calculateStats(state.stockHoldings).totalValue, [state])
  const etfTotal = useMemo(() => state.etfCash + calculateStats(state.etfHoldings).totalValue, [state])
  const stockPct = useMemo(() => ((stockTotal - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100, [stockTotal])
  const etfPct = useMemo(() => ((etfTotal - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100, [etfTotal])
  const isOrderOpen = useMemo(() => {
    const h = now.getHours()
    const m = now.getMinutes()
    const total = h * 60 + m
    return total >= 9 * 60 && total < 13 * 60 + 30
  }, [now])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const loadBackendData = async () => {
    try {
      setBackendLoading(true)
      const [ordersResponse, rankingResponse] = await Promise.all([getOrders(), getRanking()])
      setRemoteOrders(ordersResponse.data || [])
      setRankingData(rankingResponse.data || [])
      setBackendStatus('後端已連線')
    } catch (error) {
      setBackendStatus(`後端連線失敗：${error.message}`)
    } finally {
      setBackendLoading(false)
    }
  }

  useEffect(() => {
    loadBackendData()
  }, [])

  useEffect(() => {
    async function loadInitialPrices() {
      const keys = ['2330.TW', '0050.TW', '0056.TW']
      const results = await Promise.all(keys.map(fetchYahooPrice))
      setPriceCache((prev) => {
        const next = { ...prev }
        keys.forEach((key, idx) => { next[key] = results[idx] })
        return next
      })
    }
    loadInitialPrices()
  }, [])

  useEffect(() => {
    if (activeTab === 'quotes') {
      loadAllQuotes()
      loadSentiment()
    }
    if (activeTab === 'dashboard') {
      renderAIPicks()
    }
    if (activeTab === 'report') {
      updateDailyReport()
    }
  }, [activeTab])

  useEffect(() => {
    if (!priceChartRef.current || activeTab !== 'quotes') return
    // do nothing until user loads chart explicitly
  }, [activeTab])

  useEffect(() => {
    const allHoldings = [...state.stockHoldings, ...state.etfHoldings]
    if (!allHoldings.length) return
    const interval = setInterval(async () => {
      const results = await Promise.all(allHoldings.map((h) => fetchYahooPrice(h.symbol)))
      setPriceCache((prev) => {
        const next = { ...prev }
        allHoldings.forEach((h, idx) => { next[h.symbol] = results[idx] })
        return next
      })
      setState((prev) => {
        const next = { ...prev }
        next.stockHoldings = next.stockHoldings.map((h) => ({ ...h, currentPrice: priceCache[h.symbol]?.price || h.currentPrice }))
        next.etfHoldings = next.etfHoldings.map((h) => ({ ...h, currentPrice: priceCache[h.symbol]?.price || h.currentPrice }))
        return next
      })
    }, 300000)
    return () => clearInterval(interval)
  }, [state.stockHoldings.length, state.etfHoldings.length, priceCache])

  const liveClockText = useMemo(() => now.toLocaleTimeString('zh-TW'), [now])
  const orderTimeText = useMemo(() => {
    if (isOrderOpen) {
      return '市場開盤中（09:00–13:30）— 可提交下單，13:31 以收盤價成交'
    }
    const h = now.getHours()
    const m = now.getMinutes()
    if (h >= 13 && m >= 30) return '已收盤（13:30後）— 今日訂單已鎖定，明日 09:00 開放新一輪下單'
    return '尚未開盤（09:00前）— 請於09:00–13:30期間下單'
  }, [isOrderOpen, now])

  const loadAllQuotes = async () => {
    const keys = Object.keys(SYMBOLS)
    const results = await Promise.all(keys.map(fetchYahooPrice))
    const list = results.map((item, idx) => ({ symbol: keys[idx], ...item, ...SYMBOLS[keys[idx]] }))
    setPriceCache((prev) => {
      const next = { ...prev }
      list.forEach((item) => { next[item.symbol] = item })
      return next
    })
    setQuotesData(list)
  }

  const filterQuotes = (filter) => {
    setQuoteFilter(filter)
  }

  const quotesVisible = useMemo(() => {
    return quotesData.filter((item) => {
      if (quoteFilter === 'stock') return item.type === 'stock'
      if (quoteFilter === 'etf') return item.type === 'etf' && !item.leverage
      if (quoteFilter === 'lev') return item.leverage
      return true
    })
  }, [quoteFilter, quotesData])

  const quickOrder = (symbol) => {
    setActiveTab('order')
    setOrderForm((prev) => ({ ...prev, symbol }))
    fetchRefPrice(symbol)
  }

  const loadSentiment = () => {
    const fearGreed = Math.floor(Math.random() * 40 + 40)
    const label = fearGreed < 45 ? '恐懼' : fearGreed < 55 ? '中性' : fearGreed < 70 ? '貪婪' : '極度貪婪'
    const investHeat = Math.floor(Math.random() * 30 + 50)
    const etfHeat = Math.floor(Math.random() * 25 + 60)
    const sentiments = ['整體偏多', '震盪整理', '強勢上漲', '量縮盤整', '外資買超', '投信持續買進']
    const social = sentiments[Math.floor(Math.random() * sentiments.length)]
    const recs = [
      '市場情緒偏多，ETF 分批佈局為主，個股建議精選強勢股',
      '大盤位於高檔，建議控制倉位，ETF 優先於個股',
      '外資持續流入，台積電等權值股具支撐，可逢低布局',
      '恐慌指數偏低，市場過熱，建議保留現金伺機而動',
    ]
    const rec = recs[Math.floor(Math.random() * recs.length)]
    setState((prev) => ({ ...prev, sentiment: { fearGreed, label, investHeat, etfHeat, social, rec } }))
    setPriceCache((prev) => ({ ...prev, sentiment: { fearGreed, label, investHeat, etfHeat, social, rec } }))
  }

  const fetchRefPrice = async (symbol = orderForm.symbol) => {
    setFeedback('取得報價中...')
    const data = await fetchYahooPrice(symbol)
    setPriceCache((prev) => ({ ...prev, [symbol]: data }))
    setFeedback(`✅ ${SYMBOLS[symbol]?.name || symbol} 參考價 $${data.price}${data.fallback ? '（估算值）' : ''}`)
  }

  const updateOrderPreview = () => {
    const symbol = orderForm.symbol
    const ref = priceCache[symbol]?.price || SYMBOLS[symbol]?.refPrice || 0
    const total = orderForm.lots * 1000 * ref
    return total > 0 ? `${formatMoney(total)}（以參考價試算）` : '-- 請輸入張數 --'
  }

  const canSubmitOrder = () => {
    if (!orderForm.trader.trim()) return '請輸入交易員姓名'
    if (!orderForm.lots || orderForm.lots < 1) return '請輸入有效張數'
    if (!orderForm.analysis.trim()) return '投資計劃書（市場分析）為必填'
    const symbolType = SYMBOLS[orderForm.symbol]?.type
    if (orderForm.team === 'stock' && symbolType === 'etf') return '股票組不得買入 ETF'
    if (orderForm.team === 'etf' && symbolType === 'stock') return 'ETF 組不得買入個股'
    const refPrice = priceCache[orderForm.symbol]?.price || SYMBOLS[orderForm.symbol]?.refPrice || 0
    const estAmt = orderForm.lots * 1000 * refPrice
    const cash = orderForm.team === 'stock' ? state.stockCash : state.etfCash
    if (orderForm.side === 'buy' && estAmt > cash) return '資金不足（以參考價估算），請減少張數'
    return ''
  }

  const handleSubmitOrder = async () => {
    if (!isOrderOpen) {
      setFeedback('❌ 目前非交易時間（09:00–13:30），無法下單')
      return
    }
    const error = canSubmitOrder()
    if (error) {
      setFeedback(`❌ ${error}`)
      return
    }
    const symbolType = SYMBOLS[orderForm.symbol]?.type
    const refPrice = priceCache[orderForm.symbol]?.price || SYMBOLS[orderForm.symbol]?.refPrice || 100
    const estAmt = orderForm.lots * 1000 * refPrice
    const holdings = orderForm.team === 'stock' ? state.stockHoldings : state.etfHoldings
    const existing = holdings.find((item) => item.symbol === orderForm.symbol)
    const existingVal = existing ? existing.lots * 1000 * (priceCache[orderForm.symbol]?.price || existing.currentPrice) : 0
    const limit = orderForm.team === 'stock' ? 0.2 : 0.3
    if ((existingVal + estAmt) / INITIAL_CAPITAL > limit) {
      setFeedback(`❌ 預估集中度超限：單一標的不得超過 ${limit * 100}%`)
      return
    }
    const plan = [
      orderForm.analysis.trim() && `【市場分析】${orderForm.analysis.trim()}`,
      orderForm.strategy.trim() && `【交易策略】${orderForm.strategy.trim()}`,
      orderForm.risk.trim() && `【風險評估】${orderForm.risk.trim()}`,
    ]
      .filter(Boolean)
      .join('\n')

    const orderPayload = {
      userId: orderForm.trader.trim() || `guest-${Date.now()}`,
      symbol: orderForm.symbol,
      action: orderForm.side,
      quantity: orderForm.lots,
      price: refPrice,
      type: 'market',
      notes: plan,
    }

    try {
      setFeedback('⏳ 訂單已送出，正在同步後端...')
      const response = await createOrder(orderPayload)
      setRemoteOrders((prev) => [...prev, response.data])
      setBackendStatus('最新訂單已同步至後端')
    } catch (error) {
      console.warn('Backend order sync failed', error)
      setFeedback(`⚠️ 訂單已本地保存，但後端同步失敗：${error.message}`)
    }

    const order = {
      id: Date.now(),
      day: state.day,
      trader: orderForm.trader.trim(),
      role: orderForm.role,
      team: orderForm.team,
      symbol: orderForm.symbol,
      name: SYMBOLS[orderForm.symbol]?.name || orderForm.symbol,
      side: orderForm.side,
      lots: orderForm.lots,
      refPrice,
      plan,
      status: '待結算',
      timestamp: new Date().toLocaleTimeString('zh-TW'),
    }
    setState((prev) => ({ ...prev, orders: [...prev.orders, order], pendingOrders: [...prev.pendingOrders, order] }))
    setFeedback(`⏳ 下單已受理！${SYMBOLS[orderForm.symbol]?.name} ${orderForm.lots}張 ${orderForm.side === 'buy' ? '買進' : '賣出'}，將於 13:31 以收盤價成交`)
  }

  const handleCancelOrder = () => {
    const pending = state.pendingOrders.filter((order) => order.status === '待結算')
    if (!pending.length) {
      setFeedback('❌ 無可撤銷的待結算訂單')
      return
    }
    const last = pending.at(-1)
    const updatedOrders = state.orders.map((order) => (order.id === last.id ? { ...order, status: '已撤銷' } : order))
    const updatedPending = state.pendingOrders.filter((order) => order.id !== last.id)
    setState((prev) => ({ ...prev, orders: updatedOrders, pendingOrders: updatedPending }))
    setFeedback('⚠️ 已撤銷上筆訂單')
  }

  const settlePendingOrders = async () => {
    const pending = state.pendingOrders.filter((order) => order.status === '待結算')
    if (!pending.length) return
    const symbols = [...new Set(pending.map((order) => order.symbol))]
    const priceResults = await Promise.all(symbols.map(fetchYahooPrice))
    const prices = {}
    symbols.forEach((symbol, index) => { prices[symbol] = priceResults[index].price })
    const nextState = { ...state }
    const updatedOrders = [...state.orders]
    pending.forEach((order) => {
      const price = prices[order.symbol] || SYMBOLS[order.symbol]?.refPrice || order.refPrice
      const amount = order.lots * 1000 * price
      const holdings = order.team === 'stock' ? nextState.stockHoldings : nextState.etfHoldings
      if (order.side === 'buy') {
        const cashKey = order.team === 'stock' ? 'stockCash' : 'etfCash'
        if (amount > nextState[cashKey]) {
          order.status = '資金不足-取消'
          return
        }
        nextState[cashKey] -= amount
        const existing = holdings.find((item) => item.symbol === order.symbol)
        if (existing) {
          const totalCost = existing.lots * 1000 * existing.avgPrice + amount
          existing.lots += order.lots
          existing.avgPrice = totalCost / (existing.lots * 1000)
          existing.currentPrice = price
        } else {
          holdings.push({ symbol: order.symbol, name: order.name, lots: order.lots, avgPrice: price, currentPrice: price })
        }
      } else {
        const existing = holdings.find((item) => item.symbol === order.symbol)
        if (!existing || existing.lots < order.lots) {
          order.status = '持倉不足-取消'
          return
        }
        existing.lots -= order.lots
        if (existing.lots === 0) {
          const idx = holdings.indexOf(existing)
          holdings.splice(idx, 1)
        }
        const cashKey = order.team === 'stock' ? 'stockCash' : 'etfCash'
        nextState[cashKey] += amount
      }
      order.status = '已成交'
      order.price = price
      order.amount = amount
      nextState.closingPrices[order.symbol] = price
    })
    const updatedPending = updatedOrders.filter((order) => order.status === '待結算')
    setState({ ...nextState, orders: updatedOrders, pendingOrders: updatedPending })
  }

  const updateDailyReport = () => {
    const entry = {
      day: state.day,
      stockTotal,
      etfTotal,
      stockPct: parseFloat(stockPct.toFixed(2)),
      etfPct: parseFloat(etfPct.toFixed(2)),
      winner: stockTotal > etfTotal ? '📈 股票組' : etfTotal > stockTotal ? '📦 ETF組' : '平手',
      note: '收盤結算',
    }
    setDailyLog((prev) => [...prev, entry])
  }

  const handleAdvanceDay = () => {
    if (state.day >= 30) {
      window.alert('模擬已達30天！請查看績效報告。')
      return
    }
    const nextState = { ...state }
    nextState.stockHoldings = nextState.stockHoldings.map((item) => {
      const vol = item.leverage ? 0.05 : item.type === 'etf' ? 0.015 : 0.025
      const change = (Math.random() - 0.485) * vol * 2
      return { ...item, currentPrice: parseFloat(Math.max(item.currentPrice * (1 + change), 0.1).toFixed(2)) }
    })
    nextState.etfHoldings = nextState.etfHoldings.map((item) => {
      const vol = item.leverage ? 0.05 : item.type === 'etf' ? 0.015 : 0.025
      const change = (Math.random() - 0.485) * vol * 2
      return { ...item, currentPrice: parseFloat(Math.max(item.currentPrice * (1 + change), 0.1).toFixed(2)) }
    })
    nextState.day += 1
    setState(nextState)
    const entry = {
      day: state.day,
      stockTotal,
      etfTotal,
      stockPct: parseFloat(stockPct.toFixed(2)),
      etfPct: parseFloat(etfPct.toFixed(2)),
      winner: stockTotal > etfTotal ? '📈 股票組' : etfTotal > stockTotal ? '📦 ETF組' : '平手',
      note: '收盤結算',
    }
    setDailyLog((prev) => [...prev, entry])
  }

  const handleResetSimulation = () => {
    if (!window.confirm('確定要重置所有模擬資料嗎？')) return
    setState(initialState)
    setDailyLog([])
    setFeedback('已重置模擬資料')
    setBidFeedback('')
    setBtActive(false)
    setBtStats([])
  }

  const handleExportReport = () => {
    const conclusion = reportConclusion || ''
    const report = `══════════════════════════════════════\n華南銀行 STP 種子人才培訓計劃\n青年投資行為分析 - 績效報告\n══════════════════════════════════════\n模擬天數：${state.day - 1} / 30 天\n報告時間：${new Date().toLocaleString('zh-TW')}\n\n【股票組】\n期初資金：$200,000,000\n期末資產：${formatMoney(stockTotal)}\n累積報酬：${stockPct >= 0 ? '+' : ''}${stockPct.toFixed(2)}%\n交易次數：${state.orders.filter((o) => o.team === 'stock').length} 筆\n\n【ETF 組】\n期初資金：$200,000,000\n期末資產：${formatMoney(etfTotal)}\n累積報酬：${etfPct >= 0 ? '+' : ''}${etfPct.toFixed(2)}%\n交易次數：${state.orders.filter((o) => o.team === 'etf').length} 筆\n\n【最終結論】\n勝出組別：${stockTotal > etfTotal ? '股票組' : etfTotal > stockTotal ? 'ETF組' : '平手'}\n差距金額：${formatMoney(Math.abs(stockTotal - etfTotal))}\n${conclusion ? `\n【分析結論】\n${conclusion}` : ''}\n══════════════════════════════════════`
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `STP_績效報告_第${state.day}天.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleSendChat = () => {
    if (!chatInput.trim()) return
    const newMessage = { id: Date.now(), role: 'user', text: chatInput.trim() }
    setChatMessages((prev) => [...prev, newMessage])
    setChatInput('')
    const reply = getFallbackReply(chatInput, state)
    setTimeout(() => {
      setChatMessages((prev) => [...prev, { id: Date.now() + 1, role: 'ai', text: reply }])
    }, 400)
  }

  const handleChatQuick = (text) => {
    setChatInput(text)
    setTimeout(handleSendChat, 10)
  }

  const handleToggleIndicator = (key) => {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSelectStrategy = (id) => {
    setActiveStrategy(id)
  }

  const handleRunBacktest = async () => {
    setBidFeedback('回測中...')
    const hist = await fetchYahooHistory(orderForm.symbol, chartPeriod)
    if (!hist.length) {
      setBidFeedback('❌ 無法取得歷史資料')
      return
    }
    const closes = hist.map((item) => item.close)
    let equity = 1000000
    let shares = 0
    let trades = 0
    const curve = []
    let peak = equity
    let mdd = 0
    const ma5 = calcMA(closes, 5)
    const ma20 = calcMA(closes, 20)
    const rsi = calcRSI(closes, 14)
    for (let i = 1; i < closes.length; i += 1) {
      const price = closes[i]
      let signal = 0
      if (activeStrategy === 'buy_hold') {
        if (i === 1) {
          shares = Math.floor(equity / price / 1000) * 1000
          equity -= shares * price
          trades += 1
        }
      } else if (activeStrategy === 'ma_cross') {
        if (ma5[i] != null && ma20[i] != null && ma5[i - 1] != null && ma20[i - 1] != null) {
          if (ma5[i] > ma20[i] && ma5[i - 1] <= ma20[i - 1]) signal = 1
          if (ma5[i] < ma20[i] && ma5[i - 1] >= ma20[i - 1]) signal = -1
        }
      } else if (activeStrategy === 'rsi') {
        if (rsi[i] != null) {
          if (rsi[i] < 30 && shares === 0) signal = 1
          if (rsi[i] > 70 && shares > 0) signal = -1
        }
      } else if (activeStrategy === 'momentum') {
        if (i >= 5) {
          const momentum = (price - closes[i - 5]) / closes[i - 5]
          if (momentum > 0.03 && shares === 0) signal = 1
          if (momentum < -0.03 && shares > 0) signal = -1
        }
      }
      if (signal === 1 && equity > price * 1000) {
        const lots = Math.floor(equity / price / 1000) * 1000
        shares += lots
        equity -= lots * price
        trades += 1
      }
      if (signal === -1 && shares > 0) {
        equity += shares * price
        shares = 0
        trades += 1
      }
      const total = equity + shares * price
      curve.push({ date: hist[i].date, value: total })
      if (total > peak) peak = total
      mdd = Math.max(mdd, ((peak - total) / peak) * 100)
    }
    const finalValue = equity + shares * closes.at(-1)
    const totalRet = ((finalValue - 1000000) / 1000000) * 100
    const buyHoldRet = ((1000000 / closes[0]) * closes.at(-1) - 1000000) / 1000000 * 100
    const annualRet = ((finalValue / 1000000) ** (365 / closes.length) - 1) * 100
    setBtStats([
      { label: '累積報酬', value: `${totalRet >= 0 ? '+' : ''}${totalRet.toFixed(2)}%`, highlight: totalRet >= 0 },
      { label: '年化報酬', value: `${annualRet >= 0 ? '+' : ''}${annualRet.toFixed(2)}%` },
      { label: '最大回撤', value: `${mdd.toFixed(2)}%`, highlight: false },
      { label: '交易次數', value: `${trades} 筆` },
      { label: 'Buy & Hold', value: `${buyHoldRet >= 0 ? '+' : ''}${buyHoldRet.toFixed(2)}%` },
      { label: 'Alpha', value: `${(totalRet - buyHoldRet).toFixed(2)}%`, highlight: totalRet - buyHoldRet >= 0 },
    ])
    setBtActive(true)
    setBidFeedback('✅ 回測完成')
    if (btChartRef.current) {
      if (charts.current.bt) charts.current.bt.destroy()
      charts.current.bt = new Chart(btChartRef.current, {
        type: 'line',
        data: {
          labels: curve.map((item) => item.date),
          datasets: [
            { label: activeStrategy, data: curve.map((item) => item.value), borderColor: '#c9963a', backgroundColor: 'rgba(201,150,58,0.12)', fill: true, tension: 0.25 },
            { label: 'Buy & Hold', data: curve.map((item, idx) => 1000000 / closes[0] * closes[idx + 1]), borderColor: '#5ba3f5', borderDash: [4, 4], fill: false, tension: 0.25 },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#8a96b8', font: { size: 11 } } } },
          scales: {
            x: { ticks: { color: '#4a5580', maxTicksLimit: 10 }, grid: { color: 'rgba(255,255,255,0.04)' } },
            y: { ticks: { color: '#4a5580', callback: (value) => `$${Math.round(value / 1000)}K` }, grid: { color: 'rgba(255,255,255,0.04)' } },
          },
        },
      })
    }
  }

  const handleLoadChart = async () => {
    const hist = await fetchYahooHistory(chartSym, chartPeriod)
    if (!hist.length) return
    const labels = hist.map((item) => item.date)
    const closes = hist.map((item) => item.close)
    const ma5 = calcMA(closes, 5)
    const ma20 = calcMA(closes, 20)
    const ma60 = calcMA(closes, 60)
    const bb = calcBB(closes, 20)
    const rsi = calcRSI(closes, 14)
    const macd = calcMACD(closes)
    const chartData = [
      { label: '收盤', data: closes, borderColor: '#c9963a', tension: 0.25, pointRadius: 0, fill: false },
    ]
    if (indicators.ma) {
      chartData.push({ label: 'MA5', data: ma5, borderColor: '#5ba3f5', tension: 0.25, pointRadius: 0 })
      chartData.push({ label: 'MA20', data: ma20, borderColor: '#4dbb80', tension: 0.25, pointRadius: 0 })
      chartData.push({ label: 'MA60', data: ma60, borderColor: '#f0a45a', tension: 0.25, pointRadius: 0 })
    }
    if (indicators.bb) {
      chartData.push({ label: 'BB 上', data: bb.upper, borderColor: 'rgba(192,57,43,0.6)', borderDash: [4, 4], pointRadius: 0, fill: false })
      chartData.push({ label: 'BB 下', data: bb.lower, borderColor: 'rgba(192,57,43,0.6)', borderDash: [4, 4], pointRadius: 0, fill: false })
    }
    if (priceChartRef.current) {
      if (charts.current.price) charts.current.price.destroy()
      charts.current.price = new Chart(priceChartRef.current, {
        type: 'line',
        data: { labels, datasets: chartData },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#8a96b8', font: { size: 11 } } } },
          scales: {
            x: { ticks: { color: '#4a5580', maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.03)' } },
            y: { ticks: { color: '#4a5580' }, grid: { color: 'rgba(255,255,255,0.03)' } },
          },
        },
      })
    }
    if (subChartRef.current) {
      if (charts.current.sub) charts.current.sub.destroy()
      if (indicators.rsi || indicators.macd) {
        const subDataset = indicators.rsi
          ? [
              { label: 'RSI(14)', data: rsi, borderColor: '#c39bd3', tension: 0.25, pointRadius: 0, fill: false },
              { label: '超買70', data: labels.map(() => 70), borderColor: 'rgba(192,57,43,0.4)', borderDash: [4, 4], pointRadius: 0, fill: false },
              { label: '超賣30', data: labels.map(() => 30), borderColor: 'rgba(26,122,74,0.4)', borderDash: [4, 4], pointRadius: 0, fill: false },
            ]
          : [
              { label: 'MACD', data: macd.macd, borderColor: '#5ba3f5', tension: 0.25, pointRadius: 0, fill: false },
              { label: 'Signal', data: macd.signal, borderColor: '#e74c3c', tension: 0.25, pointRadius: 0, fill: false },
            ]
        charts.current.sub = new Chart(subChartRef.current, {
          type: 'line',
          data: { labels, datasets: subDataset },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#8a96b8', font: { size: 10 } } } },
            scales: {
              x: { ticks: { color: '#4a5580', maxTicksLimit: 8 }, grid: { color: 'rgba(255,255,255,0.02)' } },
              y: { ticks: { color: '#4a5580' }, grid: { color: 'rgba(255,255,255,0.02)' } },
            },
          },
        })
      }
    }
  }

  const renderAIPicks = () => {
    const picks = [
      { symbol: '0050.TW', score: 88, reason: '大盤指數ETF，分散風險首選' },
      { symbol: '2330.TW', score: 85, reason: '台積電AI題材強勁，長線看好' },
      { symbol: '00878.TW', score: 82, reason: 'ESG永續高股息，月配息穩定' },
      { symbol: '2454.TW', score: 78, reason: '聯發科晶片題材回溫' },
      { symbol: '0056.TW', score: 75, reason: '高股息策略，適合防禦型持有' },
    ]
    setPriceCache((prev) => ({ ...prev, aiPicks: picks }))
  }

  const aiPicks = useMemo(() => priceCache.aiPicks || [], [priceCache.aiPicks])

  const updateHoldingsDisplay = (items) => {
    if (!items.length) return <div className="empty-note">尚無持倉</div>
    return items.map((item) => {
      const value = item.lots * 1000 * item.currentPrice
      const cost = item.lots * 1000 * item.avgPrice
      const pnl = value - cost
      const pct = cost ? ((pnl / cost) * 100).toFixed(2) : '0.00'
      return (
        <div key={item.symbol} className="h-row">
          <div className="h-info">
            <div className="h-name">{item.name}</div>
            <div className="h-meta">均價 ${item.avgPrice.toFixed(1)} | 現價 ${item.currentPrice.toFixed(1)} | {item.lots}張 | 市值 {formatMoney(value)} | 集中度 {((value / INITIAL_CAPITAL) * 100).toFixed(1)}%</div>
          </div>
          <div className="h-right">
            <div className={`h-pnl ${pnl >= 0 ? 'up' : 'down'}`}>{pnl >= 0 ? '+' : ''}{formatMoney(pnl)}</div>
            <div className={`h-pct ${pnl >= 0 ? 'up' : 'down'}`}>{pnl >= 0 ? '+' : ''}{pct}%</div>
          </div>
        </div>
      )
    })
  }

  const dailyTableRows = dailyLog.length ? dailyLog.map((entry) => (
    <tr key={entry.day}>
      <td>第{entry.day}天</td>
      <td>{formatMoney(entry.stockTotal)}</td>
      <td className={entry.stockPct >= 0 ? 'up' : 'down'}>{entry.stockPct >= 0 ? '+' : ''}{entry.stockPct.toFixed(2)}%</td>
      <td>{formatMoney(entry.etfTotal)}</td>
      <td className={entry.etfPct >= 0 ? 'up' : 'down'}>{entry.etfPct >= 0 ? '+' : ''}{entry.etfPct.toFixed(2)}%</td>
      <td>{entry.winner}</td>
      <td>{entry.note}</td>
    </tr>
  )) : (
    <tr><td colSpan="7" className="empty-note">尚未推進天數</td></tr>
  )

  const behaviorCards = (team) => {
    const orders = state.orders.filter((order) => order.team === team && order.status === '已成交')
    if (!orders.length) return <div className="empty-note">尚無已成交交易記錄</div>
    const bought = orders.filter((order) => order.side === 'buy').length
    const sold = orders.filter((order) => order.side === 'sell').length
    const avgLots = (orders.reduce((sum, order) => sum + order.lots, 0) / orders.length).toFixed(1)
    const fomo = Math.min(100, Math.floor((bought / orders.length) * 80 + Math.random() * 20))
    const panic = Math.min(100, Math.floor((sold / Math.max(1, orders.length)) * 60 + Math.random() * 20))
    const overtrade = Math.min(100, Math.floor((orders.length / state.day) * 100 * 2))
    const discipline = Math.min(100, Math.floor(80 - fomo * 0.3 - overtrade * 0.2 + Math.random() * 10))
    const bars = [
      { label: 'FOMO 指數（追漲動機）', value: fomo, color: '#e74c3c' },
      { label: '恐慌指數（急售傾向）', value: panic, color: '#f0a45a' },
      { label: '過度交易指數', value: overtrade, color: '#c39bd3' },
      { label: '投資紀律評分', value: discipline, color: '#4dbb80' },
    ]
    return (
      <>
        {bars.map((bar) => (
          <div key={bar.label} className="behavior-bar-wrap">
            <div className="behavior-bar-label"><span>{bar.label}</span><span style={{ color: bar.color }}>{bar.value}/100</span></div>
            <div className="behavior-bar"><div className="behavior-fill" style={{ width: `${bar.value}%`, background: bar.color }} /></div>
          </div>
        ))}
        <div className="beh-summary">交易：{orders.length}筆（買{bought}｜賣{sold}）｜ 均張數：{avgLots}張</div>
      </>
    )
  }

  const behaviorCompareRows = [
    ['FOMO（追漲）', '高FOMO=情緒化追高', 'ETF組通常更低', 'Kahneman前景理論'],
    ['損失趨避', '個股停損心理壓力大', 'ETF波動小較易持有', 'Tversky損失趨避'],
    ['過度交易', '個股操作更頻繁', 'ETF傾向長期持有', '交易成本侵蝕績效'],
    ['集中度風險', '易集中在熱門股', '分散型ETF天然分散', 'HHI 赫芬達爾指數'],
    ['資訊處理', '易受個股消息影響', '追蹤指數相對中性', 'Noisy Rational Expectation'],
  ]

  const behaviorInsight = state.orders.filter((order) => order.status === '已成交').length === 0
    ? '尚無交易記錄，完成交易後將生成行為分析。'
    : `根據 ${state.orders.filter((order) => order.status === '已成交').length} 筆已成交交易分析：\n\n📌 建議：\n• 避免在股票大漲後追高，等待回調再進場\n• ETF 適合「買入持有」策略，頻繁進出增加成本\n• 設定明確停損點（個股 -5%，ETF -3%），避免情緒決策\n• 分批建倉降低單點風險，減少 FOMO 衝動\n• 投資計劃書有助於提升紀律，持續撰寫有利績效`

  const dailyLogBody = dailyLog.length ? dailyLog.map((entry) => (
    <tr key={entry.day}>
      <td>第{entry.day}天</td>
      <td>{formatMoney(entry.stockTotal)}</td>
      <td className={entry.stockPct >= 0 ? 'up' : 'down'}>{entry.stockPct >= 0 ? '+' : ''}{entry.stockPct.toFixed(2)}%</td>
      <td>{formatMoney(entry.etfTotal)}</td>
      <td className={entry.etfPct >= 0 ? 'up' : 'down'}>{entry.etfPct >= 0 ? '+' : ''}{entry.etfPct.toFixed(2)}%</td>
      <td>{entry.winner}</td>
      <td>{entry.note}</td>
    </tr>
  )) : (
    <tr><td colSpan="7" className="empty-note">尚未推進天數</td></tr>
  )

  const jsonDailyLog = dailyLog
  const performanceMetrics = btStats.map((metric) => (
    <div key={metric.label} className="metric-card">
      <div className="metric-label">{metric.label}</div>
      <div className={`metric-val ${metric.highlight ? 'up' : ''}`}>{metric.value}</div>
    </div>
  ))

  return (
    <div className="app-shell">
      <header className="header">
        <div>
          <div className="logo-badge">華南銀行</div>
          <div className="logo-title">STP｜AI 智能投資模擬交易平台</div>
        </div>
        <div className="header-right">
          <div className="status-row"><span className="status-dot" /><span className="status-text">即時</span></div>
          <div className="mkt-time">{liveClockText}</div>
          <div className="day-pill">模擬第 {state.day} 天</div>
          <button className="btn-sm btn-advance" type="button" onClick={handleAdvanceDay}>▶ 推進</button>
          <button className="btn-sm btn-reset" type="button" onClick={handleResetSimulation}>↺ 重置</button>
        </div>
      </header>

      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <main className="page-content">
        {activeTab === 'dashboard' && (
          <section className="page page-dashboard active">
            <div className="index-bar">
              <div className="index-chip">
                <div className="index-chip-name">台股加權指數</div>
                <div className="index-chip-price">{priceCache['0050.TW']?.price ? formatMoney(priceCache['0050.TW'].price) : '載入中...'}</div>
                <div className="index-chip-chg">{priceCache['0050.TW']?.pct != null ? `${priceCache['0050.TW'].pct >= 0 ? '+' : ''}${priceCache['0050.TW'].pct}%` : '--'}</div>
              </div>
              <div className="index-chip">
                <div className="index-chip-name">今日市場情緒</div>
                <div className="index-chip-price">{state.sentiment?.label || '—'}</div>
                <div className="index-chip-chg">AI評估</div>
              </div>
              <div className="index-chip">
                <div className="index-chip-name">模擬交易日</div>
                <div className="index-chip-price" style={{ color: 'var(--gold)' }}>第 {state.day} 天</div>
                <div className="index-chip-chg">共 30 天</div>
              </div>
              <div className="index-chip">
                <div className="index-chip-name">下單狀態</div>
                <div className="index-chip-price">{isOrderOpen ? '開盤中 ✅' : '休市中'}</div>
                <div className="index-chip-chg">09:00–13:30</div>
              </div>
              <div className="index-chip">
                <div className="index-chip-name">後端狀態</div>
                <div className="index-chip-price">{backendLoading ? '連線中...' : backendStatus || '尚未連線'}</div>
                <div className="index-chip-chg">/orders /ranking</div>
              </div>
            </div>

            <div className="card alert-card">
              <div className="card-title"><span className="dot dot-amber" />AI 市場情緒</div>
              <div className="sentiment-grid">
                <div className="sentiment-card"><div className="sentiment-label">恐慌/貪婪指數</div><div className="sentiment-val">{state.sentiment?.fearGreed ?? '--'}</div><div className="sentiment-sub">{state.sentiment?.label || '--'}</div></div>
                <div className="sentiment-card"><div className="sentiment-label">市場投資熱度</div><div className="sentiment-val">{state.sentiment?.investHeat ?? '--'}/100</div><div className="sentiment-sub">活躍度評估</div></div>
                <div className="sentiment-card"><div className="sentiment-label">ETF 熱門度</div><div className="sentiment-val">{state.sentiment?.etfHeat ?? '--'}/100</div><div className="sentiment-sub">AI評分</div></div>
                <div className="sentiment-card"><div className="sentiment-label">社群聲量</div><div className="sentiment-val">{state.sentiment?.social || '--'}</div><div className="sentiment-sub">AI估算</div></div>
              </div>
              <div className="alert alert-info"><span className="alert-icon">🤖</span>{state.sentiment?.rec || 'AI 建議載入中...'}</div>
            </div>

            <div className="stat-grid">
              <div className="stat-card"><div className="stat-label">股票組可用資金</div><div className="stat-val neutral">{formatMoney(state.stockCash)}</div><div className="stat-sub">初始 2 億</div></div>
              <div className="stat-card"><div className="stat-label">ETF 組可用資金</div><div className="stat-val neutral">{formatMoney(state.etfCash)}</div><div className="stat-sub">初始 2 億</div></div>
              <div className="stat-card"><div className="stat-label">股票組總資產</div><div className="stat-val neutral">{formatMoney(stockTotal)}</div><div className="stat-sub">報酬 {(stockPct >= 0 ? '+' : '') + stockPct.toFixed(2)}%</div></div>
              <div className="stat-card"><div className="stat-label">ETF 組總資產</div><div className="stat-val neutral">{formatMoney(etfTotal)}</div><div className="stat-sub">報酬 {(etfPct >= 0 ? '+' : '') + etfPct.toFixed(2)}%</div></div>
            </div>

            <div className="card card-row">
              <div className="team-card team-stock">
                <div className="team-name">📈 股票組（個股）</div>
                <div className="team-value">{formatMoney(stockTotal)}</div>
                <div className="team-meta"><span>報酬率</span><span className={stockPct >= 0 ? 'up' : 'down'}>{(stockPct >= 0 ? '+' : '') + stockPct.toFixed(2)}%</span></div>
                <div className="prog-bar"><div className="prog-fill fill-blue" style={{ width: Math.min(Math.max(50 + stockPct * 3, 2), 98) + '%' }} /></div>
                <div className="team-foot">持倉 {state.stockHoldings.length} 檔 | 最高集中度 {state.stockHoldings.length ? Math.max(...state.stockHoldings.map((item) => (item.lots * 1000 * item.currentPrice) / INITIAL_CAPITAL * 100)).toFixed(1) : '0'}%</div>
              </div>
              <div className="team-card team-etf">
                <div className="team-name">📦 ETF 組</div>
                <div className="team-value">{formatMoney(etfTotal)}</div>
                <div className="team-meta"><span>報酬率</span><span className={etfPct >= 0 ? 'up' : 'down'}>{(etfPct >= 0 ? '+' : '') + etfPct.toFixed(2)}%</span></div>
                <div className="prog-bar"><div className="prog-fill fill-green" style={{ width: Math.min(Math.max(50 + etfPct * 3, 2), 98) + '%' }} /></div>
                <div className="team-foot">持倉 {state.etfHoldings.length} 檔 | 最高集中度 {state.etfHoldings.length ? Math.max(...state.etfHoldings.map((item) => (item.lots * 1000 * item.currentPrice) / INITIAL_CAPITAL * 100)).toFixed(1) : '0'}%</div>
              </div>
            </div>

            <div className="winner-banner">{stockTotal > etfTotal ? `🏆 股票組領先！領先 ${formatMoney(Math.abs(stockTotal - etfTotal))}` : etfTotal > stockTotal ? `🏆 ETF 組領先！領先 ${formatMoney(Math.abs(stockTotal - etfTotal))}` : '🤝 兩組平手'}</div>

            <div className="card">
              <div className="card-title"><span className="dot dot-red" />風險控管儀表板</div>
              <div className="alert-grid">
                <div className="alert-box"><span className="alert-title">股票組損失（停損 15%）</span><div className="prog-bar"><div className="prog-fill fill-red" style={{ width: `${Math.min(Math.max((stockPct < 0 ? -stockPct : 0) / 15 * 100, 0), 100)}%` }} /></div><div className="alert-sub">損失：{stockPct < 0 ? (-stockPct).toFixed(2) : '0.00'}% / 15%</div></div>
                <div className="alert-box"><span className="alert-title">ETF 組損失（停損 15%）</span><div className="prog-bar"><div className="prog-fill fill-red" style={{ width: `${Math.min(Math.max((etfPct < 0 ? -etfPct : 0) / 15 * 100, 0), 100)}%` }} /></div><div className="alert-sub">損失：{etfPct < 0 ? (-etfPct).toFixed(2) : '0.00'}% / 15%</div></div>
              </div>
              <div className="heatmap-grid">{[...state.stockHoldings, ...state.etfHoldings].length ? [...state.stockHoldings, ...state.etfHoldings].map((item) => {
                const value = item.lots * 1000 * item.currentPrice
                const conc = (value / INITIAL_CAPITAL) * 100
                const risk = conc > 15 ? '#e74c3c' : conc > 7 ? '#f0a45a' : '#4dbb80'
                return (<div key={item.symbol} className="heatmap-cell" style={{ borderColor: risk, backgroundColor: `${risk}22` }}>
                  <div className="hm-name">{dispSym(item.symbol)}</div>
                  <div className="hm-val">{Math.round(Math.min(100, conc * 2))}</div>
                  <div className="hm-sub">集中{conc.toFixed(1)}%</div>
                </div>)
              }) : <div className="empty-note">尚無持倉</div> }</div>
            </div>

            <div className="card">
              <div className="card-hd"><div className="card-title"><span className="dot dot-purple" />AI 熱門標的推薦</div><button type="button" className="btn btn-outline mini" onClick={renderAIPicks}>🔄 更新</button></div>
              <div className="table-wrap"><table><thead><tr><th>代號</th><th>名稱</th><th>類型</th><th>參考價</th><th>AI評分</th><th>推薦理由</th><th>操作</th></tr></thead><tbody>{aiPicks.length ? aiPicks.map((item) => (
                <tr key={item.symbol}>
                  <td><span className="ticker">{dispSym(item.symbol)}</span></td>
                  <td>{SYMBOLS[item.symbol]?.name || item.symbol}</td>
                  <td><span className={`tag ${SYMBOLS[item.symbol]?.type === 'stock' ? 'tag-stock' : 'tag-etf'}`}>{SYMBOLS[item.symbol]?.type === 'stock' ? '個股' : 'ETF'}</span></td>
                  <td className="tag-ok">${priceCache[item.symbol]?.price ?? SYMBOLS[item.symbol]?.refPrice}</td>
                  <td><span className="tag tag-med">{item.score}</span></td>
                  <td className="small-text">{item.reason}</td>
                  <td><button type="button" className="btn btn-outline mini" onClick={() => quickOrder(item.symbol)}>下單</button></td>
                </tr>
              )) : <tr><td colSpan="7" className="empty-note">尚無資料</td></tr>}</tbody></table></div>
            </div>

            <div className="card">
              <div className="card-title"><span className="dot dot-amber" />最新下單紀錄</div>
              <div className="table-wrap"><table><thead><tr><th>日</th><th>交易員</th><th>組</th><th>商品</th><th>方向</th><th>張</th><th>成交價</th><th>金額</th><th>狀態</th></tr></thead><tbody>{state.orders.length ? [...state.orders].reverse().slice(0, 30).map((order) => (
                <tr key={order.id}><td>第{order.day}天</td><td>{order.trader}</td><td>{order.team === 'stock' ? '股票組' : 'ETF組'}</td><td><span className="ticker">{dispSym(order.symbol)}</span></td><td>{order.side === 'buy' ? <span className="tag tag-buy">買進</span> : <span className="tag tag-sell">賣出</span>}</td><td>{order.lots}張</td><td>{order.price ? `$${order.price.toFixed(1)}` : '待收盤'}</td><td>{order.amount ? formatMoney(order.amount) : '待結算'}</td><td><span className={`tag ${order.status === '已成交' ? 'tag-ok' : order.status === '待結算' ? 'tag-med' : 'tag-cancel'}`}>{order.status}</span></td></tr>
              )) : <tr><td colSpan="9" className="empty-note">尚無紀錄</td></tr>}</tbody></table></div>
            </div>
          </section>
        )}

        {activeTab === 'quotes' && (
          <section className="page page-quotes active">
            <div className="card">
              <div className="card-hd"><div className="card-title"><span className="dot dot-blue" />完整報價清單（Yahoo Finance 即時）</div><div className="card-actions"><span className="small-text">更新：{liveClockText}</span><button type="button" className="btn btn-outline mini" onClick={loadAllQuotes}>🔄 刷新</button></div></div>
              <div className="tag-row"><button type="button" className={`strategy-btn ${quoteFilter === 'all' ? 'active' : ''}`} onClick={() => filterQuotes('all')}>全部</button><button type="button" className={`strategy-btn ${quoteFilter === 'stock' ? 'active' : ''}`} onClick={() => filterQuotes('stock')}>個股</button><button type="button" className={`strategy-btn ${quoteFilter === 'etf' ? 'active' : ''}`} onClick={() => filterQuotes('etf')}>ETF</button><button type="button" className={`strategy-btn ${quoteFilter === 'lev' ? 'active' : ''}`} onClick={() => filterQuotes('lev')}>槓桿型</button></div>
              <div className="table-wrap"><table><thead><tr><th>代號</th><th>名稱</th><th>類型</th><th>昨收</th><th>今開</th><th>即時</th><th>漲跌</th><th>漲跌%</th><th>成交量</th><th>操作</th></tr></thead><tbody>{quotesVisible.length ? quotesVisible.map((item) => (
                <tr key={item.symbol}><td><span className="ticker">{dispSym(item.symbol)}</span></td><td>{SYMBOLS[item.symbol]?.name || item.name}</td><td>{item.type === 'stock' ? <span className="tag tag-stock">個股</span> : <span className="tag tag-etf">ETF</span>}</td><td>${item.prev}</td><td>${item.open}</td><td className={item.pct >= 0 ? 'up' : 'down'}>${item.price}</td><td className={item.pct >= 0 ? 'up' : 'down'}>{item.change >= 0 ? '+' : ''}{item.change}</td><td className={item.pct >= 0 ? 'up' : 'down'}>{item.pct >= 0 ? '+' : ''}{item.pct}%</td><td>{item.volume ? `${Math.round(item.volume / 1000)}K` : '--'}</td><td><button type="button" className="btn btn-outline mini" onClick={() => quickOrder(item.symbol)}>下單</button></td></tr>
              )) : <tr><td colSpan="10" className="empty-note">取得即時報價中...</td></tr>}</tbody></table></div>
            </div>

            <div className="card">
              <div className="card-title"><span className="dot dot-gold" />K線 / 技術分析圖表</div>
              <div className="chart-controls">
                <select value={chartSym} onChange={(e) => setChartSym(e.target.value)}>
                  <optgroup label="個股">{Object.entries(SYMBOLS).filter(([, info]) => info.type === 'stock').map(([key, info]) => <option key={key} value={key}>{key} {info.name}</option>)}</optgroup>
                  <optgroup label="ETF">{Object.entries(SYMBOLS).filter(([, info]) => info.type === 'etf').map(([key, info]) => <option key={key} value={key}>{key} {info.name}</option>)}</optgroup>
                </select>
                <select value={chartPeriod} onChange={(e) => setChartPeriod(e.target.value)}>
                  <option value="1mo">1個月</option>
                  <option value="3mo">3個月</option>
                  <option value="6mo">6個月</option>
                  <option value="1y">1年</option>
                </select>
                <div className="indicator-buttons">
                  {Object.entries(indicators).map(([key, active]) => (
                    <button key={key} type="button" className={`strategy-btn ${active ? 'active' : ''}`} onClick={() => handleToggleIndicator(key)}>{key.toUpperCase()}</button>
                  ))}
                </div>
                <button type="button" className="btn btn-primary mini" onClick={handleLoadChart}>📈 載入圖表</button>
              </div>
              <div className="chart-badge">{SYMBOLS[chartSym]?.name} ({dispSym(chartSym)})</div>
              <div className="chart-wrap chart-h300"><canvas ref={priceChartRef} /></div>
              {(indicators.rsi || indicators.macd) && <div className="chart-wrap chart-h160"><canvas ref={subChartRef} /></div>}
            </div>
          </section>
        )}

        {activeTab === 'order' && (
          <section className="page page-order active">
            <div className="order-banner order-open">{orderTimeText}</div>
            <div className="card">
              <div className="card-title"><span className="dot dot-blue" />📄 投資計劃書（每次下單必填）</div>
              <div className="form-grid">
                <label className="form-group"><span>交易員姓名</span><input value={orderForm.trader} onChange={(e) => setOrderForm((prev) => ({ ...prev, trader: e.target.value }))} placeholder="輸入姓名" /></label>
                <label className="form-group"><span>組別</span><select value={orderForm.team} onChange={(e) => setOrderForm((prev) => ({ ...prev, team: e.target.value }))}><option value="stock">📈 股票組</option><option value="etf">📦 ETF 組</option></select></label>
                <label className="form-group"><span>角色</span><select value={orderForm.role} onChange={(e) => setOrderForm((prev) => ({ ...prev, role: e.target.value }))}><option value="trader">交易員 Trader</option><option value="front">前台 Front Office</option><option value="mid">中台 Middle Office</option><option value="back">後台 Back Office</option></select></label>
                <label className="form-group"><span>模擬天次</span><input value={`第 ${state.day} 天`} readOnly /></label>
                <label className="form-group form-full"><span>一、市場分析與投資理由</span><textarea value={orderForm.analysis} onChange={(e) => setOrderForm((prev) => ({ ...prev, analysis: e.target.value }))} placeholder="市場趨勢、技術/基本面分析、選擇此標的的理由..." /></label>
                <label className="form-group form-full"><span>二、交易策略與目標</span><textarea value={orderForm.strategy} onChange={(e) => setOrderForm((prev) => ({ ...prev, strategy: e.target.value }))} placeholder="進場策略、目標報酬率、預計持有天數、停損點..." /></label>
                <label className="form-group form-full"><span>三、風險評估</span><textarea value={orderForm.risk} onChange={(e) => setOrderForm((prev) => ({ ...prev, risk: e.target.value }))} placeholder="主要風險因素、集中度影響、組合影響..." /></label>
              </div>
            </div>
            <div className="card">
              <div className="card-title"><span className="dot dot-green" />📋 下單資訊</div>
              <div className="form-grid">
                <label className="form-group"><span>商品代號</span><select value={orderForm.symbol} onChange={(e) => setOrderForm((prev) => ({ ...prev, symbol: e.target.value }))}>{symbolOptions().map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select></label>
                <label className="form-group"><span>買 / 賣</span><select value={orderForm.side} onChange={(e) => setOrderForm((prev) => ({ ...prev, side: e.target.value }))}><option value="buy">買進</option><option value="sell">賣出</option></select></label>
                <label className="form-group"><span>張數（1張=1000股）</span><input type="number" min="1" value={orderForm.lots} onChange={(e) => setOrderForm((prev) => ({ ...prev, lots: Number(e.target.value) }))} /></label>
                <label className="form-group"><span>參考價（自動抓取）</span><input readOnly value={`$${priceCache[orderForm.symbol]?.price ?? SYMBOLS[orderForm.symbol]?.refPrice}`} /></label>
                <label className="form-group form-full"><span>預計交易金額（以最新參考價試算）</span><div className="amount-prev">{updateOrderPreview()}</div></label>
              </div>
              <div className="order-note">參考價：<strong>{`$${priceCache[orderForm.symbol]?.price ?? SYMBOLS[orderForm.symbol]?.refPrice}`}</strong>（僅供試算，正式成交以13:31收盤價為準）</div>
              <div className="btn-row"><button type="button" className="btn btn-primary" onClick={handleSubmitOrder}>📤 提交下單</button><button type="button" className="btn btn-red" onClick={handleCancelOrder}>❌ 撤銷上筆</button><button type="button" className="btn btn-outline" onClick={() => {
                setOrderForm((prev) => ({
                  ...prev,
                  analysis: `${SYMBOLS[prev.symbol]?.name}近期${prev.side === 'buy' ? '技術面支撐強勁，MA5站上MA20，RSI尚未超買，外資持續買超，動能偏多' : '技術面出現超買訊號，建議適度獲利了結'}。`,
                  strategy: `${prev.side === 'buy' ? '分批建倉：設目標報酬 +10%，個別停損 -5%（相對成本）' : '獲利了結：資金調度至防守型標的，降低組合波動率'}。`,
                  risk: `主要風險：${SYMBOLS[prev.symbol]?.leverage ? '槓桿ETF每日重設時間損耗；' : ''}市場系統性風險、消息面衝擊、外資進出影響。`,
                }))
                setFeedback('✨ AI 輔助填寫已完成，請核對後提交')
              }}>✨ AI 輔助填寫</button><button type="button" className="btn btn-blue" onClick={() => fetchRefPrice(orderForm.symbol)}>🔄 取得參考價</button></div>
              <div className="feedback">{feedback}</div>
            </div>
          </section>
        )}

        {activeTab === 'holdings' && (
          <section className="page page-holdings active">
            <div className="card"><div className="card-title"><span className="dot dot-blue" />📈 股票組持倉</div>{updateHoldingsDisplay(state.stockHoldings)}</div>
            <div className="card"><div className="card-title"><span className="dot dot-green" />📦 ETF 組持倉</div>{updateHoldingsDisplay(state.etfHoldings)}</div>
            <div className="card"><div className="card-title"><span className="dot dot-gold" />中、後台建置紀錄</div><div className="table-wrap"><table><thead><tr><th>日</th><th>組別</th><th>商品</th><th>方向</th><th>張數</th><th>成交價</th><th>金額</th><th>中台審核</th><th>後台結算</th></tr></thead><tbody>{state.orders.filter((order) => order.status === '已成交').length ? state.orders.filter((order) => order.status === '已成交').slice().reverse().map((order) => (
                <tr key={order.id}><td>第{order.day}天</td><td>{order.team === 'stock' ? '股票組' : 'ETF組'}</td><td><span className="ticker">{dispSym(order.symbol)}</span></td><td>{order.side === 'buy' ? '買進' : '賣出'}</td><td>{order.lots}張</td><td>${order.price?.toFixed(1)}</td><td>{formatMoney(order.amount)}</td><td>✅</td><td>✅</td></tr>
              )) : <tr><td colSpan="9" className="empty-note">尚無已結算紀錄</td></tr>}</tbody></table></div></div>
          </section>
        )}

        {activeTab === 'roles' && (
          <section className="page page-roles active">
            <div className="roles-grid">
              {[
                { badge: 'TRADER', title: '交易員', color: 'rb-trader', duties: ['09:00–13:30 公告買賣', '每次必附投資計劃書', '收盤前可加單 / 取消', '收盤後不可撤回', '策略研究與進出場判斷', '每日撰寫市場觀察日誌'] },
                { badge: 'FRONT OFFICE', title: '前台分析師', color: 'rb-front', duties: ['市場研究與標的分析', '協助撰寫投資計劃書', '每日市場資訊摘要', 'ETF / 個股基本面比較', '建立候選標的清單', '設定目標報酬與停損'] },
                { badge: 'MIDDLE OFFICE', title: '中台 風控', color: 'rb-mid', duties: ['即時監控組合風險', '審核每筆訂單合規', '監控集中度上限', '損失 10% 預警', 'Game Over 判定', '每日風控報告彙整'] },
                { badge: 'BACK OFFICE', title: '後台 結算', color: 'rb-back', duties: ['建置買/賣張數紀錄', '收盤價確認成交', '資金庫存管理與對帳', '每日績效計算報告', '交易日誌存檔', '期末績效彙整'] },
              ].map((item) => (
                <div key={item.title} className={`role-card ${item.color}`}>
                  <div className="role-badge">{item.badge}</div>
                  <div className="role-title">{item.title}</div>
                  <div className="role-duties">{item.duties.map((line) => <div key={line}>{line}</div>)}</div>
                </div>
              ))}
            </div>
            <div className="card"><div className="card-title"><span className="dot dot-blue" />交易流程</div><div className="flow-text">① 前台分析市場 → 提供投資建議清單<br />② 交易員撰寫投資計劃書 → 提交給中台審核<br />③ 中台風控審核集中度、停損 → 核准或退回<br />④ 交易員於群組公告：「買進 XX N 張」<br />⑤ 每日 13:31 系統自動以收盤價確認成交<br />⑥ 後台更新持倉紀錄與資金庫存<br />⑦ 收盤後 → 後台產出當日績效報告</div></div>
          </section>
        )}

        {activeTab === 'report' && (
          <section className="page page-report active">
            <div className="sub-tabs">
              {['daily', 'performance', 'behavior', 'backtest'].map((id) => (
                <button key={id} type="button" className={`sub-tab ${subTab === id ? 'active' : ''}`} onClick={() => setSubTab(id)}>{id === 'daily' ? '📋 每日績效' : id === 'performance' ? '🎯 績效分析' : id === 'behavior' ? '🧠 行為分析' : '⚙️ 回測系統'}</button>
              ))}
            </div>
            {subTab === 'daily' && (
              <>
                <div className="report-2col">
                  <div className="metric-card-wrap"><div className="metric-card"><div className="metric-label">投資市值（即時）</div><div className="metric-val">{formatMoney(calculateStats(state.stockHoldings).totalValue)}</div></div><div className="metric-card"><div className="metric-label">未實現損益</div><div className="metric-val">{formatMoney(calculateStats(state.stockHoldings).totalValue - calculateStats(state.stockHoldings).totalCost)}</div></div><div className="metric-card"><div className="metric-label">累積報酬率</div><div className="metric-val">{stockPct >= 0 ? '+' : ''}{stockPct.toFixed(2)}%</div></div></div>
                  <div className="metric-card-wrap"><div className="metric-card"><div className="metric-label">投資市值（即時）</div><div className="metric-val">{formatMoney(calculateStats(state.etfHoldings).totalValue)}</div></div><div className="metric-card"><div className="metric-label">未實現損益</div><div className="metric-val">{formatMoney(calculateStats(state.etfHoldings).totalValue - calculateStats(state.etfHoldings).totalCost)}</div></div><div className="metric-card"><div className="metric-label">累積報酬率</div><div className="metric-val">{etfPct >= 0 ? '+' : ''}{etfPct.toFixed(2)}%</div></div></div>
                </div>
                <div className="card"><div className="card-title"><span className="dot dot-gold" />每日績效日誌</div><div className="table-wrap"><table><thead><tr><th>天</th><th>股票組資產</th><th>股票組%</th><th>ETF組資產</th><th>ETF組%</th><th>當日領先</th><th>備註</th></tr></thead><tbody>{dailyLogBody}</tbody></table></div></div>
                <div className="card"><div className="card-title"><span className="dot dot-purple" />結論建議</div><textarea value={reportConclusion} onChange={(e) => setReportConclusion(e.target.value)} placeholder="30天後填寫：哪組績效較佳？ETF vs 個股風險差異？對青年投資人的建議..." className="report-textarea" /></div>
                <button type="button" className="btn btn-primary" onClick={handleExportReport}>📥 匯出完整報告</button>
              </>
            )}
            {subTab === 'performance' && (
              <>
                <div className="report-2col">
                  <div className="metric-card-wrap"><div className="metric-card"><div className="metric-label">累積報酬率</div><div className="metric-val">{stockPct >= 0 ? '+' : ''}{stockPct.toFixed(2)}%</div></div><div className="metric-card"><div className="metric-label">年化報酬率（估）</div><div className="metric-val">{stockPct.toFixed(2)}%</div></div><div className="metric-card"><div className="metric-label">Sharpe Ratio</div><div className="metric-val">--</div></div><div className="metric-card"><div className="metric-label">最大回撤 (MDD)</div><div className="metric-val">--</div></div><div className="metric-card"><div className="metric-label">波動率</div><div className="metric-val">--</div></div><div className="metric-card"><div className="metric-label">勝率（日）</div><div className="metric-val">--</div></div></div>
                  <div className="metric-card-wrap"><div className="metric-card"><div className="metric-label">累積報酬率</div><div className="metric-val">{etfPct >= 0 ? '+' : ''}{etfPct.toFixed(2)}%</div></div><div className="metric-card"><div className="metric-label">年化報酬率（估）</div><div className="metric-val">{etfPct.toFixed(2)}%</div></div><div className="metric-card"><div className="metric-label">Sharpe Ratio</div><div className="metric-val">--</div></div><div className="metric-card"><div className="metric-label">最大回撤 (MDD)</div><div className="metric-val">--</div></div><div className="metric-card"><div className="metric-label">波動率</div><div className="metric-val">--</div></div><div className="metric-card"><div className="metric-label">勝率（日）</div><div className="metric-val">--</div></div></div>
                <div className="card"><div className="card-title"><span className="dot dot-blue" />資產走勢曲線（Equity Curve）</div><div className="chart-wrap chart-h300"><canvas ref={equityChartRef} /></div></div>
                <div className="card"><div className="card-title"><span className="dot dot-green" />每日報酬率分布</div><div className="chart-wrap chart-h200"><canvas ref={returnDistChartRef} /></div></div>
              </div>
              </>
            )}
            {subTab === 'behavior' && (
              <>
                <div className="report-2col">
                  <div className="card"><div className="card-title"><span className="dot dot-blue" />📈 股票組 行為分析</div>{behaviorCards('stock')}</div>
                  <div className="card"><div className="card-title"><span className="dot dot-green" />📦 ETF 組 行為分析</div>{behaviorCards('etf')}</div>
                </div>
                <div className="card"><div className="card-title"><span className="dot dot-purple" />行為金融學對比</div><div className="table-wrap"><table><thead><tr><th>行為偏差</th><th>股票組</th><th>ETF組</th><th>理論解釋</th></tr></thead><tbody>{behaviorCompareRows.map((row) => (
                  <tr key={row[0]}><td>{row[0]}</td><td>{row[1]}</td><td>{row[2]}</td><td>{row[3]}</td></tr>
                ))}</tbody></table></div></div>
                <div className="card"><div className="card-title"><span className="dot dot-gold" />AI 行為洞察建議</div><div className="beh-insights">{behaviorInsight.split('\n').map((line, idx) => <p key={idx}>{line}</p>)}</div></div>
              </>
            )}
            {subTab === 'backtest' && (
              <>
                <div className="card"><div className="card-title"><span className="dot dot-gold" />策略設定</div><div className="form-grid"><label className="form-group"><span>回測標的</span><select value={orderForm.symbol} onChange={(e) => setOrderForm((prev) => ({ ...prev, symbol: e.target.value }))}>{Object.entries(SYMBOLS).map(([key, info]) => <option key={key} value={key}>{key} {info.name}</option>)}</select></label><label className="form-group"><span>回測期間</span><select value={chartPeriod} onChange={(e) => setChartPeriod(e.target.value)}><option value="6mo">6個月</option><option value="1y">1年</option><option value="2y">2年</option></select></label></div><div className="strategy-btns">{STRATEGIES.map((item) => <button key={item.id} type="button" className={`strategy-btn ${activeStrategy === item.id ? 'active' : ''}`} onClick={() => handleSelectStrategy(item.id)}>{item.name}</button>)}</div><div className="btn-row"><button type="button" className="btn btn-primary" onClick={handleRunBacktest}>▶ 執行回測</button></div><div className="feedback">{bidFeedback}</div></div>
                {btActive && <div className="card"><div className="card-title"><span className="dot dot-green" />回測結果</div><div className="stat-grid">{performanceMetrics}</div><div className="chart-wrap chart-h300"><canvas ref={btChartRef} /></div></div>}
              </>
            )}
          </section>
        )}

        {activeTab === 'ai' && (
          <section className="page page-ai active">
            <div className="card"><div className="card-hd"><div className="card-title"><span className="dot dot-gold" />🤖 GPT Trader – AI 智能投資助理</div><div className="small-text">由 GPT Trader 模擬回答</div></div><div className="alert alert-info"><span className="alert-icon">💡</span><span>詢問市場分析、ETF比較、風險管理、停損策略、投資計劃書撰寫建議等。</span></div><div className="chat-wrap">{chatMessages.map((message) => <div key={message.id} className={`chat-msg chat-${message.role}`}>{message.text}</div>)}</div><div className="chat-input-row"><input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendChat()} placeholder="輸入問題，例如：0050 vs 0056 哪個適合新手？台積電怎麼看？" /><button type="button" className="btn btn-primary" onClick={handleSendChat}>送出</button></div><div className="quick-actions">{['分析目前兩組的績效差異，給我建議', 'ETF和個股投資優缺點比較', '槓桿ETF 00631L 的風險有哪些？', '如何設定停損點？有哪些常見策略？', '解釋 Sharpe Ratio 和 MDD 的意義'].map((label) => <button key={label} type="button" className="btn btn-outline mini" onClick={() => handleChatQuick(label)}>{label}</button>)}</div></div>
          </section>
        )}

        {activeTab === 'education' && (
          <section className="page page-education active"><div className="edu-intro"><div className="page-title">📚 金融教育系統</div><div className="page-subtitle">點擊任一主題卡片展開詳細說明</div></div><div className="edu-grid">{EDU_TOPICS.map((topic, idx) => <div key={topic.title} className="edu-card" onClick={() => setEducationExpanded(educationExpanded === idx ? null : idx)}><div className="edu-icon">{topic.icon}</div><div className="edu-title">{topic.title}</div><div className="edu-desc">{topic.desc}</div><div className={`edu-content ${educationExpanded === idx ? 'show' : ''}`}>{topic.content.split('\n').map((line, lineIdx) => <p key={lineIdx}>{line}</p>)}</div></div>)}</div></section>
        )}

        {activeTab === 'rules' && (
          <section className="page page-rules active"><div className="alert alert-danger"><span className="alert-icon">🚨</span><div><strong>Game Over：</strong>任一組損失達初始資金 <strong>15%（$30,000,000）</strong>，即時淘汰，模擬終止。</div></div><div className="alert alert-warn"><span className="alert-icon">⚡</span><div><strong>集中度限制：</strong>股票組單一個股 ≤ 總資金 <strong>20%</strong>；ETF組單一ETF ≤ 總資金 <strong>30%</strong>。</div></div><div className="alert alert-ok"><span className="alert-icon">🕐</span><div><strong>交易時間：</strong>每日 09:00–13:30 下單，13:31 自動以<strong>收盤價成交</strong>，收盤後不可撤回。</div></div><div className="card rules-card"><div className="rules-text"><strong>資金分配</strong><br />▸ 股票組：初始資金 2億元（$200,000,000）<br />▸ ETF 組：初始資金 2億元（$200,000,000）<br /><br /><strong>下單規定</strong><br />▸ 每次下單必附「投資計劃書」<br />▸ 單位：以「張」計算（1張 = 1,000股）<br />▸ 收盤前（13:30前）可取消或加單<br />▸ 收盤後（13:30後）訂單不可撤回<br />▸ 成交價格：每日 13:31 自動抓取當日 Yahoo Finance 收盤價<br /><br /><strong>風險控管</strong><br />▸ 個股集中度：股票組單一股票市值 ≤ 總資金 20%<br />▸ ETF 集中度：單一 ETF 市值 ≤ 總資金 30%<br />▸ 停損預警：損失達 10% 中台發出警告<br />▸ 強制停損：損失達 15% 即 Game Over<br /><br /><strong>績效計算</strong><br />▸ 每日以收盤價更新持倉市值<br />▸ 報酬率 = (期末總資產 - 初始資金) / 初始資金 × 100%<br />▸ 期末總資產 = 剩餘現金 + 所有持倉市值</div></div></section>
        )}
      </main>
    </div>
  )
}

export default App
