import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Public and unauthenticated on purpose — a lawyer needs to see the
 * district list to register in the first place, before any session exists.
 * Returns only non-sensitive identifying fields.
 */
export async function GET() {
  const districts = await db.district.findMany({
    select: { id: true, name: true, state: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ districts });
}
