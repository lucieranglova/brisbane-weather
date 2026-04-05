# brisbane-weather
# 🌏 Brisbane Weather Forecast

A GitHub Actions bot that sends a daily Brisbane weather forecast to Discord every morning at 5:00 AM Brisbane time.

## Example Discord message

> 🌏 **Good morning! Brisbane forecast for Monday, April 6 2026**
>
> ⛅ **Partly cloudy**
>
> 🌡️ **Temperature:** 18°C – 28°C
> 🌧️ **Rain chance:** 10%
> 💨 **Wind:** 15 km/h
> ☀️ **UV index:** 8 (Very High)
>
> *Data: Open-Meteo.com • Brisbane, QLD, Australia*

## How it works

```
GitHub Actions cron (19:00 UTC = 5:00 AM Brisbane time)
        ↓
brisbane_weather.js fetches forecast from Open-Meteo API
        ↓
Script sends formatted message to Discord
```

No API key needed — Open-Meteo is completely free and open.

## Repository structure

```
├── brisbane_weather.js          # Main script
└── .github/
    └── workflows/
        └── brisbane_weather.yml # GitHub Actions cron
```

## Setup

### 1. Create a Discord webhook
- Open Discord → channel settings ⚙️ → Integrations → Webhooks
- Click **New Webhook** → copy the URL

### 2. Add GitHub Secret
Go to **Settings → Secrets and variables → Actions → New repository secret**

| Secret name | Value |
|---|---|
| `DISCORD_WEBHOOK_URL` | Your Discord webhook URL |

### 3. Run manually to test
**Actions → Brisbane Weather Forecast → Run workflow**

## Schedule

Runs every day at **5:00 AM Brisbane time** (AEST = UTC+10, no daylight saving in Queensland).

Cron expression: `0 19 * * *` (19:00 UTC = 05:00 Brisbane)

## Tech stack

- **Runtime:** Node.js 20
- **Weather data:** [Open-Meteo](https://open-meteo.com) — free, no API key
- **CI/CD:** GitHub Actions — free for public repositories
