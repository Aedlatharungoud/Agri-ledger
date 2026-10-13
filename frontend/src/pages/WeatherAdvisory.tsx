import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Input,
  PageHeader,
  Skeleton,
  StatCard,
} from "../components/ui";

interface LocationResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

interface WeatherResponse {
  current?: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    rain: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
  };
  daily_units?: {
    temperature_2m_max?: string;
    temperature_2m_min?: string;
    precipitation_sum?: string;
    wind_speed_10m_max?: string;
  };
  timezone?: string;
}

interface Advisory {
  level: "GOOD" | "CAUTION" | "WARNING";
  title: string;
  message: string;
  icon: string;
}

const DEFAULT_LOCATION = "Jadcherla";
const QUICK_HUBS = ["Jadcherla", "Suryapet", "Warangal", "Nizamabad", "Khammam"];

function getWeatherDescription(code: number): string {
  if (code === 0) return "Clear sky";
  if (code === 1 || code === 2 || code === 3) return "Partly cloudy";
  if (code === 45 || code === 48) return "Foggy";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code === 95 || code === 96 || code === 99) return "Thunderstorm";
  return "Mixed weather";
}

function getWeatherIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code === 1 || code === 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 85 && code <= 86) return "🌨️";
  if (code === 95 || code === 96 || code === 99) return "⛈️";
  return "🌥️";
}

function formatDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function getSprayAdvisory(weather: WeatherResponse): Advisory {
  const current = weather.current;
  const daily = weather.daily;

  if (!current || !daily) {
    return {
      level: "CAUTION",
      title: "Weather data incomplete",
      message: "Weather telemetry is incomplete. Recheck forecast before planning chemical applications.",
      icon: "⚠️",
    };
  }

  const rainProbability = daily.precipitation_probability_max?.[0] ?? 0;
  const precipitation = daily.precipitation_sum?.[0] ?? 0;
  const wind = current.wind_speed_10m ?? 0;
  const gust = current.wind_gusts_10m ?? 0;
  const temperature = current.temperature_2m ?? 0;

  if (rainProbability >= 70 || precipitation >= 5) {
    return {
      level: "WARNING",
      title: "Avoid Field Spraying — Imminent Rain Risk",
      message:
        "High precipitation probability detected. Rainfall washes away foliar agrochemicals, causes chemical runoff into water bodies, and wastes inputs.",
      icon: "🌧️",
    };
  }

  if (wind >= 25 || gust >= 40) {
    return {
      level: "WARNING",
      title: "Excessive Wind Speed — Chemical Drift Hazard",
      message:
        "Sustained wind exceeds 25 km/h. High winds cause severe droplet drift onto non-target crops and nearby water parcels.",
      icon: "💨",
    };
  }

  if (temperature >= 36) {
    return {
      level: "CAUTION",
      title: "High Ambient Heat — Risk of Evaporation",
      message:
        "Temperatures exceed 36°C. Agrochemicals may evaporate rapidly and cause crop phytotoxicity. Spraying in the early morning or evening is advised.",
      icon: "🌡️",
    };
  }

  if (rainProbability >= 40 || precipitation > 0) {
    return {
      level: "CAUTION",
      title: "Moderate Rain Probability — Monitor Radar",
      message:
        "Precipitation probability between 40-70%. If applying rain-fast systemic products, verify required drying time.",
      icon: "🌦️",
    };
  }

  return {
    level: "GOOD",
    title: "Conditions Favorable for Farm Fieldwork",
    message:
      "Wind and moisture levels are within optimal windows for routine foliar spraying, fertilizing, and mechanized field operations.",
    icon: "✅",
  };
}

