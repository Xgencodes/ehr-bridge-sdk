import { MedicationRequest as FHIRMedicationRequest } from '@medplum/fhirtypes';
import { BaseConverter, ValidationResult } from '../converter.interface';
import { FieldMapping, DEFAULT_MAPPINGS } from '../../types/database';

export interface PostgresqlMedication {
  [key: string]: any;
  medication_name?: string;
  dose_amount?: number;
  dose_unit?: string;
  dosage_frequency?: string;
  duration_days?: number;
  status?: string;
}

export class PostgresqlMedicationConverter extends BaseConverter<
  PostgresqlMedication,
  FHIRMedicationRequest
> {
  readonly resourceType = 'MedicationRequest';

  protected defaultMapping: FieldMapping = DEFAULT_MAPPINGS.postgresql.medication;

  toFHIR(
    medication: PostgresqlMedication,
    fieldMapping?: FieldMapping,
  ): FHIRMedicationRequest {
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
      subject: { reference: 'Patient/unknown' },
    };

    if (drugName) {
      fhir.medicationCodeableConcept = {
        text: drugName,
      };
    }

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

  fromFHIR(
    fhir: FHIRMedicationRequest,
    fieldMapping?: FieldMapping,
  ): Partial<PostgresqlMedication> {
    const mapping = this.mergeMapping(fieldMapping);

    const result: Partial<PostgresqlMedication> = {};

    const drugName =
      fhir.medicationCodeableConcept?.text ||
      fhir.medicationCodeableConcept?.coding?.[0]?.display;
    if (drugName) {
      result[mapping['code'] as string] = drugName;
    }

    const dosage = fhir.dosageInstruction?.[0];
    if (dosage?.doseAndRate?.[0]?.doseQuantity?.value) {
      result[mapping['dosage'] as string] = dosage.doseAndRate[0].doseQuantity.value;
    }
    if (dosage?.doseAndRate?.[0]?.doseQuantity?.unit) {
      result[mapping['unit'] as string] = dosage.doseAndRate[0].doseQuantity.unit;
    }

    if (dosage?.timing?.code?.text) {
      result[mapping['frequency'] as string] = dosage.timing.code.text;
    }

    if (dosage?.timing?.repeat?.boundsDuration?.value) {
      result[mapping['duration'] as string] = dosage.timing.repeat.boundsDuration.value;
    }

    if (fhir.status) {
      result[mapping['status'] as string] = fhir.status;
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

    const frequencies: Record<string, string> = {
      od: 'Once daily',
      '1x': 'Once daily',
      once: 'Once daily',
      daily: 'Once daily',
      bd: 'Twice daily',
      '2x': 'Twice daily',
      twice: 'Twice daily',
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

  private getFieldValue(obj: PostgresqlMedication, fieldName: string | undefined): any {
    if (!fieldName) return undefined;
    if (fieldName in obj) return obj[fieldName];

    const variations: Record<string, string[]> = {
      medication_name: ['medication_name', 'drug_name', 'medicationName'],
      code: ['medication_name', 'drug_name', 'medicationName'],
      dose_amount: ['dose_amount', 'dose', 'doseAmount'],
      dosage: ['dose_amount', 'dose', 'doseAmount'],
      dose_unit: ['dose_unit', 'doseUnit', 'unit'],
      unit: ['dose_unit', 'doseUnit', 'unit'],
      dosage_frequency: ['dosage_frequency', 'frequency', 'dosageFrequency'],
      frequency: ['dosage_frequency', 'frequency', 'dosageFrequency'],
      duration_days: ['duration_days', 'durationDays', 'duration'],
      duration: ['duration_days', 'durationDays', 'duration'],
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
