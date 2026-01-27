import { Module } from '@nestjs/common';
import { RetailerInventoryController } from './retailer-inventory.controller';
import { RetailerInventoryService } from './retailer-inventory.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [RetailerInventoryController],
  providers: [RetailerInventoryService, PrismaService],
  exports: [RetailerInventoryService],
})
export class RetailerInventoryModule {}