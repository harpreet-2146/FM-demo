import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { SequenceService } from '../../common/sequence.service';
import { Money } from '../../common/utils/money.util';
import { GenerateInvoiceDto, InvoiceResponseDto, InvoiceItemResponseDto } from './dto/invoice.dto';
import { GRNStatus } from '@prisma/client';

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sequenceService: SequenceService,
  ) {}

  /**
   * Generate invoice from GRN
   * ADMIN ONLY
   * Invoice is IMMUTABLE after creation
   */
  async generate(dto: GenerateInvoiceDto, adminId: string): Promise<InvoiceResponseDto> {
    // Get GRN with dispatch details
    const grn = await this.prisma.gRN.findUnique({
      where: { id: dto.grnId },
      include: {
        dispatchOrder: {
          include: {
            items: {
              include: {
                material: true,
              },
            },
          },
        },
        retailer: { select: { name: true } },
        invoice: true,
      },
    });

    if (!grn) {
      throw new NotFoundException('GRN not found');
    }

    if (grn.status !== GRNStatus.CONFIRMED) {
      throw new BadRequestException('GRN must be confirmed before generating invoice');
    }

    if (grn.invoice) {
      throw new BadRequestException('Invoice already exists for this GRN');
    }

    const isInterstate = dto.isInterstate || false;

    // Generate invoice number
    const invoiceNumber = await this.sequenceService.getNextNumber('INV');

    // Calculate totals from dispatch items (already snapshotted)
    let subtotal = Money.zero();
    const itemsData: any[] = [];

    for (const item of grn.dispatchOrder.items) {
      const lineTotal = Money.from(item.lineTotal.toString());
      subtotal = Money.add(subtotal, lineTotal);

      itemsData.push({
        materialId: item.materialId,
        materialName: item.material.name,
        hsnCode: item.hsnCode,
        gstRate: parseFloat(item.gstRate.toString()),
        packets: item.packets,
        unitsPerPacket: item.material.unitsPerPacket,
        unitPrice: parseFloat(item.unitPrice.toString()),
        lineTotal: parseFloat(item.lineTotal.toString()),
      });
    }

    // Calculate GST
    // For simplicity, using weighted average GST rate
    // In production, would calculate per line item
    const avgGstRate = itemsData.reduce((sum, i) => sum + i.gstRate, 0) / itemsData.length;
    const gstDecimal = Money.from(avgGstRate);

    let cgst: number | undefined;
    let sgst: number | undefined;
    let igst: number | undefined;

    if (isInterstate) {
      igst = Money.toNumber(Money.calculateIGST(subtotal, gstDecimal));
    } else {
      cgst = Money.toNumber(Money.calculateCGST(subtotal, gstDecimal));
      sgst = Money.toNumber(Money.calculateSGST(subtotal, gstDecimal));
    }

    const totalGst = isInterstate
      ? Money.from(igst!)
      : Money.add(Money.from(cgst!), Money.from(sgst!));
    const totalAmount = Money.add(subtotal, totalGst);

    // Create invoice - IMMUTABLE
    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        grnId: grn.id,
        retailerId: grn.retailerId,
        createdBy: adminId,
        subtotal: Money.toNumber(subtotal),
        cgst,
        sgst,
        igst,
        totalAmount: Money.toNumber(totalAmount),
        isInterstate,
        items: {
          create: itemsData,
        },
      },
      include: {
        grn: {
          include: {
            dispatchOrder: {
              include: {
                srn: {
                  include: {
                    retailer: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
        items: true,
      },
    });

    return this.mapToResponse(invoice);
  }

  /**
   * Get invoice by ID
   */
  async findOne(id: string): Promise<InvoiceResponseDto> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        grn: {
          include: {
            dispatchOrder: {
              include: {
                srn: {
                  include: {
                    retailer: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
        items: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return this.mapToResponse(invoice);
  }

  /**
   * Get invoices for retailer
   */
  async findByRetailer(retailerId: string): Promise<InvoiceResponseDto[]> {
    const invoices = await this.prisma.invoice.findMany({
      where: { retailerId },
      include: {
        grn: {
          include: {
            dispatchOrder: {
              include: {
                srn: {
                  include: {
                    retailer: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return invoices.map(i => this.mapToResponse(i));
  }

  /**
   * Get all invoices
   */
  async findAll(): Promise<InvoiceResponseDto[]> {
    const invoices = await this.prisma.invoice.findMany({
      include: {
        grn: {
          include: {
            dispatchOrder: {
              include: {
                srn: {
                  include: {
                    retailer: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return invoices.map(i => this.mapToResponse(i));
  }

  /**
   * Map to response
   * Note: Invoice has no update method - it is IMMUTABLE
   */
  private mapToResponse(invoice: any): InvoiceResponseDto {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      grnId: invoice.grnId,
      grnNumber: invoice.grn?.grnNumber || '',
      retailerId: invoice.retailerId,
      retailerName: invoice.grn?.dispatchOrder?.srn?.retailer?.name || '',
      subtotal: parseFloat(invoice.subtotal.toString()),
      cgst: invoice.cgst ? parseFloat(invoice.cgst.toString()) : undefined,
      sgst: invoice.sgst ? parseFloat(invoice.sgst.toString()) : undefined,
      igst: invoice.igst ? parseFloat(invoice.igst.toString()) : undefined,
      totalAmount: parseFloat(invoice.totalAmount.toString()),
      isInterstate: invoice.isInterstate,
      items: invoice.items.map((item: any): InvoiceItemResponseDto => ({
        id: item.id,
        materialId: item.materialId,
        materialName: item.materialName,
        hsnCode: item.hsnCode,
        gstRate: parseFloat(item.gstRate.toString()),
        packets: item.packets,
        unitsPerPacket: item.unitsPerPacket,
        unitPrice: parseFloat(item.unitPrice.toString()),
        lineTotal: parseFloat(item.lineTotal.toString()),
      })),
      createdAt: invoice.createdAt,
    };
  }
}