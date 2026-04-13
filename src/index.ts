/**
 * EHR Bridge SDK - Complete toolkit for EHR integration
 *
 * Usage:
 * ```
 * import { EHRBridgeClient, PatientConverter } from '@ehr-bridge/sdk';
 * import { DatabaseType } from '@ehr-bridge/sdk';
 *
 * // Initialize client
 * const bridge = new EHRBridgeClient({
 *   bridgeUrl: 'https://ehr-bridge.app',
 *   partnerId: 'your-partner-key',
 *   partnerSecret: 'your-partner-secret',
 * });
 *
 * // Initialize converter
 * const converter = new PatientConverter(DatabaseType.MYSQL);
 *
 * // Convert your data to FHIR
 * const fhirPatient = converter.toFHIR(yourMySQLPatient);
 *
 * // Validate
 * const { valid, errors } = converter.validate(fhirPatient);
 * if (!valid) throw new Error(errors.join(', '));
 *
 * // Send to Bridge
 * const result = await bridge.assignPatient({
 *   ehrPatientId: 'your-patient-id',
 *   patient: fhirPatient,
 * });
 * ```
 */

// Export client
export { EHRBridgeClient } from './client';
export type {
  EHRBridgeClientConfig,
  AssignPatientResponse,
  InitiateConnectionResponse,
  ConfirmConnectionResponse,
} from './client';

// Export converters
export {
  ConverterRegistry,
  PatientConverter,
  AppointmentConverter,
  ObservationConverter,
  MedicationConverter,
} from './converters';
export { IConverter, BaseConverter } from './converters';
export type {
  DatabasePatient,
  DatabaseAppointment,
  DatabaseObservation,
  DatabaseMedication,
} from './converters';
export type { ValidationResult } from './converters';

// Export database types and mappings
export { DatabaseType, SUPPORTED_DATABASES, DEFAULT_MAPPINGS } from './types/database';
export type { DatabaseMapping, FieldMapping } from './types/database';

// Export utilities
export { HMACUtil } from './common/hmac.util';

// Re-export FHIR types from @medplum
export type {
  Patient as FHIRPatient,
  Appointment as FHIRAppointment,
  Observation as FHIRObservation,
  MedicationRequest as FHIRMedicationRequest,
} from '@medplum/fhirtypes';

// Version
export const VERSION = '0.1.0';
