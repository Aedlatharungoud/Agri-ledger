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

interface Field {
  id: number;
  farmerId: number;
  fieldName: string;
  surveyNumber: string | null;
  fieldVillageId: number;
  areaAcres: number | null;
  irrigationType: string | null;
  ownershipType: "OWNED" | "LEASED";
}

interface CropSeason {
  id: number;
  fieldId: number;
  season: string | null;
  cropName: string;
  year: number | null;
  sowingDate: string | null;
  expectedHarvestDate: string | null;
  status: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface CropSeasonForm {
  fieldId: string;
  season: string;
  cropName: string;
  year: string;
  sowingDate: string;
  expectedHarvestDate: string;
  status: string;
}

const emptyForm: CropSeasonForm = {
  fieldId: "",
  season: "Kharif",
  cropName: "",
  year: String(new Date().getFullYear()),
  sowingDate: "",
  expectedHarvestDate: "",
  status: "PLANNED",
};

export default function CropSeasons() {
  const [cropSeasons, setCropSeasons] = useState<CropSeason[]>([]);
  const [fields, setFields] = useState<Field[]>([]);

  const [form, setForm] = useState<CropSeasonForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [seasonFilter, setSeasonFilter] = useState("ALL");

  // ============================================================
  // LOAD DATA
  // ============================================================

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [seasonsRes, fieldsRes] = await Promise.all([
        api.get("/crop-seasons"),
        api.get("/fields"),
      ]);

      setCropSeasons(Array.isArray(seasonsRes.data) ? seasonsRes.data : []);
      setFields(Array.isArray(fieldsRes.data) ? fieldsRes.data : []);
    } catch (err: unknown) {
      console.error(err);
      setError("Unable to load crop seasons or fields. Please ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick lookup maps
  const fieldMap = useMemo(() => {
    const map = new Map<number, Field>();
    for (const f of fields) map.set(f.id, f);
    return map;
  }, [fields]);

  // ============================================================
  // STATS
  // ============================================================

  const stats = useMemo(() => {
    const total = cropSeasons.length;
    const inProgress = cropSeasons.filter(
      (c) => c.status === "IN_PROGRESS" || c.status === "ACTIVE"
    ).length;
    const planned = cropSeasons.filter((c) => c.status === "PLANNED").length;
    const harvested = cropSeasons.filter(
      (c) => c.status === "COMPLETED" || c.status === "HARVESTED"
    ).length;

    return { total, inProgress, planned, harvested };
  }, [cropSeasons]);

  // ============================================================
  // FILTERED CROP SEASONS
  // ============================================================

  const filteredCropSeasons = useMemo(() => {
    const query = search.trim().toLowerCase();

    return cropSeasons.filter((cs) => {
      // Status filter
      if (statusFilter !== "ALL" && cs.status.toUpperCase() !== statusFilter.toUpperCase()) {
        return false;
      }

      // Season filter
      if (seasonFilter !== "ALL") {
        if (!cs.season || cs.season.toUpperCase() !== seasonFilter.toUpperCase()) {
          return false;
        }
      }

      // Search query
      if (query) {
        const field = fieldMap.get(cs.fieldId);
        const matchCrop = cs.cropName.toLowerCase().includes(query);
        const matchSeason = cs.season?.toLowerCase().includes(query) ?? false;
        const matchYear = String(cs.year || "").includes(query);
        const matchField = field?.fieldName.toLowerCase().includes(query) ?? false;

        if (!matchCrop && !matchSeason && !matchYear && !matchField) {
          return false;
        }
      }

      return true;
    });
  }, [cropSeasons, search, statusFilter, seasonFilter, fieldMap]);

  // ============================================================
  // FORM HANDLING
  // ============================================================

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setError("");
    setSuccess("");
    setForm(emptyForm);
    setEditingId(null);
    setShowModal(true);
  };

  const openEditModal = (cs: CropSeason) => {
    setError("");
    setSuccess("");
    setEditingId(cs.id);
    setForm({
      fieldId: String(cs.fieldId),
      season: cs.season || "",
      cropName: cs.cropName || "",
      year: cs.year !== null && cs.year !== undefined ? String(cs.year) : "",
      sowingDate: cs.sowingDate ? cs.sowingDate.split("T")[0] : "",
      expectedHarvestDate: cs.expectedHarvestDate ? cs.expectedHarvestDate.split("T")[0] : "",
      status: cs.status || "PLANNED",
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

    if (!form.fieldId) {
      setError("Please select a field parcel.");
      return;
    }
    if (!form.cropName.trim()) {
      setError("Crop name is required.");
      return;
    }
    if (!form.season.trim()) {
      setError("Season name is required.");
      return;
    }
    if (!form.year) {
      setError("Year is required.");
      return;
    }

    const yearNum = Number(form.year);
    if (Number.isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      setError("Please enter a valid year between 2000 and 2100.");
      return;
    }

    if (form.sowingDate && form.expectedHarvestDate && form.expectedHarvestDate < form.sowingDate) {
      setError("Expected harvest date cannot precede sowing date.");
      return;
    }

    const payload = {
      fieldId: Number(form.fieldId),
      season: form.season.trim(),
      cropName: form.cropName.trim(),
      year: yearNum,
      sowingDate: form.sowingDate || null,
      expectedHarvestDate: form.expectedHarvestDate || null,
      status: form.status,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await api.put(`/crop-seasons/${editingId}`, payload);
        setSuccess("Crop season updated successfully.");
      } else {
        await api.post("/crop-seasons", payload);
        setSuccess("Crop season created successfully.");
      }

      closeModal();
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Unable to save crop season.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm("Are you sure you want to delete this crop season? Linked harvests and expenses will be affected.");
    if (!confirmed) return;

    try {
      await api.delete(`/crop-seasons/${id}`);
      setSuccess("Crop season deleted successfully.");
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Failed to delete crop season.");
    }
  };

  // Helper badge for status
  const getStatusBadgeVariant = (status: string) => {
    const upper = status.toUpperCase();
    if (upper === "IN_PROGRESS" || upper === "ACTIVE") return "warning";
    if (upper === "HARVESTED" || upper === "COMPLETED") return "success";
    if (upper === "CANCELLED") return "danger";
    return "info";
  };

  return (
    <div className="al-page-wrapper">
      {/* Header */}
      <PageHeader
        eyebrow="Agronomic Cycle Management"
        title="Crop Seasons"
        description="Schedule, monitor, and record crop cultivation cycles across active field parcels from sowing to harvest."
        actions={
          <Button variant="primary" icon="+" onClick={openAddModal}>
            Add Crop Season
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

      {/* KPI Cards */}
      <div className="al-summary-grid">
        <StatCard
          label="Total Crop Seasons"
          value={stats.total}
          icon="🌱"
          subtitle="Cumulative seasons logged"
        />

        <StatCard
          label="In Progress"
          value={stats.inProgress}
          icon="⏳"
          subtitle="Actively growing crops"
          badge={<Badge variant="warning">Active</Badge>}
        />

        <StatCard
          label="Planned"
          value={stats.planned}
          icon="📅"
          subtitle="Upcoming sowing cycles"
          badge={<Badge variant="info">Planned</Badge>}
        />

        <StatCard
          label="Harvested / Completed"
          value={stats.harvested}
          icon="🌾"
          subtitle="Concluded crop runs"
          badge={<Badge variant="success">Done</Badge>}
        />
      </div>

      {/* Filters Bar */}
      <div className="al-filter-bar">
        <div className="al-filter-search">
          <Input
            placeholder="Search crop, season, field parcel, or year..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="al-filter-select">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="PLANNED">Planned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="HARVESTED">Harvested</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </div>

        <div className="al-filter-select">
          <Select
            value={seasonFilter}
            onChange={(e) => setSeasonFilter(e.target.value)}
          >
            <option value="ALL">All Seasons</option>
            <option value="Kharif">Kharif</option>
            <option value="Rabi">Rabi</option>
            <option value="Zaid">Zaid</option>
            <option value="Summer">Summer</option>
            <option value="Winter">Winter</option>
          </Select>
        </div>

        <div className="al-filter-actions">
          {(search || statusFilter !== "ALL" || seasonFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("ALL");
                setSeasonFilter("ALL");
              }}
            >
              Reset Filters
            </Button>
          )}
          <Badge variant="neutral">
            {filteredCropSeasons.length} {filteredCropSeasons.length === 1 ? "cycle" : "cycles"}
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
          ) : filteredCropSeasons.length === 0 ? (
            <EmptyState
              icon="🌱"
              title={search || statusFilter !== "ALL" || seasonFilter !== "ALL" ? "No crop seasons match filter" : "No crop seasons found"}
              description={
                search || statusFilter !== "ALL" || seasonFilter !== "ALL"
                  ? "Try adjusting your search criteria or resetting filters."
                  : "Record your first agricultural crop cycle to start tracking production."
              }
              action={
                search || statusFilter !== "ALL" || seasonFilter !== "ALL" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("ALL");
                      setSeasonFilter("ALL");
                    }}
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button variant="primary" icon="+" onClick={openAddModal}>
                    Add Crop Season
                  </Button>
                )
              }
            />
          ) : (
            <TableContainer>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Crop & Cycle</Th>
                    <Th>Field Parcel</Th>
                    <Th>Year</Th>
                    <Th>Sowing Date</Th>
                    <Th>Expected Harvest</Th>
                    <Th>Status</Th>
                    <Th align="right">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredCropSeasons.map((cs) => {
                    const field = fieldMap.get(cs.fieldId);

                    return (
                      <Tr key={cs.id}>
                        {/* Crop & Season */}
                        <Td>
                          <div style={{ fontWeight: 600, color: "var(--color-text)" }}>
                            {cs.cropName}
                          </div>
                          <div style={{ fontSize: "var(--font-xs)", color: "var(--color-primary)", fontWeight: 500 }}>
                            {cs.season || "General"}
                          </div>
                        </Td>

                        {/* Field Parcel */}
                        <Td>
                          {field ? (
                            <div>
                              <div style={{ fontWeight: 500, color: "var(--color-text)" }}>{field.fieldName}</div>
                              <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                                {field.areaAcres ? `${field.areaAcres} ac` : ""} {field.surveyNumber ? `• Survey #${field.surveyNumber}` : ""}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: "var(--color-text-muted)" }}>Field #{cs.fieldId}</span>
                          )}
                        </Td>

                        {/* Year */}
                        <Td>
                          <span style={{ fontWeight: 500 }}>{cs.year || "—"}</span>
                        </Td>

                        {/* Sowing Date */}
                        <Td>
                          <span style={{ color: "var(--color-text)" }}>
                            {cs.sowingDate ? cs.sowingDate.split("T")[0] : "—"}
                          </span>
                        </Td>

                        {/* Expected Harvest */}
                        <Td>
                          <span style={{ color: "var(--color-text)" }}>
                            {cs.expectedHarvestDate ? cs.expectedHarvestDate.split("T")[0] : "—"}
                          </span>
                        </Td>

                        {/* Status */}
                        <Td>
                          <Badge variant={getStatusBadgeVariant(cs.status)}>
                            {cs.status.replace("_", " ")}
                          </Badge>
                        </Td>

                        {/* Actions */}
                        <Td align="right">
                          <div className="al-table-actions">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(cs)}
                              aria-label="Edit Season"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(cs.id)}
                              aria-label="Delete Season"
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

      {/* Add / Edit Crop Season Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingId !== null ? "Edit Crop Season" : "New Crop Season"}
        maxWidth="680px"
        footer={
          <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end", width: "100%" }}>
            <Button variant="outline" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const formEl = document.getElementById("crop-season-form") as HTMLFormElement;
                if (formEl) formEl.requestSubmit();
              }}
              loading={saving}
            >
              {editingId !== null ? "Update Season" : "Create Season"}
            </Button>
          </div>
        }
      >
        <form id="crop-season-form" onSubmit={handleSubmit}>
          <div className="al-form-grid-2">
            <FormField label="Field Parcel" required>
              <Select
                name="fieldId"
                value={form.fieldId}
                onChange={handleChange}
              >
                <option value="">-- Select Field Parcel --</option>
                {fields.map((f) => (
                  <option key={f.id} value={String(f.id)}>
                    {f.fieldName} ({f.areaAcres ? `${f.areaAcres} ac` : "Unspecified size"})
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Crop Name" required>
              <Input
                name="cropName"
                placeholder="e.g. Cotton, Paddy, Chilli"
                value={form.cropName}
                onChange={handleChange}
              />
            </FormField>

            <FormField label="Season Type" required>
              <Select
                name="season"
                value={form.season}
                onChange={handleChange}
              >
                <option value="Kharif">Kharif (Monsoon)</option>
                <option value="Rabi">Rabi (Winter)</option>
                <option value="Zaid">Zaid (Summer)</option>
                <option value="Annual">Annual (Year-round)</option>
                <option value="Other">Other</option>
              </Select>
            </FormField>

            <FormField label="Harvest / Planting Year" required>
              <Input
                type="number"
                name="year"
                placeholder="e.g. 2026"
                value={form.year}
                onChange={handleChange}
              />
            </FormField>

            <FormField label="Sowing Date">
              <Input
                type="date"
                name="sowingDate"
                value={form.sowingDate}
                onChange={handleChange}
              />
            </FormField>

            <FormField label="Expected Harvest Date">
              <Input
                type="date"
                name="expectedHarvestDate"
                value={form.expectedHarvestDate}
                onChange={handleChange}
              />
            </FormField>

            <FormField label="Lifecycle Status" required>
              <Select
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="PLANNED">Planned (Pre-sowing)</option>
                <option value="IN_PROGRESS">In Progress (Actively Growing)</option>
                <option value="HARVESTED">Harvested</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </Select>
            </FormField>
          </div>
        </form>
      </Modal>
    </div>
  );
}