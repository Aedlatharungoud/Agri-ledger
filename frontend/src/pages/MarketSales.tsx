import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
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
  Modal,
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

const ALLOWED_UNITS = ["BAG", "KG", "QUINTAL", "TON"] as const;
type SaleUnit = (typeof ALLOWED_UNITS)[number];

interface Farmer {
  id: number;
  farmerCode: string;
  name: string;
  status?: "ACTIVE" | "INACTIVE";
}

interface Harvest {
  id: number;
  farmerId: number;
  fieldId: number;
  cropSeasonId: number;
  harvestDate: string;
  cropName: string;
  quantity: number;
  unit: string;
  qualityGrade?: string | null;
  lotNumber?: string | null;
  notes?: string | null;
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
  unitNeedsReview?: boolean;
  ratePerUnit?: number | null;
  grossAmount?: number | null;
  commission?: number | null;
  marketFee?: number | null;
  otherDeduction?: number | null;
  notes?: string | null;
  createdAt?: string | null;
}

interface FormData {
  farmerId: string;
  harvestId: string;
  saleDate: string;
  marketName: string;
  buyerName: string;
  quantitySold: string;
  unit: SaleUnit;
  ratePerUnit: string;
  grossAmount: string;
  commission: string;
  marketFee: string;
  otherDeduction: string;
  notes: string;
}

const emptyForm: FormData = {
  farmerId: "",
  harvestId: "",
  saleDate: new Date().toISOString().split("T")[0],
  marketName: "",
  buyerName: "",
  quantitySold: "",
  unit: "BAG",
  ratePerUnit: "",
  grossAmount: "",
  commission: "0",
  marketFee: "0",
  otherDeduction: "0",
  notes: "",
};

