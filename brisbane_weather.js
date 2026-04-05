/**
 * Brisbane Weather Forecast
 * Fetches today's forecast from Open-Meteo API (free, no API key needed)
 * and sends it to Discord every morning.
 */

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

// Brisbane coordinates
const LAT = -27.4698;
const LON = 153.0251;

const WEATHER_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
  `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,uv_index_max,weathercode` +
  `&timezone=Australia%2FBrisbane&forecast_days=1`;

// WMO weather code → description + emoji
function describeWeather(code) {
  if (code === 0)                    return { desc: "Clear sky",            emoji: "☀️"  };
  if (code <= 2)                     return { desc: "Partly cloudy",        emoji: "⛅"  };
  if (code === 3)                    return { desc: "Overcast",             emoji: "☁️"  };
  if (code <= 49)                    return { desc: "Foggy",                emoji: "🌫️" };
  if (code <= 59)                    return { desc: "Drizzle",              emoji: "🌦️" };
  if (code <= 69)                    return { desc: "Rain",                 emoji: "🌧️" };
  if (code <= 79)                    return { desc: "Snow",                 emoji: "❄️"  };
  if (code <= 84)                    return { desc: "Rain showers",         emoji: "🌦️" };
  if (code <= 94)                    return { desc: "Thunderstorm",         emoji: "⛈️"  };
  return                                    { desc: "Stormy",               emoji: "🌩️" };
}

function uvDescription(uv) {
  if (uv <= 2)  return "Low";
  if (uv <= 5)  return "Moderate";
  if (uv <= 7)  return "High";
  if (uv <= 10) return "Very High";
  return "Extreme";
}

async function fetchWeather() {
  const res = await fetch(WEATHER_URL);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const data = await res.json();
  const d = data.daily;
  return {
    date:      d.time[0],
    tempMax:   d.temperature_2m_max[0],
    tempMin:   d.temperature_2m_min[0],
    rainChance: d.precipitation_probability_max[0],
    wind:      d.windspeed_10m_max[0],
    uv:        d.uv_index_max[0],
    code:      d.weathercode[0],
  };
}

async function sendDiscord(weather) {
  const { desc, emoji } = describeWeather(weather.code);

  // Format date nicely: "2026-04-06" → "Monday, April 6 2026"
  const dateObj = new Date(weather.date + "T00:00:00");
  const dateStr = dateObj.toLocaleDateString("en-AU", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const description = [
    `${emoji} **${desc}**`,
    ``,
    `🌡️ **Temperature:** ${weather.tempMin}°C – ${weather.tempMax}°C`,
    `🌧️ **Rain chance:** ${weather.rainChance}%`,
    `💨 **Wind:** ${weather.wind} km/h`,
    `☀️ **UV index:** ${weather.uv} (${uvDescription(weather.uv)})`,
  ].join("\n");

  const payload = {
    embeds: [{
      title: `🌏 Good morning! Brisbane forecast for ${dateStr}`,
      description,
      color: 0x00BFFF,  // sky blue
      footer: { text: "Data: Open-Meteo.com • Brisbane, QLD, Australia" },
    }],
  };

  const res = await fetch(DISCORD_WEBHOOK, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "DiscordBot (https://github.com, 1.0)",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord error ${res.status}: ${text}`);
  }

  console.log("Discord message sent!");
}

async function main() {
  console.log(`[${new Date().toISOString()}] Fetching Brisbane weather...`);

  if (!DISCORD_WEBHOOK) throw new Error("Missing DISCORD_WEBHOOK_URL");

  const weather = await fetchWeather();
  console.log(`Forecast: ${weather.tempMin}–${weather.tempMax}°C, rain ${weather.rainChance}%, UV ${weather.uv}`);

  await sendDiscord(weather);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
