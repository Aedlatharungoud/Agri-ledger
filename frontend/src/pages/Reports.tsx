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
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "../components/ui";

interface Farmer {
  id: number;
  farmerCode?: string;
  name?: string;
  farmerName?: string;
}

interface MarketSale {
  id: number;
  farmerId: number;
  harvestId: number;
  saleDate: string;
  marketName?: string | null;
  buyerName?: string | null;
  quantitySold?: number | null;
  unit?: string | null;
  ratePerUnit?: number | null;
  grossAmount?: number | null;
  commission?: number | null;
  marketFee?: number | null;
  otherDeduction?: number | null;
}

interface SaleDeduction {
  id: number;
  saleId: number;
  deductionType?: string | null;
  amount?: number | null;
  notes?: string | null;
}

interface TransportRecord {
  id: number;
  harvestId: number;
  transportDate: string;
  truckNumber?: string | null;
  freightAmount?: number | null;
  loadingCharges?: number | null;
  unloadingCharges?: number | null;
}

interface Settlement {
  id: number;
  farmerId: number;
  cropSeasonId?: number | null;
  settlementDate: string;
  totalCropSales?: number | null;
  totalInputCredit?: number | null;
  totalLabourCredit?: number | null;
  totalTransport?: number | null;
  totalDeductions?: number | null;
  totalInterest?: number | null;
  totalPayments?: number | null;
  finalAmount?: number | null;
  settlementStatus?: string | null;
}

interface FarmerPayment {
  id: number;
  farmerId: number;
  settlementId?: number | null;
  paymentDate: string;
  amount: number;
  paymentMode: string;
}

interface ReportData {
  farmers: Farmer[];
  marketSales: MarketSale[];
  saleDeductions: SaleDeduction[];
  transportRecords: TransportRecord[];
  settlements: Settlement[];
  payments: FarmerPayment[];
}

