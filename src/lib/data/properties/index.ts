import { getDataProvider } from "@/lib/data/provider";
import { createServerClient } from "@/lib/supabase/server";
import { createMongoPropertiesRepository } from "./mongo-repository";
import { createSupabasePropertiesRepository } from "./supabase-repository";
import type { PropertiesRepository } from "./types";

type SupabaseServerClient = Awaited<ReturnType<typeof createServerClient>>;

interface CreatePropertiesRepositoryOptions {
  supabase?: SupabaseServerClient;
}

export async function createPropertiesRepository(
  options: CreatePropertiesRepositoryOptions = {},
): Promise<PropertiesRepository> {
  const provider = getDataProvider();

  if (provider === "mongo") {
    return createMongoPropertiesRepository();
  }

  const supabase = options.supabase ?? (await createServerClient());
  return createSupabasePropertiesRepository(supabase);
}

export type { PropertiesRepository } from "./types";
