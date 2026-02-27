"use client";
import { useState, useEffect, useCallback } from "react";
import axios, { AxiosError } from "axios";
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  MoreVertical,
  CreditCard,
  RefreshCw,
  Download,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TopBar } from "@/components/dashboard/top-bar";
import { PageHeader } from "@/components/dashboard/page-header";
import { RejectDialog } from "@/components/payments/reject-dialog";
import { useSessionUser } from "@/components/auth/auth-context";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Pagination } from "@/components/ui/pagination";
import { exportToCSV, exportToPDF } from "@/lib/export";

type TabValue = "all" | "pending" | "verified" | "rejected";

interface PaymentRow {
  id: string;
  tenantName: string;
  tenantInitials: string;
  unitLabel: string;
  propertyName: string;
  amount: number;
  status: "paid" | "pending" | "overdue" | "rejected";
  dueDate: string;
  paidAt: string | null;
  reference: string | null;
  proofUrl: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusCfg = {
  paid: {
    label: "Verified",
    cls: "bg-green-100 text-green-700 border-green-200",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  pending: {
    label: "Pending",
    cls: "bg-amber-100 text-amber-700 border-amber-200",
    icon: <Clock className="w-3 h-3" />,
  },
  overdue: {
    label: "Overdue",
    cls: "bg-red-100 text-red-700 border-red-200",
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  rejected: {
    label: "Rejected",
    cls: "bg-gray-100 text-gray-500 border-gray-200",
    icon: <XCircle className="w-3 h-3" />,
  },
};

const avatarColors = [
  "from-blue-400 to-blue-600",
  "from-violet-400 to-violet-600",
  "from-green-400 to-green-600",
  "from-amber-400 to-amber-600",
  "from-pink-400 to-pink-600",
];

function PaymentRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50 last:border-0">
      <Skeleton className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="flex flex-col items-end gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
    </div>
  );
}

export default function PaymentsPage() {
  const user = useSessionUser();
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv");

  const fetchPayments = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await axios.get(
          `/api/payments?status=${activeTab}&page=${page}&limit=10`,
        );
        setPayments(data.payments ?? []);
        setPagination(
          data.pagination ?? { page, limit: 10, total: 0, totalPages: 0 },
        );
      } catch (err) {
        const e = err as AxiosError<{ error: string }>;
        setError(e.response?.data?.error ?? "Failed to load payments.");
      } finally {
        setLoading(false);
      }
    },
    [activeTab],
  );

  useEffect(() => {
    fetchPayments(1);
  }, [fetchPayments]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchPayments(newPage);
    }
  };

  async function handleVerify(paymentId: string) {
    setVerifying(paymentId);
    try {
      await axios.patch(`/api/payments/${paymentId}`, { action: "verify" });
      fetchPayments();
    } catch {
      setError("Failed to verify payment.");
    } finally {
      setVerifying(null);
    }
  }

  const handleExport = () => {
    if (payments.length === 0) return;
    if (exportFormat === "csv") {
      exportToCSV(payments, `payments_${activeTab}`);
    } else {
      exportToPDF(payments, `payments_${activeTab}`);
    }
  };

  const headerUser = { name: user.name, email: user.email, role: user.role };

  return (
    <>
      <TopBar title="Payments" user={headerUser} />
      <div className="px-4 py-4 lg:px-8 lg:py-8 max-w-[900px] mx-auto w-full">
        <PageHeader
          title="Payments"
          subtitle="Track and manage all rent payments"
          user={headerUser}
        />

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabValue)}
          className="mb-6"
        >
          <TabsList className="bg-gray-100 p-1 rounded-[10px] h-auto gap-1">
            {[
              { value: "all", label: "All" },
              {
                value: "pending",
                label: "Pending",
                count:
                  payments.filter((p) => p.status === "pending").length ||
                  undefined,
              },
              { value: "verified", label: "Verified" },
              { value: "rejected", label: "Rejected" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-xl text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm px-4 py-2 min-h-[36px] gap-1.5"
              >
                {tab.label}
                {tab.count ? (
                  <span className="bg-blue-500 text-white text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Error */}
        {!loading && error && (
          <div className="space-y-4">
            <Alert
              variant="destructive"
              className="border-red-200 bg-red-50 rounded-2xl"
            >
              <AlertTitle className="font-semibold">Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button
              onClick={() => fetchPayments(pagination.page)}
              variant="outline"
              className="rounded-xl gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
          </div>
        )}

        {/* Payments Card */}
        <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <CardHeader className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black tracking-[-0.02em] text-gray-900">
                  {activeTab === "all"
                    ? "All Payments"
                    : activeTab === "pending"
                      ? "Pending Review"
                      : activeTab === "verified"
                        ? "Verified Payments"
                        : "Rejected Payments"}
                </h2>
                {!loading && (
                  <p className="text-xs text-gray-400 mt-0.5 font-[Roboto,sans-serif]">
                    {payments.length} record{payments.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={exportFormat}
                  onValueChange={(v) => setExportFormat(v as "csv" | "pdf")}
                >
                  <SelectTrigger className="w-[100px] h-9 rounded-xl text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={payments.length === 0}
                  className="h-9 rounded-xl gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Loading */}
            {loading && (
              <div className="divide-y divide-gray-50">
                {Array.from({ length: 5 }).map((_, i) => (
                  <PaymentRowSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Empty per tab */}
            {!loading && !error && payments.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <CreditCard className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  No {activeTab === "all" ? "" : activeTab} payments
                </p>
                <p className="text-xs text-gray-400 font-[Roboto,sans-serif]">
                  Payments will appear here once tenants submit proof.
                </p>
              </div>
            )}

            {/* Payment rows */}
            {!loading && !error && payments.length > 0 && (
              <div className="divide-y divide-gray-50">
                {payments.map((payment, i) => {
                  const cfg = statusCfg[payment.status] ?? statusCfg.pending;
                  const isVerifying = verifying === payment.id;
                  const canAct =
                    payment.status === "pending" ||
                    payment.status === "overdue";
                  return (
                    <div
                      key={payment.id}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors cursor-pointer"
                      onClick={() => setSelectedPayment(payment)}
                    >
                      {/* Avatar */}
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColors[i % avatarColors.length]} flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm`}
                      >
                        {payment.tenantInitials}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                          {payment.tenantName}
                        </p>
                        <p className="text-xs text-gray-400 font-[Roboto,sans-serif] mt-0.5 truncate">
                          {formatDate(payment.dueDate)} · {payment.unitLabel}
                        </p>
                      </div>
                      {/* Amount + status */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0 mr-1">
                        <p className="text-sm font-bold text-gray-900 tracking-[-0.01em]">
                          {formatCurrency(payment.amount)}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.625rem] font-bold border uppercase tracking-[0.05em] ${cfg.cls}`}
                        >
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </div>
                      {/* Action menu */}
                      {canAct && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-xl hover:bg-gray-100 shrink-0"
                              disabled={isVerifying}
                            >
                              <MoreVertical className="w-4 h-4 text-gray-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-40 rounded-2xl p-1.5"
                          >
                            <DropdownMenuItem
                              onClick={() => handleVerify(payment.id)}
                              disabled={isVerifying}
                              className="gap-2 rounded-xl cursor-pointer text-green-700 focus:bg-green-50 focus:text-green-700"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span className="text-sm font-semibold">
                                {isVerifying ? "Verifying..." : "Verify"}
                              </span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-gray-100 my-1" />
                            <DropdownMenuItem
                              onClick={() =>
                                setRejectTarget({
                                  id: payment.id,
                                  name: payment.tenantName,
                                })
                              }
                              className="gap-2 rounded-xl cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600"
                            >
                              <XCircle className="w-4 h-4" />
                              <span className="text-sm font-semibold">
                                Reject
                              </span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {!loading && !error && payments.length > 0 && (
          <Pagination
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      <RejectDialog
        paymentId={rejectTarget?.id ?? null}
        tenantName={rejectTarget?.name ?? ""}
        open={!!rejectTarget}
        onOpenChange={(v) => {
          if (!v) setRejectTarget(null);
        }}
        onSuccess={() => fetchPayments(pagination.page)}
      />

      <Sheet open={!!selectedPayment} onOpenChange={(v) => !v && setSelectedPayment(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {selectedPayment && (
            <>
              <SheetHeader>
                <SheetTitle>Payment Details</SheetTitle>
                <SheetDescription>
                  Full payment information and proof
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarColors[payments.indexOf(selectedPayment) % avatarColors.length]} flex items-center justify-center text-white text-sm font-bold shadow-sm`}
                    >
                      {selectedPayment.tenantInitials}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{selectedPayment.tenantName}</p>
                      <p className="text-sm text-gray-500">{selectedPayment.propertyName}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Amount</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedPayment.amount)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusCfg[selectedPayment.status]?.cls}`}
                    >
                      {statusCfg[selectedPayment.status]?.icon}
                      {statusCfg[selectedPayment.status]?.label}
                    </span>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Due Date</p>
                    <p className="text-sm font-semibold text-gray-900">{formatDate(selectedPayment.dueDate)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Paid On</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedPayment.paidAt ? formatDate(selectedPayment.paidAt) : "—"}
                    </p>
                  </div>
                </div>

                {selectedPayment.reference && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Reference</p>
                    <p className="text-sm font-mono text-gray-900">{selectedPayment.reference}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Payment Proof</p>
                  {selectedPayment.proofUrl ? (
                    <div className="rounded-xl border border-gray-200 overflow-hidden">
                      <img
                        src={selectedPayment.proofUrl}
                        alt="Payment proof"
                        className="w-full h-auto max-h-[300px] object-contain bg-gray-50"
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-gray-200 p-8 text-center">
                      <p className="text-sm text-gray-400">No payment proof submitted</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