export default function Reports() {
  const [data, setData] = useState<ReportData>({
    farmers: [],
    marketSales: [],
    saleDeductions: [],
    transportRecords: [],
    settlements: [],
    payments: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"FARMERS" | "SALES">("FARMERS");

  // ============================================================
  // LOAD REPORT DATA
  // ============================================================

  const loadReports = async () => {
    setLoading(true);
    setError("");

    try {
      const [farmersRes, salesRes, deductionsRes, transportRes, settlementsRes, paymentsRes] =
        await Promise.all([
          api.get("/farmers"),
          api.get("/market-sales"),
          api.get("/sale-deductions"),
          api.get("/transport-records"),
          api.get("/settlements"),
          api.get("/farmer-payments"),
        ]);

      setData({
        farmers: Array.isArray(farmersRes.data) ? farmersRes.data : [],
        marketSales: Array.isArray(salesRes.data) ? salesRes.data : [],
        saleDeductions: Array.isArray(deductionsRes.data) ? deductionsRes.data : [],
        transportRecords: Array.isArray(transportRes.data) ? transportRes.data : [],
        settlements: Array.isArray(settlementsRes.data) ? settlementsRes.data : [],
        payments: Array.isArray(paymentsRes.data) ? paymentsRes.data : [],
      });
    } catch (err: unknown) {
      console.error(err);
      setError("Unable to compile report datasets. Please verify backend connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  // Quick farmer lookup map
  const farmerMap = useMemo(() => {
    const map = new Map<number, Farmer>();
    for (const f of data.farmers) map.set(f.id, f);
    return map;
  }, [data.farmers]);

  // ============================================================
  // FINANCIAL CALCULATIONS
  // ============================================================

  const totalSales = useMemo(() => {
    return data.marketSales.reduce((acc, s) => acc + Number(s.grossAmount || 0), 0);
  }, [data.marketSales]);

  const totalSalesDeductions = useMemo(() => {
    return data.saleDeductions.reduce((acc, d) => acc + Number(d.amount || 0), 0);
  }, [data.saleDeductions]);

  const totalSettlementValue = useMemo(() => {
    return data.settlements.reduce((acc, s) => acc + Number(s.finalAmount || 0), 0);
  }, [data.settlements]);

  const totalPayments = useMemo(() => {
    return data.payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  }, [data.payments]);

  const totalOutstanding = Math.max(0, totalSettlementValue - totalPayments);

  const totalRecoveries = useMemo(() => {
    return data.settlements.reduce(
      (acc, s) =>
        acc +
        Number(s.totalInputCredit || 0) +
        Number(s.totalLabourCredit || 0) +
        Number(s.totalTransport || 0),
      0
    );
  }, [data.settlements]);

  // ============================================================
  // PER-FARMER REPORT BREAKDOWN
  // ============================================================

  const farmerReports = useMemo(() => {
    return data.farmers.map((farmer) => {
      const sales = data.marketSales
        .filter((s) => s.farmerId === farmer.id)
        .reduce((acc, s) => acc + Number(s.grossAmount || 0), 0);

      const farmerSaleIds = new Set(
        data.marketSales.filter((s) => s.farmerId === farmer.id).map((s) => s.id)
      );

      const deductions = data.saleDeductions
        .filter((d) => farmerSaleIds.has(d.saleId))
        .reduce((acc, d) => acc + Number(d.amount || 0), 0);

      const fSettlements = data.settlements.filter((s) => s.farmerId === farmer.id);

      const inputs = fSettlements.reduce((acc, s) => acc + Number(s.totalInputCredit || 0), 0);
      const labour = fSettlements.reduce((acc, s) => acc + Number(s.totalLabourCredit || 0), 0);
      const transport = fSettlements.reduce((acc, s) => acc + Number(s.totalTransport || 0), 0);
      const settlementFinal = fSettlements.reduce((acc, s) => acc + Number(s.finalAmount || 0), 0);

      const payments = data.payments
        .filter((p) => p.farmerId === farmer.id)
        .reduce((acc, p) => acc + Number(p.amount || 0), 0);

      const balance = Math.max(0, settlementFinal - payments);

      return {
        farmer,
        sales,
        deductions,
        inputs,
        labour,
        transport,
        settlementFinal,
        payments,
        balance,
      };
    });
  }, [data]);

  // Filtered farmer reports
  const filteredFarmerReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return farmerReports;

    return farmerReports.filter((r) => {
      const name = (r.farmer.name || r.farmer.farmerName || "").toLowerCase();
      const code = (r.farmer.farmerCode || "").toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [farmerReports, search]);

  const recentSales = useMemo(() => {
    return [...data.marketSales]
      .sort((a, b) => String(b.saleDate).localeCompare(String(a.saleDate)))
      .slice(0, 15);
  }, [data.marketSales]);

  const formatCurrency = (val: number) => `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="al-page-wrapper">
      {/* Header */}
      <PageHeader
        eyebrow="Financial Intelligence & Audit"
        title="Reports & Analytics"
        description="Comprehensive audit of holistic farmer ledger balances, auction proceeds, seasonal recoveries, and treasury disbursals."
        actions={
          <Button variant="secondary" icon="↻" onClick={loadReports} disabled={loading}>
            Refresh Reports
          </Button>
        }
      />

      {/* Notifications */}
      {error && (
        <Alert variant="error" title="Report Error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Summary KPI Grid */}
      <div className="al-summary-grid">
        <StatCard
          label="Total Crop Sales"
          value={formatCurrency(totalSales)}
          icon="🌾"
          subtitle="Gross auction proceeds"
        />

        <StatCard
          label="Market Deductions"
          value={formatCurrency(totalSalesDeductions)}
          icon="📉"
          subtitle="APMC, commission & fees"
          badge={<Badge variant="warning">Mandi Cut</Badge>}
        />

        <StatCard
          label="Recovered Advances"
          value={formatCurrency(totalRecoveries)}
          icon="📦"
          subtitle="Inputs, labour & freight"
          badge={<Badge variant="info">Recovered</Badge>}
        />

        <StatCard
          label="Net Statements"
          value={formatCurrency(totalSettlementValue)}
          icon="📑"
          subtitle="Total closeout value"
        />

        <StatCard
          label="Paid to Farmers"
          value={formatCurrency(totalPayments)}
          icon="💵"
          subtitle="Disbursed treasury funds"
          badge={<Badge variant="success">Disbursed</Badge>}
        />

        <StatCard
          label="Pending Outstanding"
          value={formatCurrency(totalOutstanding)}
          icon="⏳"
          subtitle="Balance payable to farmers"
          badge={<Badge variant={totalOutstanding > 0 ? "warning" : "success"}>{totalOutstanding > 0 ? "Payable" : "Cleared"}</Badge>}
        />
      </div>

      {/* Tab Switcher & Filter Bar */}
      <div className="al-filter-bar">
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <Button
            variant={activeTab === "FARMERS" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveTab("FARMERS")}
          >
            Farmer Financial Ledgers
          </Button>
          <Button
            variant={activeTab === "SALES" ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveTab("SALES")}
          >
            Recent Mandi Auctions
          </Button>
        </div>

        <div className="al-filter-search" style={{ maxWidth: "340px", marginLeft: "auto" }}>
          <Input
            placeholder="Search by farmer name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="al-filter-actions">
          {search && (
            <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Tab Content 1: Farmer Ledgers */}
      {activeTab === "FARMERS" && (
        <Card>
          <CardBody style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: "var(--space-6)" }}>
                <Skeleton height="36px" style={{ marginBottom: "12px" }} />
                <Skeleton height="54px" style={{ marginBottom: "8px" }} />
                <Skeleton height="54px" style={{ marginBottom: "8px" }} />
                <Skeleton height="54px" />
              </div>
            ) : filteredFarmerReports.length === 0 ? (
              <EmptyState
                icon="📊"
                title={search ? "No farmers match search" : "No financial records found"}
                description="Begin recording sales, settlements, and disbursements to populate financial reports."
              />
            ) : (
              <TableContainer>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Farmer</Th>
                      <Th align="right">Gross Sales</Th>
                      <Th align="right">Mandi Cut</Th>
                      <Th align="right">Inputs Recovered</Th>
                      <Th align="right">Labour Adv.</Th>
                      <Th align="right">Settlement Net</Th>
                      <Th align="right">Paid</Th>
                      <Th align="right">Balance Due</Th>
                      <Th>Status</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredFarmerReports.map((r) => {
                      const isClear = r.balance <= 0 && r.settlementFinal > 0;
                      const hasDue = r.balance > 0;

                      return (
                        <Tr key={r.farmer.id}>
                          {/* Farmer */}
                          <Td>
                            <div style={{ fontWeight: 600, color: "var(--color-text)" }}>
                              {r.farmer.name || r.farmer.farmerName || `Farmer #${r.farmer.id}`}
                            </div>
                            <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                              {r.farmer.farmerCode}
                            </div>
                          </Td>

                          {/* Gross Sales */}
                          <Td align="right">
                            <span style={{ fontWeight: 500 }}>{formatCurrency(r.sales)}</span>
                          </Td>

                          {/* Deductions */}
                          <Td align="right">
                            <span style={{ color: "var(--color-danger)" }}>
                              {r.deductions > 0 ? `-${formatCurrency(r.deductions)}` : "—"}
                            </span>
                          </Td>

                          {/* Inputs */}
                          <Td align="right">
                            <span style={{ color: "var(--color-text-muted)" }}>
                              {r.inputs > 0 ? formatCurrency(r.inputs) : "—"}
                            </span>
                          </Td>

                          {/* Labour */}
                          <Td align="right">
                            <span style={{ color: "var(--color-text-muted)" }}>
                              {r.labour > 0 ? formatCurrency(r.labour) : "—"}
                            </span>
                          </Td>

                          {/* Settlement Net */}
                          <Td align="right">
                            <span style={{ fontWeight: 600, color: "var(--color-text)" }}>
                              {formatCurrency(r.settlementFinal)}
                            </span>
                          </Td>

                          {/* Paid */}
                          <Td align="right">
                            <span style={{ color: "var(--color-success)", fontWeight: 600 }}>
                              {formatCurrency(r.payments)}
                            </span>
                          </Td>

                          {/* Balance Due */}
                          <Td align="right">
                            <span
                              style={{
                                fontWeight: 700,
                                color: hasDue ? "var(--color-warning)" : "var(--color-success)",
                              }}
                            >
                              {formatCurrency(r.balance)}
                            </span>
                          </Td>

                          {/* Status */}
                          <Td>
                            {isClear ? (
                              <Badge variant="success">Fully Settled</Badge>
                            ) : hasDue ? (
                              <Badge variant="warning">Payout Due</Badge>
                            ) : (
                              <Badge variant="neutral">No Activity</Badge>
                            )}
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </CardBody>
        </Card>
      )}

      {/* Tab Content 2: Recent Sales */}
      {activeTab === "SALES" && (
        <Card>
          <CardBody style={{ padding: 0 }}>
            {recentSales.length === 0 ? (
              <EmptyState
                icon="🌾"
                title="No recent market sales"
                description="Recorded auctions will appear here chronologically."
              />
            ) : (
              <TableContainer>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Sale Date</Th>
                      <Th>Farmer</Th>
                      <Th>Market / Mandi</Th>
                      <Th>Buyer</Th>
                      <Th align="right">Quantity & Unit</Th>
                      <Th align="right">Rate / Unit</Th>
                      <Th align="right">Gross Proceeds</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {recentSales.map((s) => {
                      const farmer = farmerMap.get(s.farmerId);

                      return (
                        <Tr key={s.id}>
                          <Td>
                            <span style={{ fontWeight: 500 }}>
                              {s.saleDate ? s.saleDate.split("T")[0] : "—"}
                            </span>
                          </Td>

                          <Td>
                            <div style={{ fontWeight: 600 }}>{farmer?.name || `Farmer #${s.farmerId}`}</div>
                            <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                              {farmer?.farmerCode}
                            </div>
                          </Td>

                          <Td>{s.marketName || "APMC Mandi"}</Td>
                          <Td>{s.buyerName || "General Trader"}</Td>

                          <Td align="right">
                            <span style={{ fontWeight: 600 }}>{s.quantitySold}</span>{" "}
                            <Badge variant="neutral">{s.unit || "BAG"}</Badge>
                          </Td>

                          <Td align="right">
                            {formatCurrency(Number(s.ratePerUnit || 0))} / {s.unit || "unit"}
                          </Td>

                          <Td align="right">
                            <span style={{ fontWeight: 700, color: "var(--color-primary)" }}>
                              {formatCurrency(Number(s.grossAmount || 0))}
                            </span>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}