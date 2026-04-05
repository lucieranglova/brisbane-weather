/**
 * Brisbane Weather Forecast
 * Fetches today's forecast from Open-Meteo API (free, no API key needed)
 * and sends it to Discord every morning.
 * Sends a separate warning message if dangerous conditions are detected.
 */

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

// Brisbane coordinates
const LAT = -27.4698;
const LON = 153.0251;

const WEATHER_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
  `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,uv_index_max,weathercode` +
  `&timezone=Australia%2FBrisbane&forecast_days=1`;

// Warning thresholds — adjust these to your liking
const THRESHOLDS = {
  uvHigh:       1,    // UV index ≥ 8 → wear sunscreen warning
  uvExtreme:    2,   // UV index ≥ 11 → extreme UV warning
  windStrong:   1,   // Wind ≥ 60 km/h → strong wind warning
  tempHeat:     3,   // Max temp ≥ 35°C → heat warning
  rainStorm:    3,   // Rain chance ≥ 70% + storm code → storm warning
};

// WMO weather code → description + emoji
function describeWeather(code) {
  if (code === 0)  return { desc: "Clear sky",      emoji: "☀️"  };
  if (code <= 2)   return { desc: "Partly cloudy",  emoji: "⛅"  };
  if (code === 3)  return { desc: "Overcast",        emoji: "☁️"  };
  if (code <= 49)  return { desc: "Foggy",           emoji: "🌫️" };
  if (code <= 59)  return { desc: "Drizzle",         emoji: "🌦️" };
  if (code <= 69)  return { desc: "Rain",            emoji: "🌧️" };
  if (code <= 79)  return { desc: "Snow",            emoji: "❄️"  };
  if (code <= 84)  return { desc: "Rain showers",    emoji: "🌦️" };
  if (code <= 94)  return { desc: "Thunderstorm",    emoji: "⛈️"  };
  return                  { desc: "Stormy",          emoji: "🌩️" };
}

function uvDescription(uv) {
  if (uv <= 2)  return "Low";
  if (uv <= 5)  return "Moderate";
  if (uv <= 7)  return "High";
  if (uv <= 10) return "Very High";
  return "Extreme";
}

// Build list of warnings based on today's forecast
function getWarnings(weather) {
  const warnings = [];

  // UV warnings
  if (weather.uv >= THRESHOLDS.uvExtreme) {
    warnings.push({
      emoji: "☀️🔥",
      title: "EXTREME UV alert!",
      text: `UV index is hitting **${weather.uv}** today — that's off the charts! Slap on SPF 50+, wear a hat, sunglasses and a long sleeve. Seriously, don't skip this one! Stay in the shade between 10am–3pm if you can. 🧴🕶️🧢`,
    });
  } else if (weather.uv >= THRESHOLDS.uvHigh) {
    warnings.push({
      emoji: "😎☀️",
      title: "High UV today!",
      text: `UV index is **${weather.uv}** (${uvDescription(weather.uv)}) — lather up with sunscreen, grab your sunnies and don't forget your hat! Reapply SPF every 2 hours if you're outside. 🧴🕶️`,
    });
  }

  // Heat warning
  if (weather.tempMax >= THRESHOLDS.tempHeat) {
    warnings.push({
      emoji: "🥵🌡️",
      title: "Heat warning!",
      text: `It's going to be a scorcher — up to **${weather.tempMax}°C** today! Stay hydrated 💧, avoid being outside in the peak heat (11am–3pm) and check on elderly neighbours. Don't leave anyone or any pets in the car! 🐶`,
    });
  }

  // Storm warning
  if (weather.code >= 80 && weather.rainChance >= THRESHOLDS.rainStorm) {
    warnings.push({
      emoji: "⛈️🌪️",
      title: "Storm warning!",
      text: `Thunderstorms are likely today with **${weather.rainChance}%** chance of rain! Stay indoors during storms, avoid open areas and trees. Check the BOM radar before heading out. ⚡🌧️`,
    });
  }

  // Strong wind warning
  if (weather.wind >= THRESHOLDS.windStrong) {
    warnings.push({
      emoji: "💨🌬️",
      title: "Strong winds today!",
      text: `Winds up to **${weather.wind} km/h** expected — secure anything loose outside, be careful on the roads and watch out for fallen branches. Hold on to your hat! 🎩`,
    });
  }

  return warnings;
}

async function sendDiscordMessage(payload) {
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
}

async function sendForecast(weather) {
  const { desc, emoji } = describeWeather(weather.code);

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

  await sendDiscordMessage({
    embeds: [{
      title: `🌏 Good morning! Brisbane forecast for ${dateStr}`,
      description,
      color: 0x00BFFF,
      footer: { text: "Data: Open-Meteo.com • Brisbane, QLD, Australia" },
    }],
  });

  console.log("Forecast sent!");
}

async function sendWarnings(warnings) {
  if (warnings.length === 0) {
    console.log("No warnings today.");
    return;
  }

  const lines = warnings.map(w =>
    `${w.emoji} **${w.title}**\n${w.text}`
  ).join("\n\n");

  await sendDiscordMessage({
    embeds: [{
      title: `⚠️ Weather warnings for today`,
      description: lines,
      color: 0xFF4500,  // orange-red
      footer: { text: "Stay safe out there! 🦘" },
    }],
  });

  console.log(`${warnings.length} warning(s) sent!`);
}

async function fetchWeather() {
  const res = await fetch(WEATHER_URL);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const data = await res.json();
  const d = data.daily;
  return {
    date:       d.time[0],
    tempMax:    d.temperature_2m_max[0],
    tempMin:    d.temperature_2m_min[0],
    rainChance: d.precipitation_probability_max[0],
    wind:       d.windspeed_10m_max[0],
    uv:         d.uv_index_max[0],
    code:       d.weathercode[0],
  };
}

async function main() {
  console.log(`[${new Date().toISOString()}] Fetching Brisbane weather...`);

  if (!DISCORD_WEBHOOK) throw new Error("Missing DISCORD_WEBHOOK_URL");

  const weather = await fetchWeather();
  console.log(`Forecast: ${weather.tempMin}–${weather.tempMax}°C, rain ${weather.rainChance}%, UV ${weather.uv}, wind ${weather.wind} km/h, code ${weather.code}`);

  const warnings = getWarnings(weather);
  console.log(`Warnings detected: ${warnings.length}`, JSON.stringify(warnings));

  // Send daily forecast
  await sendForecast(weather);

  // Send warnings only if needed
  await sendWarnings(warnings);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
