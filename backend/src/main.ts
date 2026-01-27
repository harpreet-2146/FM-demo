import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  // Validation pipe - reject unknown properties
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Food Manufacturing SaaS API')
    .setDescription(
      `
## API Documentation

### Roles
- **ADMIN**: Full system access, creates users/materials, approves SRNs, generates invoices
- **MANUFACTURER**: Production batches, dispatch execution (NO financial data access)
- **RETAILER**: SRN creation, GRN confirmation, sales recording

### Key Rules
- **No hardcoded business data** - All values from Admin UI
- **unitsPerPacket** is IMMUTABLE after material creation
- **HSN/GST** are IMMUTABLE after first production batch
- **Invoices** are IMMUTABLE after generation
- **Inventory** changes only via: Production, Dispatch, GRN, Sale

### Bootstrap
First user must be created via \`/api/auth/bootstrap\` endpoint.
    `,
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication', 'Login, bootstrap, system status')
    .addTag('Users', 'User management (Admin only)')
    .addTag('Materials', 'Material CRUD with mutation locks')
    .addTag('Production', 'Production batches (Manufacturer)')
    .addTag('Manufacturer Inventory', 'Manufacturer inventory view')
    .addTag('Retailer Inventory', 'Retailer inventory view')
    .addTag('Stock Requisition Notes (SRN)', 'SRN workflow')
    .addTag('Dispatch', 'Dispatch order management')
    .addTag('Goods Receipt Notes (GRN)', 'GRN confirmation')
    .addTag('Invoices', 'B2B Invoice generation (Admin/Retailer)')
    .addTag('Sales', 'B2C Unit sales (Retailer)')
    .addTag('Commissions', 'Commission tracking (Admin only)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   Food Manufacturing SaaS API                                 ║
║                                                               ║
║   Server running at: http://localhost:${port}                   ║
║   API Documentation: http://localhost:${port}/api/docs          ║
║                                                               ║
║   ZERO HARDCODING - All business data from Admin UI           ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();