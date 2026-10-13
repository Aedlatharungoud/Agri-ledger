import { useEffect, useState, type FormEvent } from "react";
import api from "../services/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  FormField,
  Input,
  PageHeader,
  Select,
  Skeleton,
} from "../components/ui";

interface MarketPriceStatus {
  status: string;
  model_type: string;
  ml_training_available: boolean;
  historical_records: number;
  minimum_records_required: number;
  message?: string;
  baseline?: {
    available: boolean;
    baseline_price: number;
    records_used: number;
  };
}

interface PredictionResult {
  status: string;
  prediction_method: string;
  model_status: string;
  crop_name: string;
  market_name: string | null;
  unit: string;
  predicted_price_per_unit: number;
  historical_average_price: number;
  historical_min_price: number;
  historical_max_price: number;
  historical_records_used: number;
  confidence: string;
  message: string;
}

const FMT_INR = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });

export default function MarketPricePrediction() {
  const [cropName, setCropName] = useState("Paddy");
  const [marketName, setMarketName] = useState("Jadcherla Market");
  const [unit, setUnit] = useState("BAG");

  const [statusTelemetry, setStatusTelemetry] = useState<MarketPriceStatus | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setStatusLoading(true);
    try {
      const res = await api.get<MarketPriceStatus>("/ai/market-price/status");
      setStatusTelemetry(res.data);
    } catch (err: any) {
      console.warn("Could not load market price status:", err);
    } finally {
      setStatusLoading(false);
    }
  }

  async function handlePrediction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPrediction(null);

    if (!cropName.trim()) {
      setError("Please specify a crop name.");
      return;
    }
    if (!marketName.trim()) {
      setError("Please specify a mandi or agricultural market.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post<PredictionResult>("/ai/market-price/predict", {
        crop_name: cropName.trim(),
        market_name: marketName.trim(),
        unit,
      });

      const data = response.data;
      if (data.status === "error") {
        throw new Error(data.message || "Market price prediction failed.");
      }

      setPrediction(data);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Unable to generate market price forecast.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <PageHeader
        title="📈 Market Price Intelligence & Prediction"
        description="Forecast APMC mandi commodity rates and realization per independent unit using historical trading books, market trends, and seasonal price data."
        actions={
          <div style={{ display: "flex", gap: "10px" }}>
            <Button variant="secondary" onClick={loadStatus} disabled={statusLoading}>
              ↻ Refresh Telemetry
            </Button>
          </div>
        }
      />

      {error && (
        <Alert variant="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Model Telemetry Banner */}
      {statusTelemetry && (
        <div
          style={{
            background: "#F7FAFC",
            border: "1px solid #E2E8F0",
            borderRadius: "12px",
            padding: "14px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>🏪</span>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#174D35" }}>
                Active Valuation Model: {statusTelemetry.model_type === "historical_baseline" ? "Historical Mandi Baseline" : "ML Price Forecast"}
              </div>
              <div style={{ fontSize: "12px", color: "#718096" }}>
                {statusTelemetry.historical_records} historical market sales entries indexed (ML training threshold: {statusTelemetry.minimum_records_required} records).
              </div>
            </div>
          </div>
          <div>
            <Badge variant={statusTelemetry.historical_records > 0 ? "success" : "neutral"}>
              {statusTelemetry.historical_records} Market Records
            </Badge>
          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* Input Parameters Form Card */}
        <Card>
          <CardBody style={{ padding: "24px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                paddingBottom: "14px",
                borderBottom: "1px solid #E2E8F0",
                marginBottom: "18px",
              }}
            >
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "8px",
                  background: "#EBF5EE",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                }}
              >
                ⚖️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", color: "#174D35", fontWeight: 700 }}>
                  Market Forecast Query
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#718096" }}>
                  Select produce variety, target mandi, and independent unit.
                </p>
              </div>
            </div>

            <form onSubmit={handlePrediction} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <FormField label="Commodity / Crop" required help="e.g. Paddy, Cotton, Chilli">
                <Input
                  type="text"
                  placeholder="e.g. Paddy"
                  value={cropName}
                  onChange={(e) => setCropName(e.target.value)}
                  disabled={loading}
                  required
                />
              </FormField>

              <FormField label="Mandi / Market Name" required help="e.g. Suryapet APMC, Jadcherla Market">
                <Input
                  type="text"
                  placeholder="e.g. Jadcherla Market"
                  value={marketName}
                  onChange={(e) => setMarketName(e.target.value)}
                  disabled={loading}
                  required
                />
              </FormField>

              <FormField
                label="Independent Trade Unit"
                required
                help="Pricing is strictly preserved per independent unit without automatic conversion."
              >
                <Select value={unit} onChange={(e) => setUnit(e.target.value)} disabled={loading}>
                  <option value="BAG">BAG (Standard Market Bag)</option>
                  <option value="KG">KG (Kilograms)</option>
                  <option value="QUINTAL">QUINTAL (100 KG)</option>
                  <option value="TON">TON (1,000 KG)</option>
                </Select>
              </FormField>

              <div style={{ marginTop: "10px" }}>
                <Button variant="primary" type="submit" disabled={loading} style={{ width: "100%", height: "46px" }}>
                  {loading ? "Forecasting Mandi Price..." : `📈 Predict Rate per ${unit}`}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Prediction Results Card */}
        <Card>
          <CardBody style={{ padding: "24px" }}>
            {loading ? (
              <div style={{ padding: "20px 0" }}>
                <Skeleton height="32px" style={{ marginBottom: "16px" }} />
                <Skeleton height="70px" style={{ marginBottom: "16px" }} />
                <Skeleton height="120px" />
              </div>
            ) : !prediction ? (
              <EmptyState
                title="Awaiting Price Forecast"
                description="Select commodity parameters and click Predict Rate to calculate estimated price realizations and historical trading ranges."
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    paddingBottom: "14px",
                    borderBottom: "1px solid #E2E8F0",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#2F855A", textTransform: "uppercase" }}>
                      Estimated Mandi Rate
                    </span>
                    <h3 style={{ margin: "2px 0 0", fontSize: "20px", color: "#174D35", fontWeight: 800 }}>
                      {prediction.crop_name}
                    </h3>
                    <div style={{ fontSize: "12px", color: "#718096", marginTop: "2px" }}>
                      {prediction.market_name || "Regional APMC"} • Independent Unit: {prediction.unit}
                    </div>
                  </div>
                  <div>
                    <Badge variant={prediction.confidence === "HIGH" ? "success" : "neutral"}>
                      {prediction.confidence} Confidence
                    </Badge>
                  </div>
                </div>

                {/* Primary Price Prediction Display */}
                <div
                  style={{
                    background: "#EBF5EE",
                    border: "1px solid #BCE3C5",
                    borderRadius: "10px",
                    padding: "18px",
                  }}
                >
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "#2F855A" }}>
                    Expected Market Rate
                  </span>
                  <div style={{ fontSize: "28px", fontWeight: 800, color: "#174D35", marginTop: "4px" }}>
                    {FMT_INR(prediction.predicted_price_per_unit)}{" "}
                    <span style={{ fontSize: "16px", fontWeight: 600, color: "#2F855A" }}>
                      / {prediction.unit}
                    </span>
                  </div>
                  <span style={{ fontSize: "12px", color: "#166534", marginTop: "4px", display: "block" }}>
                    Independent unit rate — strictly preserved without conversion.
                  </span>
                </div>

                {/* Historical Trading Range Grid */}
                <div>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#4A5568", textTransform: "uppercase" }}>
                    Historical Transaction Range
                  </span>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: "10px",
                      marginTop: "8px",
                    }}
                  >
                    <div style={{ background: "#F7FAFC", padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                      <span style={{ fontSize: "11px", color: "#718096" }}>Lowest Observed</span>
                      <div style={{ fontWeight: 700, fontSize: "14px", color: "#18251E", marginTop: "2px" }}>
                        {FMT_INR(prediction.historical_min_price)}
                      </div>
                    </div>

                    <div style={{ background: "#F7FAFC", padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                      <span style={{ fontSize: "11px", color: "#718096" }}>Historical Avg</span>
                      <div style={{ fontWeight: 700, fontSize: "14px", color: "#174D35", marginTop: "2px" }}>
                        {FMT_INR(prediction.historical_average_price)}
                      </div>
                    </div>

                    <div style={{ background: "#F7FAFC", padding: "12px", borderRadius: "8px", border: "1px solid #E2E8F0" }}>
                      <span style={{ fontSize: "11px", color: "#718096" }}>Highest Observed</span>
                      <div style={{ fontWeight: 700, fontSize: "14px", color: "#18251E", marginTop: "2px" }}>
                        {FMT_INR(prediction.historical_max_price)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Explanatory Message */}
                <div
                  style={{
                    background: "#F8FAF8",
                    border: "1px solid #E8ECE9",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    color: "#4A5568",
                    lineHeight: "1.5",
                  }}
                >
                  {prediction.message}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}