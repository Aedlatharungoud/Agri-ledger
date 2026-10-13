import { useEffect, useState } from "react";
import api from "../services/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  FormField,
  PageHeader,
  Select,
  Skeleton,
  StatCard,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "../components/ui";

interface Harvest {
  id: number;
  cropName?: string;
  crop_name?: string;
  quantity?: number;
  unit?: string;
  lotNumber?: string | null;
  harvestDate?: string;
  harvest_date?: string;
}

interface RankedMarket {
  sale_id: number;
  harvest_id: number;
  market_name: string;
  sale_date: string | null;
  quantity_sold: number;
  unit: string;
  price_per_unit: number;
  gross_amount: number;
  commission: number;
  market_fee: number;
  other_deduction: number;
  total_deductions: number;
  transport_cost: number;
  transport_records_used: number;
  expected_net_realization: number;
  rank: number;
}

interface Recommendation {
  market_name: string;
  price_per_unit: number;
  quantity: number;
  unit: string;
  expected_gross_realization: number;
  transport_cost: number;
  sale_deductions: number;
  expected_net_realization: number;
  confidence: string;
  reason: string;
}

interface RecommendationResponse {
  status: string;
  harvest: {
    harvest_id: number;
    crop_name: string;
    quantity: number;
    unit: string | null;
    harvest_date: string | null;
  };
  recommendation: Recommendation;
  comparison: {
    markets_evaluated: number;
    historical_records: number;
    difference_from_second_best: number;
    ranked_markets: RankedMarket[];
  };
  data_warning: string;
  message?: string;
}

const FMT_INR = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });

