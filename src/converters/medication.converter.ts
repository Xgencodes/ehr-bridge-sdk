import { MedicationRequest as FHIRMedicationRequest } from '@medplum/fhirtypes';
import { BaseConverter, ValidationResult } from './converter.interface';
import { FieldMapping, DEFAULT_MAPPINGS, DatabaseType } from '../types/database';

export interface DatabaseMedication {
  [key: string]: any;
  drug_name?: string;
  drugName?: string;
  dose?: number;
  dosage?: number;
  dose_unit?: string;
  doseUnit?: string;
  frequency?: string;
  duration_days?: number;
  durationDays?: number;
  status?: string;
  notes?: string;
}

export class MedicationConverter extends BaseConverter<DatabaseMedication, FHIRMedicationRequest> {
  readonly resourceType = 'MedicationRequest';

  protected defaultMapping: FieldMapping = DEFAULT_MAPPINGS.mysql.medication;

  constructor(dbType: DatabaseType = DatabaseType.MYSQL) {
    super();
    if (dbType === DatabaseType.MONGODB) {
      this.defaultMapping = DEFAULT_MAPPINGS.mongodb.medication;
    } else {
      this.defaultMapping = DEFAULT_MAPPINGS.mysql.medication;
    }
  }

  toFHIR(medication: DatabaseMedication, fieldMapping?: FieldMapping): FHIRMedicationRequest {
    const mapping = this.mergeMapping(fieldMapping);

    const drugName = this.getFieldValue(medication, mapping['code']);
    const dose = this.getFieldValue(medication, mapping['dosage']);
    const unit = this.getFieldValue(medication, mapping['unit']);
    const frequency = this.getFieldValue(medication, mapping['frequency']);
    const duration = this.getFieldValue(medication, mapping['duration']);
    const status = this.getFieldValue(medication, mapping['status']) || 'active';

    const fhir: FHIRMedicationRequest = {
      resourceType: 'MedicationRequest',
      status: (status.toLowerCase() as any) || 'active',
      intent: 'order',
      subject: { reference: 'Patient/unknown' }, // Required - set to unknown if not provided
    };

    // Medication
    if (drugName) {
      fhir.medicationCodeableConcept = {
        text: drugName,
      };
    }

    // Dosage
    const dosageInstruction: any = {};
    if (dose && unit) {
      dosageInstruction.doseAndRate = [
        {
          doseQuantity: {
            value: Number(dose),
            unit,
          },
        },
      ];
    } else if (dose) {
      dosageInstruction.doseAndRate = [
        {
          doseQuantity: {
            value: Number(dose),
          },
        },
      ];
    }

    if (frequency) {
      dosageInstruction.timing = {
        code: {
          text: this.normalizeFrequency(frequency),
        },
      };
    }

    if (duration) {
      dosageInstruction.timing = dosageInstruction.timing || {};
      dosageInstruction.timing.repeat = {
        boundsDuration: {
          value: Number(duration),
          unit: 'd',
        },
      };
    }

    if (Object.keys(dosageInstruction).length > 0) {
      fhir.dosageInstruction = [dosageInstruction];
    }

    return fhir;
  }

  fromFHIR(fhir: FHIRMedicationRequest, fieldMapping?: FieldMapping): Partial<DatabaseMedication> {
    const mapping = this.mergeMapping(fieldMapping);

    const result: Partial<DatabaseMedication> = {};

    // Drug name
    const drugName = fhir.medicationCodeableConcept?.text || fhir.medicationCodeableConcept?.coding?.[0]?.display;
    if (drugName) {
      result[mapping['code']] = drugName;
    }

    // Dosage
    const dosage = fhir.dosageInstruction?.[0];
    if (dosage?.doseAndRate?.[0]?.doseQuantity?.value) {
      result[mapping['dosage']] = dosage.doseAndRate[0].doseQuantity.value;
    }
    if (dosage?.doseAndRate?.[0]?.doseQuantity?.unit) {
      result[mapping['unit']] = dosage.doseAndRate[0].doseQuantity.unit;
    }

    // Frequency
    if (dosage?.timing?.code?.text) {
      result[mapping['frequency']] = dosage.timing.code.text;
    }

    // Duration
    if (dosage?.timing?.repeat?.boundsDuration?.value) {
      result[mapping['duration']] = dosage.timing.repeat.boundsDuration.value;
    }

    // Status
    if (fhir.status) {
      result[mapping['status']] = fhir.status;
    }

    return result;
  }

  validate(fhir: FHIRMedicationRequest): ValidationResult {
    const errors: string[] = [];

    if (!fhir.medicationCodeableConcept && !fhir.medicationReference) {
      errors.push('Medication (code or reference) is required');
    }
    if (!fhir.status) {
      errors.push('Status is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private normalizeFrequency(frequency: string): string {
    const f = frequency.toLowerCase().trim();

    // Map common frequency abbreviations
    const frequencies: Record<string, string> = {
      od: 'Once daily',
      '1x': 'Once daily',
      'once': 'Once daily',
      'daily': 'Once daily',
      bd: 'Twice daily',
      '2x': 'Twice daily',
      'twice': 'Twice daily',
      tid: 'Three times daily',
      '3x': 'Three times daily',
      qid: 'Four times daily',
      '4x': 'Four times daily',
      nocte: 'At night',
      stat: 'Immediately',
      'as needed': 'As needed',
      prn: 'As needed',
      'when necessary': 'As needed',
    };

    return frequencies[f] || frequency;
  }

  private getFieldValue(obj: DatabaseMedication, fieldName: string | undefined): any {
    if (!fieldName) return undefined;
    if (fieldName in obj) return obj[fieldName];

    const variations: Record<string, string[]> = {
      drug_name: ['drug_name', 'drugName', 'medication'],
      drugName: ['drugName', 'drug_name', 'medication'],
      dose_unit: ['dose_unit', 'doseUnit', 'unit'],
      doseUnit: ['doseUnit', 'dose_unit', 'unit'],
      duration_days: ['duration_days', 'durationDays', 'duration'],
      durationDays: ['durationDays', 'duration_days', 'duration'],
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
