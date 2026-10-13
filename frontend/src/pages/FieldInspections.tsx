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
  FieldVisitIcon,
  EmptyScheduleIllustration,
} from "../components/ui";
import inspectionHeroImg from "../assets/inspection_hero.jpg";
import "./FieldInspections.css";

/* ============================================================================
   INTERFACES & TYPES
   ============================================================================ */

export interface InspectionAvailability {
  id: number;
  inspectionDate: string;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  bookedCount: number;
  remainingCapacity: number;
  isActive: boolean;
  isBookable: boolean;
  notes?: string | null;
  createdAt?: string | null;
}

export interface InspectionReport {
  id: number;
  appointmentId: number;
  inspectorName: string;
  inspectionDate: string;
  affectedCrop: string;
  symptomsObserved: string;
  diagnosis: string;
  recommendedActions: string;
  suggestedProducts?: string | null;
  applicationGuidance?: string | null;
  followUpNotes?: string | null;
  createdAt?: string | null;
}

export interface FieldInspectionAppointment {
  id: number;
  availabilityId: number;
  farmerId: number;
  farmerName?: string | null;
  farmerCode?: string | null;
  farmerPhone?: string | null;
  fieldId: number;
  fieldName?: string | null;
  fieldAreaAcres?: number | null;
  cropSeasonId?: number | null;
  seasonName?: string | null;
  cropType: string;
  reason: string;
  symptoms: string;
  notes?: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "RESCHEDULED" | "COMPLETED" | "CANCELLED";
  adminNotes?: string | null;
  rejectionReason?: string | null;
  inspectionDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  createdAt?: string | null;
  hasReport?: boolean;
  report?: InspectionReport | null;
}

interface FieldOption {
  id: number;
  farmerId: number;
  fieldName: string;
  areaAcres: number | null;
}

interface CropSeasonOption {
  id: number;
  fieldId: number;
  cropName: string;
  season: string;
  year: number;
}

/* ============================================================================
   STATUS BADGE HELPER
   ============================================================================ */

