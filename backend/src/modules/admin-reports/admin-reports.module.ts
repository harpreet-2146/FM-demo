import { Module } from '@nestjs/common';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsService } from './admin-reports.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [AdminReportsController],
  providers: [AdminReportsService, PrismaService],
  exports: [AdminReportsService],
})
export class AdminReportsModule {}