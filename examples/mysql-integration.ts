/**
 * Example: MySQL to FHIR Integration with EHR Bridge SDK
 *
 * This example shows how a healthcare system using MySQL can convert patient data
 * to FHIR format and sync with DrDoGood via the EHR Bridge.
 */

import {
  EHRBridgeClient,
  PatientConverter,
  DatabaseType,
  HMACUtil,
} from '@ehr-bridge/sdk';

// ============================================================================
// 1. SETUP
// ============================================================================

// Configuration from environment
const BRIDGE_URL = process.env.EHR_BRIDGE_URL || 'https://ehr-bridge.example.com';
const PARTNER_ID = process.env.PARTNER_ID || 'epic-hospital';
const PARTNER_SECRET = process.env.PARTNER_SECRET || 'your-secret-key';

// Initialize the EHR Bridge client
const bridge = new EHRBridgeClient({
  bridgeUrl: BRIDGE_URL,
  partnerId: PARTNER_ID,
  partnerSecret: PARTNER_SECRET,
});

// Initialize the converter for MySQL patient format
const patientConverter = new PatientConverter(DatabaseType.MYSQL);

// ============================================================================
// 2. EXAMPLE: CONVERT YOUR MYSQL PATIENT TO FHIR
// ============================================================================

// Your patient record from MySQL database
const mysqlPatient = {
  first_name: 'John',
  last_name: 'Doe',
  gender: 'M',
  dob: '1980-01-15',
  phone_number: '+1234567890',
  email_address: 'john@example.com',
  medical_record_number: 'MRN-123456',
  member_id: 'MEMBER-789',
};

// Convert to FHIR
const fhirPatient = patientConverter.toFHIR(mysqlPatient);
console.log('Converted to FHIR:', JSON.stringify(fhirPatient, null, 2));

// Validate the FHIR resource
const { valid, errors } = patientConverter.validate(fhirPatient);
if (!valid) {
  console.error('FHIR validation failed:', errors);
  process.exit(1);
}
console.log('✓ FHIR Patient is valid');

// ============================================================================
// 3. EXAMPLE: CUSTOM FIELD MAPPING
// ============================================================================

// If your MySQL schema uses different field names, provide a custom mapping
const customMapping = {
  firstName: 'given_name',  // Your field name → FHIR path
  lastName: 'family_name',
  birthDate: 'date_of_birth',
  phone: 'mobile_number',
  email: 'work_email',
};

const mysqlPatientAlt = {
  given_name: 'Jane',
  family_name: 'Smith',
  gender: 'F',
  date_of_birth: '1990-05-20',
  mobile_number: '+1555123456',
  work_email: 'jane@hospital.com',
};

const fhirPatientAlt = patientConverter.toFHIR(mysqlPatientAlt, customMapping);
console.log('\n✓ Custom field mapping worked:', fhirPatientAlt.name?.[0]?.given?.[0]);

// ============================================================================
// 4. EXAMPLE: ASSIGN PATIENT TO A DOCTOR
// ============================================================================

async function assignPatientExample(
  connectionToken: string,
  ehrPatientId: string,
) {
  try {
    console.log('\n--- Assigning patient to doctor ---');

    const result = await bridge.assignPatient({
      ehrPatientId,
      patient: fhirPatient,
    });

    if (result.status === 'SUCCESS') {
      console.log('✓ Patient assigned successfully');
      console.log('  DDG Patient ID:', result.data?.respondingPatientId);
      console.log('  Match type:', result.data?.matchType);
    } else {
      console.error('✗ Assignment failed:', result.message);
    }
  } catch (error) {
    console.error('Error assigning patient:', error);
  }
}

// ============================================================================
// 5. EXAMPLE: ROUND-TRIP CONVERSION
// ============================================================================

function roundTripExample() {
  console.log('\n--- Round-trip conversion test ---');

  // Convert MySQL → FHIR → MySQL
  const original = {
    first_name: 'Test',
    last_name: 'User',
    gender: 'M',
    dob: '2000-01-01',
    phone_number: '+1234567890',
    email_address: 'test@example.com',
  };

  // MySQL → FHIR
  const fhir = patientConverter.toFHIR(original);
  console.log('✓ Converted MySQL → FHIR');

  // FHIR → MySQL
  const restored = patientConverter.fromFHIR(fhir);
  console.log('✓ Converted FHIR → MySQL');

  console.log('Original firstName:', original.first_name);
  console.log('Restored firstName:', restored.first_name);
  console.log('Match:', original.first_name === restored.first_name ? '✓' : '✗');
}

// ============================================================================
// 6. EXAMPLE: RECEIVING AND CONVERTING FHIR DATA
// ============================================================================

function receiveAndConvertExample() {
  console.log('\n--- Receiving FHIR data from Bridge ---');

  // FHIR Patient received from the Bridge (from another partner)
  const receivedFhirPatient = {
    resourceType: 'Patient' as const,
    id: 'ddg-pat-456',
    name: [{ given: ['Alice'], family: 'Johnson' }],
    gender: 'female',
    birthDate: '1985-06-10',
    telecom: [
      { system: 'phone' as const, value: '+1555999888' },
      { system: 'email' as const, value: 'alice@example.com' },
    ],
  };

  // Convert FHIR back to your MySQL format
  const mysqlFormat = patientConverter.fromFHIR(receivedFhirPatient);
  console.log('✓ Converted received FHIR → MySQL format');
  console.log('MySQL format:', mysqlFormat);
}

// ============================================================================
// 7. MAIN WORKFLOW
// ============================================================================

async function main() {
  console.log('=== EHR Bridge SDK - MySQL Integration Example ===\n');

  // Test conversions
  roundTripExample();
  receiveAndConvertExample();

  console.log('\n=== Setup Steps (in real usage) ===');
  console.log('1. Register your EHR system with the Bridge');
  console.log('2. Receive a partner ID and secret');
  console.log('3. Initialize the client (done above)');
  console.log('4. Convert your MySQL patients to FHIR');
  console.log('5. Call bridge.assignPatient() with connection token');

  console.log('\n=== Example Doctor Connection Flow ===');
  console.log('1. Doctor enters their DDG email in your EHR system');
  console.log('2. Call bridge.initiateConnection()');
  console.log('3. Doctor approves in DrDoGood app');
  console.log('4. You receive connectionToken');
  console.log('5. Use connectionToken to assign patients');
}

// Run examples
main().catch(console.error);

export {
  patientConverter,
  bridge,
  fhirPatient,
  mysqlPatient,
};
