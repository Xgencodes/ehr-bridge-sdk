import { Patient as FHIRPatient, ContactPoint } from '@medplum/fhirtypes';
import { BaseConverter, ValidationResult } from '../converter.interface';
import { FieldMapping, DEFAULT_MAPPINGS } from '../../types/database';

/**
 * PostgreSQL patient record interface
 */
export interface PostgresqlPatient {
  [key: string]: any;
  first_name?: string;
  last_name?: string;
  gender?: string;
  date_of_birth?: string | Date;
  phone_number?: string;
  email_address?: string;
  medical_record_number?: string;
  member_id?: string;
}

/**
 * PostgreSQL Patient Converter
 * Converts between PostgreSQL patient records and FHIR Patient resources
 */
export class PostgresqlPatientConverter extends BaseConverter<PostgresqlPatient, FHIRPatient> {
  readonly resourceType = 'Patient';

  protected defaultMapping: FieldMapping = DEFAULT_MAPPINGS.postgresql.patient;

  toFHIR(patient: PostgresqlPatient, fieldMapping?: FieldMapping): FHIRPatient {
    const mapping = this.mergeMapping(fieldMapping);

    const firstName = this.getFieldValue(patient, mapping['firstName']);
    const lastName = this.getFieldValue(patient, mapping['lastName']);
    const gender = this.getFieldValue(patient, mapping['gender']);
    const birthDate = this.getFieldValue(patient, mapping['birthDate']);
    const phone = this.getFieldValue(patient, mapping['phone']);
    const email = this.getFieldValue(patient, mapping['email']);
    const mrn = this.getFieldValue(patient, mapping['mrn']);
    const memberId = this.getFieldValue(patient, mapping['memberId']);

    const fhir: FHIRPatient = {
      resourceType: 'Patient',
    };

    // Name
    if (firstName || lastName) {
      fhir.name = [
        {
          given: firstName ? [firstName] : undefined,
          family: lastName,
        },
      ];
    }

    // Gender
    if (gender) {
      fhir.gender = this.normalizeGender(gender);
    }

    // Birth date
    if (birthDate) {
      fhir.birthDate = this.stringToFHIRDate(birthDate);
    }

    // Telecom
    const telecom: ContactPoint[] = [];
    if (phone) {
      telecom.push({
        system: 'phone',
        value: this.normalizePhone(phone) || phone,
      });
    }
    if (email) {
      telecom.push({
        system: 'email',
        value: email,
      });
    }
    if (telecom.length > 0) {
      fhir.telecom = telecom;
    }

    // Identifiers
    const identifiers: any[] = [];
    if (mrn) {
      identifiers.push({
        system: 'http://example.com/mrn',
        value: mrn,
      });
    }
    if (memberId) {
      identifiers.push({
        system: 'http://example.com/memberId',
        value: memberId,
      });
    }
    if (identifiers.length > 0) {
      fhir.identifier = identifiers;
    }

    return fhir;
  }

  fromFHIR(fhir: FHIRPatient, fieldMapping?: FieldMapping): Partial<PostgresqlPatient> {
    const mapping = this.mergeMapping(fieldMapping);

    const result: Partial<PostgresqlPatient> = {};

    const name = fhir.name?.[0];
    if (name?.given?.[0]) {
      result[mapping['firstName'] as string] = name.given[0];
    }
    if (name?.family) {
      result[mapping['lastName'] as string] = name.family;
    }

    if (fhir.gender) {
      result[mapping['gender'] as string] = this.denormalizeGender(fhir.gender);
    }

    if (fhir.birthDate) {
      result[mapping['birthDate'] as string] = this.fhirDateToString(fhir.birthDate);
    }

    const phone = fhir.telecom?.find((t) => t.system === 'phone')?.value;
    const email = fhir.telecom?.find((t) => t.system === 'email')?.value;

    if (phone) {
      result[mapping['phone'] as string] = phone;
    }
    if (email) {
      result[mapping['email'] as string] = email;
    }

    const mrn = fhir.identifier?.find((i) => i.system?.includes('mrn'))?.value;
    const memberId = fhir.identifier?.find((i) => i.system?.includes('memberId'))?.value;

    if (mrn) {
      result[mapping['mrn'] as string] = mrn;
    }
    if (memberId) {
      result[mapping['memberId'] as string] = memberId;
    }

    return result;
  }

  validate(fhir: FHIRPatient): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!fhir.name?.[0]?.given?.[0]) {
      errors.push('First name is required (name[0].given[0])');
    }
    if (!fhir.name?.[0]?.family) {
      errors.push('Last name is required (name[0].family)');
    }
    if (!fhir.gender) {
      errors.push('Gender is required');
    } else if (!['male', 'female', 'other', 'unknown'].includes(fhir.gender)) {
      errors.push(`Invalid gender: ${fhir.gender}`);
    }
    if (!fhir.birthDate) {
      errors.push('Birth date is required (YYYY-MM-DD format)');
    } else if (!fhir.birthDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      errors.push(`Invalid birth date format: ${fhir.birthDate}`);
    }

    if (!fhir.telecom || fhir.telecom.length === 0) {
      warnings.push('No contact information provided');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private getFieldValue(obj: PostgresqlPatient, fieldName: string | undefined): any {
    if (!fieldName) return undefined;
    if (fieldName in obj) return obj[fieldName];

    const variations: Record<string, string[]> = {
      first_name: ['first_name', 'firstName', 'fname', 'given_name'],
      firstName: ['first_name', 'firstName', 'fname', 'given_name'],
      last_name: ['last_name', 'lastName', 'lname', 'family_name'],
      lastName: ['last_name', 'lastName', 'lname', 'family_name'],
      phone_number: ['phone_number', 'phone', 'phoneNumber', 'mobile'],
      phone: ['phone_number', 'phone', 'phoneNumber', 'mobile'],
      email_address: ['email_address', 'email', 'emailAddress', 'work_email'],
      email: ['email_address', 'email', 'emailAddress', 'work_email'],
      date_of_birth: ['date_of_birth', 'dob', 'birthDate', 'birth_date'],
      birthDate: ['date_of_birth', 'dob', 'birthDate', 'birth_date'],
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
