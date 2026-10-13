export interface Field {
  id: number;
  farmerId: number;
  fieldName?: string;
  area?: number;
  soilType?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CropSeason {
  id: number;
  farmerId: number;
  fieldId: number;
  cropName: string;
  season: string;
  year: number;
  sowingDate?: string;
  expectedHarvestDate?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InputPurchase {
  id: number;
  farmerId: number;
  cropSeasonId: number;
  productId: number;
  purchaseDate: string;
  quantity: number;
  unitPrice: number;
  supplierName?: string;
  paymentType: string;
  paidAmount: number;
  notes?: string;
  createdAt?: string;
}

export interface LabourExpense {
  id: number;
  farmerId: number;
  cropSeasonId: number;
  fieldId: number;
  workDate: string;
  workType: string;
  workerCount: number;
  amount: number;
  paymentType: string;
  paidAmount: number;
  notes?: string;
  createdAt?: string;
}

export interface MarketSale {
  id: number;
  farmerId: number;
  cropSeasonId: number;
  saleDate: string;
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  buyerName?: string;
  marketName?: string;
  notes?: string;
  createdAt?: string;
}

export interface SaleDeduction {
  id: number;
  marketSaleId: number;
  deductionType: string;
  amount: number;
  notes?: string;
  createdAt?: string;
}

export interface TransportRecord {
  id: number;
  farmerId: number;
  cropSeasonId: number;
  transportDate: string;
  amount: number;
  paidAmount: number;
  notes?: string;
  createdAt?: string;
}

export interface FarmerPayment {
  id: number;
  farmerId: number;
  settlementId?: number;
  paymentDate: string;
  amount: number;
  paymentMode: "CASH" | "BANK" | "UPI" | "CHEQUE";
  referenceNumber?: string;
  notes?: string;
  createdAt?: string;
}

export interface Settlement {
  id: number;
  farmerId: number;
  cropSeasonId: number;
  settlementDate: string;
  totalCropSales: number;
  totalInputCredit: number;
  totalLabourCredit: number;
  totalTransport: number;
  totalDeductions: number;
  totalInterest: number;
  totalPayments: number;
  finalAmount: number;
  settlementStatus: string;
  notes?: string;
  createdAt?: string;
}

export interface SettlementCalculation {
  cropSeasonId: number;
  farmerId: number;
  finalAmount: number;
  status: string;
  totalCropSales: number;
  totalDeductions: number;
  totalInputCredit: number;
  totalInterest: number;
  totalLabourCredit: number;
  totalPayments: number;
  totalTransport: number;
}

export interface Farmer {
  id: number;
  farmerCode: string;
  name: string;
  phone: string | null;
  villageId: number;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  bankName: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string | null;
  updatedAt: string | null;
}