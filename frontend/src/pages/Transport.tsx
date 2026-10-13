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
  farmerName?: string;
}

interface Harvest {
  id: number;
  farmerId: number;
  fieldId?: number;
  cropSeasonId?: number;
  harvestDate?: string;
  cropName?: string;
  quantity?: number;
  unit?: string;
  qualityGrade?: string;
  lotNumber?: string;
}

interface TransportRecord {
  id: number;
  harvestId: number;
  transportDate: string;
  truckNumber?: string | null;
  driverName?: string | null;
  fromLocation?: string | null;
  toLocation?: string | null;
  quantityLoaded?: number | null;
  freightAmount?: number | null;
  loadingCharges?: number | null;
  unloadingCharges?: number | null;
  notes?: string | null;
}

interface FormData {
  harvestId: string;
  transportDate: string;
  truckNumber: string;
  driverName: string;
  fromLocation: string;
  toLocation: string;
  quantityLoaded: string;
  freightAmount: string;
  loadingCharges: string;
  unloadingCharges: string;
  notes: string;
}

const emptyForm: FormData = {
  harvestId: "",
  transportDate: new Date().toISOString().split("T")[0],
  truckNumber: "",
  driverName: "",
  fromLocation: "",
  toLocation: "",
  quantityLoaded: "",
  freightAmount: "",
  loadingCharges: "0",
  unloadingCharges: "0",
  notes: "",
};

