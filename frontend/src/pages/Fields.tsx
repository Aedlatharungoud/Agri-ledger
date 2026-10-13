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
  status: "ACTIVE" | "INACTIVE";
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

interface FieldFormData {
  farmerId: string;
  fieldName: string;
  surveyNumber: string;
  fieldVillageId: string;
  areaAcres: string;
  irrigationType: string;
  ownershipType: "OWNED" | "LEASED";
}

const emptyForm: FieldFormData = {
  farmerId: "",
  fieldName: "",
  surveyNumber: "",
  fieldVillageId: "",
  areaAcres: "",
  irrigationType: "",
  ownershipType: "OWNED",
};

export default function Fields() {
  const [fields, setFields] = useState<Field[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
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
  const [irrigationFilter, setIrrigationFilter] = useState("ALL");

  // ============================================================
  // LOAD ALL DATA
  // ============================================================

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [fieldsRes, farmersRes, villagesRes] = await Promise.all([
        api.get("/fields"),
        api.get("/farmers"),
        api.get("/villages"),
      ]);

      setFields(Array.isArray(fieldsRes.data) ? fieldsRes.data : []);
      setFarmers(Array.isArray(farmersRes.data) ? farmersRes.data : []);
      setVillages(Array.isArray(villagesRes.data) ? villagesRes.data : []);
    } catch (err: unknown) {
      console.error(err);
      setError("Unable to load fields and references. Please ensure backend is running.");
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

  const villageMap = useMemo(() => {
    const map = new Map<number, Village>();
    for (const v of villages) map.set(v.id, v);
    return map;
  }, [villages]);

  // ============================================================
  // STATS
  // ============================================================

  const stats = useMemo(() => {
    const totalFields = fields.length;
    const totalAcres = fields.reduce((acc, f) => acc + (f.areaAcres ? Number(f.areaAcres) : 0), 0);
    const ownedFields = fields.filter((f) => f.ownershipType === "OWNED").length;
    const leasedFields = fields.filter((f) => f.ownershipType === "LEASED").length;

    return {
      totalFields,
      totalAcres: Number(totalAcres.toFixed(2)),
      ownedFields,
      leasedFields,
    };
  }, [fields]);

  // ============================================================
  // FILTERED FIELDS
  // ============================================================

  const filteredFields = useMemo(() => {
    const query = search.trim().toLowerCase();

    return fields.filter((field) => {
      // Ownership filter
      if (ownershipFilter !== "ALL" && field.ownershipType !== ownershipFilter) {
        return false;
      }

      // Irrigation filter
      if (irrigationFilter !== "ALL") {
        if (!field.irrigationType || field.irrigationType.toUpperCase() !== irrigationFilter.toUpperCase()) {
          return false;
        }
      }

      // Search query
      if (query) {
        const farmer = farmerMap.get(field.farmerId);
        const village = villageMap.get(field.fieldVillageId);

        const matchName = field.fieldName.toLowerCase().includes(query);
        const matchSurvey = field.surveyNumber?.toLowerCase().includes(query) ?? false;
        const matchFarmer = farmer?.name.toLowerCase().includes(query) ?? false;
        const matchFarmerCode = farmer?.farmerCode.toLowerCase().includes(query) ?? false;
        const matchVillage = village?.name.toLowerCase().includes(query) ?? false;

        if (!matchName && !matchSurvey && !matchFarmer && !matchFarmerCode && !matchVillage) {
          return false;
        }
      }

      return true;
    });
  }, [fields, search, ownershipFilter, irrigationFilter, farmerMap, villageMap]);

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
    setFormData(emptyForm);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (field: Field) => {
    setEditingId(field.id);
    setFormData({
      farmerId: String(field.farmerId),
      fieldName: field.fieldName,
      surveyNumber: field.surveyNumber || "",
      fieldVillageId: String(field.fieldVillageId),
      areaAcres: field.areaAcres !== null ? String(field.areaAcres) : "",
      irrigationType: field.irrigationType || "",
      ownershipType: field.ownershipType,
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

    if (!formData.farmerId) {
      setError("Please select a farmer.");
      return;
    }
    if (!formData.fieldName.trim()) {
      setError("Field name is required.");
      return;
    }
    if (!formData.fieldVillageId) {
      setError("Please select a village.");
      return;
    }
    if (!formData.areaAcres) {
      setError("Area in acres is required.");
      return;
    }

    const area = Number(formData.areaAcres);
    if (Number.isNaN(area) || area <= 0) {
      setError("Area must be a number greater than 0.");
      return;
    }

    const payload = {
      farmerId: Number(formData.farmerId),
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
        setSuccess("Field updated successfully.");
      } else {
        await api.post("/fields", payload);
        setSuccess("Field created successfully.");
      }

      closeModal();
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Unable to save field.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm("Are you sure you want to delete this field? All linked season data may be affected.");
    if (!confirmed) return;

    try {
      await api.delete(`/fields/${id}`);
      setSuccess("Field deleted successfully.");
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Failed to delete field.");
    }
  };

  // Distinct irrigation types for filter
  const distinctIrrigations = useMemo(() => {
    const set = new Set<string>();
    fields.forEach((f) => {
      if (f.irrigationType) set.add(f.irrigationType.toUpperCase());
    });
    return Array.from(set);
  }, [fields]);

  return (
    <div className="al-page-wrapper">
      {/* Header */}
      <PageHeader
        eyebrow="Agricultural Asset Management"
        title="Field Parcels"
        description="Catalog and manage agricultural land parcels, survey numbers, soil irrigation, and ownership across farmer holdings."
        actions={
          <Button variant="primary" icon="+" onClick={openAddModal}>
            Add Field
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
          label="Total Fields"
          value={stats.totalFields}
          icon="🗺️"
          subtitle="Registered land parcels"
        />

        <StatCard
          label="Total Acreage"
          value={`${stats.totalAcres} ac`}
          icon="📐"
          subtitle="Cumulative cultivated area"
        />

        <StatCard
          label="Owned Parcels"
          value={stats.ownedFields}
          icon="🏡"
          subtitle={stats.totalFields ? `${Math.round((stats.ownedFields / stats.totalFields) * 100)}% of total parcels` : "0%"}
          badge={<Badge variant="success">Owned</Badge>}
        />

        <StatCard
          label="Leased Parcels"
          value={stats.leasedFields}
          icon="📑"
          subtitle="Contract lease holdings"
          badge={<Badge variant="warning">Leased</Badge>}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="al-filter-bar">
        <div className="al-filter-search">
          <Input
            placeholder="Search by field, survey no, farmer, or village..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="al-filter-select">
          <Select
            value={ownershipFilter}
            onChange={(e) => setOwnershipFilter(e.target.value as any)}
          >
            <option value="ALL">All Ownerships</option>
            <option value="OWNED">Owned</option>
            <option value="LEASED">Leased</option>
          </Select>
        </div>

        <div className="al-filter-select">
          <Select
            value={irrigationFilter}
            onChange={(e) => setIrrigationFilter(e.target.value)}
          >
            <option value="ALL">All Irrigation</option>
            {distinctIrrigations.map((ir) => (
              <option key={ir} value={ir}>
                {ir}
              </option>
            ))}
          </Select>
        </div>

        <div className="al-filter-actions">
          {(search || ownershipFilter !== "ALL" || irrigationFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setOwnershipFilter("ALL");
                setIrrigationFilter("ALL");
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

      {/* Main Table Container */}
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
              icon="🗺️"
              title={search || ownershipFilter !== "ALL" || irrigationFilter !== "ALL" ? "No fields match your filter" : "No fields found"}
              description={
                search || ownershipFilter !== "ALL" || irrigationFilter !== "ALL"
                  ? "Try clearing your filters or adjusting your search term."
                  : "Get started by registering a new agricultural field parcel."
              }
              action={
                search || ownershipFilter !== "ALL" || irrigationFilter !== "ALL" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setOwnershipFilter("ALL");
                      setIrrigationFilter("ALL");
                    }}
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button variant="primary" icon="+" onClick={openAddModal}>
                    Add First Field
                  </Button>
                )
              }
            />
          ) : (
            <TableContainer>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Field Name & Survey</Th>
                    <Th>Farmer</Th>
                    <Th>Village</Th>
                    <Th align="right">Area (Acres)</Th>
                    <Th>Irrigation</Th>
                    <Th>Ownership</Th>
                    <Th align="right">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredFields.map((field) => {
                    const farmer = farmerMap.get(field.farmerId);
                    const village = villageMap.get(field.fieldVillageId);

                    return (
                      <Tr key={field.id}>
                        {/* Field Name & Survey */}
                        <Td>
                          <div style={{ fontWeight: 600, color: "var(--color-text)" }}>
                            {field.fieldName}
                          </div>
                          <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", marginTop: "2px" }}>
                            {field.surveyNumber ? `Survey #${field.surveyNumber}` : "No Survey #"}
                          </div>
                        </Td>

                        {/* Farmer */}
                        <Td>
                          {farmer ? (
                            <div>
                              <div style={{ fontWeight: 500, color: "var(--color-text)" }}>{farmer.name}</div>
                              <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                                {farmer.farmerCode}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: "var(--color-text-muted)" }}>Farmer #{field.farmerId}</span>
                          )}
                        </Td>

                        {/* Village */}
                        <Td>
                          {village ? (
                            <div>
                              <div style={{ color: "var(--color-text)" }}>{village.name}</div>
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
                          <span style={{ fontWeight: 600, color: "var(--color-text)" }}>
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
                              onClick={() => handleDelete(field.id)}
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
        title={editingId !== null ? "Edit Field Parcel" : "Register Field Parcel"}
        maxWidth="680px"
        footer={
          <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end", width: "100%" }}>
            <Button variant="outline" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const formEl = document.getElementById("field-modal-form") as HTMLFormElement;
                if (formEl) formEl.requestSubmit();
              }}
              loading={saving}
            >
              {editingId !== null ? "Update Field" : "Create Field"}
            </Button>
          </div>
        }
      >
        <form id="field-modal-form" onSubmit={handleSubmit}>
          <div className="al-form-grid-2">
            <FormField label="Farmer" required>
              <Select
                name="farmerId"
                value={formData.farmerId}
                onChange={handleInputChange}
              >
                <option value="">-- Select Farmer --</option>
                {farmers.map((f) => (
                  <option key={f.id} value={String(f.id)}>
                    {f.name} ({f.farmerCode})
                  </option>
                ))}
              </Select>
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

            <FormField label="Field Name / Title" required>
              <Input
                name="fieldName"
                placeholder="e.g. North Canal Plot"
                value={formData.fieldName}
                onChange={handleInputChange}
              />
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
                placeholder="e.g. 4.5"
                value={formData.areaAcres}
                onChange={handleInputChange}
              />
            </FormField>

            <FormField label="Ownership Type" required>
              <Select
                name="ownershipType"
                value={formData.ownershipType}
                onChange={handleInputChange}
              >
                <option value="OWNED">Owned</option>
                <option value="LEASED">Leased</option>
              </Select>
            </FormField>

            <FormField label="Irrigation System">
              <Select
                name="irrigationType"
                value={formData.irrigationType}
                onChange={handleInputChange}
              >
                <option value="">-- Select / None --</option>
                <option value="Borewell">Borewell</option>
                <option value="Canal">Canal</option>
                <option value="Drip">Drip Irrigation</option>
                <option value="Sprinkler">Sprinkler</option>
                <option value="Rainfed">Rainfed (Dryland)</option>
                <option value="River/Lift">River / Lift Irrigation</option>
                <option value="Other">Other</option>
              </Select>
            </FormField>
          </div>
        </form>
      </Modal>
    </div>
  );
}