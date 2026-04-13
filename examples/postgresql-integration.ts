/**
 * Example: PostgreSQL to FHIR Integration with EHR Bridge SDK
 *
 * This example shows how a healthcare system using PostgreSQL can convert
 * patient and clinical data to FHIR format and sync with DrDoGood.
 */

import {
  EHRBridgeClient,
  PatientConverter,
  AppointmentConverter,
  ObservationConverter,
  MedicationConverter,
  DatabaseType,
  ConverterRegistry,
} from '@ehr-bridge/sdk';

// ============================================================================
// 1. SETUP
// ============================================================================

const BRIDGE_URL = process.env.EHR_BRIDGE_URL || 'https://ehr-bridge.example.com';
const PARTNER_ID = process.env.PARTNER_ID || 'postgres-hospital';
const PARTNER_SECRET = process.env.PARTNER_SECRET || 'your-secret-key';

// Initialize the client
const bridge = new EHRBridgeClient({
  bridgeUrl: BRIDGE_URL,
  partnerId: PARTNER_ID,
  partnerSecret: PARTNER_SECRET,
});

// Initialize converters for PostgreSQL
const patientConverter = new PatientConverter(DatabaseType.POSTGRESQL);
const appointmentConverter = new AppointmentConverter(DatabaseType.POSTGRESQL);
const observationConverter = new ObservationConverter(DatabaseType.POSTGRESQL);
const medicationConverter = new MedicationConverter(DatabaseType.POSTGRESQL);

// Alternative: Use ConverterRegistry for all converters at once
const registry = new ConverterRegistry(DatabaseType.POSTGRESQL);

// ============================================================================
// 2. POSTGRESQL DATA EXAMPLES
// ============================================================================

const postgresPatient = {
  id: 'PAT-001',
  first_name: 'Robert',
  last_name: 'Johnson',
  gender: 'M',
  date_of_birth: '1965-03-10',
  phone_number: '+1-555-0123',
  email_address: 'robert.johnson@example.com',
  medical_record_number: 'MRN-2024-001',
  member_id: 'MEM-1001',
  created_at: new Date('2024-01-15'),
  updated_at: new Date(),
};

const postgresAppointment = {
  id: 'APT-001',
  status: 'booked',
  appointment_start: new Date('2025-01-22T14:00:00Z'),
  appointment_end: new Date('2025-01-22T14:30:00Z'),
  reason_for_visit: 'Annual checkup and diabetes review',
  doctor_id: 'DR-PG-001',
  patient_id: 'PAT-001',
  created_at: new Date(),
};

const postgresObservation = {
  id: 'OBS-001',
  observation_code: 'blood_pressure',
  observation_value: '140/90',
  measurement_unit: 'mmHg',
  observed_at: new Date('2025-01-15T09:30:00Z'),
  status: 'final',
  patient_id: 'PAT-001',
};

const postgresMedication = {
  id: 'MED-001',
  medication_name: 'Metformin',
  dose_amount: 500,
  dose_unit: 'mg',
  dosage_frequency: 'BD',
  duration_days: 90,
  status: 'active',
  patient_id: 'PAT-001',
};

// ============================================================================
// 3. CONVERSION EXAMPLES
// ============================================================================

function demonstratePatientConversion(): void {
  console.log('--- PostgreSQL Patient Conversion ---');

  const fhirPatient = patientConverter.toFHIR(postgresPatient);
  console.log('✓ Converted to FHIR Patient');
  console.log('  Name:', fhirPatient.name?.[0]?.given?.[0], fhirPatient.name?.[0]?.family);
  console.log('  Gender:', fhirPatient.gender);
  console.log('  DOB:', fhirPatient.birthDate);

  const { valid, errors } = patientConverter.validate(fhirPatient);
  console.log('  Valid:', valid ? '✓' : '✗', errors.length === 0 ? '' : errors.join(', '));
}

function demonstrateAppointmentConversion(): void {
  console.log('\n--- PostgreSQL Appointment Conversion ---');

  const fhirAppointment = appointmentConverter.toFHIR(postgresAppointment);
  console.log('✓ Converted to FHIR Appointment');
  console.log('  Status:', fhirAppointment.status);
  console.log('  Start:', fhirAppointment.start);
  console.log('  Reason:', fhirAppointment.reasonCode?.[0]?.text);
}

function demonstrateObservationConversion(): void {
  console.log('\n--- PostgreSQL Observation Conversion ---');

  const fhirObservation = observationConverter.toFHIR(postgresObservation);
  console.log('✓ Converted to FHIR Observation');
  console.log('  Code:', fhirObservation.code?.text);
  console.log('  Status:', fhirObservation.status);
  console.log('  Value:', fhirObservation.valueString);
}

