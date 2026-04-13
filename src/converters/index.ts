import { PatientConverter } from './patient.converter';
import { AppointmentConverter } from './appointment.converter';
import { ObservationConverter } from './observation.converter';
import { MedicationConverter } from './medication.converter';
import { PostgresqlPatientConverter } from './postgresql/patient.converter';
import { PostgresqlAppointmentConverter } from './postgresql/appointment.converter';
import { PostgresqlObservationConverter } from './postgresql/observation.converter';
import { PostgresqlMedicationConverter } from './postgresql/medication.converter';
import { FirestorePatientConverter } from './firestore/patient.converter';
import { FirestoreAppointmentConverter } from './firestore/appointment.converter';
import { FirestoreObservationConverter } from './firestore/observation.converter';
import { FirestoreMedicationConverter } from './firestore/medication.converter';
import { IConverter } from './converter.interface';
import { DatabaseType } from '../types/database';

/**
 * Converter registry - get converters by FHIR resource type
 */
export class ConverterRegistry {
  private converters: Map<string, () => IConverter<any, any>> = new Map();
  private dbType: DatabaseType;

  constructor(dbType: DatabaseType = DatabaseType.MYSQL) {
    this.dbType = dbType;
    this.registerConverters(dbType);
  }

  private registerConverters(dbType: DatabaseType): void {
    switch (dbType) {
      case DatabaseType.POSTGRESQL:
        this.converters.set('Patient', () => new PostgresqlPatientConverter());
        this.converters.set('Appointment', () => new PostgresqlAppointmentConverter());
        this.converters.set('Observation', () => new PostgresqlObservationConverter());
        this.converters.set('MedicationRequest', () => new PostgresqlMedicationConverter());
        break;
      case DatabaseType.FIRESTORE:
        this.converters.set('Patient', () => new FirestorePatientConverter());
        this.converters.set('Appointment', () => new FirestoreAppointmentConverter());
        this.converters.set('Observation', () => new FirestoreObservationConverter());
        this.converters.set('MedicationRequest', () => new FirestoreMedicationConverter());
        break;
      case DatabaseType.MYSQL:
      case DatabaseType.MONGODB:
      default:
        // MySQL and MongoDB use the base converters with DatabaseType parameter
        this.converters.set('Patient', () => new PatientConverter(dbType));
        this.converters.set('Appointment', () => new AppointmentConverter(dbType));
        this.converters.set('Observation', () => new ObservationConverter(dbType));
        this.converters.set('MedicationRequest', () => new MedicationConverter(dbType));
        break;
    }
  }

  /**
   * Get a converter for a specific FHIR resource type
   */
  getConverter(resourceType: string): IConverter<any, any> | undefined {
    const factory = this.converters.get(resourceType);
    return factory ? factory() : undefined;
  }

  /**
   * List all supported resource types
   */
  getSupportedResourceTypes(): string[] {
    return Array.from(this.converters.keys());
  }

  /**
   * Register a custom converter
   */
  register(resourceType: string, factory: () => IConverter<any, any>): void {
    this.converters.set(resourceType, factory);
  }

  /**
   * Get the database type this registry is configured for
   */
  getDatabaseType(): DatabaseType {
    return this.dbType;
  }
}

// Export all converters
export { PatientConverter } from './patient.converter';
export { AppointmentConverter } from './appointment.converter';
export { ObservationConverter } from './observation.converter';
export { MedicationConverter } from './medication.converter';
export { PostgresqlPatientConverter } from './postgresql/patient.converter';
export { PostgresqlAppointmentConverter } from './postgresql/appointment.converter';
export { PostgresqlObservationConverter } from './postgresql/observation.converter';
export { PostgresqlMedicationConverter } from './postgresql/medication.converter';
export { FirestorePatientConverter } from './firestore/patient.converter';
export { FirestoreAppointmentConverter } from './firestore/appointment.converter';
export { FirestoreObservationConverter } from './firestore/observation.converter';
export { FirestoreMedicationConverter } from './firestore/medication.converter';
export { IConverter, BaseConverter, ValidationResult } from './converter.interface';
export type { DatabasePatient } from './patient.converter';
export type { DatabaseAppointment } from './appointment.converter';
export type { DatabaseObservation } from './observation.converter';
export type { DatabaseMedication } from './medication.converter';
export type { PostgresqlPatient } from './postgresql/patient.converter';
export type { PostgresqlAppointment } from './postgresql/appointment.converter';
export type { PostgresqlObservation } from './postgresql/observation.converter';
export type { PostgresqlMedication } from './postgresql/medication.converter';
export type { FirestorePatient } from './firestore/patient.converter';
export type { FirestoreAppointment } from './firestore/appointment.converter';
export type { FirestoreObservation } from './firestore/observation.converter';
export type { FirestoreMedication } from './firestore/medication.converter';
