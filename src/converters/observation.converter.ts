import { Observation as FHIRObservation } from '@medplum/fhirtypes';
import { BaseConverter, ValidationResult } from './converter.interface';
import { FieldMapping, DEFAULT_MAPPINGS, DatabaseType } from '../types/database';

export interface DatabaseObservation {
  [key: string]: any;
  code?: string;
  value?: number | string;
  unit?: string;
  measurement_date?: string | Date;
  measurementDate?: string | Date;
  status?: string;
  observation_type?: string;
  observationType?: string;
}

/**
 * LOINC codes for common vital signs
 */
const LOINC_CODES = {
  height: '8302-2',
  weight: '29463-7',
  bmi: '39156-5',
  bp_systolic: '8480-6',
  bp_diastolic: '8462-4',
  blood_pressure: '85354-9',
  glucose: '2339-0',
  temperature: '8310-5',
  heart_rate: '8867-4',
  respiratory_rate: '9279-1',
};

export class ObservationConverter extends BaseConverter<DatabaseObservation, FHIRObservation> {
  readonly resourceType = 'Observation';

  protected defaultMapping: FieldMapping = DEFAULT_MAPPINGS.mysql.observation;

  constructor(dbType: DatabaseType = DatabaseType.MYSQL) {
    super();
    if (dbType === DatabaseType.MONGODB) {
      this.defaultMapping = DEFAULT_MAPPINGS.mongodb.observation;
    } else {
      this.defaultMapping = DEFAULT_MAPPINGS.mysql.observation;
    }
  }

  toFHIR(observation: DatabaseObservation, fieldMapping?: FieldMapping): FHIRObservation {
    const mapping = this.mergeMapping(fieldMapping);

    const code = this.getFieldValue(observation, mapping['code']);
    const value = this.getFieldValue(observation, mapping['value']);
    const unit = this.getFieldValue(observation, mapping['unit']) || '';
    const effectiveDate = this.getFieldValue(observation, mapping['effectiveDateTime']);
    const status = this.getFieldValue(observation, mapping['status']) || 'final';
    const obsType = this.getFieldValue(observation, 'observation_type') ||
      this.getFieldValue(observation, 'observationType') || code;

    // Code with LOINC - required
    const loincCode = this.getLoincCode(code, obsType);
    const codeValue = loincCode
      ? {
          coding: [
            {
              system: 'http://loinc.org',
              code: loincCode,
              display: code,
            },
          ],
          text: code,
        }
      : { text: code || 'unknown' };

    const fhir: FHIRObservation = {
      resourceType: 'Observation',
      status: (status.toLowerCase() as any) || 'final',
      code: codeValue,
    };

    // Value
    if (value !== undefined && value !== null) {
      if (typeof value === 'number') {
        fhir.valueQuantity = {
          value,
          unit: unit || undefined,
        };
      } else {
        fhir.valueString = String(value);
      }
    }

    // Effective date time
    if (effectiveDate) {
      fhir.effectiveDateTime = new Date(effectiveDate).toISOString();
    }

    return fhir;
  }

  fromFHIR(fhir: FHIRObservation, fieldMapping?: FieldMapping): Partial<DatabaseObservation> {
    const mapping = this.mergeMapping(fieldMapping);

    const result: Partial<DatabaseObservation> = {};

    // Code
    const codeText = fhir.code?.text || fhir.code?.coding?.[0]?.display;
    if (codeText) {
      result[mapping['code']] = codeText;
    }

    // Value
    if (fhir.valueQuantity?.value) {
      result[mapping['value']] = fhir.valueQuantity.value;
      if (fhir.valueQuantity.unit) {
        result[mapping['unit']] = fhir.valueQuantity.unit;
      }
    } else if (fhir.valueString) {
      result[mapping['value']] = fhir.valueString;
    }

    // Status
    if (fhir.status) {
      result[mapping['status']] = fhir.status;
    }

    // Effective date
    if (fhir.effectiveDateTime) {
      result[mapping['effectiveDateTime']] = fhir.effectiveDateTime;
    }

    return result;
  }

  validate(fhir: FHIRObservation): ValidationResult {
    const errors: string[] = [];

    if (!fhir.code) {
      errors.push('Code is required');
    }
    if (!fhir.status) {
      errors.push('Status is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private getLoincCode(code: string | undefined, obsType: string | undefined): string | undefined {
    if (!code && !obsType) return undefined;

    const search = (code || obsType || '').toLowerCase();

    // Match LOINC codes
    for (const [type, loincCode] of Object.entries(LOINC_CODES)) {
      if (search.includes(type.replace('_', ' '))) {
        return loincCode;
      }
    }

    return undefined;
  }

  private getFieldValue(obj: DatabaseObservation, fieldName: string | undefined): any {
    if (!fieldName) return undefined;
    if (fieldName in obj) return obj[fieldName];

    const variations: Record<string, string[]> = {
      measurement_date: ['measurement_date', 'measurementDate', 'date'],
      measurementDate: ['measurementDate', 'measurement_date', 'date'],
    };

    if (variations[fieldName]) {
      for (const alt of variations[fieldName]) {
        if (alt in obj && obj[alt]) {
          return obj[alt];
        }
      }
    }

    return undefined;
  }
}
