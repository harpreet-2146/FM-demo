import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export type SequencePrefix = 'SRN' | 'DO' | 'GRN' | 'INV' | 'SALE' | 'BATCH';

@Injectable()
export class SequenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate next sequence number for a given prefix
   * Format: PREFIX-YYYYMMDD-NNNNNN
   * Example: SRN-20240115-000001
   */
  async getNextNumber(prefix: SequencePrefix): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const sequenceId = `${prefix}-${dateStr}`;

    // Use upsert with atomic increment
    const result = await this.prisma.sequenceCounter.upsert({
      where: { id: sequenceId },
      update: {
        currentValue: { increment: 1 },
      },
      create: {
        id: sequenceId,
        prefix: prefix,
        currentValue: 1,
      },
    });

    // Format: PREFIX-YYYYMMDD-NNNNNN
    const paddedNumber = result.currentValue.toString().padStart(6, '0');
    return `${prefix}-${dateStr}-${paddedNumber}`;
  }

  /**
   * Get current value without incrementing (for display purposes)
   */
  async getCurrentValue(prefix: SequencePrefix): Promise<number> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const sequenceId = `${prefix}-${dateStr}`;

    const result = await this.prisma.sequenceCounter.findUnique({
      where: { id: sequenceId },
    });

    return result?.currentValue ?? 0;
  }
}