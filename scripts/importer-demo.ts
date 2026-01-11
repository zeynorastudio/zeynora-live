import { runImport } from "../lib/importer/index";

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error("This script should not be run in production.");
    process.exit(1);
  }

  const productsCsv = `
UID,Product Name,Slug,Category,Super Category,Subcategory,Style,Occasion,Season,Featured,Best Selling,Active,Price,Cost Price,Profit %,Profit Amount,SEO Title,SEO Description,Colors,Sizes_With_Stock,Tags,Main Image URL
PROD-001,Silk Saree,silk-saree,Sarees,Women,Traditional,Modern,Wedding,All,TRUE,FALSE,TRUE,5000,2000,60,3000,Best Silk Saree,Buy Silk Saree,Red,S:10|M:5,silk,http://example.com/image.jpg
PROD-002,Cotton Kurta,cotton-kurta,Kurtas,Women,Casual,Simple,Daily,Summer,FALSE,TRUE,TRUE,1500,500,66,1000,Cotton Kurta,Comfy Kurta,Blue,S:20|L:10,cotton,http://example.com/kurta.jpg
  `;

  // Note: JSON fields in CSV must be quoted and internal quotes escaped with double quotes
  const variantsCsv = `
Product_UID,Product_Name,Slug,Category,Subcategory,Style,Season,Occasion,Variant_SKU,Color,Size,Stock,Price,Cost,Active,Images_JSON
PROD-001,Silk Saree,silk-saree,Sarees,Traditional,Modern,All,Wedding,PROD-001-RED-S,Red,S,5,5000,2000,TRUE,"[""http://example.com/v1.jpg""]"
  `;

  console.log("Starting Importer Demo (Dry Run)...");
  
  try {
    const summary = await runImport(productsCsv.trim(), variantsCsv.trim(), { dryRun: true });
    console.log("Import Completed. Summary:");
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error("Import Failed:", error);
  }
}

main();