const FMT_DATE = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function MarketRecommendation() {
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [selectedHarvestId, setSelectedHarvestId] = useState<string>("");
  const [result, setResult] = useState<RecommendationResponse | null>(null);

  const [loadingHarvests, setLoadingHarvests] = useState(true);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadHarvests();
  }, []);

  async function loadHarvests() {
    setLoadingHarvests(true);
    setError("");
    try {
      const response = await api.get<Harvest[]>("/harvests");
      const list = Array.isArray(response.data) ? response.data : [];
      setHarvests(list);

      if (list.length > 0) {
        setSelectedHarvestId(String(list[0].id));
        fetchRecommendation(String(list[0].id));
      }
    } catch (err: any) {
      setError("Unable to load harvest lots from database.");
    } finally {
      setLoadingHarvests(false);
    }
  }

  async function fetchRecommendation(harvestIdStr: string) {
    if (!harvestIdStr) return;
    setLoadingRecommendation(true);
    setError("");

    try {
      const res = await api.post<RecommendationResponse>("/ai/market-recommendation", {
        harvest_id: Number(harvestIdStr),
      });

      const data = res.data;
      if (data.status === "error") {
        throw new Error(data.message || "Failed to generate market recommendation.");
      }

      setResult(data);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Unable to generate market recommendation.";
      setError(msg);
      setResult(null);
    } finally {
      setLoadingRecommendation(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <PageHeader
        title="🏆 Best Market Recommendation"
        description="Algorithmic net realization optimization: compare regional mandis by gross price per unit after subtracting transit costs and commission deductions."
        actions={
          <div style={{ display: "flex", gap: "10px" }}>
            <Button
              variant="secondary"
              onClick={() => selectedHarvestId && fetchRecommendation(selectedHarvestId)}
              disabled={loadingRecommendation}
            >
              ↻ Recompute Optimization
            </Button>
          </div>
        }
      />

      {error && (
        <Alert variant="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Harvest Lot Selector Card */}
      <Card>
        <CardBody style={{ padding: "20px 24px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "16px",
              alignItems: "flex-end",
            }}
          >
            <FormField
              label="Select Harvest Lot for Recommendation"
              required
              help="Choose a harvested batch to evaluate potential mandi destinations."
            >
              <Select
                value={selectedHarvestId}
                onChange={(e) => {
                  setSelectedHarvestId(e.target.value);
                  fetchRecommendation(e.target.value);
                }}
                disabled={loadingHarvests || loadingRecommendation}
              >
                {harvests.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.cropName || h.crop_name || "Crop"} — Lot #{h.id} ({h.quantity} {h.unit}) •{" "}
                    {FMT_DATE(h.harvestDate || h.harvest_date)}
                  </option>
                ))}
              </Select>
            </FormField>

            <div style={{ paddingBottom: "2px" }}>
              <Button
                variant="primary"
                onClick={() => fetchRecommendation(selectedHarvestId)}
                disabled={loadingRecommendation || !selectedHarvestId}
              >
                {loadingRecommendation ? "Analyzing Mandis..." : "⚡ Rank Mandis"}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Loading Skeletons */}
      {loadingRecommendation && (
        <Card>
          <CardBody style={{ padding: "28px" }}>
            <Skeleton height="36px" style={{ marginBottom: "16px" }} />
            <Skeleton height="80px" style={{ marginBottom: "16px" }} />
            <Skeleton height="140px" />
          </CardBody>
        </Card>
      )}

      {/* Recommendation Results */}
      {result && !loadingRecommendation && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Top Recommendation Banner */}
          <div
            style={{
              background: "#EBF5EE",
              border: "1px solid #BCE3C5",
              borderRadius: "14px",
              padding: "24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: "16px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#2F855A", textTransform: "uppercase" }}>
                  Optimal Selling Destination
                </span>
                <Badge variant="success">Rank #1 Mandi</Badge>
              </div>

              <h2 style={{ margin: "4px 0", fontSize: "26px", color: "#174D35", fontWeight: 800 }}>
                📍 {result.recommendation.market_name}
              </h2>

              <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#166534" }}>
                {result.recommendation.reason}
              </p>
            </div>

            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "12px", color: "#2F855A", fontWeight: 600 }}>
                Expected Net Realization
              </span>
              <div style={{ fontSize: "28px", fontWeight: 800, color: "#174D35", marginTop: "2px" }}>
                {FMT_INR(result.recommendation.expected_net_realization)}
              </div>
              <span style={{ fontSize: "12px", color: "#718096" }}>
                Rate: {FMT_INR(result.recommendation.price_per_unit)} / {result.recommendation.unit}
              </span>
            </div>
          </div>

          {/* Breakdown Stat Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
            }}
          >
            <StatCard
              label="Expected Gross Sales"
              value={FMT_INR(result.recommendation.expected_gross_realization)}
              subtitle={`${result.recommendation.quantity} ${result.recommendation.unit} trade volume`}
            />
            <StatCard
              label="Estimated Transport Cost"
              value={`- ${FMT_INR(result.recommendation.transport_cost)}`}
              subtitle="Freight & haulage deduction"
            />
            <StatCard
              label="Estimated Mandi Deductions"
              value={`- ${FMT_INR(result.recommendation.sale_deductions)}`}
              subtitle="Commission & market cess"
            />
            <StatCard
              label="Net Realization Advantage"
              value={`+ ${FMT_INR(result.comparison.difference_from_second_best)}`}
              subtitle="Benefit over 2nd best mandi"
              badge={<Badge variant="success">Higher Return</Badge>}
            />
          </div>

          {/* Ranked Mandi Comparison Table */}
          <TableContainer>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#174D35", fontWeight: 700 }}>
                Regional Market Ranking Matrix ({result.comparison.markets_evaluated} Mandis Evaluated)
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#718096" }}>
                Markets ranked by net farmer payout after subtracting transport and mandi deductions.
              </p>
            </div>

            <Table>
              <Thead>
                <Tr>
                  <Th>Rank</Th>
                  <Th>Market / Mandi</Th>
                  <Th>Price per Unit</Th>
                  <Th>Gross Value</Th>
                  <Th>Transport</Th>
                  <Th>Mandi Fees</Th>
                  <Th>Expected Net Realization</Th>
                </Tr>
              </Thead>
              <Tbody>
                {result.comparison.ranked_markets.map((m) => (
                  <Tr key={m.sale_id} style={{ background: m.rank === 1 ? "#F0FDF4" : undefined }}>
                    <Td>
                      <Badge variant={m.rank === 1 ? "success" : "neutral"}>
                        #{m.rank}
                      </Badge>
                    </Td>
                    <Td>
                      <strong style={{ color: m.rank === 1 ? "#174D35" : "#18251E" }}>
                        {m.market_name}
                      </strong>
                    </Td>
                    <Td>
                      {FMT_INR(m.price_per_unit)} / {m.unit}
                    </Td>
                    <Td>{FMT_INR(m.gross_amount)}</Td>
                    <Td style={{ color: "#C05621" }}>- {FMT_INR(m.transport_cost)}</Td>
                    <Td style={{ color: "#C05621" }}>- {FMT_INR(m.total_deductions)}</Td>
                    <Td>
                      <strong style={{ color: m.rank === 1 ? "#166534" : "#18251E", fontSize: "14px" }}>
                        {FMT_INR(m.expected_net_realization)}
                      </strong>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>

          {/* Data Transparency Warning */}
          {result.data_warning && (
            <div
              style={{
                fontSize: "12px",
                color: "#718096",
                background: "#F7FAFC",
                padding: "10px 16px",
                borderRadius: "8px",
                border: "1px solid #E2E8F0",
              }}
            >
              ℹ️ {result.data_warning}
            </div>
          )}
        </div>
      )}
    </div>
  );
}