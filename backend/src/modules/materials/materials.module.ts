import { Module } from '@nestjs/common';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
import { PrismaService } from '../../common/prisma.service';

@Module({
  controllers: [MaterialsController],
  providers: [MaterialsService, PrismaService],
  exports: [MaterialsService],
})
export class MaterialsModule {}