export default function Transport() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [records, setRecords] = useState<TransportRecord[]>([]);

  const [form, setForm] = useState<FormData>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  // ============================================================
  // LOAD DATA
  // ============================================================

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [farmersRes, harvestsRes, transportRes] = await Promise.all([
        api.get("/farmers"),
        api.get("/harvests"),
        api.get("/transport-records"),
      ]);

      setFarmers(Array.isArray(farmersRes.data) ? farmersRes.data : []);
      setHarvests(Array.isArray(harvestsRes.data) ? harvestsRes.data : []);
      setRecords(Array.isArray(transportRes.data) ? transportRes.data : []);
    } catch (err: unknown) {
      console.error(err);
      setError("Unable to load transport records. Please verify backend is running.");
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

  const harvestMap = useMemo(() => {
    const map = new Map<number, Harvest>();
    for (const h of harvests) map.set(h.id, h);
    return map;
  }, [harvests]);

  // ============================================================
  // STATS
  // ============================================================

  const stats = useMemo(() => {
    let totalFreight = 0;
    let totalHandling = 0;
    let totalLoaded = 0;

    records.forEach((r) => {
      totalFreight += Number(r.freightAmount || 0);
      totalHandling += Number(r.loadingCharges || 0) + Number(r.unloadingCharges || 0);
      totalLoaded += Number(r.quantityLoaded || 0);
    });

    return {
      tripsCount: records.length,
      totalFreight,
      totalHandling,
      totalLoaded,
    };
  }, [records]);

  // ============================================================
  // FILTERED RECORDS
  // ============================================================

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((r) => {
      if (!query) return true;

      const harvest = harvestMap.get(r.harvestId);
      const farmer = harvest ? farmerMap.get(harvest.farmerId) : undefined;

      const matchTruck = r.truckNumber?.toLowerCase().includes(query) ?? false;
      const matchDriver = r.driverName?.toLowerCase().includes(query) ?? false;
      const matchFrom = r.fromLocation?.toLowerCase().includes(query) ?? false;
      const matchTo = r.toLocation?.toLowerCase().includes(query) ?? false;
      const matchCrop = harvest?.cropName?.toLowerCase().includes(query) ?? false;
      const matchFarmer = farmer?.name?.toLowerCase().includes(query) ?? false;

      return matchTruck || matchDriver || matchFrom || matchTo || matchCrop || matchFarmer;
    });
  }, [records, search, harvestMap, farmerMap]);

  // ============================================================
  // FORM HANDLING
  // ============================================================

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const openAddModal = () => {
    setError("");
    setSuccess("");
    setEditingId(null);
    setForm({
      ...emptyForm,
      harvestId: harvests.length > 0 ? String(harvests[0].id) : "",
      transportDate: new Date().toISOString().split("T")[0],
    });
    setShowModal(true);
  };

  const openEditModal = (r: TransportRecord) => {
    setError("");
    setSuccess("");
    setEditingId(r.id);
    setForm({
      harvestId: String(r.harvestId),
      transportDate: r.transportDate ? r.transportDate.split("T")[0] : "",
      truckNumber: r.truckNumber || "",
      driverName: r.driverName || "",
      fromLocation: r.fromLocation || "",
      toLocation: r.toLocation || "",
      quantityLoaded: r.quantityLoaded !== null && r.quantityLoaded !== undefined ? String(r.quantityLoaded) : "",
      freightAmount: r.freightAmount !== null && r.freightAmount !== undefined ? String(r.freightAmount) : "",
      loadingCharges: r.loadingCharges !== null && r.loadingCharges !== undefined ? String(r.loadingCharges) : "0",
      unloadingCharges: r.unloadingCharges !== null && r.unloadingCharges !== undefined ? String(r.unloadingCharges) : "0",
      notes: r.notes || "",
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

    if (!form.harvestId) {
      setError("Please select a harvest lot.");
      return;
    }
    if (!form.transportDate) {
      setError("Transport date is required.");
      return;
    }

    const payload = {
      harvestId: Number(form.harvestId),
      transportDate: form.transportDate,
      truckNumber: form.truckNumber.trim() || null,
      driverName: form.driverName.trim() || null,
      fromLocation: form.fromLocation.trim() || null,
      toLocation: form.toLocation.trim() || null,
      quantityLoaded: form.quantityLoaded ? Number(form.quantityLoaded) : null,
      freightAmount: form.freightAmount ? Number(form.freightAmount) : null,
      loadingCharges: form.loadingCharges ? Number(form.loadingCharges) : 0,
      unloadingCharges: form.unloadingCharges ? Number(form.unloadingCharges) : 0,
      notes: form.notes.trim() || null,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await api.put(`/transport-records/${editingId}`, payload);
        setSuccess("Transport record updated successfully.");
      } else {
        await api.post("/transport-records", payload);
        setSuccess("Transport record logged successfully.");
      }

      closeModal();
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Failed to save transport record.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm("Are you sure you want to delete this transport record?");
    if (!confirmed) return;

    try {
      await api.delete(`/transport-records/${id}`);
      setSuccess("Transport record deleted successfully.");
      await loadData();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || "Failed to delete transport record.");
    }
  };

  const formatCurrency = (val: number) => `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="al-page-wrapper">
      {/* Header */}
      <PageHeader
        eyebrow="Logistics & Dispatch"
        title="Transport & Freight"
        description="Monitor harvest dispatches, carrier trucks, drivers, loading/unloading charges, and destination freight."
        actions={
          <Button variant="primary" icon="+" onClick={openAddModal}>
            Log Dispatch
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
          label="Total Freight Paid"
          value={formatCurrency(stats.totalFreight)}
          icon="🚛"
          subtitle={`${stats.tripsCount} logistics shipments`}
        />

        <StatCard
          label="Ancillary Handling"
          value={formatCurrency(stats.totalHandling)}
          icon="📦"
          subtitle="Loading + Unloading fees"
          badge={<Badge variant="info">Handling</Badge>}
        />

        <StatCard
          label="Dispatched Trips"
          value={stats.tripsCount}
          icon="🛣️"
          subtitle="Total recorded trips"
          badge={<Badge variant="success">Dispatched</Badge>}
        />

        <StatCard
          label="Loaded Quantity"
          value={stats.totalLoaded.toLocaleString()}
          icon="⚖️"
          subtitle="Cumulative units in transit"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="al-filter-bar">
        <div className="al-filter-search">
          <Input
            placeholder="Search by truck #, driver, route origin/destination, or farmer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="al-filter-actions">
          {search && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearch("")}
            >
              Reset Search
            </Button>
          )}
          <Badge variant="neutral">
            {filteredRecords.length} {filteredRecords.length === 1 ? "shipment" : "shipments"}
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
          ) : filteredRecords.length === 0 ? (
            <EmptyState
              icon="🚛"
              title={search ? "No shipments match search" : "No transport records"}
              description={
                search
                  ? "Try searching with a different truck number, driver name, or route."
                  : "Dispatch your harvested produce to grain markets or central warehouses."
              }
              action={
                search ? (
                  <Button variant="outline" onClick={() => setSearch("")}>
                    Clear Search
                  </Button>
                ) : (
                  <Button variant="primary" icon="+" onClick={openAddModal}>
                    Log First Dispatch
                  </Button>
                )
              }
            />
          ) : (
            <TableContainer>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Dispatch Date</Th>
                    <Th>Harvest Lot</Th>
                    <Th>Vehicle & Driver</Th>
                    <Th>Route (Origin ➔ Destination)</Th>
                    <Th align="right">Quantity</Th>
                    <Th align="right">Freight Charges</Th>
                    <Th align="right">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredRecords.map((r) => {
                    const harvest = harvestMap.get(r.harvestId);
                    const farmer = harvest ? farmerMap.get(harvest.farmerId) : undefined;
                    const handling = Number(r.loadingCharges || 0) + Number(r.unloadingCharges || 0);

                    return (
                      <Tr key={r.id}>
                        {/* Date */}
                        <Td>
                          <span style={{ fontWeight: 500, color: "var(--color-text)" }}>
                            {r.transportDate ? r.transportDate.split("T")[0] : "—"}
                          </span>
                        </Td>

                        {/* Harvest Lot */}
                        <Td>
                          {harvest ? (
                            <div>
                              <div style={{ fontWeight: 600, color: "var(--color-text)" }}>
                                {harvest.cropName || "Crop"}
                              </div>
                              <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                                {farmer?.name ? `${farmer.name} • ` : ""}
                                {harvest.lotNumber ? `Lot #${harvest.lotNumber}` : `Harvest #${r.harvestId}`}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: "var(--color-text-muted)" }}>Harvest #{r.harvestId}</span>
                          )}
                        </Td>

                        {/* Truck & Driver */}
                        <Td>
                          <div style={{ fontWeight: 600, color: "var(--color-text)" }}>
                            {r.truckNumber || "Unassigned Vehicle"}
                          </div>
                          <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                            {r.driverName ? `Driver: ${r.driverName}` : "No driver specified"}
                          </div>
                        </Td>

                        {/* Route */}
                        <Td>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "var(--font-sm)" }}>
                            <span style={{ fontWeight: 500 }}>{r.fromLocation || "Farm Gate"}</span>
                            <span style={{ color: "var(--color-primary)" }}>➔</span>
                            <span style={{ fontWeight: 500 }}>{r.toLocation || "Mandi / Mill"}</span>
                          </div>
                        </Td>

                        {/* Quantity */}
                        <Td align="right">
                          <span style={{ fontWeight: 600 }}>{r.quantityLoaded ?? "—"}</span>{" "}
                          <span style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                            {harvest?.unit || "Units"}
                          </span>
                        </Td>

                        {/* Freight */}
                        <Td align="right">
                          <div style={{ fontWeight: 700, color: "var(--color-text)" }}>
                            {formatCurrency(Number(r.freightAmount || 0))}
                          </div>
                          {handling > 0 && (
                            <div style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
                              + {formatCurrency(handling)} handling
                            </div>
                          )}
                        </Td>

                        {/* Actions */}
                        <Td align="right">
                          <div className="al-table-actions">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(r)}
                              aria-label="Edit Dispatch"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(r.id)}
                              aria-label="Delete Dispatch"
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

      {/* Add / Edit Transport Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingId !== null ? "Edit Transport Dispatch" : "Log Logistics Dispatch"}
        maxWidth="680px"
        footer={
          <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end", width: "100%" }}>
            <Button variant="outline" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const formEl = document.getElementById("transport-form") as HTMLFormElement;
                if (formEl) formEl.requestSubmit();
              }}
              loading={saving}
            >
              {editingId !== null ? "Update Dispatch" : "Save Dispatch"}
            </Button>
          </div>
        }
      >
        <form id="transport-form" onSubmit={handleSubmit}>
          <div className="al-form-grid-2">
            <FormField label="Harvest Lot" required>
              <Select
                value={form.harvestId}
                onChange={(e) => handleChange("harvestId", e.target.value)}
              >
                <option value="">-- Select Harvest Lot --</option>
                {harvests.map((h) => {
                  const f = farmerMap.get(h.farmerId);
                  return (
                    <option key={h.id} value={String(h.id)}>
                      {h.cropName} ({h.quantity} {h.unit}) - {f?.name || `Farmer #${h.farmerId}`}
                    </option>
                  );
                })}
              </Select>
            </FormField>

            <FormField label="Dispatch Date" required>
              <Input
                type="date"
                value={form.transportDate}
                onChange={(e) => handleChange("transportDate", e.target.value)}
              />
            </FormField>

            <FormField label="Vehicle / Truck Registration">
              <Input
                placeholder="e.g. AP 29 TA 4512"
                value={form.truckNumber}
                onChange={(e) => handleChange("truckNumber", e.target.value)}
              />
            </FormField>

            <FormField label="Driver Name & Contact">
              <Input
                placeholder="e.g. Suresh Kumar"
                value={form.driverName}
                onChange={(e) => handleChange("driverName", e.target.value)}
              />
            </FormField>

            <FormField label="Origin / Pickup Location">
              <Input
                placeholder="e.g. North Plot Farm Gate"
                value={form.fromLocation}
                onChange={(e) => handleChange("fromLocation", e.target.value)}
              />
            </FormField>

            <FormField label="Destination / Delivery Point">
              <Input
                placeholder="e.g. Warangal APMC Market"
                value={form.toLocation}
                onChange={(e) => handleChange("toLocation", e.target.value)}
              />
            </FormField>

            <FormField label="Quantity Loaded">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 50"
                value={form.quantityLoaded}
                onChange={(e) => handleChange("quantityLoaded", e.target.value)}
              />
            </FormField>

            <FormField label="Freight / Transport Fee (₹)">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g. 1800.00"
                value={form.freightAmount}
                onChange={(e) => handleChange("freightAmount", e.target.value)}
              />
            </FormField>

            <FormField label="Loading Charges (Hamali) ₹">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.loadingCharges}
                onChange={(e) => handleChange("loadingCharges", e.target.value)}
              />
            </FormField>

            <FormField label="Unloading Charges ₹">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.unloadingCharges}
                onChange={(e) => handleChange("unloadingCharges", e.target.value)}
              />
            </FormField>
          </div>

          <div style={{ marginTop: "var(--space-3)" }}>
            <FormField label="Logistics Notes">
              <Input
                placeholder="Waybill, receipt #, or remarks..."
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