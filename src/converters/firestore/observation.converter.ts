import { Observation as FHIRObservation } from '@medplum/fhirtypes';
import { BaseConverter, ValidationResult } from '../converter.interface';
import { FieldMapping, DEFAULT_MAPPINGS } from '../../types/database';

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

export interface FirestoreObservation {
  [key: string]: any;
  observationCode?: string;
  observationValue?: number | string;
  measurementUnit?: string;
  observedAt?: string | Date;
  status?: string;
}

export class FirestoreObservationConverter extends BaseConverter<
  FirestoreObservation,
  FHIRObservation
> {
  readonly resourceType = 'Observation';

  protected defaultMapping: FieldMapping = DEFAULT_MAPPINGS.firestore.observation;

  toFHIR(observation: FirestoreObservation, fieldMapping?: FieldMapping): FHIRObservation {
    const mapping = this.mergeMapping(fieldMapping);

    const code = this.getFieldValue(observation, mapping['code']);
    const value = this.getFieldValue(observation, mapping['value']);
    const unit = this.getFieldValue(observation, mapping['unit']) || '';
    const effectiveDate = this.getFieldValue(observation, mapping['effectiveDateTime']);
    const status = this.getFieldValue(observation, mapping['status']) || 'final';

    const loincCode = this.getLoincCode(code);
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

    if (effectiveDate) {
      fhir.effectiveDateTime = new Date(effectiveDate).toISOString();
    }

    return fhir;
  }

  fromFHIR(
    fhir: FHIRObservation,
    fieldMapping?: FieldMapping,
  ): Partial<FirestoreObservation> {
    const mapping = this.mergeMapping(fieldMapping);

    const result: Partial<FirestoreObservation> = {};

    const codeText = fhir.code?.text || fhir.code?.coding?.[0]?.display;
    if (codeText) {
      result[mapping['code'] as string] = codeText;
    }

    if (fhir.valueQuantity?.value) {
      result[mapping['value'] as string] = fhir.valueQuantity.value;
      if (fhir.valueQuantity.unit) {
        result[mapping['unit'] as string] = fhir.valueQuantity.unit;
      }
    } else if (fhir.valueString) {
      result[mapping['value'] as string] = fhir.valueString;
    }

    if (fhir.status) {
      result[mapping['status'] as string] = fhir.status;
    }

    if (fhir.effectiveDateTime) {
      result[mapping['effectiveDateTime'] as string] = fhir.effectiveDateTime;
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

  private getLoincCode(code: string | undefined): string | undefined {
    if (!code) return undefined;

    const search = code.toLowerCase();

    for (const [type, loincCode] of Object.entries(LOINC_CODES)) {
      if (search.includes(type.replace('_', ' '))) {
        return loincCode;
      }
    }

    return undefined;
  }

  private getFieldValue(obj: FirestoreObservation, fieldName: string | undefined): any {
    if (!fieldName) return undefined;
    if (fieldName in obj) return obj[fieldName];

    const variations: Record<string, string[]> = {
      observationCode: ['observationCode', 'code', 'observation_code'],
      code: ['observationCode', 'code', 'observation_code'],
      observationValue: ['observationValue', 'value', 'observation_value'],
      value: ['observationValue', 'value', 'observation_value'],
      measurementUnit: ['measurementUnit', 'unit', 'measurement_unit'],
      unit: ['measurementUnit', 'unit', 'measurement_unit'],
      observedAt: ['observedAt', 'observed_at', 'measurementDate', 'date'],
      effectiveDateTime: ['observedAt', 'observed_at', 'measurementDate', 'date'],
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
