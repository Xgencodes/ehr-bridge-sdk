# Writing Custom Converters

If your database type isn't supported yet or you have custom requirements, you can implement your own converter by extending the `BaseConverter` class.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Understanding BaseConverter](#understanding-baseconverter)
3. [Complete Example](#complete-example)
4. [Field Mapping](#field-mapping)
5. [Validation](#validation)
6. [Testing](#testing)
7. [Advanced Patterns](#advanced-patterns)

## Quick Start

```typescript
import { BaseConverter, ValidationResult, FieldMapping } from '@ehr-bridge/sdk';
import { Patient as FHIRPatient } from '@medplum/fhirtypes';

interface MyDatabasePatient {
  [key: string]: any;
}

export class MyPatientConverter extends BaseConverter<MyDatabasePatient, FHIRPatient> {
  readonly resourceType = 'Patient';

  protected defaultMapping: FieldMapping = {
    firstName: 'first_name',
    lastName: 'last_name',
    // ... more mappings
  };

  toFHIR(patient: MyDatabasePatient, fieldMapping?: FieldMapping): FHIRPatient {
    const mapping = this.mergeMapping(fieldMapping);
    // Convert your database format to FHIR
    return {
      resourceType: 'Patient',
      // ... populate FHIR fields
    };
  }

  fromFHIR(fhir: FHIRPatient, fieldMapping?: FieldMapping): Partial<MyDatabasePatient> {
    const mapping = this.mergeMapping(fieldMapping);
    // Convert FHIR to your database format
    return {
      // ... populate database fields
    };
  }

  validate(fhir: FHIRPatient): ValidationResult {
    const errors: string[] = [];
    // Check required fields
    if (!fhir.name?.[0]?.given?.[0]) errors.push('First name required');
    return { valid: errors.length === 0, errors };
  }
}
```

## Understanding BaseConverter

`BaseConverter<YourType, FHIRType>` is an abstract class that provides:

### Properties

- `resourceType: string` - The FHIR resource type (readonly)
- `defaultMapping: FieldMapping` - Default field name mappings for your database

### Methods

#### Protected Methods (Override these)

```typescript
abstract toFHIR(data: YourType, fieldMapping?: FieldMapping): FHIRType;
abstract fromFHIR(fhir: FHIRType, fieldMapping?: FieldMapping): Partial<YourType>;
abstract validate(fhir: FHIRType): ValidationResult;
```

#### Public Methods (Available in your implementation)

```typescript
// Merge user-provided mapping with default mapping
protected mergeMapping(userMapping?: FieldMapping): FieldMapping

// Date conversion utilities
protected stringToFHIRDate(value: string | Date): string  // → YYYY-MM-DD
protected fhirDateToString(fhirDate: string): string     // → ISO string
protected stringToFHIRDateTime(value: string | Date): string  // → ISO-8601
protected fhirDateTimeToString(fhirDateTime: string): string // → ISO string

// Normalization utilities
protected normalizePhone(phone: string): string | null
protected normalizeGender(gender: string): 'male' | 'female' | 'other' | 'unknown'
protected denormalizeGender(fhirGender: string): string
```

## Complete Example

Here's a complete custom converter for a hypothetical healthcare system:

```typescript
import {
  BaseConverter,
  ValidationResult,
  FieldMapping,
  IConverter,
} from '@ehr-bridge/sdk';
import { Patient as FHIRPatient, ContactPoint } from '@medplum/fhirtypes';

/**
 * Your database patient interface
 */
export interface HealthSystemPatient {
  patient_id: string;
  pt_first_name: string;
  pt_last_name: string;
  pt_sex: string;
  pt_birth_date: Date;
  pt_primary_phone: string;
  pt_primary_email: string;
  pt_mrn: string;
  pt_insurance_id?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Custom converter for your healthcare system
 */
export class HealthSystemPatientConverter
  extends BaseConverter<HealthSystemPatient, FHIRPatient>
  implements IConverter<HealthSystemPatient, FHIRPatient>
{
  readonly resourceType = 'Patient';

  // Define your default field mappings
  protected defaultMapping: FieldMapping = {
    firstName: 'pt_first_name',
    lastName: 'pt_last_name',
    gender: 'pt_sex',
    birthDate: 'pt_birth_date',
    phone: 'pt_primary_phone',
    email: 'pt_primary_email',
    mrn: 'pt_mrn',
    memberId: 'pt_insurance_id',
  };

  /**
   * Convert your database format to FHIR Patient
   */
  toFHIR(
    patient: HealthSystemPatient,
    fieldMapping?: FieldMapping,
  ): FHIRPatient {
    const mapping = this.mergeMapping(fieldMapping);

    // Extract values using mapping (with fallbacks)
    const firstName = patient[mapping.firstName as string];
    const lastName = patient[mapping.lastName as string];
    const gender = patient[mapping.gender as string];
    const birthDate = patient[mapping.birthDate as string];
    const phone = patient[mapping.phone as string];
    const email = patient[mapping.email as string];
    const mrn = patient[mapping.mrn as string];
    const memberId = patient[mapping.memberId as string];

    // Build FHIR Patient
    const fhir: FHIRPatient = {
      resourceType: 'Patient',
      id: patient.patient_id,
    };

    // Name (always required)
    if (firstName || lastName) {
      fhir.name = [
        {
          given: firstName ? [firstName] : undefined,
          family: lastName,
        },
      ];
    }

    // Gender (convert your format to FHIR lowercase)
    if (gender) {
      fhir.gender = this.normalizeGender(gender);
    }

    // Birth date (ensure YYYY-MM-DD format)
    if (birthDate) {
      fhir.birthDate = this.stringToFHIRDate(birthDate);
    }

    // Contact information
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
        system: 'http://healthsystem.example.com/mrn',
        value: mrn,
      });
    }
    if (memberId) {
      identifiers.push({
        system: 'http://healthsystem.example.com/insurance-id',
        value: memberId,
      });
    }
    if (identifiers.length > 0) {
      fhir.identifier = identifiers;
    }

    // Meta (optional but recommended)
    fhir.meta = {
      versionId: String(Math.floor(patient.updated_at.getTime() / 1000)),
      lastUpdated: patient.updated_at.toISOString(),
    };

    return fhir;
  }

  /**
   * Convert FHIR Patient back to your database format
   */
  fromFHIR(
    fhir: FHIRPatient,
    fieldMapping?: FieldMapping,
  ): Partial<HealthSystemPatient> {
    const mapping = this.mergeMapping(fieldMapping);
    const result: Partial<HealthSystemPatient> = {};

    // Name
    const name = fhir.name?.[0];
    if (name?.given?.[0]) {
      result[mapping.firstName as string] = name.given[0];
    }
    if (name?.family) {
      result[mapping.lastName as string] = name.family;
    }

    // Gender (convert FHIR to your uppercase format)
    if (fhir.gender) {
      result[mapping.gender as string] = this.denormalizeGender(fhir.gender);
    }

    // Birth date
    if (fhir.birthDate) {
      result[mapping.birthDate as string] = new Date(fhir.birthDate);
    }

    // Telecom
    const phone = fhir.telecom?.find((t) => t.system === 'phone')?.value;
    const email = fhir.telecom?.find((t) => t.system === 'email')?.value;
    if (phone) {
      result[mapping.phone as string] = phone;
    }
    if (email) {
      result[mapping.email as string] = email;
    }

    // Identifiers
    const mrn = fhir.identifier?.find((i) =>
      i.system?.includes('mrn'),
    )?.value;
    const memberId = fhir.identifier?.find((i) =>
      i.system?.includes('insurance'),
    )?.value;
    if (mrn) {
      result[mapping.mrn as string] = mrn;
    }
    if (memberId) {
      result[mapping.memberId as string] = memberId;
    }

    // Timestamps
    result.updated_at = new Date();

    return result;
  }

  /**
   * Validate FHIR resource has required fields
   */
  validate(fhir: FHIRPatient): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required: Name
    if (!fhir.name?.[0]?.given?.[0]) {
      errors.push('First name is required (name[0].given[0])');
    }
    if (!fhir.name?.[0]?.family) {
      errors.push('Last name is required (name[0].family)');
    }

    // Required: Gender
    if (!fhir.gender) {
      errors.push('Gender is required');
    } else if (!['male', 'female', 'other', 'unknown'].includes(fhir.gender)) {
      errors.push(`Invalid gender: ${fhir.gender}`);
    }

    // Required: Birth date (YYYY-MM-DD format)
    if (!fhir.birthDate) {
      errors.push('Birth date is required (YYYY-MM-DD format)');
    } else if (!fhir.birthDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      errors.push(`Invalid birth date format: ${fhir.birthDate}`);
    }

    // Warnings for missing optional fields
    if (!fhir.telecom || fhir.telecom.length === 0) {
      warnings.push('No contact information provided');
    }
    if (!fhir.identifier || fhir.identifier.length === 0) {
      warnings.push('No identifiers provided');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get the default field mapping for this converter
   */
  getDefaultMapping(): FieldMapping {
    return this.defaultMapping;
  }
}
```

## Field Mapping

Field mappings define how your database field names correspond to FHIR fields:

```typescript
const mapping: FieldMapping = {
  firstName: 'pt_first_name',    // Your database field name
  lastName: 'pt_last_name',
  gender: 'pt_sex',
  birthDate: 'pt_birth_date',
  phone: 'pt_primary_phone',
  email: 'pt_primary_email',
  mrn: 'pt_mrn',
  memberId: 'pt_insurance_id',
};

const fhirPatient = converter.toFHIR(patient, mapping);
```

### Common Mapping Keys

```typescript
// Patient-specific
firstName: string;          // First name
lastName: string;           // Last name
gender: string;             // Gender
birthDate: string | Date;   // Date of birth
phone: string;              // Phone number
email: string;              // Email address
mrn: string;                // Medical record number
memberId: string;           // Member/patient ID

// Appointment-specific
status: string;
start: string;              // Start time
end: string;                // End time
reason: string;             // Reason for visit
participantDoctor: string;
participantPatient: string;

// Observation-specific
code: string;               // Observation type
value: string | number;
unit: string;               // Unit of measurement
effectiveDateTime: string;

// Medication-specific
code: string;               // Drug name/code
dosage: number;
unit: string;               // Dose unit
frequency: string;          // OD, BD, TID, etc.
duration: number;           // Duration in days
status: string;             // active, completed, stopped
```

## Validation

Always validate FHIR resources before sending to the Bridge:

```typescript
const { valid, errors, warnings } = converter.validate(fhirPatient);

if (!valid) {
  console.error('Validation errors:', errors);
  return;  // Don't send invalid data
}

if (warnings.length > 0) {
  console.warn('Warnings:', warnings);  // Log but continue
}

// Safe to send
await bridge.assignPatient({ patient: fhirPatient });
```

### Validation Levels

- **Errors**: Missing required fields - block submission
- **Warnings**: Missing optional fields - allow submission but log

## Testing

Here's a test template for your custom converter:

```typescript
import { HealthSystemPatientConverter } from './health-system.converter';

describe('HealthSystemPatientConverter', () => {
  let converter: HealthSystemPatientConverter;

  beforeEach(() => {
    converter = new HealthSystemPatientConverter();
  });

  describe('toFHIR', () => {
    it('should convert database patient to FHIR', () => {
      const patient: HealthSystemPatient = {
        patient_id: 'PT-123',
        pt_first_name: 'John',
        pt_last_name: 'Doe',
        pt_sex: 'M',
        pt_birth_date: new Date('1980-01-15'),
        pt_primary_phone: '555-1234',
        pt_primary_email: 'john@example.com',
        pt_mrn: 'MRN-001',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const fhir = converter.toFHIR(patient);

      expect(fhir.resourceType).toBe('Patient');
      expect(fhir.name?.[0]?.given?.[0]).toBe('John');
      expect(fhir.name?.[0]?.family).toBe('Doe');
      expect(fhir.gender).toBe('male');
      expect(fhir.birthDate).toBe('1980-01-15');
    });

    it('should use custom field mapping', () => {
      const patient = {
        patient_id: 'PT-456',
        first: 'Jane',
        last: 'Smith',
        sex: 'F',
        dob: new Date('1990-05-20'),
        phone: '555-5678',
        email: 'jane@example.com',
        mrn: 'MRN-002',
        created_at: new Date(),
        updated_at: new Date(),
      } as any;

      const mapping = {
        firstName: 'first',
        lastName: 'last',
        gender: 'sex',
        birthDate: 'dob',
      };

      const fhir = converter.toFHIR(patient, mapping);

      expect(fhir.name?.[0]?.given?.[0]).toBe('Jane');
      expect(fhir.name?.[0]?.family).toBe('Smith');
    });
  });

  describe('fromFHIR', () => {
    it('should convert FHIR to database format', () => {
      const fhir: FHIRPatient = {
        resourceType: 'Patient',
        id: 'ddg-123',
        name: [{ given: ['Alice'], family: 'Johnson' }],
        gender: 'female',
        birthDate: '1985-06-10',
        telecom: [
          { system: 'phone', value: '+1-555-1234' },
          { system: 'email', value: 'alice@example.com' },
        ],
      };

      const patient = converter.fromFHIR(fhir);

      expect(patient.pt_first_name).toBe('Alice');
      expect(patient.pt_last_name).toBe('Johnson');
      expect(patient.pt_gender).toBe('F');
    });
  });

  describe('validate', () => {
    it('should accept valid FHIR', () => {
      const fhir: FHIRPatient = {
        resourceType: 'Patient',
        id: 'test',
        name: [{ given: ['Test'], family: 'User' }],
        gender: 'other',
        birthDate: '2000-01-01',
      };

      const { valid, errors } = converter.validate(fhir);

      expect(valid).toBe(true);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid FHIR', () => {
      const fhir: FHIRPatient = {
        resourceType: 'Patient',
        id: 'test',
        // Missing required fields
      };

      const { valid, errors } = converter.validate(fhir);

      expect(valid).toBe(false);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('round-trip', () => {
    it('should preserve data through conversion cycles', () => {
      const original: HealthSystemPatient = {
        patient_id: 'PT-999',
        pt_first_name: 'Round',
        pt_last_name: 'Trip',
        pt_sex: 'M',
        pt_birth_date: new Date('1995-03-10'),
        pt_primary_phone: '+1-555-9999',
        pt_primary_email: 'round@example.com',
        pt_mrn: 'MRN-999',
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Convert cycle: DB → FHIR → DB
      const fhir = converter.toFHIR(original);
      const restored = converter.fromFHIR(fhir);

      expect(restored.pt_first_name).toBe(original.pt_first_name);
      expect(restored.pt_last_name).toBe(original.pt_last_name);
      expect(restored.pt_birth_date).toEqual(original.pt_birth_date);
    });
  });
});
```

## Advanced Patterns

### Handling Null/Missing Fields

```typescript
toFHIR(patient: YourPatient, fieldMapping?: FieldMapping): FHIRPatient {
  const mapping = this.mergeMapping(fieldMapping);

  // Safe field extraction with defaults
  const firstName = patient[mapping.firstName] || 'Unknown';
  const lastName = patient[mapping.lastName] || 'Unknown';

  // Optional fields
  const email = patient[mapping.email];  // May be undefined
  const phone = patient[mapping.phone];  // May be undefined

  // Only add if present
  const telecom = [];
  if (phone) telecom.push({ system: 'phone', value: phone });
  if (email) telecom.push({ system: 'email', value: email });

  return {
    // ...
    telecom: telecom.length > 0 ? telecom : undefined,
  };
}
```

### Handling Nested/Complex Fields

```typescript
// If your database has nested address
interface Patient {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
}

toFHIR(patient: Patient): FHIRPatient {
  return {
    // ...
    address: [
      {
        line: [patient.address.street],
        city: patient.address.city,
        state: patient.address.state,
        postalCode: patient.address.zip,
      },
    ],
  };
}
```

### Handling Custom Extensions

```typescript
// If your database has custom fields not in standard FHIR
toFHIR(patient: YourPatient): FHIRPatient {
  const fhir: FHIRPatient = {
    // ... standard FHIR fields
  };

  // Add custom extensions
  if (patient.bloodType) {
    fhir.extension = [
      {
        url: 'http://yourorganization.com/blood-type',
        valueString: patient.bloodType,
      },
    ];
  }

  return fhir;
}
```

## Best Practices

1. **Always validate before sending** - Use `converter.validate()` before calling `bridge.assignPatient()`
2. **Test round-trips** - Ensure data survives DB → FHIR → DB conversion
3. **Handle date formats carefully** - Use provided helper methods like `stringToFHIRDate()`
4. **Normalize phone numbers** - Use `normalizePhone()` for consistency
5. **Provide helpful error messages** - Include field names and expected formats in validation errors
6. **Document field mappings** - Clearly explain which database fields map to which FHIR paths
7. **Handle optional fields gracefully** - Don't fail if optional fields are missing

---

**See Also**:
- [DATABASE_SUPPORT.md](./DATABASE_SUPPORT.md) - Supported databases and roadmap
- [README.md](../README.md) - SDK overview and quick start
