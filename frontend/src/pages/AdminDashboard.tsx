import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

import {
  Alert,
  Badge,
  BarChart,
  Button,
  Card,
  CardBody,
  CardHeader,
  DonutChart,
  EmptyState,
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
  LandParcelIcon,
  CropSeasonIcon,
  HarvestYieldIcon,
  MarketAuctionIcon,
  FieldVisitIcon,
  SettlementLedgerIcon,
  PaymentReceiptIcon,
  SeedProductIcon,
} from "../components/ui";

import dealerHeroImg from "../assets/dealer_hero.jpg";
import "./AdminDashboard.css";

/* ==========================================================================
   TYPE DEFINITIONS
   ========================================================================== */

interface Farmer {
  id: number;
  name?: string;
  farmerName?: string;
  farmerCode?: string;
  phone?: string;
  mobile?: string;
  villageName?: string;
}

interface Field {
  id: number;
  farmerId: number;
  fieldName?: string;
  surveyNumber?: string;
  acreage?: number | string;
  soilType?: string;
  irrigationType?: string;
}

interface CropSeason {
  id: number;
  farmerId: number;
  fieldId?: number;
  cropName?: string;
  variety?: string;
  seasonName?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

interface Harvest {
  id: number;
  farmerId: number;
  cropSeasonId?: number;
  harvestDate?: string;
  quantity?: number;
  unit?: string;
  grade?: string;
}

interface MarketSale {
  id: number;
  farmerId: number;
  harvestId?: number;
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

interface ProductItem {
  id: number;
  productName: string;
  category?: string | null;
  brandName?: string | null;
  unit?: string | null;
}

interface InspectionAppointmentItem {
  id: number;
  farmerId: number;
  farmerName?: string | null;
  fieldName?: string | null;
  cropType?: string | null;
  inspectionDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "RESCHEDULED" | "COMPLETED" | "CANCELLED";
}

/* ==========================================================================
   HELPER UTILITIES
   ========================================================================== */

function getNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(getNumber(value));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(getNumber(value));
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  const parts = dateString.split("-");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateString;
}

function extractArray<T>(response: unknown, keyHints: string[] = []): T[] {
  if (Array.isArray(response)) return response as T[];
  if (!response || typeof response !== "object") return [];

  const obj = response as Record<string, unknown>;

  // Check Axios .data property
  if ("data" in obj) {
    return extractArray<T>(obj.data, keyHints);
  }

  // Check specific keys
  for (const key of keyHints) {
    if (Array.isArray(obj[key])) {
      return obj[key] as T[];
    }
  }

  // Check generic collection properties
  if (Array.isArray(obj.items)) return obj.items as T[];
  if (Array.isArray(obj.results)) return obj.results as T[];

  return [];
}

/* ==========================================================================
   ADMIN DASHBOARD COMPONENT
   ========================================================================== */

function AdminDashboard() {
  const navigate = useNavigate();

  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [cropSeasons, setCropSeasons] = useState<CropSeason[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [marketSales, setMarketSales] = useState<MarketSale[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [payments, setPayments] = useState<FarmerPayment[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [appointments, setAppointments] = useState<InspectionAppointmentItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const [
        farmersRes,
        fieldsRes,
        seasonsRes,
        harvestsRes,
        salesRes,
        settlementsRes,
        paymentsRes,
        productsRes,
        appointmentsRes,
      ] = await Promise.all([
        api.get("/farmers"),
        api.get("/fields"),
        api.get("/crop-seasons"),
        api.get("/harvests"),
        api.get("/market-sales"),
        api.get("/settlements"),
        api.get("/farmer-payments"),
        api.get("/products").catch(() => ({ data: [] })),
        api.get("/inspections/admin/appointments").catch(() => ({ data: { appointments: [] } })),
      ]);

      setFarmers(extractArray<Farmer>(farmersRes, ["farmers"]));
      setFields(extractArray<Field>(fieldsRes, ["fields"]));
      setCropSeasons(extractArray<CropSeason>(seasonsRes, ["cropSeasons", "crop_seasons"]));
      setHarvests(extractArray<Harvest>(harvestsRes, ["harvests"]));
      setMarketSales(extractArray<MarketSale>(salesRes, ["marketSales", "market_sales", "sales"]));
      setSettlements(extractArray<Settlement>(settlementsRes, ["settlements"]));
      setPayments(extractArray<FarmerPayment>(paymentsRes, ["payments", "farmerPayments"]));
      setProducts(extractArray<ProductItem>(productsRes, ["products"]));
      setAppointments(extractArray<InspectionAppointmentItem>(appointmentsRes, ["appointments"]));
    } catch (err) {
      console.error("Failed to load admin dashboard data:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load administrator dashboard. Please verify connection."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  /* ------------------------------------------------------------------------
     Calculations & Aggregations
     ------------------------------------------------------------------------ */

  const metrics = useMemo(() => {
    const totalAcreage = fields.reduce((sum, f) => sum + getNumber(f.acreage), 0);

    const grossSales = marketSales.reduce(
      (sum, s) => sum + getNumber(s.grossAmount),
      0
    );

    const totalPayments = payments.reduce(
      (sum, p) => sum + getNumber(p.amount),
      0
    );

    const settlementValue = settlements.reduce(
      (sum, st) => sum + getNumber(st.finalAmount),
      0
    );

    const outstandingPayable = Math.max(settlementValue - totalPayments, 0);

    const pendingAppointments = appointments.filter((a) => a.status === "PENDING").length;
    const acceptedAppointments = appointments.filter((a) => a.status === "ACCEPTED").length;
    const productCategories = new Set(products.map((p) => p.category).filter(Boolean)).size;

    return {
      totalFarmers: farmers.length,
      totalFields: fields.length,
      totalAcreage,
      cropSeasonsCount: cropSeasons.length,
      harvestsCount: harvests.length,
      marketSalesCount: marketSales.length,
      productsCount: products.length,
      productCategoriesCount: productCategories,
      appointmentsCount: appointments.length,
      pendingAppointments,
      acceptedAppointments,
      grossSales,
      settlementValue,
      totalPayments,
      outstandingPayable,
    };
  }, [farmers, fields, cropSeasons, harvests, marketSales, settlements, payments, products, appointments]);

  // Crop Distribution Data for Donut Chart
  const cropDistributionData = useMemo(() => {
    const cropCounts: Record<string, number> = {};
    for (const season of cropSeasons) {
      const name = season.cropName?.trim() || "Other Crop";
      cropCounts[name] = (cropCounts[name] || 0) + 1;
    }

    const palette = ["#174D35", "#2F855A", "#48BB78", "#319795", "#805AD5", "#DD6B20"];
    const entries = Object.entries(cropCounts);

    if (entries.length === 0) {
      return [
        { label: "Active Cycles", value: cropSeasons.length || 1, color: "#2F855A" },
      ];
    }

    return entries.map(([label, count], idx) => ({
      label,
      value: count,
      color: palette[idx % palette.length],
      formattedValue: `${count} cycle${count > 1 ? "s" : ""}`,
    }));
  }, [cropSeasons]);

  // Cash Flow Bar Chart Data
  const cashFlowChartData = useMemo(() => {
    return [
      {
        label: "Gross Sales",
        value: metrics.grossSales,
        color: "#174D35",
      },
      {
        label: "Settlements",
        value: metrics.settlementValue,
        color: "#2F855A",
      },
      {
        label: "Disbursed",
        value: metrics.totalPayments,
        color: "#319795",
      },
      {
        label: "Outstanding",
        value: metrics.outstandingPayable,
        color: "#DD6B20",
      },
    ];
  }, [metrics]);

  // Recent 5 Market Sales
  const recentSales = useMemo(() => {
    return [...marketSales]
      .sort((a, b) => String(b.saleDate).localeCompare(String(a.saleDate)))
      .slice(0, 5);
  }, [marketSales]);

  // Recent 5 Field Inspection Appointments
  const recentAppointments = useMemo(() => {
    return [...appointments]
      .sort((a, b) => b.id - a.id)
      .slice(0, 5);
  }, [appointments]);

  // Helper for Farmer Name
  const getFarmerName = (farmerId: number): string => {
    const farmer = farmers.find((f) => f.id === farmerId);
    if (!farmer) return `Farmer #${farmerId}`;
    return farmer.name || farmer.farmerName || farmer.farmerCode || `Farmer #${farmerId}`;
  };

  /* ------------------------------------------------------------------------
     RENDER: Loading State
     ------------------------------------------------------------------------ */
  if (loading) {
    return (
      <div className="al-admin-dashboard">
        <PageHeader
          eyebrow="AgriLedger Management"
          title="Executive Admin Dashboard"
          description="Consolidating agricultural operations, financial metrics, and AI decision systems."
        />

        <div className="al-kpi-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardBody>
                <Skeleton width="40%" height={14} style={{ marginBottom: 12 }} />
                <Skeleton width="60%" height={32} />
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="al-analytics-grid" style={{ marginTop: 24 }}>
          <Card>
            <CardBody>
              <Skeleton width="30%" height={20} style={{ marginBottom: 16 }} />
              <Skeleton width="100%" height={200} />
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <Skeleton width="40%" height={20} style={{ marginBottom: 16 }} />
              <Skeleton width="100%" height={200} />
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------
     RENDER: Error State
     ------------------------------------------------------------------------ */
  if (error) {
    return (
      <div className="al-admin-dashboard">
        <PageHeader
          eyebrow="AgriLedger Management"
          title="Executive Admin Dashboard"
        />

        <Alert
          variant="error"
          title="Unable to load dashboard data"
        >
          {error}
        </Alert>

        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <Button variant="primary" onClick={loadDashboard}>
            ↻ Retry Loading Dashboard
          </Button>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------
     RENDER: Dashboard Content
     ------------------------------------------------------------------------ */
  return (
    <div className="al-admin-dashboard">
      {/* Dealer Executive Hero Banner */}
      <div className="al-dealer-hero">
        <div
          className="al-dealer-hero__image-bg"
          style={{ backgroundImage: `url(${dealerHeroImg})` }}
        />
        <div className="al-dealer-hero__overlay" />
        <div className="al-dealer-hero__content">
          <div className="al-dealer-hero__tag">
            <span>🏢</span>
            <span>Dealer Enterprise Command</span>
          </div>
          <h1 className="al-dealer-hero__title">
            AgriLedger Business & Operations Hub
          </h1>
          <p className="al-dealer-hero__subtitle">
            Manage registered farmers, monitor land acreage, track harvests & market realization, oversee product inventory, and coordinate on-site field inspections.
          </p>
          <div className="al-dealer-hero__actions">
            <Button
              variant="primary"
              size="sm"
              icon="+"
              onClick={() => navigate("/farmers")}
            >
              Register Farmer
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon="🌾"
              onClick={() => navigate("/crop-seasons")}
            >
              Crop Seasons
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon="🏪"
              onClick={() => navigate("/market-sales")}
            >
              Record Market Sale
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon="📦"
              onClick={() => navigate("/products")}
            >
              Manage Products
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon="📋"
              onClick={() => navigate("/field-inspections")}
            >
              Field Inspections
            </Button>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <PageHeader
        eyebrow="Operations & Finance"
        title="Admin Executive Dashboard"
        description="Monitor real-time business health, crop production, settlements, and AI intelligence."
        actions={
          <Button
            variant="secondary"
            size="md"
            icon="↻"
            onClick={loadDashboard}
            disabled={loading}
          >
            Refresh Data
          </Button>
        }
      />

      {/* =====================================================
          SECTION 1: KEY PERFORMANCE METRICS (6 Visual KPI Cards)
      ====================================================== */}
      <section className="al-dashboard-section">
        <div className="al-kpi-grid">
          <StatCard
            label="Registered Farmers"
            value={formatNumber(metrics.totalFarmers)}
            icon={<LandParcelIcon size={24} />}
            subtitle="Active farmer community"
            badge={<Badge variant="success">Verified Ledger</Badge>}
            onClick={() => navigate("/farmers")}
          />

          <StatCard
            label="Cultivated Land"
            value={`${formatNumber(metrics.totalFields)} Fields`}
            icon={<LandParcelIcon size={24} />}
            subtitle={`${formatNumber(metrics.totalAcreage)} Total Acres Recorded`}
            onClick={() => navigate("/fields")}
          />

          <StatCard
            label="Crop Seasons"
            value={formatNumber(metrics.cropSeasonsCount)}
            icon={<CropSeasonIcon size={24} />}
            subtitle={`${formatNumber(metrics.harvestsCount)} Harvest Batches`}
            onClick={() => navigate("/crop-seasons")}
          />

          <StatCard
            label="Market Sales"
            value={formatNumber(metrics.marketSalesCount)}
            icon={<MarketAuctionIcon size={24} />}
            subtitle="Independent BAG / KG units"
            badge={<Badge variant="forest">Protected Units</Badge>}
            onClick={() => navigate("/market-sales")}
          />

          <StatCard
            label="Products Catalogue"
            value={`${formatNumber(metrics.productsCount)} Items`}
            icon={<SeedProductIcon size={24} />}
            subtitle={`${metrics.productCategoriesCount} Stock Categories`}
            badge={<Badge variant="neutral">Input Supply</Badge>}
            onClick={() => navigate("/products")}
          />

          <StatCard
            label="Field Inspections"
            value={`${formatNumber(metrics.appointmentsCount)} Visits`}
            icon={<FieldVisitIcon size={24} />}
            subtitle={`${metrics.acceptedAppointments} Confirmed`}
            badge={
              metrics.pendingAppointments > 0 ? (
                <Badge variant="warning">{metrics.pendingAppointments} Pending</Badge>
              ) : (
                <Badge variant="success">Up to Date</Badge>
              )
            }
            onClick={() => navigate("/field-inspections")}
          />
        </div>
      </section>

      {/* =====================================================
          SECTION 2: FINANCIAL HIGHLIGHTS & CASH FLOW
      ====================================================== */}
      <section className="al-dashboard-section">
        <div className="al-section-header">
          <span className="al-section-header__eyebrow">Financial Health</span>
          <h2 className="al-section-header__title">Cash Flow & Realization</h2>
          <p className="al-section-header__subtitle">
            Gross market realization, net settlements, and outstanding payable balances.
          </p>
        </div>

        <div className="al-financial-grid">
          <div className="al-financial-card">
            <span className="al-financial-card__label">Gross Market Sales</span>
            <strong className="al-financial-card__value">
              {formatCurrency(metrics.grossSales)}
            </strong>
            <span className="al-financial-card__subtext">
              Total crop sales realization
            </span>
          </div>

          <div className="al-financial-card">
            <span className="al-financial-card__label">Settlement Value</span>
            <strong className="al-financial-card__value">
              {formatCurrency(metrics.settlementValue)}
            </strong>
            <span className="al-financial-card__subtext">
              Final net payable after deductions
            </span>
          </div>

          <div className="al-financial-card">
            <span className="al-financial-card__label">Payments Disbursed</span>
            <strong className="al-financial-card__value" style={{ color: "var(--color-action-green, #2F855A)" }}>
              {formatCurrency(metrics.totalPayments)}
            </strong>
            <span className="al-financial-card__subtext">
              Paid to farmer bank accounts
            </span>
          </div>

          <div className="al-financial-card al-financial-card--highlight">
            <span className="al-financial-card__label">Outstanding Balance</span>
            <strong
              className="al-financial-card__value"
              style={{
                color: metrics.outstandingPayable > 0 ? "var(--color-primary-forest, #174D35)" : "var(--color-text-primary, #18251E)",
              }}
            >
              {formatCurrency(metrics.outstandingPayable)}
            </strong>
            <span className="al-financial-card__subtext">
              Remaining settlement liability
            </span>
          </div>
        </div>
      </section>

      {/* =====================================================
          SECTION 3: ANALYTICS & CHARTS
      ====================================================== */}
      <section className="al-dashboard-section">
        <div className="al-section-header">
          <span className="al-section-header__eyebrow">Visual Analytics</span>
          <h2 className="al-section-header__title">Cash Flow & Crop Distribution</h2>
          <p className="al-section-header__subtitle">
            Live comparisons calculated from verified agricultural and market records.
          </p>
        </div>

        <div className="al-analytics-grid">
          {/* Cash Flow Comparison Chart */}
          <Card>
            <CardHeader
              title="Financial Cash Flow Comparison"
              subtitle="Comparing real-time gross realization against settlements and payments"
            />
            <CardBody>
              <BarChart
                data={cashFlowChartData}
                height={220}
                primaryLabel="Rupees (₹)"
                emptyMessage="No financial transactions recorded yet."
              />
            </CardBody>
          </Card>

          {/* Crop Seasons Distribution */}
          <Card>
            <CardHeader
              title="Crop Production Distribution"
              subtitle="Breakdown of active crop cycles across registered acreage"
            />
            <CardBody>
              <DonutChart
                segments={cropDistributionData}
                centerValue={metrics.cropSeasonsCount}
                centerLabel="Active Crops"
                size={180}
              />
            </CardBody>
          </Card>
        </div>
      </section>

      {/* =====================================================
          SECTION 4: RECENT MARKET SALES & INSPECTION VISITS
      ====================================================== */}
      <section className="al-dashboard-section">
        <div className="al-section-header">
          <span className="al-section-header__eyebrow">Real-Time Transactions</span>
          <h2 className="al-section-header__title">Recent Market Sales</h2>
          <p className="al-section-header__subtitle">
            Latest crop sales entered in the AgriLedger accounting system.
          </p>
        </div>

        <Card>
          <CardHeader
            title="Market Sales Ledger"
            subtitle="Independent BAG and KG unit pricing without conversion factors"
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/market-sales")}
              >
                View All Sales →
              </Button>
            }
          />
          <CardBody style={{ padding: 0 }}>
            {recentSales.length === 0 ? (
              <EmptyState
                icon={<MarketAuctionIcon size={44} />}
                title="No market sales recorded"
                description="Market sales entered by farmers or admins will appear here with independent BAG/KG quantities."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate("/market-sales")}
                  >
                    Record First Sale
                  </Button>
                }
              />
            ) : (
              <TableContainer style={{ border: "none", borderRadius: 0, boxShadow: "none" }}>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Farmer</Th>
                      <Th>Sale Date</Th>
                      <Th>Market</Th>
                      <Th>Buyer</Th>
                      <Th>Quantity Sold</Th>
                      <Th>Rate per Unit</Th>
                      <Th style={{ textAlign: "right" }}>Gross Realization</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {recentSales.map((sale) => (
                      <Tr key={sale.id}>
                        <Td>
                          <strong>{getFarmerName(sale.farmerId)}</strong>
                        </Td>
                        <Td>{formatDate(sale.saleDate)}</Td>
                        <Td>{sale.marketName || "Local Mandi"}</Td>
                        <Td>{sale.buyerName || "—"}</Td>
                        <Td>
                          <Badge variant="neutral">
                            {formatNumber(getNumber(sale.quantitySold))}{" "}
                            {sale.unit || "UNIT"}
                          </Badge>
                        </Td>
                        <Td>
                          ₹{formatNumber(getNumber(sale.ratePerUnit))} /{" "}
                          {sale.unit || "UNIT"}
                        </Td>
                        <Td style={{ textAlign: "right" }}>
                          <strong style={{ color: "var(--color-primary-forest, #174D35)" }}>
                            {formatCurrency(getNumber(sale.grossAmount))}
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
      </section>

      {/* =====================================================
          SECTION 5: FIELD INSPECTIONS ACTIVITY
      ====================================================== */}
      <section className="al-dashboard-section">
        <div className="al-section-header">
          <span className="al-section-header__eyebrow">On-Site Pathology</span>
          <h2 className="al-section-header__title">Recent Field Inspection Requests</h2>
          <p className="al-section-header__subtitle">
            Farmer appointment bookings requiring dealer scheduling, review, or pathology reporting.
          </p>
        </div>

        <Card>
          <CardHeader
            title="Inspection Schedule Overview"
            subtitle={`${metrics.pendingAppointments} pending review, ${metrics.acceptedAppointments} confirmed visits`}
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/field-inspections")}
              >
                Manage All Inspections →
              </Button>
            }
          />
          <CardBody style={{ padding: 0 }}>
            {recentAppointments.length === 0 ? (
              <EmptyState
                icon={<FieldVisitIcon size={44} />}
                title="No inspection requests yet"
                description="Field inspection bookings submitted by registered farmers will appear here for review."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate("/field-inspections")}
                  >
                    Publish Inspection Slots
                  </Button>
                }
              />
            ) : (
              <TableContainer style={{ border: "none", borderRadius: 0, boxShadow: "none" }}>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Farmer</Th>
                      <Th>Field / Crop</Th>
                      <Th>Inspection Date</Th>
                      <Th>Time Slot</Th>
                      <Th>Status</Th>
                      <Th style={{ textAlign: "right" }}>Action</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {recentAppointments.map((apt) => (
                      <Tr key={apt.id}>
                        <Td>
                          <strong>{apt.farmerName || getFarmerName(apt.farmerId)}</strong>
                        </Td>
                        <Td>
                          <span>{apt.fieldName || "Field"}</span>
                          <span style={{ color: "var(--color-text-muted)", marginLeft: "6px", fontSize: "12px" }}>
                            ({apt.cropType || "General"})
                          </span>
                        </Td>
                        <Td>{formatDate(apt.inspectionDate)}</Td>
                        <Td>{apt.startTime ? `${apt.startTime} - ${apt.endTime}` : "—"}</Td>
                        <Td>
                          <Badge
                            variant={
                              apt.status === "PENDING"
                                ? "warning"
                                : apt.status === "ACCEPTED"
                                  ? "success"
                                  : apt.status === "COMPLETED"
                                    ? "forest"
                                    : "neutral"
                            }
                          >
                            {apt.status}
                          </Badge>
                        </Td>
                        <Td style={{ textAlign: "right" }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate("/field-inspections")}
                          >
                            Review →
                          </Button>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )}
          </CardBody>
        </Card>
      </section>

      {/* =====================================================
          SECTION 6: OPERATIONAL MANAGEMENT LAUNCHPAD
      ====================================================== */}
      <section className="al-dashboard-section">
        <div className="al-section-header">
          <span className="al-section-header__eyebrow">Enterprise Hub</span>
          <h2 className="al-section-header__title">Agricultural Operations Management</h2>
          <p className="al-section-header__subtitle">
            Direct shortcuts to all core business and agricultural modules.
          </p>
        </div>

        <div className="al-modules-grid">
          <div className="al-module-card" onClick={() => navigate("/farmers")}>
            <div className="al-module-card__top">
              <div className="al-module-card__icon">
                <LandParcelIcon size={22} />
              </div>
              <span className="al-module-card__count">{metrics.totalFarmers}</span>
            </div>
            <h4 className="al-module-card__title">Farmers</h4>
            <p className="al-module-card__desc">
              Profiles, KYC details, contact info and village linkage.
            </p>
          </div>

          <div className="al-module-card" onClick={() => navigate("/fields")}>
            <div className="al-module-card__top">
              <div className="al-module-card__icon">
                <LandParcelIcon size={22} />
              </div>
              <span className="al-module-card__count">{metrics.totalFields}</span>
            </div>
            <h4 className="al-module-card__title">Fields</h4>
            <p className="al-module-card__desc">
              Acreage, soil composition, and irrigation status.
            </p>
          </div>

          <div className="al-module-card" onClick={() => navigate("/crop-seasons")}>
            <div className="al-module-card__top">
              <div className="al-module-card__icon">
                <CropSeasonIcon size={22} />
              </div>
              <span className="al-module-card__count">{metrics.cropSeasonsCount}</span>
            </div>
            <h4 className="al-module-card__title">Crop Seasons</h4>
            <p className="al-module-card__desc">
              Agricultural cycles, crop varieties, and progress tracking.
            </p>
          </div>

          <div className="al-module-card" onClick={() => navigate("/products")}>
            <div className="al-module-card__top">
              <div className="al-module-card__icon">
                <SeedProductIcon size={22} />
              </div>
              <span className="al-module-card__count">{metrics.productsCount}</span>
            </div>
            <h4 className="al-module-card__title">Input Products</h4>
            <p className="al-module-card__desc">
              Master catalogue of seeds, fertilizers, and crop chemicals.
            </p>
          </div>

          <div className="al-module-card" onClick={() => navigate("/harvests")}>
            <div className="al-module-card__top">
              <div className="al-module-card__icon">
                <HarvestYieldIcon size={22} />
              </div>
              <span className="al-module-card__count">{metrics.harvestsCount}</span>
            </div>
            <h4 className="al-module-card__title">Harvests</h4>
            <p className="al-module-card__desc">
              Record and verify harvested crop yields by batch.
            </p>
          </div>

          <div className="al-module-card" onClick={() => navigate("/market-sales")}>
            <div className="al-module-card__top">
              <div className="al-module-card__icon">
                <MarketAuctionIcon size={22} />
              </div>
              <span className="al-module-card__count">{metrics.marketSalesCount}</span>
            </div>
            <h4 className="al-module-card__title">Market Sales</h4>
            <p className="al-module-card__desc">
              Independent BAG/KG unit pricing with zero conversion.
            </p>
          </div>

          <div className="al-module-card" onClick={() => navigate("/field-inspections")}>
            <div className="al-module-card__top">
              <div className="al-module-card__icon">
                <FieldVisitIcon size={22} />
              </div>
              <span className="al-module-card__count">{metrics.appointmentsCount}</span>
            </div>
            <h4 className="al-module-card__title">Field Inspections</h4>
            <p className="al-module-card__desc">
              Publish slots, manage farmer visits, and record pathology.
            </p>
          </div>

          <div className="al-module-card" onClick={() => navigate("/transport")}>
            <div className="al-module-card__top">
              <div className="al-module-card__icon">🚚</div>
              <span className="al-module-card__count">Freight</span>
            </div>
            <h4 className="al-module-card__title">Transport</h4>
            <p className="al-module-card__desc">
              Track freight, truck assignments, and loading charges.
            </p>
          </div>

          <div className="al-module-card" onClick={() => navigate("/settlements")}>
            <div className="al-module-card__top">
              <div className="al-module-card__icon">
                <SettlementLedgerIcon size={22} />
              </div>
              <span className="al-module-card__count">{settlements.length}</span>
            </div>
            <h4 className="al-module-card__title">Settlements</h4>
            <p className="al-module-card__desc">
              Final accounting sheets with deductions and net payable.
            </p>
          </div>

          <div className="al-module-card" onClick={() => navigate("/payments")}>
            <div className="al-module-card__top">
              <div className="al-module-card__icon">
                <PaymentReceiptIcon size={22} />
              </div>
              <span className="al-module-card__count">{payments.length}</span>
            </div>
            <h4 className="al-module-card__title">Farmer Payments</h4>
            <p className="al-module-card__desc">
              Disburse payments and review bank remittance histories.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
          SECTION 7: AI INTELLIGENCE COMMAND CENTER
      ====================================================== */}
      <section className="al-dashboard-section">
        <div className="al-section-header">
          <span className="al-section-header__eyebrow">Smart Agriculture</span>
          <h2 className="al-section-header__title">AgriLedger AI Decision Support</h2>
          <p className="al-section-header__subtitle">
            Machine learning services operating on verified agricultural and market records.
          </p>
        </div>

        <div className="al-ai-grid">
          <div className="al-ai-card" onClick={() => navigate("/ai-dashboard")}>
            <span className="al-ai-card__icon">🤖</span>
            <h4 className="al-ai-card__title">AI Command Center</h4>
            <p className="al-ai-card__desc">
              Overview of all AI models, diagnostics, and anomaly alerts.
            </p>
          </div>

          <div className="al-ai-card" onClick={() => navigate("/anomaly-detection")}>
            <span className="al-ai-card__icon">🔍</span>
            <h4 className="al-ai-card__title">Anomaly Detection</h4>
            <p className="al-ai-card__desc">
              Flag abnormal rates, excess deductions, and outlier sales.
            </p>
          </div>

          <div className="al-ai-card" onClick={() => navigate("/yield-prediction")}>
            <span className="al-ai-card__icon">🌾</span>
            <h4 className="al-ai-card__title">Yield Prediction</h4>
            <p className="al-ai-card__desc">
              Estimate future production based on field soil & acreage.
            </p>
          </div>

          <div className="al-ai-card" onClick={() => navigate("/market-price-prediction")}>
            <span className="al-ai-card__icon">📈</span>
            <h4 className="al-ai-card__title">Price Forecasting</h4>
            <p className="al-ai-card__desc">
              Anticipate regional mandi crop prices for optimal timing.
            </p>
          </div>

          <div className="al-ai-card" onClick={() => navigate("/market-recommendation")}>
            <span className="al-ai-card__icon">🎯</span>
            <h4 className="al-ai-card__title">Best Market Finder</h4>
            <p className="al-ai-card__desc">
              Find the highest net realization mandis factoring transport.
            </p>
          </div>

          <div className="al-ai-card" onClick={() => navigate("/intelligent-reports")}>
            <span className="al-ai-card__icon">📋</span>
            <h4 className="al-ai-card__title">Intelligent Reports</h4>
            <p className="al-ai-card__desc">
              Automated narrative reports on seasonal performance.
            </p>
          </div>

          <div className="al-ai-card" onClick={() => navigate("/field-inspections")}>
            <span className="al-ai-card__icon">📋</span>
            <h4 className="al-ai-card__title">Field Inspections</h4>
            <p className="al-ai-card__desc">
              Publish schedule, manage farmer bookings, and record reports.
            </p>
          </div>

          <div className="al-ai-card" onClick={() => navigate("/ai-assistant")}>
            <span className="al-ai-card__icon">💬</span>
            <h4 className="al-ai-card__title">AI Agricultural Assistant</h4>
            <p className="al-ai-card__desc">
              Natural language chat grounded in your MySQL ledger data.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AdminDashboard;