import { Patient as FHIRPatient, ContactPoint } from '@medplum/fhirtypes';
import { BaseConverter, ValidationResult } from './converter.interface';
import { FieldMapping, DEFAULT_MAPPINGS, DatabaseType } from '../types/database';

/**
 * Your database patient format (generic)
 * Adjust field names based on your actual schema
 */
export interface DatabasePatient {
  [key: string]: any;
  // Common fields (customize these to match your schema)
  first_name?: string;
  firstName?: string;
  last_name?: string;
  lastName?: string;
  gender?: string;
  sex?: string;
  dob?: string | Date;
  birthDate?: string | Date;
  date_of_birth?: string | Date;
  phone_number?: string;
  phone?: string;
  email_address?: string;
  email?: string;
  mrn?: string;
  medical_record_number?: string;
  member_id?: string;
  memberId?: string;
}

/**
 * Patient converter - converts between database format and FHIR Patient
 */
export class PatientConverter extends BaseConverter<DatabasePatient, FHIRPatient> {
  readonly resourceType = 'Patient';

  protected defaultMapping: FieldMapping = DEFAULT_MAPPINGS.mysql.patient;

  constructor(dbType: DatabaseType = DatabaseType.MYSQL) {
    super();
    // Set default mapping based on database type
    if (dbType === DatabaseType.MONGODB) {
      this.defaultMapping = DEFAULT_MAPPINGS.mongodb.patient;
    } else {
      this.defaultMapping = DEFAULT_MAPPINGS.mysql.patient;
    }
  }

  /**
   * Convert database patient to FHIR Patient
   */
  toFHIR(patient: DatabasePatient, fieldMapping?: FieldMapping): FHIRPatient {
    const mapping = this.mergeMapping(fieldMapping);

    // Extract values using mapping
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

    // Telecom (phone + email)
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

    // Identifiers (MRN, Member ID)
    const identifiers: Array<{ system?: string; value: string }> = [];
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

  /**
   * Convert FHIR Patient to database format
   */
  fromFHIR(fhir: FHIRPatient, fieldMapping?: FieldMapping): Partial<DatabasePatient> {
    const mapping = this.mergeMapping(fieldMapping);

    const result: Partial<DatabasePatient> = {};

    // Extract name
    const name = fhir.name?.[0];
    if (name?.given?.[0]) {
      result[mapping['firstName']] = name.given[0];
    }
    if (name?.family) {
      result[mapping['lastName']] = name.family;
    }

    // Extract gender
    if (fhir.gender) {
      result[mapping['gender']] = this.denormalizeGender(fhir.gender);
    }

    // Extract birth date
    if (fhir.birthDate) {
      result[mapping['birthDate']] = this.fhirDateToString(fhir.birthDate);
    }

    // Extract telecom
    const phone = fhir.telecom?.find((t) => t.system === 'phone')?.value;
    const email = fhir.telecom?.find((t) => t.system === 'email')?.value;

    if (phone) {
      result[mapping['phone']] = phone;
    }
    if (email) {
      result[mapping['email']] = email;
    }

    // Extract identifiers
    const mrn = fhir.identifier?.find((i) => i.system?.includes('mrn'))?.value;
    const memberId = fhir.identifier?.find((i) => i.system?.includes('memberId'))?.value;

    if (mrn) {
      result[mapping['mrn']] = mrn;
    }
    if (memberId) {
      result[mapping['memberId']] = memberId;
    }

    return result;
  }

  /**
   * Validate FHIR Patient
   */
  validate(fhir: FHIRPatient): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!fhir.name?.[0]?.given?.[0]) {
      errors.push('First name is required (name[0].given[0])');
    }
    if (!fhir.name?.[0]?.family) {
      errors.push('Last name is required (name[0].family)');
    }
    if (!fhir.gender) {
      errors.push('Gender is required');
    } else if (!['male', 'female', 'other', 'unknown'].includes(fhir.gender)) {
      errors.push(`Invalid gender: ${fhir.gender}. Must be male|female|other|unknown`);
    }
    if (!fhir.birthDate) {
      errors.push('Birth date is required (YYYY-MM-DD format)');
    } else if (!fhir.birthDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      errors.push(`Invalid birth date format: ${fhir.birthDate}. Expected YYYY-MM-DD`);
    }

    // Warnings
    if (!fhir.telecom || fhir.telecom.length === 0) {
      warnings.push('No contact information (phone/email) provided');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get field value from database object using multiple possible field names
   */
  private getFieldValue(obj: DatabasePatient, fieldName: string | undefined): any {
    if (!fieldName) return undefined;

    // Try the exact field name first
    if (fieldName in obj) {
      return obj[fieldName];
    }

    // For common fields, try variations
    const variations: Record<string, string[]> = {
      first_name: ['firstName', 'first_name', 'fname'],
      firstName: ['first_name', 'firstName', 'fname'],
      last_name: ['lastName', 'last_name', 'lname'],
      lastName: ['last_name', 'lastName', 'lname'],
      phone_number: ['phone', 'phone_number', 'phoneNumber'],
      phone: ['phone', 'phone_number', 'phoneNumber'],
      email_address: ['email', 'email_address', 'emailAddress'],
      email: ['email', 'email_address', 'emailAddress'],
      medical_record_number: ['mrn', 'medical_record_number', 'medicalRecordNumber'],
      mrn: ['mrn', 'medical_record_number', 'medicalRecordNumber'],
      member_id: ['memberId', 'member_id', 'memberID'],
      memberId: ['member_id', 'memberId', 'memberID'],
      dob: ['dob', 'birthDate', 'date_of_birth', 'dateOfBirth'],
      birthDate: ['birthDate', 'dob', 'date_of_birth', 'dateOfBirth'],
      date_of_birth: ['date_of_birth', 'dob', 'birthDate', 'dateOfBirth'],
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
