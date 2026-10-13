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
  CropSeasonIcon,
  CropBadgeIcon,
  EmptyFarmIllustration,
} from "../components/ui";

interface Field {
  id: number;
  farmerId: number;
  fieldName: string;
  areaAcres?: number | null;
}

interface CropSeason {
  id: number;
  fieldId: number;
  season?: string | null;
  seasonName?: string | null;
  cropName: string;
  year?: number | null;
  sowingDate?: string | null;
  startDate?: string | null;
  expectedHarvestDate?: string | null;
  endDate?: string | null;
  status: string;
  createdAt?: string;
}

interface CropSeasonFormData {
  fieldId: string;
  season: string;
  cropName: string;
  year: string;
  sowingDate: string;
  expectedHarvestDate: string;
  status: string;
}

const emptyForm: CropSeasonFormData = {
  fieldId: "",
  season: "Kharif",
  cropName: "",
  year: String(new Date().getFullYear()),
  sowingDate: new Date().toISOString().split("T")[0],
  expectedHarvestDate: "",
  status: "PLANNED",
};

export default function MyCropSeasons() {
  const { user } = useAuth();

  const [seasons, setSeasons] = useState<CropSeason[]>([]);
  const [fields, setFields] = useState<Field[]>([]);

  const [form, setForm] = useState<CropSeasonFormData>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // ============================================================
  // LOAD DATA
  // ============================================================

  const loadData = async () => {
    if (!user || user.role !== "FARMER" || !user.farmerId) {
      setError("This page is available only for registered farmer accounts.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const farmerId = Number(user.farmerId);

    try {
      const [seasonsRes, fieldsRes] = await Promise.all([
        api.get<CropSeason[]>("/crop-seasons"),
        api.get<Field[]>("/fields"),
      ]);

      const allFields: Field[] = Array.isArray(fieldsRes.data) ? fieldsRes.data : [];
      const myFields = allFields.filter((f) => Number(f.farmerId) === farmerId);
      const myFieldIds = new Set(myFields.map((f) => f.id));

      const allSeasons: CropSeason[] = Array.isArray(seasonsRes.data) ? seasonsRes.data : [];
      // Defence-in-depth: link seasons strictly through the farmer's own fields
      const mySeasons = allSeasons.filter((s) => myFieldIds.has(s.fieldId));

      setFields(myFields);
      setSeasons(mySeasons);
    } catch (err: unknown) {
      console.error(err);
      setError("Unable to load your crop seasons. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.farmerId]);

  // Field map lookup
  const fieldMap = useMemo(() => {
    const map = new Map<number, Field>();
    for (const f of fields) map.set(f.id, f);
    return map;
  }, [fields]);

  // Metrics
  const stats = useMemo(() => {
    const total = seasons.length;
    const inProgress = seasons.filter(
      (s) => s.status === "IN_PROGRESS" || s.status === "ACTIVE"
    ).length;
    const planned = seasons.filter((s) => s.status === "PLANNED").length;
    const harvested = seasons.filter(
      (s) => s.status === "HARVESTED" || s.status === "COMPLETED"
    ).length;

    return { total, inProgress, planned, harvested };
  }, [seasons]);

  // Filtered list
  const filteredSeasons = useMemo(() => {
    const q = search.trim().toLowerCase();

    return seasons.filter((s) => {
      if (statusFilter !== "ALL" && s.status.toUpperCase() !== statusFilter.toUpperCase()) {
        return false;
      }

      if (q) {
        const field = fieldMap.get(s.fieldId);
        const matchCrop = s.cropName.toLowerCase().includes(q);
        const matchSeason = (s.season || s.seasonName || "").toLowerCase().includes(q);
        const matchField = field?.fieldName.toLowerCase().includes(q) ?? false;
        const matchYear = String(s.year || "").includes(q);

        if (!matchCrop && !matchSeason && !matchField && !matchYear) {
          return false;
        }
      }

      return true;
    });
  }, [seasons, search, statusFilter, fieldMap]);

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
    setEditingId(null);
    setForm({
      ...emptyForm,
      fieldId: fields.length > 0 ? String(fields[0].id) : "",
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (cs: CropSeason) => {
    setEditingId(cs.id);
    setForm({
      fieldId: String(cs.fieldId),
      season: cs.season || cs.seasonName || "Kharif",
      cropName: cs.cropName,
      year: cs.year ? String(cs.year) : String(new Date().getFullYear()),
      sowingDate: cs.sowingDate ? cs.sowingDate.split("T")[0] : cs.startDate ? cs.startDate.split("T")[0] : "",
      expectedHarvestDate: cs.expectedHarvestDate ? cs.expectedHarvestDate.split("T")[0] : cs.endDate ? cs.endDate.split("T")[0] : "",
      status: cs.status || "PLANNED",
    });
    setError("");
    setSuccess("");
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
      setError("Please select one of your field plots.");
      return;
    }
    if (!form.cropName.trim()) {
      setError("Crop name is required (e.g. Cotton, Paddy, Chilli).");
      return;
    }

    const yearNum = Number(form.year);
    if (Number.isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      setError("Please enter a valid planting year.");
      return;
    }

    if (form.sowingDate && form.expectedHarvestDate && form.expectedHarvestDate < form.sowingDate) {
      setError("Harvest date cannot be earlier than sowing date.");
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
        setSuccess("New crop season registered successfully.");
      }

      closeModal();
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Failed to save crop season.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, crop: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete crop season "${crop}"?`);
    if (!confirmed) return;

    try {
      await api.delete(`/crop-seasons/${id}`);
      setSuccess("Crop season removed.");
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Failed to delete crop season.");
    }
  };

  const getStatusBadge = (status: string) => {
    const upper = status.toUpperCase();
    if (upper === "IN_PROGRESS" || upper === "ACTIVE") return <Badge variant="warning">In Progress</Badge>;
    if (upper === "HARVESTED" || upper === "COMPLETED") return <Badge variant="success">Completed</Badge>;
    if (upper === "CANCELLED") return <Badge variant="danger">Cancelled</Badge>;
    return <Badge variant="info">Planned</Badge>;
  };

  return (
    <div className="al-page-wrapper">
      {/* Header */}
      <PageHeader
        eyebrow="Agronomic Cycle Management"
        title="My Crop Seasons"
        description="Plan and monitor your seasonal planting cycles, sowing dates, and harvest milestones across your fields."
        actions={
          <Button variant="primary" icon="+" onClick={openAddModal} disabled={fields.length === 0}>
            Start New Crop Season
          </Button>
        }
      />

      {/* Notifications */}
      {error && (
        <Alert variant="error" title="Notice" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" title="Success" onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {fields.length === 0 && !loading && (
        <Alert variant="warning" title="No Fields Found">
          You need to register at least one field plot before starting a crop cycle.{" "}
          <a href="/my-fields" style={{ color: "inherit", fontWeight: 700, textDecoration: "underline" }}>
            Register your field here ➔
          </a>
        </Alert>
      )}

      {/* Summary KPI Grid */}
      <div className="al-summary-grid">
        <StatCard
          label="Total Crop Cycles"
          value={stats.total}
          icon={<CropSeasonIcon size={24} />}
          subtitle="All recorded crop cycles"
        />

        <StatCard
          label="Actively Growing"
          value={stats.inProgress}
          icon={<CropSeasonIcon size={24} />}
          subtitle="Crops currently in field"
          badge={<Badge variant="warning">Active</Badge>}
        />

        <StatCard
          label="Upcoming / Planned"
          value={stats.planned}
          icon="📅"
          subtitle="Scheduled sowing runs"
          badge={<Badge variant="info">Planned</Badge>}
        />

        <StatCard
          label="Harvested / Finished"
          value={stats.harvested}
          icon="🌾"
          subtitle="Concluded crop runs"
          badge={<Badge variant="success">Harvested</Badge>}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="al-filter-bar">
        <div className="al-filter-search">
          <Input
            placeholder="Search by crop name, season, field, or year..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="al-filter-select">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Cycle Statuses</option>
            <option value="IN_PROGRESS">Actively Growing (In Progress)</option>
            <option value="PLANNED">Planned (Pre-sowing)</option>
            <option value="HARVESTED">Harvested / Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </div>

        <div style={{ display: "inline-flex", borderRadius: "8px", border: "1px solid var(--color-border, #E2E8E4)", overflow: "hidden" }}>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            style={{
              padding: "6px 14px",
              background: viewMode === "grid" ? "var(--color-primary-forest, #174D35)" : "#FFFFFF",
              color: viewMode === "grid" ? "#FFFFFF" : "var(--color-text-secondary, #4A5E53)",
              border: "none",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ▦ Cards
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            style={{
              padding: "6px 14px",
              background: viewMode === "table" ? "var(--color-primary-forest, #174D35)" : "#FFFFFF",
              color: viewMode === "table" ? "#FFFFFF" : "var(--color-text-secondary, #4A5E53)",
              border: "none",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ≡ Table
          </button>
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
            {filteredSeasons.length} {filteredSeasons.length === 1 ? "season" : "seasons"}
          </Badge>
        </div>
      </div>

      {/* Seasons Data Display */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: "var(--space-6)" }}>
              <Skeleton height="36px" style={{ marginBottom: "12px" }} />
              <Skeleton height="54px" style={{ marginBottom: "8px" }} />
              <Skeleton height="54px" style={{ marginBottom: "8px" }} />
              <Skeleton height="54px" />
            </div>
          ) : filteredSeasons.length === 0 ? (
            <EmptyState
              icon={<EmptyFarmIllustration size={100} />}
              title={search || statusFilter !== "ALL" ? "No crop cycles match filter" : "No crop seasons scheduled"}
              description={
                search || statusFilter !== "ALL"
                  ? "Try resetting your filter or search keywords."
                  : "Begin your first agricultural season by recording the crop and sowing date."
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
                  <Button variant="primary" icon="+" onClick={openAddModal} disabled={fields.length === 0}>
                    Start New Crop Season
                  </Button>
                )
              }
            />
          ) : viewMode === "grid" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", padding: "16px" }}>
              {filteredSeasons.map((cs) => {
                const field = fieldMap.get(cs.fieldId);

                return (
                  <div
                    key={cs.id}
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid var(--color-border, #E2E8E4)",
                      borderRadius: "12px",
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      boxShadow: "0 1px 3px rgba(24, 37, 30, 0.04)",
                      transition: "transform 0.2s ease, border-color 0.2s ease",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <CropBadgeIcon cropName={cs.cropName} size={42} />
                        <div>
                          <h4 style={{ margin: 0, fontSize: "15.5px", fontWeight: 700, color: "var(--color-text-primary, #18251E)" }}>
                            {cs.cropName}
                          </h4>
                          <span style={{ fontSize: "12px", color: "var(--color-primary-forest, #174D35)", fontWeight: 600 }}>
                            {cs.season || cs.seasonName || "General"} {cs.year ? `(${cs.year})` : ""}
                          </span>
                        </div>
                      </div>
                      {getStatusBadge(cs.status)}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "var(--color-surface-subtle, #F9FAF9)", padding: "10px 12px", borderRadius: "8px", fontSize: "12px" }}>
                      <div>
                        <span style={{ display: "block", color: "var(--color-text-muted, #768A7E)", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.04em" }}>SOWING DATE</span>
                        <strong style={{ color: "var(--color-text-primary, #18251E)" }}>
                          {cs.sowingDate ? cs.sowingDate.split("T")[0] : cs.startDate ? cs.startDate.split("T")[0] : "—"}
                        </strong>
                      </div>
                      <div>
                        <span style={{ display: "block", color: "var(--color-text-muted, #768A7E)", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.04em" }}>EST. HARVEST</span>
                        <strong style={{ color: "var(--color-action-green, #2F855A)" }}>
                          {cs.expectedHarvestDate ? cs.expectedHarvestDate.split("T")[0] : cs.endDate ? cs.endDate.split("T")[0] : "—"}
                        </strong>
                      </div>
                    </div>

                    <div style={{ fontSize: "12.5px", color: "var(--color-text-secondary, #4A5E53)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>🌱</span>
                      <span>
                        {field ? (
                          <>
                            <strong>{field.fieldName}</strong>
                            {field.areaAcres ? ` (${field.areaAcres} ac)` : ""}
                          </>
                        ) : (
                          `Field #${cs.fieldId}`
                        )}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", borderTop: "1px solid var(--color-border, #E2E8E4)", paddingTop: "10px", marginTop: "auto" }}>
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(cs)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(cs.id, cs.cropName)} style={{ color: "var(--color-error, #C53030)" }}>
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <TableContainer>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Crop & Cycle</Th>
                    <Th>Field Plot</Th>
                    <Th>Planting Year</Th>
                    <Th>Sowing Date</Th>
                    <Th>Expected Harvest</Th>
                    <Th>Cycle Status</Th>
                    <Th align="right">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredSeasons.map((cs) => {
                    const field = fieldMap.get(cs.fieldId);

                    return (
                      <Tr key={cs.id}>
                        {/* Crop & Season */}
                        <Td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <CropBadgeIcon cropName={cs.cropName} size={28} />
                            <div>
                              <div style={{ fontWeight: 600, color: "var(--color-text)" }}>
                                {cs.cropName}
                              </div>
                              <div style={{ fontSize: "var(--font-xs)", color: "var(--color-primary)", fontWeight: 500 }}>
                                {cs.season || cs.seasonName || "General"}
                              </div>
                            </div>
                          </div>
                        </Td>

                        {/* Field */}
                        <Td>
                          {field ? (
                            <div>
                              <div style={{ fontWeight: 500, color: "var(--color-text)" }}>{field.fieldName}</div>
                              <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                                {field.areaAcres ? `${field.areaAcres} ac` : ""}
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
                            {cs.sowingDate ? cs.sowingDate.split("T")[0] : cs.startDate ? cs.startDate.split("T")[0] : "—"}
                          </span>
                        </Td>

                        {/* Expected Harvest */}
                        <Td>
                          <span style={{ color: "var(--color-text)" }}>
                            {cs.expectedHarvestDate ? cs.expectedHarvestDate.split("T")[0] : cs.endDate ? cs.endDate.split("T")[0] : "—"}
                          </span>
                        </Td>

                        {/* Status */}
                        <Td>
                          {getStatusBadge(cs.status)}
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
                              onClick={() => handleDelete(cs.id, cs.cropName)}
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
        title={editingId !== null ? "Edit Crop Season" : "Schedule New Crop Season"}
        maxWidth="640px"
        footer={
          <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end", width: "100%" }}>
            <Button variant="outline" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const formEl = document.getElementById("my-season-form") as HTMLFormElement;
                if (formEl) formEl.requestSubmit();
              }}
              loading={saving}
            >
              {editingId !== null ? "Update Season" : "Save Season"}
            </Button>
          </div>
        }
      >
        <form id="my-season-form" onSubmit={handleSubmit}>
          <div className="al-form-grid-2">
            <FormField label="Field Plot" required>
              <Select
                name="fieldId"
                value={form.fieldId}
                onChange={handleChange}
              >
                <option value="">-- Select Field Plot --</option>
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
                placeholder="e.g. Cotton, Paddy, Chilli, Maize"
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
                <option value="Kharif">Kharif (Monsoon Cycle)</option>
                <option value="Rabi">Rabi (Winter Cycle)</option>
                <option value="Zaid">Zaid (Summer Cycle)</option>
                <option value="Annual">Annual (Year-round Crop)</option>
                <option value="Other">Other Season</option>
              </Select>
            </FormField>

            <FormField label="Planting Year" required>
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

            <FormField label="Growth Status" required>
              <Select
                name="status"
                value={form.status}
                onChange={handleChange}
              >
                <option value="PLANNED">Planned (Pre-sowing)</option>
                <option value="IN_PROGRESS">Actively Growing (In Progress)</option>
                <option value="HARVESTED">Harvested / Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </Select>
            </FormField>
          </div>
        </form>
      </Modal>
    </div>
  );
}
