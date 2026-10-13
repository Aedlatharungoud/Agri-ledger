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

interface MarketSale {
  id: number;
  farmerId?: number;
  harvestId?: number;
  saleDate?: string;
  marketName?: string | null;
  buyerName?: string | null;
  quantitySold?: number | null;
  unit?: string | null;
  grossAmount?: number | null;
}

interface Farmer {
  id: number;
  farmerCode?: string;
  name?: string;
}

interface SaleDeduction {
  id: number;
  saleId: number;
  deductionType: string;
  amount: number;
  notes?: string | null;
}

interface FormData {
  saleId: string;
  deductionType: string;
  amount: string;
  notes: string;
}

const emptyForm: FormData = {
  saleId: "",
  deductionType: "COMMISSION",
  amount: "",
  notes: "",
};

export default function SaleDeductions() {
  const [deductions, setDeductions] = useState<SaleDeduction[]>([]);
  const [sales, setSales] = useState<MarketSale[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);

  const [form, setForm] = useState<FormData>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // ============================================================
  // LOAD DATA
  // ============================================================

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [deductionsRes, salesRes, farmersRes] = await Promise.all([
        api.get("/sale-deductions"),
        api.get("/market-sales"),
        api.get("/farmers"),
      ]);

      setDeductions(Array.isArray(deductionsRes.data) ? deductionsRes.data : []);
      setSales(Array.isArray(salesRes.data) ? salesRes.data : []);
      setFarmers(Array.isArray(farmersRes.data) ? farmersRes.data : []);
    } catch (err: unknown) {
      console.error(err);
      setError("Unable to load sale deductions. Please check backend connection.");
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

  const saleMap = useMemo(() => {
    const map = new Map<number, MarketSale>();
    for (const s of sales) map.set(s.id, s);
    return map;
  }, [sales]);

  // ============================================================
  // STATS
  // ============================================================

  const stats = useMemo(() => {
    let totalDeductionsAmount = 0;
    const typeTotals: Record<string, number> = {};

    deductions.forEach((d) => {
      totalDeductionsAmount += Number(d.amount || 0);
      const t = d.deductionType || "OTHER";
      typeTotals[t] = (typeTotals[t] || 0) + Number(d.amount || 0);
    });

    const uniqueSalesCount = new Set(deductions.map((d) => d.saleId)).size;
    const avgPerSale = uniqueSalesCount > 0 ? totalDeductionsAmount / uniqueSalesCount : 0;

    return {
      count: deductions.length,
      totalDeductionsAmount,
      uniqueSalesCount,
      avgPerSale,
    };
  }, [deductions]);

  // Distinct types list
  const distinctTypes = useMemo(() => {
    const set = new Set<string>();
    deductions.forEach((d) => {
      if (d.deductionType) set.add(d.deductionType);
    });
    return Array.from(set);
  }, [deductions]);

  // ============================================================
  // FILTERED DEDUCTIONS
  // ============================================================

  const filteredDeductions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return deductions.filter((d) => {
      // Type filter
      if (typeFilter !== "ALL" && d.deductionType.toUpperCase() !== typeFilter.toUpperCase()) {
        return false;
      }

      // Search query
      if (query) {
        const sale = saleMap.get(d.saleId);
        const farmer = sale?.farmerId ? farmerMap.get(sale.farmerId) : undefined;

        const matchType = d.deductionType.toLowerCase().includes(query);
        const matchNotes = d.notes?.toLowerCase().includes(query) ?? false;
        const matchMarket = sale?.marketName?.toLowerCase().includes(query) ?? false;
        const matchFarmer = farmer?.name?.toLowerCase().includes(query) ?? false;

        if (!matchType && !matchNotes && !matchMarket && !matchFarmer) {
          return false;
        }
      }

      return true;
    });
  }, [deductions, search, typeFilter, saleMap, farmerMap]);

  // ============================================================
  // FORM HANDLING
  // ============================================================

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const openAddModal = () => {
    setError("");
    setSuccess("");
    setEditingId(null);
    setForm({
      ...emptyForm,
      saleId: sales.length > 0 ? String(sales[0].id) : "",
    });
    setShowModal(true);
  };

  const openEditModal = (d: SaleDeduction) => {
    setError("");
    setSuccess("");
    setEditingId(d.id);
    setForm({
      saleId: String(d.saleId),
      deductionType: d.deductionType || "COMMISSION",
      amount: String(d.amount),
      notes: d.notes || "",
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

    if (!form.saleId) {
      setError("Please select a market sale.");
      return;
    }
    if (!form.deductionType.trim()) {
      setError("Deduction type is required.");
      return;
    }

    const amt = Number(form.amount);
    if (Number.isNaN(amt) || amt <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }

    const payload = {
      saleId: Number(form.saleId),
      deductionType: form.deductionType.trim(),
      amount: amt,
      notes: form.notes.trim() || null,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await api.put(`/sale-deductions/${editingId}`, payload);
        setSuccess("Sale deduction updated successfully.");
      } else {
        await api.post("/sale-deductions", payload);
        setSuccess("Sale deduction recorded successfully.");
      }

      closeModal();
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Failed to save deduction.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm("Are you sure you want to delete this sale deduction item?");
    if (!confirmed) return;

    try {
      await api.delete(`/sale-deductions/${id}`);
      setSuccess("Sale deduction deleted successfully.");
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Failed to delete deduction.");
    }
  };

  const formatCurrency = (val: number) => `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="al-page-wrapper">
      {/* Header */}
      <PageHeader
        eyebrow="Commercial Market Ledger"
        title="Sale Deductions"
        description="Catalog itemized mandi cess, weighment, trader commission, and transport deductions linked to market sales."
        actions={
          <Button variant="primary" icon="+" onClick={openAddModal}>
            Add Deduction
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
          label="Total Deductions"
          value={formatCurrency(stats.totalDeductionsAmount)}
          icon="📉"
          subtitle={`${stats.count} line items applied`}
        />

        <StatCard
          label="Impacted Sales"
          value={stats.uniqueSalesCount}
          icon="🏷️"
          subtitle="Transactions with deductions"
          badge={<Badge variant="info">Active</Badge>}
        />

        <StatCard
          label="Average per Sale"
          value={formatCurrency(stats.avgPerSale)}
          icon="📊"
          subtitle="Mean mandi cut per transaction"
        />

        <StatCard
          label="Distinct Categories"
          value={distinctTypes.length}
          icon="📑"
          subtitle="Commission, Cess, Hamali, etc."
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="al-filter-bar">
        <div className="al-filter-search">
          <Input
            placeholder="Search by deduction type, notes, market, or farmer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="al-filter-select">
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">All Deduction Types</option>
            {distinctTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </div>

        <div className="al-filter-actions">
          {(search || typeFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setTypeFilter("ALL");
              }}
            >
              Reset Filters
            </Button>
          )}
          <Badge variant="neutral">
            {filteredDeductions.length} {filteredDeductions.length === 1 ? "entry" : "entries"}
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
          ) : filteredDeductions.length === 0 ? (
            <EmptyState
              icon="📉"
              title={search || typeFilter !== "ALL" ? "No deductions match filter" : "No sale deductions recorded"}
              description={
                search || typeFilter !== "ALL"
                  ? "Try resetting filters or adjusting search keywords."
                  : "Itemize market commissions and fees for accounting transparency."
              }
              action={
                search || typeFilter !== "ALL" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setTypeFilter("ALL");
                    }}
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button variant="primary" icon="+" onClick={openAddModal}>
                    Add First Deduction
                  </Button>
                )
              }
            />
          ) : (
            <TableContainer>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Sale Ref & Date</Th>
                    <Th>Farmer & Market</Th>
                    <Th>Deduction Type</Th>
                    <Th align="right">Amount</Th>
                    <Th>Notes</Th>
                    <Th align="right">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredDeductions.map((d) => {
                    const sale = saleMap.get(d.saleId);
                    const farmer = sale?.farmerId ? farmerMap.get(sale.farmerId) : undefined;

                    return (
                      <Tr key={d.id}>
                        {/* Sale Ref */}
                        <Td>
                          <div style={{ fontWeight: 600, color: "var(--color-text)" }}>
                            Sale #{d.saleId}
                          </div>
                          <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                            {sale?.saleDate ? sale.saleDate.split("T")[0] : "—"}
                          </div>
                        </Td>

                        {/* Farmer & Market */}
                        <Td>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--color-text)" }}>
                              {farmer ? farmer.name : `Farmer #${sale?.farmerId || "—"}`}
                            </div>
                            <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                              {sale?.marketName || "Mandi"}
                            </div>
                          </div>
                        </Td>

                        {/* Deduction Type */}
                        <Td>
                          <Badge variant="warning">
                            {d.deductionType}
                          </Badge>
                        </Td>

                        {/* Amount */}
                        <Td align="right">
                          <span style={{ fontWeight: 700, color: "var(--color-danger)" }}>
                            -{formatCurrency(Number(d.amount))}
                          </span>
                        </Td>

                        {/* Notes */}
                        <Td>
                          <span style={{ fontSize: "var(--font-sm)", color: "var(--color-text-muted)" }}>
                            {d.notes || "—"}
                          </span>
                        </Td>

                        {/* Actions */}
                        <Td align="right">
                          <div className="al-table-actions">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(d)}
                              aria-label="Edit Deduction"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(d.id)}
                              aria-label="Delete Deduction"
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

      {/* Add / Edit Deduction Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingId !== null ? "Edit Sale Deduction" : "Add Sale Deduction"}
        maxWidth="600px"
        footer={
          <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end", width: "100%" }}>
            <Button variant="outline" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const formEl = document.getElementById("deduction-form") as HTMLFormElement;
                if (formEl) formEl.requestSubmit();
              }}
              loading={saving}
            >
              {editingId !== null ? "Update Deduction" : "Save Deduction"}
            </Button>
          </div>
        }
      >
        <form id="deduction-form" onSubmit={handleSubmit}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <FormField label="Market Sale Reference" required>
              <Select
                value={form.saleId}
                onChange={(e) => handleChange("saleId", e.target.value)}
              >
                <option value="">-- Select Market Sale --</option>
                {sales.map((s) => {
                  const f = s.farmerId ? farmerMap.get(s.farmerId) : undefined;
                  return (
                    <option key={s.id} value={String(s.id)}>
                      Sale #{s.id} ({s.saleDate ? s.saleDate.split("T")[0] : ""}) - {f?.name || "Farmer"} - {formatCurrency(Number(s.grossAmount || 0))}
                    </option>
                  );
                })}
              </Select>
            </FormField>

            <FormField label="Deduction Category" required>
              <Select
                value={form.deductionType}
                onChange={(e) => handleChange("deductionType", e.target.value)}
              >
                <option value="COMMISSION">Trader Commission (Adath)</option>
                <option value="MARKET_FEE">Market / APMC Fee</option>
                <option value="HAMALI">Hamali / Loading / Unloading</option>
                <option value="WEIGHMENT">Weighment Charges</option>
                <option value="QUALITY_DISCOUNT">Quality / Moisture Discount</option>
                <option value="TRANSPORT">Transit Deduction</option>
                <option value="OTHER">Other Custom Deduction</option>
              </Select>
            </FormField>

            <FormField label="Deduction Amount (₹)" required>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 250.00"
                value={form.amount}
                onChange={(e) => handleChange("amount", e.target.value)}
              />
            </FormField>

            <FormField label="Remarks / Receipt Notes">
              <Input
                placeholder="Receipt slip # or justification..."
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
              />
            </FormField>
          </div>
        </form>
      </Modal>
    </div>
  );
}