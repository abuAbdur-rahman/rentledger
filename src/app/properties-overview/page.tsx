// app/properties/page.tsx (or app/properties-overview/page.tsx)
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  Home,
  MapPin,
  Star,
  Bed,
  Bath,
  Square,
  Search,
  ArrowRight,
  Heart,
  Building2,
  ChevronDown,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LandingNav } from "@/components/landing-nav";

// ─── Types ──────────────────────────────────────────────────────────────────

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
  created_at?: string | null;
}

interface PublicPropertyApiItem {
  id: string;
  name: string;
  address: string;
  location: string;
  landlordName: string;
  totalUnits: number;
  occupiedUnits: number;
  availableUnits: number;
  monthlyRentMin: number;
  monthlyRentMax: number;
  createdAt: string | null;
}

function parseAddress(address: string) {
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    city: parts.length >= 2 ? parts[parts.length - 2] : parts[0] || "Unknown",
    state: parts.length >= 1 ? parts[parts.length - 1] : "Nigeria",
  };
}

function mapPublicPropertyToUi(item: PublicPropertyApiItem): Property {
  const address = item.address || "Address not specified";
  const { city, state } = parseAddress(address);

  return {
    id: item.id,
    name: item.name,
    address,
    city: item.location || city,
    state,
    country: "Nigeria",
    type: item.totalUnits > 1 ? "Apartment" : "Single Unit",
    total_units: item.totalUnits,
    occupied_units: item.occupiedUnits,
    image_url: undefined,
    rating: 4.7,
    review_count: Math.max(item.totalUnits * 2, 5),
    monthly_rent_min: item.monthlyRentMin,
    monthly_rent_max: item.monthlyRentMax,
    amenities: ["RentLedger Verified", `${item.availableUnits} unit(s) available`],
    bedrooms: undefined,
    bathrooms: undefined,
    sqft: undefined,
    is_furnished: undefined,
    pet_friendly: undefined,
    available_units: item.availableUnits,
    purchase_price: undefined,
    is_for_sale: false,
    is_for_rent: true,
    created_at: item.createdAt,
  };
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
    image_url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500&auto=format&fit=crop&q=60",
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
  },
  {
    id: "7",
    name: "Ikeja Shopping Complex",
    address: "50 Obafemi Awolowo Way",
    city: "Ikeja",
    state: "Lagos",
    country: "Nigeria",
    type: "Commercial",
    total_units: 15,
    occupied_units: 12,
    available_units: 3,
    image_url: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=500&auto=format&fit=crop&q=60",
    rating: 4.4,
    review_count: 38,
    monthly_rent_min: 350000,
    monthly_rent_max: 1200000,
    purchase_price: 85000000,
    is_for_sale: true,
    is_for_rent: true,
    amenities: ["24/7 Security", "Power Backup", "Loading Bay", "Elevator"],
    bedrooms: 0,
    bathrooms: 2,
    sqft: 800,
    is_furnished: false,
    pet_friendly: false
  },
  {
    id: "8",
    name: "Oceanview Towers",
    address: "15 Water Corporation Drive",
    city: "Victoria Island",
    state: "Lagos",
    country: "Nigeria",
    type: "Luxury Apartment",
    total_units: 32,
    occupied_units: 28,
    available_units: 4,
    image_url: "https://images.unsplash.com/photo-1515263487990-61b07816b324?w=500&auto=format&fit=crop&q=60",
    rating: 4.8,
    review_count: 189,
    monthly_rent_min: 950000,
    monthly_rent_max: 3500000,
    purchase_price: 180000000,
    is_for_sale: true,
    is_for_rent: true,
    amenities: ["Private Beach Access", "Rooftop Pool", "Gym", "Spa", "Concierge"],
    bedrooms: 3,
    bathrooms: 3,
    sqft: 2200,
    is_furnished: true,
    pet_friendly: true
  }
];

// ─── Filter Components ──────────────────────────────────────────────────────

