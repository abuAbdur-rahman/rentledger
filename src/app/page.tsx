import Link from "next/link";
import {
  Home,
  CreditCard,
  Users,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  MapPin,
  Star,
  Building2,
  Bath,
  Bed,
  Square,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { LandingNavWrapper } from "@/components/landing-nav-wrapper";
import { createServerClient } from "@/lib/supabase/server";
import Image from "next/image";

// ─── Types ──────────────────────────────────────────────────────────────────

interface FeatureCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  bullets: string[];
}

interface StepProps {
  num: string;
  title: string;
  description: string;
}

interface Property {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  type: string;
  total_units: number;
  occupied_units: number;
  image_url?: string;
  rating: number;
  review_count: number;
  monthly_rent_min: number;
  monthly_rent_max: number;
  amenities: string[];
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  is_furnished?: boolean;
  pet_friendly?: boolean;
  available_units: number;
  purchase_price?: number;
  is_for_sale?: boolean;
  is_for_rent?: boolean;
}

// ─── Dummy Properties Data ──────────────────────────────────────────────────

const dummyProperties: Property[] = [
  {
    id: "1",
    name: "Sunset Heights Apartments",
    address: "42B Admiralty Way",
    city: "Lekki Phase 1",
    state: "Lagos",
    country: "Nigeria",
    type: "Luxury Apartment",
    total_units: 24,
    occupied_units: 18,
    available_units: 6,
    image_url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=500&auto=format&fit=crop&q=60",
    rating: 4.8,
    review_count: 124,
    monthly_rent_min: 450000,
    monthly_rent_max: 850000,
    purchase_price: 45000000,
    is_for_sale: true,
    is_for_rent: true,
    amenities: ["Swimming Pool", "Gym", "24/7 Security", "Power Backup", "Parking"],
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1200,
    is_furnished: true,
    pet_friendly: true
  },
  {
    id: "2",
    name: "Greenfield Estate",
    address: "15 Road 3",
    city: "Ikeja GRA",
    state: "Lagos",
    country: "Nigeria",
    type: "Terraced Duplex",
    total_units: 12,
    occupied_units: 8,
    available_units: 4,
    image_url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500&auto=format&fit=crop&q=60",
    rating: 4.6,
    review_count: 89,
    monthly_rent_min: 650000,
    monthly_rent_max: 950000,
    purchase_price: 65000000,
    is_for_sale: true,
    is_for_rent: true,
    amenities: ["Garden", "Children's Playground", "Security", "Backup Generator"],
    bedrooms: 3,
    bathrooms: 3,
    sqft: 1800,
    is_furnished: false,
    pet_friendly: true
  },
  {
    id: "3",
    name: "Harbor Point Tower",
    address: "10 Marina Road",
    city: "Victoria Island",
    state: "Lagos",
    country: "Nigeria",
    type: "High-rise Apartment",
    total_units: 48,
    occupied_units: 42,
    available_units: 6,
    image_url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&auto=format&fit=crop&q=60",
    rating: 4.9,
    review_count: 256,
    monthly_rent_min: 750000,
    monthly_rent_max: 2500000,
    purchase_price: 120000000,
    is_for_sale: true,
    is_for_rent: true,
    amenities: ["Infinity Pool", "Spa", "Concierge", "Smart Home", "Ocean View"],
    bedrooms: 1,
    bathrooms: 1,
    sqft: 850,
    is_furnished: true,
    pet_friendly: false
  },
  {
    id: "4",
    name: "Serene Gardens",
    address: "23 Adeola Odeku Street",
    city: "VI",
    state: "Lagos",
    country: "Nigeria",
    type: "Studio Apartments",
    total_units: 36,
    occupied_units: 28,
    available_units: 8,
    image_url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&auto=format&fit=crop&q=60",
    rating: 4.5,
    review_count: 67,
    monthly_rent_min: 320000,
    monthly_rent_max: 450000,
    is_for_sale: false,
    is_for_rent: true,
    amenities: ["WiFi Included", "Maintenance", "Security", "Water Included"],
    bedrooms: 0,
    bathrooms: 1,
    sqft: 450,
    is_furnished: true,
    pet_friendly: true
  },
  {
    id: "5",
    name: "Royal Palm Residences",
    address: "7 Palm Avenue",
    city: "Magodo Phase 2",
    state: "Lagos",
    country: "Nigeria",
    type: "Detached Villa",
    total_units: 8,
    occupied_units: 5,
    available_units: 3,
    image_url: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=500&auto=format&fit=crop&q=60",
    rating: 4.9,
    review_count: 42,
    monthly_rent_min: 1200000,
    monthly_rent_max: 2000000,
    purchase_price: 250000000,
    is_for_sale: true,
    is_for_rent: true,
    amenities: ["Private Pool", "Garden", "Staff Quarters", "CCTV", "Solar Power"],
    bedrooms: 4,
    bathrooms: 4,
    sqft: 3500,
    is_furnished: true,
    pet_friendly: true
  },
  {
    id: "6",
    name: "The Boutique Suites",
    address: "29 Bishop Aboyade Cole Street",
    city: "Victoria Island",
    state: "Lagos",
    country: "Nigeria",
    type: "Serviced Apartment",
    total_units: 18,
    occupied_units: 15,
    available_units: 3,
    image_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&auto=format&fit=crop&q=60",
    rating: 4.7,
    review_count: 156,
    monthly_rent_min: 550000,
    monthly_rent_max: 850000,
    is_for_sale: false,
    is_for_rent: true,
    amenities: ["Housekeeping", "Restaurant", "Gym", "Conference Room", "Laundry"],
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1100,
    is_furnished: true,
    pet_friendly: false
  }
];

