/**
 * Example: Google Cloud Firestore to FHIR Integration with EHR Bridge SDK
 *
 * This example shows how a healthcare system using Firestore (Google's NoSQL database)
 * can convert patient and clinical data to FHIR format and sync with DrDoGood.
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
const PARTNER_ID = process.env.PARTNER_ID || 'firestore-healthcare';
const PARTNER_SECRET = process.env.PARTNER_SECRET || 'your-secret-key';

// Initialize the client
const bridge = new EHRBridgeClient({
  bridgeUrl: BRIDGE_URL,
  partnerId: PARTNER_ID,
  partnerSecret: PARTNER_SECRET,
});

// Initialize converters for Firestore (camelCase field names)
const patientConverter = new PatientConverter(DatabaseType.FIRESTORE);
const appointmentConverter = new AppointmentConverter(DatabaseType.FIRESTORE);
const observationConverter = new ObservationConverter(DatabaseType.FIRESTORE);
const medicationConverter = new MedicationConverter(DatabaseType.FIRESTORE);

// Alternative: Use ConverterRegistry
const registry = new ConverterRegistry(DatabaseType.FIRESTORE);

// ============================================================================
// 2. FIRESTORE DOCUMENT EXAMPLES
// ============================================================================

// Firestore patient document (collection: patients/)
const firestorePatient = {
  docId: 'patient_fs_001',
  firstName: 'Elena',
  lastName: 'Rodriguez',
  gender: 'female',
  dateOfBirth: new Date('1992-06-14'),
  phoneNumber: '+34-91-123-4567',
  emailAddress: 'elena@hospital.es',
  medicalRecordNumber: 'MRN-FS-001',
  membershipId: 'MEM-FS-101',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date(),
  active: true,
};

// Firestore appointment document (sub-collection: patients/{id}/appointments/)
const firestoreAppointment = {
  docId: 'appointment_fs_001',
  status: 'booked',
  appointmentStart: new Date('2025-01-25T10:30:00Z'),
  appointmentEnd: new Date('2025-01-25T11:00:00Z'),
  visitReason: 'Cardiology consultation follow-up',
  doctorId: 'doctor_fs_001',
  patientId: 'patient_fs_001',
  location: 'Cardiac Care Center',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Firestore observation document (sub-collection: patients/{id}/observations/)
const firestoreObservation = {
  docId: 'observation_fs_001',
  observationCode: 'blood_pressure',
  observationValue: '138/85',
  measurementUnit: 'mmHg',
  observedAt: new Date('2025-01-15T14:00:00Z'),
  status: 'final',
  patientId: 'patient_fs_001',
  takenBy: 'nurse_fs_001',
};

// Firestore medication document (sub-collection: patients/{id}/medications/)
const firestoreMedication = {
  docId: 'medication_fs_001',
  medicationName: 'Atenolol',
  doseAmount: 50,
  doseUnit: 'mg',
  dosageFrequency: 'OD',
  durationDays: 180,
  status: 'active',
  patientId: 'patient_fs_001',
  prescribedAt: new Date('2024-12-01'),
};

// ============================================================================
// 3. CONVERSION EXAMPLES
// ============================================================================

function demonstratePatientConversion(): void {
  console.log('--- Firestore Patient Document Conversion ---');

  const fhirPatient = patientConverter.toFHIR(firestorePatient);
  console.log('✓ Converted Firestore document to FHIR Patient');
  console.log('  Name:', fhirPatient.name?.[0]?.given?.[0], fhirPatient.name?.[0]?.family);
  console.log('  Gender:', fhirPatient.gender);
  console.log('  DOB:', fhirPatient.birthDate);
  console.log('  MRN:', fhirPatient.identifier?.[0]?.value);

  const { valid, errors } = patientConverter.validate(fhirPatient);
  console.log('  Validation:', valid ? '✓ Valid' : '✗ Invalid');
  if (errors.length > 0) {
    errors.forEach((e) => console.log('    -', e));
  }
}

function demonstrateAppointmentConversion(): void {
  console.log('\n--- Firestore Appointment Document Conversion ---');

  const fhirAppointment = appointmentConverter.toFHIR(firestoreAppointment);
  console.log('✓ Converted Firestore appointment to FHIR Appointment');
  console.log('  Status:', fhirAppointment.status);
  console.log('  Start:', fhirAppointment.start?.split('T')[0]);
  console.log('  Reason:', fhirAppointment.reasonCode?.[0]?.text);
  console.log('  Participants:', fhirAppointment.participant?.length);
}

function demonstrateObservationConversion(): void {
  console.log('\n--- Firestore Observation Document Conversion ---');

  const fhirObservation = observationConverter.toFHIR(firestoreObservation);
  console.log('✓ Converted Firestore observation to FHIR Observation');
  console.log('  Code:', fhirObservation.code?.text);
  console.log('  Status:', fhirObservation.status);
  console.log('  Value:', fhirObservation.valueString);
  console.log('  Recorded:', fhirObservation.effectiveDateTime?.split('T')[0]);
}

function demonstrateMedicationConversion(): void {
  console.log('\n--- Firestore Medication Document Conversion ---');

  const fhirMedication = medicationConverter.toFHIR(firestoreMedication);
  console.log('✓ Converted Firestore medication to FHIR MedicationRequest');
  console.log('  Medication:', fhirMedication.medicationCodeableConcept?.text);
  console.log('  Status:', fhirMedication.status);
  console.log('  Dose:', fhirMedication.dosageInstruction?.[0]?.doseAndRate?.[0]?.doseQuantity?.value);
  console.log('  Unit:', fhirMedication.dosageInstruction?.[0]?.doseAndRate?.[0]?.doseQuantity?.unit);
}

// ============================================================================
// 4. FIRESTORE-SPECIFIC PATTERNS
// ============================================================================

function demonstrateFirestoreSubcollections(): void {
  console.log('\n--- Firestore Sub-collection Pattern ---');

  // In Firestore, related data is often stored in sub-collections
  // Example: patients/{patientId}/appointments/{appointmentId}

  const patientData = {
    firstName: 'Carlos',
    lastName: 'Sanchez',
    gender: 'male',
    dateOfBirth: '1970-03-20',
    phoneNumber: '+34-93-456-7890',
    emailAddress: 'carlos@example.com',
  };

  // Sub-collection data (automatically includes patientId from parent)
  const subCollectionAppointment = {
    status: 'booked',
    appointmentStart: new Date('2025-02-01T15:00:00Z'),
    appointmentEnd: new Date('2025-02-01T15:45:00Z'),
    visitReason: 'Blood pressure check',
    doctorId: 'doctor_fs_002',
    // patientId is implicit from the path: patients/patient_fs_001/appointments/appt_001
  };

  console.log('✓ Firestore sub-collection pattern explained');
  console.log('  Collection path: patients/{patientId}/appointments/{appointmentId}');
  console.log('  Patient data:', Object.keys(patientData));
  console.log('  Appointment data:', Object.keys(subCollectionAppointment));
}

function demonstrateTimestamps(): void {
  console.log('\n--- Firestore Timestamps ---');

  // Firestore has special Timestamp types
  const firestoreDoc = {
    name: 'Test Patient',
    createdAt: new Date('2024-01-15T10:30:00Z'), // Can be Date or Firestore.Timestamp
    updatedAt: new Date(),
    // In Firestore client: admin.firestore.Timestamp.now()
  };

  const fhir = patientConverter.toFHIR(firestoreDoc);
  console.log('✓ Firestore timestamps handled correctly');
  console.log('  Date:', firestoreDoc.updatedAt);
  console.log('  Type:', typeof firestoreDoc.updatedAt);
}

// ============================================================================
// 5. BATCH READS FROM FIRESTORE
// ============================================================================

async function demonstrateBatchFirestoreRead(): Promise<void> {
  console.log('\n--- Batch Processing Firestore Documents ---');

  // Simulated batch of documents from Firestore patients collection
  const firestoreDocuments = [
    {
      docId: 'patient_fs_002',
      firstName: 'Pedro',
      lastName: 'Lopez',
      gender: 'male',
      dateOfBirth: new Date('1965-05-12'),
      phoneNumber: '+34-94-567-8901',
      emailAddress: 'pedro@example.com',
      medicalRecordNumber: 'MRN-FS-002',
      membershipId: 'MEM-FS-102',
    },
    {
      docId: 'patient_fs_003',
      firstName: 'Sofia',
      lastName: 'Garcia',
      gender: 'female',
      dateOfBirth: new Date('1988-09-24'),
      phoneNumber: '+34-95-678-9012',
      emailAddress: 'sofia@example.com',
      medicalRecordNumber: 'MRN-FS-003',
      membershipId: 'MEM-FS-103',
    },
  ];

  // Convert all documents
  const fhirPatients = firestoreDocuments
    .map((doc) => patientConverter.toFHIR(doc))
    .filter((fhir) => {
      const { valid } = patientConverter.validate(fhir);
      return valid;
    });

  console.log(`✓ Processed ${firestoreDocuments.length} Firestore documents`);
  console.log(`  Valid FHIR patients: ${fhirPatients.length}`);
}

// ============================================================================
// 6. CUSTOM FIELD MAPPING
// ============================================================================

function customFieldMappingExample(): void {
  console.log('\n--- Custom Field Mapping ---');

  // Different Firestore schema with custom field names
  const customDoc = {
    id: 'cust_patient_001',
    fullName: 'Juan Martinez',
    givenName: 'Juan',
    familyName: 'Martinez',
    sex: 'M',
    birth: new Date('1980-12-30'),
    mobile: '+34-96-789-0123',
    work_email: 'juan@company.es',
  };

  const customMapping = {
    firstName: 'givenName',
    lastName: 'familyName',
    gender: 'sex',
    birthDate: 'birth',
    phone: 'mobile',
    email: 'work_email',
  };

  const fhir = patientConverter.toFHIR(customDoc, customMapping);
  console.log('✓ Custom field mapping applied');
  console.log('  Custom field "givenName":', customDoc.givenName, '→', fhir.name?.[0]?.given?.[0]);
}

// ============================================================================
// 7. RECEIVING FHIR AND STORING IN FIRESTORE
// ============================================================================

function convertFhirToFirestore(): void {
  console.log('\n--- Converting FHIR Back to Firestore Format ---');

  // FHIR Patient received from another system
  const receivedFhir = {
    resourceType: 'Patient' as const,
    id: 'ddg-patient-999',
    name: [{ given: ['Antonio'], family: 'Diaz' }],
    gender: 'male',
    birthDate: '1975-08-18',
    telecom: [
      { system: 'phone' as const, value: '+34-97-890-1234' },
      { system: 'email' as const, value: 'antonio@example.com' },
    ],
  };

  // Convert to Firestore format
  const firestoreDoc = patientConverter.fromFHIR(receivedFhir);
  console.log('✓ Converted FHIR to Firestore format');

  // Ready to store in Firestore
  const docToStore = {
    ...firestoreDoc,
    docId: receivedFhir.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    source: 'ehr-bridge',
    syncedAt: new Date(),
  };

  console.log('  Document ready for Firestore storage');
  console.log('  First name:', docToStore.firstName);
  console.log('  Synced at:', docToStore.syncedAt);
}

// ============================================================================
// 8. USING CONVERTER REGISTRY
// ============================================================================

function demonstrateRegistry(): void {
  console.log('\n--- Using ConverterRegistry for Firestore ---');

  console.log('✓ Registry configured for:', registry.getDatabaseType());
  console.log('  Supported resource types:', registry.getSupportedResourceTypes());

  // Get any converter dynamically
  const converter = registry.getConverter('Patient');
  if (converter) {
    const fhir = converter.toFHIR(firestorePatient);
    console.log('  Converted patient:', fhir.name?.[0]?.family);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('=== EHR Bridge SDK - Google Cloud Firestore Integration Example ===\n');

  demonstratePatientConversion();
  demonstrateAppointmentConversion();
  demonstrateObservationConversion();
  demonstrateMedicationConversion();
  demonstrateFirestoreSubcollections();
  demonstrateTimestamps();
  await demonstrateBatchFirestoreRead();
  customFieldMappingExample();
  convertFhirToFirestore();
  demonstrateRegistry();

  console.log('\n=== Firestore → FHIR Integration Complete ===');
  console.log('Ready to sync Firestore data with DrDoGood!');
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