interface FilterDropdownProps {
  label: string;
  icon?: any;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

function FilterDropdown({ label, icon: Icon, options, value, onChange }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button 
        className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        {Icon && <Icon className="w-4 h-4 text-gray-500" />}
        <span className="text-sm font-medium text-gray-700">
          {value || label}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1">
            <button
              className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
            >
              All {label}s
            </button>
            {options.map((option) => (
              <button
                key={option}
                className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
              >
                {option}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface PriceRangeDropdownProps {
  minPrice: number;
  maxPrice: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
}

function PriceRangeDropdown({ minPrice, maxPrice, onMinChange, onMaxChange }: PriceRangeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const priceRanges = [
    { label: "Under ₦500k", min: 0, max: 500000 },
    { label: "₦500k - ₦1M", min: 500000, max: 1000000 },
    { label: "₦1M - ₦2M", min: 1000000, max: 2000000 },
    { label: "₦2M - ₦5M", min: 2000000, max: 5000000 },
    { label: "Above ₦5M", min: 5000000, max: 100000000 },
  ];

  const getDisplayLabel = () => {
    if (minPrice > 0 || maxPrice < 100000000) {
      if (minPrice === 0 && maxPrice === 500000) return "Under ₦500k";
      if (minPrice === 500000 && maxPrice === 1000000) return "₦500k - ₦1M";
      if (minPrice === 1000000 && maxPrice === 2000000) return "₦1M - ₦2M";
      if (minPrice === 2000000 && maxPrice === 5000000) return "₦2M - ₦5M";
      if (minPrice === 5000000 && maxPrice === 100000000) return "Above ₦5M";
      return "Custom Range";
    }
    return "Price Range";
  };

  return (
    <div className="relative">
      <button 
        className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-sm font-medium text-gray-700">{getDisplayLabel()}</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-2">
            {priceRanges.map((range) => (
              <button
                key={range.label}
                className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600"
                onClick={() => {
                  onMinChange(range.min);
                  onMaxChange(range.max);
                  setIsOpen(false);
                }}
              >
                {range.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SearchBar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <Input 
        placeholder="Search by property name, location, or type..." 
        className="pl-10 pr-4 py-6 w-full border-gray-200 rounded-xl"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// ─── Property Card with CTA ─────────────────────────────────────────────────

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

// ─── Main Properties Page ───────────────────────────────────────────────────

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [useFallbackData, setUseFallbackData] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(100000000);
  const [selectedBedrooms, setSelectedBedrooms] = useState("");
  const [sortBy, setSortBy] = useState("Most Relevant");
  const [visibleCount, setVisibleCount] = useState(8);

  useEffect(() => {
    let isMounted = true;

    async function loadProperties() {
      setLoadingProperties(true);
      try {
        const response = await fetch("/api/properties/public?page=1&limit=100", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch properties");
        }

        const payload = (await response.json()) as {
          properties?: PublicPropertyApiItem[];
        };

        if (!isMounted) return;

        const mapped = (payload.properties ?? []).map(mapPublicPropertyToUi);
        setProperties(mapped);
        setUseFallbackData(false);
      } catch {
        if (!isMounted) return;
        setUseFallbackData(true);
      } finally {
        if (isMounted) setLoadingProperties(false);
      }
    }

    loadProperties();

    return () => {
      isMounted = false;
    };
  }, []);

  const sourceProperties = useFallbackData ? dummyProperties : properties;

  // Get unique values for filters
  const locations = [...new Set(sourceProperties.map(p => p.city))];
  const propertyTypes = [...new Set(sourceProperties.map(p => p.type))];
  const bedroomOptions = [...new Set(sourceProperties.map(p => p.bedrooms).filter(b => b !== undefined))].sort();

  // Filter and sort properties
  const filteredProperties = useMemo(() => {
    let filtered = sourceProperties.filter(property => {
      // Search filter
      const matchesSearch = searchQuery === "" || 
        property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        property.type.toLowerCase().includes(searchQuery.toLowerCase());

      // Location filter
      const matchesLocation = selectedLocation === "" || property.city === selectedLocation;

      // Property type filter
      const matchesType = selectedType === "" || property.type === selectedType;

      // Price filter (using monthly rent min as reference)
      const matchesPrice = property.monthly_rent_min >= minPrice && property.monthly_rent_min <= maxPrice;

      // Bedrooms filter
      const matchesBedrooms = selectedBedrooms === "" || 
        (property.bedrooms?.toString() === selectedBedrooms) ||
        (selectedBedrooms === "0" && property.bedrooms === 0);

      return matchesSearch && matchesLocation && matchesType && matchesPrice && matchesBedrooms;
    });

    // Sort properties
    switch (sortBy) {
      case "Price: Low to High":
        filtered.sort((a, b) => a.monthly_rent_min - b.monthly_rent_min);
        break;
      case "Price: High to Low":
        filtered.sort((a, b) => b.monthly_rent_min - a.monthly_rent_min);
        break;
      case "Newest First":
        filtered.sort(
          (a, b) =>
            new Date(b.created_at ?? 0).getTime() -
            new Date(a.created_at ?? 0).getTime(),
        );
        break;
      case "Highest Rated":
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      default: // Most Relevant - keep original order
        break;
    }

    return filtered;
  }, [
    sourceProperties,
    searchQuery,
    selectedLocation,
    selectedType,
    minPrice,
    maxPrice,
    selectedBedrooms,
    sortBy,
  ]);

  const visibleProperties = filteredProperties.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProperties.length;

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedLocation("");
    setSelectedType("");
    setMinPrice(0);
    setMaxPrice(100000000);
    setSelectedBedrooms("");
  };

  const activeFiltersCount = [
    searchQuery,
    selectedLocation,
    selectedType,
    selectedBedrooms,
    minPrice > 0 || maxPrice < 100000000
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-white font-[Inter,sans-serif] antialiased">
      <LandingNav />

      {/* Header Section */}
      <section className="bg-linear-to-br from-blue-50 to-violet-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
              Find Your Perfect Property
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover premium properties managed with RentLedger. Whether you're looking to rent or buy, 
              we've got you covered with transparent, hassle-free options.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3">
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
              <Button 
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-6 rounded-xl"
                onClick={() => {}} // Search is already reactive
              >
                <Search className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <FilterDropdown 
              label="Location" 
              icon={MapPin} 
              options={locations}
              value={selectedLocation}
              onChange={setSelectedLocation}
            />
            <FilterDropdown 
              label="Property Type" 
              icon={Building2} 
              options={propertyTypes}
              value={selectedType}
              onChange={setSelectedType}
            />
            <PriceRangeDropdown 
              minPrice={minPrice}
              maxPrice={maxPrice}
              onMinChange={setMinPrice}
              onMaxChange={setMaxPrice}
            />
            <FilterDropdown 
              label="Bedrooms" 
              icon={Bed} 
              options={bedroomOptions.map(b => b.toString())}
              value={selectedBedrooms}
              onChange={setSelectedBedrooms}
            />
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors">
              <SlidersHorizontal className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">More Filters</span>
            </button>
          </div>

          {/* Active Filters */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 mt-4 justify-center flex-wrap">
              <span className="text-sm text-gray-500">Active filters:</span>
              {searchQuery && (
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0 gap-1">
                  Search: {searchQuery} 
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchQuery("")} />
                </Badge>
              )}
              {selectedLocation && (
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0 gap-1">
                  {selectedLocation}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedLocation("")} />
                </Badge>
              )}
              {selectedType && (
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0 gap-1">
                  {selectedType}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedType("")} />
                </Badge>
              )}
              {(minPrice > 0 || maxPrice < 100000000) && (
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0 gap-1">
                  {minPrice === 0 ? `Under ₦${(maxPrice/1000000).toFixed(1)}M` : 
                   maxPrice === 100000000 ? `Above ₦${(minPrice/1000000).toFixed(1)}M` : 
                   `₦${(minPrice/1000000).toFixed(1)}M - ₦${(maxPrice/1000000).toFixed(1)}M`}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => { setMinPrice(0); setMaxPrice(100000000); }} />
                </Badge>
              )}
              {selectedBedrooms && (
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0 gap-1">
                  {selectedBedrooms === "0" ? "Studio" : `${selectedBedrooms} Bed`}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedBedrooms("")} />
                </Badge>
              )}
              <Button variant="ghost" size="sm" className="text-sm text-gray-500" onClick={clearFilters}>
                Clear all
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Results Section */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {filteredProperties.length} Properties Found
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery && ` matching "${searchQuery}"`}
              {selectedLocation && ` in ${selectedLocation}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Sort by:</span>
            <select 
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option>Most Relevant</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
              <option>Newest First</option>
              <option>Highest Rated</option>
            </select>
          </div>
        </div>

        {/* Properties Grid */}
        {loadingProperties && !useFallbackData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <Card
                key={`property-skeleton-${index}`}
                className="h-80 border border-gray-200 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : visibleProperties.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {visibleProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="text-center mt-12">
                <Button 
                  variant="outline" 
                  size="lg"
                  className="px-8 py-6 border-2 border-gray-200 rounded-xl text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                  onClick={() => setVisibleCount(prev => prev + 4)}
                >
                  Load More Properties
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Home className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Properties Found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your filters or search query</p>
            <Button 
              variant="outline" 
              className="border-blue-500 text-blue-600 hover:bg-blue-50"
              onClick={clearFilters}
            >
              Clear All Filters
            </Button>
          </div>
        )}
      </section>

      {/* CTA Section */}
      <section className="bg-[#1E3A5F] px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Want to list your property?
          </h2>
          <p className="text-white/80 mb-8 max-w-2xl mx-auto">
            Join hundreds of landlords who use RentLedger to manage their properties and connect with quality tenants.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/auth/register?role=landlord">
              <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-6 text-base">
                List Your Property
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 px-8 py-6 text-base">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}