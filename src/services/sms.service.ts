import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SMSService {
  private readonly logger = new Logger(SMSService.name);
  private sentMessages: { phoneNumber: string; message: string }[] = [];

  async sendInvitation(phoneNumber: string, token: string) {
    const message = `You have been invited to join a trainer. Use token: ${token}`;
    this.sentMessages.push({ phoneNumber, message });
    this.logger.log(`SMS to ${phoneNumber}: ${message}`);
  }

  getSentMessages() {
    return this.sentMessages;
  }
}
