# Database Support Roadmap

The @ehr-bridge/sdk provides converters for multiple database types, allowing your healthcare system to sync data with the EHR Bridge regardless of your data storage backend.

## Current Status

### ✅ Stable (Production-Ready)

| Database | Support | Converters | Field Mapping |
|----------|---------|-----------|---------------|
| **MySQL** | ✅ Stable | Patient, Appointment, Observation, Medication | Yes - snake_case |
| **MongoDB** | ✅ Stable | Patient, Appointment, Observation, Medication | Yes - camelCase |

### 📋 Planned (Community Contributions Welcome)

| Database | Status | Timeline | Notes |
|----------|--------|----------|-------|
| PostgreSQL | Planned | Q2 2025 | Similar to MySQL (SQL-based) |
| SQL Server | Planned | Q2 2025 | Similar to MySQL |
| Oracle | Planned | Q2 2025 | Similar to MySQL |
| MariaDB | Planned | Q2 2025 | Drop-in MySQL replacement |
| DynamoDB | Planned | Q3 2025 | AWS NoSQL |
| Firestore | Planned | Q3 2025 | Google Cloud NoSQL |
| CouchDB | Planned | Q3 2025 | Document-oriented |

## Using Converters

### MySQL Example

```typescript
import { PatientConverter, DatabaseType } from '@ehr-bridge/sdk';

const converter = new PatientConverter(DatabaseType.MYSQL);

// Your MySQL patient row
const mysqlPatient = {
  first_name: 'John',
  last_name: 'Doe',
  gender: 'M',
  dob: '1980-01-15',
  phone_number: '+1234567890',
  email_address: 'john@example.com',
};

// Convert to FHIR
const fhirPatient = converter.toFHIR(mysqlPatient);

// Validate
const { valid, errors } = converter.validate(fhirPatient);
if (valid) {
  // Send to Bridge
  const result = await bridge.assignPatient({
    ehrPatientId: mysqlPatient.id,
    patient: fhirPatient,
  });
}
```

### MongoDB Example

```typescript
import { PatientConverter, DatabaseType } from '@ehr-bridge/sdk';

const converter = new PatientConverter(DatabaseType.MONGODB);

// Your MongoDB document
const mongoPatient = {
  _id: '507f1f77bcf86cd799439011',
  firstName: 'Maria',
  lastName: 'Garcia',
  gender: 'female',
  birthDate: '1988-03-22',
  phone: '+34912345678',
  email: 'maria@hospital.es',
};

// Convert to FHIR
const fhirPatient = converter.toFHIR(mongoPatient);
```

## Default Field Mappings

### MySQL Mapping

The MySQL converter expects these field names (snake_case):

```typescript
{
  first_name: string;
  last_name: string;
  gender: 'M' | 'F' | 'O' | 'U';
  dob: string | Date;              // YYYY-MM-DD format
  phone_number: string;
  email_address: string;
  medical_record_number: string;
  member_id: string;
}
```

### MongoDB Mapping

The MongoDB converter expects these field names (camelCase):

```typescript
{
  firstName: string;
  lastName: string;
  gender: 'male' | 'female' | 'other' | 'unknown';
  birthDate: string | Date;
  phone: string;
  email: string;
  mrn: string;
  memberId: string;
}
```

## Custom Field Mappings

If your schema uses different field names, provide a custom mapping:

```typescript
const converter = new PatientConverter(DatabaseType.MYSQL);

const customMapping = {
  firstName: 'given_name',
  lastName: 'family_name',
  gender: 'sex',
  birthDate: 'date_of_birth',
  phone: 'mobile_number',
  email: 'work_email',
};

const fhirPatient = converter.toFHIR(yourPatient, customMapping);
```

Supported mapping keys:
- `firstName` - Patient first name
- `lastName` - Patient last name
- `gender` - Gender (M/F/O/U)
- `birthDate` - Date of birth
- `phone` - Phone number
- `email` - Email address
- `mrn` - Medical record number
- `memberId` - Patient member/ID number
- `status` (Appointment/Medication/Observation)
- `start` (Appointment start time)
- `end` (Appointment end time)
- `reason` (Appointment reason)
- `code` (Observation code)
- `value` (Observation value)
- `unit` (Observation unit)

## Adding Support for a New Database

### Step 1: Create a Converter Class

