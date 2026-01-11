import { NextRequest, NextResponse } from "next/server";
import { checkServiceability } from "@/lib/shipping/serviceability";

export const dynamic = "force-dynamic";

/**
 * Check pincode serviceability API endpoint
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const pincode = searchParams.get("pincode");
    const weight = parseFloat(searchParams.get("weight") || "0.5");

    if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
      return NextResponse.json(
        { error: "Invalid pincode. Must be 6 digits." },
        { status: 400 }
      );
    }

    const result = await checkServiceability(pincode, weight);

    return NextResponse.json({
      ...result,
      pincode,
    });
  } catch (error: any) {
    console.error("Serviceability check error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
