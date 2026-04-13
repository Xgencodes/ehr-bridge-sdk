/**
 * Example: MongoDB to FHIR Integration with EHR Bridge SDK
 *
 * This example shows how a healthcare system using MongoDB can convert patient data
 * to FHIR format and sync with DrDoGood via the EHR Bridge.
 */

import {
  EHRBridgeClient,
  PatientConverter,
  AppointmentConverter,
  DatabaseType,
} from '@ehr-bridge/sdk';

// ============================================================================
// 1. SETUP
// ============================================================================

const BRIDGE_URL = process.env.EHR_BRIDGE_URL || 'https://ehr-bridge.example.com';
const PARTNER_ID = process.env.PARTNER_ID || 'cerner-system';
const PARTNER_SECRET = process.env.PARTNER_SECRET || 'your-secret-key';
const CONNECTION_TOKEN = process.env.CONNECTION_TOKEN || '';

// Initialize client
const bridge = new EHRBridgeClient({
  bridgeUrl: BRIDGE_URL,
  partnerId: PARTNER_ID,
  partnerSecret: PARTNER_SECRET,
  connectionToken: CONNECTION_TOKEN,
});

// Initialize converters for MongoDB format (camelCase field names)
const patientConverter = new PatientConverter(DatabaseType.MONGODB);
const appointmentConverter = new AppointmentConverter(DatabaseType.MONGODB);

// ============================================================================
// 2. EXAMPLE: MONGODB PATIENT DOCUMENT
// ============================================================================

// Your patient document from MongoDB
const mongoPatient = {
  _id: '507f1f77bcf86cd799439011',
  firstName: 'Maria',
  lastName: 'Garcia',
  gender: 'female',
  birthDate: '1988-03-22',
  phone: '+34912345678',
  email: 'maria@hospital.es',
  mrn: 'MRN-ES-001',
  memberId: 'MEMBER-ES-500',
  createdAt: new Date('2020-01-15'),
};

// Convert MongoDB document to FHIR
const fhirPatient = patientConverter.toFHIR(mongoPatient);
console.log('✓ MongoDB → FHIR conversion successful');
console.log('Patient name:', fhirPatient.name?.[0]?.given?.[0], fhirPatient.name?.[0]?.family);

// ============================================================================
// 3. EXAMPLE: MONGODB APPOINTMENT DOCUMENT
// ============================================================================

const mongoAppointment = {
  _id: 'apt_mongo_001',
  status: 'booked',
  startTime: new Date('2025-01-20T10:00:00Z'),
  endTime: new Date('2025-01-20T10:30:00Z'),
  reasonForVisit: 'Follow-up consultation',
  doctorId: 'DR-MONGO-123',
  patientId: '507f1f77bcf86cd799439011',
};

// Convert MongoDB appointment to FHIR
const fhirAppointment = appointmentConverter.toFHIR(mongoAppointment);
console.log('✓ Appointment converted to FHIR');
console.log('Appointment status:', fhirAppointment.status);

// ============================================================================
// 4. EXAMPLE: BATCH PATIENT CONVERSION
// ============================================================================

async function convertPatientsInBatch() {
  console.log('\n--- Batch converting MongoDB patients ---');

  // Simulated batch of patients from MongoDB collection
  const mongoPatients = [
    {
      firstName: 'Jose',
      lastName: 'Martinez',
      gender: 'male',
      birthDate: '1975-07-05',
      phone: '+34911223344',
      email: 'jose@hospital.es',
    },
    {
      firstName: 'Ana',
      lastName: 'Rodriguez',
      gender: 'female',
      birthDate: '1992-11-18',
      phone: '+34915667788',
      email: 'ana@hospital.es',
    },
    {
      firstName: 'Carlos',
      lastName: 'Sanchez',
      gender: 'male',
      birthDate: '1980-02-14',
      phone: '+34919998877',
      email: 'carlos@hospital.es',
    },
  ];

  const fhirPatients = mongoPatients
    .map((patient) => patientConverter.toFHIR(patient))
    .filter((fhir) => {
      const { valid } = patientConverter.validate(fhir);
      return valid;
    });

  console.log(`✓ Converted ${fhirPatients.length} patients successfully`);
  return fhirPatients;
}

// ============================================================================
// 5. EXAMPLE: CUSTOM FIELD MAPPING FOR DIFFERENT MONGODB SCHEMA
// ============================================================================

