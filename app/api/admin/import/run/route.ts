import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth/getAdminSession";
import { runImport } from "@/lib/importer/index";

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session || session.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await req.formData();
    const productsFile = formData.get("products_csv") as File;
    const variantsFile = formData.get("variants_csv") as File;

    if (!productsFile) {
      return NextResponse.json({ error: "Products CSV is required" }, { status: 400 });
    }

    const productsCsv = await productsFile.text();
    const variantsCsv = variantsFile ? await variantsFile.text() : "";

    const summary = await runImport(productsCsv, variantsCsv);

    return NextResponse.json(summary);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

