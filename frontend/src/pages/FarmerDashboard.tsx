import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Skeleton,
  StatCard,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  LandParcelIcon,
  CropSeasonIcon,
  HarvestYieldIcon,
  MarketAuctionIcon,
  FieldVisitIcon,
  SettlementLedgerIcon,
  PaymentReceiptIcon,
  LabourExpenseIcon,
  EmptyFarmIllustration,
  CropBadgeIcon,
} from "../components/ui";

import farmerHeroImg from "../assets/farmer_hero.jpg";
import "./FarmerDashboard.css";

/* ==========================================================================
   TYPE DEFINITIONS
   ========================================================================== */

interface Farmer {
  id: number;
  name?: string;
  farmerName?: string;
  farmerCode?: string;
  farmer_code?: string;
  phone?: string;
  mobile?: string;
}

interface RecordItem {
  id?: number;
  farmerId?: number;
  farmer_id?: number;
  amount?: number;
  paymentAmount?: number;
  payment_amount?: number;
  grossAmount?: number;
  gross_amount?: number;
  finalAmount?: number;
  final_amount?: number;
  finalSettlement?: number;
  final_settlement?: number;
  quantity?: number;
  quantitySold?: number;
  quantity_sold?: number;
  cropName?: string;
  crop_name?: string;
  unit?: string;
  harvestDate?: string;
  harvest_date?: string;
  saleDate?: string;
  sale_date?: string;
  marketName?: string;
  paymentDate?: string;
  paymentMode?: string;
  referenceNumber?: string;
  settlementStatus?: string;
  status?: string;
}

interface AppointmentItem {
  id: number;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "RESCHEDULED" | "COMPLETED" | "CANCELLED";
  inspectionDate?: string;
  startTime?: string;
  endTime?: string;
  cropType?: string;
  fieldName?: string;
}

function cleanArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.results)) return obj.results as T[];
    if (Array.isArray(obj.appointments)) return obj.appointments as T[];
    if (Array.isArray(obj.fields)) return obj.fields as T[];
  }
  return [];
}

