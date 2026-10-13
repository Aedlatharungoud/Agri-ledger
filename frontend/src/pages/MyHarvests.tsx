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
} from "../components/ui";

const FMT_DATE = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

interface Harvest {
  id: number;
  farmerId: number;
  fieldId?: number;
  cropSeasonId?: number;
  cropName?: string;
  harvestDate?: string;
  quantity?: number;
  quantityHarvested?: number;
  unit?: string;
  qualityGrade?: string | null;
  lotNumber?: string | null;
  notes?: string;
  createdAt?: string;
}

interface Field {
  id: number;
  farmerId: number;
  fieldName: string;
}

interface CropSeason {
  id: number;
  fieldId: number;
  cropName: string;
  season?: string;
  year?: number;
}

interface HarvestFormData {
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

const emptyForm: HarvestFormData = {
  fieldId: "",
  cropSeasonId: "",
  harvestDate: new Date().toISOString().split("T")[0],
  cropName: "",
  quantity: "",
  unit: "KG",
  qualityGrade: "A",
  lotNumber: "",
  notes: "",
};

export default function MyHarvests() {
  const { user } = useAuth();
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [cropSeasons, setCropSeasons] = useState<CropSeason[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingHarvest, setEditingHarvest] = useState<Harvest | null>(null);
  const [form, setForm] = useState<HarvestFormData>(emptyForm);

  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("ALL");
  const [unitFilter, setUnitFilter] = useState("ALL");

  useEffect(() => {
    if (!user || user.role !== "FARMER" || !user.farmerId) {
      setError("This page is available only for authenticated farmer accounts.");
      setLoading(false);
      return;
    }
    loadData();
  }, [user?.farmerId]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [hRes, fRes, csRes] = await Promise.all([
        api.get<Harvest[]>("/harvests"),
        api.get<Field[]>("/fields"),
        api.get<CropSeason[]>("/crop-seasons"),
      ]);

      const allFields: Field[] = Array.isArray(fRes.data) ? fRes.data : [];
      const myFields = allFields.filter((f) => Number(f.farmerId) === Number(user!.farmerId));
      const myFieldIds = new Set(myFields.map((f) => f.id));

      const allSeasons: CropSeason[] = Array.isArray(csRes.data) ? csRes.data : [];
      const mySeasons = allSeasons.filter((cs) => myFieldIds.has(cs.fieldId));

      const hData: Harvest[] = Array.isArray(hRes.data) ? hRes.data : [];
      const mine = hData.filter((h) => Number(h.farmerId) === Number(user!.farmerId));

      setFields(myFields);
      setCropSeasons(mySeasons);
      setHarvests(mine);
    } catch {
      setError("Unable to load your harvest records. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingHarvest(null);
    const initialField = fields.length > 0 ? String(fields[0].id) : "";
    const matchingSeasons = cropSeasons.filter(
      (cs) => Number(cs.fieldId) === Number(initialField)
    );
    setForm({
      ...emptyForm,
      fieldId: initialField,
      cropSeasonId: matchingSeasons.length > 0 ? String(matchingSeasons[0].id) : "",
      cropName: matchingSeasons.length > 0 ? matchingSeasons[0].cropName : "",
      harvestDate: new Date().toISOString().split("T")[0],
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function openEditModal(harvest: Harvest) {
    setEditingHarvest(harvest);
    setForm({
      fieldId: String(harvest.fieldId || ""),
      cropSeasonId: String(harvest.cropSeasonId || ""),
      harvestDate: harvest.harvestDate || new Date().toISOString().split("T")[0],
      cropName: harvest.cropName || "",
      quantity: String(harvest.quantity ?? harvest.quantityHarvested ?? ""),
      unit: harvest.unit || "KG",
      qualityGrade: harvest.qualityGrade || "A",
      lotNumber: harvest.lotNumber || "",
      notes: harvest.notes || "",
    });
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function handleFieldChange(fieldIdStr: string) {
    setForm((prev) => {
      const next = { ...prev, fieldId: fieldIdStr };
      const matchingSeasons = cropSeasons.filter(
        (cs) => Number(cs.fieldId) === Number(fieldIdStr)
      );
      if (matchingSeasons.length > 0) {
        next.cropSeasonId = String(matchingSeasons[0].id);
        next.cropName = matchingSeasons[0].cropName || prev.cropName;
      } else {
        next.cropSeasonId = "";
        next.cropName = "";
      }
      return next;
    });
  }

  function handleSeasonChange(seasonIdStr: string) {
    const season = cropSeasons.find((cs) => Number(cs.id) === Number(seasonIdStr));
    setForm((prev) => ({
      ...prev,
      cropSeasonId: seasonIdStr,
      cropName: season?.cropName || prev.cropName,
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.fieldId || !form.cropSeasonId || !form.harvestDate || !form.cropName || !form.quantity) {
      setError("Please fill in all mandatory fields (Field, Season, Crop, Date, Quantity).");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        farmerId: Number(user!.farmerId),
        fieldId: Number(form.fieldId),
        cropSeasonId: Number(form.cropSeasonId),
        harvestDate: form.harvestDate,
        cropName: form.cropName.trim(),
        quantity: parseFloat(form.quantity),
        unit: form.unit.trim() || "KG",
        qualityGrade: form.qualityGrade.trim() || undefined,
        lotNumber: form.lotNumber.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };

      if (editingHarvest) {
        const res = await api.put(`/harvests/${editingHarvest.id}`, payload);
        const updated = res.data?.harvest;
        if (updated) {
          setHarvests((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
        } else {
          await loadData();
        }
        setSuccess("Harvest record updated successfully!");
      } else {
        const res = await api.post("/harvests", payload);
        if (res.data?.harvest) {
          setHarvests((prev) => [res.data.harvest, ...prev]);
        } else {
          await loadData();
        }
        setSuccess("Harvest record added successfully!");
      }

      setShowModal(false);
      setEditingHarvest(null);
      setForm(emptyForm);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Failed to save harvest record.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteHarvest(harvestId: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this harvest record? This cannot be undone."
    );
    if (!confirmed) return;

    setError("");
    setSuccess("");
    try {
      await api.delete(`/harvests/${harvestId}`);
      setHarvests((prev) => prev.filter((h) => h.id !== harvestId));
      setSuccess("Harvest record deleted successfully.");
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Unable to delete harvest record. Please verify if market sales or transport are linked.";
      setError(msg);
    }
  }

  // Unit breakdown adhering to non-mixing policy
  const unitBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    harvests.forEach((h) => {
      const unit = (h.unit || "KG").toUpperCase();
      const qty = Number(h.quantity ?? h.quantityHarvested ?? 0);
      map[unit] = (map[unit] || 0) + qty;
    });
    return map;
  }, [harvests]);

  const gradeACount = useMemo(() => {
    return harvests.filter((h) => (h.qualityGrade || "").toUpperCase().startsWith("A")).length;
  }, [harvests]);

  const uniqueCropsCount = useMemo(() => {
    return new Set(harvests.map((h) => (h.cropName || "").trim().toLowerCase()).filter(Boolean)).size;
  }, [harvests]);

  const filteredHarvests = useMemo(() => {
    return harvests.filter((h) => {
      const crop = (h.cropName || "").toLowerCase();
      const lot = (h.lotNumber || "").toLowerCase();
      const notes = (h.notes || "").toLowerCase();
      const s = search.toLowerCase();
      const matchesSearch = !s || crop.includes(s) || lot.includes(s) || notes.includes(s);

      const matchesGrade =
        gradeFilter === "ALL" ||
        (h.qualityGrade || "").toUpperCase().startsWith(gradeFilter.toUpperCase());

      const matchesUnit =
        unitFilter === "ALL" ||
        (h.unit || "KG").toUpperCase() === unitFilter.toUpperCase();

      return matchesSearch && matchesGrade && matchesUnit;
    });
  }, [harvests, search, gradeFilter, unitFilter]);

  const fieldNameMap = useMemo(() => {
    const map: Record<number, string> = {};
    fields.forEach((f) => {
      map[f.id] = f.fieldName;
    });
    return map;
  }, [fields]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <PageHeader
        title="🌾 My Harvests"
        description="Record, grade, and track farm yield batches linked to your land parcels and crop seasons."
        actions={
          <div style={{ display: "flex", gap: "10px" }}>
            <Button variant="secondary" onClick={loadData} disabled={loading}>
              ↻ Refresh
            </Button>
            <Button variant="primary" onClick={openCreateModal}>
              + Record Harvest
            </Button>
          </div>
        }
      />

      {success && (
        <Alert variant="success" onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert variant="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* KPI Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        <StatCard
          label="Total Harvest Batches"
          value={harvests.length}
          subtitle="All logged yield entries"
        />
        <StatCard
          label="Grade A Batches"
          value={gradeACount}
          subtitle={`${harvests.length > 0 ? Math.round((gradeACount / harvests.length) * 100) : 0}% of total harvests`}
          badge={<Badge variant="success">Premium Quality</Badge>}
        />
        <StatCard
          label="Crop Varieties"
          value={uniqueCropsCount}
          subtitle="Distinct crops harvested"
        />
        <StatCard
          label="Primary Yields"
          value={
            unitBreakdown["KG"]
              ? `${unitBreakdown["KG"].toLocaleString("en-IN")} KG`
              : unitBreakdown["BAG"]
                ? `${unitBreakdown["BAG"].toLocaleString("en-IN")} BAG`
                : harvests.length > 0
                  ? `${Object.keys(unitBreakdown).length} Units Logged`
                  : "0 KG"
          }
          subtitle="Independent unit measurement"
          badge={<Badge variant="neutral">Exact Unit</Badge>}
        />
      </div>

      {/* Search & Filter Toolbar */}
      <Card>
        <CardBody style={{ padding: "14px 18px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "14px",
              alignItems: "flex-end",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#4A5568",
                  marginBottom: "4px",
                }}
              >
                Search Harvests
              </label>
              <Input
                placeholder="Search crop, lot #, or notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#4A5568",
                  marginBottom: "4px",
                }}
              >
                Filter by Quality Grade
              </label>
              <Select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
                <option value="ALL">All Quality Grades</option>
                <option value="A">Grade A (Premium)</option>
                <option value="B">Grade B (Standard)</option>
                <option value="C">Grade C (Fair)</option>
              </Select>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#4A5568",
                  marginBottom: "4px",
                }}
              >
                Filter by Unit
              </label>
              <Select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
                <option value="ALL">All Measurement Units</option>
                <option value="KG">KG (Kilograms)</option>
                <option value="BAG">BAG (Bags)</option>
                <option value="QUINTAL">QUINTAL (Quintals)</option>
                <option value="TON">TON (Metric Tons)</option>
              </Select>
            </div>

            {(search || gradeFilter !== "ALL" || unitFilter !== "ALL") && (
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearch("");
                    setGradeFilter("ALL");
                    setUnitFilter("ALL");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Main Table */}
      {loading ? (
        <Card>
          <CardBody style={{ padding: "24px" }}>
            <Skeleton height="36px" style={{ marginBottom: "12px" }} />
            <Skeleton height="48px" style={{ marginBottom: "8px" }} />
            <Skeleton height="48px" style={{ marginBottom: "8px" }} />
            <Skeleton height="48px" />
          </CardBody>
        </Card>
      ) : filteredHarvests.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              title={harvests.length === 0 ? "No Harvests Recorded Yet" : "No Matching Harvests"}
              description={
                harvests.length === 0
                  ? "Record your first crop harvest to track yields, quality grades, and lot numbers for market sales."
                  : "Try adjusting your search criteria or filter selections to view harvest entries."
              }
              action={
                harvests.length === 0 ? (
                  <Button variant="primary" onClick={openCreateModal}>
                    + Record Your First Harvest
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch("");
                      setGradeFilter("ALL");
                      setUnitFilter("ALL");
                    }}
                  >
                    Reset Filters
                  </Button>
                )
              }
            />
          </CardBody>
        </Card>
      ) : (
        <TableContainer>
          <Table>
            <Thead>
              <Tr>
                <Th>Crop</Th>
                <Th>Field Parcel</Th>
                <Th>Harvest Date</Th>
                <Th>Yield Quantity</Th>
                <Th>Grade</Th>
                <Th>Lot Number</Th>
                <Th>Notes</Th>
                <Th style={{ textAlign: "right" }}>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredHarvests.map((h) => {
                const qty = h.quantity ?? h.quantityHarvested;
                const fieldName = (h.fieldId && fieldNameMap[h.fieldId]) || "Field #" + (h.fieldId || "—");
                const grade = (h.qualityGrade || "A").toUpperCase();

                return (
                  <Tr key={h.id}>
                    <Td>
                      <div style={{ fontWeight: 600, color: "#174D35", fontSize: "14px" }}>
                        🌾 {h.cropName || "Unknown Crop"}
                      </div>
                    </Td>
                    <Td>
                      <span style={{ fontSize: "13px", color: "#4A5568" }}>{fieldName}</span>
                    </Td>
                    <Td>{FMT_DATE(h.harvestDate)}</Td>
                    <Td>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                        <span style={{ fontWeight: 700, fontSize: "14px", color: "#18251E" }}>
                          {qty != null ? Number(qty).toLocaleString("en-IN") : "—"}
                        </span>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "#2F855A",
                            backgroundColor: "#EBF5EE",
                            padding: "1px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          {h.unit || "KG"}
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <Badge
                        variant={
                          grade.startsWith("A")
                            ? "success"
                            : grade.startsWith("B")
                              ? "info"
                              : "warning"
                        }
                      >
                        {h.qualityGrade || "Grade A"}
                      </Badge>
                    </Td>
                    <Td>
                      {h.lotNumber ? (
                        <code
                          style={{
                            background: "#F7FAFC",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            color: "#2D3748",
                            border: "1px solid #E2E8F0",
                          }}
                        >
                          {h.lotNumber}
                        </code>
                      ) : (
                        <span style={{ color: "#A0AEC0", fontSize: "12px" }}>—</span>
                      )}
                    </Td>
                    <Td>
                      <span
                        style={{
                          fontSize: "13px",
                          color: "#4A5568",
                          maxWidth: "180px",
                          display: "inline-block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={h.notes || ""}
                      >
                        {h.notes || "—"}
                      </span>
                    </Td>
                    <Td style={{ textAlign: "right" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          gap: "8px",
                          justifyContent: "flex-end",
                        }}
                      >
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditModal(h)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          style={{ color: "#DC2626" }}
                          onClick={() => handleDeleteHarvest(h.id)}
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

      {/* Record / Edit Harvest Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingHarvest ? "✏️ Edit Harvest Record" : "🌾 Record New Harvest"}
          maxWidth="640px"
        >
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <FormField label="Field Parcel" required help="Select the registered land parcel where this harvest occurred.">
              <Select
                value={form.fieldId}
                onChange={(e) => handleFieldChange(e.target.value)}
                required
              >
                <option value="">Select your field parcel...</option>
                {fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.fieldName}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField label="Crop Season" required help="Select the active crop cultivation season for this field.">
              <Select
                value={form.cropSeasonId}
                onChange={(e) => handleSeasonChange(e.target.value)}
                required
              >
                <option value="">Select crop season...</option>
                {cropSeasons
                  .filter((cs) => !form.fieldId || Number(cs.fieldId) === Number(form.fieldId))
                  .map((cs) => (
                    <option key={cs.id} value={cs.id}>
                      {cs.cropName} ({cs.season || "Season"} {cs.year || ""})
                    </option>
                  ))}
              </Select>
            </FormField>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <FormField label="Crop Name" required>
                <Input
                  type="text"
                  placeholder="e.g. Basmati Paddy, Cotton"
                  value={form.cropName}
                  onChange={(e) => setForm({ ...form, cropName: e.target.value })}
                  required
                />
              </FormField>

              <FormField label="Harvest Date" required>
                <Input
                  type="date"
                  value={form.harvestDate}
                  onChange={(e) => setForm({ ...form, harvestDate: e.target.value })}
                  required
                />
              </FormField>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <FormField label="Yield Quantity" required help="Net harvested volume or weight.">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 1500"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  required
                />
              </FormField>

              <FormField label="Unit" required help="Independent measurement unit.">
                <Select
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                >
                  <option value="KG">KG (Kilograms)</option>
                  <option value="BAG">BAG (Bags)</option>
                  <option value="QUINTAL">QUINTAL (Quintals)</option>
                  <option value="TON">TON (Metric Tons)</option>
                </Select>
              </FormField>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <FormField label="Quality Grade">
                <Select
                  value={form.qualityGrade}
                  onChange={(e) => setForm({ ...form, qualityGrade: e.target.value })}
                >
                  <option value="A">Grade A (Premium / Superior)</option>
                  <option value="B">Grade B (Standard / Good)</option>
                  <option value="C">Grade C (Fair / Commercial)</option>
                  <option value="Ungraded">Ungraded / Raw</option>
                </Select>
              </FormField>

              <FormField label="Lot Number" help="Batch or lot identification code.">
                <Input
                  type="text"
                  placeholder="e.g. LOT-2026-OCT-01"
                  value={form.lotNumber}
                  onChange={(e) => setForm({ ...form, lotNumber: e.target.value })}
                />
              </FormField>
            </div>

            <FormField label="Field Notes & Observations" help="Moisture level, storage location, or weather conditions.">
              <Input
                type="text"
                placeholder="e.g. Dry harvest, stored in north warehouse barn"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </FormField>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "12px",
                paddingTop: "12px",
                borderTop: "1px solid #E2E8F0",
              }}
            >
              <Button variant="secondary" onClick={() => setShowModal(false)} type="button">
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? "Saving..." : editingHarvest ? "Update Harvest" : "Save Harvest"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
