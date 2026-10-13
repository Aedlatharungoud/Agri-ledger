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
  status: "ACTIVE" | "INACTIVE";
}

interface Field {
  id: number;
  farmerId: number;
  fieldName: string;
  surveyNumber?: string | null;
  fieldVillageId: number;
  areaAcres?: number | null;
  irrigationType?: string | null;
  ownershipType?: string | null;
}

interface CropSeason {
  id: number;
  fieldId: number;
  season: string | null;
  cropName: string;
  year: number | null;
  sowingDate?: string | null;
  expectedHarvestDate?: string | null;
  status: string;
}

interface LabourExpense {
  id: number;
  farmerId: number;
  fieldId: number;
  cropSeasonId: number;
  workDate: string;
  workType: string;
  workerCount?: number | null;
  amount: number;
  paymentType: "CASH" | "CREDIT" | "PARTIAL";
  paidAmount: number;
  notes?: string | null;
  createdAt?: string | null;
}

interface LabourExpenseForm {
  farmerId: string;
  fieldId: string;
  cropSeasonId: string;
  workDate: string;
  workType: string;
  workerCount: string;
  amount: string;
  paymentType: "CASH" | "CREDIT" | "PARTIAL";
  paidAmount: string;
  notes: string;
}

const emptyForm: LabourExpenseForm = {
  farmerId: "",
  fieldId: "",
  cropSeasonId: "",
  workDate: new Date().toISOString().split("T")[0],
  workType: "",
  workerCount: "",
  amount: "",
  paymentType: "CREDIT",
  paidAmount: "0",
  notes: "",
};

