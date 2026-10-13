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
  villageId?: number | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  bankName?: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface Village {
  id: number;
  name: string;
  mandal: string;
  district: string;
  state: string;
  pincode: string;
  status: "ACTIVE" | "INACTIVE";
}

interface FarmerForm {
  farmerCode: string;
  name: string;
  phone: string;
  villageId: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankName: string;
  status: "ACTIVE" | "INACTIVE";
}

const emptyForm: FarmerForm = {
  farmerCode: "",
  name: "",
  phone: "",
  villageId: "",
  bankAccountName: "",
  bankAccountNumber: "",
  bankIfsc: "",
  bankName: "",
  status: "ACTIVE",
};

export default function Farmers() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);
  const [form, setForm] = useState<FarmerForm>(emptyForm);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ============================================================
  // LOAD DATA
  // ============================================================

  const loadFarmers = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<Farmer[]>("/farmers");
      const data = response.data;
      setFarmers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Farmers loading error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load farmers. Please verify backend connection."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadVillages = async () => {
    try {
      const response = await api.get<Village[]>("/villages");
      const data = response.data;
      setVillages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Villages loading error:", err);
    }
  };

  const loadAllData = async () => {
    setError("");
    await Promise.all([loadFarmers(), loadVillages()]);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // ============================================================
  // FORM HANDLING
  // ============================================================

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const openCreateModal = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (farmer: Farmer) => {
    setForm({
      farmerCode: farmer.farmerCode || "",
      name: farmer.name || "",
      phone: farmer.phone || "",
      villageId: farmer.villageId ? farmer.villageId.toString() : "",
      bankAccountName: farmer.bankAccountName || "",
      bankAccountNumber: farmer.bankAccountNumber || "",
      bankIfsc: farmer.bankIfsc || "",
      bankName: farmer.bankName || "",
      status: farmer.status || "ACTIVE",
    });
    setEditingId(farmer.id);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  // ============================================================
  // CREATE / UPDATE
  // ============================================================

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    if (!form.farmerCode.trim()) {
      setError("Farmer code is required.");
      setSaving(false);
      return;
    }

    if (!form.name.trim()) {
      setError("Farmer name is required.");
      setSaving(false);
      return;
    }

    if (!form.villageId) {
      setError("Please select a village.");
      setSaving(false);
      return;
    }

    const payload = {
      farmerCode: form.farmerCode.trim(),
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      villageId: Number(form.villageId),
      bankAccountName: form.bankAccountName.trim() || null,
      bankAccountNumber: form.bankAccountNumber.trim() || null,
      bankIfsc: form.bankIfsc.trim().toUpperCase() || null,
      bankName: form.bankName.trim() || null,
      status: form.status,
    };

    try {
      if (editingId) {
        await api.put(`/farmers/${editingId}`, payload);
        setSuccess("Farmer profile updated successfully.");
      } else {
        await api.post("/farmers", payload);
        setSuccess("Farmer registered successfully.");
      }

      closeModal();
      await loadFarmers();
    } catch (err: unknown) {
      console.error("Farmer save error:", err);
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string; message?: string } } })
            .response?.data?.error ||
          (err as { response?: { data?: { error?: string; message?: string } } })
            .response?.data?.message ||
          "Unable to save farmer."
          : err instanceof Error
            ? err.message
            : "Unable to save farmer.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // DELETE
  // ============================================================

  const handleDelete = async (id: number, farmerName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove farmer "${farmerName}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/farmers/${id}`);
      setSuccess("Farmer removed successfully.");
      await loadFarmers();
    } catch (err: unknown) {
      console.error("Farmer delete error:", err);
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string; message?: string } } })
            .response?.data?.error ||
          (err as { response?: { data?: { error?: string; message?: string } } })
            .response?.data?.message ||
          "Unable to delete farmer."
          : "Unable to delete farmer.";
      setError(msg);
    }
  };

  const getVillageName = (villageId?: number | null) => {
    if (!villageId) return "—";
    const village = villages.find((item) => item.id === villageId);
    return village ? `${village.name} (${village.district})` : `Village #${villageId}`;
  };

  // ============================================================
  // FILTERED FARMERS & SUMMARY METRICS
  // ============================================================

  const filteredFarmers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return farmers.filter((farmer) => {
      const villageText = getVillageName(farmer.villageId).toLowerCase();
      const matchesSearch =
        !keyword ||
        farmer.name.toLowerCase().includes(keyword) ||
        farmer.farmerCode.toLowerCase().includes(keyword) ||
        (farmer.phone || "").toLowerCase().includes(keyword) ||
        (farmer.bankName || "").toLowerCase().includes(keyword) ||
        villageText.includes(keyword);

      const matchesStatus =
        statusFilter === "ALL" || farmer.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [farmers, search, statusFilter, villages]);

  const metrics = useMemo(() => {
    const active = farmers.filter((f) => f.status === "ACTIVE").length;
    const inactive = farmers.filter((f) => f.status === "INACTIVE").length;
    return {
      total: farmers.length,
      active,
      inactive,
      villagesCount: villages.length,
    };
  }, [farmers, villages]);

  return (
    <div className="al-page-wrapper">
      {/* Page Header */}
      <PageHeader
        eyebrow="Directory & KYC"
        title="Farmers Management"
        description="Register and manage farmer profiles, village associations, contact details, and bank settlement accounts."
        actions={
          <Button
            variant="primary"
            icon="➕"
            onClick={openCreateModal}
          >
            Register Farmer
          </Button>
        }
      />

      {/* Notifications */}
      {error && (
        <Alert variant="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {/* Summary KPI Grid */}
      <section className="al-summary-grid">
        <StatCard
          label="Total Registered"
          value={metrics.total}
          icon="👨‍🌾"
          subtitle="All profiles in system"
        />
        <StatCard
          label="Active Accounts"
          value={metrics.active}
          icon="✓"
          subtitle="Eligible for crop sales"
          badge={<Badge variant="success">Active</Badge>}
        />
        <StatCard
          label="Inactive Profiles"
          value={metrics.inactive}
          icon="⏸"
          subtitle="Pending or archived"
          badge={<Badge variant="neutral">Inactive</Badge>}
        />
        <StatCard
          label="Linked Villages"
          value={metrics.villagesCount}
          icon="📍"
          subtitle="Coverage locations"
        />
      </section>

      {/* Search & Filter Bar */}
      <div className="al-filter-bar">
        <div className="al-filter-search">
          <Input
            placeholder="Search by farmer name, code, phone, village, or bank..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="al-filter-select">
          <Select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")
            }
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
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

          <Button
            variant="secondary"
            size="sm"
            icon="↻"
            onClick={loadAllData}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Farmers Data Table */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: 24 }}>
              <Skeleton height={40} style={{ marginBottom: 12 }} />
              <Skeleton height={40} style={{ marginBottom: 12 }} />
              <Skeleton height={40} style={{ marginBottom: 12 }} />
              <Skeleton height={40} />
            </div>
          ) : filteredFarmers.length === 0 ? (
            <EmptyState
              icon="👨‍🌾"
              title={search ? "No matching farmers found" : "No farmers registered yet"}
              description={
                search
                  ? "Try adjusting your search criteria or resetting the filters."
                  : "Begin by registering your first farmer to link fields and crop seasons."
              }
              action={
                !search && (
                  <Button variant="primary" size="sm" onClick={openCreateModal}>
                    Register First Farmer
                  </Button>
                )
              }
            />
          ) : (
            <TableContainer style={{ border: "none", borderRadius: 0, boxShadow: "none" }}>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Farmer</Th>
                    <Th>Farmer Code</Th>
                    <Th>Contact Phone</Th>
                    <Th>Village & Mandal</Th>
                    <Th>Bank Account</Th>
                    <Th>Status</Th>
                    <Th style={{ textAlign: "right" }}>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredFarmers.map((farmer) => (
                    <Tr key={farmer.id}>
                      <Td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              background: "var(--color-primary-subtle, #E8F3ED)",
                              color: "var(--color-primary-forest, #174D35)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            {farmer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong style={{ display: "block" }}>{farmer.name}</strong>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <Badge variant="forest">{farmer.farmerCode}</Badge>
                      </Td>
                      <Td>{farmer.phone || "—"}</Td>
                      <Td>{getVillageName(farmer.villageId)}</Td>
                      <Td>
                        {farmer.bankName ? (
                          <div>
                            <span>{farmer.bankName}</span>
                            <small
                              style={{
                                display: "block",
                                color: "var(--color-text-muted, #768A7E)",
                                fontSize: 11,
                              }}
                            >
                              {farmer.bankAccountNumber
                                ? `•••• ${farmer.bankAccountNumber.slice(-4)}`
                                : "—"}
                            </small>
                          </div>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td>
                        <Badge
                          variant={farmer.status === "ACTIVE" ? "success" : "neutral"}
                          dot
                        >
                          {farmer.status}
                        </Badge>
                      </Td>
                      <Td style={{ textAlign: "right" }}>
                        <div className="al-table-actions">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => openEditModal(farmer)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            style={{ color: "var(--color-danger, #DC2626)" }}
                            onClick={() => handleDelete(farmer.id, farmer.name)}
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
        </CardBody>
      </Card>

      {/* =====================================================
          ADD / EDIT FARMER MODAL
      ====================================================== */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingId ? "Edit Farmer Profile" : "Register New Farmer"}
        maxWidth="640px"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              loading={saving}
            >
              {editingId ? "Update Profile" : "Create Farmer"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="al-form-grid-2">
            <FormField label="Farmer Code" required>
              <Input
                name="farmerCode"
                placeholder="e.g. FAR-101"
                value={form.farmerCode}
                onChange={handleChange}
                required
              />
            </FormField>

            <FormField label="Full Name" required>
              <Input
                name="name"
                placeholder="e.g. Ramesh Kumar"
                value={form.name}
                onChange={handleChange}
                required
              />
            </FormField>
          </div>

          <div className="al-form-grid-2">
            <FormField label="Phone Number">
              <Input
                name="phone"
                type="tel"
                placeholder="10-digit mobile number"
                value={form.phone}
                onChange={handleChange}
              />
            </FormField>

            <FormField label="Village Location" required>
              <Select
                name="villageId"
                value={form.villageId}
                onChange={handleChange}
                required
              >
                <option value="">Select Village...</option>
                {villages.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.mandal}, {v.district})
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="al-form-grid-2">
            <FormField label="Account Status">
              <Select
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </Select>
            </FormField>

            <FormField label="Bank Name">
              <Input
                name="bankName"
                placeholder="e.g. State Bank of India"
                value={form.bankName}
                onChange={handleChange}
              />
            </FormField>
          </div>

          <div className="al-form-grid-2">
            <FormField label="Bank Account Number">
              <Input
                name="bankAccountNumber"
                placeholder="Account number"
                value={form.bankAccountNumber}
                onChange={handleChange}
              />
            </FormField>

            <FormField label="IFSC Code">
              <Input
                name="bankIfsc"
                placeholder="e.g. SBIN0001234"
                value={form.bankIfsc}
                onChange={handleChange}
              />
            </FormField>
          </div>

          <FormField label="Account Holder Name (as in bank passbook)">
            <Input
              name="bankAccountName"
              placeholder="Name on bank passbook"
              value={form.bankAccountName}
              onChange={handleChange}
            />
          </FormField>
        </form>
      </Modal>
    </div>
  );
}