function demonstrateMedicationConversion(): void {
  console.log('\n--- PostgreSQL Medication Conversion ---');

  const fhirMedication = medicationConverter.toFHIR(postgresMedication);
  console.log('✓ Converted to FHIR MedicationRequest');
  console.log('  Medication:', fhirMedication.medicationCodeableConcept?.text);
  console.log('  Status:', fhirMedication.status);
  console.log('  Dosage:', fhirMedication.dosageInstruction?.[0]?.doseAndRate?.[0]?.doseQuantity?.value);
}

// ============================================================================
// 4. CUSTOM FIELD MAPPING (for non-standard schemas)
// ============================================================================

function customFieldMappingExample(): void {
  console.log('\n--- Custom Field Mapping ---');

  // If your PostgreSQL schema uses different field names
  const customMappedPatient = {
    id: 'PAT-002',
    pt_first_name: 'Maria',
    pt_last_name: 'Garcia',
    pt_gender: 'F',
    pt_date_of_birth: '1978-07-22',
    pt_phone: '+1-555-0456',
    pt_email: 'maria@example.com',
  };

  const customMapping = {
    firstName: 'pt_first_name',
    lastName: 'pt_last_name',
    gender: 'pt_gender',
    birthDate: 'pt_date_of_birth',
    phone: 'pt_phone',
    email: 'pt_email',
  };

  const fhir = patientConverter.toFHIR(customMappedPatient, customMapping);
  console.log('✓ Custom mapping applied');
  console.log('  Mapped first name:', customMappedPatient.pt_first_name, '→', fhir.name?.[0]?.given?.[0]);
}

// ============================================================================
// 5. BATCH PROCESSING
// ============================================================================

async function batchProcessPatients(): Promise<void> {
  console.log('\n--- Batch Processing Patients ---');

  const patients = [
    {
      id: 'PAT-003',
      first_name: 'James',
      last_name: 'Smith',
      gender: 'M',
      date_of_birth: '1955-11-05',
      phone_number: '+1-555-0789',
      email_address: 'james@example.com',
      medical_record_number: 'MRN-2024-003',
      member_id: 'MEM-1003',
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 'PAT-004',
      first_name: 'Susan',
      last_name: 'Williams',
      gender: 'F',
      date_of_birth: '1972-08-18',
      phone_number: '+1-555-0999',
      email_address: 'susan@example.com',
      medical_record_number: 'MRN-2024-004',
      member_id: 'MEM-1004',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  // Convert all to FHIR
  const fhirPatients = patients.map((p) => patientConverter.toFHIR(p));

  // Validate all
  const validPatients = fhirPatients.filter((fhir) => {
    const { valid } = patientConverter.validate(fhir);
    return valid;
  });

  console.log(`✓ Processed ${patients.length} patients, ${validPatients.length} valid`);
}

// ============================================================================
// 6. USING CONVERTER REGISTRY
// ============================================================================

function demonstrateRegistry(): void {
  console.log('\n--- Using ConverterRegistry ---');

  // Get converters from registry
  const patientConv = registry.getConverter('Patient');
  const appointmentConv = registry.getConverter('Appointment');

  console.log('✓ Got converters from registry');
  console.log('  Supported types:', registry.getSupportedResourceTypes());
  console.log('  Database type:', registry.getDatabaseType());

  if (patientConv) {
    const fhir = patientConv.toFHIR(postgresPatient);
    console.log('  Patient conversion via registry:', fhir.name?.[0]?.given?.[0]);
  }
}

// ============================================================================
// 7. ROUND-TRIP CONVERSION TEST
// ============================================================================

function roundTripTest(): void {
  console.log('\n--- Round-Trip Conversion Test ---');

  const original = {
    id: 'PAT-005',
    first_name: 'Michael',
    last_name: 'Brown',
    gender: 'M',
    date_of_birth: '1988-02-14',
    phone_number: '+1-555-1111',
    email_address: 'michael@example.com',
    medical_record_number: 'MRN-2024-005',
    member_id: 'MEM-1005',
  };

  // PostgreSQL → FHIR → PostgreSQL
  const fhir = patientConverter.toFHIR(original);
  const restored = patientConverter.fromFHIR(fhir);

  console.log('✓ Round-trip conversion completed');
  console.log('  Original firstName:', original.first_name);
  console.log('  Restored firstName:', restored.first_name);
  console.log('  Match:', original.first_name === restored.first_name ? '✓' : '✗');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('=== EHR Bridge SDK - PostgreSQL Integration Example ===\n');

  demonstratePatientConversion();
  demonstrateAppointmentConversion();
  demonstrateObservationConversion();
  demonstrateMedicationConversion();
  customFieldMappingExample();
  await batchProcessPatients();
  demonstrateRegistry();
  roundTripTest();

  console.log('\n=== PostgreSQL → FHIR Integration Complete ===');
  console.log('Ready to sync PostgreSQL data with DrDoGood!');
}

main().catch(console.error);

export {
  patientConverter,
  appointmentConverter,
  observationConverter,
  medicationConverter,
  registry,
  bridge,
};
