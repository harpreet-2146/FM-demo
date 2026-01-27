import { Module } from '@nestjs/common';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';
import { PrismaService } from '../../common/prisma.service';
import { SequenceService } from '../../common/sequence.service';
import { ManufacturerInventoryModule } from '../manufacturer-inventory/manufacturer-inventory.module';

@Module({
  imports: [ManufacturerInventoryModule],
  controllers: [DispatchController],
  providers: [DispatchService, PrismaService, SequenceService],
  exports: [DispatchService],
})
export class DispatchModule {}