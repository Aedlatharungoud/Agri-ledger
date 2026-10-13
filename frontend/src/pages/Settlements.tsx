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

interface Farmer {
  id: number;
  farmerCode: string;
  name: string;
  phone?: string | null;
  status?: string;
}

interface CropSeason {
  id: number;
  farmerId?: number;
  fieldId?: number;
  seasonName?: string;
  season?: string;
  cropName?: string;
  crop?: string;
  year?: number;
  status?: string;
}

interface Settlement {
  id: number;
  farmerId: number;
  cropSeasonId: number | null;
  settlementDate: string;
  totalCropSales: number;
  totalInputCredit: number;
  totalLabourCredit: number;
  totalTransport: number;
  totalDeductions: number;
  totalInterest: number;
  totalPayments: number;
  finalAmount: number;
  settlementStatus: string | null;
  notes: string | null;
  createdAt?: string | null;
}

interface Calculation {
  farmerId: number;
  cropSeasonId: number;
  totalCropSales: number;
  totalInputCredit: number;
  totalLabourCredit: number;
  totalTransport: number;
  totalDeductions: number;
  totalInterest: number;
  totalPayments: number;
  finalAmount: number;
  status?: string;
}

interface SettlementForm {
  farmerId: string;
  cropSeasonId: string;
  settlementDate: string;
  totalCropSales: string;
  totalInputCredit: string;
  totalLabourCredit: string;
  totalTransport: string;
  totalDeductions: string;
  totalInterest: string;
  totalPayments: string;
  finalAmount: string;
  settlementStatus: string;
  notes: string;
}

const today = new Date().toISOString().split("T")[0];

const emptyForm: SettlementForm = {
  farmerId: "",
  cropSeasonId: "",
  settlementDate: today,
  totalCropSales: "0",
  totalInputCredit: "0",
  totalLabourCredit: "0",
  totalTransport: "0",
  totalDeductions: "0",
  totalInterest: "0",
  totalPayments: "0",
  finalAmount: "0",
  settlementStatus: "PENDING",
  notes: "",
};

