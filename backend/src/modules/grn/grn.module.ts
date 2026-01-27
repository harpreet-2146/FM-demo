import { Module } from '@nestjs/common';
import { GRNController } from './grn.controller';
import { GRNService } from './grn.service';
import { PrismaService } from '../../common/prisma.service';
import { RetailerInventoryModule } from '../retailer-inventory/retailer-inventory.module';

@Module({
  imports: [RetailerInventoryModule],
  controllers: [GRNController],
  providers: [GRNService, PrismaService],
  exports: [GRNService],
})
export class GRNModule {}