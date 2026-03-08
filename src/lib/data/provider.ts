export type DataProvider = "supabase" | "mongo";

const DEFAULT_PROVIDER: DataProvider = "mongo";

export function getDataProvider(): DataProvider {
  const configuredProvider = (process.env.DATA_PROVIDER ?? DEFAULT_PROVIDER)
    .trim()
    .toLowerCase();

  if (configuredProvider === "mongo") {
    return "mongo";
  }

  return "supabase";
}