// ─── Property Card Component with CTA ───────────────────────────────────────

function PropertyCard({ property }: { property: Property }) {
  const occupancyRate = Math.round((property.occupied_units / property.total_units) * 100);
  const availableUnits = property.available_units;

  const amenityIcons: Record<string, string> = {
    "Swimming Pool": "🏊",
    "Gym": "💪",
    "24/7 Security": "🔒",
    "Power Backup": "⚡",
    "Parking": "🅿️",
    "Garden": "🌳",
    "WiFi Included": "📶",
    "Maintenance": "🔧",
    "Water Included": "💧",
  };

  return (
    <Card className="overflow-hidden border border-gray-200 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-200 bg-white group">
      {/* Image Section */}
      <div className="relative h-48 w-full bg-gray-100">
        {property.image_url ? (
          <Image
            src={property.image_url}
            alt={property.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-blue-500 to-violet-500">
            <Home className="w-12 h-12 text-white opacity-50" />
          </div>
        )}
        
        {/* Property Type Badge */}
        <Badge className="absolute top-3 left-3 bg-white/90 text-gray-700 border-0 backdrop-blur-sm">
          {property.type}
        </Badge>
        
        {/* Rating Badge */}
        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1 text-sm">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span className="font-medium text-gray-700">{property.rating}</span>
          <span className="text-gray-400 text-xs">({property.review_count})</span>
        </div>

        {/* Save Button */}
        <button className="absolute bottom-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors">
          <Heart className="w-4 h-4 text-gray-600 hover:text-red-500 transition-colors" />
        </button>
      </div>

      <CardContent className="p-5">
        {/* Property Name */}
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
          {property.name}
        </h3>
        
        {/* Location */}
        <div className="flex items-start gap-2 mb-3">
          <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-500 line-clamp-2">
            {property.address}, {property.city}, {property.state}
          </p>
        </div>

        {/* Quick Specs */}
        {(property.bedrooms !== undefined || property.bathrooms !== undefined || property.sqft) && (
          <div className="flex items-center gap-3 mb-3 text-sm text-gray-600">
            {property.bedrooms !== undefined && (
              <div className="flex items-center gap-1">
                <Bed className="w-4 h-4" />
                <span>{property.bedrooms === 0 ? 'Studio' : property.bedrooms} {property.bedrooms === 1 ? 'Bed' : 'Beds'}</span>
              </div>
            )}
            {property.bathrooms !== undefined && (
              <div className="flex items-center gap-1">
                <Bath className="w-4 h-4" />
                <span>{property.bathrooms} {property.bathrooms === 1 ? 'Bath' : 'Baths'}</span>
              </div>
            )}
            {property.sqft && (
              <div className="flex items-center gap-1">
                <Square className="w-4 h-4" />
                <span>{property.sqft} sqft</span>
              </div>
            )}
          </div>
        )}

        {/* Amenities Preview */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {property.amenities.slice(0, 4).map((amenity) => (
            <Badge key={amenity} variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs">
              {amenityIcons[amenity] || "•"} {amenity}
            </Badge>
          ))}
        </div>

        {/* Tags */}
        <div className="flex gap-2 mb-3">
          {property.pet_friendly && (
            <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
              🐾 Pet Friendly
            </span>
          )}
          {property.is_furnished && (
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
              🛋️ Furnished
            </span>
          )}
        </div>

        {/* Availability */}
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Occupancy</span>
            <span>{property.occupied_units}/{property.total_units} units</span>
          </div>
          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
        </div>
      </CardContent>

      <CardFooter className="px-5 py-4 border-t border-gray-100 flex flex-col gap-3">
        {/* Price Section */}
        <div className="flex items-center justify-between w-full">
          {property.is_for_rent && (
            <div>
              <p className="text-xs text-gray-500">Monthly Rent</p>
              <p className="text-lg font-bold text-gray-900">
                ₦{property.monthly_rent_min.toLocaleString()}
                {property.monthly_rent_max > property.monthly_rent_min && (
                  <span className="text-sm font-normal text-gray-400">
                    {" "} - ₦{property.monthly_rent_max.toLocaleString()}
                  </span>
                )}
              </p>
            </div>
          )}
          
          {property.is_for_sale && property.purchase_price && (
            <div className={property.is_for_rent ? "text-right" : ""}>
              <p className="text-xs text-gray-500">Purchase Price</p>
              <p className="text-lg font-bold text-gray-900">
                ₦{property.purchase_price.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-2 w-full">
          {property.is_for_rent && availableUnits > 0 && (
            <Link href={`/properties/${property.id}/rent`} className="flex-1">
              <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white gap-2">
                <Home className="w-4 h-4" />
                Rent Now
                {availableUnits > 0 && (
                  <Badge className="ml-1 bg-white/20 text-white border-0">
                    {availableUnits} available
                  </Badge>
                )}
              </Button>
            </Link>
          )}
          
          {property.is_for_sale && (
            <Link href={`/properties/${property.id}/purchase`} className="flex-1">
              <Button 
                variant={property.is_for_rent ? "outline" : "default"}
                className={`w-full gap-2 ${
                  property.is_for_rent 
                    ? "border-blue-500 text-blue-600 hover:bg-blue-50" 
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                <Building2 className="w-4 h-4" />
                Buy Now
              </Button>
            </Link>
          )}
        </div>

        {/* View Details Link */}
        <Link 
          href={`/properties/${property.id}`} 
          className="text-xs text-center text-gray-400 hover:text-blue-500 transition-colors mt-1"
        >
          View full details →
        </Link>
      </CardFooter>
    </Card>
  );
}

// ─── Properties Section ─────────────────────────────────────────────────────

function parseCityState(address: string) {
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      city: parts[parts.length - 2],
      state: parts[parts.length - 1],
    };
  }

  if (parts.length === 1) {
    return {
      city: parts[0],
      state: "Nigeria",
    };
  }

  return {
    city: "Unknown",
    state: "Nigeria",
  };
}

async function getFeaturedProperties(): Promise<Property[]> {
  try {
    const supabase = await createServerClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = (await supabase
      .from("properties")
      .select(
        `
        id,
        name,
        address,
        units (
          id,
          rent_amount,
          tenancies ( id, status )
        )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(6)) as any;

    if (error || !data || data.length === 0) {
      return dummyProperties.slice(0, 6);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((property: any) => {
      const address = property.address ?? "";
      const { city, state } = parseCityState(address);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const units = (property.units ?? []) as any[];
      const totalUnits = units.length;
      const occupiedUnits = units.filter((unit) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (unit.tenancies ?? []).some((tenancy: any) => tenancy.status === "active"),
      ).length;
      const availableUnits = Math.max(totalUnits - occupiedUnits, 0);

      const rentValues = units
        .map((unit) => Number(unit.rent_amount) || 0)
        .filter((amount) => amount > 0);

      const minRent = rentValues.length > 0 ? Math.min(...rentValues) : 0;
      const maxRent = rentValues.length > 0 ? Math.max(...rentValues) : minRent;

      return {
        id: property.id,
        name: property.name,
        address,
        city,
        state,
        country: "Nigeria",
        type: totalUnits > 1 ? "Apartment" : "Single Unit",
        total_units: totalUnits,
        occupied_units: occupiedUnits,
        image_url: undefined,
        rating: 4.7,
        review_count: Math.max(totalUnits * 3, 6),
        monthly_rent_min: minRent,
        monthly_rent_max: maxRent,
        amenities: ["RentLedger Verified", "Secure Payments"],
        bedrooms: undefined,
        bathrooms: undefined,
        sqft: undefined,
        is_furnished: undefined,
        pet_friendly: undefined,
        available_units: availableUnits,
        purchase_price: undefined,
        is_for_sale: false,
        is_for_rent: true,
      } satisfies Property;
    });
  } catch {
    return dummyProperties.slice(0, 6);
  }
}

async function PropertiesSection() {
  const featuredProperties = await getFeaturedProperties();

  return (
    <section className="px-6 py-20 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-blue-500 mb-3">
            Featured Properties
          </p>
          <h2 className="text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold tracking-tight text-gray-900 mb-4">
            Premium Rentals Managed with RentLedger
          </h2>
          <p className="text-[1.0625rem] text-gray-500 max-w-145 mx-auto leading-[1.7]">
            Discover hand-picked properties from landlords who trust RentLedger for transparent, hassle-free rent management
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredProperties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/properties-overview">
            <Button
              size="lg"
              className="h-13 px-8 text-base font-semibold rounded-[10px] bg-blue-500 hover:bg-blue-600 text-white gap-2 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-200 transition-all duration-150"
            >
              Browse All Properties
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <p className="text-sm text-gray-400 mt-4">
            Over 150+ properties currently using RentLedger
          </p>
        </div>

        {/* Quick Stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">₦2.4B+</p>
            <p className="text-sm text-gray-500">Monthly Rent Tracked</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">1,200+</p>
            <p className="text-sm text-gray-500">Active Tenants</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">98%</p>
            <p className="text-sm text-gray-500">On-time Payments</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">24/7</p>
            <p className="text-sm text-gray-500">Support Available</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  iconBg,
  title,
  description,
  bullets,
}: FeatureCardProps) {
  return (
    <Card className="group relative overflow-hidden border border-gray-200 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 bg-white">
      {/* Top gradient bar on hover */}
      <div className="absolute top-0 left-0 right-0 h-0.75 bg-linear-to-r from-blue-500 to-violet-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      <CardHeader className="pb-0 pt-8 px-8">
        <div
          className={`w-14 h-14 rounded-[14px] flex items-center justify-center mb-6 ${iconBg}`}
        >
          {icon}
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-3">{title}</h3>
        <p className="text-[0.9375rem] text-gray-500 leading-relaxed">
          {description}
        </p>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <ul className="mt-5 space-y-2">
          {bullets.map((b) => (
            <li
              key={b}
              className="flex items-center gap-2 text-sm text-gray-700"
            >
              <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
              {b}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function Step({ num, title, description }: StepProps) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-blue-500 to-violet-500 text-white text-lg font-extrabold flex items-center justify-center mx-auto mb-4">
        {num}
      </div>
      <h4 className="text-base font-bold text-gray-900 mb-2">{title}</h4>
      <p className="text-sm text-gray-500 leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function DashboardPreview() {
  return (
    <div className="max-w-5xl mx-auto px-6 pb-20">
      <div className="bg-linear-to-br from-gray-50 to-blue-50 border border-gray-200 rounded-4xl p-8 shadow-xl flex flex-wrap gap-6 items-start justify-center relative overflow-hidden">
        {/* Decorative blob */}
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-violet-200/30 rounded-full blur-3xl pointer-events-none" />
        
        {/* Revenue card */}
        <Card className="rounded-2xl border border-gray-200 shadow-md bg-white min-w-45 flex-1 max-w-55">
          <CardContent className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900 leading-none">
                  Total Revenue
                </p>
                <p className="text-xs text-gray-400 mt-0.5">This month</p>
              </div>
            </div>
            <p className="text-2xl font-extrabold tracking-tight text-gray-900">
              ₦420,000
            </p>
            <Badge className="mt-2 text-[10px] font-semibold bg-green-100 text-green-700 hover:bg-green-100 border-0 rounded-full">
              ↑ 12% vs last month
            </Badge>
          </CardContent>
        </Card>

        {/* Payments list card */}
        <Card className="rounded-2xl border border-gray-200 shadow-md bg-white min-w-55 flex-1 max-w-70">
          <CardContent className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900 leading-none">
                  Recent Payments
                </p>
                <p className="text-xs text-gray-400 mt-0.5">All units</p>
              </div>
            </div>
            <div className="space-y-0 divide-y divide-gray-100">
              {[
                {
                  name: "Unit 4A · Emeka",
                  status: "Paid",
                  color: "bg-green-100 text-green-700",
                },
                {
                  name: "Unit 2B · Fatima",
                  status: "Pending",
                  color: "bg-amber-100 text-amber-700",
                },
                {
                  name: "Unit 1C · Chidi",
                  status: "Overdue",
                  color: "bg-red-100 text-red-700",
                },
              ].map((row) => (
                <div
                  key={row.name}
                  className="flex items-center justify-between py-2.5"
                >
                  <span className="text-[0.8125rem] font-medium text-gray-700">
                    {row.name}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${row.color}`}
                  >
                    {row.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Outstanding card */}
        <Card className="rounded-2xl border border-gray-200 shadow-md bg-white min-w-45 flex-1 max-w-55">
          <CardContent className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900 leading-none">
                  Outstanding
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Needs attention</p>
              </div>
            </div>
            <p className="text-2xl font-extrabold tracking-tight text-gray-900">
              ₦85,000
            </p>
            <Badge className="mt-2 text-[10px] font-semibold bg-red-100 text-red-700 hover:bg-red-100 border-0 rounded-full">
              3 overdue units
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-[Inter,sans-serif] antialiased">
      <LandingNavWrapper />

      {/* Hero Section */}
      <section className="relative overflow-hidden text-center px-6 pt-20 pb-16 md:pt-28 md:pb-20">
        {/* Background radial glow */}
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center">
          <div className="w-175 h-125 bg-gradient-radial from-blue-100/60 via-violet-50/30 to-transparent rounded-full blur-3xl" />
        </div>

        {/* Beta badge */}
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-600 text-[0.8125rem] font-semibold px-4 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
          Now in public beta
        </div>

        {/* Headline */}
        <h1 className="text-[clamp(2.5rem,8vw,4.5rem)] font-black tracking-[-0.03em] leading-[1.05] text-gray-900 mb-5 max-w-175 mx-auto">
          <span className="block">RentLedger</span>
          <span className="bg-linear-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">
            Smart rent tracking
          </span>
        </h1>

        {/* Tagline */}
        <p className="text-[clamp(1rem,2.5vw,1.25rem)] text-gray-500 max-w-130 mx-auto mb-10 leading-[1.7]">
          Smart rent tracking for landlords and tenants. Replace notebooks and
          WhatsApp threads with structured dashboards that just work.
        </p>

        {/* CTA Buttons */}
        <div className="flex items-center justify-center gap-3 flex-wrap mb-16">
          <Link href="/auth/register">
            <Button
              size="lg"
              className="h-13 px-7 text-base font-semibold rounded-[10px] bg-blue-500 hover:bg-blue-600 text-white gap-2 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-200 transition-all duration-150"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button
              variant="outline"
              size="lg"
              className="h-13 px-7 text-base font-semibold rounded-[10px] border-2 border-blue-500 text-blue-600 hover:bg-blue-50 hover:-translate-y-0.5 transition-all duration-150"
            >
              Login to Account
            </Button>
          </Link>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-center gap-8 flex-wrap">
          {[
            { num: "2K+", label: "Properties tracked" },
            { divider: true },
            { num: "98%", label: "On-time payments" },
            { divider: true },
            { num: "Zero", label: "Missed rent disputes" },
          ].map((item, i) =>
            item.divider ? (
              <div key={i} className="w-px h-9 bg-gray-200 hidden sm:block" />
            ) : (
              <div key={i} className="text-center">
                <p className="text-2xl font-extrabold tracking-tight text-gray-900">
                  {item.num}
                </p>
                <p className="text-[0.8125rem] text-gray-400 mt-0.5">
                  {item.label}
                </p>
              </div>
            ),
          )}
        </div>
      </section>

      {/* Dashboard Preview */}
      <DashboardPreview />

      {/* Featured Properties - With Enhanced Cards */}
      <PropertiesSection />

      {/* Features */}
      <section className="bg-gray-50 px-6 py-20">
        <p className="text-center text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-blue-500 mb-3">
          What we offer
        </p>
        <h2 className="text-center text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold tracking-tight text-gray-900 mb-4">
          Everything you need to manage rent
        </h2>
        <p className="text-center text-[1.0625rem] text-gray-500 max-w-120 mx-auto mb-14 leading-[1.7]">
          From property setup to payment tracking — RentLedger handles it all so
          you can focus on what matters.
        </p>

        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Home className="w-7 h-7 text-blue-500" />}
            iconBg="bg-gradient-to-br from-blue-50 to-blue-100"
            title="Track Properties"
            description="Manage multiple properties and units from a single clean dashboard. Add tenants, set rent amounts, and track occupancy in seconds."
            bullets={[
              "Multi-property management",
              "Unit-level tracking",
              "Tenant assignment & history",
            ]}
          />
          <FeatureCard
            icon={<CreditCard className="w-7 h-7 text-violet-500" />}
            iconBg="bg-gradient-to-br from-violet-50 to-violet-100"
            title="Monitor Payments"
            description="Automatically track paid, pending, and overdue payments. See your total revenue and outstanding balances at a glance."
            bullets={[
              "Auto overdue detection",
              "Monthly revenue summary",
              "Full payment history",
            ]}
          />
          <FeatureCard
            icon={<Users className="w-7 h-7 text-green-600" />}
            iconBg="bg-gradient-to-br from-green-50 to-green-100"
            title="Reduce Disputes"
            description="Give tenants clear visibility into their rent status, due dates, and payment history. Transparency eliminates arguments."
            bullets={[
              "Tenant self-service portal",
              "Clear due date reminders",
              "Shared payment records",
            ]}
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-20">
        <p className="text-center text-[0.8125rem] font-bold uppercase tracking-[0.08em] text-blue-500 mb-3">
          How it works
        </p>
        <h2 className="text-center text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold tracking-tight text-gray-900 mb-4">
          Up and running in minutes
        </h2>
        <p className="text-center text-[1.0625rem] text-gray-500 max-w-105 mx-auto mb-14 leading-[1.7]">
          Four simple steps to replace your notebook forever.
        </p>

        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">
          <Step
            num="1"
            title="Create Account"
            description="Sign up as a landlord or tenant. Your role determines your dashboard experience."
          />
          <Step
            num="2"
            title="Add Properties"
            description="Landlords add properties, create units, and set monthly rent amounts and due dates."
          />
          <Step
            num="3"
            title="Assign Tenants"
            description="Link tenants to units. They instantly get access to their personal rent dashboard."
          />
          <Step
            num="4"
            title="Track Everything"
            description="Mark payments, view overdue status, and watch your financial dashboard update in real time."
          />
        </div>
      </section>

      {/* CTA Banner */}
      <section className="relative overflow-hidden bg-[#1E3A5F] px-6 py-20 text-center">
        {/* Blobs */}
        <div className="pointer-events-none absolute -top[-100px] -right[-100px] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom[-100px] -left[-100px] w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />

        <h2 className="relative text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold text-white tracking-tight mb-4">
          Start tracking rent the right way
        </h2>
        <p className="relative text-[1.0625rem] text-white/60 max-w-110 mx-auto mb-10 leading-[1.7]">
          Join landlords and tenants who&apos;ve eliminated rent confusion for
          good. Free to get started.
        </p>
        <div className="relative flex items-center justify-center gap-3 flex-wrap">
          <Link href="/auth/register">
            <Button
              size="lg"
              className="h-13 px-7 text-base font-bold rounded-[10px] bg-white text-gray-900 hover:bg-gray-50 gap-2 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-white/20 transition-all duration-150"
            >
              <ArrowRight className="w-4 h-4" />
              Get Started Free
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button
              variant="outline"
              size="lg"
              className="h-13 px-7 text-base font-semibold rounded-[10px] border-2 border-white/25 text-white/85 bg-transparent hover:bg-white/10 hover:-translate-y-0.5 transition-all duration-150"
            >
              Login to Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-gray-900"
          >
            <div className="w-8 h-8 rounded-xl bg-linear-to-br from-blue-500 to-violet-500 flex items-center justify-center">
              <Home className="w-4 h-4 text-white" />
            </div>
            RentLedger
          </Link>

          {/* Copyright */}
          <p className="text-[0.8125rem] text-gray-400">
            © {new Date().getFullYear()} RentLedger. All rights reserved.
          </p>

          {/* Links */}
          <div className="hidden md:flex gap-6">
            {["Privacy", "Terms", "Support"].map((link) => (
              <Link
                key={link}
                href="#"
                className="text-[0.8125rem] text-gray-400 hover:text-gray-700 transition-colors"
              >
                {link}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}