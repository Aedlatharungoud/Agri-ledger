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

interface ModelStatus {
  status: string;
  model_type: string;
  ml_training_available: boolean;
  historical_records: number;
  minimum_records_required: number;
  message?: string;
  baseline?: {
    available: boolean;
    baseline_yield_kg_per_acre: number;
    records_used: number;
  };
}

interface PredictionResult {
  status: string;
  prediction_method: string;
  model_status: string;
  crop_name: string;
  season: string;
  irrigation_type: string;
  area_acres: number;
  predicted_yield_kg_per_acre: number;
  predicted_total_yield_kg: number;
  historical_records_used: number;
  confidence: string;
  message: string;
}

function formatNumber(value: number): string {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function YieldPrediction() {
  const [cropName, setCropName] = useState("Paddy");
  const [areaAcres, setAreaAcres] = useState("5.0");
  const [season, setSeason] = useState("KHARIF");
  const [irrigationType, setIrrigationType] = useState("BOREWELL");

  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadModelStatus();
  }, []);

  async function loadModelStatus() {
    setStatusLoading(true);
    try {
      const res = await api.get<ModelStatus>("/ai/yield-status");
      setModelStatus(res.data);
    } catch (err: any) {
      console.warn("Could not load yield model telemetry:", err);
    } finally {
      setStatusLoading(false);
    }
  }

  async function handlePrediction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPrediction(null);

    const area = Number(areaAcres);
    if (!cropName.trim()) {
      setError("Please specify a valid crop name.");
      return;
    }
    if (!area || area <= 0) {
      setError("Please enter a positive area in acres.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post<PredictionResult>("/ai/yield-prediction", {
        crop_name: cropName.trim(),
        area_acres: area,
        season,
        irrigation_type: irrigationType,
      });

      const data = response.data;
      if (data.status === "error") {
        throw new Error(data.message || "Yield prediction failed.");
      }

      setPrediction(data);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Unable to generate yield prediction.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <PageHeader
        title="🌾 Crop Yield Prediction"
        description="Forecast expected farm production and harvest volume using historical field records, agronomic acreage, and irrigation parameters."
        actions={
          <div style={{ display: "flex", gap: "10px" }}>
            <Button variant="secondary" onClick={loadModelStatus} disabled={statusLoading}>
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
      {modelStatus && (
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
            <span style={{ fontSize: "20px" }}>🤖</span>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#174D35" }}>
                Active Prediction Engine: {modelStatus.model_type === "historical_baseline" ? "Historical Agronomic Baseline" : "ML Regression"}
              </div>
              <div style={{ fontSize: "12px", color: "#718096" }}>
                {modelStatus.historical_records} historical database harvest records analyzed (threshold for active ML training: {modelStatus.minimum_records_required} records).
              </div>
            </div>
          </div>
          <div>
            <Badge variant={modelStatus.historical_records > 0 ? "success" : "neutral"}>
              {modelStatus.historical_records} Records Synced
            </Badge>
          </div>
        </div>
      )}

      {/* Main Form & Results Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* Input Parameters Card */}
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
                ⚙️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", color: "#174D35", fontWeight: 700 }}>
                  Cultivation Parameters
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#718096" }}>
                  Specify crop variety, parcel size, and irrigation method.
                </p>
              </div>
            </div>

            <form onSubmit={handlePrediction} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <FormField label="Crop Variety" required help="e.g. Paddy, Cotton, Chilli, Maize">
                <Input
                  type="text"
                  placeholder="e.g. Paddy"
                  value={cropName}
                  onChange={(e) => setCropName(e.target.value)}
                  disabled={loading}
                  required
                />
              </FormField>

              <FormField label="Cultivated Land Area (Acres)" required help="Total net cropped area in acres.">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 5.5"
                  value={areaAcres}
                  onChange={(e) => setAreaAcres(e.target.value)}
                  disabled={loading}
                  required
                />
              </FormField>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <FormField label="Crop Season" required>
                  <Select value={season} onChange={(e) => setSeason(e.target.value)} disabled={loading}>
                    <option value="KHARIF">KHARIF (Monsoon)</option>
                    <option value="RABI">RABI (Winter)</option>
                    <option value="ZAID">ZAID (Summer)</option>
                    <option value="SUMMER">SUMMER</option>
                  </Select>
                </FormField>

                <FormField label="Irrigation System" required>
                  <Select
                    value={irrigationType}
                    onChange={(e) => setIrrigationType(e.target.value)}
                    disabled={loading}
                  >
                    <option value="BOREWELL">Borewell</option>
                    <option value="CANAL">Canal</option>
                    <option value="RAINFED">Rainfed</option>
                    <option value="DRIP">Drip Irrigation</option>
                    <option value="SPRINKLER">Sprinkler</option>
                  </Select>
                </FormField>
              </div>

              <div style={{ marginTop: "10px" }}>
                <Button variant="primary" type="submit" disabled={loading} style={{ width: "100%", height: "46px" }}>
                  {loading ? "Calculating Yield Forecast..." : "🌾 Generate Yield Prediction"}
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
                title="Awaiting Calculation"
                description="Submit cultivation parameters on the left to compute projected crop yield metrics and production volumes."
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
                      Yield Forecast Result
                    </span>
                    <h3 style={{ margin: "2px 0 0", fontSize: "20px", color: "#174D35", fontWeight: 800 }}>
                      {prediction.crop_name}
                    </h3>
                    <div style={{ fontSize: "12px", color: "#718096", marginTop: "2px" }}>
                      {prediction.season} • {prediction.irrigation_type} • {prediction.area_acres} Acres
                    </div>
                  </div>
                  <div>
                    <Badge variant={prediction.confidence === "HIGH" ? "success" : "neutral"}>
                      {prediction.confidence} Confidence
                    </Badge>
                  </div>
                </div>

                {/* Primary Metric Displays */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "14px",
                  }}
                >
                  <div
                    style={{
                      background: "#EBF5EE",
                      border: "1px solid #BCE3C5",
                      borderRadius: "10px",
                      padding: "16px",
                    }}
                  >
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#2F855A" }}>
                      Total Expected Production
                    </span>
                    <div style={{ fontSize: "24px", fontWeight: 800, color: "#174D35", marginTop: "4px" }}>
                      {formatNumber(prediction.predicted_total_yield_kg)} KG
                    </div>
                    <span style={{ fontSize: "11px", color: "#166534" }}>
                      Estimated gross farm harvest
                    </span>
                  </div>

                  <div
                    style={{
                      background: "#F7FAFC",
                      border: "1px solid #E2E8F0",
                      borderRadius: "10px",
                      padding: "16px",
                    }}
                  >
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#4A5568" }}>
                      Productivity Rate
                    </span>
                    <div style={{ fontSize: "24px", fontWeight: 800, color: "#18251E", marginTop: "4px" }}>
                      {formatNumber(prediction.predicted_yield_kg_per_acre)}
                    </div>
                    <span style={{ fontSize: "11px", color: "#718096" }}>
                      KG per acre yield rate
                    </span>
                  </div>
                </div>

                {/* Explanatory Note */}
                <div
                  style={{
                    background: "#F8FAF8",
                    border: "1px solid #E8ECE9",
                    padding: "14px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    color: "#4A5568",
                    lineHeight: "1.5",
                  }}
                >
                  {prediction.message}
                </div>

                {/* Calculation Methodology Breakdown */}
                <div style={{ fontSize: "12px", color: "#718096" }}>
                  <strong>Prediction Method:</strong> {prediction.prediction_method} •{" "}
                  <strong>Records Used:</strong> {prediction.historical_records_used} verified entries.
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}