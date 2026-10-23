import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export const WeatherMarketsScreen: React.FC = () => {
  const [city, setCity] = useState('Hyderabad');
  const [weather, setWeather] = useState<any>(null);
  const [symbol, setSymbol] = useState('RELIANCE.NS');
  const [stockQuote, setStockQuote] = useState<any>(null);
  const [watchlist, setWatchlist] = useState<any[]>([]);

  useEffect(() => {
    fetchWeather(city);
    fetchStock(symbol);
    api.getWatchlist().then(setWatchlist);
  }, []);

  const fetchWeather = async (targetCity: string) => {
    try {
      const res = await api.getWeather(targetCity);
      setWeather(res);
    } catch (e) {
      console.warn('Weather fetch error:', e);
    }
  };

  const fetchStock = async (sym: string) => {
    try {
      const res = await api.getStock(sym);
      setStockQuote(res);
    } catch (e) {
      console.warn('Stock fetch error:', e);
    }
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ fontSize: '1.2rem', color: 'var(--neon-cyan)', margin: 0 }}>
          WEATHER, STOCKS & LIVE FINANCIAL RADAR
        </h2>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
          Real-time global weather via Open-Meteo and market feeds via Yahoo Finance
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Weather Matrix */}
        <div className="holo-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 700 }}>
              GLOBAL WEATHER OBSERVATION
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--neon-green)' }}>LIVE DATA</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City (e.g. Hyderabad, Mumbai, London)"
              style={{ flex: 1, background: 'rgba(5, 7, 12, 0.9)', border: '1px solid var(--border-subtle)', color: '#fff', padding: '8px 12px', borderRadius: '6px' }}
            />
            <button className="cyber-btn" onClick={() => fetchWeather(city)}>UPDATE</button>
          </div>

          {weather && weather.success ? (
            <div style={{ background: 'rgba(5, 7, 12, 0.6)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ fontSize: '2.4rem', fontWeight: 800, color: '#fff' }}>
                {weather.temperatureC}°C
              </div>
              <div style={{ color: 'var(--neon-cyan)', fontSize: '1rem', fontWeight: 600 }}>
                {weather.condition}
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '4px' }}>
                Location: {weather.location} • Apparent: {weather.apparentTempC}°C
              </div>
              <div style={{ display: 'flex', gap: '20px', marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span>Humidity: {weather.humidityPercent}%</span>
                <span>Wind: {weather.windSpeedKmh} km/h</span>
                <span>Precipitation: {weather.precipitationMm} mm</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '10px' }} className="mono-font">
                Provider: {weather.provider} • Timestamp: {weather.observationTime}
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)' }}>Loading weather metrics...</div>
          )}
        </div>

        {/* Stock Market Feeds */}
        <div className="holo-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 700 }}>
              MARKET QUOTE RADAR
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }} className="mono-font">DELAYED 15M</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="Symbol (e.g. RELIANCE.NS, NVDA, AAPL)"
              style={{ flex: 1, background: 'rgba(5, 7, 12, 0.9)', border: '1px solid var(--border-subtle)', color: '#fff', padding: '8px 12px', borderRadius: '6px' }}
            />
            <button className="cyber-btn" onClick={() => fetchStock(symbol)}>QUOTE</button>
          </div>

          {stockQuote && stockQuote.success ? (
            <div style={{ background: 'rgba(5, 7, 12, 0.6)', padding: '16px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>
                    {stockQuote.currentPrice} {stockQuote.currency}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {stockQuote.companyName} ({stockQuote.symbol})
                  </div>
                </div>
                <div style={{
                  color: stockQuote.change >= 0 ? 'var(--neon-green)' : 'var(--neon-red)',
                  fontSize: '1rem',
                  fontWeight: 700
                }}>
                  {stockQuote.change >= 0 ? '+' : ''}{stockQuote.change} ({stockQuote.changePercent}%)
                </div>
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '12px' }} className="mono-font">
                Exchange: {stockQuote.exchange} • Provider: {stockQuote.provider} • Timestamp: {stockQuote.timestamp}
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)' }}>Querying stock market quote...</div>
          )}

          {/* Quick Watchlist Buttons */}
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '6px' }}>WATCHED SYMBOLS</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {watchlist.map((w) => (
                <button
                  key={w.id}
                  onClick={() => {
                    setSymbol(w.symbol);
                    fetchStock(w.symbol);
                  }}
                  className="cyber-btn"
                  style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                >
                  {w.symbol}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
