import axios, { AxiosInstance } from 'axios';
import { HMACUtil } from './common/hmac.util';
import { Patient as FHIRPatient } from '@medplum/fhirtypes';

export interface EHRBridgeClientConfig {
  bridgeUrl: string; // e.g., https://ehr-bridge.app
  partnerId: string;
  partnerSecret: string;
  connectionToken?: string; // Optional, for data operations
}

export interface AssignPatientResponse {
  status: 'SUCCESS' | 'Failed';
  data?: {
    initiatingPatientId: string;
    respondingPatientId: string;
    matchType: 'phone_exact' | 'email_exact' | 'name_dob' | 'manual' | 'new';
    isNewPatient: boolean;
  };
  code?: string;
  message?: string;
}

export interface InitiateConnectionResponse {
  status: 'SUCCESS' | 'Failed';
  data?: {
    connectionId: string;
    state: string;
    expiresAt: string;
    message: string;
  };
  code?: string;
  message?: string;
}

export interface ConfirmConnectionResponse {
  status: 'SUCCESS' | 'Failed';
  data?: {
    connectionId: string;
    state: string;
    connectionToken: string;
  };
  code?: string;
  message?: string;
}

/**
 * EHR Bridge Client for making API calls to the Bridge
 */
export class EHRBridgeClient {
  private config: EHRBridgeClientConfig;
  private axios: AxiosInstance;

  constructor(config: EHRBridgeClientConfig) {
    this.config = config;
    this.axios = axios.create({
      baseURL: config.bridgeUrl,
      timeout: 10000,
    });
  }

  /**
   * Initiate a connection with another partner
   */
  async initiateConnection(request: {
    doctorIdentifier: string;
    identifierType: 'email' | 'memberId';
    ehrSystemId: string;
    callbackUrl?: string;
  }): Promise<InitiateConnectionResponse> {
    const body = JSON.stringify(request);
    const signature = HMACUtil.sign(this.config.partnerSecret, body);

    try {
      const response = await this.axios.post('/v1/connections/initiate', request, {
        headers: {
          'X-EHR-Partner-Key': this.config.partnerId,
          'X-EHR-Signature': signature,
        },
      });

      return response.data;
    } catch (error: any) {
      return {
        status: 'Failed',
        code: error.response?.data?.code || 'NETWORK_ERROR',
        message: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Get connection status
   */
  async getConnectionStatus(connectionId: string): Promise<{
    status: 'SUCCESS' | 'Failed';
    data?: { connectionId: string; state: string; connectionToken?: string };
    code?: string;
    message?: string;
  }> {
    const body = '';
    const signature = HMACUtil.sign(this.config.partnerSecret, body);

    try {
      const response = await this.axios.get(`/v1/connections/${connectionId}/status`, {
        headers: {
          'X-EHR-Partner-Key': this.config.partnerId,
          'X-EHR-Signature': signature,
        },
      });

      return response.data;
    } catch (error: any) {
      return {
        status: 'Failed',
        code: error.response?.data?.code || 'NETWORK_ERROR',
        message: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Confirm a connection
   */
  async confirmConnection(
    connectionId: string,
    request: {
      approved: boolean;
      respondingDoctorId: string;
      callbackUrl?: string;
    },
  ): Promise<ConfirmConnectionResponse> {
    const body = JSON.stringify(request);
    const signature = HMACUtil.sign(this.config.partnerSecret, body);

    try {
      const response = await this.axios.post(`/v1/connections/${connectionId}/confirm`, request, {
        headers: {
          'X-EHR-Partner-Key': this.config.partnerId,
          'X-EHR-Signature': signature,
        },
      });

      // Save token for future use
      if (response.data?.data?.connectionToken) {
        this.config.connectionToken = response.data.data.connectionToken;
      }

      return response.data;
    } catch (error: any) {
      return {
        status: 'Failed',
        code: error.response?.data?.code || 'NETWORK_ERROR',
        message: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Assign a patient to the connection
   */
  async assignPatient(request: {
    ehrPatientId: string;
    patient: FHIRPatient;
    allergyIntolerances?: any[];
    conditions?: any[];
  }): Promise<AssignPatientResponse> {
    if (!this.config.connectionToken) {
      return {
        status: 'Failed',
        code: 'NO_CONNECTION_TOKEN',
        message: 'Connection token is required. Initiate and confirm a connection first.',
      };
    }

    try {
      const response = await this.axios.post('/v1/patients/assign', request, {
        headers: {
          Authorization: `Bearer ${this.config.connectionToken}`,
        },
      });

      return response.data;
    } catch (error: any) {
      return {
        status: 'Failed',
        code: error.response?.data?.code || 'NETWORK_ERROR',
        message: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Get patient mapping
   */
  async getPatient(ehrPatientId: string): Promise<{
    status: 'SUCCESS' | 'Failed';
    data?: {
      initiatingPatientId: string;
      respondingPatientId: string;
      matchType: string;
      assignedAt: string;
    };
    code?: string;
    message?: string;
  }> {
    if (!this.config.connectionToken) {
      return {
        status: 'Failed',
        code: 'NO_CONNECTION_TOKEN',
        message: 'Connection token is required.',
      };
    }

    try {
      const response = await this.axios.get(`/v1/patients/${ehrPatientId}`, {
        headers: {
          Authorization: `Bearer ${this.config.connectionToken}`,
        },
      });

      return response.data;
    } catch (error: any) {
      return {
        status: 'Failed',
        code: error.response?.data?.code || 'NETWORK_ERROR',
        message: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Unassign a patient
   */
  async unassignPatient(ehrPatientId: string): Promise<{
    status: 'SUCCESS' | 'Failed';
    code?: string;
    message?: string;
  }> {
    if (!this.config.connectionToken) {
      return {
        status: 'Failed',
        code: 'NO_CONNECTION_TOKEN',
        message: 'Connection token is required.',
      };
    }

    try {
      const response = await this.axios.post(
        '/v1/patients/unassign',
        { ehrPatientId },
        {
          headers: {
            Authorization: `Bearer ${this.config.connectionToken}`,
          },
        },
      );

      return response.data;
    } catch (error: any) {
      return {
        status: 'Failed',
        code: error.response?.data?.code || 'NETWORK_ERROR',
        message: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Set or update the connection token
   */
  setConnectionToken(token: string): void {
    this.config.connectionToken = token;
  }

  /**
   * Get the current connection token
   */
  getConnectionToken(): string | undefined {
    return this.config.connectionToken;
  }
}
