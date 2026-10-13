import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

type Farmer = {
  id: number;
  farmerCode?: string;
  name?: string;
  farmerName?: string;
};

type MarketSale = {
  id: number;
  farmerId: number;
  harvestId: number;
  saleDate: string;
  marketName?: string | null;
  buyerName?: string | null;
  quantitySold?: number | null;
  ratePerUnit?: number | null;
  grossAmount?: number | null;
  commission?: number | null;
  marketFee?: number | null;
  otherDeduction?: number | null;
};

type TransportRecord = {
  id: number;
  harvestId: number;
  transportDate: string;
  truckNumber?: string | null;
  freightAmount?: number | null;
  loadingCharges?: number | null;
  unloadingCharges?: number | null;
};

type Settlement = {
  id: number;
  farmerId: number;
  cropSeasonId?: number | null;
  settlementDate: string;
  totalCropSales?: number | null;
  totalInputCredit?: number | null;
  totalLabourCredit?: number | null;
  totalTransport?: number | null;
  totalDeductions?: number | null;
  totalInterest?: number | null;
  totalPayments?: number | null;
  finalAmount?: number | null;
  settlementStatus?: string | null;
};

type FarmerPayment = {
  id: number;
  farmerId: number;
  settlementId?: number | null;
  paymentDate: string;
  amount: number;
  paymentMode: string;
};

type DashboardData = {
  farmers: Farmer[];
  fields: unknown[];
  cropSeasons: unknown[];
  harvests: unknown[];
  marketSales: MarketSale[];
  transportRecords: TransportRecord[];
  settlements: Settlement[];
  payments: FarmerPayment[];
  inputPurchases: unknown[];
  labourExpenses: unknown[];
};

function numberValue(
  value: number | string | null | undefined
): number {
  const number = Number(value || 0);

  return Number.isFinite(number) ? number : 0;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(numberValue(value));
}

function formatDate(
  value: string | null | undefined
): string {
  if (!value) return "-";

  const parts = value.split("-");

  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  return value;
}

function getFarmerName(
  farmer: Farmer | undefined
): string {
  if (!farmer) {
    return "Unknown Farmer";
  }

  return (
    farmer.name ||
    farmer.farmerName ||
    farmer.farmerCode ||
    `Farmer ${farmer.id}`
  );
}

