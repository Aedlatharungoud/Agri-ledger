import { useEffect, useState } from "react";
import api from "../services/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  PageHeader,
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
  normal_range?: {
    minimum: number;
    maximum: number;
  };
  requires_review: boolean;
}

interface FarmerAnomaly {
  farmer_id: number;
  farmer_code: string;
  farmer_name: string;
  anomaly_count: number;
  anomalies: Anomaly[];
}

interface AnomalyResponse {
  status: string;
  summary: {
    total_anomalies: number;
    farmers_analyzed: number;
    farmers_with_anomalies: number;
    review_required: boolean;
  };
  farmers: FarmerAnomaly[];
}

const FMT_INR = (n?: number) =>
  n != null ? n.toLocaleString("en-IN", { style: "currency", currency: "INR" }) : "—";

export default function AnomalyDetection() {
  const [data, setData] = useState<AnomalyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAnomalies();
  }, []);

  async function loadAnomalies() {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<AnomalyResponse>("/ai/anomalies");
      setData(response.data);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Unable to load transaction anomaly telemetry.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const getSeverityBadge = (severity?: string) => {
    const s = (severity || "").toUpperCase();
    if (s === "HIGH") return <Badge variant="danger">High Severity</Badge>;
    if (s === "MEDIUM") return <Badge variant="warning">Medium</Badge>;
    return <Badge variant="neutral">Low / Info</Badge>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <PageHeader
        title="🚨 Ledger Anomaly Detection"
        description="Statistical outlier and rule-based anomaly detection across sales rates, labor wage advances, input credits, and settlement calculations."
        actions={
          <div style={{ display: "flex", gap: "10px" }}>
            <Button variant="secondary" onClick={loadAnomalies} disabled={loading}>
              ↻ Re-audit Transactions
            </Button>
          </div>
        }
      />

      {error && (
        <Alert variant="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Card>
          <CardBody style={{ padding: "28px" }}>
            <Skeleton height="36px" style={{ marginBottom: "16px" }} />
            <Skeleton height="60px" style={{ marginBottom: "16px" }} />
            <Skeleton height="140px" />
          </CardBody>
        </Card>
      ) : !data ? null : (
        <>
          {/* Summary Stat Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
            }}
          >
            <StatCard
              label="Farmers Audited"
              value={data.summary.farmers_analyzed}
              subtitle="Accounts screened by AI engine"
            />
            <StatCard
              label="Detected Anomalies"
              value={data.summary.total_anomalies}
              subtitle="Outliers flagged for review"
              badge={
                data.summary.total_anomalies > 0 ? (
                  <Badge variant="danger">Action Required</Badge>
                ) : (
                  <Badge variant="success">All Clear</Badge>
                )
              }
            />
            <StatCard
              label="Accounts with Flags"
              value={data.summary.farmers_with_anomalies}
              subtitle="Holders with outlier transactions"
            />
            <StatCard
              label="Audit Compliance Status"
              value={data.summary.review_required ? "REVIEW REQUIRED" : "COMPLIANT"}
              subtitle={
                data.summary.review_required
                  ? "Pending administrator verification"
                  : "Normal bounds verified"
              }
              badge={
                data.summary.review_required ? (
                  <Badge variant="warning">Manual Check</Badge>
                ) : (
                  <Badge variant="success">Audit Verified</Badge>
                )
              }
            />
          </div>

          {/* Audit Status Banner Card */}
          <div
            style={{
              background: data.summary.review_required ? "#FFFBEB" : "#F0FDF4",
              border: `1px solid ${data.summary.review_required ? "#FDE68A" : "#BBF7D0"}`,
              borderRadius: "14px",
              padding: "20px 24px",
              display: "flex",
              alignItems: "flex-start",
              gap: "18px",
            }}
          >
            <div style={{ fontSize: "36px" }}>
              {data.summary.review_required ? "⚠️" : "✓"}
            </div>
            <div>
              <h3
                style={{
                  margin: "0 0 6px",
                  fontSize: "17px",
                  fontWeight: 700,
                  color: data.summary.review_required ? "#92400E" : "#166534",
                }}
              >
                {data.summary.review_required
                  ? "Transaction Outliers Require Inspection"
                  : "All Ledger Transactions Within Normal Historical Bounds"}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  color: data.summary.review_required ? "#78350F" : "#14532D",
                  lineHeight: "1.5",
                }}
              >
                {data.summary.review_required
                  ? "The AI audit algorithm identified unusual quantity, wage, or rate entries exceeding standard deviations. Verify corresponding invoices or vouchers."
                  : "No abnormal market deductions, suspicious labor advance ratios, or irregular commodity prices were identified across all farmer records. Background automated auditing remains active."}
              </p>
            </div>
          </div>

          {/* Farmer-Level Audit Matrix */}
          <TableContainer>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#174D35", fontWeight: 700 }}>
                Farmer Transaction Audit Roster
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#718096" }}>
                Individual account anomaly breakdown and audit findings.
              </p>
            </div>

            <Table>
              <Thead>
                <Tr>
                  <Th>Farmer Code</Th>
                  <Th>Farmer Name</Th>
                  <Th>Audit Status</Th>
                  <Th>Flagged Transactions</Th>
                  <Th>Primary Audit Notes</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.farmers.map((f) => (
                  <Tr key={f.farmer_id}>
                    <Td>
                      <code>{f.farmer_code}</code>
                    </Td>
                    <Td>
                      <strong style={{ color: "#18251E" }}>{f.farmer_name}</strong>
                    </Td>
                    <Td>
                      {f.anomaly_count > 0 ? (
                        <Badge variant="warning">{f.anomaly_count} Anomalies</Badge>
                      ) : (
                        <Badge variant="success">Verified Clean</Badge>
                      )}
                    </Td>
                    <Td>
                      {f.anomaly_count > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {f.anomalies.map((a, idx) => (
                            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              {getSeverityBadge(a.severity)}
                              <span style={{ fontSize: "12px", color: "#4A5568" }}>
                                {a.transaction_type} #{a.record_id} • {FMT_INR(a.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: "#718096", fontSize: "13px" }}>0 flagged items</span>
                      )}
                    </Td>
                    <Td>
                      {f.anomaly_count > 0 ? (
                        <span style={{ fontSize: "13px", color: "#C05621" }}>
                          {f.anomalies.map((a) => a.reason).join("; ")}
                        </span>
                      ) : (
                        <span style={{ color: "#166534", fontSize: "13px" }}>
                          Within expected statistical distributions.
                        </span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </>
      )}
    </div>
  );
}