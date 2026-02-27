import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface PaymentRow {
  id: string
  tenantName: string
  tenantInitials: string
  unitLabel: string
  propertyName: string
  amount: number
  status: "paid" | "pending" | "overdue" | "rejected"
  dueDate: string
  paidAt: string | null
  reference: string | null
  proofUrl: string | null
}

export function exportToCSV(payments: PaymentRow[], filename: string = "payments") {
  const headers = ["Tenant", "Property", "Unit", "Amount", "Status", "Due Date", "Paid At", "Reference"]
  const rows = payments.map((p) => [
    p.tenantName,
    p.propertyName,
    p.unitLabel,
    p.amount.toFixed(2),
    p.status,
    p.dueDate,
    p.paidAt || "",
    p.reference || "",
  ])

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function exportToPDF(payments: PaymentRow[], filename: string = "payments") {
  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.text("Payment Report", 14, 22)

  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30)
  doc.text(`Total Records: ${payments.length}`, 14, 36)

  const statusLabels: Record<string, string> = {
    paid: "Verified",
    pending: "Pending",
    overdue: "Overdue",
    rejected: "Rejected",
  }

  const tableData = payments.map((p) => [
    p.tenantName,
    p.propertyName,
    p.unitLabel,
    `₦${p.amount.toFixed(2)}`,
    statusLabels[p.status] || p.status,
    p.dueDate,
    p.paidAt || "-",
  ])

  autoTable(doc, {
    startY: 42,
    head: [["Tenant", "Property", "Unit", "Amount", "Status", "Due Date", "Paid At"]],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  })

  doc.save(`${filename}_${new Date().toISOString().split("T")[0]}.pdf`)
}
