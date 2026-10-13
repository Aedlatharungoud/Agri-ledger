import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  Input,
  PageHeader,
  Skeleton,
  StatCard,
} from "../components/ui";

interface FinancialSummary {
  gross_sales: number;
  sales_deductions: number;
  net_sales: number;
  input_credit: number;
  labour_credit: number;
  transport_cost: number;
  interest: number;
  total_expenses: number;
  estimated_realization: number;
}

interface RiskAnalysis {
  risk_score: number;
  risk_level: string;
  financial_health: string;
  risk_reasons: string[];
}

interface Recommendation {
  priority: string;
  category: string;
  title: string;
  message: string;
}

interface Anomaly {
  transaction_type: string;
  record_id: number;
  farmer_id: number;
  amount?: number;
  quantity?: number;
  unit_price?: number;
  severity: string;
  reason: string;
  detection_method: string;
  requires_review: boolean;
}

interface Farmer {
  farmer_id: number;
  farmer_code: string;
  farmer_name: string;
  financial_summary: FinancialSummary;
  risk_analysis?: RiskAnalysis;
  recommendation_summary?: {
    recommendation_count: number;
    priority_action_count: number;
    priority_actions: string[];
  };
  recommendations?: Recommendation[];
  anomaly_count?: number;
  anomalies?: Anomaly[];
}

interface AIResponse {
  status: string;
  farmers: Farmer[];
}

interface AnomalyResponse {
  status: string;
  summary: {
    total_anomalies: number;
    farmers_analyzed: number;
    farmers_with_anomalies: number;
    review_required: boolean;
  };
  farmers: Farmer[];
}

