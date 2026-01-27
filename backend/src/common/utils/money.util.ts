/**
 * Money Utility - Centralized financial calculations
 * ALL money operations MUST go through this class
 * 
 * Rules:
 * - 2 decimal places
 * - ROUND_HALF_UP rounding
 * - No direct Decimal operations elsewhere
 */

import Decimal from 'decimal.js';

// Configure Decimal.js globally
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
});

export class Money {
  private static readonly DECIMAL_PLACES = 2;

  /**
   * Create Decimal from number
   */
  static fromNumber(value: number): Decimal {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(`Invalid money value: ${value}`);
    }
    return new Decimal(value);
  }

  /**
   * Create Decimal from string
   */
  static fromString(value: string): Decimal {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`Invalid money string: ${value}`);
    }
    const parsed = new Decimal(value);
    if (parsed.isNaN()) {
      throw new Error(`Invalid money value: ${value}`);
    }
    return parsed;
  }

  /**
   * Create Decimal from any valid input
   */
  static from(value: number | string | Decimal): Decimal {
    if (value instanceof Decimal) {
      return value;
    }
    if (typeof value === 'number') {
      return this.fromNumber(value);
    }
    return this.fromString(value);
  }

  /**
   * Addition with proper rounding
   */
  static add(a: Decimal, b: Decimal): Decimal {
    return a.plus(b).toDecimalPlaces(this.DECIMAL_PLACES, Decimal.ROUND_HALF_UP);
  }

  /**
   * Subtraction with proper rounding
   */
  static subtract(a: Decimal, b: Decimal): Decimal {
    return a.minus(b).toDecimalPlaces(this.DECIMAL_PLACES, Decimal.ROUND_HALF_UP);
  }

  /**
   * Multiplication with proper rounding
   */
  static multiply(a: Decimal, b: number | Decimal): Decimal {
    const multiplier = b instanceof Decimal ? b : new Decimal(b);
    return a.times(multiplier).toDecimalPlaces(this.DECIMAL_PLACES, Decimal.ROUND_HALF_UP);
  }

  /**
   * Division with proper rounding
   */
  static divide(numerator: Decimal, denominator: number | Decimal): Decimal {
    const div = denominator instanceof Decimal ? denominator : new Decimal(denominator);
    if (div.isZero()) {
      throw new Error('Division by zero');
    }
    return numerator.dividedBy(div).toDecimalPlaces(this.DECIMAL_PLACES, Decimal.ROUND_HALF_UP);
  }

  /**
   * Calculate percentage of amount
   * Example: percentage(100, 18) = 18.00
   */
  static percentage(amount: Decimal, percent: Decimal | number): Decimal {
    const pct = percent instanceof Decimal ? percent : new Decimal(percent);
    return amount.times(pct).dividedBy(100).toDecimalPlaces(this.DECIMAL_PLACES, Decimal.ROUND_HALF_UP);
  }

  /**
   * Calculate unit price from packet price
   * unitPrice = mrpPerPacket / unitsPerPacket
   */
  static calculateUnitPrice(mrpPerPacket: Decimal, unitsPerPacket: number): Decimal {
    if (unitsPerPacket <= 0) {
      throw new Error('unitsPerPacket must be positive');
    }
    return this.divide(mrpPerPacket, unitsPerPacket);
  }

  /**
   * Calculate CGST (half of GST rate for intrastate)
   */
  static calculateCGST(subtotal: Decimal, gstRate: Decimal): Decimal {
    const cgstRate = gstRate.dividedBy(2);
    return this.percentage(subtotal, cgstRate);
  }

  /**
   * Calculate SGST (half of GST rate for intrastate)
   */
  static calculateSGST(subtotal: Decimal, gstRate: Decimal): Decimal {
    const sgstRate = gstRate.dividedBy(2);
    return this.percentage(subtotal, sgstRate);
  }

  /**
   * Calculate IGST (full GST rate for interstate)
   */
  static calculateIGST(subtotal: Decimal, gstRate: Decimal): Decimal {
    return this.percentage(subtotal, gstRate);
  }

  /**
   * Calculate line total
   * lineTotal = unitPrice * quantity
   */
  static calculateLineTotal(unitPrice: Decimal, quantity: number): Decimal {
    if (quantity < 0) {
      throw new Error('Quantity cannot be negative');
    }
    return this.multiply(unitPrice, quantity);
  }

  /**
   * Calculate commission based on type
   */
  static calculateCommission(
    unitPrice: Decimal,
    unitsSold: number,
    commissionType: 'PERCENTAGE' | 'FLAT_PER_UNIT',
    commissionValue: Decimal,
  ): Decimal {
    if (commissionType === 'PERCENTAGE') {
      const saleValue = this.multiply(unitPrice, unitsSold);
      return this.percentage(saleValue, commissionValue);
    } else {
      // FLAT_PER_UNIT
      return this.multiply(commissionValue, unitsSold);
    }
  }

  /**
   * Sum array of Decimals
   */
  static sum(values: Decimal[]): Decimal {
    if (values.length === 0) {
      return new Decimal(0);
    }
    return values.reduce((acc, val) => this.add(acc, val), new Decimal(0));
  }

  /**
   * Comparison methods
   */
  static isEqual(a: Decimal, b: Decimal): boolean {
    return a.equals(b);
  }

  static isGreaterThan(a: Decimal, b: Decimal): boolean {
    return a.greaterThan(b);
  }

  static isLessThan(a: Decimal, b: Decimal): boolean {
    return a.lessThan(b);
  }

  static isGreaterThanOrEqual(a: Decimal, b: Decimal): boolean {
    return a.greaterThanOrEqualTo(b);
  }

  static isLessThanOrEqual(a: Decimal, b: Decimal): boolean {
    return a.lessThanOrEqualTo(b);
  }

  static isZero(a: Decimal): boolean {
    return a.isZero();
  }

  static isPositive(a: Decimal): boolean {
    return a.isPositive() && !a.isZero();
  }

  static isNegative(a: Decimal): boolean {
    return a.isNegative();
  }

  /**
   * Format for database storage (string)
   */
  static toStorageString(value: Decimal): string {
    return value.toFixed(this.DECIMAL_PLACES);
  }

  /**
   * Format for display with currency symbol
   */
  static toDisplayString(value: Decimal, currencySymbol: string = '₹'): string {
    return `${currencySymbol}${value.toFixed(this.DECIMAL_PLACES)}`;
  }

  /**
   * Convert to number (use sparingly, prefer Decimal)
   */
  static toNumber(value: Decimal): number {
    return value.toNumber();
  }

  /**
   * Zero constant
   */
  static zero(): Decimal {
    return new Decimal(0);
  }
}