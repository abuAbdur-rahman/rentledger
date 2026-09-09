export type PaymentStatus = "paid" | "pending" | "overdue" | "rejected"

export interface TenantRentInfo {
  tenancyId: string
  unitLabel: string
  propertyName: string
  propertyAddress: string
  rentAmount: number
  nextDueDate: string
  daysUntilDue: number
  currentPaymentStatus: PaymentStatus
  currentPaymentId: string | null
}

export interface TenantPayment {
  id: string
  amount: number
  status: PaymentStatus
  dueDate: string
  paidAt: string | null
  reference: string | null
  proofUrl: string | null
  rejectionReason: string | null
}

export interface TenantTenancyItem {
  id: string
  status: "pending" | "active" | "rejected" | "terminated"
  startDate: string | null
  unitLabel: string
  propertyName: string
  propertyAddress: string
  rentAmount: number
}

export interface TenantDashboardResponse {
  hasActiveTenancy: boolean
  rentInfo: TenantRentInfo | null
  recentPayments: TenantPayment[]
  tenancies: TenantTenancyItem[]
}

export interface TenantHistoryResponse {
  hasTenancy: boolean
  payments: TenantPayment[]
  total: number
  page: number
  limit: number
}
