import { Module } from '@nestjs/common';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { PrismaService } from '../../common/prisma.service';
import { SequenceService } from '../../common/sequence.service';

@Module({
  controllers: [InvoiceController],
  providers: [InvoiceService, PrismaService, SequenceService],
  exports: [InvoiceService],
})
export class InvoiceModule {}