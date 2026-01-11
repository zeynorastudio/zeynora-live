import { parse } from "csv-parse/sync";
import fs from "fs";

export function parseCsvStringToRows<T>(
  csvString: string,
  expectedHeaders: string[]
): Record<string, string>[] {
  if (!csvString) return [];

  // Normalize expected headers for mapping (trim, lowercase)
  const normalizedExpected = expectedHeaders.map((h) => h.trim().toLowerCase());
  
  // 1. Parse using csv-parse
  const records = parse(csvString, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  if (records.length === 0) return [];

  // 2. Map headers if they differ slightly
  // We assume the parser's 'columns: true' used the first line as headers.
  // We want to ensure the keys in the returned objects match our 'Expected Headers' casing if possible,
  // or at least we return objects where we can access data.
  // Actually, 'csv-parse' with 'columns: true' returns objects with keys as they appear in the CSV.
  // We need to remap them to our expected keys if the CSV has different casing.
  
  const mappedRecords = records.map((record: any) => {
    const newRecord: any = {};
    const recordKeys = Object.keys(record);

    expectedHeaders.forEach((expected) => {
      const normalized = expected.trim().toLowerCase();
      // Find matching key in record
      const foundKey = recordKeys.find(
        (k) => k.trim().toLowerCase() === normalized
      );

      if (foundKey) {
        newRecord[expected] = record[foundKey];
      } else {
        // If missing, set to empty string to match our previous behavior/expectation
        newRecord[expected] = ""; 
      }
    });
    return newRecord;
  });

  return mappedRecords;
}

export function readCsvFromPath(path: string): string {
  try {
    return fs.readFileSync(path, "utf-8");
  } catch (error) {
    throw new Error(`Failed to read CSV from path: ${path}`);
  }
}