const FMT_INR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function AIDashboard() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [anomalySummary, setAnomalySummary] = useState<AnomalyResponse["summary"] | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");

  useEffect(() => {
    loadAIData();
  }, []);

  async function loadAIData() {
    setLoading(true);
    setError("");

    try {
      const [finRes, riskRes, recRes, profRes, anomRes] = await Promise.all([
        api.get<AIResponse>("/ai/financial-insights"),
        api.get<AIResponse>("/ai/farmer-risk"),
        api.get<AIResponse>("/ai/recommendations"),
        api.get<AIResponse>("/ai/farmer-profile"),
        api.get<AnomalyResponse>("/ai/anomalies"),
      ]);

      const finData = finRes.data;
      const riskData = riskRes.data;
      const recData = recRes.data;
      const profData = profRes.data;
      const anomData = anomRes.data;

      setAnomalySummary(anomData.summary);

      const farmerMap = new Map<number, Farmer>();

      for (const f of finData.farmers || []) {
        farmerMap.set(f.farmer_id, { ...f });
      }

      for (const f of riskData.farmers || []) {
        const existing = farmerMap.get(f.farmer_id);
        if (existing) {
          existing.risk_analysis = f.risk_analysis;
        }
      }

      for (const f of recData.farmers || []) {
        const existing = farmerMap.get(f.farmer_id);
        if (existing) {
          existing.recommendations = f.recommendations;
          existing.recommendation_summary = f.recommendation_summary;
        }
      }

      for (const f of profData.farmers || []) {
        const existing = farmerMap.get(f.farmer_id);
        if (existing) {
          existing.financial_summary = f.financial_summary || existing.financial_summary;
        }
      }

      for (const f of anomData.farmers || []) {
        const existing = farmerMap.get(f.farmer_id);
        if (existing) {
          existing.anomaly_count = f.anomaly_count;
          existing.anomalies = f.anomalies;
        }
      }

      setFarmers(Array.from(farmerMap.values()));
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Unable to load consolidated AI dashboard telemetry.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const portfolioTotals = useMemo(() => {
    let totalGross = 0;
    let totalRealization = 0;
    let highRiskCount = 0;

    farmers.forEach((f) => {
      totalGross += Number(f.financial_summary?.gross_sales || 0);
      totalRealization += Number(f.financial_summary?.estimated_realization || 0);
      if (f.risk_analysis?.risk_level === "HIGH") {
        highRiskCount += 1;
      }
    });

    return { totalGross, totalRealization, highRiskCount };
  }, [farmers]);

  const filteredFarmers = useMemo(() => {
    return farmers.filter((f) => {
      const name = (f.farmer_name || "").toLowerCase();
      const code = (f.farmer_code || "").toLowerCase();
      const q = search.toLowerCase();

      const matchesSearch = !q || name.includes(q) || code.includes(q);
      const matchesRisk =
        riskFilter === "ALL" || (f.risk_analysis?.risk_level || "").toUpperCase() === riskFilter.toUpperCase();

      return matchesSearch && matchesRisk;
    });
  }, [farmers, search, riskFilter]);

  const getRiskBadge = (level?: string) => {
    const l = (level || "").toUpperCase();
    if (l === "LOW") return <Badge variant="success">Low Risk</Badge>;
    if (l === "MEDIUM") return <Badge variant="warning">Medium Risk</Badge>;
    if (l === "HIGH") return <Badge variant="danger">High Risk</Badge>;
    return <Badge variant="neutral">{level || "Unrated"}</Badge>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <PageHeader
        title="🌾 Agricultural Intelligence Workspace"
        description="Comprehensive portfolio analysis: net crop realization, algorithmic farmer credit risk scoring, operational recommendations, and anomaly detection."
        actions={
          <div style={{ display: "flex", gap: "10px" }}>
            <Button variant="secondary" onClick={loadAIData} disabled={loading}>
              ↻ Refresh Portfolio Intelligence
            </Button>
          </div>
        }
      />

      {error && (
        <Alert variant="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* KPI Portfolio Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        <StatCard
          label="Farmers Monitored"
          value={farmers.length}
          subtitle="Portfolio members with active ledger"
        />
        <StatCard
          label="Portfolio Realization"
          value={FMT_INR(portfolioTotals.totalRealization)}
          subtitle={`Gross sales: ${FMT_INR(portfolioTotals.totalGross)}`}
          badge={<Badge variant="success">Net Revenue</Badge>}
        />
        <StatCard
          label="High Risk Accounts"
          value={portfolioTotals.highRiskCount}
          subtitle="Accounts exceeding credit risk thresholds"
          badge={
            portfolioTotals.highRiskCount > 0 ? (
              <Badge variant="danger">Review Dues</Badge>
            ) : (
              <Badge variant="success">Healthy</Badge>
            )
          }
        />
        <StatCard
          label="Audit Anomalies Flagged"
          value={anomalySummary?.total_anomalies ?? 0}
          subtitle={
            anomalySummary?.review_required ? "Audit check needed" : "All transactions verified"
          }
          badge={
            anomalySummary?.review_required ? (
              <Badge variant="warning">Action Needed</Badge>
            ) : (
              <Badge variant="success">Clear</Badge>
            )
          }
        />
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardBody style={{ padding: "14px 20px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "14px",
              alignItems: "flex-end",
            }}
          >
            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#4A5568", marginBottom: "4px" }}>
                Search Farmer Portfolio
              </label>
              <Input
                placeholder="Search by farmer name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#4A5568" }}>Filter Risk:</span>
              {["ALL", "LOW", "MEDIUM", "HIGH"].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setRiskFilter(lvl)}
                  style={{
                    background: riskFilter === lvl ? "#174D35" : "#F7FAFC",
                    color: riskFilter === lvl ? "#FFFFFF" : "#4A5568",
                    border: `1px solid ${riskFilter === lvl ? "#174D35" : "#E2E8F0"}`,
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Loading Skeletons */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
          <Card>
            <CardBody style={{ padding: "24px" }}>
              <Skeleton height="32px" style={{ marginBottom: "14px" }} />
              <Skeleton height="70px" style={{ marginBottom: "14px" }} />
              <Skeleton height="100px" />
            </CardBody>
          </Card>
          <Card>
            <CardBody style={{ padding: "24px" }}>
              <Skeleton height="32px" style={{ marginBottom: "14px" }} />
              <Skeleton height="70px" style={{ marginBottom: "14px" }} />
              <Skeleton height="100px" />
            </CardBody>
          </Card>
        </div>
      ) : filteredFarmers.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              title={farmers.length === 0 ? "No AI Records Generated" : "No Matching Farmers"}
              description={
                farmers.length === 0
                  ? "AI intelligence profiles are computed automatically as crop harvests, sales, and input credits are recorded."
                  : "Try clearing your search query or risk level filter."
              }
            />
          </CardBody>
        </Card>
      ) : (
        /* Farmer Portfolio Intelligence Grid */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            gap: "20px",
          }}
        >
          {filteredFarmers.map((f) => {
            const fin = f.financial_summary || {
              gross_sales: 0,
              total_expenses: 0,
              estimated_realization: 0,
            };
            const risk = f.risk_analysis;
            const rec = f.recommendations?.[0];

            return (
              <Card key={f.farmer_id} style={{ display: "flex", flexDirection: "column" }}>
                <CardBody style={{ padding: "22px", display: "flex", flexDirection: "column", height: "100%" }}>
                  {/* Card Header */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      paddingBottom: "14px",
                      borderBottom: "1px solid #E2E8F0",
                      marginBottom: "14px",
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0, fontSize: "17px", color: "#174D35", fontWeight: 700 }}>
                        {f.farmer_name}
                      </h3>
                      <div style={{ fontSize: "12px", color: "#718096", marginTop: "2px" }}>
                        <code>{f.farmer_code}</code> • Farmer #{f.farmer_id}
                      </div>
                    </div>
                    <div>{getRiskBadge(risk?.risk_level)}</div>
                  </div>

                  {/* Financial Realization Strip */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                      background: "#F7FAFC",
                      padding: "12px 14px",
                      borderRadius: "8px",
                      border: "1px solid #EDF2F7",
                      marginBottom: "14px",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#718096" }}>Gross Produce Sales</span>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: "#18251E", marginTop: "2px" }}>
                        {FMT_INR(fin.gross_sales)}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#718096" }}>Est. Net Realization</span>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: "#166534", marginTop: "2px" }}>
                        {FMT_INR(fin.estimated_realization)}
                      </div>
                    </div>
                  </div>

                  {/* Risk Profile & Health */}
                  {risk && (
                    <div style={{ marginBottom: "14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "#4A5568" }}>
                          Financial Health:
                        </span>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#174D35" }}>
                          {risk.financial_health}
                        </span>
                      </div>
                      {risk.risk_reasons && risk.risk_reasons.length > 0 && (
                        <ul style={{ margin: "6px 0 0", paddingLeft: "18px", fontSize: "12px", color: "#718096", lineHeight: "1.4" }}>
                          {risk.risk_reasons.map((r, idx) => (
                            <li key={idx}>{r}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Top Recommendation Note */}
                  {rec && (
                    <div
                      style={{
                        marginTop: "auto",
                        background: "#EBF5EE",
                        border: "1px solid #BCE3C5",
                        borderRadius: "8px",
                        padding: "10px 12px",
                      }}
                    >
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "#174D35", textTransform: "uppercase" }}>
                        💡 Recommendation: {rec.title}
                      </span>
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#166534", lineHeight: "1.4" }}>
                        {rec.message}
                      </p>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}