import { Module } from '@nestjs/common';
import { SaleController } from './sale.controller';
import { SaleService } from './sale.service';
import { PrismaService } from '../../common/prisma.service';
import { SequenceService } from '../../common/sequence.service';
import { RetailerInventoryModule } from '../retailer-inventory/retailer-inventory.module';

@Module({
  imports: [RetailerInventoryModule],
  controllers: [SaleController],
  providers: [SaleService, PrismaService, SequenceService],
  exports: [SaleService],
})
export class SaleModule {}