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
  Input,
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

const FMT_INR = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });

const FMT_DATE = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

interface Payment {
  id: number;
  farmerId?: number;
  farmer_id?: number;
  settlementId?: number;
  settlement_id?: number;
  paymentDate?: string;
  payment_date?: string;
  amount?: number;
  paymentMode?: string;
  payment_mode?: string;
  referenceNumber?: string;
  reference_number?: string;
  notes?: string;
}

export default function MyPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState("ALL");

  useEffect(() => {
    if (!user || user.role !== "FARMER" || !user.farmerId) {
      setError("This page is available only for authenticated farmer accounts.");
      setLoading(false);
      return;
    }
    loadPayments();
  }, [user?.farmerId]);

  async function loadPayments() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<Payment[]>("/farmer-payments");
      const data: Payment[] = Array.isArray(res.data) ? res.data : [];
      const mine = data.filter((p) => {
        const fid = Number(p.farmerId ?? p.farmer_id ?? 0);
        return fid === 0 || fid === Number(user!.farmerId);
      });
      setPayments(mine);
    } catch {
      setError("Unable to load your payment records. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const totalReceived = useMemo(() => {
    return payments.reduce((t, p) => t + Number(p.amount ?? 0), 0);
  }, [payments]);

  const avgPayout = useMemo(() => {
    return payments.length > 0 ? totalReceived / payments.length : 0;
  }, [payments, totalReceived]);

  const latestPayment = useMemo(() => {
    if (payments.length === 0) return null;
    const sorted = [...payments].sort((a, b) => {
      const da = new Date(a.paymentDate ?? a.payment_date ?? 0).getTime();
      const db = new Date(b.paymentDate ?? b.payment_date ?? 0).getTime();
      return db - da;
    });
    return sorted[0];
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const ref = (p.referenceNumber ?? p.reference_number ?? "").toLowerCase();
      const notes = (p.notes ?? "").toLowerCase();
      const mode = (p.paymentMode ?? p.payment_mode ?? "").toUpperCase();
      const q = search.toLowerCase();

      const matchesSearch = !q || ref.includes(q) || notes.includes(q);
      const matchesMode = modeFilter === "ALL" || mode.includes(modeFilter.toUpperCase());

      return matchesSearch && matchesMode;
    });
  }, [payments, search, modeFilter]);

  const getModeBadge = (mode?: string) => {
    const m = (mode || "").toUpperCase();
    if (m.includes("BANK") || m.includes("NEFT") || m.includes("RTGS")) {
      return <Badge variant="info">{mode || "Bank Transfer"}</Badge>;
    }
    if (m.includes("UPI")) {
      return <Badge variant="success">UPI</Badge>;
    }
    if (m.includes("CHEQUE") || m.includes("CHECK")) {
      return <Badge variant="warning">{mode || "Cheque"}</Badge>;
    }
    return <Badge variant="neutral">{mode || "Direct Payment"}</Badge>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <PageHeader
        title="💳 My Payments Received"
        description="Detailed record of bank deposits, UPI transfers, and payment disbursements credited to your farmer account."
        actions={
          <div style={{ display: "flex", gap: "10px" }}>
            <Button variant="secondary" onClick={loadPayments} disabled={loading}>
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

      {/* KPI Metric Overview */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        <StatCard
          label="Total Disbursements"
          value={payments.length}
          subtitle="Credited payment transactions"
        />
        <StatCard
          label="Total Funds Received"
          value={FMT_INR(totalReceived)}
          subtitle="Net credited payout balance"
          badge={<Badge variant="success">Credited</Badge>}
        />
        <StatCard
          label="Average Payout"
          value={FMT_INR(avgPayout)}
          subtitle="Mean payment transaction value"
        />
        <StatCard
          label="Latest Transfer"
          value={latestPayment ? FMT_DATE(latestPayment.paymentDate ?? latestPayment.payment_date) : "—"}
          subtitle={latestPayment ? FMT_INR(Number(latestPayment.amount ?? 0)) : "No transfers yet"}
          badge={<Badge variant="neutral">Recent Activity</Badge>}
        />
      </div>

      {/* Search & Filter Bar */}
      <Card>
        <CardBody style={{ padding: "14px 18px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
              alignItems: "flex-end",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#4A5568",
                  marginBottom: "4px",
                }}
              >
                Search Payments
              </label>
              <Input
                placeholder="Search UTR / reference # or notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#4A5568",
                  marginBottom: "4px",
                }}
              >
                Filter by Payment Channel
              </label>
              <Select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}>
                <option value="ALL">All Payment Channels</option>
                <option value="BANK">Bank / NEFT / RTGS</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
              </Select>
            </div>

            {(search || modeFilter !== "ALL") && (
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearch("");
                    setModeFilter("ALL");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Main Table */}
      {loading ? (
        <Card>
          <CardBody style={{ padding: "24px" }}>
            <Skeleton height="36px" style={{ marginBottom: "12px" }} />
            <Skeleton height="48px" style={{ marginBottom: "8px" }} />
            <Skeleton height="48px" style={{ marginBottom: "8px" }} />
            <Skeleton height="48px" />
          </CardBody>
        </Card>
      ) : filteredPayments.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              title={payments.length === 0 ? "No Payments Received Yet" : "No Matching Payments"}
              description={
                payments.length === 0
                  ? "When settlements are disbursed via bank transfer, cheque, or UPI, payment receipts will appear here."
                  : "Try resetting your search query or channel filter to locate payments."
              }
              action={
                search || modeFilter !== "ALL" ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch("");
                      setModeFilter("ALL");
                    }}
                  >
                    Reset Filters
                  </Button>
                ) : undefined
              }
            />
          </CardBody>
        </Card>
      ) : (
        <TableContainer>
          <Table>
            <Thead>
              <Tr>
                <Th>Payment Date</Th>
                <Th>Amount Credited</Th>
                <Th>Payment Mode</Th>
                <Th>Reference / UTR #</Th>
                <Th>Settlement Statement</Th>
                <Th>Notes & Description</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredPayments.map((p) => {
                const pDate = p.paymentDate ?? p.payment_date;
                const pMode = p.paymentMode ?? p.payment_mode;
                const refNum = p.referenceNumber ?? p.reference_number;
                const settId = p.settlementId ?? p.settlement_id;

                return (
                  <Tr key={p.id}>
                    <Td>{FMT_DATE(pDate)}</Td>
                    <Td>
                      <span style={{ fontWeight: 700, color: "#166534", fontSize: "15px" }}>
                        {FMT_INR(Number(p.amount ?? 0))}
                      </span>
                    </Td>
                    <Td>{getModeBadge(pMode)}</Td>
                    <Td>
                      {refNum ? (
                        <code
                          style={{
                            background: "#F7FAFC",
                            padding: "3px 7px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            color: "#2D3748",
                            border: "1px solid #E2E8F0",
                            fontFamily: "monospace",
                          }}
                        >
                          {refNum}
                        </code>
                      ) : (
                        <span style={{ color: "#A0AEC0", fontSize: "12px" }}>—</span>
                      )}
                    </Td>
                    <Td>
                      {settId ? (
                        <span style={{ fontWeight: 600, color: "#174D35", fontSize: "13px" }}>
                          Statement #{settId}
                        </span>
                      ) : (
                        <span style={{ color: "#A0AEC0", fontSize: "12px" }}>Direct / General</span>
                      )}
                    </Td>
                    <Td>
                      <span
                        style={{
                          fontSize: "13px",
                          color: "#4A5568",
                          maxWidth: "240px",
                          display: "inline-block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={p.notes || ""}
                      >
                        {p.notes || "—"}
                      </span>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}
