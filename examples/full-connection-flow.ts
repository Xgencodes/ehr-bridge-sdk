/**
 * Example: Complete Connection Flow with EHR Bridge SDK
 *
 * This example demonstrates the full workflow:
 * 1. Initiate connection with another partner
 * 2. Get connection status and retrieve token
 * 3. Assign patients using the token
 * 4. Confirm/deny a connection request from another partner
 */

import {
  EHRBridgeClient,
  PatientConverter,
  DatabaseType,
} from '@ehr-bridge/sdk';

// ============================================================================
// CONFIGURATION
// ============================================================================

const BRIDGE_URL = process.env.EHR_BRIDGE_URL || 'https://ehr-bridge.example.com';
const YOUR_PARTNER_ID = process.env.PARTNER_ID || 'epic-hospital';
const YOUR_PARTNER_SECRET = process.env.PARTNER_SECRET || 'your-secret-key';

const bridge = new EHRBridgeClient({
  bridgeUrl: BRIDGE_URL,
  partnerId: YOUR_PARTNER_ID,
  partnerSecret: YOUR_PARTNER_SECRET,
});

const patientConverter = new PatientConverter(DatabaseType.MYSQL);

// ============================================================================
// FLOW A: INITIATE CONNECTION (YOUR SYSTEM → PARTNER SYSTEM)
// ============================================================================

/**
 * Step 1: Initiate a connection request to another partner
 * This is typically when a doctor in your system wants to connect to another EHR.
 */