```typescript
// src/converters/postgres.converter.ts
import { BaseConverter, ValidationResult } from './converter.interface';
import { Patient as FHIRPatient } from '@medplum/fhirtypes';

export interface PostgresPatient {
  [key: string]: any;
  // Your PostgreSQL field names
}

export class PostgresPatientConverter extends BaseConverter<PostgresPatient, FHIRPatient> {
  readonly resourceType = 'Patient';
  protected defaultMapping = {
    firstName: 'first_name',
    lastName: 'last_name',
    // ... rest of mapping
  };

  toFHIR(patient: PostgresPatient, fieldMapping?): FHIRPatient {
    const mapping = this.mergeMapping(fieldMapping);
    // Implement conversion logic
    return fhirPatient;
  }

  fromFHIR(fhir: FHIRPatient, fieldMapping?): Partial<PostgresPatient> {
    const mapping = this.mergeMapping(fieldMapping);
    // Implement reverse conversion
    return databasePatient;
  }

  validate(fhir: FHIRPatient): ValidationResult {
    // Implement validation
    return { valid: true, errors: [] };
  }
}
```

### Step 2: Update Database Types

```typescript
// src/types/database.ts
export enum DatabaseType {
  MYSQL = 'mysql',
  MONGODB = 'mongodb',
  POSTGRESQL = 'postgresql',  // Add new type
  // ...
}

export const DEFAULT_MAPPINGS = {
  mysql: { /* ... */ },
  mongodb: { /* ... */ },
  postgresql: {              // Add mappings
    patient: {
      firstName: 'first_name',
      lastName: 'last_name',
      // ...
    },
    // ... other resources
  },
};
```

### Step 3: Register in Converter Registry

```typescript
// src/converters/index.ts
import { PostgresPatientConverter } from './postgres.converter';

export class ConverterRegistry {
  constructor(dbType: DatabaseType) {
    if (dbType === DatabaseType.POSTGRESQL) {
      this.register('Patient', () => new PostgresPatientConverter());
    }
    // ...
  }
}
```

### Step 4: Add Tests

```typescript
// tests/converters/postgres.converter.test.ts
describe('PostgresPatientConverter', () => {
  let converter: PostgresPatientConverter;

  beforeEach(() => {
    converter = new PostgresPatientConverter();
  });

  it('should convert Postgres patient to FHIR', () => {
    const postgres = { /* ... */ };
    const fhir = converter.toFHIR(postgres);
    expect(fhir.resourceType).toBe('Patient');
  });

  it('should round-trip conversion', () => {
    const original = { /* ... */ };
    const fhir = converter.toFHIR(original);
    const restored = converter.fromFHIR(fhir);
    expect(restored).toMatchObject(original);
  });
});
```

## Contributing New Database Support

We welcome contributions! To add support for a new database:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feat/add-postgresql-support`
3. **Implement the converter classes** (Patient, Appointment, Observation, Medication at minimum)
4. **Add comprehensive tests** (at least 80% coverage)
5. **Update documentation** with field mapping examples
6. **Submit a pull request** with:
   - Description of the database and why it's important
   - Implementation details and design decisions
   - Test results
   - Example usage

## Database-Specific Considerations

### MySQL / MariaDB / PostgreSQL / SQL Server

These are relational databases with similar patterns:
- Typically use snake_case field names
- Date/datetime handling varies slightly between vendors
- May use different encoding/collation defaults
- NULL handling is consistent across all SQL databases

### MongoDB / Firestore / CouchDB

These are NoSQL/document databases:
- Typically use camelCase field names
- Built-in date types (some store as ISO strings)
- Flexible schema - fields may be missing
- Array/object nesting common

### DynamoDB

AWS NoSQL service:
- Requires partition keys and sort keys
- Different query patterns (no JOINs)
- Pricing model based on read/write capacity
- Global secondary indexes needed for queries

## Supported FHIR Resource Types

All converters implement the same resources:
- **Patient** - Demographics, contact info, identifiers
- **Appointment** - Scheduling and appointments
- **Observation** - Vitals and measurements (with LOINC codes)
- **Medication** - Prescriptions and medications
- (Future) **Encounter**, **Condition**, **AllergyIntolerance**, **DiagnosticReport**

## Performance Considerations

- Batch conversions are most efficient (convert multiple records at once)
- Converters are stateless and thread-safe
- Custom field mappings avoid repeated lookups
- Use validation only when needed (skip for pre-validated data)

## Getting Help

- Check existing converter implementations for patterns
- Review FHIR R4 specifications: https://www.hl7.org/fhir/
- Open an issue on GitHub with questions
- See [CUSTOM_CONVERTERS.md](./CUSTOM_CONVERTERS.md) for detailed implementation guide

---

**Last updated**: April 2025  
**Current version**: @ehr-bridge/sdk@0.1.0