export default function WeatherAdvisory() {
  const [locationQuery, setLocationQuery] = useState(DEFAULT_LOCATION);
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  async function searchLocation(query: string): Promise<LocationResult> {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      query
    )}&count=1&language=en&format=json`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Unable to search for location coordinates.");
    }

    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      throw new Error(`No geographic location found for "${query}". Try a major mandal or district.`);
    }

    return data.results[0];
  }

  async function fetchWeather(selectedLocation: LocationResult) {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${selectedLocation.latitude}` +
      `&longitude=${selectedLocation.longitude}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_gusts_10m` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max` +
      `&forecast_days=7` +
      `&timezone=auto`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Unable to fetch live meteorological forecast.");
    }

    const data = await response.json();
    setWeather(data);
    setLastUpdated(
      new Date().toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    );
  }

  async function loadWeather(query: string) {
    const cleaned = query.trim();
    if (!cleaned) {
      setError("Please enter a village, mandal, or town name.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const loc = await searchLocation(cleaned);
      setLocation(loc);
      await fetchWeather(loc);
    } catch (err: any) {
      console.error("Weather error:", err);
      setError(err.message || "Failed to retrieve weather advisory.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWeather(DEFAULT_LOCATION);
  }, []);

  const sprayAdvisory = useMemo(() => {
    if (!weather) return null;
    return getSprayAdvisory(weather);
  }, [weather]);

  const current = weather?.current;
  const daily = weather?.daily;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <PageHeader
        title="🌦️ Weather Advisory & Field Forecast"
        description="Hyperlocal agricultural meteorological intelligence powered by Open-Meteo. Real-time telemetry, 7-day agronomic forecasts, and foliar spraying advisories."
        actions={
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {lastUpdated && (
              <span style={{ fontSize: "12px", color: "#718096" }}>
                Updated: {lastUpdated}
              </span>
            )}
            <Button
              variant="secondary"
              onClick={() => location && loadWeather(location.name)}
              disabled={loading}
            >
              ↻ Refresh
            </Button>
          </div>
        }
      />

      {error && (
        <Alert variant="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Location Search Bar Card */}
      <Card>
        <CardBody style={{ padding: "18px 24px" }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadWeather(locationQuery);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: "240px" }}>
              <Input
                placeholder="Search village, mandal, or agricultural hub (e.g. Suryapet, Jadcherla)..."
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
              />
            </div>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? "Searching..." : "🔍 Check Weather"}
            </Button>
          </form>

          {/* Quick Hub Chips */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "12px",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 600, color: "#718096" }}>
              Quick Hubs:
            </span>
            {QUICK_HUBS.map((hub) => (
              <button
                key={hub}
                type="button"
                onClick={() => {
                  setLocationQuery(hub);
                  loadWeather(hub);
                }}
                style={{
                  background: location?.name.toLowerCase() === hub.toLowerCase() ? "#EBF5EE" : "#F7FAFC",
                  color: location?.name.toLowerCase() === hub.toLowerCase() ? "#174D35" : "#4A5568",
                  border: `1px solid ${location?.name.toLowerCase() === hub.toLowerCase() ? "#BCE3C5" : "#E2E8F0"
                    }`,
                  padding: "3px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                📍 {hub}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Loading Skeletons */}
      {loading && !weather && (
        <Card>
          <CardBody style={{ padding: "32px", textAlign: "center" }}>
            <Skeleton height="36px" style={{ width: "240px", margin: "0 auto 16px" }} />
            <Skeleton height="60px" style={{ marginBottom: "16px" }} />
            <Skeleton height="140px" />
          </CardBody>
        </Card>
      )}

      {weather && current && location && (
        <>
          {/* Current Conditions Metrics Row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
            }}
          >
            <StatCard
              label={`Current Temperature (${location.name})`}
              value={`${Math.round(current.temperature_2m)}°C`}
              subtitle={`Feels like ${Math.round(current.apparent_temperature)}°C • ${getWeatherDescription(
                current.weather_code
              )}`}
              badge={<Badge variant="info">{getWeatherIcon(current.weather_code)} Live</Badge>}
            />
            <StatCard
              label="Relative Humidity"
              value={`${Math.round(current.relative_humidity_2m)}%`}
              subtitle="Moisture content in ambient air"
            />
            <StatCard
              label="Precipitation"
              value={`${current.precipitation.toFixed(1)} mm`}
              subtitle="Rain intensity in last hour"
              badge={
                current.precipitation > 0 ? (
                  <Badge variant="warning">Rain Active</Badge>
                ) : (
                  <Badge variant="success">Dry Canopy</Badge>
                )
              }
            />
            <StatCard
              label="Wind Speed"
              value={`${Math.round(current.wind_speed_10m)} km/h`}
              subtitle={`Gusts up to ${Math.round(current.wind_gusts_10m)} km/h`}
              badge={
                current.wind_speed_10m >= 25 ? (
                  <Badge variant="warning">High Drift</Badge>
                ) : (
                  <Badge variant="neutral">Calm</Badge>
                )
              }
            />
          </div>

          {/* Agricultural Field Advisory Card */}
          {sprayAdvisory && (
            <div
              style={{
                background:
                  sprayAdvisory.level === "GOOD"
                    ? "#F0FDF4"
                    : sprayAdvisory.level === "WARNING"
                      ? "#FEF2F2"
                      : "#FFFBEB",
                border: `1px solid ${sprayAdvisory.level === "GOOD"
                  ? "#BBF7D0"
                  : sprayAdvisory.level === "WARNING"
                    ? "#FECACA"
                    : "#FDE68A"
                  }`,
                borderRadius: "14px",
                padding: "20px 24px",
                display: "flex",
                alignItems: "flex-start",
                gap: "18px",
              }}
            >
              <div style={{ fontSize: "36px" }}>{sprayAdvisory.icon}</div>
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color:
                        sprayAdvisory.level === "GOOD"
                          ? "#166534"
                          : sprayAdvisory.level === "WARNING"
                            ? "#991B1B"
                            : "#92400E",
                    }}
                  >
                    Agricultural Field Advisory
                  </span>
                  <Badge
                    variant={
                      sprayAdvisory.level === "GOOD"
                        ? "success"
                        : sprayAdvisory.level === "WARNING"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {sprayAdvisory.level}
                  </Badge>
                </div>
                <h3
                  style={{
                    margin: "0 0 6px",
                    fontSize: "17px",
                    fontWeight: 700,
                    color:
                      sprayAdvisory.level === "GOOD"
                        ? "#14532D"
                        : sprayAdvisory.level === "WARNING"
                          ? "#7F1D1D"
                          : "#78350F",
                  }}
                >
                  {sprayAdvisory.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color:
                      sprayAdvisory.level === "GOOD"
                        ? "#166534"
                        : sprayAdvisory.level === "WARNING"
                          ? "#991B1B"
                          : "#92400E",
                    lineHeight: "1.5",
                  }}
                >
                  {sprayAdvisory.message}
                </p>
              </div>
            </div>
          )}

          {/* 7-Day Agronomic Forecast Strip */}
          {daily && daily.time && (
            <Card>
              <CardBody style={{ padding: "24px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "18px",
                  }}
                >
                  <div>
                    <h3 style={{ margin: 0, fontSize: "17px", color: "#174D35", fontWeight: 700 }}>
                      7-Day Agricultural Forecast Outlook
                    </h3>
                    <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#718096" }}>
                      Max/min temperatures, precipitation sums, and rain risk probabilities.
                    </p>
                  </div>
                  <span style={{ fontSize: "12px", color: "#718096" }}>
                    Timezone: {weather.timezone || "Local"}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                    gap: "12px",
                  }}
                >
                  {daily.time.map((dayDate, index) => {
                    const code = daily.weather_code[index];
                    const tMax = Math.round(daily.temperature_2m_max[index]);
                    const tMin = Math.round(daily.temperature_2m_min[index]);
                    const rainProb = daily.precipitation_probability_max[index] ?? 0;
                    const rainSum = daily.precipitation_sum[index] ?? 0;

                    return (
                      <div
                        key={dayDate}
                        style={{
                          background: index === 0 ? "#EBF5EE" : "#F7FAFC",
                          border: `1px solid ${index === 0 ? "#BCE3C5" : "#E2E8F0"}`,
                          borderRadius: "12px",
                          padding: "14px 10px",
                          textAlign: "center",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            color: index === 0 ? "#174D35" : "#4A5568",
                          }}
                        >
                          {index === 0 ? "Today" : formatDate(dayDate)}
                        </span>

                        <div style={{ fontSize: "28px", margin: "2px 0" }}>
                          {getWeatherIcon(code)}
                        </div>

                        <span
                          style={{
                            fontSize: "11px",
                            color: "#718096",
                            minHeight: "28px",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {getWeatherDescription(code)}
                        </span>

                        <div
                          style={{
                            display: "flex",
                            gap: "6px",
                            alignItems: "baseline",
                            marginTop: "4px",
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: "14px", color: "#18251E" }}>
                            {tMax}°
                          </span>
                          <span style={{ fontSize: "12px", color: "#718096" }}>
                            {tMin}°
                          </span>
                        </div>

                        <div style={{ marginTop: "4px" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              color: rainProb > 50 ? "#B91C1C" : rainProb > 25 ? "#C05621" : "#166534",
                              background:
                                rainProb > 50 ? "#FEE2E2" : rainProb > 25 ? "#FFEDD5" : "#DCFCE7",
                              padding: "2px 6px",
                              borderRadius: "4px",
                            }}
                          >
                            💧 {rainProb}%
                          </span>
                        </div>

                        {rainSum > 0 && (
                          <span style={{ fontSize: "10px", color: "#0284C7" }}>
                            {rainSum.toFixed(1)} mm
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}