export default function Settlements() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [cropSeasons, setCropSeasons] = useState<CropSeason[]>([]);

  const [form, setForm] = useState<SettlementForm>(emptyForm);
  const [calculation, setCalculation] = useState<Calculation | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // ============================================================
  // LOAD DATA
  // ============================================================

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [farmersRes, seasonsRes, settlementsRes] = await Promise.all([
        api.get("/farmers"),
        api.get("/crop-seasons"),
        api.get("/settlements"),
      ]);

      setFarmers(Array.isArray(farmersRes.data) ? farmersRes.data : []);
      setCropSeasons(Array.isArray(seasonsRes.data) ? seasonsRes.data : []);
      setSettlements(Array.isArray(settlementsRes.data) ? settlementsRes.data : []);
    } catch (err: unknown) {
      console.error(err);
      setError("Unable to load settlements and ledgers. Please ensure backend is running.");
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

  const seasonMap = useMemo(() => {
    const map = new Map<number, CropSeason>();
    for (const s of cropSeasons) map.set(s.id, s);
    return map;
  }, [cropSeasons]);

  // ============================================================
  // STATS
  // ============================================================

  const stats = useMemo(() => {
    let totalSales = 0;
    let totalRecovered = 0;
    let totalFinalPayout = 0;

    settlements.forEach((s) => {
      totalSales += Number(s.totalCropSales || 0);
      totalRecovered +=
        Number(s.totalInputCredit || 0) +
        Number(s.totalLabourCredit || 0) +
        Number(s.totalTransport || 0) +
        Number(s.totalDeductions || 0);
      totalFinalPayout += Number(s.finalAmount || 0);
    });

    return {
      count: settlements.length,
      totalSales,
      totalRecovered,
      totalFinalPayout,
    };
  }, [settlements]);

  // ============================================================
  // FILTERED SETTLEMENTS
  // ============================================================

  const filteredSettlements = useMemo(() => {
    const query = search.trim().toLowerCase();

    return settlements.filter((s) => {
      // Status filter
      if (statusFilter !== "ALL" && s.settlementStatus?.toUpperCase() !== statusFilter.toUpperCase()) {
        return false;
      }

      // Search query
      if (query) {
        const farmer = farmerMap.get(s.farmerId);
        const season = s.cropSeasonId ? seasonMap.get(s.cropSeasonId) : undefined;

        const matchFarmer = farmer?.name?.toLowerCase().includes(query) ?? false;
        const matchCode = farmer?.farmerCode?.toLowerCase().includes(query) ?? false;
        const matchCrop = season?.cropName?.toLowerCase().includes(query) ?? false;
        const matchNotes = s.notes?.toLowerCase().includes(query) ?? false;

        if (!matchFarmer && !matchCode && !matchCrop && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }, [settlements, search, statusFilter, farmerMap, seasonMap]);

  // ============================================================
  // FORM HANDLING
  // ============================================================

  const handleFieldChange = (field: keyof SettlementForm, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setCalculation(null);
  };

  const openAddModal = () => {
    setError("");
    setSuccess("");
    setCalculation(null);
    setEditingId(null);
    setForm({
      ...emptyForm,
      settlementDate: new Date().toISOString().split("T")[0],
    });
    setShowModal(true);
  };

  const openEditModal = (s: Settlement) => {
    setError("");
    setSuccess("");
    setCalculation(null);
    setEditingId(s.id);
    setForm({
      farmerId: String(s.farmerId),
      cropSeasonId: s.cropSeasonId ? String(s.cropSeasonId) : "",
      settlementDate: s.settlementDate ? s.settlementDate.split("T")[0] : today,
      totalCropSales: String(s.totalCropSales ?? 0),
      totalInputCredit: String(s.totalInputCredit ?? 0),
      totalLabourCredit: String(s.totalLabourCredit ?? 0),
      totalTransport: String(s.totalTransport ?? 0),
      totalDeductions: String(s.totalDeductions ?? 0),
      totalInterest: String(s.totalInterest ?? 0),
      totalPayments: String(s.totalPayments ?? 0),
      finalAmount: String(s.finalAmount ?? 0),
      settlementStatus: s.settlementStatus || "PENDING",
      notes: s.notes || "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setCalculation(null);
    setForm(emptyForm);
  };

  // ============================================================
  // LIVE BACKEND CALCULATION CONTRACT
  // ============================================================

  const handleCalculate = async () => {
    setError("");
    setSuccess("");

    if (!form.farmerId) {
      setError("Please select a farmer first.");
      return;
    }
    if (!form.cropSeasonId) {
      setError("Please select a crop season first.");
      return;
    }

    setCalculating(true);

    try {
      const res = await api.get(`/settlements/calculate/${Number(form.farmerId)}/${Number(form.cropSeasonId)}`);
      const data = res.data;

      setCalculation(data);
      setForm((prev) => ({
        ...prev,
        totalCropSales: String(data.totalCropSales ?? 0),
        totalInputCredit: String(data.totalInputCredit ?? 0),
        totalLabourCredit: String(data.totalLabourCredit ?? 0),
        totalTransport: String(data.totalTransport ?? 0),
        totalDeductions: String(data.totalDeductions ?? 0),
        totalInterest: String(data.totalInterest ?? 0),
        totalPayments: String(data.totalPayments ?? 0),
        finalAmount: String(data.finalAmount ?? 0),
      }));

      setSuccess("Settlement calculated from live ledger records.");
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Failed to calculate settlement.");
    } finally {
      setCalculating(false);
    }
  };

  // ============================================================
  // AUTOMATIC ONE-CLICK GENERATE
  // ============================================================

  const handleGenerate = async () => {
    setError("");
    setSuccess("");

    if (!form.farmerId) {
      setError("Please select a farmer first.");
      return;
    }
    if (!form.cropSeasonId) {
      setError("Please select a crop season first.");
      return;
    }

    setGenerating(true);

    try {
      const res = await api.post(`/settlements/generate/${Number(form.farmerId)}/${Number(form.cropSeasonId)}`);
      const data = res.data;

      setSuccess(data?.message || "Settlement automatically generated and finalized.");
      closeModal();
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Failed to auto-generate settlement.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.farmerId) {
      setError("Please select a farmer.");
      return;
    }
    if (!form.settlementDate) {
      setError("Settlement date is required.");
      return;
    }

    const payload = {
      farmerId: Number(form.farmerId),
      cropSeasonId: form.cropSeasonId ? Number(form.cropSeasonId) : null,
      settlementDate: form.settlementDate,
      totalCropSales: Number(form.totalCropSales || 0),
      totalInputCredit: Number(form.totalInputCredit || 0),
      totalLabourCredit: Number(form.totalLabourCredit || 0),
      totalTransport: Number(form.totalTransport || 0),
      totalDeductions: Number(form.totalDeductions || 0),
      totalInterest: Number(form.totalInterest || 0),
      totalPayments: Number(form.totalPayments || 0),
      finalAmount: Number(form.finalAmount || 0),
      settlementStatus: form.settlementStatus || "PENDING",
      notes: form.notes.trim() || null,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await api.put(`/settlements/${editingId}`, payload);
        setSuccess("Settlement updated successfully.");
      } else {
        await api.post("/settlements", payload);
        setSuccess("Settlement saved successfully.");
      }

      closeModal();
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Failed to save settlement.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm("Are you sure you want to delete this settlement? Payout ledgers may be affected.");
    if (!confirmed) return;

    try {
      await api.delete(`/settlements/${id}`);
      setSuccess("Settlement deleted successfully.");
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Failed to delete settlement.");
    }
  };

  const formatCurrency = (val: number) => `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getStatusBadge = (status: string | null) => {
    const upper = (status || "PENDING").toUpperCase();
    if (upper === "PAID" || upper === "COMPLETED") return <Badge variant="success">{upper}</Badge>;
    if (upper === "PENDING") return <Badge variant="warning">{upper}</Badge>;
    if (upper === "CANCELLED") return <Badge variant="danger">{upper}</Badge>;
    return <Badge variant="info">{upper}</Badge>;
  };

  return (
    <div className="al-page-wrapper">
      {/* Header */}
      <PageHeader
        eyebrow="Financial Reconciliation & Closeout"
        title="Farmer Settlements"
        description="Comprehensive accounting reconciliation netting crop sales against credit advances, inputs, labour, and freight."
        actions={
          <Button variant="primary" icon="+" onClick={openAddModal}>
            New Settlement
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
          label="Total Crop Sales"
          value={formatCurrency(stats.totalSales)}
          icon="🌾"
          subtitle="Gross auction proceeds"
        />

        <StatCard
          label="Recovered Advances & Costs"
          value={formatCurrency(stats.totalRecovered)}
          icon="📥"
          subtitle="Inputs, Labour & Freight recovered"
          badge={<Badge variant="info">Recovered</Badge>}
        />

        <StatCard
          label="Net Farmer Disbursals"
          value={formatCurrency(stats.totalFinalPayout)}
          icon="💰"
          subtitle="Cumulative net payouts due"
          badge={<Badge variant="success">Final Net</Badge>}
        />

        <StatCard
          label="Reconciled Accounts"
          value={stats.count}
          icon="📑"
          subtitle="Total settlements finalized"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="al-filter-bar">
        <div className="al-filter-search">
          <Input
            placeholder="Search by farmer name, code, crop, or remarks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="al-filter-select">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Settlement Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </div>

        <div className="al-filter-actions">
          {(search || statusFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
              }}
            >
              Reset Filters
            </Button>
          )}
          <Badge variant="neutral">
            {filteredSettlements.length} {filteredSettlements.length === 1 ? "statement" : "statements"}
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
          ) : filteredSettlements.length === 0 ? (
            <EmptyState
              icon="📑"
              title={search || statusFilter !== "ALL" ? "No settlements match filter" : "No settlements finalized"}
              description={
                search || statusFilter !== "ALL"
                  ? "Try resetting filters or adjusting search keywords."
                  : "Calculate and generate seasonal closeouts between farmer crop revenues and advance deductions."
              }
              action={
                search || statusFilter !== "ALL" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("ALL");
                    }}
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button variant="primary" icon="+" onClick={openAddModal}>
                    New Settlement
                  </Button>
                )
              }
            />
          ) : (
            <TableContainer>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Settlement Date</Th>
                    <Th>Farmer</Th>
                    <Th>Crop Season</Th>
                    <Th align="right">Gross Sales</Th>
                    <Th align="right">Total Recoveries</Th>
                    <Th align="right">Final Net Payout</Th>
                    <Th>Status</Th>
                    <Th align="right">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredSettlements.map((s) => {
                    const farmer = farmerMap.get(s.farmerId);
                    const season = s.cropSeasonId ? seasonMap.get(s.cropSeasonId) : undefined;
                    const recoveries =
                      Number(s.totalInputCredit || 0) +
                      Number(s.totalLabourCredit || 0) +
                      Number(s.totalTransport || 0) +
                      Number(s.totalDeductions || 0) +
                      Number(s.totalInterest || 0);

                    return (
                      <Tr key={s.id}>
                        {/* Date */}
                        <Td>
                          <span style={{ fontWeight: 500, color: "var(--color-text)" }}>
                            {s.settlementDate ? s.settlementDate.split("T")[0] : "—"}
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

                        {/* Crop Season */}
                        <Td>
                          <div>
                            <div style={{ fontWeight: 500, color: "var(--color-text)" }}>
                              {season?.cropName || "Season"}
                            </div>
                            <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                              {season ? `${season.season || ""} ${season.year || ""}` : `Season #${s.cropSeasonId || "—"}`}
                            </div>
                          </div>
                        </Td>

                        {/* Gross Sales */}
                        <Td align="right">
                          <span style={{ fontWeight: 600 }}>
                            {formatCurrency(Number(s.totalCropSales || 0))}
                          </span>
                        </Td>

                        {/* Total Recoveries */}
                        <Td align="right">
                          <span style={{ color: "var(--color-danger)", fontWeight: 500 }}>
                            -{formatCurrency(recoveries)}
                          </span>
                        </Td>

                        {/* Final Net Amount */}
                        <Td align="right">
                          <span style={{ fontWeight: 700, fontSize: "var(--font-base)", color: "var(--color-primary)" }}>
                            {formatCurrency(Number(s.finalAmount || 0))}
                          </span>
                        </Td>

                        {/* Status */}
                        <Td>
                          {getStatusBadge(s.settlementStatus)}
                        </Td>

                        {/* Actions */}
                        <Td align="right">
                          <div className="al-table-actions">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(s)}
                              aria-label="Edit Settlement"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(s.id)}
                              aria-label="Delete Settlement"
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

      {/* Add / Edit Settlement Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingId !== null ? "Edit Settlement Statement" : "Reconcile Farmer Settlement"}
        maxWidth="740px"
        footer={
          <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
            <div>
              {editingId === null && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleGenerate}
                  loading={generating}
                  disabled={!form.farmerId || !form.cropSeasonId}
                >
                  ⚡ One-Click Auto-Finalize
                </Button>
              )}
            </div>

            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <Button variant="outline" onClick={closeModal} disabled={saving || generating}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const formEl = document.getElementById("settlement-form") as HTMLFormElement;
                  if (formEl) formEl.requestSubmit();
                }}
                loading={saving}
              >
                {editingId !== null ? "Update Statement" : "Save Settlement"}
              </Button>
            </div>
          </div>
        }
      >
        <form id="settlement-form" onSubmit={handleSubmit}>
          {/* Header Selectors */}
          <div className="al-form-grid-2">
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

            <FormField label="Crop Season" required>
              <Select
                value={form.cropSeasonId}
                onChange={(e) => handleFieldChange("cropSeasonId", e.target.value)}
              >
                <option value="">-- Select Crop Season --</option>
                {cropSeasons.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.cropName} ({s.season} {s.year})
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {/* Calculate Toolbar */}
          <div style={{ margin: "var(--space-3) 0 var(--space-4)", display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="outline"
              size="sm"
              icon="🔄"
              onClick={handleCalculate}
              loading={calculating}
              disabled={!form.farmerId || !form.cropSeasonId}
            >
              Fetch Live Ledger Calculations
            </Button>
          </div>

          {calculation && (
            <div style={{ marginBottom: "var(--space-3)", display: "flex", alignItems: "center", gap: "8px" }}>
              <Badge variant="success">Live Calculation Active</Badge>
              <span style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                Verified ledger balance: {formatCurrency(Number(calculation.finalAmount || 0))}
              </span>
            </div>
          )}

          {/* Breakdown Ledger Numbers */}
          <div
            style={{
              padding: "var(--space-4)",
              background: "var(--color-bg)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border-subtle)",
              marginBottom: "var(--space-4)",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: "var(--font-sm)", marginBottom: "var(--space-3)", color: "var(--color-text)" }}>
              Financial Reconciliation Summary
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-3)" }}>
              <FormField label="Gross Crop Sales (+)">
                <Input
                  type="number"
                  step="0.01"
                  value={form.totalCropSales}
                  onChange={(e) => handleFieldChange("totalCropSales", e.target.value)}
                />
              </FormField>

              <FormField label="Input Credit Recoveries (-)">
                <Input
                  type="number"
                  step="0.01"
                  value={form.totalInputCredit}
                  onChange={(e) => handleFieldChange("totalInputCredit", e.target.value)}
                />
              </FormField>

              <FormField label="Labour Advances (-)">
                <Input
                  type="number"
                  step="0.01"
                  value={form.totalLabourCredit}
                  onChange={(e) => handleFieldChange("totalLabourCredit", e.target.value)}
                />
              </FormField>

              <FormField label="Transport Recoveries (-)">
                <Input
                  type="number"
                  step="0.01"
                  value={form.totalTransport}
                  onChange={(e) => handleFieldChange("totalTransport", e.target.value)}
                />
              </FormField>

              <FormField label="Mandi Deductions (-)">
                <Input
                  type="number"
                  step="0.01"
                  value={form.totalDeductions}
                  onChange={(e) => handleFieldChange("totalDeductions", e.target.value)}
                />
              </FormField>

              <FormField label="Interest Charged (-)">
                <Input
                  type="number"
                  step="0.01"
                  value={form.totalInterest}
                  onChange={(e) => handleFieldChange("totalInterest", e.target.value)}
                />
              </FormField>

              <FormField label="Prior Payments Disbursed (-)">
                <Input
                  type="number"
                  step="0.01"
                  value={form.totalPayments}
                  onChange={(e) => handleFieldChange("totalPayments", e.target.value)}
                />
              </FormField>

              <FormField label="Final Net Payout Payable (=)">
                <Input
                  type="number"
                  step="0.01"
                  style={{ fontWeight: 700, color: "var(--color-primary)" }}
                  value={form.finalAmount}
                  onChange={(e) => handleFieldChange("finalAmount", e.target.value)}
                />
              </FormField>
            </div>
          </div>

          {/* Meta Details */}
          <div className="al-form-grid-2">
            <FormField label="Settlement Date" required>
              <Input
                type="date"
                value={form.settlementDate}
                onChange={(e) => handleFieldChange("settlementDate", e.target.value)}
              />
            </FormField>

            <FormField label="Settlement Status" required>
              <Select
                value={form.settlementStatus}
                onChange={(e) => handleFieldChange("settlementStatus", e.target.value)}
              >
                <option value="PENDING">Pending Approval</option>
                <option value="COMPLETED">Completed / Finalized</option>
                <option value="PAID">Disbursed / Paid</option>
                <option value="CANCELLED">Cancelled</option>
              </Select>
            </FormField>
          </div>

          <div style={{ marginTop: "var(--space-3)" }}>
            <FormField label="Reconciliation Notes">
              <Input
                placeholder="Bank authorization ref, auditor signoff notes..."
                value={form.notes}
                onChange={(e) => handleFieldChange("notes", e.target.value)}
              />
            </FormField>
          </div>
        </form>
      </Modal>
    </div>
  );
}