function customMappingExample() {
  console.log('\n--- Custom field mapping example ---');

  // Alternative MongoDB schema with different field names
  const alternativeMongo = {
    first: 'David',
    last: 'Lopez',
    sex: 'M',
    born: '1983-09-12',
    mobile: '+34920004455',
    contact: 'david@hospital.es',
  };

  const mapping = {
    firstName: 'first',
    lastName: 'last',
    gender: 'sex',
    birthDate: 'born',
    phone: 'mobile',
    email: 'contact',
  };

  const fhir = patientConverter.toFHIR(alternativeMongo, mapping);
  console.log('✓ Custom mapping applied');
  console.log('First name:', fhir.name?.[0]?.given?.[0]);
}

// ============================================================================
// 6. EXAMPLE: RECEIVING FHIR DATA AND CONVERTING TO MONGODB
// ============================================================================

function convertFhirToMongo() {
  console.log('\n--- Converting received FHIR back to MongoDB ---');

  // FHIR Patient received from DrDoGood or another partner
  const receivedFhir = {
    resourceType: 'Patient' as const,
    id: 'ddg-patient-789',
    name: [{ given: ['Rafael'], family: 'Fernandez' }],
    gender: 'male',
    birthDate: '1986-04-28',
    telecom: [
      { system: 'phone' as const, value: '+34921112222' },
      { system: 'email' as const, value: 'rafael@example.com' },
    ],
  };

  // Convert back to MongoDB format
  const mongoFormat = patientConverter.fromFHIR(receivedFhir);
  console.log('✓ Converted FHIR → MongoDB format');

  // Insert into MongoDB
  const mongoDoc = {
    _id: receivedFhir.id,
    ...mongoFormat,
    syncedAt: new Date(),
    source: 'drdogood',
  };

  console.log('MongoDB document ready for insertion:', mongoDoc);
  return mongoDoc;
}

// ============================================================================
// 7. EXAMPLE: API OPERATIONS
// ============================================================================

async function apiOperationsExample() {
  if (!CONNECTION_TOKEN) {
    console.log('\nℹ️  CONNECTION_TOKEN not set - skipping API examples');
    console.log('   Set CONNECTION_TOKEN env var to test actual API calls');
    return;
  }

  console.log('\n--- API Operations (requires connection token) ---');

  try {
    // Assign patient to doctor
    const assignResult = await bridge.assignPatient({
      ehrPatientId: 'MONGO-PAT-123',
      patient: fhirPatient,
    });

    if (assignResult.status === 'SUCCESS') {
      console.log('✓ Patient assigned');
      console.log('  DDG ID:', assignResult.data?.respondingPatientId);
    }
  } catch (error) {
    console.error('API error:', error);
  }
}

// ============================================================================
// 8. VALIDATION EXAMPLE
// ============================================================================

function validationExample() {
  console.log('\n--- Validation Examples ---');

  // Valid patient
  const validPatient = {
    firstName: 'Valid',
    lastName: 'Patient',
    gender: 'M',
    birthDate: '1990-01-01',
  };

  const fhirValid = patientConverter.toFHIR(validPatient);
  const { valid: isValid, errors: validErrors } = patientConverter.validate(fhirValid);
  console.log('Valid patient:', isValid ? '✓' : '✗');

  // Invalid patient (missing last name)
  const invalidPatient = {
    firstName: 'Invalid',
    // lastName is missing
    gender: 'F',
    birthDate: '1990-01-01',
  };

  const fhirInvalid = patientConverter.toFHIR(invalidPatient);
  const { valid: isInvalid, errors: invalidErrors } = patientConverter.validate(fhirInvalid);
  console.log('\nInvalid patient:', isInvalid ? '✓' : '✗');
  if (invalidErrors.length > 0) {
    console.log('Errors:');
    invalidErrors.forEach((err) => console.log('  -', err));
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('=== EHR Bridge SDK - MongoDB Integration Example ===\n');

  // Run all examples
  patientConverter.toFHIR(mongoPatient);
  customMappingExample();
  convertFhirToMongo();
  await convertPatientsInBatch();
  validationExample();
  await apiOperationsExample();

  console.log('\n=== MongoDB → FHIR Integration Complete ===');
  console.log('Ready to sync patients with DrDoGood!');
}

main().catch(console.error);

export {
  patientConverter,
  appointmentConverter,
  bridge,
  mongoPatient,
  fhirPatient,
};
