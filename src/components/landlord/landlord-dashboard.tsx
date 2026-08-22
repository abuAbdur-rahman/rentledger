"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import axios from "axios"
import { Building2 } from "lucide-react"
import { SummaryCards } from "@/components/dashboard/summary-cards"
import { RecentPayments } from "@/components/dashboard/recent-payments"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { DashboardSummary } from "@/services/dashboard"

interface DashboardPropertyItem {
  id: string
  name: string
  address: string
  unitsCount: number
  activeTenants: number
}

export function LandlordDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [properties, setProperties] = useState<DashboardPropertyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [propertiesLoading, setPropertiesLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = typeof window !== "undefined" 
          ? sessionStorage.getItem("rl_access_token")
          : null

        const [summaryResponse, propertiesResponse] = await Promise.all([
          axios.get("/api/dashboard/summary", {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          }),
          axios.get("/api/properties?page=1&limit=5", {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          }),
        ])

        setSummary(summaryResponse.data.summary)
        setProperties(propertiesResponse.data.properties ?? [])
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err)
      } finally {
        setLoading(false)
        setPropertiesLoading(false)
      }
    }

    fetchDashboardData()
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

      {/* Properties Snapshot */}
      <Card className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-black tracking-[-0.02em] text-gray-900">
              Your Properties
            </h2>
            <Link href="/properties">
              <Button
                variant="outline"
                className="h-8 rounded-xl border-gray-200 text-xs font-semibold"
              >
                Manage Properties
              </Button>
            </Link>
          </div>

          {propertiesLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`prop-loading-${index}`}
                  className="h-14 rounded-xl border border-gray-100 bg-gray-50 animate-pulse"
                />
              ))}
            </div>
          ) : properties.length === 0 ? (
            <div className="text-center py-6">
              <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700">No properties yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Add a property to start tracking units and tenants.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {properties.map((property) => (
                <Link
                  key={property.id}
                  href={`/properties/${property.id}`}
                  className="block rounded-xl border border-gray-100 px-3 py-3 hover:border-blue-200 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {property.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {property.address || "No address provided"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-gray-700">
                        {property.unitsCount} unit{property.unitsCount === 1 ? "" : "s"}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {property.activeTenants} tenant{property.activeTenants === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
