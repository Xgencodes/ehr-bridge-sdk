import { Appointment as FHIRAppointment } from '@medplum/fhirtypes';
import { BaseConverter, ValidationResult } from '../converter.interface';
import { FieldMapping, DEFAULT_MAPPINGS } from '../../types/database';

export interface FirestoreAppointment {
  [key: string]: any;
  status?: string;
  appointmentStart?: string | Date;
  appointmentEnd?: string | Date;
  visitReason?: string;
  doctorId?: string;
  patientId?: string;
}

export class FirestoreAppointmentConverter extends BaseConverter<
  FirestoreAppointment,
  FHIRAppointment
> {
  readonly resourceType = 'Appointment';

  protected defaultMapping: FieldMapping = DEFAULT_MAPPINGS.firestore.appointment;

  toFHIR(appointment: FirestoreAppointment, fieldMapping?: FieldMapping): FHIRAppointment {
    const mapping = this.mergeMapping(fieldMapping);

    const status = this.getFieldValue(appointment, mapping['status']) || 'proposed';
    const startTime = this.getFieldValue(appointment, mapping['start']);
    const endTime = this.getFieldValue(appointment, mapping['end']);
    const reason = this.getFieldValue(appointment, mapping['reason']);
    const doctorId = this.getFieldValue(appointment, mapping['participantDoctor']);
    const patientId = this.getFieldValue(appointment, mapping['participantPatient']);

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

    if (startTime) {
      fhir.start = new Date(startTime).toISOString();
    }
    if (endTime) {
      fhir.end = new Date(endTime).toISOString();
    }

    if (reason) {
      fhir.reasonCode = [{ text: reason }];
    }

    return fhir;
  }

  fromFHIR(
    fhir: FHIRAppointment,
    fieldMapping?: FieldMapping,
  ): Partial<FirestoreAppointment> {
    const mapping = this.mergeMapping(fieldMapping);

    const result: Partial<FirestoreAppointment> = {};

    if (fhir.status) {
      result[mapping['status'] as string] = fhir.status;
    }

    if (fhir.start) {
      result[mapping['start'] as string] = fhir.start;
    }

    if (fhir.end) {
      result[mapping['end'] as string] = fhir.end;
    }

    if (fhir.reasonCode?.[0]?.text) {
      result[mapping['reason'] as string] = fhir.reasonCode[0].text;
    }

    const doctorParticipant = fhir.participant?.find((p) =>
      p.actor?.reference?.startsWith('Practitioner/'),
    );
    const patientParticipant = fhir.participant?.find((p) =>
      p.actor?.reference?.startsWith('Patient/'),
    );

    if (doctorParticipant?.actor?.reference) {
      const doctorId = doctorParticipant.actor.reference.replace('Practitioner/', '');
      result[mapping['participantDoctor'] as string] = doctorId;
    }

    if (patientParticipant?.actor?.reference) {
      const patientId = patientParticipant.actor.reference.replace('Patient/', '');
      result[mapping['participantPatient'] as string] = patientId;
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

  private getFieldValue(obj: FirestoreAppointment, fieldName: string | undefined): any {
    if (!fieldName) return undefined;
    if (fieldName in obj) return obj[fieldName];

    const variations: Record<string, string[]> = {
      appointmentStart: ['appointmentStart', 'start_time', 'startTime', 'start'],
      start: ['appointmentStart', 'start_time', 'startTime'],
      appointmentEnd: ['appointmentEnd', 'end_time', 'endTime', 'end'],
      end: ['appointmentEnd', 'end_time', 'endTime'],
      visitReason: ['visitReason', 'reason', 'reasonForVisit', 'reason_for_visit'],
      reason: ['visitReason', 'reason', 'reasonForVisit', 'reason_for_visit'],
      doctorId: ['doctorId', 'doctor_id', 'doctor'],
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
