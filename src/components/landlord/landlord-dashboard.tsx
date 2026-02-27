"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { RecentPayments } from "@/components/dashboard/recent-payments"
import { QuickActions } from "@/components/dashboard/quick-actions"
import type { DashboardSummary } from "@/services/dashboard"

export function LandlordDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const token = typeof window !== "undefined" 
          ? sessionStorage.getItem("rl_access_token")
          : null
        const { data } = await axios.get("/api/dashboard/summary", {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        setSummary(data.summary)
      } catch (err) {
        console.error("Failed to fetch dashboard summary:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [])

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back! Here&apos;s your property overview.
          </p>
        </div>
        <QuickActions />
      </div>

      {/* Summary Cards */}
      <SummaryCards summary={summary} loading={loading} />

      {/* Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentPayments payments={summary?.recentPayments ?? null} loading={loading} />
      </div>
    </div>
  )
}