function Dashboard() {
  const [data, setData] = useState<DashboardData>({
    farmers: [],
    fields: [],
    cropSeasons: [],
    harvests: [],
    marketSales: [],
    transportRecords: [],
    settlements: [],
    payments: [],
    inputPurchases: [],
    labourExpenses: [],
  });

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const endpoints = [
        "farmers",
        "fields",
        "crop-seasons",
        "harvests",
        "market-sales",
        "transport-records",
        "settlements",
        "farmer-payments",
        "input-purchases",
        "labour-expenses",
      ];

      const results = await Promise.all(
        endpoints.map(async (endpoint) => {
          try {
            return await api.get<unknown>(`/${endpoint}`);
          } catch (error) {
            throw new Error(
              error instanceof Error
                ? error.message
                : `Unable to load ${endpoint}`
            );
          }
        })
      );

      /*
       * IMPORTANT:
       *
       * Axios returns a response object:
       *
       * {
       *   data: [...],
       *   status: 200,
       *   ...
       * }
       *
       * Therefore Dashboard must read response.data.
       *
       * This helper supports:
       *
       * 1. Direct arrays
       * 2. Axios responses containing .data
       * 3. APIs returning { value: [...] }
       * 4. APIs returning nested response objects
       */

      const cleanArray = (value: unknown): any[] => {
        if (Array.isArray(value)) {
          return value;
        }

        if (!value || typeof value !== "object") {
          return [];
        }

        const objectValue = value as Record<string, unknown>;

        /*
         * Axios response
         */
        if ("data" in objectValue) {
          return cleanArray(objectValue.data);
        }

        /*
         * API response format:
         *
         * {
         *   value: [...]
         * }
         */
        if ("value" in objectValue) {
          return cleanArray(objectValue.value);
        }

        return [];
      };

      setData({
        farmers: cleanArray(results[0]),
        fields: cleanArray(results[1]),
        cropSeasons: cleanArray(results[2]),
        harvests: cleanArray(results[3]),
        marketSales: cleanArray(results[4]),
        transportRecords: cleanArray(results[5]),
        settlements: cleanArray(results[6]),
        payments: cleanArray(results[7]),
        inputPurchases: cleanArray(results[8]),
        labourExpenses: cleanArray(results[9]),
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load dashboard"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // ==========================================================
  // CALCULATIONS
  // ==========================================================

  const totalSales = useMemo(() => {
    return data.marketSales.reduce(
      (total, sale) =>
        total +
        numberValue(sale.grossAmount),
      0
    );
  }, [data.marketSales]);

  const totalSalesDeductions = useMemo(() => {
    return data.marketSales.reduce(
      (total, sale) =>
        total +
        numberValue(sale.commission) +
        numberValue(sale.marketFee) +
        numberValue(sale.otherDeduction),
      0
    );
  }, [data.marketSales]);

  const totalTransport = useMemo(() => {
    return data.transportRecords.reduce(
      (total, record) =>
        total +
        numberValue(record.freightAmount) +
        numberValue(record.loadingCharges) +
        numberValue(record.unloadingCharges),
      0
    );
  }, [data.transportRecords]);

  const totalPayments = useMemo(() => {
    return data.payments.reduce(
      (total, payment) =>
        total +
        numberValue(payment.amount),
      0
    );
  }, [data.payments]);

  const totalSettlementFinal = useMemo(() => {
    return data.settlements.reduce(
      (total, settlement) =>
        total +
        numberValue(settlement.finalAmount),
      0
    );
  }, [data.settlements]);

  const outstandingAmount = useMemo(() => {
    return Math.max(
      totalSettlementFinal - totalPayments,
      0
    );
  }, [
    totalSettlementFinal,
    totalPayments,
  ]);

  const totalInputCredit = useMemo(() => {
    return data.settlements.reduce(
      (total, settlement) =>
        total +
        numberValue(
          settlement.totalInputCredit
        ),
      0
    );
  }, [data.settlements]);

  const totalLabourCredit = useMemo(() => {
    return data.settlements.reduce(
      (total, settlement) =>
        total +
        numberValue(
          settlement.totalLabourCredit
        ),
      0
    );
  }, [data.settlements]);

  // ==========================================================
  // RECENT SALES
  // ==========================================================

  const recentSales = useMemo(() => {
    return [...data.marketSales]
      .sort((a, b) =>
        String(b.saleDate).localeCompare(
          String(a.saleDate)
        )
      )
      .slice(0, 5);
  }, [data.marketSales]);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="page">

      {/* ====================================================
          HEADER
      ===================================================== */}

      <div className="page-header">
        <div>
          <span className="eyebrow">
            AGRILEDGER
          </span>

          <h1>
            Dashboard
          </h1>

          <p>
            Overview of farmers,
            crops, sales, transport,
            settlements and payments.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={loadDashboard}
          disabled={loading}
        >
          {loading
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </div>

      {/* ====================================================
          ERROR
      ===================================================== */}

      {errorMessage && (
        <div
          style={{
            background: "#fff1f2",
            border: "1px solid #f3b4bb",
            color: "#b42318",
            padding: "14px 18px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          <strong>
            Error:
          </strong>{" "}
          {errorMessage}
        </div>
      )}

      {/* ====================================================
          LOADING
      ===================================================== */}

      {loading ? (
        <div
          className="card"
          style={{
            padding: "60px",
            textAlign: "center",
          }}
        >
          <h2>
            Loading dashboard...
          </h2>

          <p>
            Fetching your
            AgriLedger data.
          </p>
        </div>
      ) : (
        <>
          {/* ==================================================
              RECORD COUNTS
          =================================================== */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(4, minmax(0, 1fr))",
              gap: "18px",
              marginBottom: "20px",
            }}
          >
            <div className="card">
              <div
                style={{
                  color: "#667085",
                  marginBottom: "8px",
                }}
              >
                👨‍🌾 Farmers
              </div>

              <strong
                style={{
                  fontSize: "30px",
                }}
              >
                {data.farmers.length}
              </strong>

              <p>
                Registered farmers
              </p>
            </div>

            <div className="card">
              <div
                style={{
                  color: "#667085",
                  marginBottom: "8px",
                }}
              >
                🌾 Fields
              </div>

              <strong
                style={{
                  fontSize: "30px",
                }}
              >
                {data.fields.length}
              </strong>

              <p>
                Registered fields
              </p>
            </div>

            <div className="card">
              <div
                style={{
                  color: "#667085",
                  marginBottom: "8px",
                }}
              >
                🌱 Crop Seasons
              </div>

              <strong
                style={{
                  fontSize: "30px",
                }}
              >
                {data.cropSeasons.length}
              </strong>

              <p>
                Crop seasons
              </p>
            </div>

            <div className="card">
              <div
                style={{
                  color: "#667085",
                  marginBottom: "8px",
                }}
              >
                🚜 Harvests
              </div>

              <strong
                style={{
                  fontSize: "30px",
                }}
              >
                {data.harvests.length}
              </strong>

              <p>
                Recorded harvests
              </p>
            </div>
          </div>

          {/* ==================================================
              FINANCIAL SUMMARY
          =================================================== */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(4, minmax(0, 1fr))",
              gap: "18px",
              marginBottom: "20px",
            }}
          >
            <div className="card">
              <div
                style={{
                  color: "#667085",
                  marginBottom: "8px",
                }}
              >
                🛒 Total Crop Sales
              </div>

              <strong
                style={{
                  fontSize: "25px",
                }}
              >
                {formatMoney(totalSales)}
              </strong>

              <p>
                Gross market sales
              </p>
            </div>

            <div className="card">
              <div
                style={{
                  color: "#667085",
                  marginBottom: "8px",
                }}
              >
                🚚 Transport Cost
              </div>

              <strong
                style={{
                  fontSize: "25px",
                }}
              >
                {formatMoney(totalTransport)}
              </strong>

              <p>
                Freight + loading +
                unloading
              </p>
            </div>

            <div className="card">
              <div
                style={{
                  color: "#667085",
                  marginBottom: "8px",
                }}
              >
                💰 Total Payments
              </div>

              <strong
                style={{
                  fontSize: "25px",
                }}
              >
                {formatMoney(totalPayments)}
              </strong>

              <p>
                Paid to farmers
              </p>
            </div>

            <div
              className="card"
              style={{
                border:
                  "1px solid #23865b",
              }}
            >
              <div
                style={{
                  color: "#667085",
                  marginBottom: "8px",
                }}
              >
                📊 Outstanding
              </div>

              <strong
                style={{
                  fontSize: "25px",
                  color: "#087443",
                }}
              >
                {formatMoney(
                  outstandingAmount
                )}
              </strong>

              <p>
                Remaining payable
              </p>
            </div>
          </div>

          {/* ==================================================
              TRANSACTION COUNTS
          =================================================== */}

          <div className="card">
            <div
              style={{
                marginBottom: "20px",
              }}
            >
              <h2>
                Transaction Overview
              </h2>

              <p>
                Current records across
                the AgriLedger system.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(4, minmax(0, 1fr))",
                gap: "18px",
              }}
            >
              <div
                style={{
                  padding: "20px",
                  background: "#f5f8f6",
                  borderRadius: "10px",
                }}
              >
                <strong>
                  {data.marketSales.length}
                </strong>

                <p>
                  Market Sales
                </p>
              </div>

              <div
                style={{
                  padding: "20px",
                  background: "#f5f8f6",
                  borderRadius: "10px",
                }}
              >
                <strong>
                  {
                    data.transportRecords
                      .length
                  }
                </strong>

                <p>
                  Transport Records
                </p>
              </div>

              <div
                style={{
                  padding: "20px",
                  background: "#f5f8f6",
                  borderRadius: "10px",
                }}
              >
                <strong>
                  {data.settlements.length}
                </strong>

                <p>
                  Settlements
                </p>
              </div>

              <div
                style={{
                  padding: "20px",
                  background: "#f5f8f6",
                  borderRadius: "10px",
                }}
              >
                <strong>
                  {data.payments.length}
                </strong>

                <p>
                  Farmer Payments
                </p>
              </div>
            </div>
          </div>

          {/* ==================================================
              CREDIT SUMMARY
          =================================================== */}

          <div
            className="card"
            style={{
              marginTop: "20px",
            }}
          >
            <div
              style={{
                marginBottom: "20px",
              }}
            >
              <h2>
                Credit & Deduction Summary
              </h2>

              <p>
                Financial components
                recorded through
                settlements.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(4, minmax(0, 1fr))",
                gap: "18px",
              }}
            >
              <div>
                <span>
                  Input Credit
                </span>

                <h3>
                  {formatMoney(
                    totalInputCredit
                  )}
                </h3>
              </div>

              <div>
                <span>
                  Labour Credit
                </span>

                <h3>
                  {formatMoney(
                    totalLabourCredit
                  )}
                </h3>
              </div>

              <div>
                <span>
                  Sales Deductions
                </span>

                <h3>
                  {formatMoney(
                    totalSalesDeductions
                  )}
                </h3>
              </div>

              <div>
                <span>
                  Settlement Value
                </span>

                <h3>
                  {formatMoney(
                    totalSettlementFinal
                  )}
                </h3>
              </div>
            </div>
          </div>

          {/* ==================================================
              RECENT MARKET SALES
          =================================================== */}

          <div
            className="card"
            style={{
              marginTop: "20px",
            }}
          >
            <div
              style={{
                marginBottom: "20px",
              }}
            >
              <h2>
                Recent Market Sales
              </h2>

              <p>
                Latest crop sales
                recorded in AgriLedger.
              </p>
            </div>

            {recentSales.length === 0 ? (
              <div
                style={{
                  padding: "40px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "45px",
                  }}
                >
                  🌱
                </div>

                <h3>
                  No market sales
                </h3>

                <p>
                  Market sales will
                  appear here once
                  recorded.
                </p>
              </div>
            ) : (
              <div
                style={{
                  overflowX: "auto",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse:
                      "collapse",
                    minWidth: "750px",
                  }}
                >
                  <thead>
                    <tr>
                      <th>
                        Farmer
                      </th>

                      <th>
                        Date
                      </th>

                      <th>
                        Market
                      </th>

                      <th>
                        Buyer
                      </th>

                      <th>
                        Quantity
                      </th>

                      <th>
                        Gross
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentSales.map(
                      (sale) => {
                        const farmer =
                          data.farmers.find(
                            (item) =>
                              item.id ===
                              sale.farmerId
                          );

                        return (
                          <tr
                            key={
                              sale.id
                            }
                          >
                            <td>
                              {getFarmerName(
                                farmer
                              )}
                            </td>

                            <td>
                              {formatDate(
                                sale.saleDate
                              )}
                            </td>

                            <td>
                              {sale.marketName ||
                                "-"}
                            </td>

                            <td>
                              {sale.buyerName ||
                                "-"}
                            </td>

                            <td>
                              {numberValue(
                                sale.quantitySold
                              ).toFixed(2)}
                            </td>

                            <td>
                              <strong>
                                {formatMoney(
                                  numberValue(
                                    sale.grossAmount
                                  )
                                )}
                              </strong>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;