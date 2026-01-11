export class ImporterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImporterError";
  }
}

export class MissingFieldError extends ImporterError {
  constructor(field: string, row?: number) {
    super(`Missing required field: ${field}${row ? ` at row ${row}` : ""}`);
    this.name = "MissingFieldError";
  }
}

export class InvalidFieldError extends ImporterError {
  constructor(field: string, value: any, reason: string, row?: number) {
    super(`Invalid value for field '${field}': ${value}. Reason: ${reason}${row ? ` at row ${row}` : ""}`);
    this.name = "InvalidFieldError";
  }
}

export class DuplicateProductError extends ImporterError {
  constructor(identifier: string) {
    super(`Duplicate product found with identifier: ${identifier}`);
    this.name = "DuplicateProductError";
  }
}

export class DuplicateVariantError extends ImporterError {
  constructor(sku: string) {
    super(`Duplicate variant found with SKU: ${sku}`);
    this.name = "DuplicateVariantError";
  }
}

export class UnknownProductReferenceError extends ImporterError {
  constructor(productUid: string) {
    super(`Variant references unknown product UID: ${productUid}`);
    this.name = "UnknownProductReferenceError";
  }
}

export class InvalidFormatError extends ImporterError {
  constructor(message: string) {
    super(`Invalid CSV format: ${message}`);
    this.name = "InvalidFormatError";
  }
}

