import { Module } from '@nestjs/common';
import { SRNController } from './srn.controller';
import { SRNService } from './srn.service';
import { PrismaService } from '../../common/prisma.service';
import { SequenceService } from '../../common/sequence.service';
import { ManufacturerInventoryModule } from '../manufacturer-inventory/manufacturer-inventory.module';
import { AssignmentModule } from '../assignment/assignment.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [ManufacturerInventoryModule, AssignmentModule, NotificationModule],
  controllers: [SRNController],
  providers: [SRNService, PrismaService, SequenceService],
  exports: [SRNService],
})
export class SRNModule {}