import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  PageHeader,
  Select,
  Skeleton,
  StatCard,
} from "../components/ui";

const FMT_INR = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });

const FMT_DATE = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

interface Settlement {
  id: number;
  farmerId: number;
  cropSeasonId?: number;
  settlementDate?: string;
  totalCropSales?: number;
  totalInputCredit?: number;
  totalLabourCredit?: number;
  totalTransport?: number;
  totalDeductions?: number;
  totalInterest?: number;
  totalPayments?: number;
  finalAmount?: number;
  settlementStatus?: string;
  notes?: string;
}

export default function MySettlements() {
  const { user } = useAuth();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    if (!user || user.role !== "FARMER" || !user.farmerId) {
      setError("This page is available only for authenticated farmer accounts.");
      setLoading(false);
      return;
    }
    loadSettlements();
  }, [user?.farmerId]);

  async function loadSettlements() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<Settlement[]>("/settlements");
      const data: Settlement[] = Array.isArray(res.data) ? res.data : [];
      const mine = data.filter((s) => Number(s.farmerId) === Number(user!.farmerId));
      setSettlements(mine);
    } catch {
      setError("Unable to load your settlement records. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const totalFinal = useMemo(() => {
    return settlements.reduce((t, s) => t + Number(s.finalAmount ?? 0), 0);
  }, [settlements]);

  const totalPaid = useMemo(() => {
    return settlements.reduce((t, s) => t + Number(s.totalPayments ?? 0), 0);
  }, [settlements]);

  const totalOutstanding = useMemo(() => {
    return Math.max(0, totalFinal - totalPaid);
  }, [totalFinal, totalPaid]);

  const filteredSettlements = useMemo(() => {
    return settlements.filter((s) => {
      if (statusFilter === "ALL") return true;
      return (s.settlementStatus || "").toUpperCase() === statusFilter.toUpperCase();
    });
  }, [settlements, statusFilter]);

  const getStatusBadge = (status?: string) => {
    const st = (status || "UNKNOWN").toUpperCase();
    if (st === "SETTLED") return <Badge variant="success">Settled</Badge>;
    if (st === "PARTIAL") return <Badge variant="info">Partially Paid</Badge>;
    if (st === "PENDING") return <Badge variant="warning">Pending Review</Badge>;
    return <Badge variant="neutral">{status || "Unknown"}</Badge>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <PageHeader
        title="📑 My Financial Settlements"
        description="Comprehensive seasonal account reconciliations, harvest receipts, input credit deductions, and disbursement records."
        actions={
          <div style={{ display: "flex", gap: "10px" }}>
            <Button variant="secondary" onClick={loadSettlements} disabled={loading}>
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

      {/* KPI Financial Overview */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        <StatCard
          label="Settlement Accounts"
          value={settlements.length}
          subtitle="Reconciled crop seasons"
        />
        <StatCard
          label="Total Net Final Value"
          value={FMT_INR(totalFinal)}
          subtitle="All finalized seasonal statements"
          badge={<Badge variant="success">Reconciled Net</Badge>}
        />
        <StatCard
          label="Disbursed Payouts"
          value={FMT_INR(totalPaid)}
          subtitle="Direct farmer payments credited"
          badge={<Badge variant="info">Paid to Date</Badge>}
        />
        <StatCard
          label="Outstanding Balance"
          value={FMT_INR(totalOutstanding)}
          subtitle="Remaining amount payable"
          badge={
            totalOutstanding > 0 ? (
              <Badge variant="warning">Payable Balance</Badge>
            ) : (
              <Badge variant="success">Zero Balance</Badge>
            )
          }
        />
      </div>

      {/* Filter Strip */}
      <Card>
        <CardBody style={{ padding: "12px 18px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "#4A5568" }}>
                Filter by Settlement Status:
              </span>
              <div style={{ width: "200px" }}>
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="ALL">All Statements ({settlements.length})</option>
                  <option value="SETTLED">Settled</option>
                  <option value="PARTIAL">Partially Paid</option>
                  <option value="PENDING">Pending Review</option>
                </Select>
              </div>
            </div>
            {statusFilter !== "ALL" && (
              <Button variant="ghost" size="sm" onClick={() => setStatusFilter("ALL")}>
                Reset Filter
              </Button>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Settlement Cards Grid */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "16px" }}>
          <Card>
            <CardBody style={{ padding: "20px" }}>
              <Skeleton height="28px" style={{ marginBottom: "12px" }} />
              <Skeleton height="70px" style={{ marginBottom: "12px" }} />
              <Skeleton height="40px" />
            </CardBody>
          </Card>
          <Card>
            <CardBody style={{ padding: "20px" }}>
              <Skeleton height="28px" style={{ marginBottom: "12px" }} />
              <Skeleton height="70px" style={{ marginBottom: "12px" }} />
              <Skeleton height="40px" />
            </CardBody>
          </Card>
        </div>
      ) : filteredSettlements.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              title={settlements.length === 0 ? "No Settlement Statements Found" : "No Matching Settlements"}
              description={
                settlements.length === 0
                  ? "Settlement accounts are generated at the end of each crop season after all harvests and mandi sales are verified."
                  : "Try clearing your status filter to view other settlement records."
              }
              action={
                statusFilter !== "ALL" ? (
                  <Button variant="secondary" onClick={() => setStatusFilter("ALL")}>
                    Show All Settlements
                  </Button>
                ) : undefined
              }
            />
          </CardBody>
        </Card>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            gap: "20px",
          }}
        >
          {filteredSettlements.map((s) => {
            const finalAmt = Number(s.finalAmount ?? 0);
            const paidAmt = Number(s.totalPayments ?? 0);
            const balanceDue = finalAmt - paidAmt;

            return (
              <Card key={s.id} style={{ display: "flex", flexDirection: "column" }}>
                <CardBody style={{ padding: "20px", display: "flex", flexDirection: "column", height: "100%" }}>
                  {/* Top Bar */}
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
                      <div style={{ fontSize: "16px", fontWeight: 700, color: "#174D35" }}>
                        Statement #{s.id}
                      </div>
                      <div style={{ fontSize: "12px", color: "#718096", marginTop: "2px" }}>
                        Season #{s.cropSeasonId ?? "—"} • {FMT_DATE(s.settlementDate)}
                      </div>
                    </div>
                    <div>{getStatusBadge(s.settlementStatus)}</div>
                  </div>

                  {/* Financial Breakdown Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                      marginBottom: "16px",
                      background: "#F7FAFC",
                      padding: "14px",
                      borderRadius: "8px",
                      border: "1px solid #EDF2F7",
                    }}
                  >
                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#718096", textTransform: "uppercase" }}>
                        Gross Crop Sales
                      </span>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "#174D35", marginTop: "2px" }}>
                        {FMT_INR(Number(s.totalCropSales ?? 0))}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#718096", textTransform: "uppercase" }}>
                        Input Credit Rec.
                      </span>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#C05621", marginTop: "2px" }}>
                        - {FMT_INR(Number(s.totalInputCredit ?? 0))}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#718096", textTransform: "uppercase" }}>
                        Labour Advances
                      </span>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#C05621", marginTop: "2px" }}>
                        - {FMT_INR(Number(s.totalLabourCredit ?? 0))}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#718096", textTransform: "uppercase" }}>
                        Transport / Freight
                      </span>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#C05621", marginTop: "2px" }}>
                        - {FMT_INR(Number(s.totalTransport ?? 0))}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#718096", textTransform: "uppercase" }}>
                        Mandi Deductions
                      </span>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#C05621", marginTop: "2px" }}>
                        - {FMT_INR(Number(s.totalDeductions ?? 0))}
                      </div>
                    </div>

                    <div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#718096", textTransform: "uppercase" }}>
                        Interest Charge
                      </span>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#718096", marginTop: "2px" }}>
                        {Number(s.totalInterest ?? 0) > 0 ? `- ${FMT_INR(Number(s.totalInterest))}` : "₹0.00"}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Financial Reconciliation */}
                  <div
                    style={{
                      marginTop: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      paddingTop: "12px",
                      borderTop: "1px dashed #E2E8F0",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#4A5568" }}>
                        Net Settlement Value:
                      </span>
                      <span style={{ fontSize: "15px", fontWeight: 700, color: "#18251E" }}>
                        {FMT_INR(finalAmt)}
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "13px", color: "#718096" }}>
                        Disbursed Payouts:
                      </span>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "#166534" }}>
                        {FMT_INR(paidAmt)}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        background: balanceDue > 0 ? "#FFFBEB" : "#F0FDF4",
                        borderRadius: "6px",
                        border: `1px solid ${balanceDue > 0 ? "#FDE68A" : "#BBF7D0"}`,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          color: balanceDue > 0 ? "#92400E" : "#166534",
                        }}
                      >
                        Balance Due Payout:
                      </span>
                      <span
                        style={{
                          fontSize: "15px",
                          fontWeight: 800,
                          color: balanceDue > 0 ? "#B91C1C" : "#166534",
                        }}
                      >
                        {FMT_INR(balanceDue)}
                      </span>
                    </div>
                  </div>

                  {s.notes && (
                    <div
                      style={{
                        marginTop: "12px",
                        fontSize: "12px",
                        color: "#4A5568",
                        background: "#EDF2F7",
                        padding: "6px 10px",
                        borderRadius: "4px",
                      }}
                    >
                      📝 {s.notes}
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