export default function MarketSales() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [sales, setSales] = useState<MarketSale[]>([]);

  const [form, setForm] = useState<FormData>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("ALL");

  // ============================================================
  // LOAD DATA
  // ============================================================

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [farmersRes, harvestsRes, salesRes] = await Promise.all([
        api.get("/farmers"),
        api.get("/harvests"),
        api.get("/market-sales"),
      ]);

      setFarmers(Array.isArray(farmersRes.data) ? farmersRes.data : []);
      setHarvests(Array.isArray(harvestsRes.data) ? harvestsRes.data : []);
      setSales(Array.isArray(salesRes.data) ? salesRes.data : []);
    } catch (err: unknown) {
      console.error(err);
      setError("Unable to load market sales. Please verify backend connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick lookup maps
  const farmerMap = useMemo(() => {
    const map = new Map<number, Farmer>();
    for (const f of farmers) map.set(f.id, f);
    return map;
  }, [farmers]);

  const harvestMap = useMemo(() => {
    const map = new Map<number, Harvest>();
    for (const h of harvests) map.set(h.id, h);
    return map;
  }, [harvests]);

  // ============================================================
  // STATS (Unit-safe policy: NEVER combine or convert units!)
  // ============================================================

  const stats = useMemo(() => {
    let totalGrossRevenue = 0;
    let totalDeductions = 0;
    let reviewCount = 0;

    // Distinct quantity sums keyed by unit
    const unitTotals: Record<string, number> = {
      BAG: 0,
      KG: 0,
      QUINTAL: 0,
      TON: 0,
    };

    sales.forEach((s) => {
      totalGrossRevenue += Number(s.grossAmount || 0);
      totalDeductions +=
        Number(s.commission || 0) +
        Number(s.marketFee || 0) +
        Number(s.otherDeduction || 0);

      const u = s.unit?.toUpperCase();
      if (u && ALLOWED_UNITS.includes(u as SaleUnit)) {
        unitTotals[u] = (unitTotals[u] || 0) + Number(s.quantitySold || 0);
      } else {
        reviewCount += 1;
      }

      if (s.unitNeedsReview) {
        reviewCount += 1;
      }
    });

    const netRealized = Math.max(0, totalGrossRevenue - totalDeductions);

    return {
      salesCount: sales.length,
      totalGrossRevenue,
      netRealized,
      totalDeductions,
      unitTotals,
      reviewCount,
    };
  }, [sales]);

  // ============================================================
  // FILTERED SALES
  // ============================================================

  const filteredSales = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sales.filter((s) => {
      // Unit filter
      if (unitFilter !== "ALL" && s.unit?.toUpperCase() !== unitFilter) {
        return false;
      }

      // Search query
      if (query) {
        const farmer = farmerMap.get(s.farmerId);
        const harvest = harvestMap.get(s.harvestId);

        const matchMarket = s.marketName?.toLowerCase().includes(query) ?? false;
        const matchBuyer = s.buyerName?.toLowerCase().includes(query) ?? false;
        const matchCrop = harvest?.cropName?.toLowerCase().includes(query) ?? false;
        const matchLot = harvest?.lotNumber?.toLowerCase().includes(query) ?? false;
        const matchFarmer = farmer?.name?.toLowerCase().includes(query) ?? false;
        const matchFarmerCode = farmer?.farmerCode?.toLowerCase().includes(query) ?? false;

        if (!matchMarket && !matchBuyer && !matchCrop && !matchLot && !matchFarmer && !matchFarmerCode) {
          return false;
        }
      }

      return true;
    });
  }, [sales, search, unitFilter, farmerMap, harvestMap]);

  // ============================================================
  // FORM HANDLING
  // ============================================================

  const handleHarvestChange = (harvestId: string) => {
    const selectedHarvest = harvestMap.get(Number(harvestId));

    if (!selectedHarvest) {
      setForm((prev) => ({ ...prev, harvestId }));
      return;
    }

    const harvestUnit =
      selectedHarvest.unit && ALLOWED_UNITS.includes(selectedHarvest.unit.toUpperCase() as SaleUnit)
        ? (selectedHarvest.unit.toUpperCase() as SaleUnit)
        : form.unit || "BAG";

    const qty = selectedHarvest.quantity ? String(selectedHarvest.quantity) : "";
    const rate = Number(form.ratePerUnit || 0);
    const gross = Number(qty) > 0 && rate > 0 ? (Number(qty) * rate).toFixed(2) : "";

    setForm((prev) => ({
      ...prev,
      harvestId,
      farmerId: String(selectedHarvest.farmerId),
      unit: harvestUnit,
      quantitySold: qty,
      grossAmount: gross,
    }));
  };

  const handleFieldChange = (field: keyof FormData, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      // Dynamically recalculate gross amount whenever quantity or rate changes
      if (field === "quantitySold" || field === "ratePerUnit") {
        const q = field === "quantitySold" ? Number(value) : Number(next.quantitySold);
        const r = field === "ratePerUnit" ? Number(value) : Number(next.ratePerUnit);
        if (q > 0 && r > 0) {
          next.grossAmount = (q * r).toFixed(2);
        } else {
          next.grossAmount = "";
        }
      }

      return next;
    });
  };

  const openAddModal = () => {
    setError("");
    setSuccess("");
    setEditingId(null);
    setForm({
      ...emptyForm,
      saleDate: new Date().toISOString().split("T")[0],
    });
    setShowModal(true);
  };

  const openEditModal = (s: MarketSale) => {
    setError("");
    setSuccess("");
    setEditingId(s.id);

    const safeUnit: SaleUnit =
      s.unit && ALLOWED_UNITS.includes(s.unit.toUpperCase() as SaleUnit)
        ? (s.unit.toUpperCase() as SaleUnit)
        : "BAG";

    setForm({
      farmerId: String(s.farmerId),
      harvestId: String(s.harvestId),
      saleDate: s.saleDate ? s.saleDate.split("T")[0] : "",
      marketName: s.marketName || "",
      buyerName: s.buyerName || "",
      quantitySold: s.quantitySold != null ? String(s.quantitySold) : "",
      unit: safeUnit,
      ratePerUnit: s.ratePerUnit != null ? String(s.ratePerUnit) : "",
      grossAmount: s.grossAmount != null ? String(s.grossAmount) : "",
      commission: s.commission != null ? String(s.commission) : "0",
      marketFee: s.marketFee != null ? String(s.marketFee) : "0",
      otherDeduction: s.otherDeduction != null ? String(s.otherDeduction) : "0",
      notes: s.notes || "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.farmerId) {
      setError("Please select a farmer.");
      return;
    }
    if (!form.harvestId) {
      setError("Please select a harvest lot.");
      return;
    }
    if (!form.saleDate) {
      setError("Sale date is required.");
      return;
    }

    const qty = Number(form.quantitySold);
    if (Number.isNaN(qty) || qty <= 0) {
      setError("Please enter a valid quantity sold.");
      return;
    }

    if (!ALLOWED_UNITS.includes(form.unit)) {
      setError("Please select a valid sale unit (BAG, KG, QUINTAL, TON).");
      return;
    }

    const rate = Number(form.ratePerUnit);
    if (Number.isNaN(rate) || rate <= 0) {
      setError("Please enter a valid rate per unit.");
      return;
    }

    // Rate is strictly per selected unit; no conversion factor
    const gross = Number((qty * rate).toFixed(2));

    const payload = {
      farmerId: Number(form.farmerId),
      harvestId: Number(form.harvestId),
      saleDate: form.saleDate,
      marketName: form.marketName.trim() || null,
      buyerName: form.buyerName.trim() || null,
      quantitySold: qty,
      unit: form.unit.trim().toUpperCase(),
      ratePerUnit: rate,
      grossAmount: gross,
      commission: Number(form.commission) || 0,
      marketFee: Number(form.marketFee) || 0,
      otherDeduction: Number(form.otherDeduction) || 0,
      notes: form.notes.trim() || null,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await api.put(`/market-sales/${editingId}`, payload);
        setSuccess("Market sale updated successfully.");
      } else {
        await api.post("/market-sales", payload);
        setSuccess("Market sale recorded successfully.");
      }

      closeModal();
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Failed to save market sale.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm("Are you sure you want to delete this sale record? Associated settlements and financial deductions will be recalculated.");
    if (!confirmed) return;

    try {
      await api.delete(`/market-sales/${id}`);
      setSuccess("Market sale deleted successfully.");
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Failed to delete sale record.");
    }
  };

  const formatCurrency = (val: number) => `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Form preview calculations
  const formQty = Number(form.quantitySold || 0);
  const formRate = Number(form.ratePerUnit || 0);
  const formGross = Number((formQty * formRate).toFixed(2));
  const formComm = Number(form.commission || 0);
  const formFee = Number(form.marketFee || 0);
  const formOther = Number(form.otherDeduction || 0);
  const formNet = Math.max(0, formGross - formComm - formFee - formOther);

  return (
    <div className="al-page-wrapper">
      {/* Header */}
      <PageHeader
        eyebrow="Commercial Mandi Operations"
        title="Market Sales"
        description="Record produce liquidation, auction rates per independent unit (BAG/KG/QUINTAL/TON), and statutory deductions."
        actions={
          <Button variant="primary" icon="+" onClick={openAddModal}>
            Record Sale
          </Button>
        }
      />

      {/* Notifications */}
      {error && (
        <Alert variant="error" title="Error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" title="Success" onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {/* Summary KPI Grid */}
      <div className="al-summary-grid">
        <StatCard
          label="Gross Revenue"
          value={formatCurrency(stats.totalGrossRevenue)}
          icon="💰"
          subtitle={`${stats.salesCount} sale transactions`}
        />

        <StatCard
          label="Net Farmer Realization"
          value={formatCurrency(stats.netRealized)}
          icon="💵"
          subtitle="After market deductions"
          badge={<Badge variant="success">Net Payable</Badge>}
        />

        <StatCard
          label="Market Fees & Commission"
          value={formatCurrency(stats.totalDeductions)}
          icon="📉"
          subtitle="APMC & trader fees"
          badge={<Badge variant="warning">Deductions</Badge>}
        />

        <StatCard
          label="Volume by Distinct Unit"
          value={
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", fontSize: "var(--font-sm)" }}>
              {stats.unitTotals.BAG > 0 && <Badge variant="forest">{stats.unitTotals.BAG} BAG</Badge>}
              {stats.unitTotals.KG > 0 && <Badge variant="info">{stats.unitTotals.KG.toLocaleString()} KG</Badge>}
              {stats.unitTotals.QUINTAL > 0 && <Badge variant="neutral">{stats.unitTotals.QUINTAL} QTL</Badge>}
              {stats.unitTotals.TON > 0 && <Badge variant="warning">{stats.unitTotals.TON} TON</Badge>}
            </div>
          }
          icon="⚖️"
          subtitle={stats.reviewCount > 0 ? `⚠️ ${stats.reviewCount} legacy items need review` : "Independent unit breakdown"}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="al-filter-bar">
        <div className="al-filter-search">
          <Input
            placeholder="Search by market, buyer, crop, lot #, or farmer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="al-filter-select">
          <Select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
          >
            <option value="ALL">All Sale Units</option>
            <option value="BAG">BAG</option>
            <option value="KG">KG</option>
            <option value="QUINTAL">QUINTAL</option>
            <option value="TON">TON</option>
          </Select>
        </div>

        <div className="al-filter-actions">
          {(search || unitFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setUnitFilter("ALL");
              }}
            >
              Reset Filters
            </Button>
          )}
          <Badge variant="neutral">
            {filteredSales.length} {filteredSales.length === 1 ? "sale" : "sales"}
          </Badge>
        </div>
      </div>

      {/* Main Table */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: "var(--space-6)" }}>
              <Skeleton height="36px" style={{ marginBottom: "12px" }} />
              <Skeleton height="54px" style={{ marginBottom: "8px" }} />
              <Skeleton height="54px" style={{ marginBottom: "8px" }} />
              <Skeleton height="54px" />
            </div>
          ) : filteredSales.length === 0 ? (
            <EmptyState
              icon="💰"
              title={search || unitFilter !== "ALL" ? "No market sales match filter" : "No market sales recorded"}
              description={
                search || unitFilter !== "ALL"
                  ? "Try searching for another market or clearing your unit filters."
                  : "Record your first market sale auction to start generating settlement credits."
              }
              action={
                search || unitFilter !== "ALL" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setUnitFilter("ALL");
                    }}
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button variant="primary" icon="+" onClick={openAddModal}>
                    Record Sale
                  </Button>
                )
              }
            />
          ) : (
            <TableContainer>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Sale Date</Th>
                    <Th>Farmer</Th>
                    <Th>Produce & Lot</Th>
                    <Th>Market & Buyer</Th>
                    <Th align="right">Qty & Rate / Unit</Th>
                    <Th align="right">Gross Amount</Th>
                    <Th align="right">Net Amount</Th>
                    <Th align="right">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredSales.map((s) => {
                    const farmer = farmerMap.get(s.farmerId);
                    const harvest = harvestMap.get(s.harvestId);
                    const gross = Number(s.grossAmount || 0);
                    const deductions =
                      Number(s.commission || 0) +
                      Number(s.marketFee || 0) +
                      Number(s.otherDeduction || 0);
                    const net = Math.max(0, gross - deductions);

                    const isReview =
                      s.unitNeedsReview ||
                      !s.unit ||
                      !ALLOWED_UNITS.includes(s.unit.toUpperCase() as SaleUnit);

                    return (
                      <Tr key={s.id}>
                        {/* Date */}
                        <Td>
                          <span style={{ fontWeight: 500, color: "var(--color-text)" }}>
                            {s.saleDate ? s.saleDate.split("T")[0] : "—"}
                          </span>
                        </Td>

                        {/* Farmer */}
                        <Td>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--color-text)" }}>
                              {farmer ? farmer.name : `Farmer #${s.farmerId}`}
                            </div>
                            <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                              {farmer?.farmerCode}
                            </div>
                          </div>
                        </Td>

                        {/* Produce & Lot */}
                        <Td>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--color-text)" }}>
                              {harvest?.cropName || "Crop"}
                            </div>
                            <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                              {harvest?.lotNumber ? `Lot #${harvest.lotNumber}` : `Harvest #${s.harvestId}`}
                            </div>
                          </div>
                        </Td>

                        {/* Market & Buyer */}
                        <Td>
                          <div>
                            <div style={{ fontWeight: 500, color: "var(--color-text)" }}>
                              {s.marketName || "APMC Mandi"}
                            </div>
                            <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                              {s.buyerName ? `Buyer: ${s.buyerName}` : "General Auction"}
                            </div>
                          </div>
                        </Td>

                        {/* Qty & Rate per Unit (Independent unit rule preserved) */}
                        <Td align="right">
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                            <span style={{ fontWeight: 700 }}>{s.quantitySold}</span>
                            <Badge variant={isReview ? "warning" : "forest"}>
                              {s.unit || "UNKNOWN"}
                            </Badge>
                          </div>
                          <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", marginTop: "2px" }}>
                            @ {formatCurrency(Number(s.ratePerUnit || 0))} / {s.unit || "unit"}
                          </div>
                          {isReview && (
                            <div style={{ marginTop: "2px" }}>
                              <Badge variant="warning" style={{ fontSize: "10px" }}>
                                Unit Needs Review
                              </Badge>
                            </div>
                          )}
                        </Td>

                        {/* Gross Amount */}
                        <Td align="right">
                          <div style={{ fontWeight: 600, color: "var(--color-text)" }}>
                            {formatCurrency(gross)}
                          </div>
                          {deductions > 0 && (
                            <div style={{ fontSize: "var(--font-xs)", color: "var(--color-danger)" }}>
                              -{formatCurrency(deductions)} ded.
                            </div>
                          )}
                        </Td>

                        {/* Net Realized */}
                        <Td align="right">
                          <div style={{ fontWeight: 700, color: "var(--color-primary)" }}>
                            {formatCurrency(net)}
                          </div>
                        </Td>

                        {/* Actions */}
                        <Td align="right">
                          <div className="al-table-actions">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(s)}
                              aria-label="Edit Sale"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(s.id)}
                              aria-label="Delete Sale"
                              style={{ color: "var(--color-danger)" }}
                            >
                              Delete
                            </Button>
                          </div>
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

      {/* Add / Edit Market Sale Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingId !== null ? "Edit Market Sale Record" : "Record Market Produce Sale"}
        maxWidth="720px"
        footer={
          <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end", width: "100%" }}>
            <Button variant="outline" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const formEl = document.getElementById("market-sale-form") as HTMLFormElement;
                if (formEl) formEl.requestSubmit();
              }}
              loading={saving}
            >
              {editingId !== null ? "Update Sale" : "Save Sale"}
            </Button>
          </div>
        }
      >
        <form id="market-sale-form" onSubmit={handleSubmit}>
          <div className="al-form-grid-2">
            <FormField label="Harvest Lot" required>
              <Select
                value={form.harvestId}
                onChange={(e) => handleHarvestChange(e.target.value)}
              >
                <option value="">-- Select Harvest Lot --</option>
                {harvests.map((h) => {
                  const f = farmerMap.get(h.farmerId);
                  return (
                    <option key={h.id} value={String(h.id)}>
                      {h.cropName} ({h.quantity} {h.unit}) - {f?.name || `Farmer #${h.farmerId}`}
                    </option>
                  );
                })}
              </Select>
            </FormField>

            <FormField label="Farmer" required>
              <Select
                value={form.farmerId}
                onChange={(e) => handleFieldChange("farmerId", e.target.value)}
              >
                <option value="">-- Select Farmer --</option>
                {farmers.map((f) => (
                  <option key={f.id} value={String(f.id)}>
                    {f.name} ({f.farmerCode})
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Sale Unit" required help="Independent unit. No conversion applied.">
              <Select
                value={form.unit}
                onChange={(e) => handleFieldChange("unit", e.target.value as SaleUnit)}
              >
                <option value="BAG">BAG (Bags / Sacks)</option>
                <option value="KG">KG (Kilograms)</option>
                <option value="QUINTAL">QUINTAL (100 KG)</option>
                <option value="TON">TON (1,000 KG)</option>
              </Select>
            </FormField>

            <FormField label="Quantity Sold" required>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 50"
                value={form.quantitySold}
                onChange={(e) => handleFieldChange("quantitySold", e.target.value)}
              />
            </FormField>

            <FormField label={`Rate per ${form.unit || "Unit"} (₹)`} required help={`Rate is strictly per ${form.unit || "unit"}`}>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 2100.00"
                value={form.ratePerUnit}
                onChange={(e) => handleFieldChange("ratePerUnit", e.target.value)}
              />
            </FormField>

            <FormField label="Sale Date" required>
              <Input
                type="date"
                value={form.saleDate}
                onChange={(e) => handleFieldChange("saleDate", e.target.value)}
              />
            </FormField>

            <FormField label="Market / Mandi Location">
              <Input
                placeholder="e.g. Enumamula Cotton Mandi"
                value={form.marketName}
                onChange={(e) => handleFieldChange("marketName", e.target.value)}
              />
            </FormField>

            <FormField label="Buyer / Commission Agent">
              <Input
                placeholder="e.g. Tirumala Traders"
                value={form.buyerName}
                onChange={(e) => handleFieldChange("buyerName", e.target.value)}
              />
            </FormField>

            <FormField label="Trader Commission (₹)">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.commission}
                onChange={(e) => handleFieldChange("commission", e.target.value)}
              />
            </FormField>

            <FormField label="Market / APMC Cess (₹)">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.marketFee}
                onChange={(e) => handleFieldChange("marketFee", e.target.value)}
              />
            </FormField>

            <FormField label="Other Mandi Deductions (₹)">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.otherDeduction}
                onChange={(e) => handleFieldChange("otherDeduction", e.target.value)}
              />
            </FormField>

            <FormField label="Transaction Notes">
              <Input
                placeholder="Patti / slip #, vehicle no, etc."
                value={form.notes}
                onChange={(e) => handleFieldChange("notes", e.target.value)}
              />
            </FormField>
          </div>

          {/* Real-time Financial Breakdown Preview */}
          <div
            style={{
              marginTop: "var(--space-4)",
              padding: "var(--space-4)",
              background: "var(--color-bg)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "var(--font-sm)",
            }}
          >
            <div>
              <span style={{ color: "var(--color-text-muted)" }}>Gross Amount: </span>
              <strong>{formatCurrency(formGross)}</strong>
              <span style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", marginLeft: "4px" }}>
                ({formQty || 0} {form.unit} @ {formatCurrency(formRate)}/{form.unit})
              </span>
            </div>

            <div>
              <span style={{ color: "var(--color-text-muted)" }}>Net Realized: </span>
              <strong style={{ color: "var(--color-primary)", fontSize: "var(--font-base)" }}>
                {formatCurrency(formNet)}
              </strong>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}