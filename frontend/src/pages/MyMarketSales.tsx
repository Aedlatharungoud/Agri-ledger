import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
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

const FMT_INR = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });

const FMT_DATE = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

interface MarketSale {
  id: number;
  farmerId: number;
  harvestId?: number;
  saleDate?: string;
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
}

interface Harvest {
  id: number;
  farmerId: number;
  cropName: string;
  quantity: number;
  unit: string;
  lotNumber?: string | null;
  harvestDate?: string;
}

interface SaleFormData {
  harvestId: string;
  saleDate: string;
  marketName: string;
  buyerName: string;
  quantitySold: string;
  unit: string;
  ratePerUnit: string;
  commission: string;
  marketFee: string;
  otherDeduction: string;
  notes: string;
}

const emptyForm: SaleFormData = {
  harvestId: "",
  saleDate: new Date().toISOString().split("T")[0],
  marketName: "",
  buyerName: "",
  quantitySold: "",
  unit: "BAG",
  ratePerUnit: "",
  commission: "0",
  marketFee: "0",
  otherDeduction: "0",
  notes: "",
};

export default function MyMarketSales() {
  const { user } = useAuth();
  const [sales, setSales] = useState<MarketSale[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingSale, setEditingSale] = useState<MarketSale | null>(null);
  const [form, setForm] = useState<SaleFormData>(emptyForm);

  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("ALL");

  useEffect(() => {
    if (!user || user.role !== "FARMER" || !user.farmerId) {
      setError("This page is available only for authenticated farmer accounts.");
      setLoading(false);
      return;
    }
    loadData();
  }, [user?.farmerId]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [salesRes, harvestsRes] = await Promise.all([
        api.get<MarketSale[]>("/market-sales"),
        api.get<Harvest[]>("/harvests"),
      ]);

      const salesData: MarketSale[] = Array.isArray(salesRes.data) ? salesRes.data : [];
      const mineSales = salesData.filter((s) => Number(s.farmerId) === Number(user!.farmerId));
      setSales(mineSales);

      const harvestsData: Harvest[] = Array.isArray(harvestsRes.data) ? harvestsRes.data : [];
      const mineHarvests = harvestsData.filter((h) => Number(h.farmerId) === Number(user!.farmerId));
      setHarvests(mineHarvests);
    } catch {
      setError("Unable to load your market sales records. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function getHarvestLabel(harvestId?: number) {
    if (!harvestId) return "—";
    const h = harvests.find((item) => Number(item.id) === Number(harvestId));
    if (!h) return `Harvest #${harvestId}`;
    return `${h.cropName} (${h.lotNumber || `#${h.id}`})`;
  }

  function openCreateModal() {
    setEditingSale(null);
    const initialUnit =
      harvests.length > 0 &&
        harvests[0].unit &&
        ["BAG", "KG", "QUINTAL", "TON"].includes(harvests[0].unit.toUpperCase())
        ? harvests[0].unit.toUpperCase()
        : "BAG";
    setForm({
      ...emptyForm,
      harvestId: harvests.length > 0 ? String(harvests[0].id) : "",
      unit: initialUnit,
      saleDate: new Date().toISOString().split("T")[0],
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function openEditModal(sale: MarketSale) {
    setEditingSale(sale);
    setForm({
      harvestId: String(sale.harvestId || ""),
      saleDate: sale.saleDate || new Date().toISOString().split("T")[0],
      marketName: sale.marketName || "",
      buyerName: sale.buyerName || "",
      quantitySold: sale.quantitySold != null ? String(sale.quantitySold) : "",
      unit: sale.unit || "BAG",
      ratePerUnit: sale.ratePerUnit != null ? String(sale.ratePerUnit) : "",
      commission: sale.commission != null ? String(sale.commission) : "0",
      marketFee: sale.marketFee != null ? String(sale.marketFee) : "0",
      otherDeduction: sale.otherDeduction != null ? String(sale.otherDeduction) : "0",
      notes: sale.notes || "",
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.harvestId || !form.saleDate || !form.quantitySold || !form.ratePerUnit || !form.unit) {
      setError("Please select a harvest lot, sale unit, and enter date, quantity, and rate.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        farmerId: Number(user!.farmerId),
        harvestId: Number(form.harvestId),
        saleDate: form.saleDate,
        marketName: form.marketName.trim() || undefined,
        buyerName: form.buyerName.trim() || undefined,
        quantitySold: parseFloat(form.quantitySold),
        unit: form.unit.trim().toUpperCase(),
        ratePerUnit: parseFloat(form.ratePerUnit),
        commission: parseFloat(form.commission || "0"),
        marketFee: parseFloat(form.marketFee || "0"),
        otherDeduction: parseFloat(form.otherDeduction || "0"),
        notes: form.notes.trim() || undefined,
      };

      if (editingSale) {
        const res = await api.put(`/market-sales/${editingSale.id}`, payload);
        const updated = res.data?.marketSale;
        if (updated) {
          setSales((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
        } else {
          await loadData();
        }
        setSuccess("Market sale updated successfully!");
      } else {
        const res = await api.post("/market-sales", payload);
        const created = res.data?.marketSale;
        if (created) {
          setSales((prev) => [created, ...prev]);
        } else {
          await loadData();
        }
        setSuccess("Market sale recorded successfully!");
      }

      setShowModal(false);
      setEditingSale(null);
      setForm(emptyForm);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to save market sale.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSale(saleId: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this market sale? This action cannot be undone."
    );
    if (!confirmed) return;

    setError("");
    setSuccess("");
    try {
      await api.delete(`/market-sales/${saleId}`);
      setSales((prev) => prev.filter((s) => s.id !== saleId));
      setSuccess("Market sale deleted successfully.");
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Unable to delete market sale. Check related deductions or settlements.";
      setError(msg);
    }
  }

  // Financial aggregates
  const totalGross = useMemo(() => {
    return sales.reduce((t, s) => t + Number(s.grossAmount ?? 0), 0);
  }, [sales]);

  const totalDeductions = useMemo(() => {
    return sales.reduce(
      (t, s) =>
        t +
        Number(s.commission ?? 0) +
        Number(s.marketFee ?? 0) +
        Number(s.otherDeduction ?? 0),
      0
    );
  }, [sales]);

  const netRealized = useMemo(() => {
    return totalGross - totalDeductions;
  }, [totalGross, totalDeductions]);

  // Independent units quantity breakdown
  const quantitiesByUnit = useMemo(() => {
    return sales.reduce<Record<string, number>>((acc, s) => {
      const unitKey = (s.unit || "UNASSIGNED").toUpperCase();
      acc[unitKey] = (acc[unitKey] || 0) + Number(s.quantitySold || 0);
      return acc;
    }, {});
  }, [sales]);

  // Computed gross preview for modal
  const computedGross =
    (parseFloat(form.quantitySold) || 0) * (parseFloat(form.ratePerUnit) || 0);

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const market = (s.marketName || "").toLowerCase();
      const buyer = (s.buyerName || "").toLowerCase();
      const notes = (s.notes || "").toLowerCase();
      const harvestLabel = getHarvestLabel(s.harvestId).toLowerCase();
      const q = search.toLowerCase();

      const matchesSearch =
        !q ||
        market.includes(q) ||
        buyer.includes(q) ||
        notes.includes(q) ||
        harvestLabel.includes(q);

      const matchesUnit =
        unitFilter === "ALL" || (s.unit || "").toUpperCase() === unitFilter.toUpperCase();

      return matchesSearch && matchesUnit;
    });
  }, [sales, search, unitFilter, harvests]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <PageHeader
        title="🏪 My Market Sales"
        description="Track your agricultural produce trades, mandi prices, and documented mandi deductions."
        actions={
          <div style={{ display: "flex", gap: "10px" }}>
            <Button variant="secondary" onClick={loadData} disabled={loading}>
              ↻ Refresh
            </Button>
            <Button variant="primary" onClick={openCreateModal}>
              + Record Market Sale
            </Button>
          </div>
        }
      />

      {success && (
        <Alert variant="success" onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert variant="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* KPI Financial Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        <StatCard
          label="Total Market Sales"
          value={sales.length}
          subtitle="Documented mandi transactions"
        />
        <StatCard
          label="Gross Sales Value"
          value={FMT_INR(totalGross)}
          subtitle="Pre-deduction trade volume"
          badge={<Badge variant="success">Gross Realization</Badge>}
        />
        <StatCard
          label="Mandi Deductions"
          value={FMT_INR(totalDeductions)}
          subtitle="Commission, cess & fees"
          badge={<Badge variant="warning">Mandi Expenses</Badge>}
        />
        <StatCard
          label="Net Crop Realization"
          value={FMT_INR(netRealized)}
          subtitle="Net value before settlements"
          badge={<Badge variant="info">Net Revenue</Badge>}
        />
      </div>

      {/* Independent Units Breakdown Strip */}
      <Card>
        <CardBody style={{ padding: "12px 18px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#174D35", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Independent Unit Volumes:
              </span>
              <span style={{ fontSize: "12px", color: "#718096" }}>
                (Preserved strictly without automatic conversion)
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {Object.keys(quantitiesByUnit).length > 0 ? (
                Object.entries(quantitiesByUnit).map(([unit, qty]) => (
                  <span
                    key={unit}
                    style={{
                      background: unit === "BAG" ? "#EBF5EE" : "#F0F9FF",
                      color: unit === "BAG" ? "#174D35" : "#0284C7",
                      border: `1px solid ${unit === "BAG" ? "#BCE3C5" : "#BAE6FD"}`,
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontWeight: 700,
                      fontSize: "13px",
                    }}
                  >
                    {qty.toLocaleString("en-IN", { maximumFractionDigits: 2 })} {unit}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: "13px", color: "#A0AEC0" }}>No volume data</span>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Search & Filter Toolbar */}
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
                Search Sales
              </label>
              <Input
                placeholder="Search market, buyer, crop lot..."
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
                Filter by Unit
              </label>
              <Select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
                <option value="ALL">All Measurement Units</option>
                <option value="BAG">BAG</option>
                <option value="KG">KG</option>
                <option value="QUINTAL">QUINTAL</option>
                <option value="TON">TON</option>
              </Select>
            </div>

            {(search || unitFilter !== "ALL") && (
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearch("");
                    setUnitFilter("ALL");
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
      ) : filteredSales.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              title={sales.length === 0 ? "No Market Sales Recorded" : "No Matching Sales"}
              description={
                sales.length === 0
                  ? "Record your mandi crop trades to track buyer pricing, commissions, and net realization."
                  : "Try adjusting your search criteria or filter to see sale entries."
              }
              action={
                sales.length === 0 ? (
                  <Button variant="primary" onClick={openCreateModal}>
                    + Record Your First Market Sale
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch("");
                      setUnitFilter("ALL");
                    }}
                  >
                    Reset Filters
                  </Button>
                )
              }
            />
          </CardBody>
        </Card>
      ) : (
        <TableContainer>
          <Table>
            <Thead>
              <Tr>
                <Th>Sale Date</Th>
                <Th>Harvest Lot</Th>
                <Th>Market / Mandi</Th>
                <Th>Buyer</Th>
                <Th>Quantity Sold</Th>
                <Th>Rate per Unit</Th>
                <Th>Gross Amount</Th>
                <Th>Commission</Th>
                <Th>Market Fee</Th>
                <Th>Other Ded.</Th>
                <Th style={{ textAlign: "right" }}>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredSales.map((s) => (
                <Tr key={s.id}>
                  <Td>{FMT_DATE(s.saleDate)}</Td>
                  <Td>
                    <div style={{ fontWeight: 600, color: "#174D35", fontSize: "13px" }}>
                      {getHarvestLabel(s.harvestId)}
                    </div>
                  </Td>
                  <Td>{s.marketName || "—"}</Td>
                  <Td>{s.buyerName || "—"}</Td>
                  <Td>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ fontWeight: 700, color: "#18251E" }}>
                        {s.quantitySold != null
                          ? Number(s.quantitySold).toLocaleString("en-IN")
                          : "—"}
                      </span>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#174D35",
                          background: "#EBF5EE",
                          padding: "1px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        {s.unit || "—"}
                      </span>
                      {s.unitNeedsReview && (
                        <Badge variant="warning">Review Unit</Badge>
                      )}
                    </div>
                  </Td>
                  <Td>
                    {s.ratePerUnit != null ? (
                      <span style={{ fontSize: "13px", color: "#4A5568" }}>
                        {FMT_INR(Number(s.ratePerUnit))} / {s.unit || "Unit"}
                      </span>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>
                    <span style={{ fontWeight: 700, color: "#174D35", fontSize: "14px" }}>
                      {s.grossAmount != null ? FMT_INR(Number(s.grossAmount)) : "—"}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ color: Number(s.commission || 0) > 0 ? "#C05621" : "#718096" }}>
                      {s.commission != null ? FMT_INR(Number(s.commission)) : "—"}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ color: Number(s.marketFee || 0) > 0 ? "#C05621" : "#718096" }}>
                      {s.marketFee != null ? FMT_INR(Number(s.marketFee)) : "—"}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ color: Number(s.otherDeduction || 0) > 0 ? "#C05621" : "#718096" }}>
                      {s.otherDeduction != null ? FMT_INR(Number(s.otherDeduction)) : "—"}
                    </span>
                  </Td>
                  <Td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "8px", justifyContent: "flex-end" }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openEditModal(s)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        style={{ color: "#DC2626" }}
                        onClick={() => handleDeleteSale(s.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      )}

      {/* Record / Edit Market Sale Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingSale ? "✏️ Edit Market Sale" : "🏪 Record Market Sale"}
          maxWidth="640px"
        >
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <FormField label="Harvest Lot" required help="Select the harvest lot being marketed.">
              <Select
                value={form.harvestId}
                onChange={(e) => {
                  const selId = e.target.value;
                  const h = harvests.find((item) => Number(item.id) === Number(selId));
                  setForm({
                    ...form,
                    harvestId: selId,
                    unit: h?.unit || form.unit,
                  });
                }}
                required
              >
                <option value="">Select a harvest lot...</option>
                {harvests.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.cropName} — Lot: {h.lotNumber || `#${h.id}`} ({h.quantity} {h.unit})
                  </option>
                ))}
              </Select>
            </FormField>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <FormField label="Sale Date" required>
                <Input
                  type="date"
                  value={form.saleDate}
                  onChange={(e) => setForm({ ...form, saleDate: e.target.value })}
                  required
                />
              </FormField>

              <FormField label="Market / Mandi Name">
                <Input
                  type="text"
                  placeholder="e.g. Suryapet APMC Mandi"
                  value={form.marketName}
                  onChange={(e) => setForm({ ...form, marketName: e.target.value })}
                />
              </FormField>
            </div>

            <FormField label="Buyer / Commission Agent Name">
              <Input
                type="text"
                placeholder="e.g. Laxmi Agro Traders"
                value={form.buyerName}
                onChange={(e) => setForm({ ...form, buyerName: e.target.value })}
              />
            </FormField>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
              <FormField label="Quantity Sold" required help="Volume or weight sold.">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 50"
                  value={form.quantitySold}
                  onChange={(e) => setForm({ ...form, quantitySold: e.target.value })}
                  required
                />
              </FormField>

              <FormField label="Sale Unit" required help="Independent unit.">
                <Select
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  required
                >
                  <option value="BAG">BAG (Standard Unit)</option>
                  <option value="KG">KG (Standard Unit)</option>
                  <option value="QUINTAL">QUINTAL</option>
                  <option value="TON">TON</option>
                </Select>
              </FormField>

              <FormField label={`Rate per ${form.unit || "Unit"} (₹)`} required help="Unit price.">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 2100"
                  value={form.ratePerUnit}
                  onChange={(e) => setForm({ ...form, ratePerUnit: e.target.value })}
                  required
                />
              </FormField>
            </div>

            {computedGross > 0 && (
              <div
                style={{
                  background: "#EBF5EE",
                  border: "1px solid #BCE3C5",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  color: "#174D35",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: "15px" }}>
                  Calculated Gross Value: {FMT_INR(computedGross)}
                </div>
                <div style={{ fontSize: "12px", marginTop: "4px", color: "#2F855A" }}>
                  {form.quantitySold} {form.unit} @ {FMT_INR(parseFloat(form.ratePerUnit) || 0)} / {form.unit}
                  {" — "}independent unit pricing (strictly preserved without automated conversions).
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px" }}>
              <FormField label="Commission (₹)" help="Agent brokerage fee.">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.commission}
                  onChange={(e) => setForm({ ...form, commission: e.target.value })}
                />
              </FormField>

              <FormField label="Market Fee / Cess (₹)" help="Mandi market tax.">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.marketFee}
                  onChange={(e) => setForm({ ...form, marketFee: e.target.value })}
                />
              </FormField>

              <FormField label="Other Deductions (₹)" help="Hamali, unloading, etc.">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.otherDeduction}
                  onChange={(e) => setForm({ ...form, otherDeduction: e.target.value })}
                />
              </FormField>
            </div>

            <FormField label="Notes & Remarks" help="Invoice number, weighing receipt, etc.">
              <Input
                type="text"
                placeholder="e.g. Receipt #4912, weighing slip verified"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </FormField>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "12px",
                paddingTop: "12px",
                borderTop: "1px solid #E2E8F0",
              }}
            >
              <Button variant="secondary" onClick={() => setShowModal(false)} type="button">
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? "Saving..." : editingSale ? "Update Sale" : "Save Market Sale"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
