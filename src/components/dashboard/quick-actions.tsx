"use client"

import Link from "next/link"
import { Building2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <Link href="/properties">
        <Button className="h-11 px-5 rounded-[10px] bg-blue-500 hover:bg-blue-600 text-white font-semibold gap-2 hover:shadow-lg hover:shadow-blue-200 transition-all">
          <Building2 className="w-4 h-4" />
          Add Property
        </Button>
      </Link>
      <Link href="/tenants">
        <Button variant="outline" className="h-11 px-5 rounded-[10px] border-2 border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold gap-2">
          <Users className="w-4 h-4" />
          Add Tenant
        </Button>
      </Link>
    </div>
  )
}
