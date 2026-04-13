import crypto from 'crypto';

export class HMACUtil {
  /**
   * Sign a body using HMAC-SHA256
   */
  static sign(secret: string, body: string): string {
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Verify a signature
   */
  static verify(secret: string, body: string, signature: string): boolean {
    const expected = this.sign(secret, body);
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  }
}
