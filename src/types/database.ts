/**
 * Supported database types and their default field mappings
 */

export enum DatabaseType {
  MYSQL = 'mysql',
  POSTGRESQL = 'postgresql',
  MONGODB = 'mongodb',
  MARIADB = 'mariadb',
  SQLSERVER = 'sqlserver',
  ORACLE = 'oracle',
  DYNAMODB = 'dynamodb',
  FIRESTORE = 'firestore',
  COUCHDB = 'couchdb',
}

export interface DatabaseMapping {
  name: string;
  dbType: DatabaseType;
  description: string;
  schemaType: 'relational' | 'document';
  status: 'stable' | 'beta' | 'planned';
  lastUpdated: string;
}

/**
 * Master list of supported databases
 * Add new databases here as converters are implemented
 */
export const SUPPORTED_DATABASES: Record<DatabaseType, DatabaseMapping> = {
  [DatabaseType.MYSQL]: {
    name: 'MySQL',
    dbType: DatabaseType.MYSQL,
    description: 'MySQL 5.7+',
    schemaType: 'relational',
    status: 'stable',
    lastUpdated: '2025-04-13',
  },
  [DatabaseType.POSTGRESQL]: {
    name: 'PostgreSQL',
    dbType: DatabaseType.POSTGRESQL,
    description: 'PostgreSQL 12+',
    schemaType: 'relational',
    status: 'stable',
    lastUpdated: '2025-04-13',
  },
  [DatabaseType.MONGODB]: {
    name: 'MongoDB',
    dbType: DatabaseType.MONGODB,
    description: 'MongoDB 4.0+',
    schemaType: 'document',
    status: 'stable',
    lastUpdated: '2025-04-13',
  },
  [DatabaseType.MARIADB]: {
    name: 'MariaDB',
    dbType: DatabaseType.MARIADB,
    description: 'MariaDB 10.5+',
    schemaType: 'relational',
    status: 'planned',
    lastUpdated: '2025-04-13',
  },
  [DatabaseType.SQLSERVER]: {
    name: 'SQL Server',
    dbType: DatabaseType.SQLSERVER,
    description: 'SQL Server 2019+',
    schemaType: 'relational',
    status: 'planned',
    lastUpdated: '2025-04-13',
  },
  [DatabaseType.ORACLE]: {
    name: 'Oracle Database',
    dbType: DatabaseType.ORACLE,
    description: 'Oracle 19c+',
    schemaType: 'relational',
    status: 'planned',
    lastUpdated: '2025-04-13',
  },
  [DatabaseType.DYNAMODB]: {
    name: 'Amazon DynamoDB',
    dbType: DatabaseType.DYNAMODB,
    description: 'AWS DynamoDB',
    schemaType: 'document',
    status: 'planned',
    lastUpdated: '2025-04-13',
  },
  [DatabaseType.FIRESTORE]: {
    name: 'Google Cloud Firestore',
    dbType: DatabaseType.FIRESTORE,
    description: 'Firestore',
    schemaType: 'document',
    status: 'stable',
    lastUpdated: '2025-04-13',
  },
  [DatabaseType.COUCHDB]: {
    name: 'Apache CouchDB',
    dbType: DatabaseType.COUCHDB,
    description: 'CouchDB 3.0+',
    schemaType: 'document',
    status: 'planned',
    lastUpdated: '2025-04-13',
  },
};

/**
 * Field mapping configuration for converters
 * Partners can override these defaults for their schema
 */
export interface FieldMapping {
  [fhirFieldPath: string]: string; // FHIR path → your database field
}

/**
 * Common field mappings for different database types
 */
export const DEFAULT_MAPPINGS = {
  mysql: {
    patient: {
      firstName: 'first_name',
      lastName: 'last_name',
      gender: 'gender',
      birthDate: 'dob',
      phone: 'phone_number',
      email: 'email_address',
      mrn: 'medical_record_number',
      memberId: 'member_id',
    },
    appointment: {
      status: 'status',
      start: 'start_time',
      end: 'end_time',
      reason: 'reason_for_visit',
      participantDoctor: 'doctor_id',
      participantPatient: 'patient_id',
    },
    observation: {
      code: 'code',
      value: 'value',
      unit: 'unit',
      effectiveDateTime: 'measurement_date',
      status: 'status',
    },
    medication: {
      code: 'drug_name',
      dosage: 'dose',
      unit: 'dose_unit',
      frequency: 'frequency',
      duration: 'duration_days',
      status: 'status',
    },
  },
  mongodb: {
    patient: {
      firstName: 'firstName',
      lastName: 'lastName',
      gender: 'gender',
      birthDate: 'dob',
      phone: 'phone',
      email: 'email',
      mrn: 'mrn',
      memberId: 'memberId',
    },
    appointment: {
      status: 'status',
      start: 'startTime',
      end: 'endTime',
      reason: 'reasonForVisit',
      participantDoctor: 'doctorId',
      participantPatient: 'patientId',
    },
    observation: {
      code: 'code',
      value: 'value',
      unit: 'unit',
      effectiveDateTime: 'measurementDate',
      status: 'status',
    },
    medication: {
      code: 'drugName',
      dosage: 'dose',
      unit: 'doseUnit',
      frequency: 'frequency',
      duration: 'durationDays',
      status: 'status',
    },
  },
  postgresql: {
    patient: {
      firstName: 'first_name',
      lastName: 'last_name',
      gender: 'gender',
      birthDate: 'date_of_birth',
      phone: 'phone_number',
      email: 'email_address',
      mrn: 'medical_record_number',
      memberId: 'member_id',
    },
    appointment: {
      status: 'status',
      start: 'appointment_start',
      end: 'appointment_end',
      reason: 'reason_for_visit',
      participantDoctor: 'doctor_id',
      participantPatient: 'patient_id',
    },
    observation: {
      code: 'observation_code',
      value: 'observation_value',
      unit: 'measurement_unit',
      effectiveDateTime: 'observed_at',
      status: 'status',
    },
    medication: {
      code: 'medication_name',
      dosage: 'dose_amount',
      unit: 'dose_unit',
      frequency: 'dosage_frequency',
      duration: 'duration_days',
      status: 'status',
    },
  },
  firestore: {
    patient: {
      firstName: 'firstName',
      lastName: 'lastName',
      gender: 'gender',
      birthDate: 'dateOfBirth',
      phone: 'phoneNumber',
      email: 'emailAddress',
      mrn: 'medicalRecordNumber',
      memberId: 'membershipId',
    },
    appointment: {
      status: 'status',
      start: 'appointmentStart',
      end: 'appointmentEnd',
      reason: 'visitReason',
      participantDoctor: 'doctorId',
      participantPatient: 'patientId',
    },
    observation: {
      code: 'observationCode',
      value: 'observationValue',
      unit: 'measurementUnit',
      effectiveDateTime: 'observedAt',
      status: 'status',
    },
    medication: {
      code: 'medicationName',
      dosage: 'doseAmount',
      unit: 'doseUnit',
      frequency: 'dosageFrequency',
      duration: 'durationDays',
      status: 'status',
    },
  },
};