async function flowA_initiateConnection(
  partnerId: string,
  doctorId: string,
  doctorEmail: string,
) {
  console.log('=== FLOW A: Initiate Connection (Your System → Partner) ===\n');
  console.log(`Initiating connection for doctor: ${doctorEmail}`);

  try {
    const result = await bridge.initiateConnection({
      doctorIdentifier: doctorEmail,
      identifierType: 'email',
      ehrSystemId: partnerId, // Partner ID you want to connect to
      callbackUrl: 'https://your-hospital.com/webhooks/ehr-bridge',
    });

    if (result.status === 'SUCCESS') {
      const connectionId = result.data?.connectionId;
      console.log('✓ Connection request initiated');
      console.log(`  Connection ID: ${connectionId}`);
      console.log(`  State: ${result.data?.state}`);
      console.log(`  Expires at: ${result.data?.expiresAt}`);
      console.log('\n→ Partner system must now approve this connection\n');

      return connectionId;
    } else {
      console.error('✗ Failed to initiate connection:', result.message);
      return null;
    }
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

/**
 * Step 2: Poll connection status until it's approved
 */
async function flowA_pollConnectionStatus(connectionId: string) {
  console.log('=== Polling Connection Status ===\n');

  let maxAttempts = 5;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;
    console.log(`Checking status (attempt ${attempt}/${maxAttempts})...`);

    try {
      const status = await bridge.getConnectionStatus(connectionId);

      if (status.status === 'SUCCESS') {
        console.log(`  Current state: ${status.data?.state}`);

        if (status.data?.state === 'ACTIVE') {
          console.log('✓ Connection approved!');
          console.log(`  Connection Token: ${status.data?.connectionToken?.substring(0, 10)}...`);
          return status.data?.connectionToken;
        } else if (status.data?.state === 'EXPIRED') {
          console.error('✗ Connection request expired');
          return null;
        }
      }

      // Wait 5 seconds before next poll
      if (attempt < maxAttempts) {
        console.log('  Waiting 5 seconds...\n');
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.error('  Error checking status:', error);
    }
  }

  console.error('✗ Connection approval timed out');
  return null;
}

/**
 * Step 3: Assign patients once connection is active
 */
async function flowA_assignPatients(
  connectionToken: string,
  patients: any[],
) {
  console.log('=== Assigning Patients ===\n');

  bridge.setConnectionToken(connectionToken);

  for (const patient of patients) {
    try {
      const fhirPatient = patientConverter.toFHIR(patient);
      const { valid, errors } = patientConverter.validate(fhirPatient);

      if (!valid) {
        console.error(`✗ Patient ${patient.first_name} is invalid:`, errors);
        continue;
      }

      const result = await bridge.assignPatient({
        ehrPatientId: patient.id,
        patient: fhirPatient,
      });

      if (result.status === 'SUCCESS') {
        console.log(`✓ Patient assigned: ${patient.first_name} ${patient.last_name}`);
        console.log(`  Remote ID: ${result.data?.respondingPatientId}`);
        console.log(`  Match type: ${result.data?.matchType}\n`);
      } else {
        console.error(`✗ Failed to assign ${patient.first_name}:`, result.message);
      }
    } catch (error) {
      console.error(`Error assigning ${patient.first_name}:`, error);
    }
  }
}

// ============================================================================
// FLOW B: RESPOND TO CONNECTION REQUEST (PARTNER → YOUR SYSTEM)
// ============================================================================

/**
 * Step 1: Receive webhook from partner (see webhook handler below)
 * Partner calls: POST /your-webhook-endpoint
 * with event: "connection.requested"
 *
 * Step 2: Verify and approve the connection
 */
async function flowB_confirmConnection(connectionId: string, doctorId: string) {
  console.log('\n=== FLOW B: Confirm Connection Request ===\n');
  console.log(`Approving connection: ${connectionId}`);

  try {
    const result = await bridge.confirmConnection(connectionId, {
      approved: true,
      respondingDoctorId: doctorId,
      callbackUrl: 'https://your-hospital.com/webhooks/ehr-bridge',
    });

    if (result.status === 'SUCCESS') {
      const token = result.data?.connectionToken;
      console.log('✓ Connection approved');
      console.log(`  Connection ID: ${result.data?.connectionId}`);
      console.log(`  State: ${result.data?.state}`);
      console.log(`  Token: ${token?.substring(0, 10)}...`);

      return token;
    } else {
      console.error('✗ Failed to confirm connection:', result.message);
      return null;
    }
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
}

/**
 * Step 2: Wait for partner to push patients
 * Partner will call: POST /v1/patients/assign
 * with your connection token
 */
async function flowB_receivePatients() {
  console.log('\n=== Waiting for Patient Assignments ===\n');
  console.log('Partner system will now push patients to your system via webhook');
  console.log('Your webhook endpoint should:');
  console.log('  1. Verify the X-DDG-Signature header');
  console.log('  2. Convert FHIR patient to your database format');
  console.log('  3. Insert into your patients table');
}

// ============================================================================
// WEBHOOK HANDLERS (Server-side)
// ============================================================================

/**
 * Handle incoming webhooks from the EHR Bridge
 * This would be implemented as a Cloud Function or Express endpoint
 */
export function createWebhookHandler(partnerSecret: string) {
  return (req: any, res: any) => {
    const signature = req.headers['x-ehr-bridge-signature'] as string;
    const event = req.headers['x-ehr-event'] as string;
    const body = JSON.stringify(req.body);

    // Verify signature
    const expectedSig = require('crypto')
      .createHmac('sha256', partnerSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSig) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    console.log(`\n📥 Received webhook event: ${event}`);

    switch (event) {
      case 'connection.requested':
        console.log('Partner wants to connect - requires approval');
        console.log('  Doctor:', req.body.doctorMemberId);
        console.log('  From:', req.body.connectionId);
        return res.status(200).json({ received: true });

      case 'patient.assigned':
        console.log('Patient was assigned to connected doctor');
        console.log('  Patient:', req.body.data.initiatingPatientId);
        return res.status(200).json({ received: true });

      case 'connection.approved':
        console.log('Your connection request was approved!');
        console.log('  Token:', req.body.connectionToken?.substring(0, 10) + '...');
        return res.status(200).json({ received: true });

      default:
        console.log('Unknown event:', event);
        return res.status(400).json({ error: 'Unknown event' });
    }
  };
}

// ============================================================================
// EXAMPLE DATA
// ============================================================================

const examplePatients = [
  {
    id: 'PAT-001',
    first_name: 'John',
    last_name: 'Doe',
    gender: 'M',
    dob: '1980-01-15',
    phone_number: '+1234567890',
    email_address: 'john@example.com',
    medical_record_number: 'MRN-001',
  },
  {
    id: 'PAT-002',
    first_name: 'Jane',
    last_name: 'Smith',
    gender: 'F',
    dob: '1990-05-20',
    phone_number: '+1555123456',
    email_address: 'jane@example.com',
    medical_record_number: 'MRN-002',
  },
];

// ============================================================================
// COMPLETE WORKFLOW
// ============================================================================

async function completeWorkflow() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          EHR Bridge SDK - Complete Connection Flow         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // FLOW A: Your system initiates connection to DrDoGood
  console.log('\n┌─ SCENARIO 1: Your hospital initiates connection ──┐\n');

  const connectionId = await flowA_initiateConnection(
    'drdogood-platform', // Partner system you want to connect to
    'doctor-123', // Your doctor ID
    'dr.kwame@hospital.com', // Doctor's email
  );

  if (connectionId) {
    // Poll until approved
    const token = await flowA_pollConnectionStatus(connectionId);

    if (token) {
      // Assign some patients
      await flowA_assignPatients(token, examplePatients);
    }
  }

  // FLOW B: DrDoGood initiates connection to your hospital
  console.log('\n┌─ SCENARIO 2: DrDoGood initiates connection ──────┐\n');
  console.log('Simulating incoming connection.requested webhook...\n');

  const flowBConnectionId = 'conn_incoming_123';
  const flowBToken = await flowB_confirmConnection(flowBConnectionId, 'doctor-456');

  if (flowBToken) {
    await flowB_receivePatients();
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              Connection Flow Complete!                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
}

// ============================================================================
// QUICK REFERENCE
// ============================================================================

function printQuickReference() {
  console.log('\n' + '═'.repeat(60));
  console.log('QUICK REFERENCE - Connection Flow Steps');
  console.log('═'.repeat(60));

  console.log('\nFLOW A: YOUR SYSTEM → PARTNER SYSTEM');
  console.log('1. bridge.initiateConnection(doctorEmail, partnerId)');
  console.log('2. bridge.getConnectionStatus(connectionId) [polling]');
  console.log('3. Receive connectionToken');
  console.log('4. bridge.setConnectionToken(token)');
  console.log('5. bridge.assignPatient(ehrPatientId, fhirPatient)');

  console.log('\nFLOW B: PARTNER SYSTEM → YOUR SYSTEM');
  console.log('1. Receive webhook: connection.requested');
  console.log('2. Verify webhook signature');
  console.log('3. bridge.confirmConnection(connectionId, doctorId)');
  console.log('4. Save returned connectionToken');
  console.log('5. Partner calls your API with token');
  console.log('6. Handle incoming patient.assigned webhooks');

  console.log('\n' + '═'.repeat(60));
}

// ============================================================================
// MAIN
// ============================================================================

if (require.main === module) {
  completeWorkflow()
    .then(() => {
      printQuickReference();
    })
    .catch(console.error);
}

export {
  flowA_initiateConnection,
  flowA_pollConnectionStatus,
  flowA_assignPatients,
  flowB_confirmConnection,
  flowB_receivePatients,
  createWebhookHandler,
};
