/* ═══════════════════════════════════════════════════
   EHV OPS HUB — Weather (Open-Meteo API)
   Free, no API key required.
   ═══════════════════════════════════════════════════ */

const Weather = (() => {
  const CACHE_KEY = 'weather_cache';
  const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  async function fetch_weather() {
    const settings = DataService.getSettings();
    const lat = settings.lat || -34.9285;
    const lng = settings.lng || 138.6007;

    // Check cache
    const cached = _getCache();
    if (cached) return cached;

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,uv_index` +
        `&daily=sunrise,sunset,precipitation_probability_max&timezone=auto&forecast_days=1`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Weather API: ${res.status}`);
      const data = await res.json();

      const weather = {
        temp: Math.round(data.current.temperature_2m),
        feelsLike: Math.round(data.current.apparent_temperature),
        condition: _weatherCodeToText(data.current.weather_code),
        conditionIcon: _weatherCodeToIcon(data.current.weather_code),
        wind: Math.round(data.current.wind_speed_10m),
        uvIndex: data.current.uv_index,
        uvLevel: _uvLevel(data.current.uv_index),
        sunrise: data.daily.sunrise[0].split('T')[1].slice(0, 5),
        sunset: data.daily.sunset[0].split('T')[1].slice(0, 5),
        rainProb: data.daily.precipitation_probability_max[0] || 0,
        fetchedAt: Date.now()
      };

      _setCache(weather);
      return weather;
    } catch (e) {
      console.warn('Weather fetch failed:', e);
      return _getCache() || _fallback();
    }
  }

  function _getCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() - data.fetchedAt > CACHE_TTL) return null;
      return data;
    } catch { return null; }
  }

  function _setCache(data) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  }

  function _fallback() {
    return {
      temp: '--', feelsLike: '--', condition: 'Unavailable',
      conditionIcon: '?', wind: '--', uvIndex: '--', uvLevel: '--',
      sunrise: '--:--', sunset: '--:--', rainProb: '--', fetchedAt: 0
    };
  }

  function _weatherCodeToText(code) {
    const map = {
      0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Foggy', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle',
      55: 'Heavy drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
      71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 80: 'Rain showers',
      81: 'Moderate showers', 82: 'Heavy showers', 95: 'Thunderstorm',
      96: 'Thunderstorm + hail', 99: 'Severe thunderstorm'
    };
    return map[code] || 'Unknown';
  }

  function _weatherCodeToIcon(code) {
    if (code === 0 || code === 1) return '☀';
    if (code === 2) return '⛅';
    if (code === 3) return '☁';
    if (code >= 45 && code <= 48) return '🌫';
    if (code >= 51 && code <= 65) return '🌧';
    if (code >= 71 && code <= 75) return '❄';
    if (code >= 80 && code <= 82) return '🌦';
    if (code >= 95) return '⛈';
    return '🌡';
  }

  function _uvLevel(uv) {
    if (uv <= 2) return 'Low';
    if (uv <= 5) return 'Moderate';
    if (uv <= 7) return 'High';
    if (uv <= 10) return 'Very High';
    return 'Extreme';
  }

  function hasAdvisory(weather) {
    return weather.rainProb > 60 || weather.wind > 40 || weather.uvIndex > 8;
  }

  function getAdvisoryText(weather) {
    const reasons = [];
    if (weather.rainProb > 60) reasons.push(`${weather.rainProb}% rain probability`);
    if (weather.wind > 40) reasons.push(`${weather.wind} km/h winds`);
    if (weather.uvIndex > 8) reasons.push(`UV index ${weather.uvIndex} (${weather.uvLevel})`);
    return reasons.length
      ? 'Check site conditions before mobilising. ' + reasons.join(', ') + '.'
      : '';
  }

  function renderCard(weather) {
    if (!weather || weather.temp === '--') {
      return `<div class="card section-gap">
        <div class="card-header"><span class="card-label">Weather & Site Conditions</span></div>
        <div class="empty-state"><div class="empty-state-text">Weather data unavailable — check connection</div></div>
      </div>`;
    }

    const uvBadge = weather.uvIndex <= 2 ? 'badge-green' :
                    weather.uvIndex <= 7 ? 'badge-amber' : 'badge-red';
    const windBadge = weather.wind <= 25 ? 'badge-green' :
                      weather.wind <= 40 ? 'badge-amber' : 'badge-red';
    const advisory = hasAdvisory(weather)
      ? `<div class="weather-advisory">⚠ ${getAdvisoryText(weather)}</div>` : '';

    return `<div class="card section-gap">
      <div class="card-header">
        <span class="card-label">Weather & Site Conditions</span>
        <span style="font-size:11px;color:var(--muted-light)">${DataService.getSettings().location || 'Adelaide, SA'}</span>
      </div>
      <div class="weather-grid">
        <div class="weather-stat">
          <div class="weather-value">${weather.temp}°C</div>
          <div class="weather-label">Current</div>
        </div>
        <div class="weather-stat">
          <div class="weather-value">${weather.feelsLike}°C</div>
          <div class="weather-label">Feels like</div>
        </div>
        <div class="weather-stat">
          <div class="weather-value">${weather.conditionIcon}</div>
          <div class="weather-label">${weather.condition}</div>
        </div>
        <div class="weather-stat">
          <div class="weather-value">${weather.wind}<span style="font-size:12px"> km/h</span></div>
          <div class="weather-label">Wind <span class="badge ${windBadge}" style="margin-left:4px">${weather.wind <= 25 ? 'OK' : weather.wind <= 40 ? 'Mod' : 'High'}</span></div>
        </div>
        <div class="weather-stat">
          <div class="weather-value">${weather.uvIndex}</div>
          <div class="weather-label">UV <span class="badge ${uvBadge}" style="margin-left:4px">${weather.uvLevel}</span></div>
        </div>
        <div class="weather-stat">
          <div class="weather-value">${weather.rainProb}%</div>
          <div class="weather-label">Rain chance</div>
        </div>
        <div class="weather-stat">
          <div class="weather-value">${weather.sunrise}</div>
          <div class="weather-label">Sunrise</div>
        </div>
        <div class="weather-stat">
          <div class="weather-value">${weather.sunset}</div>
          <div class="weather-label">Sunset</div>
        </div>
      </div>
      ${advisory}
    </div>`;
  }

  return { fetch: fetch_weather, hasAdvisory, getAdvisoryText, renderCard };
})();
