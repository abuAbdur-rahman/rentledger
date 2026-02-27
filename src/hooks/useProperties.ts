import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

interface Property {
  id: string;
  name: string;
  address: string | null;
  unitsCount: number;
  tenantsCount: number;
  occupiedUnits: number;
  imageUrl: string | null;
}

interface PropertiesResponse {
  properties: Property[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface PropertyDetail {
  id: string;
  name: string;
  address: string | null;
  units: {
    id: string;
    name: string;
    rentAmount: number;
    status: string;
    tenant?: {
      id: string;
      name: string;
      phone?: string;
    } | null;
  }[];
  imageUrl: string | null;
}

async function fetchProperties(page = 1): Promise<PropertiesResponse> {
  const { data } = await axios.get<PropertiesResponse>(
    `/api/properties?page=${page}&limit=10`
  );
  return data;
}

async function fetchProperty(id: string): Promise<PropertyDetail> {
  const { data } = await axios.get<PropertyDetail>(`/api/properties/${id}`);
  return data;
}

async function createProperty(property: { name: string; address?: string }): Promise<Property> {
  const { data } = await axios.post<Property>("/api/properties", property);
  return data;
}

async function deleteProperty(id: string): Promise<void> {
  await axios.delete(`/api/properties/${id}`);
}

async function createUnit(propertyId: string, unit: { name: string; rentAmount: number }): Promise<void> {
  await axios.post(`/api/properties/${propertyId}/units`, unit);
}

export function useProperties(page = 1) {
  return useQuery({
    queryKey: ["properties", page],
    queryFn: () => fetchProperties(page),
  });
}

export function useProperty(id: string) {
  return useQuery({
    queryKey: ["property", id],
    queryFn: () => fetchProperty(id),
    enabled: !!id,
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

export function useDeleteProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ propertyId, unit }: { propertyId: string; unit: { name: string; rentAmount: number } }) =>
      createUnit(propertyId, unit),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["property", variables.propertyId] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });
}
