import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';

// Common
import { PrismaService } from './common/prisma.service';
import { SequenceService } from './common/sequence.service';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { ManufacturerInventoryModule } from './modules/manufacturer-inventory/manufacturer-inventory.module';
import { RetailerInventoryModule } from './modules/retailer-inventory/retailer-inventory.module';
import { ProductionModule } from './modules/production/production.module';
import { SRNModule } from './modules/srn/srn.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { GRNModule } from './modules/grn/grn.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { SaleModule } from './modules/sale/sale.module';
import { CommissionModule } from './modules/commission/commission.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    MaterialsModule,
    ManufacturerInventoryModule,
    RetailerInventoryModule,
    ProductionModule,
    SRNModule,
    DispatchModule,
    GRNModule,
    InvoiceModule,
    SaleModule,
    CommissionModule,
  ],
  providers: [
    PrismaService,
    SequenceService,

    // Global guards - applied to all routes
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },

    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}