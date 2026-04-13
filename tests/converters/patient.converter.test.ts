import { PatientConverter } from '../../src/converters/patient.converter';
import { DatabaseType } from '../../src/types/database';

describe('PatientConverter', () => {
  let converter: PatientConverter;

  beforeEach(() => {
    converter = new PatientConverter(DatabaseType.MYSQL);
  });

  describe('toFHIR', () => {
    it('should convert MySQL patient to FHIR Patient', () => {
      const patient = {
        first_name: 'John',
        last_name: 'Doe',
        gender: 'M',
        dob: '1980-01-15',
        phone_number: '+1234567890',
        email_address: 'john@example.com',
        medical_record_number: 'MRN-123',
        member_id: 'MEM-456',
      };

      const fhir = converter.toFHIR(patient);

      expect(fhir.resourceType).toBe('Patient');
      expect(fhir.name?.[0]?.given?.[0]).toBe('John');
      expect(fhir.name?.[0]?.family).toBe('Doe');
      expect(fhir.gender).toBe('male');
      expect(fhir.birthDate).toBe('1980-01-15');
      expect(fhir.telecom).toHaveLength(2);
      expect(fhir.identifier).toHaveLength(2);
    });

    it('should handle missing optional fields', () => {
      const patient = {
        first_name: 'Jane',
        last_name: 'Smith',
        gender: 'F',
        dob: '1990-05-20',
      };

      const fhir = converter.toFHIR(patient);

      expect(fhir.resourceType).toBe('Patient');
      expect(fhir.name?.[0]?.given?.[0]).toBe('Jane');
      expect(fhir.telecom).toBeUndefined();
      expect(fhir.identifier).toBeUndefined();
    });

    it('should use custom field mapping', () => {
      const patient = {
        given_name: 'Alice',
        family_name: 'Johnson',
        sex: 'F',
        date_of_birth: '1985-06-10',
        phone: '+1555123456',
        email: 'alice@example.com',
      };

      const mapping = {
        firstName: 'given_name',
        lastName: 'family_name',
        gender: 'sex',
        birthDate: 'date_of_birth',
        phone: 'phone',
        email: 'email',
      };

      const fhir = converter.toFHIR(patient, mapping);

      expect(fhir.name?.[0]?.given?.[0]).toBe('Alice');
      expect(fhir.name?.[0]?.family).toBe('Johnson');
    });

    it('should normalize gender correctly', () => {
      const testCases = [
        { input: 'M', expected: 'male' },
        { input: 'm', expected: 'male' },
        { input: 'F', expected: 'female' },
        { input: 'f', expected: 'female' },
        { input: 'O', expected: 'other' },
        { input: 'U', expected: 'unknown' },
      ];

      testCases.forEach(({ input, expected }) => {
        const patient = {
          first_name: 'Test',
          last_name: 'User',
          gender: input,
          dob: '2000-01-01',
        };

        const fhir = converter.toFHIR(patient);
        expect(fhir.gender).toBe(expected);
      });
    });
  });

  describe('fromFHIR', () => {
    it('should convert FHIR Patient to MySQL format', () => {
      const fhir = {
        resourceType: 'Patient' as const,
        id: 'pat-001',
        name: [{ given: ['Robert'], family: 'Wilson' }],
        gender: 'male',
        birthDate: '1975-03-20',
        telecom: [
          { system: 'phone' as const, value: '+1666123456' },
          { system: 'email' as const, value: 'robert@example.com' },
        ],
        identifier: [
          { system: 'http://example.com/mrn', value: 'MRN-789' },
          { system: 'http://example.com/memberId', value: 'MEM-012' },
        ],
      };

      const patient = converter.fromFHIR(fhir);

      expect(patient.first_name).toBe('Robert');
      expect(patient.last_name).toBe('Wilson');
      expect(patient.gender).toBe('M');
      expect(patient.phone_number).toBe('+1666123456');
      expect(patient.email_address).toBe('robert@example.com');
    });
  });

  describe('validate', () => {
    it('should accept valid FHIR Patient', () => {
      const fhir = {
        resourceType: 'Patient' as const,
        id: 'pat-123',
        name: [{ given: ['Test'], family: 'User' }],
        gender: 'other',
        birthDate: '2000-01-01',
      };

      const result = converter.validate(fhir);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing first name', () => {
      const fhir = {
        resourceType: 'Patient' as const,
        id: 'pat-456',
        name: [{ family: 'LastOnly' }],
        gender: 'male',
        birthDate: '2000-01-01',
      };

      const result = converter.validate(fhir);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('First name is required (name[0].given[0])');
    });

    it('should reject missing last name', () => {
      const fhir = {
        resourceType: 'Patient' as const,
        id: 'pat-789',
        name: [{ given: ['FirstOnly'] }],
        gender: 'female',
        birthDate: '2000-01-01',
      };

      const result = converter.validate(fhir);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Last name is required (name[0].family)');
    });

    it('should reject invalid birth date format', () => {
      const fhir = {
        resourceType: 'Patient' as const,
        id: 'pat-000',
        name: [{ given: ['Test'], family: 'User' }],
        gender: 'unknown',
        birthDate: '01/15/2000', // Invalid format
      };

      const result = converter.validate(fhir);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid birth date format'))).toBe(true);
    });

    it('should warn on missing contact information', () => {
      const fhir = {
        resourceType: 'Patient' as const,
        id: 'pat-111',
        name: [{ given: ['Test'], family: 'User' }],
        gender: 'male',
        birthDate: '2000-01-01',
      };

      const result = converter.validate(fhir);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('No contact information (phone/email) provided');
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve data through conversion cycle', () => {
      const original = {
        first_name: 'RoundTrip',
        last_name: 'Test',
        gender: 'M',
        dob: '1995-07-25',
        phone_number: '+1777123456',
        email_address: 'roundtrip@example.com',
        medical_record_number: 'MRN-RT-001',
        member_id: 'MEM-RT-001',
      };

      // MySQL → FHIR → MySQL
      const fhir = converter.toFHIR(original);
      const restored = converter.fromFHIR(fhir);

      expect(restored.first_name).toBe(original.first_name);
      expect(restored.last_name).toBe(original.last_name);
      expect(restored.phone_number).toBe(original.phone_number);
      expect(restored.email_address).toBe(original.email_address);
    });
  });
});