function renderStatusBadge(status: string) {
  switch (status) {
    case "ACCEPTED":
      return <Badge variant="success">Confirmed</Badge>;
    case "PENDING":
      return <Badge variant="warning">Pending Approval</Badge>;
    case "RESCHEDULED":
      return <Badge variant="info">Rescheduled</Badge>;
    case "COMPLETED":
      return <Badge variant="forest">Completed</Badge>;
    case "REJECTED":
      return <Badge variant="danger">Rejected</Badge>;
    case "CANCELLED":
      return <Badge variant="neutral">Cancelled</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}

/* ============================================================================
   MAIN COMPONENT
   ============================================================================ */

export default function FieldInspections() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  // State: Data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [appointments, setAppointments] = useState<FieldInspectionAppointment[]>([]);
  const [availabilities, setAvailabilities] = useState<InspectionAvailability[]>([]);
  const [fields, setFields] = useState<FieldOption[]>([]);
  const [cropSeasons, setCropSeasons] = useState<CropSeasonOption[]>([]);

  // Navigation / Tabs
  const [adminTab, setAdminTab] = useState<"APPOINTMENTS" | "AVAILABILITY">("APPOINTMENTS");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals
  const [showBookModal, setShowBookModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showViewReportModal, setShowViewReportModal] = useState(false);

  // Active appointment for action
  const [activeAppointment, setActiveAppointment] = useState<FieldInspectionAppointment | null>(null);

  // Booking Form State
  const [selectedFieldId, setSelectedFieldId] = useState<string>("");
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [cropType, setCropType] = useState<string>("");
  const [reason, setReason] = useState<string>("Pest Infestation");
  const [symptoms, setSymptoms] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [selectedAvailabilityId, setSelectedAvailabilityId] = useState<number | null>(null);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  // Publish Slot Form State (Admin)
  const [pubDate, setPubDate] = useState<string>("");
  const [pubStartTime, setPubStartTime] = useState<string>("09:00");
  const [pubEndTime, setPubEndTime] = useState<string>("11:00");
  const [pubCapacity, setPubCapacity] = useState<number>(1);
  const [pubNotes, setPubNotes] = useState<string>("");
  const [publishSubmitting, setPublishSubmitting] = useState(false);

  // Reject Form State
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // Reschedule Form State
  const [rescheduleSlotId, setRescheduleSlotId] = useState<number | null>(null);
  const [rescheduleNotes, setRescheduleNotes] = useState<string>("");
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);

  // Report Form State (Admin)
  const [reportInspectorName, setReportInspectorName] = useState<string>("AgriLedger Inspection Specialist");
  const [reportDate, setReportDate] = useState<string>("");
  const [reportAffectedCrop, setReportAffectedCrop] = useState<string>("");
  const [reportSymptoms, setReportSymptoms] = useState<string>("");
  const [reportDiagnosis, setReportDiagnosis] = useState<string>("");
  const [reportActions, setReportActions] = useState<string>("");
  const [reportProducts, setReportProducts] = useState<string>("");
  const [reportGuidance, setReportGuidance] = useState<string>("");
  const [reportFollowUp, setReportFollowUp] = useState<string>("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  /* ==========================================================================
     FETCH DATA
     ========================================================================== */

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (isAdmin) {
        // Load admin view
        const [appRes, availRes] = await Promise.all([
          api.get<{ status: string; appointments: FieldInspectionAppointment[] }>("/inspections/admin/appointments"),
          api.get<{ status: string; availabilities: InspectionAvailability[] }>("/inspections/admin/availability"),
        ]);
        setAppointments(appRes.data.appointments || []);
        setAvailabilities(availRes.data.availabilities || []);
      } else {
        // Load farmer view
        const [myAppRes, bookableAvailRes, fieldRes, seasonRes] = await Promise.all([
          api.get<{ status: string; appointments: FieldInspectionAppointment[] }>("/inspections/my-appointments"),
          api.get<{ status: string; availabilities: InspectionAvailability[] }>("/inspections/availability"),
          api.get<{ status: string; fields?: FieldOption[] } | FieldOption[]>("/fields"),
          api.get<{ status: string; cropSeasons?: CropSeasonOption[] } | CropSeasonOption[]>("/crop-seasons"),
        ]);
        setAppointments(myAppRes.data.appointments || []);
        setAvailabilities(bookableAvailRes.data.availabilities || []);

        const fieldData = fieldRes.data;
        const rawFields = Array.isArray(fieldData) ? fieldData : (fieldData as { fields?: FieldOption[] }).fields || [];
        setFields(rawFields);

        const seasonData = seasonRes.data;
        const rawSeasons = Array.isArray(seasonData) ? seasonData : (seasonData as { cropSeasons?: CropSeasonOption[] }).cropSeasons || [];
        setCropSeasons(rawSeasons);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load inspection data.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAdmin]);

  // Set default publish date to tomorrow
  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setPubDate(d.toISOString().split("T")[0]);
  }, []);

  /* ==========================================================================
     FILTERED APPOINTMENTS
     ========================================================================== */

  const filteredAppointments = useMemo(() => {
    if (statusFilter === "ALL") return appointments;
    return appointments.filter((a) => a.status === statusFilter);
  }, [appointments, statusFilter]);

  const stats = useMemo(() => {
    const total = appointments.length;
    const pending = appointments.filter((a) => a.status === "PENDING").length;
    const accepted = appointments.filter((a) => a.status === "ACCEPTED").length;
    const completed = appointments.filter((a) => a.status === "COMPLETED").length;
    return { total, pending, accepted, completed };
  }, [appointments]);

  /* ==========================================================================
     HANDLER: FARMER BOOKING
     ========================================================================== */

  const handleOpenBookModal = () => {
    setSelectedFieldId(fields.length > 0 ? String(fields[0].id) : "");
    setSelectedSeasonId("");
    setCropType("");
    setReason("Pest Infestation");
    setSymptoms("");
    setNotes("");
    setSelectedAvailabilityId(availabilities.length > 0 ? availabilities[0].id : null);
    setShowBookModal(true);
  };

  const handleBookSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFieldId || !selectedAvailabilityId || !cropType || !symptoms) {
      setError("Please complete all required fields including field, crop, symptoms, and time slot.");
      return;
    }

    try {
      setBookingSubmitting(true);
      setError(null);
      await api.post("/inspections/appointments", {
        availabilityId: selectedAvailabilityId,
        fieldId: parseInt(selectedFieldId, 10),
        cropSeasonId: selectedSeasonId ? parseInt(selectedSeasonId, 10) : null,
        cropType,
        reason,
        symptoms,
        notes: notes || undefined,
      });
      setSuccessMsg("Inspection appointment requested successfully! Awaiting dealer confirmation.");
      setShowBookModal(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to book appointment.";
      setError(msg);
    } finally {
      setBookingSubmitting(false);
    }
  };

  /* ==========================================================================
     HANDLER: ADMIN PUBLISH AVAILABILITY
     ========================================================================== */

  const handlePublishSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pubDate || !pubStartTime || !pubEndTime) {
      setError("Please specify date, start time, and end time.");
      return;
    }

    try {
      setPublishSubmitting(true);
      setError(null);
      await api.post("/inspections/availability", {
        inspectionDate: pubDate,
        startTime: pubStartTime,
        endTime: pubEndTime,
        maxCapacity: pubCapacity,
        notes: pubNotes || undefined,
      });
      setSuccessMsg("Inspection availability published successfully.");
      setShowPublishModal(false);
      setPubNotes("");
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to publish availability.";
      setError(msg);
    } finally {
      setPublishSubmitting(false);
    }
  };

  /* ==========================================================================
     HANDLER: ADMIN STATUS TRANSITIONS
     ========================================================================== */

  const handleAcceptAppointment = async (id: number) => {
    try {
      setError(null);
      await api.post(`/inspections/appointments/${id}/accept`, {});
      setSuccessMsg("Appointment accepted and confirmed!");
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to accept appointment.";
      setError(msg);
    }
  };

  const handleOpenRejectModal = (appointment: FieldInspectionAppointment) => {
    setActiveAppointment(appointment);
    setRejectionReason("");
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeAppointment) return;

    try {
      setRejectSubmitting(true);
      setError(null);
      await api.post(`/inspections/appointments/${activeAppointment.id}/reject`, {
        rejectionReason: rejectionReason || "Capacity unavailable or scheduling conflict",
      });
      setSuccessMsg("Appointment marked as rejected.");
      setShowRejectModal(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reject appointment.";
      setError(msg);
    } finally {
      setRejectSubmitting(false);
    }
  };

  const handleOpenRescheduleModal = (appointment: FieldInspectionAppointment) => {
    setActiveAppointment(appointment);
    const firstOther = availabilities.find((s) => s.id !== appointment.availabilityId && s.isBookable);
    setRescheduleSlotId(firstOther ? firstOther.id : null);
    setRescheduleNotes("");
    setShowRescheduleModal(true);
  };

  const handleRescheduleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeAppointment || !rescheduleSlotId) {
      setError("Please select a new availability slot.");
      return;
    }

    try {
      setRescheduleSubmitting(true);
      setError(null);
      await api.post(`/inspections/appointments/${activeAppointment.id}/reschedule`, {
        newAvailabilityId: rescheduleSlotId,
        adminNotes: rescheduleNotes || undefined,
      });
      setSuccessMsg("Appointment rescheduled to the new time slot.");
      setShowRescheduleModal(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reschedule appointment.";
      setError(msg);
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  /* ==========================================================================
     HANDLER: RECORD INSPECTION REPORT (ADMIN)
     ========================================================================== */

  const handleOpenReportModal = (appointment: FieldInspectionAppointment) => {
    setActiveAppointment(appointment);
    setReportInspectorName(user?.username ? `Officer ${user.username.toUpperCase()}` : "AgriLedger Field Specialist");
    setReportDate(appointment.inspectionDate || new Date().toISOString().split("T")[0]);
    setReportAffectedCrop(appointment.cropType);
    setReportSymptoms(appointment.symptoms);
    setReportDiagnosis(appointment.report?.diagnosis || "");
    setReportActions(appointment.report?.recommendedActions || "");
    setReportProducts(appointment.report?.suggestedProducts || "");
    setReportGuidance(appointment.report?.applicationGuidance || "");
    setReportFollowUp(appointment.report?.followUpNotes || "");
    setShowReportModal(true);
  };

  const handleReportSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeAppointment || !reportDiagnosis || !reportActions) {
      setError("Please fill in diagnosis and recommended actions.");
      return;
    }

    try {
      setReportSubmitting(true);
      setError(null);
      await api.post(`/inspections/appointments/${activeAppointment.id}/report`, {
        inspectorName: reportInspectorName,
        inspectionDate: reportDate,
        affectedCrop: reportAffectedCrop,
        symptomsObserved: reportSymptoms,
        diagnosis: reportDiagnosis,
        recommendedActions: reportActions,
        suggestedProducts: reportProducts || undefined,
        applicationGuidance: reportGuidance || undefined,
        followUpNotes: reportFollowUp || undefined,
      });
      setSuccessMsg("Field inspection report recorded and appointment completed!");
      setShowReportModal(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save inspection report.";
      setError(msg);
    } finally {
      setReportSubmitting(false);
    }
  };

  /* ==========================================================================
     HANDLER: CANCEL APPOINTMENT (FARMER / ADMIN)
     ========================================================================== */

  const handleCancelAppointment = async (id: number) => {
    if (!window.confirm("Are you sure you want to cancel this inspection appointment?")) return;

    try {
      setError(null);
      await api.post(`/inspections/appointments/${id}/cancel`, {
        reason: "Cancelled by farmer",
      });
      setSuccessMsg("Appointment cancelled successfully.");
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to cancel appointment.";
      setError(msg);
    }
  };

  /* ==========================================================================
     HANDLER: TOGGLE AVAILABILITY (ADMIN)
     ========================================================================== */

  const handleToggleAvailability = async (slot: InspectionAvailability) => {
    try {
      setError(null);
      await api.put(`/inspections/availability/${slot.id}`, {
        isActive: !slot.isActive,
      });
      setSuccessMsg(`Slot ${slot.isActive ? "closed" : "reopened"} successfully.`);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to toggle slot state.";
      setError(msg);
    }
  };

  /* ==========================================================================
     RENDER
     ========================================================================== */

  return (
    <div className="fi-page">
      {/* Page Header */}
      <PageHeader
        title="Field Inspection & Appointments"
        description={
          isAdmin
            ? "Manage inspection schedule, review farmer booking requests, and record expert pathology reports."
            : "Book on-site field visits with certified crop advisors and review expert diagnoses."
        }
        actions={
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {isAdmin ? (
              <Button variant="primary" onClick={() => setShowPublishModal(true)}>
                📅 Publish Availability
              </Button>
            ) : (
              <Button variant="primary" onClick={handleOpenBookModal}>
                🌿 Book New Inspection
              </Button>
            )}
          </div>
        }
      />

      {/* Alerts */}
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {successMsg && (
        <Alert variant="success" onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {/* Hero Banner with Agricultural Photo */}
      <div
        className="fi-hero"
        style={{
          position: "relative",
          overflow: "hidden",
          backgroundImage: `linear-gradient(90deg, rgba(23, 77, 53, 0.96) 0%, rgba(23, 77, 53, 0.90) 50%, rgba(23, 77, 53, 0.45) 85%), url(${inspectionHeroImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center right",
          minHeight: "190px",
        }}
      >
        <div className="fi-hero__content">
          <div className="fi-hero__badge">
            <span>🌿</span>
            <span>{isAdmin ? "Certified Agronomy Services" : "Expert Field Diagnostics"}</span>
          </div>
          <h2 className="fi-hero__title">
            {isAdmin ? "Dealer Inspection Operations" : "Expert Agronomist Field Visits"}
          </h2>
          <p className="fi-hero__subtitle">
            {isAdmin
              ? "Publish time slots for your field officers. Review incoming farmer requests, prevent overbooking with real-time slot constraints, and deliver actionable crop health prescriptions."
              : "Have an agronomist inspect your field in person. Receive exact pest, soil, and disease diagnoses along with verified fertilizer and crop-care recommendations."}
          </p>
          <div className="fi-hero__actions">
            {isAdmin ? (
              <>
                <Button variant="outline" onClick={() => setAdminTab("AVAILABILITY")}>
                  Manage Calendar Slots ({availabilities.length})
                </Button>
                <Button variant="outline" onClick={() => setAdminTab("APPOINTMENTS")}>
                  Review Requests ({stats.pending} Pending)
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={handleOpenBookModal}>
                🌿 Book Field Inspection
              </Button>
            )}
          </div>
        </div>
        <div className="fi-hero__icon">
          <FieldVisitIcon size={44} />
        </div>
      </div>

      {/* 3-Step Farmer Booking Visual Guide (Farmer view only) */}
      {!isAdmin && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: "16px",
            background: "#FFFFFF",
            border: "1px solid var(--color-border, #E2E8E4)",
            borderRadius: "12px",
            padding: "16px 20px",
            boxShadow: "0 1px 3px rgba(24, 37, 30, 0.04)",
          }}
        >
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--color-primary-forest, #174D35)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "14px", flexShrink: 0 }}>
              1
            </div>
            <div>
              <strong style={{ display: "block", fontSize: "13.5px", color: "var(--color-text-primary, #18251E)" }}>Select Field & Crop</strong>
              <span style={{ fontSize: "12px", color: "var(--color-text-muted, #768A7E)", lineHeight: 1.4 }}>Pick the affected parcel and crop stage for review.</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--color-action-green, #2F855A)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "14px", flexShrink: 0 }}>
              2
            </div>
            <div>
              <strong style={{ display: "block", fontSize: "13.5px", color: "var(--color-text-primary, #18251E)" }}>Choose Inspection Slot</strong>
              <span style={{ fontSize: "12px", color: "var(--color-text-muted, #768A7E)", lineHeight: 1.4 }}>Select an available date and verified specialist time slot.</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--color-primary-forest, #174D35)", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "14px", flexShrink: 0 }}>
              3
            </div>
            <div>
              <strong style={{ display: "block", fontSize: "13.5px", color: "var(--color-text-primary, #18251E)" }}>Get Certified Report</strong>
              <span style={{ fontSize: "12px", color: "var(--color-text-muted, #768A7E)", lineHeight: 1.4 }}>Agronomist visits in-person and issues digital pathology advice.</span>
            </div>
          </div>
        </div>
      )}

      {/* Metric Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        <StatCard label="Total Appointments" value={stats.total} icon={<FieldVisitIcon size={24} />} />
        <StatCard label="Pending Approval" value={stats.pending} icon="⏳" />
        <StatCard label="Confirmed / Upcoming" value={stats.accepted} icon="✅" />
        <StatCard label="Completed Reports" value={stats.completed} icon="🔬" />
      </div>

      {/* Admin Tabs */}
      {isAdmin && (
        <div className="fi-tabs">
          <button
            className={`fi-tab ${adminTab === "APPOINTMENTS" ? "fi-tab--active" : ""}`}
            onClick={() => setAdminTab("APPOINTMENTS")}
          >
            📋 Appointment Requests
            <span className="fi-tab__count">{appointments.length}</span>
          </button>
          <button
            className={`fi-tab ${adminTab === "AVAILABILITY" ? "fi-tab--active" : ""}`}
            onClick={() => setAdminTab("AVAILABILITY")}
          >
            📅 Inspection Availability Slots
            <span className="fi-tab__count">{availabilities.length}</span>
          </button>
        </div>
      )}

      {/* Content Loading */}
      {loading ? (
        <Card>
          <CardBody>
            <Skeleton height="35px" style={{ marginBottom: "1rem" }} />
            <Skeleton height="200px" />
          </CardBody>
        </Card>
      ) : (
        <>
          {/* ================================================================
              VIEW: ADMIN AVAILABILITY MANAGEMENT TAB
             ================================================================ */}
          {isAdmin && adminTab === "AVAILABILITY" && (
            <Card>
              <CardBody>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h3 style={{ margin: 0, color: "#174D35", fontSize: "1.15rem", fontWeight: 700 }}>
                    Published Field Inspection Windows
                  </h3>
                  <Button variant="primary" size="sm" onClick={() => setShowPublishModal(true)}>
                    + Add New Slot
                  </Button>
                </div>

                {availabilities.length === 0 ? (
                  <EmptyState
                    icon={<EmptyScheduleIllustration size={90} />}
                    title="No availability slots published yet"
                    description="Publish your first date and time window so registered farmers can schedule inspection visits."
                    action={<Button variant="primary" onClick={() => setShowPublishModal(true)}>Publish Now</Button>}
                  />
                ) : (
                  <TableContainer>
                    <Table>
                      <Thead>
                        <Tr>
                          <Th>Date</Th>
                          <Th>Time Window</Th>
                          <Th>Capacity</Th>
                          <Th>Booked</Th>
                          <Th>Remaining</Th>
                          <Th>Status</Th>
                          <Th>Notes</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {availabilities.map((slot) => (
                          <Tr key={slot.id}>
                            <Td style={{ fontWeight: 600 }}>{slot.inspectionDate}</Td>
                            <Td>{slot.startTime} – {slot.endTime}</Td>
                            <Td>{slot.maxCapacity}</Td>
                            <Td>{slot.bookedCount}</Td>
                            <Td>
                              <span style={{ fontWeight: 700, color: slot.remainingCapacity > 0 ? "#2F855A" : "#E53E3E" }}>
                                {slot.remainingCapacity}
                              </span>
                            </Td>
                            <Td>
                              {slot.isActive ? (
                                <Badge variant="success">Open</Badge>
                              ) : (
                                <Badge variant="neutral">Closed</Badge>
                              )}
                            </Td>
                            <Td style={{ color: "#718096", fontSize: "0.85rem" }}>{slot.notes || "—"}</Td>
                            <Td>
                              <Button
                                variant={slot.isActive ? "outline" : "secondary"}
                                size="sm"
                                onClick={() => handleToggleAvailability(slot)}
                              >
                                {slot.isActive ? "Close Slot" : "Reopen"}
                              </Button>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                )}
              </CardBody>
            </Card>
          )}

          {/* ================================================================
              VIEW: APPOINTMENTS LIST (ADMIN TABLE / FARMER CARDS)
             ================================================================ */}
          {(!isAdmin || adminTab === "APPOINTMENTS") && (
            <Card>
              <CardBody>
                {/* Filter Bar */}
                <div className="fi-filter-bar">
                  <div className="fi-filter-group">
                    <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "#4A5568" }}>Filter by Status:</span>
                    {["ALL", "PENDING", "ACCEPTED", "COMPLETED", "REJECTED", "CANCELLED"].map((st) => (
                      <Button
                        key={st}
                        size="sm"
                        variant={statusFilter === st ? "primary" : "outline"}
                        onClick={() => setStatusFilter(st)}
                      >
                        {st === "ALL" ? "All Requests" : st}
                      </Button>
                    ))}
                  </div>
                  <span style={{ fontSize: "0.85rem", color: "#718096" }}>
                    Showing {filteredAppointments.length} appointment{filteredAppointments.length === 1 ? "" : "s"}
                  </span>
                </div>

                {filteredAppointments.length === 0 ? (
                  <EmptyState
                    icon={<EmptyScheduleIllustration size={90} />}
                    title="No appointments found"
                    description={
                      isAdmin
                        ? "There are no appointments matching the selected status filter."
                        : "You haven't requested any field inspections yet."
                    }
                    action={
                      !isAdmin && (
                        <Button variant="primary" onClick={handleOpenBookModal}>
                          Schedule Your First Visit
                        </Button>
                      )
                    }
                  />
                ) : isAdmin ? (
                  /* Admin Table View */
                  <TableContainer>
                    <Table>
                      <Thead>
                        <Tr>
                          <Th>ID</Th>
                          <Th>Farmer</Th>
                          <Th>Field & Crop</Th>
                          <Th>Scheduled Time</Th>
                          <Th>Reason / Symptoms</Th>
                          <Th>Status</Th>
                          <Th>Actions</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {filteredAppointments.map((app) => (
                          <Tr key={app.id}>
                            <Td style={{ fontWeight: 700 }}>#{app.id}</Td>
                            <Td>
                              <div style={{ fontWeight: 600 }}>{app.farmerName || `Farmer #${app.farmerId}`}</div>
                              <div style={{ fontSize: "0.75rem", color: "#718096" }}>{app.farmerCode} {app.farmerPhone ? `• ${app.farmerPhone}` : ""}</div>
                            </Td>
                            <Td>
                              <div style={{ fontWeight: 600 }}>{app.fieldName || `Field #${app.fieldId}`}</div>
                              <div style={{ fontSize: "0.8rem", color: "#2F855A", fontWeight: 600 }}>{app.cropType}</div>
                            </Td>
                            <Td>
                              <div style={{ fontWeight: 600 }}>{app.inspectionDate || "Unassigned"}</div>
                              <div style={{ fontSize: "0.8rem", color: "#718096" }}>
                                {app.startTime && app.endTime ? `${app.startTime} – ${app.endTime}` : ""}
                              </div>
                            </Td>
                            <Td style={{ maxWidth: "260px" }}>
                              <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{app.reason}</div>
                              <div style={{ fontSize: "0.8rem", color: "#4A5568", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {app.symptoms}
                              </div>
                            </Td>
                            <Td>{renderStatusBadge(app.status)}</Td>
                            <Td>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                                {(app.status === "PENDING" || app.status === "RESCHEDULED") && (
                                  <>
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => handleAcceptAppointment(app.id)}
                                    >
                                      Accept
                                    </Button>
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      onClick={() => handleOpenRejectModal(app)}
                                    >
                                      Reject
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenRescheduleModal(app)}
                                    >
                                      Reschedule
                                    </Button>
                                  </>
                                )}
                                {app.status === "ACCEPTED" && (
                                  <>
                                    <Button
                                      variant="forest"
                                      size="sm"
                                      onClick={() => handleOpenReportModal(app)}
                                    >
                                      📝 Record Report
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenRescheduleModal(app)}
                                    >
                                      Reschedule
                                    </Button>
                                  </>
                                )}
                                {app.status === "COMPLETED" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setActiveAppointment(app);
                                      setShowViewReportModal(true);
                                    }}
                                  >
                                    🔬 View Report
                                  </Button>
                                )}
                              </div>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </TableContainer>
                ) : (
                  /* Farmer Card Grid View */
                  <div className="fi-appoint-grid">
                    {filteredAppointments.map((app) => (
                      <div key={app.id} className="fi-appoint-card">
                        <div>
                          <div className="fi-appoint-card__header">
                            <div>
                              <h4 className="fi-appoint-card__title">
                                {app.cropType} ({app.fieldName || `Field #${app.fieldId}`})
                              </h4>
                              <div className="fi-appoint-card__date">
                                📅 {app.inspectionDate} • {app.startTime} - {app.endTime}
                              </div>
                            </div>
                            {renderStatusBadge(app.status)}
                          </div>

                          <div className="fi-appoint-card__body">
                            <div className="fi-appoint-card__row">
                              <span className="fi-appoint-card__label">Reason</span>
                              <span className="fi-appoint-card__value">{app.reason}</span>
                            </div>
                            <div className="fi-appoint-card__row">
                              <span className="fi-appoint-card__label">Requested On</span>
                              <span className="fi-appoint-card__value">
                                {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : "—"}
                              </span>
                            </div>
                            <div className="fi-appoint-card__symptoms">
                              <strong>Symptoms Reported:</strong> {app.symptoms}
                            </div>
                            {app.rejectionReason && (
                              <div style={{ marginTop: "0.5rem", padding: "0.5rem", background: "#FFF5F5", borderRadius: "6px", color: "#C53030", fontSize: "0.8rem" }}>
                                <strong>Dealer Note:</strong> {app.rejectionReason}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="fi-appoint-card__footer">
                          {(app.status === "PENDING" || app.status === "ACCEPTED") && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleCancelAppointment(app.id)}
                            >
                              Cancel Appointment
                            </Button>
                          )}
                          {app.status === "COMPLETED" && app.report && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setActiveAppointment(app);
                                setShowViewReportModal(true);
                              }}
                            >
                              🔬 View Diagnosis & Advice
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </>
      )}

      {/* ======================================================================
          MODAL: BOOK APPOINTMENT (FARMER)
         ====================================================================== */}
      <Modal
        isOpen={showBookModal}
        onClose={() => setShowBookModal(false)}
        title="🌿 Schedule On-Site Field Inspection"
      >
        <form onSubmit={handleBookSubmit}>
          <FormField label="Select Your Field" required>
            <Select
              value={selectedFieldId}
              onChange={(e) => setSelectedFieldId(e.target.value)}
              required
            >
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.fieldName} ({f.areaAcres ? `${f.areaAcres} acres` : "Acreage unrecorded"})
                </option>
              ))}
            </Select>
          </FormField>

          {cropSeasons.length > 0 && (
            <FormField label="Related Crop Season (Optional)">
              <Select
                value={selectedSeasonId}
                onChange={(e) => setSelectedSeasonId(e.target.value)}
              >
                <option value="">-- No specific season --</option>
                {cropSeasons.map((cs) => (
                  <option key={cs.id} value={cs.id}>
                    {cs.cropName} ({cs.season} {cs.year})
                  </option>
                ))}
              </Select>
            </FormField>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="Crop Type / Variety" required>
              <Input
                placeholder="e.g. Bt Cotton, Chilli, Sona Masuri"
                value={cropType}
                onChange={(e) => setCropType(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Primary Inspection Reason" required>
              <Select value={reason} onChange={(e) => setReason(e.target.value)} required>
                <option value="Pest Infestation">Pest Infestation</option>
                <option value="Fungal / Leaf Disease">Fungal / Leaf Disease</option>
                <option value="Nutrient Deficiency / Yellowing">Nutrient Deficiency / Yellowing</option>
                <option value="Irrigation / Drought Stress">Irrigation / Drought Stress</option>
                <option value="Pre-Harvest Health Review">Pre-Harvest Health Review</option>
                <option value="Other Field Concern">Other Field Concern</option>
              </Select>
            </FormField>
          </div>

          <FormField label="Describe Symptoms & Field Problem" required>
            <textarea
              className="al-input"
              rows={3}
              placeholder="e.g. Leaf edges curling and developing black spots over 20% of the plot since last week..."
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              required
              style={{ width: "100%", padding: "0.5rem" }}
            />
          </FormField>

          <FormField label="Choose an Available Inspection Window" required>
            {availabilities.filter((a) => a.isBookable).length === 0 ? (
              <Alert variant="warning">
                No open availability slots currently published. Please contact the dealer or check back shortly.
              </Alert>
            ) : (
              <div className="fi-slot-grid" style={{ maxHeight: "220px", overflowY: "auto" }}>
                {availabilities
                  .filter((a) => a.isBookable)
                  .map((slot) => (
                    <div
                      key={slot.id}
                      className={`fi-slot-card ${selectedAvailabilityId === slot.id ? "fi-slot-card--selected" : ""}`}
                      onClick={() => setSelectedAvailabilityId(slot.id)}
                    >
                      <div className="fi-slot-card__date">📅 {slot.inspectionDate}</div>
                      <div className="fi-slot-card__time">⏰ {slot.startTime} – {slot.endTime}</div>
                      <div className="fi-slot-card__meta">
                        <span>Slots open: <strong>{slot.remainingCapacity}</strong></span>
                        {selectedAvailabilityId === slot.id && <span style={{ color: "#2F855A", fontWeight: 700 }}>✓ Selected</span>}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </FormField>

          <FormField label="Additional Notes (Optional)">
            <Input
              placeholder="e.g. Enter via north gate near the tubewell"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </FormField>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.25rem" }}>
            <Button variant="secondary" onClick={() => setShowBookModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={bookingSubmitting || !selectedAvailabilityId}
            >
              {bookingSubmitting ? "Submitting Request..." : "Request Appointment"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================================
          MODAL: PUBLISH AVAILABILITY (ADMIN)
         ====================================================================== */}
      <Modal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        title="📅 Publish Field Inspection Slot"
      >
        <form onSubmit={handlePublishSubmit}>
          <FormField label="Inspection Date" required>
            <Input
              type="date"
              min={new Date().toISOString().split("T")[0]}
              value={pubDate}
              onChange={(e) => setPubDate(e.target.value)}
              required
            />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="Start Time (HH:MM)" required>
              <Input
                type="time"
                value={pubStartTime}
                onChange={(e) => setPubStartTime(e.target.value)}
                required
              />
            </FormField>

            <FormField label="End Time (HH:MM)" required>
              <Input
                type="time"
                value={pubEndTime}
                onChange={(e) => setPubEndTime(e.target.value)}
                required
              />
            </FormField>
          </div>

          <FormField label="Maximum Capacity (Appointments Allowed)" required>
            <Input
              type="number"
              min={1}
              max={10}
              value={pubCapacity}
              onChange={(e) => setPubCapacity(parseInt(e.target.value, 10) || 1)}
              required
            />
          </FormField>

          <FormField label="Location / Route Notes (Optional)">
            <Input
              placeholder="e.g. North Mandal Villages inspection route"
              value={pubNotes}
              onChange={(e) => setPubNotes(e.target.value)}
            />
          </FormField>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.25rem" }}>
            <Button variant="secondary" onClick={() => setShowPublishModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={publishSubmitting}>
              {publishSubmitting ? "Publishing..." : "Publish Slot"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================================
          MODAL: REJECT APPOINTMENT (ADMIN)
         ====================================================================== */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Appointment Request"
      >
        <form onSubmit={handleRejectSubmit}>
          <p style={{ fontSize: "0.9rem", color: "#4A5568", marginTop: 0 }}>
            Specify the reason for declining this request. The farmer will be able to review this explanation.
          </p>
          <FormField label="Reason for Rejection" required>
            <textarea
              className="al-input"
              rows={3}
              placeholder="e.g. Inspector unavailable due to rain; please choose another slot."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              required
              style={{ width: "100%", padding: "0.5rem" }}
            />
          </FormField>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.25rem" }}>
            <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" type="submit" disabled={rejectSubmitting}>
              {rejectSubmitting ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================================
          MODAL: RESCHEDULE APPOINTMENT (ADMIN)
         ====================================================================== */}
      <Modal
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        title="Reschedule Appointment"
      >
        <form onSubmit={handleRescheduleSubmit}>
          <p style={{ fontSize: "0.9rem", color: "#4A5568", marginTop: 0 }}>
            Select an alternative open slot. The farmer will see the updated schedule in their portal.
          </p>
          <FormField label="Select New Inspection Slot" required>
            <div className="fi-slot-grid" style={{ maxHeight: "220px", overflowY: "auto" }}>
              {availabilities
                .filter((a) => a.isBookable && a.id !== activeAppointment?.availabilityId)
                .map((slot) => (
                  <div
                    key={slot.id}
                    className={`fi-slot-card ${rescheduleSlotId === slot.id ? "fi-slot-card--selected" : ""}`}
                    onClick={() => setRescheduleSlotId(slot.id)}
                  >
                    <div className="fi-slot-card__date">📅 {slot.inspectionDate}</div>
                    <div className="fi-slot-card__time">⏰ {slot.startTime} – {slot.endTime}</div>
                    <div className="fi-slot-card__meta">
                      <span>Available: {slot.remainingCapacity}</span>
                      {rescheduleSlotId === slot.id && <span style={{ color: "#2F855A", fontWeight: 700 }}>✓ Selected</span>}
                    </div>
                  </div>
                ))}
            </div>
          </FormField>
          <FormField label="Rescheduling Note for Farmer">
            <Input
              placeholder="e.g. Moved to morning rounds due to afternoon weather."
              value={rescheduleNotes}
              onChange={(e) => setRescheduleNotes(e.target.value)}
            />
          </FormField>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.25rem" }}>
            <Button variant="secondary" onClick={() => setShowRescheduleModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={rescheduleSubmitting || !rescheduleSlotId}>
              {rescheduleSubmitting ? "Rescheduling..." : "Confirm Reschedule"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================================
          MODAL: RECORD INSPECTION REPORT (ADMIN)
         ====================================================================== */}
      <Modal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        title="🔬 Record Field Inspection Findings & Prescription"
      >
        <form onSubmit={handleReportSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="Inspector / Officer Name" required>
              <Input
                value={reportInspectorName}
                onChange={(e) => setReportInspectorName(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Inspection Date" required>
              <Input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                required
              />
            </FormField>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="Affected Crop" required>
              <Input
                value={reportAffectedCrop}
                onChange={(e) => setReportAffectedCrop(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Symptoms Observed" required>
              <Input
                value={reportSymptoms}
                onChange={(e) => setReportSymptoms(e.target.value)}
                required
              />
            </FormField>
          </div>

          <FormField label="Official Agronomic Diagnosis" required>
            <textarea
              className="al-input"
              rows={2}
              placeholder="e.g. Early Stage Cercospora Leaf Spot with secondary nitrogen deficiency"
              value={reportDiagnosis}
              onChange={(e) => setReportDiagnosis(e.target.value)}
              required
              style={{ width: "100%", padding: "0.5rem" }}
            />
          </FormField>

          <FormField label="Recommended Actions & Cultural Controls" required>
            <textarea
              className="al-input"
              rows={3}
              placeholder="e.g. Ensure furrow drainage; remove lower infected leaves; apply foliar spray in morning hours."
              value={reportActions}
              onChange={(e) => setReportActions(e.target.value)}
              required
              style={{ width: "100%", padding: "0.5rem" }}
            />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="Suggested Crop-Care Products">
              <Input
                placeholder="e.g. Carbendazim 12% + Mancozeb 63% WP"
                value={reportProducts}
                onChange={(e) => setReportProducts(e.target.value)}
              />
            </FormField>
            <FormField label="Application Guidance & Dosage">
              <Input
                placeholder="e.g. 2.5g / Litre of water, spray twice at 10-day intervals"
                value={reportGuidance}
                onChange={(e) => setReportGuidance(e.target.value)}
              />
            </FormField>
          </div>

          <FormField label="Follow-Up Schedule & Notes">
            <Input
              placeholder="e.g. Re-inspect after 14 days if symptoms persist"
              value={reportFollowUp}
              onChange={(e) => setReportFollowUp(e.target.value)}
            />
          </FormField>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1.25rem" }}>
            <Button variant="secondary" onClick={() => setShowReportModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={reportSubmitting}>
              {reportSubmitting ? "Saving Report..." : "Complete & Deliver Report"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================================
          MODAL: VIEW REPORT (FARMER & ADMIN)
         ====================================================================== */}
      <Modal
        isOpen={showViewReportModal}
        onClose={() => setShowViewReportModal(false)}
        title="🔬 Official Field Inspection Report"
      >
        {activeAppointment?.report ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", borderBottom: "1px solid #E2E8F0", paddingBottom: "0.75rem" }}>
              <div>
                <span style={{ fontSize: "0.8rem", color: "#718096" }}>INSPECTOR</span>
                <div style={{ fontWeight: 700, color: "#174D35" }}>{activeAppointment.report.inspectorName}</div>
              </div>
              <div>
                <span style={{ fontSize: "0.8rem", color: "#718096" }}>DATE</span>
                <div style={{ fontWeight: 700 }}>{activeAppointment.report.inspectionDate}</div>
              </div>
              <div>
                <span style={{ fontSize: "0.8rem", color: "#718096" }}>CROP</span>
                <div style={{ fontWeight: 700, color: "#2F855A" }}>{activeAppointment.report.affectedCrop}</div>
              </div>
            </div>

            <div className="fi-report-section">
              <div className="fi-report-section__label">Symptoms Recorded</div>
              <div className="fi-report-section__text">{activeAppointment.report.symptomsObserved}</div>
            </div>

            <div className="fi-report-section">
              <div className="fi-report-section__label">Pathology Diagnosis</div>
              <div className="fi-report-section__text" style={{ background: "#F0FDF4", borderColor: "#86EFAC", fontWeight: 600 }}>
                {activeAppointment.report.diagnosis}
              </div>
            </div>

            <div className="fi-report-section">
              <div className="fi-report-section__label">Recommended Remediation</div>
              <div className="fi-report-section__text">{activeAppointment.report.recommendedActions}</div>
            </div>

            {(activeAppointment.report.suggestedProducts || activeAppointment.report.applicationGuidance) && (
              <div className="fi-prescription">
                <div className="fi-prescription__badge">💊 Prescription Crop Care Guidance</div>
                {activeAppointment.report.suggestedProducts && (
                  <div style={{ marginBottom: "0.5rem" }}>
                    <strong>Recommended Products:</strong> {activeAppointment.report.suggestedProducts}
                  </div>
                )}
                {activeAppointment.report.applicationGuidance && (
                  <div>
                    <strong>Dosage & Application:</strong> {activeAppointment.report.applicationGuidance}
                  </div>
                )}
              </div>
            )}

            {activeAppointment.report.followUpNotes && (
              <div style={{ marginTop: "1rem", fontSize: "0.85rem", color: "#4A5568" }}>
                <strong>Follow-Up:</strong> {activeAppointment.report.followUpNotes}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
              <Button variant="primary" onClick={() => setShowViewReportModal(false)}>
                Close Report
              </Button>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Report not recorded yet"
            description="The inspection is pending review or currently being scheduled."
          />
        )}
      </Modal>
    </div>
  );
}
