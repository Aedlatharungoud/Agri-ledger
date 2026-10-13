import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "./IntelligentReports.css";

// ============================================================
// TYPES
// ============================================================

interface FinancialSummary {
  gross_sales: number;
  sales_deductions: number;
  net_sales: number;
  input_credit: number;
  labour_credit: number;
  transport_cost: number;
  interest: number;
  total_expenses: number;
  estimated_realization: number;
}

interface RiskAnalysis {
  risk_score: number;
  risk_level: string;
  financial_health: string;
  risk_reasons: string[];
}

interface Recommendation {
  priority: string;
  category: string;
  title: string;
  message: string;
}

interface Anomaly {
  transaction_type: string;
  record_id: number;
  farmer_id: number;
  amount?: number;
  quantity?: number;
  unit_price?: number;
  severity: string;
  reason: string;
  detection_method: string;
  normal_range?: {
    minimum: number;
    maximum: number;
  };
  requires_review: boolean;
}

interface Farmer {
  farmer_id: number;
  farmer_code: string;
  farmer_name: string;

  financial_summary: FinancialSummary;

  risk_analysis?: RiskAnalysis;

  recommendation_summary?: {
    recommendation_count: number;
    priority_action_count: number;
    priority_actions: string[];
  };

  recommendations?: Recommendation[];

  anomaly_count?: number;
  anomalies?: Anomaly[];
}

interface FinancialResponse {
  status: string;
  farmers: Farmer[];
}

interface RiskResponse {
  status: string;
  farmers: Farmer[];
}

interface RecommendationResponse {
  status: string;
  farmers: Farmer[];
}

interface ProfileResponse {
  status: string;
  farmers: Farmer[];
}

interface AnomalyResponse {
  status: string;
  summary: {
    total_anomalies: number;
    farmers_analyzed: number;
    farmers_with_anomalies: number;
    review_required: boolean;
  };
  farmers: Farmer[];
}

// ============================================================
// HELPERS
// ============================================================

