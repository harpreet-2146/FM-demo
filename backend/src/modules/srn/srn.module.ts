import { Module } from '@nestjs/common';
import { SRNController } from './srn.controller';
import { SRNService } from './srn.service';
import { PrismaService } from '../../common/prisma.service';
import { SequenceService } from '../../common/sequence.service';
import { ManufacturerInventoryModule } from '../manufacturer-inventory/manufacturer-inventory.module';

@Module({
  imports: [ManufacturerInventoryModule],
  controllers: [SRNController],
  providers: [SRNService, PrismaService, SequenceService],
  exports: [SRNService],
})
export class SRNModule {}