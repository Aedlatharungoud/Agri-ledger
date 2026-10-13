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
  farmerCode?: string;
  name?: string;
  phone?: string | null;
}

interface Settlement {
  id: number;
  farmerId: number;
  cropSeasonId?: number | null;
  settlementDate?: string;
  finalAmount?: number | null;
  settlementStatus?: string | null;
}

interface FarmerPayment {
  id: number;
  farmerId: number;
  settlementId: number | null;
  paymentDate: string;
  amount: number;
  paymentMode: string;
  referenceNumber: string | null;
  notes: string | null;
  createdAt?: string | null;
}

interface PaymentForm {
  farmerId: string;
  settlementId: string;
  paymentDate: string;
  amount: string;
  paymentMode: string;
  referenceNumber: string;
  notes: string;
}

const emptyForm: PaymentForm = {
  farmerId: "",
  settlementId: "",
  paymentDate: new Date().toISOString().split("T")[0],
  amount: "",
  paymentMode: "BANK_TRANSFER",
  referenceNumber: "",
  notes: "",
};

export default function FarmerPayments() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [payments, setPayments] = useState<FarmerPayment[]>([]);

  const [form, setForm] = useState<PaymentForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState("ALL");

  // ============================================================
  // LOAD DATA
  // ============================================================

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [farmersRes, settlementsRes, paymentsRes] = await Promise.all([
        api.get("/farmers"),
        api.get("/settlements"),
        api.get("/farmer-payments"),
      ]);

      setFarmers(Array.isArray(farmersRes.data) ? farmersRes.data : []);
      setSettlements(Array.isArray(settlementsRes.data) ? settlementsRes.data : []);
      setPayments(Array.isArray(paymentsRes.data) ? paymentsRes.data : []);
    } catch (err: unknown) {
      console.error(err);
      setError("Unable to load disbursements. Please check backend connection.");
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

  const settlementMap = useMemo(() => {
    const map = new Map<number, Settlement>();
    for (const s of settlements) map.set(s.id, s);
    return map;
  }, [settlements]);

  // Cascading settlements for selected farmer
  const availableSettlements = useMemo(() => {
    if (!form.farmerId) return [];
    const fId = Number(form.farmerId);
    return settlements.filter((s) => s.farmerId === fId);
  }, [settlements, form.farmerId]);

  // ============================================================
  // STATS
  // ============================================================

  const stats = useMemo(() => {
    let totalDisbursed = 0;
    let bankCount = 0;
    let cashCount = 0;

    payments.forEach((p) => {
      totalDisbursed += Number(p.amount || 0);
      const m = p.paymentMode?.toUpperCase() || "";
      if (m.includes("BANK") || m.includes("TRANSFER") || m.includes("UPI") || m.includes("NEFT")) {
        bankCount += 1;
      } else {
        cashCount += 1;
      }
    });

    const uniqueFarmers = new Set(payments.map((p) => p.farmerId)).size;

    return {
      paymentsCount: payments.length,
      totalDisbursed,
      bankCount,
      cashCount,
      uniqueFarmers,
    };
  }, [payments]);

  // ============================================================
  // FILTERED PAYMENTS
  // ============================================================

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return payments.filter((p) => {
      // Mode filter
      if (modeFilter !== "ALL" && p.paymentMode.toUpperCase() !== modeFilter.toUpperCase()) {
        return false;
      }

      // Search query
      if (query) {
        const farmer = farmerMap.get(p.farmerId);
        const matchFarmer = farmer?.name?.toLowerCase().includes(query) ?? false;
        const matchCode = farmer?.farmerCode?.toLowerCase().includes(query) ?? false;
        const matchRef = p.referenceNumber?.toLowerCase().includes(query) ?? false;
        const matchNotes = p.notes?.toLowerCase().includes(query) ?? false;

        if (!matchFarmer && !matchCode && !matchRef && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }, [payments, search, modeFilter, farmerMap]);

  // ============================================================
  // FORM HANDLING
  // ============================================================

  const handleChange = (field: keyof PaymentForm, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "farmerId") {
        next.settlementId = "";
      } else if (field === "settlementId" && value) {
        const s = settlementMap.get(Number(value));
        if (s && s.finalAmount && !next.amount) {
          next.amount = String(s.finalAmount);
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
      paymentDate: new Date().toISOString().split("T")[0],
    });
    setShowModal(true);
  };

  const openEditModal = (p: FarmerPayment) => {
    setError("");
    setSuccess("");
    setEditingId(p.id);
    setForm({
      farmerId: String(p.farmerId),
      settlementId: p.settlementId ? String(p.settlementId) : "",
      paymentDate: p.paymentDate ? p.paymentDate.split("T")[0] : "",
      amount: String(p.amount),
      paymentMode: p.paymentMode || "BANK_TRANSFER",
      referenceNumber: p.referenceNumber || "",
      notes: p.notes || "",
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
    if (!form.paymentDate) {
      setError("Payment date is required.");
      return;
    }

    const amt = Number(form.amount);
    if (Number.isNaN(amt) || amt <= 0) {
      setError("Payment amount must be greater than 0.");
      return;
    }

    const payload = {
      farmerId: Number(form.farmerId),
      settlementId: form.settlementId ? Number(form.settlementId) : null,
      paymentDate: form.paymentDate,
      amount: amt,
      paymentMode: form.paymentMode,
      referenceNumber: form.referenceNumber.trim() || null,
      notes: form.notes.trim() || null,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await api.put(`/farmer-payments/${editingId}`, payload);
        setSuccess("Payment record updated successfully.");
      } else {
        await api.post("/farmer-payments", payload);
        setSuccess("Payment recorded and disbursed successfully.");
      }

      closeModal();
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Failed to save payment.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm("Are you sure you want to delete this payment record?");
    if (!confirmed) return;

    try {
      await api.delete(`/farmer-payments/${id}`);
      setSuccess("Payment record deleted successfully.");
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Failed to delete payment.");
    }
  };

  const formatCurrency = (val: number) => `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getModeBadge = (mode: string) => {
    const upper = mode.toUpperCase();
    if (upper.includes("BANK") || upper.includes("NEFT") || upper.includes("RTGS")) {
      return <Badge variant="success">Bank Transfer</Badge>;
    }
    if (upper.includes("UPI")) {
      return <Badge variant="info">UPI</Badge>;
    }
    if (upper.includes("CHEQUE")) {
      return <Badge variant="warning">Cheque</Badge>;
    }
    return <Badge variant="neutral">Cash</Badge>;
  };

  return (
    <div className="al-page-wrapper">
      {/* Header */}
      <PageHeader
        eyebrow="Treasury & Disbursals"
        title="Farmer Payments"
        description="Issue settlement payouts, trace banking transaction references (UTR / Cheque), and manage payment receipts."
        actions={
          <Button variant="primary" icon="+" onClick={openAddModal}>
            Issue Payment
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
          label="Total Disbursed"
          value={formatCurrency(stats.totalDisbursed)}
          icon="💸"
          subtitle={`${stats.paymentsCount} transactions cleared`}
        />

        <StatCard
          label="Electronic Disbursals"
          value={stats.bankCount}
          icon="🏛️"
          subtitle="NEFT, RTGS, & UPI transfers"
          badge={<Badge variant="success">Verified</Badge>}
        />

        <StatCard
          label="Cash & Cheques"
          value={stats.cashCount}
          icon="📜"
          subtitle="Physical instrument payouts"
        />

        <StatCard
          label="Recipients"
          value={stats.uniqueFarmers}
          icon="👨‍🌾"
          subtitle="Distinct farmers paid"
          badge={<Badge variant="info">Recipients</Badge>}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="al-filter-bar">
        <div className="al-filter-search">
          <Input
            placeholder="Search by farmer name, UTR / cheque reference, or remarks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="al-filter-select">
          <Select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
          >
            <option value="ALL">All Payment Channels</option>
            <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
            <option value="UPI">UPI</option>
            <option value="CHEQUE">Cheque</option>
            <option value="CASH">Cash</option>
          </Select>
        </div>

        <div className="al-filter-actions">
          {(search || modeFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setModeFilter("ALL");
              }}
            >
              Reset Filters
            </Button>
          )}
          <Badge variant="neutral">
            {filteredPayments.length} {filteredPayments.length === 1 ? "payout" : "payouts"}
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
          ) : filteredPayments.length === 0 ? (
            <EmptyState
              icon="💸"
              title={search || modeFilter !== "ALL" ? "No payments match filter" : "No payments issued yet"}
              description={
                search || modeFilter !== "ALL"
                  ? "Try adjusting filters or searching with a different UTR number."
                  : "Issue seasonal settlement balances or advance payouts to your registered farmers."
              }
              action={
                search || modeFilter !== "ALL" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setModeFilter("ALL");
                    }}
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button variant="primary" icon="+" onClick={openAddModal}>
                    Issue Payment
                  </Button>
                )
              }
            />
          ) : (
            <TableContainer>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Payment Date</Th>
                    <Th>Farmer</Th>
                    <Th>Settlement Statement</Th>
                    <Th>Payment Channel</Th>
                    <Th align="right">Amount</Th>
                    <Th>Reference / UTR</Th>
                    <Th align="right">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredPayments.map((p) => {
                    const farmer = farmerMap.get(p.farmerId);
                    const settlement = p.settlementId ? settlementMap.get(p.settlementId) : undefined;

                    return (
                      <Tr key={p.id}>
                        {/* Date */}
                        <Td>
                          <span style={{ fontWeight: 500, color: "var(--color-text)" }}>
                            {p.paymentDate ? p.paymentDate.split("T")[0] : "—"}
                          </span>
                        </Td>

                        {/* Farmer */}
                        <Td>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--color-text)" }}>
                              {farmer ? farmer.name : `Farmer #${p.farmerId}`}
                            </div>
                            <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                              {farmer?.farmerCode}
                            </div>
                          </div>
                        </Td>

                        {/* Settlement */}
                        <Td>
                          {settlement ? (
                            <div>
                              <div style={{ fontWeight: 500, color: "var(--color-text)" }}>
                                Statement #{settlement.id}
                              </div>
                              <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                                {settlement.settlementDate ? settlement.settlementDate.split("T")[0] : ""}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>Direct / Advance</span>
                          )}
                        </Td>

                        {/* Channel */}
                        <Td>
                          {getModeBadge(p.paymentMode)}
                        </Td>

                        {/* Amount */}
                        <Td align="right">
                          <span style={{ fontWeight: 700, fontSize: "var(--font-base)", color: "var(--color-primary)" }}>
                            {formatCurrency(Number(p.amount))}
                          </span>
                        </Td>

                        {/* Reference */}
                        <Td>
                          {p.referenceNumber ? (
                            <span style={{ fontFamily: "monospace", fontSize: "var(--font-xs)", color: "var(--color-text)" }}>
                              {p.referenceNumber}
                            </span>
                          ) : (
                            <span style={{ color: "var(--color-text-muted)" }}>—</span>
                          )}
                        </Td>

                        {/* Actions */}
                        <Td align="right">
                          <div className="al-table-actions">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(p)}
                              aria-label="Edit Payment"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(p.id)}
                              aria-label="Delete Payment"
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

      {/* Add / Edit Payment Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingId !== null ? "Edit Payment Voucher" : "Disburse Farmer Payment"}
        maxWidth="640px"
        footer={
          <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end", width: "100%" }}>
            <Button variant="outline" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const formEl = document.getElementById("payment-form") as HTMLFormElement;
                if (formEl) formEl.requestSubmit();
              }}
              loading={saving}
            >
              {editingId !== null ? "Update Payment" : "Authorize Disbursal"}
            </Button>
          </div>
        }
      >
        <form id="payment-form" onSubmit={handleSubmit}>
          <div className="al-form-grid-2">
            <FormField label="Beneficiary Farmer" required>
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

            <FormField label="Linked Settlement (Optional)">
              <Select
                value={form.settlementId}
                onChange={(e) => handleChange("settlementId", e.target.value)}
                disabled={!form.farmerId}
              >
                <option value="">-- None / Standalone Advance --</option>
                {availableSettlements.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    Statement #{s.id} ({formatCurrency(Number(s.finalAmount || 0))})
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Disbursement Date" required>
              <Input
                type="date"
                value={form.paymentDate}
                onChange={(e) => handleChange("paymentDate", e.target.value)}
              />
            </FormField>

            <FormField label="Payout Amount (₹)" required>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 25000.00"
                value={form.amount}
                onChange={(e) => handleChange("amount", e.target.value)}
              />
            </FormField>

            <FormField label="Payment Channel" required>
              <Select
                value={form.paymentMode}
                onChange={(e) => handleChange("paymentMode", e.target.value)}
              >
                <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS)</option>
                <option value="UPI">UPI / Digital Payout</option>
                <option value="CHEQUE">Bank Cheque / DD</option>
                <option value="CASH">Cash in Hand</option>
              </Select>
            </FormField>

            <FormField label="Bank Reference / UTR #">
              <Input
                placeholder="e.g. UTR-9821381283"
                value={form.referenceNumber}
                onChange={(e) => handleChange("referenceNumber", e.target.value)}
              />
            </FormField>
          </div>

          <div style={{ marginTop: "var(--space-3)" }}>
            <FormField label="Voucher Notes / Signoff">
              <Input
                placeholder="Approved by admin, account notes..."
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