function numberValue(
  value: number | string | null | undefined
): number {
  const parsed = Number(value || 0);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function formatCurrency(
  value: number | string | null | undefined
): string {
  return `₹${numberValue(value).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

function getOutstandingAmount(
  farmer: Farmer
): number {
  const financial =
    farmer.financial_summary;

  return (
    numberValue(financial.input_credit) +
    numberValue(financial.labour_credit) +
    numberValue(financial.interest)
  );
}

function getRiskClass(
  riskLevel: string
): string {
  switch (
  riskLevel.toUpperCase()
  ) {
    case "HIGH":
      return "report-risk-high";

    case "MEDIUM":
      return "report-risk-medium";

    case "LOW":
      return "report-risk-low";

    default:
      return "report-risk-neutral";
  }
}

function getPriorityClass(
  priority: string
): string {
  switch (
  priority.toUpperCase()
  ) {
    case "CRITICAL":
      return "priority-critical";

    case "HIGH":
      return "priority-high";

    case "MEDIUM":
      return "priority-medium";

    default:
      return "priority-low";
  }
}

function getSeverityClass(
  severity: string
): string {
  switch (
  severity.toUpperCase()
  ) {
    case "HIGH":
    case "CRITICAL":
      return "severity-high";

    case "MEDIUM":
      return "severity-medium";

    default:
      return "severity-low";
  }
}

// ============================================================
// COMPONENT
// ============================================================

function IntelligentReports() {
  const [farmers, setFarmers] =
    useState<Farmer[]>([]);

  const [selectedFarmerId, setSelectedFarmerId] =
    useState<string>("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [reportGenerated, setReportGenerated] =
    useState(false);

  // ==========================================================
  // LOAD AI DATA
  // ==========================================================

  useEffect(() => {
    loadAIReportData();
  }, []);

  async function loadAIReportData() {
    try {
      setLoading(true);
      setError("");

      const [
        financialResponse,
        riskResponse,
        recommendationResponse,
        profileResponse,
        anomalyResponse,
      ] = await Promise.all([
        api.get<FinancialResponse>("/ai/financial-insights"),
        api.get<RiskResponse>("/ai/farmer-risk"),
        api.get<RecommendationResponse>("/ai/recommendations"),
        api.get<ProfileResponse>("/ai/farmer-profile"),
        api.get<AnomalyResponse>("/ai/anomalies"),
      ]);

      const financialData: FinancialResponse = financialResponse.data;
      const riskData: RiskResponse = riskResponse.data;
      const recommendationData: RecommendationResponse = recommendationResponse.data;
      const profileData: ProfileResponse = profileResponse.data;
      const anomalyData: AnomalyResponse = anomalyResponse.data;

      // ======================================================
      // COMBINE FARMER DATA
      // ======================================================

      const farmerMap =
        new Map<number, Farmer>();

      // ------------------------------------------------------
      // Financial
      // ------------------------------------------------------

      for (
        const farmer of financialData.farmers
      ) {
        farmerMap.set(
          farmer.farmer_id,
          {
            ...farmer,
          }
        );
      }

      // ------------------------------------------------------
      // Risk
      // ------------------------------------------------------

      for (
        const farmer of riskData.farmers
      ) {
        const existing =
          farmerMap.get(
            farmer.farmer_id
          );

        if (existing) {
          existing.risk_analysis =
            farmer.risk_analysis;
        }
      }

      // ------------------------------------------------------
      // Recommendations
      // ------------------------------------------------------

      for (
        const farmer of
        recommendationData.farmers
      ) {
        const existing =
          farmerMap.get(
            farmer.farmer_id
          );

        if (existing) {
          existing.recommendation_summary =
            farmer.recommendation_summary;

          existing.recommendations =
            farmer.recommendations;
        }
      }

      // ------------------------------------------------------
      // Farmer profile
      // ------------------------------------------------------

      for (
        const farmer of
        profileData.farmers
      ) {
        const existing =
          farmerMap.get(
            farmer.farmer_id
          );

        if (existing) {
          existing.risk_analysis =
            farmer.risk_analysis;

          existing.recommendation_summary =
            farmer.recommendation_summary;

          existing.recommendations =
            farmer.recommendations;
        }
      }

      // ------------------------------------------------------
      // Anomalies
      // ------------------------------------------------------

      for (
        const farmer of
        anomalyData.farmers
      ) {
        const existing =
          farmerMap.get(
            farmer.farmer_id
          );

        if (existing) {
          existing.anomaly_count =
            farmer.anomaly_count;

          existing.anomalies =
            farmer.anomalies;
        }
      }

      const combinedFarmers =
        Array.from(
          farmerMap.values()
        );

      setFarmers(
        combinedFarmers
      );

      // Automatically select first farmer
      // but do not generate the report yet.

      if (
        combinedFarmers.length > 0
      ) {
        setSelectedFarmerId(
          String(
            combinedFarmers[0]
              .farmer_id
          )
        );
      }

    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load intelligent reports."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // SELECTED FARMER
  // ==========================================================

  const selectedFarmer =
    useMemo(() => {
      return farmers.find(
        (farmer) =>
          farmer.farmer_id ===
          Number(
            selectedFarmerId
          )
      );
    }, [
      farmers,
      selectedFarmerId,
    ]);

  // ==========================================================
  // GENERATE REPORT
  // ==========================================================

  function generateReport() {
    if (!selectedFarmer) {
      setError(
        "Please select a farmer first."
      );

      return;
    }

    setError("");
    setReportGenerated(true);
  }

  // ==========================================================
  // REFRESH
  // ==========================================================

  async function refreshReport() {
    setReportGenerated(false);

    await loadAIReportData();
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="intelligent-reports-page">

        <div className="report-loading">

          <div className="report-loading-icon">
            🤖
          </div>

          <h2>
            Preparing Intelligent Reports...
          </h2>

          <p>
            AgriLedger AI is combining
            financial, risk, recommendation
            and anomaly information.
          </p>

        </div>

      </div>
    );
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (
    error &&
    farmers.length === 0
  ) {
    return (
      <div className="intelligent-reports-page">

        <div className="report-error">

          <div className="report-error-icon">
            ⚠️
          </div>

          <h2>
            Intelligent Reports Unavailable
          </h2>

          <p>
            {error}
          </p>

          <button
            className="report-primary-button"
            onClick={
              loadAIReportData
            }
          >
            Try Again
          </button>

        </div>

      </div>
    );
  }

  // ==========================================================
  // MAIN PAGE
  // ==========================================================

  return (
    <div className="intelligent-reports-page">

      {/* ====================================================
          HEADER
      ==================================================== */}

      <div className="intelligent-reports-header">

        <div>

          <span className="report-eyebrow">
            AI INTELLIGENCE
          </span>

          <h1>
            Intelligent Reports
          </h1>

          <p>
            Convert AgriLedger data into
            a clear, understandable farmer
            intelligence report.
          </p>

        </div>

        <div className="report-header-icon">
          📊
        </div>

      </div>


      {/* ====================================================
          SELECT FARMER
      ==================================================== */}

      <div className="report-selection-card">

        <div className="selection-heading">

          <div className="selection-icon">
            👨‍🌾
          </div>

          <div>

            <h2>
              Generate Farmer Report
            </h2>

            <p>
              Select a farmer to generate
              a consolidated AI report.
            </p>

          </div>

        </div>

        <div className="selection-controls">

          <div className="report-select-wrapper">

            <label htmlFor="farmer-select">
              Farmer
            </label>

            <select
              id="farmer-select"
              value={selectedFarmerId}
              onChange={(event) => {
                setSelectedFarmerId(
                  event.target.value
                );

                setReportGenerated(
                  false
                );

                setError("");
              }}
            >

              <option value="">
                Select a farmer
              </option>

              {farmers.map(
                (farmer) => (
                  <option
                    key={
                      farmer.farmer_id
                    }
                    value={
                      farmer.farmer_id
                    }
                  >
                    {
                      farmer.farmer_name
                    }{" "}
                    —{" "}
                    {
                      farmer.farmer_code
                    }
                  </option>
                )
              )}

            </select>

          </div>

          <button
            className="report-primary-button"
            onClick={
              generateReport
            }
            disabled={
              !selectedFarmer
            }
          >
            🤖 Generate Intelligent Report
          </button>

          <button
            className="report-secondary-button"
            onClick={
              refreshReport
            }
          >
            ↻ Refresh
          </button>

        </div>

      </div>


      {/* ====================================================
          SMALL ERROR
      ==================================================== */}

      {error && (
        <div className="report-inline-error">
          ⚠️ {error}
        </div>
      )}


      {/* ====================================================
          EMPTY
      ==================================================== */}

      {!reportGenerated && (
        <div className="report-empty-state">

          <div className="report-empty-icon">
            📋
          </div>

          <h2>
            Your Intelligent Report Is Ready
          </h2>

          <p>
            Select a farmer and click
            <strong>
              {" "}
              Generate Intelligent Report
            </strong>
            {" "}
            to combine the available
            AgriLedger AI analysis.
          </p>

        </div>
      )}


      {/* ====================================================
          REPORT
      ==================================================== */}

      {reportGenerated &&
        selectedFarmer && (

          <div className="generated-report">

            {/* ==================================================
              REPORT TITLE
          ================================================== */}

            <div className="report-title-card">

              <div>

                <span className="report-eyebrow">
                  AGRILEDGER AI REPORT
                </span>

                <h2>
                  {selectedFarmer.farmer_name}
                </h2>

                <p>
                  Farmer Code:{" "}
                  <strong>
                    {
                      selectedFarmer.farmer_code
                    }
                  </strong>
                </p>

              </div>

              <div className="report-status">
                AI ANALYSIS
              </div>

            </div>


            {/* ==================================================
              EXECUTIVE SUMMARY
          ================================================== */}

            <section className="report-section">

              <div className="section-heading">

                <div className="section-icon">
                  🧠
                </div>

                <div>

                  <span>
                    EXECUTIVE SUMMARY
                  </span>

                  <h2>
                    AI Overview
                  </h2>

                </div>

              </div>

              <div className="executive-summary">

                <p>
                  <strong>
                    {
                      selectedFarmer.farmer_name
                    }
                  </strong>{" "}
                  currently has recorded
                  gross sales of{" "}
                  <strong>
                    {formatCurrency(
                      selectedFarmer
                        .financial_summary
                        .gross_sales
                    )}
                  </strong>
                  {" "}and net sales of{" "}
                  <strong>
                    {formatCurrency(
                      selectedFarmer
                        .financial_summary
                        .net_sales
                    )}
                  </strong>
                  .
                </p>

                <p>
                  The current estimated
                  realization is{" "}
                  <strong>
                    {formatCurrency(
                      selectedFarmer
                        .financial_summary
                        .estimated_realization
                    )}
                  </strong>
                  .
                </p>

                <p>
                  Recorded outstanding
                  input credit, labour credit
                  and interest total{" "}
                  <strong>
                    {formatCurrency(
                      getOutstandingAmount(
                        selectedFarmer
                      )
                    )}
                  </strong>
                  .
                </p>

                {selectedFarmer.risk_analysis && (
                  <p>
                    Financial risk is currently
                    classified as{" "}
                    <strong>
                      {
                        selectedFarmer
                          .risk_analysis
                          .risk_level
                      }
                    </strong>
                    {" "}with a risk score of{" "}
                    <strong>
                      {
                        selectedFarmer
                          .risk_analysis
                          .risk_score
                      }
                      /100
                    </strong>
                    .
                  </p>
                )}

              </div>

            </section>


            {/* ==================================================
              FINANCIAL PERFORMANCE
          ================================================== */}

            <section className="report-section">

              <div className="section-heading">

                <div className="section-icon">
                  💰
                </div>

                <div>

                  <span>
                    FINANCIAL PERFORMANCE
                  </span>

                  <h2>
                    Financial Summary
                  </h2>

                </div>

              </div>

              <div className="financial-report-grid">

                <div className="financial-report-card">
                  <span>
                    Gross Sales
                  </span>

                  <strong>
                    {formatCurrency(
                      selectedFarmer
                        .financial_summary
                        .gross_sales
                    )}
                  </strong>
                </div>

                <div className="financial-report-card">
                  <span>
                    Sales Deductions
                  </span>

                  <strong>
                    {formatCurrency(
                      selectedFarmer
                        .financial_summary
                        .sales_deductions
                    )}
                  </strong>
                </div>

                <div className="financial-report-card">
                  <span>
                    Net Sales
                  </span>

                  <strong>
                    {formatCurrency(
                      selectedFarmer
                        .financial_summary
                        .net_sales
                    )}
                  </strong>
                </div>

                <div className="financial-report-card">
                  <span>
                    Input Credit
                  </span>

                  <strong>
                    {formatCurrency(
                      selectedFarmer
                        .financial_summary
                        .input_credit
                    )}
                  </strong>
                </div>

                <div className="financial-report-card">
                  <span>
                    Labour Credit
                  </span>

                  <strong>
                    {formatCurrency(
                      selectedFarmer
                        .financial_summary
                        .labour_credit
                    )}
                  </strong>
                </div>

                <div className="financial-report-card">
                  <span>
                    Transport Cost
                  </span>

                  <strong>
                    {formatCurrency(
                      selectedFarmer
                        .financial_summary
                        .transport_cost
                    )}
                  </strong>
                </div>

                <div className="financial-report-card">
                  <span>
                    Interest
                  </span>

                  <strong>
                    {formatCurrency(
                      selectedFarmer
                        .financial_summary
                        .interest
                    )}
                  </strong>
                </div>

                <div className="financial-report-card highlight-card">
                  <span>
                    Estimated Realization
                  </span>

                  <strong>
                    {formatCurrency(
                      selectedFarmer
                        .financial_summary
                        .estimated_realization
                    )}
                  </strong>
                </div>

              </div>

            </section>


            {/* ==================================================
              FINANCIAL INTERPRETATION
          ================================================== */}

            <section className="report-section">

              <div className="section-heading">

                <div className="section-icon">
                  📖
                </div>

                <div>

                  <span>
                    AI INTERPRETATION
                  </span>

                  <h2>
                    What the Numbers Mean
                  </h2>

                </div>

              </div>

              <div className="interpretation-list">

                <div className="interpretation-item">

                  <span>
                    💵
                  </span>

                  <div>

                    <strong>
                      Sales Position
                    </strong>

                    <p>
                      Recorded gross sales are{" "}
                      <strong>
                        {formatCurrency(
                          selectedFarmer
                            .financial_summary
                            .gross_sales
                        )}
                      </strong>
                      , while sales deductions
                      account for{" "}
                      <strong>
                        {formatCurrency(
                          selectedFarmer
                            .financial_summary
                            .sales_deductions
                        )}
                      </strong>
                      .
                    </p>

                  </div>

                </div>


                <div className="interpretation-item">

                  <span>
                    📉
                  </span>

                  <div>

                    <strong>
                      Expense Position
                    </strong>

                    <p>
                      Recorded total expenses
                      are{" "}
                      <strong>
                        {formatCurrency(
                          selectedFarmer
                            .financial_summary
                            .total_expenses
                        )}
                      </strong>
                      .
                    </p>

                  </div>

                </div>


                <div className="interpretation-item">

                  <span>
                    💳
                  </span>

                  <div>

                    <strong>
                      Outstanding Position
                    </strong>

                    <p>
                      Input credit, labour credit
                      and interest currently total{" "}
                      <strong>
                        {formatCurrency(
                          getOutstandingAmount(
                            selectedFarmer
                          )
                        )}
                      </strong>
                      .
                    </p>

                  </div>

                </div>


                <div className="interpretation-item">

                  <span>
                    📈
                  </span>

                  <div>

                    <strong>
                      Realization
                    </strong>

                    <p>
                      The current estimated
                      realization is{" "}
                      <strong>
                        {formatCurrency(
                          selectedFarmer
                            .financial_summary
                            .estimated_realization
                        )}
                      </strong>
                      .
                    </p>

                  </div>

                </div>

              </div>

            </section>


            {/* ==================================================
              RISK
          ================================================== */}

            <section className="report-section">

              <div className="section-heading">

                <div className="section-icon">
                  🛡️
                </div>

                <div>

                  <span>
                    FINANCIAL RISK
                  </span>

                  <h2>
                    Risk Assessment
                  </h2>

                </div>

              </div>

              {selectedFarmer.risk_analysis ? (

                <div className="risk-report-card">

                  <div className="risk-top">

                    <div>

                      <span>
                        Financial Health
                      </span>

                      <strong>
                        {
                          selectedFarmer
                            .risk_analysis
                            .financial_health
                        }
                      </strong>

                    </div>

                    <div
                      className={`risk-level-badge ${getRiskClass(
                        selectedFarmer
                          .risk_analysis
                          .risk_level
                      )}`}
                    >
                      {
                        selectedFarmer
                          .risk_analysis
                          .risk_level
                      }
                    </div>

                  </div>

                  <div className="risk-score">

                    <div>

                      <span>
                        Risk Score
                      </span>

                      <strong>
                        {
                          selectedFarmer
                            .risk_analysis
                            .risk_score
                        }
                        <small>
                          /100
                        </small>
                      </strong>

                    </div>

                    <div className="risk-progress">

                      <div
                        className="risk-progress-fill"
                        style={{
                          width: `${Math.min(
                            Math.max(
                              selectedFarmer
                                .risk_analysis
                                .risk_score,
                              0
                            ),
                            100
                          )}%`,
                        }}
                      />

                    </div>

                  </div>

                  {selectedFarmer
                    .risk_analysis
                    .risk_reasons
                    .length > 0 && (

                      <div className="risk-reasons">

                        <strong>
                          Risk observations
                        </strong>

                        <ul>

                          {selectedFarmer
                            .risk_analysis
                            .risk_reasons
                            .map(
                              (
                                reason,
                                index
                              ) => (

                                <li
                                  key={index}
                                >
                                  {reason}
                                </li>

                              )
                            )}

                        </ul>

                      </div>

                    )}

                </div>

              ) : (

                <div className="no-data-card">
                  Risk analysis is not
                  currently available.
                </div>

              )}

            </section>


            {/* ==================================================
              RECOMMENDATIONS
          ================================================== */}

            <section className="report-section">

              <div className="section-heading">

                <div className="section-icon">
                  💡
                </div>

                <div>

                  <span>
                    AI ACTION PLAN
                  </span>

                  <h2>
                    Recommendations
                  </h2>

                </div>

              </div>

              {selectedFarmer.recommendations &&
                selectedFarmer
                  .recommendations
                  .length > 0 ? (

                <div className="recommendation-list">

                  {selectedFarmer
                    .recommendations
                    .map(
                      (
                        recommendation,
                        index
                      ) => (

                        <div
                          className="report-recommendation"
                          key={index}
                        >

                          <div
                            className={`priority-badge ${getPriorityClass(
                              recommendation
                                .priority
                            )}`}
                          >
                            {
                              recommendation
                                .priority
                            }
                          </div>

                          <div>

                            <span className="recommendation-category">
                              {
                                recommendation
                                  .category
                              }
                            </span>

                            <h3>
                              {
                                recommendation
                                  .title
                              }
                            </h3>

                            <p>
                              {
                                recommendation
                                  .message
                              }
                            </p>

                          </div>

                        </div>

                      )
                    )}

                </div>

              ) : (

                <div className="no-data-card">
                  No specific recommendations
                  are currently available.
                </div>

              )}

            </section>


            {/* ==================================================
              ANOMALIES
          ================================================== */}

            <section className="report-section">

              <div className="section-heading">

                <div className="section-icon">
                  🚨
                </div>

                <div>

                  <span>
                    TRANSACTION REVIEW
                  </span>

                  <h2>
                    Anomaly Summary
                  </h2>

                </div>

              </div>

              <div className="anomaly-summary">

                <div className="anomaly-count-card">

                  <span>
                    Anomalies Detected
                  </span>

                  <strong>
                    {
                      selectedFarmer
                        .anomaly_count || 0
                    }
                  </strong>

                </div>

                <div className="anomaly-review-card">

                  <span>
                    Review Status
                  </span>

                  <strong>
                    {
                      (
                        selectedFarmer
                          .anomaly_count || 0
                      ) > 0
                        ? "REVIEW REQUIRED"
                        : "NO REVIEW REQUIRED"
                    }
                  </strong>

                </div>

              </div>


              {selectedFarmer.anomalies &&
                selectedFarmer
                  .anomalies
                  .length > 0 ? (

                <div className="anomaly-list">

                  {selectedFarmer
                    .anomalies
                    .map(
                      (
                        anomaly,
                        index
                      ) => (

                        <div
                          className="report-anomaly"
                          key={index}
                        >

                          <div
                            className={`severity-badge ${getSeverityClass(
                              anomaly
                                .severity
                            )}`}
                          >
                            {
                              anomaly
                                .severity
                            }
                          </div>

                          <div>

                            <h3>
                              {
                                anomaly
                                  .transaction_type
                              }
                            </h3>

                            <p>
                              {
                                anomaly
                                  .reason
                              }
                            </p>

                            <small>
                              Detection method:{" "}
                              {
                                anomaly
                                  .detection_method
                              }
                            </small>

                          </div>

                        </div>

                      )
                    )}

                </div>

              ) : (

                <div className="no-anomaly-card">

                  <span>
                    ✓
                  </span>

                  <div>

                    <strong>
                      No anomalies currently
                      flagged
                    </strong>

                    <p>
                      The anomaly detection
                      service has not identified
                      transactions requiring
                      review for this farmer.
                    </p>

                  </div>

                </div>

              )}

            </section>


            {/* ==================================================
              FINAL AI CONCLUSION
          ================================================== */}

            <section className="final-conclusion">

              <div className="final-conclusion-icon">
                🤖
              </div>

              <div>

                <span>
                  AGRILEDGER AI CONCLUSION
                </span>

                <h2>
                  Management Summary
                </h2>

                <p>
                  Based on the currently recorded
                  AgriLedger data,{" "}
                  <strong>
                    {
                      selectedFarmer
                        .farmer_name
                    }
                  </strong>{" "}
                  has an estimated realization
                  of{" "}
                  <strong>
                    {formatCurrency(
                      selectedFarmer
                        .financial_summary
                        .estimated_realization
                    )}
                  </strong>
                  {" "}and recorded outstanding
                  input credit, labour credit and
                  interest of{" "}
                  <strong>
                    {formatCurrency(
                      getOutstandingAmount(
                        selectedFarmer
                      )
                    )}
                  </strong>
                  .
                </p>

                {selectedFarmer.risk_analysis && (
                  <p>
                    Financial health is currently
                    classified as{" "}
                    <strong>
                      {
                        selectedFarmer
                          .risk_analysis
                          .financial_health
                      }
                    </strong>
                    {" "}with a{" "}
                    <strong>
                      {
                        selectedFarmer
                          .risk_analysis
                          .risk_level
                      }
                    </strong>{" "}
                    risk level.
                  </p>
                )}

                <p className="conclusion-note">
                  This report summarizes recorded
                  AgriLedger transactions and
                  AI service outputs. It should be
                  used as decision support and
                  reviewed alongside the underlying
                  records.
                </p>

              </div>

            </section>

          </div>
        )}

    </div>
  );
}

export default IntelligentReports;