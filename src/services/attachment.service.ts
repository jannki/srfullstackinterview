import { Injectable } from '@nestjs/common';
import { MessageService } from './message.service';

@Injectable()
export class AttachmentService {
  constructor(private readonly messageService: MessageService) {}

  async sendImage(chatId: number, senderUserId: number, mediaUrl: string, caption?: string) {
    return this.messageService.sendMessage(chatId, senderUserId, {
      type: 'image',
      mediaUrl,
      textContent: caption,
    });
  }
}
