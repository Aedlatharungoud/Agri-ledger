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
  areaAcres?: number | null;
}

interface CropSeason {
  id: number;
  fieldId: number;
  season: string | null;
  cropName: string;
  year: number | null;
  status: string;
}

interface Harvest {
  id: number;
  farmerId: number;
  fieldId: number;
  cropSeasonId: number;
  harvestDate: string;
  cropName: string;
  quantity: number;
  unit: string;
  qualityGrade?: string | null;
  lotNumber?: string | null;
  notes?: string | null;
  createdAt?: string | null;
}

interface HarvestForm {
  farmerId: string;
  fieldId: string;
  cropSeasonId: string;
  harvestDate: string;
  cropName: string;
  quantity: string;
  unit: string;
  qualityGrade: string;
  lotNumber: string;
  notes: string;
}

const emptyForm: HarvestForm = {
  farmerId: "",
  fieldId: "",
  cropSeasonId: "",
  harvestDate: new Date().toISOString().split("T")[0],
  cropName: "",
  quantity: "",
  unit: "KG",
  qualityGrade: "Grade A",
  lotNumber: "",
  notes: "",
};

export default function Harvests() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [cropSeasons, setCropSeasons] = useState<CropSeason[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);

  const [form, setForm] = useState<HarvestForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("ALL");
  const [gradeFilter, setGradeFilter] = useState("ALL");

  // ============================================================
  // LOAD DATA
  // ============================================================

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [farmersRes, fieldsRes, seasonsRes, harvestsRes] = await Promise.all([
        api.get("/farmers"),
        api.get("/fields"),
        api.get("/crop-seasons"),
        api.get("/harvests"),
      ]);

      setFarmers(Array.isArray(farmersRes.data) ? farmersRes.data : []);
      setFields(Array.isArray(fieldsRes.data) ? fieldsRes.data : []);
      setCropSeasons(Array.isArray(seasonsRes.data) ? seasonsRes.data : []);
      setHarvests(Array.isArray(harvestsRes.data) ? harvestsRes.data : []);
    } catch (err: unknown) {
      console.error(err);
      setError("Unable to load harvests and field data. Please ensure backend is running.");
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

  // Cascading fields and seasons for form
  const availableFields = useMemo(() => {
    if (!form.farmerId) return [];
    const fId = Number(form.farmerId);
    return fields.filter((f) => f.farmerId === fId);
  }, [fields, form.farmerId]);

  const availableSeasons = useMemo(() => {
    if (!form.fieldId) return [];
    const fId = Number(form.fieldId);
    return cropSeasons.filter((cs) => cs.fieldId === fId);
  }, [cropSeasons, form.fieldId]);

  // ============================================================
  // STATS (Unit-safe breakdown: never combine different units!)
  // ============================================================

  const stats = useMemo(() => {
    const totalHarvests = harvests.length;
    const cropsSet = new Set(harvests.map((h) => h.cropName.toLowerCase()));

    // Distinct units in record
    const unitBreakdown: Record<string, number> = {};
    let gradeACount = 0;

    harvests.forEach((h) => {
      const u = (h.unit || "KG").toUpperCase();
      unitBreakdown[u] = (unitBreakdown[u] || 0) + Number(h.quantity || 0);
      if (h.qualityGrade && h.qualityGrade.toUpperCase().includes("A")) {
        gradeACount += 1;
      }
    });

    return {
      totalHarvests,
      distinctCrops: cropsSet.size,
      gradeACount,
      unitBreakdown,
    };
  }, [harvests]);

  // Distinct units & grades
  const distinctUnits = useMemo(() => {
    const set = new Set<string>();
    harvests.forEach((h) => {
      if (h.unit) set.add(h.unit.toUpperCase());
    });
    return Array.from(set);
  }, [harvests]);

  const distinctGrades = useMemo(() => {
    const set = new Set<string>();
    harvests.forEach((h) => {
      if (h.qualityGrade) set.add(h.qualityGrade);
    });
    return Array.from(set);
  }, [harvests]);

  // ============================================================
  // FILTERED HARVESTS
  // ============================================================

  const filteredHarvests = useMemo(() => {
    const query = search.trim().toLowerCase();

    return harvests.filter((h) => {
      // Unit filter
      if (unitFilter !== "ALL" && h.unit.toUpperCase() !== unitFilter.toUpperCase()) {
        return false;
      }

      // Grade filter
      if (gradeFilter !== "ALL" && h.qualityGrade !== gradeFilter) {
        return false;
      }

      // Search query
      if (query) {
        const farmer = farmerMap.get(h.farmerId);
        const field = fieldMap.get(h.fieldId);

        const matchCrop = h.cropName.toLowerCase().includes(query);
        const matchLot = h.lotNumber?.toLowerCase().includes(query) ?? false;
        const matchFarmer = farmer?.name.toLowerCase().includes(query) ?? false;
        const matchFarmerCode = farmer?.farmerCode.toLowerCase().includes(query) ?? false;
        const matchField = field?.fieldName.toLowerCase().includes(query) ?? false;

        if (!matchCrop && !matchLot && !matchFarmer && !matchFarmerCode && !matchField) {
          return false;
        }
      }

      return true;
    });
  }, [harvests, search, unitFilter, gradeFilter, farmerMap, fieldMap]);

  // ============================================================
  // FORM HANDLING
  // ============================================================

  const handleChange = (field: keyof HarvestForm, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "farmerId") {
        next.fieldId = "";
        next.cropSeasonId = "";
        next.cropName = "";
      } else if (field === "fieldId") {
        next.cropSeasonId = "";
        next.cropName = "";
      } else if (field === "cropSeasonId") {
        const s = seasonMap.get(Number(value));
        if (s) {
          next.cropName = s.cropName;
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
      farmerId: farmers.length > 0 ? String(farmers[0].id) : "",
      harvestDate: new Date().toISOString().split("T")[0],
    });
    setShowModal(true);
  };

  const openEditModal = (h: Harvest) => {
    setError("");
    setSuccess("");
    setEditingId(h.id);
    setForm({
      farmerId: String(h.farmerId),
      fieldId: String(h.fieldId),
      cropSeasonId: String(h.cropSeasonId),
      harvestDate: h.harvestDate ? h.harvestDate.split("T")[0] : "",
      cropName: h.cropName,
      quantity: String(h.quantity),
      unit: h.unit || "KG",
      qualityGrade: h.qualityGrade || "",
      lotNumber: h.lotNumber || "",
      notes: h.notes || "",
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
      setError("Please select a field parcel.");
      return;
    }
    if (!form.cropSeasonId) {
      setError("Please select a crop season.");
      return;
    }
    if (!form.harvestDate) {
      setError("Harvest date is required.");
      return;
    }
    if (!form.cropName.trim()) {
      setError("Crop name is required.");
      return;
    }

    const qty = Number(form.quantity);
    if (Number.isNaN(qty) || qty <= 0) {
      setError("Quantity must be greater than 0.");
      return;
    }

    const payload = {
      farmerId: Number(form.farmerId),
      fieldId: Number(form.fieldId),
      cropSeasonId: Number(form.cropSeasonId),
      harvestDate: form.harvestDate,
      cropName: form.cropName.trim(),
      quantity: qty,
      unit: form.unit.trim().toUpperCase(),
      qualityGrade: form.qualityGrade.trim() || null,
      lotNumber: form.lotNumber.trim() || null,
      notes: form.notes.trim() || null,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await api.put(`/harvests/${editingId}`, payload);
        setSuccess("Harvest record updated successfully.");
      } else {
        await api.post("/harvests", payload);
        setSuccess("Harvest record logged successfully.");
      }

      closeModal();
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Failed to save harvest.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm("Are you sure you want to delete this harvest record? Linked market sales will be affected.");
    if (!confirmed) return;

    try {
      await api.delete(`/harvests/${id}`);
      setSuccess("Harvest record deleted successfully.");
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Failed to delete harvest.");
    }
  };

  const getGradeBadgeVariant = (grade?: string | null) => {
    if (!grade) return "neutral";
    const upper = grade.toUpperCase();
    if (upper.includes("A") || upper.includes("PREMIUM")) return "success";
    if (upper.includes("B")) return "info";
    if (upper.includes("C")) return "warning";
    return "neutral";
  };

  return (
    <div className="al-page-wrapper">
      {/* Header */}
      <PageHeader
        eyebrow="Agricultural Yield & Production"
        title="Harvest Records"
        description="Log yields harvested per field parcel, assign lot tracking numbers, and record quality inspection grades."
        actions={
          <Button variant="primary" icon="+" onClick={openAddModal}>
            Log Harvest
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
          label="Total Harvests"
          value={stats.totalHarvests}
          icon="🌾"
          subtitle="Yield cycles recorded"
        />

        <StatCard
          label="Crops Catalogued"
          value={stats.distinctCrops}
          icon="🌱"
          subtitle="Unique crop varieties"
          badge={<Badge variant="info">Varieties</Badge>}
        />

        <StatCard
          label="Grade A Quality"
          value={stats.gradeACount}
          icon="⭐"
          subtitle="High premium classification"
          badge={<Badge variant="success">Premium</Badge>}
        />

        <StatCard
          label="Active Sale Units"
          value={Object.keys(stats.unitBreakdown).length}
          icon="⚖️"
          subtitle={
            Object.entries(stats.unitBreakdown)
              .slice(0, 2)
              .map(([unit, qty]) => `${qty} ${unit}`)
              .join(", ") || "No yields"
          }
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="al-filter-bar">
        <div className="al-filter-search">
          <Input
            placeholder="Search crop, lot #, farmer, or field..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="al-filter-select">
          <Select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
          >
            <option value="ALL">All Measurement Units</option>
            {distinctUnits.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </div>

        <div className="al-filter-select">
          <Select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
          >
            <option value="ALL">All Quality Grades</option>
            {distinctGrades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        </div>

        <div className="al-filter-actions">
          {(search || unitFilter !== "ALL" || gradeFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setUnitFilter("ALL");
                setGradeFilter("ALL");
              }}
            >
              Reset Filters
            </Button>
          )}
          <Badge variant="neutral">
            {filteredHarvests.length} {filteredHarvests.length === 1 ? "record" : "records"}
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
          ) : filteredHarvests.length === 0 ? (
            <EmptyState
              icon="🌾"
              title={search || unitFilter !== "ALL" || gradeFilter !== "ALL" ? "No harvests match filter" : "No harvest records"}
              description={
                search || unitFilter !== "ALL" || gradeFilter !== "ALL"
                  ? "Try resetting filters or searching for another crop name."
                  : "Log yields from your active crop cycles to enable market sales."
              }
              action={
                search || unitFilter !== "ALL" || gradeFilter !== "ALL" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setUnitFilter("ALL");
                      setGradeFilter("ALL");
                    }}
                  >
                    Clear Filters
                  </Button>
                ) : (
                  <Button variant="primary" icon="+" onClick={openAddModal}>
                    Log Harvest
                  </Button>
                )
              }
            />
          ) : (
            <TableContainer>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Harvest Date</Th>
                    <Th>Crop & Lot #</Th>
                    <Th>Farmer & Field</Th>
                    <Th align="right">Quantity</Th>
                    <Th>Quality Grade</Th>
                    <Th align="right">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredHarvests.map((h) => {
                    const farmer = farmerMap.get(h.farmerId);
                    const field = fieldMap.get(h.fieldId);
                    const season = seasonMap.get(h.cropSeasonId);

                    return (
                      <Tr key={h.id}>
                        {/* Date */}
                        <Td>
                          <span style={{ fontWeight: 500, color: "var(--color-text)" }}>
                            {h.harvestDate ? h.harvestDate.split("T")[0] : "—"}
                          </span>
                        </Td>

                        {/* Crop & Lot */}
                        <Td>
                          <div style={{ fontWeight: 600, color: "var(--color-text)" }}>
                            {h.cropName}
                          </div>
                          <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", marginTop: "2px" }}>
                            {h.lotNumber ? `Lot: ${h.lotNumber}` : "No Lot #"} {season ? `• ${season.season} ${season.year}` : ""}
                          </div>
                        </Td>

                        {/* Farmer & Field */}
                        <Td>
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--color-text)" }}>
                              {farmer ? farmer.name : `Farmer #${h.farmerId}`}
                            </div>
                            <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                              {field?.fieldName || `Field #${h.fieldId}`}
                            </div>
                          </div>
                        </Td>

                        {/* Quantity (preserves exact unit, never combining) */}
                        <Td align="right">
                          <span style={{ fontWeight: 700, fontSize: "var(--font-base)", color: "var(--color-text)" }}>
                            {h.quantity}
                          </span>{" "}
                          <Badge variant="neutral">
                            {h.unit || "KG"}
                          </Badge>
                        </Td>

                        {/* Quality Grade */}
                        <Td>
                          {h.qualityGrade ? (
                            <Badge variant={getGradeBadgeVariant(h.qualityGrade)}>
                              {h.qualityGrade}
                            </Badge>
                          ) : (
                            <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-xs)" }}>Ungraded</span>
                          )}
                        </Td>

                        {/* Actions */}
                        <Td align="right">
                          <div className="al-table-actions">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(h)}
                              aria-label="Edit Harvest"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(h.id)}
                              aria-label="Delete Harvest"
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

      {/* Add / Edit Harvest Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingId !== null ? "Edit Harvest Record" : "Log Harvest Yield"}
        maxWidth="680px"
        footer={
          <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end", width: "100%" }}>
            <Button variant="outline" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const formEl = document.getElementById("harvest-form") as HTMLFormElement;
                if (formEl) formEl.requestSubmit();
              }}
              loading={saving}
            >
              {editingId !== null ? "Update Record" : "Save Record"}
            </Button>
          </div>
        }
      >
        <form id="harvest-form" onSubmit={handleSubmit}>
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

            <FormField label="Harvest Date" required>
              <Input
                type="date"
                value={form.harvestDate}
                onChange={(e) => handleChange("harvestDate", e.target.value)}
              />
            </FormField>

            <FormField label="Crop Name" required>
              <Input
                placeholder="e.g. Cotton, Groundnut, Paddy"
                value={form.cropName}
                onChange={(e) => handleChange("cropName", e.target.value)}
              />
            </FormField>

            <FormField label="Yield Quantity" required>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 50"
                value={form.quantity}
                onChange={(e) => handleChange("quantity", e.target.value)}
              />
            </FormField>

            <FormField label="Measurement Unit" required>
              <Select
                value={form.unit}
                onChange={(e) => handleChange("unit", e.target.value)}
              >
                <option value="BAG">BAG (Bags / Sacks)</option>
                <option value="KG">KG (Kilograms)</option>
                <option value="QUINTAL">QUINTAL (100 KG)</option>
                <option value="TON">TON (1,000 KG)</option>
              </Select>
            </FormField>

            <FormField label="Quality Grade">
              <Select
                value={form.qualityGrade}
                onChange={(e) => handleChange("qualityGrade", e.target.value)}
              >
                <option value="">-- Select Grade --</option>
                <option value="Grade A">Grade A (Premium)</option>
                <option value="Grade B">Grade B (Standard)</option>
                <option value="Grade C">Grade C (Commercial)</option>
                <option value="Premium">Premium Export</option>
                <option value="Standard">Standard Local</option>
              </Select>
            </FormField>

            <FormField label="Lot Tracking Number">
              <Input
                placeholder="e.g. LOT-2026-CT-01"
                value={form.lotNumber}
                onChange={(e) => handleChange("lotNumber", e.target.value)}
              />
            </FormField>

            <FormField label="Inspection Notes">
              <Input
                placeholder="Moisture content, cleanliness, etc."
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