function getNumber(...values: unknown[]): number {
  for (const v of values) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

export default function FarmerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [farmer, setFarmer] = useState<Farmer | null>(null);
  const [fields, setFields] = useState<RecordItem[]>([]);
  const [cropSeasons, setCropSeasons] = useState<RecordItem[]>([]);
  const [harvests, setHarvests] = useState<RecordItem[]>([]);
  const [marketSales, setMarketSales] = useState<RecordItem[]>([]);
  const [payments, setPayments] = useState<RecordItem[]>([]);
  const [settlements, setSettlements] = useState<RecordItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    if (!user) return;
    if (user.role !== "FARMER" || !user.farmerId) {
      setError("This dashboard is available only for registered farmer accounts.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const farmerId = Number(user.farmerId);

    try {
      const [
        farmerRes,
        fieldRes,
        seasonRes,
        harvestRes,
        saleRes,
        paymentRes,
        settlementRes,
        appointmentRes,
      ] = await Promise.all([
        api.get(`/farmers/${farmerId}`),
        api.get("/fields"),
        api.get("/crop-seasons"),
        api.get("/harvests"),
        api.get("/market-sales"),
        api.get("/farmer-payments"),
        api.get("/settlements"),
        api.get("/inspections/my-appointments").catch(() => ({ data: { appointments: [] } })),
      ]);

      setFarmer(farmerRes.data?.farmer || farmerRes.data || null);

      const filterByFarmer = (items: RecordItem[]) =>
        items.filter((item) => {
          const fid = getNumber(item.farmerId, item.farmer_id);
          return fid === farmerId;
        });

      setFields(filterByFarmer(cleanArray<RecordItem>(fieldRes.data)));
      setCropSeasons(filterByFarmer(cleanArray<RecordItem>(seasonRes.data)));
      setHarvests(filterByFarmer(cleanArray<RecordItem>(harvestRes.data)));
      setMarketSales(filterByFarmer(cleanArray<RecordItem>(saleRes.data)));
      setPayments(filterByFarmer(cleanArray<RecordItem>(paymentRes.data)));
      setSettlements(filterByFarmer(cleanArray<RecordItem>(settlementRes.data)));
      setAppointments(cleanArray<AppointmentItem>(appointmentRes.data));
    } catch (err: unknown) {
      console.error("Farmer dashboard load error:", err);
      const msg = err instanceof Error ? err.message : "Unable to load dashboard data.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.farmerId]);

  /* ------------------------------------------------------------------------
     Calculations & Metrics
     ------------------------------------------------------------------------ */
  const metrics = useMemo(() => {
    const grossSales = marketSales.reduce(
      (acc, s) => acc + getNumber(s.grossAmount, s.gross_amount, s.amount),
      0
    );

    const totalPaid = payments.reduce(
      (acc, p) => acc + getNumber(p.amount, p.paymentAmount, p.payment_amount),
      0
    );

    const settlementValue = settlements.reduce(
      (acc, s) =>
        acc +
        getNumber(
          s.finalSettlement,
          s.final_settlement,
          s.finalAmount,
          s.final_amount,
          s.amount
        ),
      0
    );

    const pendingBalance = Math.max(0, settlementValue - totalPaid);

    const pendingVisits = appointments.filter((a) => a.status === "PENDING").length;
    const confirmedVisits = appointments.filter((a) => a.status === "ACCEPTED").length;
    const completedVisits = appointments.filter((a) => a.status === "COMPLETED").length;

    return {
      fieldsCount: fields.length,
      seasonsCount: cropSeasons.length,
      harvestsCount: harvests.length,
      salesCount: marketSales.length,
      grossSales,
      totalPaid,
      settlementValue,
      pendingBalance,
      pendingVisits,
      confirmedVisits,
      completedVisits,
      totalVisits: appointments.length,
    };
  }, [fields, cropSeasons, harvests, marketSales, payments, settlements, appointments]);

  const recentSales = useMemo(() => {
    return [...marketSales]
      .sort((a, b) =>
        String(b.saleDate || b.sale_date || "").localeCompare(
          String(a.saleDate || a.sale_date || "")
        )
      )
      .slice(0, 5);
  }, [marketSales]);

  const recentPayments = useMemo(() => {
    return [...payments]
      .sort((a, b) =>
        String(b.paymentDate || "").localeCompare(String(a.paymentDate || ""))
      )
      .slice(0, 5);
  }, [payments]);

  const formatCurrency = (val: number) =>
    `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const farmerDisplayName =
    farmer?.name || farmer?.farmerName || user?.username || "Farmer";
  const farmerDisplayCode =
    farmer?.farmerCode || farmer?.farmer_code || `FAR-${user?.farmerId || "001"}`;

  return (
    <div className="farmer-dashboard-root">
      {/* ------------------------------------------------------------------
          1. Welcoming Agricultural Hero Banner
          ------------------------------------------------------------------ */}
      <div className="farmer-hero">
        <div
          className="farmer-hero__image-bg"
          style={{ backgroundImage: `url(${farmerHeroImg})` }}
          aria-hidden="true"
        />
        <div className="farmer-hero__overlay" aria-hidden="true" />
        <div className="farmer-hero__content">
          <div className="farmer-hero__tag">
            <span>🌱</span> Farmer Self-Service Portal
          </div>
          <h1 className="farmer-hero__title">
            Welcome back, {farmerDisplayName}!
          </h1>
          <p className="farmer-hero__subtitle">
            Your all-in-one farm book: check land parcels, track crop cycles, view mandi auction proceeds, and request certified agronomist field visits.
          </p>
          <div className="farmer-hero__actions">
            <Button
              variant="primary"
              className="farmer-btn--white"
              onClick={() => navigate("/my-fields")}
            >
              🌱 View My Land Parcels
            </Button>
            <Button
              variant="outline"
              style={{ color: "#FFFFFF", borderColor: "rgba(255,255,255,0.4)" }}
              onClick={() => navigate("/field-inspections")}
            >
              📋 Book a Field Visit
            </Button>
            <Button
              variant="ghost"
              style={{ color: "#D1E7DD" }}
              onClick={loadData}
              disabled={loading}
            >
              ↻ Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------
          Notifications
          ------------------------------------------------------------------ */}
      {error && (
        <Alert variant="error" title="Notice" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* ------------------------------------------------------------------
          2. Farm Profile & Account Identification Strip
          ------------------------------------------------------------------ */}
      <div className="farmer-profile-strip">
        <div className="farmer-profile-strip__left">
          <div className="farmer-profile-avatar" aria-hidden="true">
            👨‍🌾
          </div>
          <div className="farmer-profile-info">
            <h3>{farmerDisplayName}</h3>
            <div className="farmer-profile-meta">
              <span>
                Farmer Code: <strong>{farmerDisplayCode}</strong>
              </span>
              {farmer?.phone && <span>• Phone: {farmer.phone}</span>}
              <span>• Registered Land Plots: <strong>{metrics.fieldsCount}</strong></span>
            </div>
          </div>
        </div>

        <div className="farmer-profile-strip__badges">
          <Badge variant="success">Active Account</Badge>
          <Badge variant="forest">{metrics.seasonsCount} Active Cycles</Badge>
          {metrics.pendingVisits > 0 && (
            <Badge variant="warning">{metrics.pendingVisits} Visit Pending</Badge>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------
          3. Quick Status KPI Cards
          ------------------------------------------------------------------ */}
      <div className="farmer-kpi-grid">
        <StatCard
          label="Total Crop Sales"
          value={formatCurrency(metrics.grossSales)}
          icon="🌾"
          subtitle={`${metrics.salesCount} produce lots liquidated`}
          onClick={() => navigate("/my-market-sales")}
        />

        <StatCard
          label="Disbursed to Bank"
          value={formatCurrency(metrics.totalPaid)}
          icon="💵"
          subtitle="Cleared bank transfer credits"
          badge={<Badge variant="success">Paid Out</Badge>}
          onClick={() => navigate("/my-payments")}
        />

        <StatCard
          label="Pending Settlement"
          value={formatCurrency(metrics.pendingBalance)}
          icon="⏳"
          subtitle={
            metrics.pendingBalance > 0
              ? "Receivable upon office sign-off"
              : "All seasonal accounts clear"
          }
          badge={
            <Badge variant={metrics.pendingBalance > 0 ? "warning" : "success"}>
              {metrics.pendingBalance > 0 ? "Receivable" : "Clear"}
            </Badge>
          }
          onClick={() => navigate("/my-settlements")}
        />

        <StatCard
          label="Field Inspection Visits"
          value={
            metrics.confirmedVisits > 0
              ? `${metrics.confirmedVisits} Confirmed`
              : metrics.pendingVisits > 0
                ? `${metrics.pendingVisits} Pending`
                : `${metrics.completedVisits} Completed`
          }
          icon="📋"
          subtitle="On-site agronomist diagnoses"
          badge={
            <Badge variant={metrics.confirmedVisits > 0 ? "success" : "info"}>
              {metrics.totalVisits} Recorded
            </Badge>
          }
          onClick={() => navigate("/field-inspections")}
        />
      </div>

      {/* ------------------------------------------------------------------
          4. Visual Feature Cards (8 Core Operational Modules)
          ------------------------------------------------------------------ */}
      <section className="farmer-modules-section">
        <div className="farmer-section-header">
          <div>
            <h2 className="farmer-section-title">Farm Management Hub</h2>
            <p className="farmer-section-desc">
              Select any card to record farming activities or review financial statements.
            </p>
          </div>
        </div>

        <div className="farmer-feature-grid">
          {/* 1. My Land & Fields */}
          <div
            className="farmer-feature-card"
            onClick={() => navigate("/my-fields")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate("/my-fields")}
          >
            <div className="farmer-feature-card__top">
              <div
                className="farmer-feature-icon-wrapper"
                style={{ backgroundColor: "#E8F3ED" }}
              >
                <LandParcelIcon size={26} color="#174D35" />
              </div>
              <Badge variant="forest">{metrics.fieldsCount} Parcels</Badge>
            </div>
            <div className="farmer-feature-card__body">
              <h4>My Fields</h4>
              <p>View registered land boundaries, survey numbers, and borewell irrigation.</p>
            </div>
            <div className="farmer-feature-card__footer">
              <span>Open Land Plots</span>
              <span>➔</span>
            </div>
          </div>

          {/* 2. Crop Seasons */}
          <div
            className="farmer-feature-card"
            onClick={() => navigate("/my-crop-seasons")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate("/my-crop-seasons")}
          >
            <div className="farmer-feature-card__top">
              <div
                className="farmer-feature-icon-wrapper"
                style={{ backgroundColor: "#F0FDF4" }}
              >
                <CropSeasonIcon size={26} color="#2F855A" />
              </div>
              <Badge variant="success">{metrics.seasonsCount} Cycles</Badge>
            </div>
            <div className="farmer-feature-card__body">
              <h4>Crop Seasons</h4>
              <p>Track sowing dates, expected harvest schedules, and crop growth stages.</p>
            </div>
            <div className="farmer-feature-card__footer">
              <span>View Crop Cycles</span>
              <span>➔</span>
            </div>
          </div>

          {/* 3. Harvest Yields */}
          <div
            className="farmer-feature-card"
            onClick={() => navigate("/my-harvests")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate("/my-harvests")}
          >
            <div className="farmer-feature-card__top">
              <div
                className="farmer-feature-icon-wrapper"
                style={{ backgroundColor: "#FEF3C7" }}
              >
                <HarvestYieldIcon size={26} color="#D97706" />
              </div>
              <Badge variant="warning">{metrics.harvestsCount} Logged</Badge>
            </div>
            <div className="farmer-feature-card__body">
              <h4>My Harvest</h4>
              <p>Log harvested bags, quintals, produce quality grades, and lot batches.</p>
            </div>
            <div className="farmer-feature-card__footer">
              <span>View Harvest Records</span>
              <span>➔</span>
            </div>
          </div>

          {/* 4. Market Sales */}
          <div
            className="farmer-feature-card"
            onClick={() => navigate("/my-market-sales")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate("/my-market-sales")}
          >
            <div className="farmer-feature-card__top">
              <div
                className="farmer-feature-icon-wrapper"
                style={{ backgroundColor: "#DCFCE7" }}
              >
                <MarketAuctionIcon size={26} color="#15803D" />
              </div>
              <Badge variant="success">{metrics.salesCount} Sales</Badge>
            </div>
            <div className="farmer-feature-card__body">
              <h4>Market Sales</h4>
              <p>Check mandi auction rates, weight receipts, and gross realization values.</p>
            </div>
            <div className="farmer-feature-card__footer">
              <span>Check Sale Records</span>
              <span>➔</span>
            </div>
          </div>

          {/* 5. Field Inspections */}
          <div
            className="farmer-feature-card"
            onClick={() => navigate("/field-inspections")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate("/field-inspections")}
          >
            <div className="farmer-feature-card__top">
              <div
                className="farmer-feature-icon-wrapper"
                style={{ backgroundColor: "#CCFBF1" }}
              >
                <FieldVisitIcon size={26} color="#0D9488" />
              </div>
              <Badge variant={metrics.pendingVisits > 0 ? "warning" : "forest"}>
                {metrics.pendingVisits > 0 ? "Pending Request" : "Book Visit"}
              </Badge>
            </div>
            <div className="farmer-feature-card__body">
              <h4>Field Inspections</h4>
              <p>Request an in-person field inspection by an agronomist and view diagnostic reports.</p>
            </div>
            <div className="farmer-feature-card__footer">
              <span>Book / View Visits</span>
              <span>➔</span>
            </div>
          </div>

          {/* 6. My Settlements */}
          <div
            className="farmer-feature-card"
            onClick={() => navigate("/my-settlements")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate("/my-settlements")}
          >
            <div className="farmer-feature-card__top">
              <div
                className="farmer-feature-icon-wrapper"
                style={{ backgroundColor: "#E0E7FF" }}
              >
                <SettlementLedgerIcon size={26} color="#4338CA" />
              </div>
              <Badge variant="neutral">{settlements.length} Statements</Badge>
            </div>
            <div className="farmer-feature-card__body">
              <h4>My Settlements</h4>
              <p>Seasonal reconciliation: crop revenues netted against seed, fertilizer, and labour.</p>
            </div>
            <div className="farmer-feature-card__footer">
              <span>View Net Balances</span>
              <span>➔</span>
            </div>
          </div>

          {/* 7. My Payments */}
          <div
            className="farmer-feature-card"
            onClick={() => navigate("/my-payments")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate("/my-payments")}
          >
            <div className="farmer-feature-card__top">
              <div
                className="farmer-feature-icon-wrapper"
                style={{ backgroundColor: "#D1FAE5" }}
              >
                <PaymentReceiptIcon size={26} color="#047857" />
              </div>
              <Badge variant="success">{payments.length} Receipts</Badge>
            </div>
            <div className="farmer-feature-card__body">
              <h4>My Payments</h4>
              <p>Verify bank credit reference numbers, UTR transaction dates, and cash vouchers.</p>
            </div>
            <div className="farmer-feature-card__footer">
              <span>View Bank Credits</span>
              <span>➔</span>
            </div>
          </div>

          {/* 8. My Labour Expenses */}
          <div
            className="farmer-feature-card"
            onClick={() => navigate("/my-labour-expenses")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate("/my-labour-expenses")}
          >
            <div className="farmer-feature-card__top">
              <div
                className="farmer-feature-icon-wrapper"
                style={{ backgroundColor: "#FEF3C7" }}
              >
                <LabourExpenseIcon size={26} color="#B45309" />
              </div>
              <Badge variant="neutral">Work Records</Badge>
            </div>
            <div className="farmer-feature-card__body">
              <h4>Labour Expenses</h4>
              <p>Log weeding, plowing, spraying, and harvesting wages paid to field workers.</p>
            </div>
            <div className="farmer-feature-card__footer">
              <span>Track Worker Wages</span>
              <span>➔</span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------
          5. Recent Activity: Mandi Sales & Bank Disbursements
          ------------------------------------------------------------------ */}
      <div className="farmer-activity-grid">
        {/* Recent Produce Sales */}
        <Card>
          <div className="farmer-card-header">
            <div>
              <h3>Recent Mandi Produce Sales</h3>
              <span>Auction weight receipts and prices</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/my-market-sales")}
            >
              View All ➔
            </Button>
          </div>
          <CardBody style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: "20px" }}>
                <Skeleton height="36px" style={{ marginBottom: "10px" }} />
                <Skeleton height="36px" />
              </div>
            ) : recentSales.length === 0 ? (
              <div style={{ padding: "30px 20px", textAlign: "center" }}>
                <EmptyFarmIllustration size={100} />
                <div style={{ fontWeight: 700, marginTop: "12px", color: "#18251E" }}>
                  No produce sales logged yet
                </div>
                <div style={{ fontSize: "13px", color: "#768A7E", marginBottom: "16px" }}>
                  When your harvested lot is weighed and sold, it will be listed here.
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/my-market-sales")}
                >
                  Record Produce Sale
                </Button>
              </div>
            ) : (
              <TableContainer>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Crop</Th>
                      <Th>Date</Th>
                      <Th align="right">Qty Sold</Th>
                      <Th align="right">Amount</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {recentSales.map((sale, idx) => (
                      <Tr key={sale.id || idx}>
                        <Td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <CropBadgeIcon cropName={sale.cropName || sale.crop_name || "Crop"} />
                            <span style={{ fontWeight: 600 }}>
                              {sale.cropName || sale.crop_name || "Produce"}
                            </span>
                          </div>
                        </Td>
                        <Td>{sale.saleDate || sale.sale_date || "—"}</Td>
                        <Td align="right">
                          {sale.quantitySold || sale.quantity_sold || "—"}{" "}
                          <span style={{ fontSize: "11px", color: "#768A7E" }}>
                            {sale.unit || "KG"}
                          </span>
                        </Td>
                        <Td align="right">
                          <strong style={{ color: "#174D35" }}>
                            {formatCurrency(
                              getNumber(sale.grossAmount, sale.gross_amount, sale.amount)
                            )}
                          </strong>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </CardBody>
        </Card>

        {/* Recent Bank Payments */}
        <Card>
          <div className="farmer-card-header">
            <div>
              <h3>Recent Payment Receipts</h3>
              <span>Bank transfers & cleared vouchers</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/my-payments")}
            >
              View All ➔
            </Button>
          </div>
          <CardBody style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: "20px" }}>
                <Skeleton height="36px" style={{ marginBottom: "10px" }} />
                <Skeleton height="36px" />
              </div>
            ) : recentPayments.length === 0 ? (
              <div style={{ padding: "30px 20px", textAlign: "center" }}>
                <EmptyFarmIllustration size={100} />
                <div style={{ fontWeight: 700, marginTop: "12px", color: "#18251E" }}>
                  No payment vouchers yet
                </div>
                <div style={{ fontSize: "13px", color: "#768A7E", marginBottom: "16px" }}>
                  Bank disbursals and cash settlement payments will appear here.
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/my-payments")}
                >
                  View Payment Ledger
                </Button>
              </div>
            ) : (
              <TableContainer>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Payment Date</Th>
                      <Th>Mode</Th>
                      <Th>Reference / UTR</Th>
                      <Th align="right">Disbursed</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {recentPayments.map((p, idx) => (
                      <Tr key={p.id || idx}>
                        <Td>{p.paymentDate || "—"}</Td>
                        <Td>
                          <Badge variant="success">
                            {p.paymentMode || "BANK"}
                          </Badge>
                        </Td>
                        <Td>
                          <span style={{ fontFamily: "monospace", fontSize: "12px" }}>
                            {p.referenceNumber || "CLEAR-ACK"}
                          </span>
                        </Td>
                        <Td align="right">
                          <strong style={{ color: "#2F855A" }}>
                            {formatCurrency(
                              getNumber(p.amount, p.paymentAmount, p.payment_amount)
                            )}
                          </strong>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}