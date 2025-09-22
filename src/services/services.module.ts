import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { UsersService } from './users.service';
import { TrainerService } from './trainer.service';
import { TraineeService } from './trainee.service';
import { PlanService } from './plan.service';
import { InvitationService } from './invitation.service';
import { SMSService } from './sms.service';
import { ChatService } from './chat.service';
import { MessageService } from './message.service';
import { SurveyService } from './survey.service';
import { AttachmentService } from './attachment.service';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    UsersService,
    TrainerService,
    TraineeService,
    PlanService,
    InvitationService,
    SMSService,
    ChatService,
    MessageService,
    SurveyService,
    AttachmentService,
    AuthService,
    TokenService,
  ],
  exports: [
    UsersService,
    TrainerService,
    TraineeService,
    PlanService,
    InvitationService,
    SMSService,
    ChatService,
    MessageService,
    SurveyService,
    AttachmentService,
    AuthService,
    TokenService,
  ],
})
export class ServicesModule {}
