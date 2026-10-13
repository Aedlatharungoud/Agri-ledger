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
  LandParcelIcon,
  EmptyFarmIllustration,
} from "../components/ui";

interface Field {
  id: number;
  farmerId: number;
  fieldName: string;
  surveyNumber?: string | null;
  fieldVillageId: number;
  areaAcres: number | null;
  irrigationType?: string | null;
  ownershipType: "OWNED" | "LEASED";
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

interface FieldFormData {
  fieldName: string;
  surveyNumber: string;
  fieldVillageId: string;
  areaAcres: string;
  irrigationType: string;
  ownershipType: "OWNED" | "LEASED";
}

const emptyForm: FieldFormData = {
  fieldName: "",
  surveyNumber: "",
  fieldVillageId: "",
  areaAcres: "",
  irrigationType: "Borewell",
  ownershipType: "OWNED",
};

export default function MyFields() {
  const { user } = useAuth();

  const [fields, setFields] = useState<Field[]>([]);
  const [villages, setVillages] = useState<Village[]>([]);

  const [formData, setFormData] = useState<FieldFormData>(emptyForm);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [ownershipFilter, setOwnershipFilter] = useState<"ALL" | "OWNED" | "LEASED">("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // ============================================================
  // LOAD DATA
  // ============================================================

  const loadData = async () => {
    if (!user || user.role !== "FARMER" || !user.farmerId) {
      setError("This page is accessible only to authenticated farmers.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const farmerId = Number(user.farmerId);

    try {
      const [fieldsRes, villagesRes] = await Promise.all([
        api.get("/fields"),
        api.get("/villages"),
      ]);

      const allFields: Field[] = Array.isArray(fieldsRes.data) ? fieldsRes.data : [];
      // Defence-in-depth ownership filtering
      const myFields = allFields.filter((f) => Number(f.farmerId) === farmerId);

      setFields(myFields);
      setVillages(Array.isArray(villagesRes.data) ? villagesRes.data : []);
    } catch (err: unknown) {
      console.error(err);
      setError("Unable to load your field parcels. Please verify backend connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.farmerId]);

  // Village lookup
  const villageMap = useMemo(() => {
    const map = new Map<number, Village>();
    for (const v of villages) map.set(v.id, v);
    return map;
  }, [villages]);

  // Summary Metrics
  const stats = useMemo(() => {
    const totalFields = fields.length;
    const totalAcres = fields.reduce(
      (acc, f) => acc + (f.areaAcres ? Number(f.areaAcres) : 0),
      0
    );
    const owned = fields.filter((f) => f.ownershipType === "OWNED").length;
    const leased = fields.filter((f) => f.ownershipType === "LEASED").length;

    return {
      totalFields,
      totalAcres: Number(totalAcres.toFixed(2)),
      owned,
      leased,
    };
  }, [fields]);

  // Filtered Fields
  const filteredFields = useMemo(() => {
    const q = search.trim().toLowerCase();

    return fields.filter((f) => {
      if (ownershipFilter !== "ALL" && f.ownershipType !== ownershipFilter) {
        return false;
      }

      if (q) {
        const village = villageMap.get(f.fieldVillageId);
        const matchName = f.fieldName.toLowerCase().includes(q);
        const matchSurvey = f.surveyNumber?.toLowerCase().includes(q) ?? false;
        const matchVillage = village?.name.toLowerCase().includes(q) ?? false;

        if (!matchName && !matchSurvey && !matchVillage) {
          return false;
        }
      }

      return true;
    });
  }, [fields, search, ownershipFilter, villageMap]);

  // ============================================================
  // FORM HANDLING
  // ============================================================

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      ...emptyForm,
      fieldVillageId: villages.length > 0 ? String(villages[0].id) : "",
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (f: Field) => {
    setEditingId(f.id);
    setFormData({
      fieldName: f.fieldName,
      surveyNumber: f.surveyNumber || "",
      fieldVillageId: String(f.fieldVillageId),
      areaAcres: f.areaAcres !== null ? String(f.areaAcres) : "",
      irrigationType: f.irrigationType || "Borewell",
      ownershipType: f.ownershipType,
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formData.fieldName.trim()) {
      setError("Please enter a field name.");
      return;
    }
    if (!formData.fieldVillageId) {
      setError("Please select the village location.");
      return;
    }
    if (!formData.areaAcres) {
      setError("Please enter the parcel area in acres.");
      return;
    }

    const area = Number(formData.areaAcres);
    if (Number.isNaN(area) || area <= 0) {
      setError("Area in acres must be a positive number.");
      return;
    }

    const payload = {
      farmerId: Number(user!.farmerId),
      fieldName: formData.fieldName.trim(),
      surveyNumber: formData.surveyNumber.trim() || null,
      fieldVillageId: Number(formData.fieldVillageId),
      areaAcres: area,
      irrigationType: formData.irrigationType || null,
      ownershipType: formData.ownershipType,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await api.put(`/fields/${editingId}`, payload);
        setSuccess("Field parcel updated successfully.");
      } else {
        await api.post("/fields", payload);
        setSuccess("New field parcel registered successfully.");
      }

      closeModal();
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Failed to save field parcel.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete field "${name}"?`);
    if (!confirmed) return;

    try {
      await api.delete(`/fields/${id}`);
      setSuccess("Field removed successfully.");
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Failed to delete field.");
    }
  };

  return (
    <div className="al-page-wrapper">
      {/* Header */}
      <PageHeader
        eyebrow="Agricultural Land Registry"
        title="My Fields"
        description="Register and manage your cultivated farm land plots, survey numbers, soil irrigation, and plot boundaries."
        actions={
          <Button variant="primary" icon="+" onClick={openAddModal}>
            Register New Field
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

      {/* Summary KPI Cards */}
      <div className="al-summary-grid">
        <StatCard
          label="Registered Fields"
          value={stats.totalFields}
          icon={<LandParcelIcon size={24} />}
          subtitle="Your cultivated land parcels"
        />

        <StatCard
          label="Total Cultivated Area"
          value={`${stats.totalAcres} ac`}
          icon={<LandParcelIcon size={24} />}
          subtitle="Cumulative acreage across plots"
        />

        <StatCard
          label="Owned Land"
          value={stats.owned}
          icon="🏡"
          subtitle="Ancestral or self-owned land"
          badge={<Badge variant="success">Owned</Badge>}
        />

        <StatCard
          label="Leased Holdings"
          value={stats.leased}
          icon="📑"
          subtitle="Contract lease acreage"
          badge={<Badge variant="warning">Leased</Badge>}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="al-filter-bar">
        <div className="al-filter-search">
          <Input
            placeholder="Search by field title, survey number, or village..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="al-filter-select">
          <Select
            value={ownershipFilter}
            onChange={(e) => setOwnershipFilter(e.target.value as any)}
          >
            <option value="ALL">All Ownership Types</option>
            <option value="OWNED">Owned Land Only</option>
            <option value="LEASED">Leased Land Only</option>
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
          {(search || ownershipFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setOwnershipFilter("ALL");
              }}
            >
              Reset Filters
            </Button>
          )}
          <Badge variant="neutral">
            {filteredFields.length} {filteredFields.length === 1 ? "parcel" : "parcels"}
          </Badge>
        </div>
      </div>

      {/* Fields Data Display */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: "var(--space-6)" }}>
              <Skeleton height="36px" style={{ marginBottom: "12px" }} />
              <Skeleton height="54px" style={{ marginBottom: "8px" }} />
              <Skeleton height="54px" style={{ marginBottom: "8px" }} />
              <Skeleton height="54px" />
            </div>
          ) : filteredFields.length === 0 ? (
            <EmptyState
              icon={<EmptyFarmIllustration size={100} />}
              title={search || ownershipFilter !== "ALL" ? "No fields match your filter" : "No land parcels registered yet"}
              description={
                search || ownershipFilter !== "ALL"
                  ? "Try resetting filters or adjusting search keywords."
                  : "Register your first field parcel to begin scheduling crops and logging harvests."
              }
              action={
                search || ownershipFilter !== "ALL" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setOwnershipFilter("ALL");
                    }}
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button variant="primary" icon="+" onClick={openAddModal}>
                    Register First Field
                  </Button>
                )
              }
            />
          ) : viewMode === "grid" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", padding: "16px" }}>
              {filteredFields.map((field) => {
                const village = villageMap.get(field.fieldVillageId);

                return (
                  <div
                    key={field.id}
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
                        <div style={{ width: "38px", height: "38px", borderRadius: "8px", background: "rgba(47, 133, 90, 0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <LandParcelIcon size={22} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: "15.5px", fontWeight: 700, color: "var(--color-text-primary, #18251E)" }}>
                            {field.fieldName}
                          </h4>
                          <span style={{ fontSize: "12px", color: "var(--color-text-muted, #768A7E)" }}>
                            {field.surveyNumber ? `Survey #${field.surveyNumber}` : "No Survey #"}
                          </span>
                        </div>
                      </div>
                      <Badge variant={field.ownershipType === "OWNED" ? "success" : "warning"}>
                        {field.ownershipType}
                      </Badge>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", background: "var(--color-surface-subtle, #F9FAF9)", padding: "10px 12px", borderRadius: "8px", fontSize: "12px" }}>
                      <div>
                        <span style={{ display: "block", color: "var(--color-text-muted, #768A7E)", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.04em" }}>AREA</span>
                        <strong style={{ fontSize: "14px", color: "var(--color-text-primary, #18251E)" }}>
                          {field.areaAcres !== null ? `${Number(field.areaAcres).toFixed(2)} ac` : "—"}
                        </strong>
                      </div>
                      <div>
                        <span style={{ display: "block", color: "var(--color-text-muted, #768A7E)", fontSize: "10.5px", fontWeight: 700, letterSpacing: "0.04em" }}>IRRIGATION</span>
                        <strong style={{ color: "var(--color-action-green, #2F855A)" }}>{field.irrigationType || "Rainfed"}</strong>
                      </div>
                    </div>

                    <div style={{ fontSize: "12.5px", color: "var(--color-text-secondary, #4A5E53)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>📍</span>
                      <span>{village ? `${village.name}, ${village.mandal}` : `Village #${field.fieldVillageId}`}</span>
                    </div>

                    <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", borderTop: "1px solid var(--color-border, #E2E8E4)", paddingTop: "10px", marginTop: "auto" }}>
                      <Button variant="ghost" size="sm" onClick={() => openEditModal(field)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(field.id, field.fieldName)} style={{ color: "var(--color-error, #C53030)" }}>
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
                    <Th>Field Name & Survey #</Th>
                    <Th>Village Location</Th>
                    <Th align="right">Area (Acres)</Th>
                    <Th>Irrigation Source</Th>
                    <Th>Ownership</Th>
                    <Th align="right">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredFields.map((field) => {
                    const village = villageMap.get(field.fieldVillageId);

                    return (
                      <Tr key={field.id}>
                        {/* Name & Survey */}
                        <Td>
                          <div style={{ fontWeight: 600, color: "var(--color-text)" }}>
                            {field.fieldName}
                          </div>
                          <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", marginTop: "2px" }}>
                            {field.surveyNumber ? `Survey #${field.surveyNumber}` : "No Survey # registered"}
                          </div>
                        </Td>

                        {/* Village */}
                        <Td>
                          {village ? (
                            <div>
                              <div style={{ fontWeight: 500, color: "var(--color-text)" }}>{village.name}</div>
                              <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                                {village.mandal}, {village.district}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: "var(--color-text-muted)" }}>Village #{field.fieldVillageId}</span>
                          )}
                        </Td>

                        {/* Area */}
                        <Td align="right">
                          <span style={{ fontWeight: 700, fontSize: "var(--font-base)", color: "var(--color-text)" }}>
                            {field.areaAcres !== null ? Number(field.areaAcres).toFixed(2) : "—"}
                          </span>{" "}
                          <span style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>ac</span>
                        </Td>

                        {/* Irrigation */}
                        <Td>
                          {field.irrigationType ? (
                            <Badge variant="info">
                              {field.irrigationType}
                            </Badge>
                          ) : (
                            <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-xs)" }}>None</span>
                          )}
                        </Td>

                        {/* Ownership */}
                        <Td>
                          <Badge variant={field.ownershipType === "OWNED" ? "success" : "warning"}>
                            {field.ownershipType}
                          </Badge>
                        </Td>

                        {/* Actions */}
                        <Td align="right">
                          <div className="al-table-actions">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(field)}
                              aria-label="Edit Field"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(field.id, field.fieldName)}
                              aria-label="Delete Field"
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

      {/* Add / Edit Field Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingId !== null ? "Edit Field Details" : "Register New Field Parcel"}
        maxWidth="640px"
        footer={
          <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end", width: "100%" }}>
            <Button variant="outline" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const formEl = document.getElementById("my-field-form") as HTMLFormElement;
                if (formEl) formEl.requestSubmit();
              }}
              loading={saving}
            >
              {editingId !== null ? "Update Field" : "Save Field"}
            </Button>
          </div>
        }
      >
        <form id="my-field-form" onSubmit={handleSubmit}>
          <div className="al-form-grid-2">
            <FormField label="Field Name / Title" required>
              <Input
                name="fieldName"
                placeholder="e.g. North Canal Plot, Roadside Land"
                value={formData.fieldName}
                onChange={handleInputChange}
              />
            </FormField>

            <FormField label="Village Location" required>
              <Select
                name="fieldVillageId"
                value={formData.fieldVillageId}
                onChange={handleInputChange}
              >
                <option value="">-- Select Village --</option>
                {villages.map((v) => (
                  <option key={v.id} value={String(v.id)}>
                    {v.name} ({v.mandal}, {v.district})
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Survey Number">
              <Input
                name="surveyNumber"
                placeholder="e.g. 102/4B"
                value={formData.surveyNumber}
                onChange={handleInputChange}
              />
            </FormField>

            <FormField label="Area in Acres" required>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                name="areaAcres"
                placeholder="e.g. 3.5"
                value={formData.areaAcres}
                onChange={handleInputChange}
              />
            </FormField>

            <FormField label="Ownership Status" required>
              <Select
                name="ownershipType"
                value={formData.ownershipType}
                onChange={handleInputChange}
              >
                <option value="OWNED">Owned (Ancestral / Self-purchased)</option>
                <option value="LEASED">Leased (Contract Farming)</option>
              </Select>
            </FormField>

            <FormField label="Irrigation System">
              <Select
                name="irrigationType"
                value={formData.irrigationType}
                onChange={handleInputChange}
              >
                <option value="Borewell">Borewell</option>
                <option value="Canal">Canal Irrigation</option>
                <option value="Drip">Drip Irrigation</option>
                <option value="Sprinkler">Sprinkler</option>
                <option value="Rainfed">Rainfed (Dryland)</option>
                <option value="River/Lift">River / Lift</option>
                <option value="Other">Other</option>
              </Select>
            </FormField>
          </div>
        </form>
      </Modal>
    </div>
  );
}