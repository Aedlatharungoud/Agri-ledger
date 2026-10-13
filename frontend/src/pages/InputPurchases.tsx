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
  status: "ACTIVE" | "INACTIVE";
}

interface Product {
  id: number;
  productName: string;
  category?: string | null;
  brandName?: string | null;
  unit?: string | null;
}

interface CropSeason {
  id: number;
  fieldId: number;
  season?: string | null;
  cropName: string;
  year?: number | null;
  status?: string | null;
}

interface InputPurchase {
  id: number;
  farmerId: number;
  cropSeasonId: number;
  productId: number;
  purchaseDate: string;
  quantity: number;
  unitPrice: number;
  supplierName?: string | null;
  paymentType: string;
  paidAmount: number;
  notes?: string | null;
  totalAmount?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface InputPurchaseForm {
  farmerId: string;
  cropSeasonId: string;
  productId: string;
  purchaseDate: string;
  quantity: string;
  unitPrice: string;
  supplierName: string;
  paymentType: string;
  paidAmount: string;
  notes: string;
}

const emptyForm: InputPurchaseForm = {
  farmerId: "",
  cropSeasonId: "",
  productId: "",
  purchaseDate: new Date().toISOString().split("T")[0],
  quantity: "",
  unitPrice: "",
  supplierName: "",
  paymentType: "CREDIT",
  paidAmount: "0",
  notes: "",
};

export default function InputPurchases() {
  const [purchases, setPurchases] = useState<InputPurchase[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [cropSeasons, setCropSeasons] = useState<CropSeason[]>([]);

  const [form, setForm] = useState<InputPurchaseForm>(emptyForm);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("ALL");

  // ============================================================
  // LOAD DATA
  // ============================================================

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [purchasesRes, farmersRes, productsRes, seasonsRes] = await Promise.all([
        api.get("/input-purchases"),
        api.get("/farmers"),
        api.get("/products"),
        api.get("/crop-seasons"),
      ]);

      setPurchases(Array.isArray(purchasesRes.data) ? purchasesRes.data : []);
      setFarmers(Array.isArray(farmersRes.data) ? farmersRes.data : []);
      setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
      setCropSeasons(Array.isArray(seasonsRes.data) ? seasonsRes.data : []);
    } catch (err: unknown) {
      console.error(err);
      setError("Unable to load input purchases. Please make sure the backend is running.");
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

  const productMap = useMemo(() => {
    const map = new Map<number, Product>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  const seasonMap = useMemo(() => {
    const map = new Map<number, CropSeason>();
    for (const s of cropSeasons) map.set(s.id, s);
    return map;
  }, [cropSeasons]);

  // ============================================================
  // STATS
  // ============================================================

  const stats = useMemo(() => {
    let totalGross = 0;
    let totalPaid = 0;

    purchases.forEach((p) => {
      const gross = p.totalAmount !== undefined ? p.totalAmount : Number(p.quantity) * Number(p.unitPrice);
      totalGross += gross;
      totalPaid += Number(p.paidAmount || 0);
    });

    const totalOutstanding = Math.max(0, totalGross - totalPaid);

    return {
      count: purchases.length,
      totalGross,
      totalPaid,
      totalOutstanding,
    };
  }, [purchases]);

  // ============================================================
  // FILTERED PURCHASES
  // ============================================================

  const filteredPurchases = useMemo(() => {
    const query = search.trim().toLowerCase();

    return purchases.filter((item) => {
      // Payment filter
      if (paymentFilter !== "ALL" && item.paymentType.toUpperCase() !== paymentFilter.toUpperCase()) {
        return false;
      }

      // Search query
      if (query) {
        const farmer = farmerMap.get(item.farmerId);
        const product = productMap.get(item.productId);
        const season = seasonMap.get(item.cropSeasonId);

        const matchFarmer = farmer?.name.toLowerCase().includes(query) ?? false;
        const matchFarmerCode = farmer?.farmerCode.toLowerCase().includes(query) ?? false;
        const matchProduct = product?.productName.toLowerCase().includes(query) ?? false;
        const matchBrand = product?.brandName?.toLowerCase().includes(query) ?? false;
        const matchSupplier = item.supplierName?.toLowerCase().includes(query) ?? false;
        const matchCrop = season?.cropName.toLowerCase().includes(query) ?? false;

        if (!matchFarmer && !matchFarmerCode && !matchProduct && !matchBrand && !matchSupplier && !matchCrop) {
          return false;
        }
      }

      return true;
    });
  }, [purchases, search, paymentFilter, farmerMap, productMap, seasonMap]);

  // Form calculated totals
  const formGross = Number(form.quantity || 0) * Number(form.unitPrice || 0);
  const formDue = Math.max(0, formGross - Number(form.paidAmount || 0));

  // ============================================================
  // FORM HANDLING
  // ============================================================

  const handleChange = (field: keyof InputPurchaseForm, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "paymentType" && value === "CASH") {
        const gross = Number(next.quantity || 0) * Number(next.unitPrice || 0);
        next.paidAmount = String(gross);
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
      purchaseDate: new Date().toISOString().split("T")[0],
    });
    setShowModal(true);
  };

  const openEditModal = (p: InputPurchase) => {
    setError("");
    setSuccess("");
    setEditingId(p.id);
    setForm({
      farmerId: String(p.farmerId),
      cropSeasonId: String(p.cropSeasonId),
      productId: String(p.productId),
      purchaseDate: p.purchaseDate ? p.purchaseDate.split("T")[0] : "",
      quantity: String(p.quantity),
      unitPrice: String(p.unitPrice),
      supplierName: p.supplierName || "",
      paymentType: p.paymentType || "CREDIT",
      paidAmount: String(p.paidAmount ?? 0),
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
    if (!form.cropSeasonId) {
      setError("Please select a crop season.");
      return;
    }
    if (!form.productId) {
      setError("Please select a product.");
      return;
    }
    if (!form.purchaseDate) {
      setError("Purchase date is required.");
      return;
    }

    const qty = Number(form.quantity);
    if (Number.isNaN(qty) || qty <= 0) {
      setError("Quantity must be greater than 0.");
      return;
    }

    const price = Number(form.unitPrice);
    if (Number.isNaN(price) || price < 0) {
      setError("Unit price must be 0 or greater.");
      return;
    }

    const paid = Number(form.paidAmount || 0);
    const total = qty * price;
    if (paid > total) {
      setError("Paid amount cannot exceed total purchase amount.");
      return;
    }

    const payload = {
      farmerId: Number(form.farmerId),
      cropSeasonId: Number(form.cropSeasonId),
      productId: Number(form.productId),
      purchaseDate: form.purchaseDate,
      quantity: qty,
      unitPrice: price,
      supplierName: form.supplierName.trim() || null,
      paymentType: form.paymentType,
      paidAmount: paid,
      notes: form.notes.trim() || null,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await api.put(`/input-purchases/${editingId}`, payload);
        setSuccess("Input purchase updated successfully.");
      } else {
        await api.post("/input-purchases", payload);
        setSuccess("Input purchase recorded successfully.");
      }

      closeModal();
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Failed to save input purchase.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm("Are you sure you want to delete this purchase entry? Linked ledger deductions will be affected.");
    if (!confirmed) return;

    try {
      await api.delete(`/input-purchases/${id}`);
      setSuccess("Input purchase deleted successfully.");
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Failed to delete purchase record.");
    }
  };

  const formatCurrency = (val: number) => `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="al-page-wrapper">
      {/* Header */}
      <PageHeader
        eyebrow="Input & Supplies Procurement"
        title="Input Purchases"
        description="Track seeds, fertilizers, and crop protection procurement booked to farmers on cash or seasonal credit."
        actions={
          <Button variant="primary" icon="+" onClick={openAddModal}>
            Record Purchase
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
          label="Total Purchases"
          value={formatCurrency(stats.totalGross)}
          icon="📦"
          subtitle={`${stats.count} procurement entries`}
        />

        <StatCard
          label="Cash Paid"
          value={formatCurrency(stats.totalPaid)}
          icon="💵"
          subtitle="Cleared upfront"
          badge={<Badge variant="success">Paid</Badge>}
        />

        <StatCard
          label="Credit Outstanding"
          value={formatCurrency(stats.totalOutstanding)}
          icon="⏳"
          subtitle="Deductible at harvest settlement"
          badge={<Badge variant="warning">Payable</Badge>}
        />

        <StatCard
          label="Active Suppliers"
          value={new Set(purchases.map((p) => p.supplierName).filter(Boolean)).size || "Direct"}
          icon="🏭"
          subtitle="Distributors & depots"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="al-filter-bar">
        <div className="al-filter-search">
          <Input
            placeholder="Search by farmer, product brand, supplier, or crop..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="al-filter-select">
          <Select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
          >
            <option value="ALL">All Payment Terms</option>
            <option value="CREDIT">Credit / Ledger</option>
            <option value="CASH">Cash / Paid</option>
            <option value="PARTIAL">Partial Payment</option>
          </Select>
        </div>

        <div className="al-filter-actions">
          {(search || paymentFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setPaymentFilter("ALL");
              }}
            >
              Reset Filters
            </Button>
          )}
          <Badge variant="neutral">
            {filteredPurchases.length} {filteredPurchases.length === 1 ? "entry" : "entries"}
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
          ) : filteredPurchases.length === 0 ? (
            <EmptyState
              icon="📦"
              title={search || paymentFilter !== "ALL" ? "No purchases match your filter" : "No purchases recorded"}
              description={
                search || paymentFilter !== "ALL"
                  ? "Try resetting filters or adjusting search keywords."
                  : "Record your first agricultural input sale or disbursement."
              }
              action={
                search || paymentFilter !== "ALL" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setPaymentFilter("ALL");
                    }}
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button variant="primary" icon="+" onClick={openAddModal}>
                    Record Purchase
                  </Button>
                )
              }
            />
          ) : (
            <TableContainer>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Date</Th>
                    <Th>Farmer</Th>
                    <Th>Product & Supplier</Th>
                    <Th align="right">Qty & Rate</Th>
                    <Th align="right">Total Amount</Th>
                    <Th>Payment Status</Th>
                    <Th align="right">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredPurchases.map((p) => {
                    const farmer = farmerMap.get(p.farmerId);
                    const product = productMap.get(p.productId);
                    const gross = p.totalAmount !== undefined ? p.totalAmount : Number(p.quantity) * Number(p.unitPrice);
                    const paid = Number(p.paidAmount || 0);
                    const due = Math.max(0, gross - paid);

                    return (
                      <Tr key={p.id}>
                        {/* Date */}
                        <Td>
                          <span style={{ fontWeight: 500, color: "var(--color-text)" }}>
                            {p.purchaseDate ? p.purchaseDate.split("T")[0] : "—"}
                          </span>
                        </Td>

                        {/* Farmer */}
                        <Td>
                          {farmer ? (
                            <div>
                              <div style={{ fontWeight: 600, color: "var(--color-text)" }}>{farmer.name}</div>
                              <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                                {farmer.farmerCode}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: "var(--color-text-muted)" }}>Farmer #{p.farmerId}</span>
                          )}
                        </Td>

                        {/* Product */}
                        <Td>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--color-text)" }}>
                              {product?.productName || `Product #${p.productId}`}
                            </div>
                            <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                              {product?.brandName ? `${product.brandName} • ` : ""}
                              {p.supplierName ? `Supplier: ${p.supplierName}` : "Direct"}
                            </div>
                          </div>
                        </Td>

                        {/* Qty & Rate */}
                        <Td align="right">
                          <span style={{ fontWeight: 600 }}>{p.quantity}</span>{" "}
                          <span style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                            {product?.unit || "Units"}
                          </span>
                          <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                            @ {formatCurrency(p.unitPrice)}
                          </div>
                        </Td>

                        {/* Total Amount */}
                        <Td align="right">
                          <div style={{ fontWeight: 700, color: "var(--color-text)" }}>
                            {formatCurrency(gross)}
                          </div>
                          {due > 0 && (
                            <div style={{ fontSize: "var(--font-xs)", color: "var(--color-warning)" }}>
                              Due: {formatCurrency(due)}
                            </div>
                          )}
                        </Td>

                        {/* Payment Status */}
                        <Td>
                          <Badge variant={p.paymentType === "CASH" ? "success" : due > 0 ? "warning" : "info"}>
                            {p.paymentType}
                          </Badge>
                        </Td>

                        {/* Actions */}
                        <Td align="right">
                          <div className="al-table-actions">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(p)}
                              aria-label="Edit Purchase"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(p.id)}
                              aria-label="Delete Purchase"
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

      {/* Add / Edit Input Purchase Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingId !== null ? "Edit Input Purchase" : "Record Input Purchase"}
        maxWidth="680px"
        footer={
          <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end", width: "100%" }}>
            <Button variant="outline" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const formEl = document.getElementById("purchase-form") as HTMLFormElement;
                if (formEl) formEl.requestSubmit();
              }}
              loading={saving}
            >
              {editingId !== null ? "Update Purchase" : "Save Purchase"}
            </Button>
          </div>
        }
      >
        <form id="purchase-form" onSubmit={handleSubmit}>
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

            <FormField label="Crop Season" required>
              <Select
                value={form.cropSeasonId}
                onChange={(e) => handleChange("cropSeasonId", e.target.value)}
              >
                <option value="">-- Select Crop Season --</option>
                {cropSeasons.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.cropName} ({s.season} {s.year})
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Product Item" required>
              <Select
                value={form.productId}
                onChange={(e) => handleChange("productId", e.target.value)}
              >
                <option value="">-- Select Product --</option>
                {products.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.productName} {p.brandName ? `(${p.brandName})` : ""} - [{p.unit || "Unit"}]
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Purchase Date" required>
              <Input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => handleChange("purchaseDate", e.target.value)}
              />
            </FormField>

            <FormField label="Quantity" required>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 5"
                value={form.quantity}
                onChange={(e) => handleChange("quantity", e.target.value)}
              />
            </FormField>

            <FormField label="Unit Price (₹)" required>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 320.00"
                value={form.unitPrice}
                onChange={(e) => handleChange("unitPrice", e.target.value)}
              />
            </FormField>

            <FormField label="Supplier / Merchant Name">
              <Input
                placeholder="e.g. Lakshmi Agri Traders"
                value={form.supplierName}
                onChange={(e) => handleChange("supplierName", e.target.value)}
              />
            </FormField>

            <FormField label="Payment Method" required>
              <Select
                value={form.paymentType}
                onChange={(e) => handleChange("paymentType", e.target.value)}
              >
                <option value="CREDIT">Credit (Deduct from Settlement)</option>
                <option value="CASH">Cash (Paid Upfront)</option>
                <option value="PARTIAL">Partial Payment</option>
              </Select>
            </FormField>

            <FormField label="Paid Upfront (₹)">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.paidAmount}
                onChange={(e) => handleChange("paidAmount", e.target.value)}
              />
            </FormField>

            <FormField label="Notes / Invoice Ref">
              <Input
                placeholder="Invoice # or remarks..."
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
              />
            </FormField>
          </div>

          {/* Real-time Calculation Summary */}
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
              Total Cost: <strong>{formatCurrency(formGross)}</strong>
            </span>
            <span>
              Balance Due: <strong style={{ color: formDue > 0 ? "var(--color-warning)" : "var(--color-success)" }}>
                {formatCurrency(formDue)}
              </strong>
            </span>
          </div>
        </form>
      </Modal>
    </div>
  );
}