export default function LabourExpenses() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [cropSeasons, setCropSeasons] = useState<CropSeason[]>([]);
  const [expenses, setExpenses] = useState<LabourExpense[]>([]);

  const [form, setForm] = useState<LabourExpenseForm>(emptyForm);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [workTypeFilter, setWorkTypeFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");

  // ============================================================
  // LOAD DATA
  // ============================================================

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [farmersRes, fieldsRes, seasonsRes, expensesRes] = await Promise.all([
        api.get("/farmers"),
        api.get("/fields"),
        api.get("/crop-seasons"),
        api.get("/labour-expenses"),
      ]);

      setFarmers(Array.isArray(farmersRes.data) ? farmersRes.data : []);
      setFields(Array.isArray(fieldsRes.data) ? fieldsRes.data : []);
      setCropSeasons(Array.isArray(seasonsRes.data) ? seasonsRes.data : []);
      setExpenses(Array.isArray(expensesRes.data) ? expensesRes.data : []);
    } catch (err: unknown) {
      console.error("Labour expenses load error:", err);
      setError("Unable to load labour expenses. Please check backend connection.");
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

  const fieldMap = useMemo(() => {
    const map = new Map<number, Field>();
    for (const f of fields) map.set(f.id, f);
    return map;
  }, [fields]);

  const seasonMap = useMemo(() => {
    const map = new Map<number, CropSeason>();
    for (const s of cropSeasons) map.set(s.id, s);
    return map;
  }, [cropSeasons]);

  // Cascading Field list based on selected Farmer
  const availableFields = useMemo(() => {
    if (!form.farmerId) return [];
    const fId = Number(form.farmerId);
    return fields.filter((f) => f.farmerId === fId);
  }, [fields, form.farmerId]);

  // Cascading Seasons based on selected Field
  const availableSeasons = useMemo(() => {
    if (!form.fieldId) return [];
    const fId = Number(form.fieldId);
    return cropSeasons.filter((cs) => cs.fieldId === fId);
  }, [cropSeasons, form.fieldId]);

  // ============================================================
  // STATS
  // ============================================================

  const stats = useMemo(() => {
    let totalAmount = 0;
    let totalPaid = 0;
    let totalWorkers = 0;

    expenses.forEach((e) => {
      totalAmount += Number(e.amount || 0);
      totalPaid += Number(e.paidAmount || 0);
      totalWorkers += Number(e.workerCount || 0);
    });

    const totalDue = Math.max(0, totalAmount - totalPaid);

    return {
      count: expenses.length,
      totalAmount,
      totalPaid,
      totalDue,
      totalWorkers,
    };
  }, [expenses]);

  // Distinct work types
  const workTypesList = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => {
      if (e.workType) set.add(e.workType);
    });
    return Array.from(set);
  }, [expenses]);

  // ============================================================
  // FILTERED EXPENSES
  // ============================================================

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return expenses.filter((e) => {
      // Payment filter
      if (paymentFilter !== "ALL" && e.paymentType !== paymentFilter) {
        return false;
      }

      // Work type filter
      if (workTypeFilter !== "ALL" && e.workType.toLowerCase() !== workTypeFilter.toLowerCase()) {
        return false;
      }

      // Search
      if (query) {
        const farmer = farmerMap.get(e.farmerId);
        const field = fieldMap.get(e.fieldId);
        const season = seasonMap.get(e.cropSeasonId);

        const matchFarmer = farmer?.name.toLowerCase().includes(query) ?? false;
        const matchFarmerCode = farmer?.farmerCode.toLowerCase().includes(query) ?? false;
        const matchField = field?.fieldName.toLowerCase().includes(query) ?? false;
        const matchWork = e.workType.toLowerCase().includes(query);
        const matchCrop = season?.cropName.toLowerCase().includes(query) ?? false;

        if (!matchFarmer && !matchFarmerCode && !matchField && !matchWork && !matchCrop) {
          return false;
        }
      }

      return true;
    });
  }, [expenses, search, paymentFilter, workTypeFilter, farmerMap, fieldMap, seasonMap]);

  // ============================================================
  // FORM HANDLING
  // ============================================================

  const handleChange = (field: keyof LabourExpenseForm, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "farmerId") {
        next.fieldId = "";
        next.cropSeasonId = "";
      } else if (field === "fieldId") {
        next.cropSeasonId = "";
      }

      if (field === "paymentType" && value === "CASH") {
        next.paidAmount = next.amount || "0";
      } else if (field === "paymentType" && value === "CREDIT") {
        next.paidAmount = "0";
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
      farmerId: farmers.length > 0 ? String(farmers[0].id) : "",
      workDate: new Date().toISOString().split("T")[0],
    });
    setShowModal(true);
  };

  const openEditModal = (e: LabourExpense) => {
    setError("");
    setSuccess("");
    setEditingId(e.id);
    setForm({
      farmerId: String(e.farmerId),
      fieldId: String(e.fieldId),
      cropSeasonId: String(e.cropSeasonId),
      workDate: e.workDate ? e.workDate.split("T")[0] : "",
      workType: e.workType,
      workerCount: e.workerCount !== null && e.workerCount !== undefined ? String(e.workerCount) : "",
      amount: String(e.amount),
      paymentType: e.paymentType,
      paidAmount: String(e.paidAmount ?? 0),
      notes: e.notes || "",
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
    if (!form.fieldId) {
      setError("Please select a field.");
      return;
    }
    if (!form.cropSeasonId) {
      setError("Please select a crop season.");
      return;
    }
    if (!form.workDate) {
      setError("Work date is required.");
      return;
    }
    if (!form.workType.trim()) {
      setError("Work type is required.");
      return;
    }

    const amt = Number(form.amount);
    if (Number.isNaN(amt) || amt <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }

    const paid = Number(form.paidAmount || 0);
    if (paid > amt) {
      setError("Paid amount cannot exceed total amount.");
      return;
    }

    const payload = {
      farmerId: Number(form.farmerId),
      fieldId: Number(form.fieldId),
      cropSeasonId: Number(form.cropSeasonId),
      workDate: form.workDate,
      workType: form.workType.trim(),
      workerCount: form.workerCount ? Number(form.workerCount) : null,
      amount: amt,
      paymentType: form.paymentType,
      paidAmount: paid,
      notes: form.notes.trim() || null,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await api.put(`/labour-expenses/${editingId}`, payload);
        setSuccess("Labour expense updated successfully.");
      } else {
        await api.post("/labour-expenses", payload);
        setSuccess("Labour expense recorded successfully.");
      }

      closeModal();
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Failed to save labour expense.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm("Are you sure you want to delete this labour expense record?");
    if (!confirmed) return;

    try {
      await api.delete(`/labour-expenses/${id}`);
      setSuccess("Labour expense deleted successfully.");
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Failed to delete labour expense.");
    }
  };

  const formatCurrency = (val: number) => `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formAmt = Number(form.amount || 0);
  const formDue = Math.max(0, formAmt - Number(form.paidAmount || 0));

  return (
    <div className="al-page-wrapper">
      {/* Header */}
      <PageHeader
        eyebrow="Workforce & Operations"
        title="Labour Expenses"
        description="Record agricultural labour wages, tasks, worker headcounts, and settlement dues across field parcels."
        actions={
          <Button variant="primary" icon="+" onClick={openAddModal}>
            Record Labour Expense
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
          label="Total Wages Incurred"
          value={formatCurrency(stats.totalAmount)}
          icon="👥"
          subtitle={`${stats.count} labour entries`}
        />

        <StatCard
          label="Wages Paid"
          value={formatCurrency(stats.totalPaid)}
          icon="💵"
          subtitle="Directly disbursed"
          badge={<Badge variant="success">Disbursed</Badge>}
        />

        <StatCard
          label="Outstanding Payable"
          value={formatCurrency(stats.totalDue)}
          icon="⏳"
          subtitle="Deductible at harvest"
          badge={<Badge variant="warning">Payable</Badge>}
        />

        <StatCard
          label="Worker Days"
          value={stats.totalWorkers}
          icon="🛠️"
          subtitle="Cumulative labour days"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="al-filter-bar">
        <div className="al-filter-search">
          <Input
            placeholder="Search by farmer, field, crop, or task type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="al-filter-select">
          <Select
            value={workTypeFilter}
            onChange={(e) => setWorkTypeFilter(e.target.value)}
          >
            <option value="ALL">All Work Types</option>
            {workTypesList.map((wt) => (
              <option key={wt} value={wt}>
                {wt}
              </option>
            ))}
          </Select>
        </div>

        <div className="al-filter-select">
          <Select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="CREDIT">Credit</option>
            <option value="CASH">Cash</option>
            <option value="PARTIAL">Partial</option>
          </Select>
        </div>

        <div className="al-filter-actions">
          {(search || workTypeFilter !== "ALL" || paymentFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setWorkTypeFilter("ALL");
                setPaymentFilter("ALL");
              }}
            >
              Reset Filters
            </Button>
          )}
          <Badge variant="neutral">
            {filteredExpenses.length} {filteredExpenses.length === 1 ? "entry" : "entries"}
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
          ) : filteredExpenses.length === 0 ? (
            <EmptyState
              icon="👥"
              title={search || workTypeFilter !== "ALL" || paymentFilter !== "ALL" ? "No labour entries match filter" : "No labour expenses recorded"}
              description={
                search || workTypeFilter !== "ALL" || paymentFilter !== "ALL"
                  ? "Try adjusting filters or searching for another keyword."
                  : "Begin logging farm labour and wage allocations."
              }
              action={
                search || workTypeFilter !== "ALL" || paymentFilter !== "ALL" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setWorkTypeFilter("ALL");
                      setPaymentFilter("ALL");
                    }}
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button variant="primary" icon="+" onClick={openAddModal}>
                    Record Labour Expense
                  </Button>
                )
              }
            />
          ) : (
            <TableContainer>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Work Date</Th>
                    <Th>Farmer & Field</Th>
                    <Th>Task / Operation</Th>
                    <Th align="center">Workers</Th>
                    <Th align="right">Amount</Th>
                    <Th>Payment Status</Th>
                    <Th align="right">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredExpenses.map((exp) => {
                    const farmer = farmerMap.get(exp.farmerId);
                    const field = fieldMap.get(exp.fieldId);
                    const season = seasonMap.get(exp.cropSeasonId);
                    const due = Math.max(0, Number(exp.amount) - Number(exp.paidAmount || 0));

                    return (
                      <Tr key={exp.id}>
                        {/* Date */}
                        <Td>
                          <span style={{ fontWeight: 500, color: "var(--color-text)" }}>
                            {exp.workDate ? exp.workDate.split("T")[0] : "—"}
                          </span>
                        </Td>

                        {/* Farmer & Field */}
                        <Td>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--color-text)" }}>
                              {farmer ? farmer.name : `Farmer #${exp.farmerId}`}
                            </div>
                            <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                              {field?.fieldName || `Field #${exp.fieldId}`} {season ? `• ${season.cropName}` : ""}
                            </div>
                          </div>
                        </Td>

                        {/* Task */}
                        <Td>
                          <Badge variant="forest">
                            {exp.workType}
                          </Badge>
                          {exp.notes && (
                            <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", marginTop: "2px" }}>
                              {exp.notes}
                            </div>
                          )}
                        </Td>

                        {/* Workers */}
                        <Td align="center">
                          <span style={{ fontWeight: 600 }}>{exp.workerCount || "—"}</span>
                        </Td>

                        {/* Amount */}
                        <Td align="right">
                          <div style={{ fontWeight: 700, color: "var(--color-text)" }}>
                            {formatCurrency(Number(exp.amount))}
                          </div>
                          {due > 0 && (
                            <div style={{ fontSize: "var(--font-xs)", color: "var(--color-warning)" }}>
                              Due: {formatCurrency(due)}
                            </div>
                          )}
                        </Td>

                        {/* Status */}
                        <Td>
                          <Badge variant={exp.paymentType === "CASH" ? "success" : due > 0 ? "warning" : "info"}>
                            {exp.paymentType}
                          </Badge>
                        </Td>

                        {/* Actions */}
                        <Td align="right">
                          <div className="al-table-actions">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(exp)}
                              aria-label="Edit Expense"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(exp.id)}
                              aria-label="Delete Expense"
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

      {/* Add / Edit Labour Expense Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingId !== null ? "Edit Labour Expense" : "Record Labour Expense"}
        maxWidth="680px"
        footer={
          <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end", width: "100%" }}>
            <Button variant="outline" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const formEl = document.getElementById("labour-form") as HTMLFormElement;
                if (formEl) formEl.requestSubmit();
              }}
              loading={saving}
            >
              {editingId !== null ? "Update Expense" : "Save Expense"}
            </Button>
          </div>
        }
      >
        <form id="labour-form" onSubmit={handleSubmit}>
          <div className="al-form-grid-2">
            <FormField label="Farmer" required>
              <Select
                value={form.farmerId}
                onChange={(e) => handleChange("farmerId", e.target.value)}
              >
                <option value="">-- Select Farmer --</option>
                {farmers.map((f) => (
                  <option key={f.id} value={String(f.id)}>
                    {f.name} ({f.farmerCode})
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Field Parcel" required>
              <Select
                value={form.fieldId}
                onChange={(e) => handleChange("fieldId", e.target.value)}
                disabled={!form.farmerId}
              >
                <option value="">-- Select Field Parcel --</option>
                {availableFields.map((f) => (
                  <option key={f.id} value={String(f.id)}>
                    {f.fieldName} ({f.areaAcres ? `${f.areaAcres} ac` : "Unspecified size"})
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Crop Season" required>
              <Select
                value={form.cropSeasonId}
                onChange={(e) => handleChange("cropSeasonId", e.target.value)}
                disabled={!form.fieldId}
              >
                <option value="">-- Select Crop Season --</option>
                {availableSeasons.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.cropName} ({s.season} {s.year})
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Date of Work" required>
              <Input
                type="date"
                value={form.workDate}
                onChange={(e) => handleChange("workDate", e.target.value)}
              />
            </FormField>

            <FormField label="Work / Task Type" required>
              <Input
                placeholder="e.g. Sowing, Weeding, Harvesting, Spraying"
                value={form.workType}
                onChange={(e) => handleChange("workType", e.target.value)}
              />
            </FormField>

            <FormField label="Workers Deployed">
              <Input
                type="number"
                min="1"
                placeholder="e.g. 8"
                value={form.workerCount}
                onChange={(e) => handleChange("workerCount", e.target.value)}
              />
            </FormField>

            <FormField label="Total Labour Amount (₹)" required>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 3200.00"
                value={form.amount}
                onChange={(e) => handleChange("amount", e.target.value)}
              />
            </FormField>

            <FormField label="Payment Mode" required>
              <Select
                value={form.paymentType}
                onChange={(e) => handleChange("paymentType", e.target.value as any)}
              >
                <option value="CREDIT">Credit (Deduct from Settlement)</option>
                <option value="CASH">Cash (Paid Upfront)</option>
                <option value="PARTIAL">Partial Payment</option>
              </Select>
            </FormField>

            <FormField label="Amount Paid Now (₹)">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.paidAmount}
                onChange={(e) => handleChange("paidAmount", e.target.value)}
              />
            </FormField>

            <FormField label="Notes / Work Group">
              <Input
                placeholder="e.g. Gang leader name or specific plot"
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
              />
            </FormField>
          </div>

          {/* Balance summary */}
          <div
            style={{
              marginTop: "var(--space-4)",
              padding: "var(--space-3) var(--space-4)",
              background: "var(--color-bg)",
              borderRadius: "var(--radius-md)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "var(--font-sm)",
            }}
          >
            <span>
              Total Wage: <strong>{formatCurrency(formAmt)}</strong>
            </span>
            <span>
              Payable Balance: <strong style={{ color: formDue > 0 ? "var(--color-warning)" : "var(--color-success)" }}>
                {formatCurrency(formDue)}
              </strong>
            </span>
          </div>
        </form>
      </Modal>
    </div>
  );
}