import { Module } from '@nestjs/common';
import { ReturnController } from './return.controller';
import { ReturnService } from './return.service';
import { PrismaService } from '../../common/prisma.service';
import { SequenceService } from '../../common/sequence.service';
import { ManufacturerInventoryModule } from '../manufacturer-inventory/manufacturer-inventory.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [ManufacturerInventoryModule, NotificationModule],
  controllers: [ReturnController],
  providers: [ReturnService, PrismaService, SequenceService],
  exports: [ReturnService],
})
export class ReturnModule {}