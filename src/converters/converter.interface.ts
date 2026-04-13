import { FieldMapping } from '../types/database';

/**
 * Interface for bidirectional converters between your database format and FHIR
 */
export interface IConverter<YourType, FHIRType> {
  /**
   * Convert from your database format to FHIR
   * @param data Your database object
   * @param fieldMapping Optional field mapping (overrides defaults)
   * @returns FHIR resource
   */
  toFHIR(data: YourType, fieldMapping?: FieldMapping): FHIRType;

  /**
   * Convert from FHIR back to your database format
   * @param fhirData FHIR resource
   * @param fieldMapping Optional field mapping (overrides defaults)
   * @returns Your database object
   */
  fromFHIR(fhirData: FHIRType, fieldMapping?: FieldMapping): Partial<YourType>;

  /**
   * Validate a FHIR resource
   * @param fhirData FHIR resource to validate
   * @returns Validation result with errors if invalid
   */
  validate(fhirData: FHIRType): ValidationResult;

  /**
   * FHIR resource type this converter handles
   */
  readonly resourceType: string;

  /**
   * Get default field mapping for this converter
   */
  getDefaultMapping(): FieldMapping;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Base class for converters with common utility methods
 */
export abstract class BaseConverter<YourType, FHIRType> implements IConverter<YourType, FHIRType> {
  abstract readonly resourceType: string;
  protected abstract defaultMapping: FieldMapping;

  abstract toFHIR(data: YourType, fieldMapping?: FieldMapping): FHIRType;
  abstract fromFHIR(fhirData: FHIRType, fieldMapping?: FieldMapping): Partial<YourType>;
  abstract validate(fhirData: FHIRType): ValidationResult;

  getDefaultMapping(): FieldMapping {
    return this.defaultMapping;
  }

  /**
   * Merge provided mapping with defaults
   */
  protected mergeMapping(provided?: FieldMapping): FieldMapping {
    return { ...this.defaultMapping, ...provided };
  }

  /**
   * Convert FHIR date (YYYY-MM-DD) to JavaScript Date or string
   */
  protected fhirDateToString(fhirDate: string | undefined): string | null {
    if (!fhirDate) return null;
    return fhirDate; // Already in YYYY-MM-DD format
  }

  /**
   * Convert JavaScript Date or string to FHIR date (YYYY-MM-DD)
   */
  protected stringToFHIRDate(date: any): string {
    if (!date) return '';
    if (typeof date === 'string') {
      if (date.match(/^\d{4}-\d{2}-\d{2}$/)) return date; // Already correct format
      // Try parsing
      try {
        const d = new Date(date);
        return d.toISOString().split('T')[0];
      } catch {
        return '';
      }
    }
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    return '';
  }

  /**
   * Normalize phone number to E.164 format (basic)
   */
  protected normalizePhone(phone: string | undefined): string | undefined {
    if (!phone) return undefined;
    // Remove non-digit characters (except leading +)
    const cleaned = phone.replace(/[^\d+]/g, '');
    return cleaned || undefined;
  }

  /**
   * Normalize gender to FHIR format (male|female|other|unknown)
   */
  protected normalizeGender(gender: string | undefined): 'male' | 'female' | 'other' | 'unknown' | undefined {
    if (!gender) return undefined;
    const g = gender.toLowerCase().trim();
    if (g === 'm' || g === 'male') return 'male';
    if (g === 'f' || g === 'female') return 'female';
    if (g === 'o' || g === 'other') return 'other';
    return 'unknown';
  }

  /**
   * Reverse normalize gender from FHIR to common formats
   */
  protected denormalizeGender(fhirGender: string | undefined): string | undefined {
    if (!fhirGender) return undefined;
    const g = fhirGender.toLowerCase();
    if (g === 'male') return 'M';
    if (g === 'female') return 'F';
    return g.toUpperCase();
  }
}
