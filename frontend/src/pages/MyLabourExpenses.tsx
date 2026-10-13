import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  EmptyState,
  Input,
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

const FMT_INR = (n: number) =>
  n.toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 });

const FMT_DATE = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

interface Field {
  id: number;
  fieldName: string;
}

interface CropSeason {
  id: number;
  fieldId: number;
  cropName: string;
  season?: string | null;
  year?: number | null;
}

interface LabourExpense {
  id: number;
  farmerId: number;
  fieldId: number;
  cropSeasonId: number;
  workDate: string;
  workType: string;
  workerCount?: number | null;
  amount: number;
  paymentType: "CASH" | "CREDIT" | "PARTIAL";
  paidAmount: number;
  notes?: string | null;
}

export default function MyLabourExpenses() {
  const { user } = useAuth();

  const [expenses, setExpenses] = useState<LabourExpense[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [cropSeasons, setCropSeasons] = useState<CropSeason[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState("ALL");

  useEffect(() => {
    loadData();
  }, [user?.farmerId]);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      if (!user) {
        throw new Error("Authentication required.");
      }

      if (user.role !== "FARMER") {
        throw new Error("This page is available only for farmer accounts.");
      }

      if (!user.farmerId) {
        throw new Error("Your account is not linked to a farmer record.");
      }

      const [expensesRes, fieldsRes, cropSeasonsRes] = await Promise.all([
        api.get<LabourExpense[]>("/labour-expenses"),
        api.get<Field[]>("/fields"),
        api.get<CropSeason[]>("/crop-seasons"),
      ]);

      const expensesData = Array.isArray(expensesRes.data) ? expensesRes.data : [];
      const fieldsData = Array.isArray(fieldsRes.data) ? fieldsRes.data : [];
      const cropSeasonsData = Array.isArray(cropSeasonsRes.data) ? cropSeasonsRes.data : [];

      const farmerId = Number(user.farmerId);
      const farmerExpenses = expensesData.filter(
        (expense: LabourExpense) => Number(expense.farmerId) === farmerId
      );

      setExpenses(farmerExpenses);
      setFields(fieldsData);
      setCropSeasons(cropSeasonsData);
    } catch (err: any) {
      console.error("My Labour Expenses error:", err);
      setError(
        err.response?.data?.message ||
        err.message ||
        "Unable to load labour expenses."
      );
    } finally {
      setLoading(false);
    }
  }

  const fieldMap = useMemo(() => {
    const map: Record<number, string> = {};
    fields.forEach((f) => {
      map[f.id] = f.fieldName;
    });
    return map;
  }, [fields]);

  const cropSeasonMap = useMemo(() => {
    const map: Record<number, string> = {};
    cropSeasons.forEach((cs) => {
      const season = cs.season ? ` - ${cs.season}` : "";
      const yr = cs.year ? ` ${cs.year}` : "";
      map[cs.id] = `${cs.cropName}${season}${yr}`;
    });
    return map;
  }, [cropSeasons]);

  const totalAmount = useMemo(() => {
    return expenses.reduce((t, e) => t + Number(e.amount || 0), 0);
  }, [expenses]);

  const totalPaid = useMemo(() => {
    return expenses.reduce((t, e) => t + Number(e.paidAmount || 0), 0);
  }, [expenses]);

  const totalOutstanding = useMemo(() => {
    return Math.max(0, totalAmount - totalPaid);
  }, [totalAmount, totalPaid]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const wType = (e.workType || "").toLowerCase();
      const notes = (e.notes || "").toLowerCase();
      const fName = (fieldMap[e.fieldId] || "").toLowerCase();
      const csName = (cropSeasonMap[e.cropSeasonId] || "").toLowerCase();
      const q = search.toLowerCase();

      const matchesSearch =
        !q ||
        wType.includes(q) ||
        notes.includes(q) ||
        fName.includes(q) ||
        csName.includes(q);

      const matchesPayment =
        paymentTypeFilter === "ALL" || e.paymentType === paymentTypeFilter;

      return matchesSearch && matchesPayment;
    });
  }, [expenses, search, paymentTypeFilter, fieldMap, cropSeasonMap]);

  const getPaymentTypeBadge = (type: string) => {
    if (type === "CASH") return <Badge variant="success">Cash (Settled)</Badge>;
    if (type === "PARTIAL") return <Badge variant="warning">Partially Paid</Badge>;
    if (type === "CREDIT") return <Badge variant="info">Credit (Pending)</Badge>;
    return <Badge variant="neutral">{type}</Badge>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <PageHeader
        title="👷 My Labour Expenses"
        description="Comprehensive accounting of agricultural field labor work, worker headcounts, disbursed wages, and credit balances."
        actions={
          <div style={{ display: "flex", gap: "10px" }}>
            <Button variant="secondary" onClick={loadData} disabled={loading}>
              ↻ Refresh
            </Button>
          </div>
        }
      />

      {error && (
        <Alert variant="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* KPI Overview Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        <StatCard
          label="Total Labour Operations"
          value={expenses.length}
          subtitle="Field work shifts recorded"
        />
        <StatCard
          label="Total Labour Cost"
          value={FMT_INR(totalAmount)}
          subtitle="Cumulative wages incurred"
          badge={<Badge variant="neutral">Gross Cost</Badge>}
        />
        <StatCard
          label="Wages Disbursed"
          value={FMT_INR(totalPaid)}
          subtitle="Paid directly or advanced"
          badge={<Badge variant="success">Paid</Badge>}
        />
        <StatCard
          label="Outstanding Wage Balance"
          value={FMT_INR(totalOutstanding)}
          subtitle="Payable to farm workers"
          badge={
            totalOutstanding > 0 ? (
              <Badge variant="warning">Pending Pay</Badge>
            ) : (
              <Badge variant="success">Fully Settled</Badge>
            )
          }
        />
      </div>

      {/* Search & Filter Bar */}
      <Card>
        <CardBody style={{ padding: "14px 18px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
                Search Labour Activities
              </label>
              <Input
                placeholder="Search operation, notes, parcel..."
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
                Filter by Payment Mode
              </label>
              <Select
                value={paymentTypeFilter}
                onChange={(e) => setPaymentTypeFilter(e.target.value)}
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="CASH">Cash (Full Settlement)</option>
                <option value="PARTIAL">Partial Paid</option>
                <option value="CREDIT">Credit (Full Outstanding)</option>
              </Select>
            </div>

            {(search || paymentTypeFilter !== "ALL") && (
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearch("");
                    setPaymentTypeFilter("ALL");
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
      ) : filteredExpenses.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              title={expenses.length === 0 ? "No Labour Expenses Found" : "No Matching Labour Records"}
              description={
                expenses.length === 0
                  ? "There are currently no labour expense records linked to your farmer account."
                  : "Try resetting your search query or payment mode filter to view records."
              }
              action={
                search || paymentTypeFilter !== "ALL" ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch("");
                      setPaymentTypeFilter("ALL");
                    }}
                  >
                    Reset Filters
                  </Button>
                ) : undefined
              }
            />
          </CardBody>
        </Card>
      ) : (
        <TableContainer>
          <Table>
            <Thead>
              <Tr>
                <Th>Work Date</Th>
                <Th>Field Parcel</Th>
                <Th>Crop Season</Th>
                <Th>Work Type</Th>
                <Th>Workers</Th>
                <Th>Total Amount</Th>
                <Th>Payment Status</Th>
                <Th>Amount Paid</Th>
                <Th>Outstanding</Th>
                <Th>Notes</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredExpenses.map((expense) => {
                const outstanding = Math.max(
                  0,
                  Number(expense.amount || 0) - Number(expense.paidAmount || 0)
                );

                return (
                  <Tr key={expense.id}>
                    <Td>{FMT_DATE(expense.workDate)}</Td>
                    <Td>
                      <span style={{ fontWeight: 600, color: "#174D35", fontSize: "13px" }}>
                        {fieldMap[expense.fieldId] || `Field #${expense.fieldId}`}
                      </span>
                    </Td>
                    <Td>
                      <span style={{ fontSize: "13px", color: "#4A5568" }}>
                        {cropSeasonMap[expense.cropSeasonId] || `Season #${expense.cropSeasonId}`}
                      </span>
                    </Td>
                    <Td>
                      <span style={{ fontWeight: 600, color: "#18251E" }}>
                        {expense.workType || "—"}
                      </span>
                    </Td>
                    <Td>
                      <span style={{ color: "#4A5568", fontWeight: 600 }}>
                        {expense.workerCount ?? "—"}
                      </span>
                    </Td>
                    <Td>
                      <span style={{ fontWeight: 700, color: "#18251E" }}>
                        {FMT_INR(Number(expense.amount || 0))}
                      </span>
                    </Td>
                    <Td>{getPaymentTypeBadge(expense.paymentType)}</Td>
                    <Td>
                      <span style={{ color: "#166534", fontWeight: 600 }}>
                        {FMT_INR(Number(expense.paidAmount || 0))}
                      </span>
                    </Td>
                    <Td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: outstanding > 0 ? "#C05621" : "#166534",
                        }}
                      >
                        {FMT_INR(outstanding)}
                      </span>
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
                        title={expense.notes || ""}
                      >
                        {expense.notes || "—"}
                      </span>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}