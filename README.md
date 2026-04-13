# @ehr-bridge/sdk

TypeScript/JavaScript SDK for EHR Bridge integration. Convert your database schemas to FHIR, validate, and sync with other healthcare systems.

## Features

✅ **Database Schema Converters** - Convert MySQL, MongoDB, and more to FHIR (with extensible field mapping)  
✅ **FHIR Validators** - Validate FHIR resources before sending to the Bridge  
✅ **EHR Bridge Client** - Type-safe API client for connection management and data operations  
✅ **Support for Multiple Databases** - Built-in mappers for MySQL & MongoDB, extensible for others  
✅ **Bidirectional Conversion** - Convert your data → FHIR and receive FHIR → your data  

## Installation

```bash
npm install @ehr-bridge/sdk
# or
yarn add @ehr-bridge/sdk
```

## Quick Start

### 1. Initialize the Client

```typescript
import { EHRBridgeClient, DatabaseType } from '@ehr-bridge/sdk';

const bridge = new EHRBridgeClient({
  bridgeUrl: 'https://ehr-bridge.app',
  partnerId: 'your-partner-key',
  partnerSecret: 'your-partner-secret',
});
```

### 2. Convert Your Data to FHIR

```typescript
import { PatientConverter } from '@ehr-bridge/sdk';

const converter = new PatientConverter(DatabaseType.MYSQL);

// Your MySQL patient row
const mySQLPatient = {
  first_name: 'John',
  last_name: 'Doe',
  gender: 'M',
  dob: '1980-01-15',
  phone_number: '+1234567890',
  email_address: 'john@example.com',
};

// Convert to FHIR
const fhirPatient = converter.toFHIR(mySQLPatient);
```

### 3. Validate FHIR

```typescript
const { valid, errors } = converter.validate(fhirPatient);

if (!valid) {
  console.error('Validation errors:', errors);
  return;
}
```

### 4. Send to Bridge

```typescript
const result = await bridge.assignPatient({
  ehrPatientId: 'patient-123',
  patient: fhirPatient,
});

if (result.status === 'SUCCESS') {
  console.log('Patient synced:', result.data?.respondingPatientId);
}
```

## Converters

### PatientConverter

Convert patient records between your database and FHIR.

```typescript
import { PatientConverter, DatabaseType } from '@ehr-bridge/sdk';

// MySQL (default)
const mysqlConverter = new PatientConverter(DatabaseType.MYSQL);

// MongoDB
const mongoConverter = new PatientConverter(DatabaseType.MONGODB);

// With custom field mapping
const customMapping = {
  firstName: 'given_name',      // Map your field to FHIR path
  lastName: 'family_name',
  birthDate: 'date_of_birth',
  phone: 'mobile_number',
};

const fhir = mysqlConverter.toFHIR(yourPatient, customMapping);
```

### AppointmentConverter

Sync appointments bidirectionally.

```typescript
import { AppointmentConverter } from '@ehr-bridge/sdk';

const converter = new AppointmentConverter(DatabaseType.MYSQL);
const fhirAppointment = converter.toFHIR(yourAppointment);
```

### ObservationConverter

Handle vitals and measurements (Blood Pressure, Weight, Glucose, etc.).

```typescript
import { ObservationConverter } from '@ehr-bridge/sdk';

const converter = new ObservationConverter(DatabaseType.MYSQL);

const vital = {
  code: 'height',
  value: 175,
  unit: 'cm',
  measurement_date: '2025-04-13',
};

const fhirObservation = converter.toFHIR(vital);
```

### MedicationConverter

Manage prescriptions and medication requests.

```typescript
import { MedicationConverter } from '@ehr-bridge/sdk';

const converter = new MedicationConverter(DatabaseType.MYSQL);

const prescription = {
  drug_name: 'Aspirin',
  dose: 500,
  dose_unit: 'mg',
  frequency: 'BD',  // Twice daily
  duration_days: 7,
};

const fhirRequest = converter.toFHIR(prescription);
```

## Custom Field Mappings

Every converter accepts custom field mappings to fit your schema:

```typescript
const converter = new PatientConverter(DatabaseType.MYSQL);

// Your database has different field names
const yourPatient = {
  given_name: 'Alice',
  family_name: 'Smith',
  sex_code: 'F',
  date_birth: '1990-05-20',
  cell_phone: '+1-555-1234',
  work_email: 'alice@company.com',
};

// Map your fields to FHIR during conversion
const fhir = converter.toFHIR(yourPatient, {
  firstName: 'given_name',
  lastName: 'family_name',
  gender: 'sex_code',
  birthDate: 'date_birth',
  phone: 'cell_phone',
  email: 'work_email',
});
```

## Connection Flow

### Step 1: Initiate Connection

```typescript
const result = await bridge.initiateConnection({
  doctorIdentifier: 'doctor@email.com',
  identifierType: 'email',
  ehrSystemId: 'target-system-id',
  callbackUrl: 'https://your-system.com/webhook',
});

const connectionId = result.data?.connectionId;
```

### Step 2: Wait for Approval

The other system must approve the connection. Check status:

```typescript
const status = await bridge.getConnectionStatus(connectionId);

if (status.data?.state === 'ACTIVE') {
  const token = status.data.connectionToken;
  bridge.setConnectionToken(token);
}
```

