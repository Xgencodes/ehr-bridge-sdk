import { Appointment as FHIRAppointment } from '@medplum/fhirtypes';
import { BaseConverter, ValidationResult } from './converter.interface';
import { FieldMapping, DEFAULT_MAPPINGS, DatabaseType } from '../types/database';

export interface DatabaseAppointment {
  [key: string]: any;
  status?: string;
  start_time?: string | Date;
  startTime?: string | Date;
  end_time?: string | Date;
  endTime?: string | Date;
  reason_for_visit?: string;
  reasonForVisit?: string;
  doctor_id?: string;
  doctorId?: string;
  patient_id?: string;
  patientId?: string;
  notes?: string;
}

export class AppointmentConverter extends BaseConverter<DatabaseAppointment, FHIRAppointment> {
  readonly resourceType = 'Appointment';

  protected defaultMapping: FieldMapping = DEFAULT_MAPPINGS.mysql.appointment;

  constructor(dbType: DatabaseType = DatabaseType.MYSQL) {
    super();
    if (dbType === DatabaseType.MONGODB) {
      this.defaultMapping = DEFAULT_MAPPINGS.mongodb.appointment;
    } else {
      this.defaultMapping = DEFAULT_MAPPINGS.mysql.appointment;
    }
  }

  toFHIR(appointment: DatabaseAppointment, fieldMapping?: FieldMapping): FHIRAppointment {
    const mapping = this.mergeMapping(fieldMapping);

    const status = this.getFieldValue(appointment, mapping['status']) || 'proposed';
    const startTime = this.getFieldValue(appointment, mapping['start']);
    const endTime = this.getFieldValue(appointment, mapping['end']);
    const reason = this.getFieldValue(appointment, mapping['reason']);
    const doctorId = this.getFieldValue(appointment, mapping['participantDoctor']);
    const patientId = this.getFieldValue(appointment, mapping['participantPatient']);

    // Build participants first - required in FHIR
    const participants: any[] = [];
    if (patientId) {
      participants.push({
        actor: { reference: `Patient/${patientId}`, display: patientId },
        status: 'accepted',
      });
    }
    if (doctorId) {
      participants.push({
        actor: { reference: `Practitioner/${doctorId}`, display: doctorId },
        status: 'accepted',
      });
    }

    const fhir: FHIRAppointment = {
      resourceType: 'Appointment',
      status: this.normalizeStatus(status) as any,
      participant: participants.length > 0 ? participants : [{ status: 'needs-action' }],
    };

    // Slot times
    if (startTime) {
      fhir.start = new Date(startTime).toISOString();
    }
    if (endTime) {
      fhir.end = new Date(endTime).toISOString();
    }

    // Reason code
    if (reason) {
      fhir.reasonCode = [{ text: reason }];
    }

    return fhir;
  }

  fromFHIR(fhir: FHIRAppointment, fieldMapping?: FieldMapping): Partial<DatabaseAppointment> {
    const mapping = this.mergeMapping(fieldMapping);

    const result: Partial<DatabaseAppointment> = {};

    if (fhir.status) {
      result[mapping['status']] = fhir.status;
    }

    if (fhir.start) {
      result[mapping['start']] = fhir.start;
    }

    if (fhir.end) {
      result[mapping['end']] = fhir.end;
    }

    if (fhir.reasonCode?.[0]?.text) {
      result[mapping['reason']] = fhir.reasonCode[0].text;
    }

    // Extract doctor and patient from participants
    const doctorParticipant = fhir.participant?.find((p) =>
      p.actor?.reference?.startsWith('Practitioner/'),
    );
    const patientParticipant = fhir.participant?.find((p) =>
      p.actor?.reference?.startsWith('Patient/'),
    );

    if (doctorParticipant?.actor?.reference) {
      const doctorId = doctorParticipant.actor.reference.replace('Practitioner/', '');
      result[mapping['participantDoctor']] = doctorId;
    }

    if (patientParticipant?.actor?.reference) {
      const patientId = patientParticipant.actor.reference.replace('Patient/', '');
      result[mapping['participantPatient']] = patientId;
    }

    return result;
  }

  validate(fhir: FHIRAppointment): ValidationResult {
    const errors: string[] = [];

    if (!fhir.status) {
      errors.push('Status is required');
    }
    if (!fhir.start) {
      errors.push('Start time is required');
    }
    if (!fhir.end) {
      errors.push('End time is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private normalizeStatus(
    status: string,
  ): 'proposed' | 'pending' | 'booked' | 'arrived' | 'fulfilled' | 'cancelled' | 'noshow' {
    const s = status.toLowerCase();
    if (['proposed', 'pending', 'booked', 'arrived', 'fulfilled', 'cancelled', 'noshow'].includes(s)) {
      return s as any;
    }
    return 'proposed';
  }

  private getFieldValue(obj: DatabaseAppointment, fieldName: string | undefined): any {
    if (!fieldName) return undefined;
    if (fieldName in obj) return obj[fieldName];

    const variations: Record<string, string[]> = {
      start_time: ['start_time', 'startTime', 'start'],
      startTime: ['startTime', 'start_time', 'start'],
      end_time: ['end_time', 'endTime', 'end'],
      endTime: ['endTime', 'end_time', 'end'],
      reason_for_visit: ['reason_for_visit', 'reasonForVisit', 'reason'],
      reasonForVisit: ['reasonForVisit', 'reason_for_visit', 'reason'],
      doctor_id: ['doctor_id', 'doctorId', 'doctor'],
      doctorId: ['doctorId', 'doctor_id', 'doctor'],
      patient_id: ['patient_id', 'patientId', 'patient'],
      patientId: ['patientId', 'patient_id', 'patient'],
    };

    if (variations[fieldName]) {
      for (const alt of variations[fieldName]) {
        if (alt in obj && obj[alt]) {
          return obj[alt];
        }
      }
    }

    return undefined;
  }
}
