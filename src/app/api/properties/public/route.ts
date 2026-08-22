import { NextRequest, NextResponse } from "next/server";
import { createPropertiesRepository } from "@/lib/data/properties";

function formatSchemaErrorMessage(message: string) {
  if (message.includes("schema cache") || message.includes("Could not find the table")) {
    return "Database tables are not initialized. Run the SQL in supabase/bootstrap.sql in your Supabase SQL editor.";
  }
  return message;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(req: NextRequest) {
  try {
    const repository = await createPropertiesRepository();

    const searchParams = req.nextUrl.searchParams;
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const limit = Math.min(parsePositiveInt(searchParams.get("limit"), 12), 50);
    const q = searchParams.get("q")?.trim();

    const result = await repository.listPublic({
      page,
      limit,
      q,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/properties/public]", error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: formatSchemaErrorMessage(error.message) },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