### Step 3: Use Connection Token

```typescript
// Now you can send/receive data
const assignResult = await bridge.assignPatient({
  ehrPatientId: 'patient-123',
  patient: fhirPatient,
});
```

## Supported Databases

| Database | Status | Support |
|----------|--------|---------|
| **MySQL** | ✅ Stable | Patient, Appointment, Observation, Medication |
| **MongoDB** | ✅ Stable | Patient, Appointment, Observation, Medication |
| **PostgreSQL** | 📋 Planned | Coming soon |
| **SQL Server** | 📋 Planned | Coming soon |
| **Oracle** | 📋 Planned | Coming soon |
| **MariaDB** | 📋 Planned | Coming soon |
| **DynamoDB** | 📋 Planned | Coming soon |
| **Firestore** | 📋 Planned | Coming soon |
| **CouchDB** | 📋 Planned | Coming soon |

See [DATABASE_SUPPORT.md](./docs/DATABASE_SUPPORT.md) for a complete database roadmap and contribute support for your database!

## Writing Custom Converters

If your database isn't supported yet, implement the `IConverter` interface:

```typescript
import { BaseConverter, ValidationResult, FieldMapping } from '@ehr-bridge/sdk';
import { Patient as FHIRPatient } from '@ehr-bridge/sdk';

export class MyDatabasePatientConverter extends BaseConverter<MyPatient, FHIRPatient> {
  readonly resourceType = 'Patient';

  protected defaultMapping: FieldMapping = {
    firstName: 'your_first_name_field',
    lastName: 'your_last_name_field',
    // ... rest of your mapping
  };

  toFHIR(patient: MyPatient, fieldMapping?: FieldMapping): FHIRPatient {
    // Implement conversion logic
    return {
      resourceType: 'Patient',
      name: [{
        given: [patient.your_first_name_field],
        family: patient.your_last_name_field,
      }],
      // ...
    };
  }

  fromFHIR(fhir: FHIRPatient, fieldMapping?: FieldMapping): Partial<MyPatient> {
    // Implement reverse conversion
    return {
      your_first_name_field: fhir.name?.[0]?.given?.[0],
      your_last_name_field: fhir.name?.[0]?.family,
      // ...
    };
  }

  validate(fhir: FHIRPatient): ValidationResult {
    const errors: string[] = [];
    if (!fhir.name?.[0]?.given?.[0]) errors.push('First name required');
    if (!fhir.name?.[0]?.family) errors.push('Last name required');
    return { valid: errors.length === 0, errors };
  }
}
```

See [CUSTOM_CONVERTERS.md](./docs/CUSTOM_CONVERTERS.md) for a detailed guide.

## Error Handling

```typescript
const result = await bridge.assignPatient(request);

if (result.status === 'Failed') {
  console.error(`Error [${result.code}]: ${result.message}`);
  
  // Handle specific errors
  switch (result.code) {
    case 'INVALID_FHIR':
      console.error('FHIR validation failed');
      break;
    case 'NO_CONNECTION_TOKEN':
      console.error('Connection not established');
      break;
    case 'NETWORK_ERROR':
      console.error('Network error - retry logic here');
      break;
  }
}
```

## Type Safety

The SDK is fully typed with TypeScript:

```typescript
import {
  FHIRPatient,
  DatabasePatient,
  AssignPatientResponse,
} from '@ehr-bridge/sdk';

// Full type safety on all operations
const patient: DatabasePatient = { /* ... */ };
const fhir: FHIRPatient = converter.toFHIR(patient);
const response: AssignPatientResponse = await bridge.assignPatient({
  ehrPatientId: 'pat-123',
  patient: fhir,
});
```

## Examples

See `examples/` directory for complete integration examples:
- `examples/mysql-integration.ts` - MySQL to FHIR conversion
- `examples/mongodb-integration.ts` - MongoDB to FHIR conversion
- `examples/full-connection-flow.ts` - Complete connection + data sync

## API Reference

### EHRBridgeClient

- `initiateConnection(request)` - Start a connection with another partner
- `getConnectionStatus(connectionId)` - Check connection status
- `confirmConnection(connectionId, request)` - Approve and confirm connection
- `assignPatient(request)` - Send patient to connected system
- `getPatient(ehrPatientId)` - Get patient mapping
- `unassignPatient(ehrPatientId)` - Remove patient assignment
- `setConnectionToken(token)` - Update connection token
- `getConnectionToken()` - Get current token

### Converters

All converters implement:
- `toFHIR(data, fieldMapping?)` - Convert to FHIR
- `fromFHIR(fhir, fieldMapping?)` - Convert from FHIR
- `validate(fhir)` - Validate FHIR resource
- `getDefaultMapping()` - Get default field mapping

## Contributing

Found a bug or want to add support for your database?

1. Read [CONTRIBUTING.md](./CONTRIBUTING.md)
2. Fork and create a feature branch
3. Add tests
4. Submit a pull request

## License

MIT

## Support

- 📖 [Full Documentation](https://ehr-bridge.app/docs)
- 💬 [GitHub Discussions](https://github.com/ehr-bridge/ehr-bridge-sdk/discussions)
- 🐛 [Report Issues](https://github.com/ehr-bridge/ehr-bridge-sdk/issues)
