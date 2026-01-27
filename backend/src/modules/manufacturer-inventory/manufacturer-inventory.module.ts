import { Module } from '@nestjs/common';
import { ManufacturerInventoryController } from './manufacturer-inventory.controller';
import { ManufacturerInventoryService } from './manufacturer-inventory.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [ManufacturerInventoryController],
  providers: [ManufacturerInventoryService, PrismaService],
  exports: [ManufacturerInventoryService],
})
export class ManufacturerInventoryModule {}