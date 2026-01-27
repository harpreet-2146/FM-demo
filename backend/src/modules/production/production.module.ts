import { Module } from '@nestjs/common';
import { ProductionController } from './production.controller';
import { ProductionService } from './production.service';
import { PrismaService } from '../../common/prisma.service';
import { SequenceService } from '../../common/sequence.service';
import { ManufacturerInventoryModule } from '../manufacturer-inventory/manufacturer-inventory.module';
import { MaterialsModule } from '../materials/materials.module';

@Module({
  imports: [ManufacturerInventoryModule, MaterialsModule],
  controllers: [ProductionController],
  providers: [ProductionService, PrismaService, SequenceService],
  exports: [ProductionService],
})
export class ProductionModule {}