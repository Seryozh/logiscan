import { describe, it, expect } from 'vitest';
import { parsePackageList } from './parsePackageList';

describe('parsePackageList', () => {
  it('should parse valid tab-separated input correctly', () => {
    const input = 'C01K Unit\tESCARDO ENTERPRISE LLC\tUPS - #2165790850 - 1ZA8272V1341859679 MARIA ESPEJO\t3901\t1/30/2026 6:57:06 PM';

    const result = parsePackageList(input);

    expect(result.packages).toHaveLength(1);
    expect(result.errors).toHaveLength(0);

    const pkg = result.packages[0];
    expect(pkg.apartment).toBe('C01K');
    expect(pkg.trackingLast4).toBe('9679');
    expect(pkg.carrier).toBe('UPS');
    expect(pkg.recipient).toBe('MARIA ESPEJO');
    expect(pkg.fullTracking).toBe('1ZA8272V1341859679');
    expect(pkg.status).toBe('pending');
    expect(pkg.id).toBeTruthy();
  });

  it('should parse multiple lines correctly', () => {
    const input = `C01K Unit\tESCARDO ENTERPRISE LLC\tUPS - #2165790850 - 1ZA8272V1341859679 MARIA ESPEJO\t3901\t1/30/2026 6:57:06 PM
C02G Unit\tJOHN DOE\tAMAZON - #12345 - TBA987654321 JOHN DOE\t4501\t2/1/2026 10:00:00 AM
C14B Unit\tJANE SMITH\tFEDEX - #67890 - 123456789012 JANE SMITH\t2301\t2/2/2026 3:30:00 PM`;

    const result = parsePackageList(input);

    expect(result.packages).toHaveLength(3);
    expect(result.errors).toHaveLength(0);

    expect(result.packages[0].apartment).toBe('C01K');
    expect(result.packages[1].apartment).toBe('C02G');
    expect(result.packages[2].apartment).toBe('C14B');

    expect(result.packages[0].trackingLast4).toBe('9679');
    expect(result.packages[1].trackingLast4).toBe('4321');
    expect(result.packages[2].trackingLast4).toBe('9012');
  });

  it('should parse space-separated input as fallback', () => {
    const input = 'C01K Unit  ESCARDO ENTERPRISE LLC  UPS - #2165790850 - 1ZA8272V1341859679 MARIA ESPEJO  3901  1/30/2026 6:57:06 PM';

    const result = parsePackageList(input);

    expect(result.packages).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
    expect(result.packages[0].apartment).toBe('C01K');
  });

  it('should accept N##X apartment codes', () => {
    const input = `N05B Unit\tJOHN DOE\tUPS - #12345 - 1ZA827123456789 JOHN DOE\t4501\t2/1/2026 10:00:00 AM
N14K Unit\tJANE SMITH\tFEDEX - #67890 - 123456789012 JANE SMITH\t2301\t2/2/2026 3:30:00 PM`;

    const result = parsePackageList(input);

    expect(result.packages).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(result.packages[0].apartment).toBe('N05B');
    expect(result.packages[1].apartment).toBe('N14K');
  });

  it('should accept any letter prefix apartment codes (A##X, B##X, etc)', () => {
    const input = `A12C Unit\tTEST USER\tUPS - #11111 - 1Z111111111 TEST\t1111\t2/1/2026 10:00:00 AM
B05D Unit\tTEST USER 2\tFEDEX - #22222 - 222222222222 TEST2\t2222\t2/2/2026 3:30:00 PM
Z99Z Unit\tTEST USER 3\tAMAZON - #33333 - TBA333333333 TEST3\t3333\t2/3/2026 5:00:00 PM`;

    const result = parsePackageList(input);

    expect(result.packages).toHaveLength(3);
    expect(result.errors).toHaveLength(0);
    expect(result.packages[0].apartment).toBe('A12C');
    expect(result.packages[1].apartment).toBe('B05D');
    expect(result.packages[2].apartment).toBe('Z99Z');
  });

  it('should skip empty lines', () => {
    const input = `C01K Unit\tESCARDO ENTERPRISE LLC\tUPS - #2165790850 - 1ZA8272V1341859679 MARIA ESPEJO\t3901\t1/30/2026 6:57:06 PM

C02G Unit\tJOHN DOE\tAMAZON - #12345 - TBA987654321 JOHN DOE\t4501\t2/1/2026 10:00:00 AM`;

    const result = parsePackageList(input);

    expect(result.packages).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it('should handle lines with missing fields', () => {
    const input = 'C01K Unit\tESCARDO ENTERPRISE LLC';

    const result = parsePackageList(input);

    expect(result.packages).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].reason).toContain('Insufficient fields');
  });

  it('should handle lines without apartment code', () => {
    const input = 'Invalid Unit\tESCARDO ENTERPRISE LLC\tUPS - #2165790850 - 1ZA8272V1341859679 MARIA ESPEJO';

    const result = parsePackageList(input);

    expect(result.packages).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].reason).toContain('No valid apartment code');
    expect(result.errors[0].lineNumber).toBe(1);
  });

  it('should handle malformed carrier/tracking field', () => {
    const input = 'C01K Unit\tESCARDO ENTERPRISE LLC\tUPS INVALID FORMAT';

    const result = parsePackageList(input);

    expect(result.packages).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].reason).toContain('Invalid carrier/tracking format');
    expect(result.errors[0].lineNumber).toBe(1);
  });

  it('should handle tracking numbers that are too short', () => {
    const input = 'C01K Unit\tESCARDO ENTERPRISE LLC\tUPS - #2165790850 - 123 MARIA ESPEJO';

    const result = parsePackageList(input);

    expect(result.packages).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].reason).toContain('Tracking number too short');
  });

  it('should detect duplicate entries (same apt + last4)', () => {
    const input = `C01K Unit\tESCARDO ENTERPRISE LLC\tUPS - #2165790850 - 1ZA8272V1341859679 MARIA ESPEJO\t3901\t1/30/2026 6:57:06 PM
C01K Unit\tESCARDO ENTERPRISE LLC\tUPS - #2165790850 - 1ZA8272V1341859679 MARIA ESPEJO\t3901\t1/30/2026 6:57:06 PM`;

    const result = parsePackageList(input);

    expect(result.packages).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].reason).toContain('Duplicate entry');
  });

  it('should trim whitespace from fields', () => {
    const input = '  C01K Unit  \t  ESCARDO ENTERPRISE LLC  \t  UPS - #2165790850 - 1ZA8272V1341859679 MARIA ESPEJO  ';

    const result = parsePackageList(input);

    expect(result.packages).toHaveLength(1);
    expect(result.packages[0].apartment).toBe('C01K');
    expect(result.packages[0].carrier).toBe('UPS');
  });

  it('should handle recipient names with multiple words', () => {
    const input = 'C01K Unit\tESCARDO ENTERPRISE LLC\tUPS - #2165790850 - 1ZA8272V1341859679 MARIA CHRISTINA ESPEJO GONZALEZ\t3901\t1/30/2026 6:57:06 PM';

    const result = parsePackageList(input);

    expect(result.packages).toHaveLength(1);
    expect(result.packages[0].recipient).toBe('MARIA CHRISTINA ESPEJO GONZALEZ');
  });

  it('should extract last 4 characters correctly from various tracking formats', () => {
    const input = `C01K Unit\tTest\tUPS - #1 - 1ZA8272V1341859679 TEST USER\t1\t1/1/2026
C02G Unit\tTest\tAMAZON - #2 - TBA987654321 TEST USER\t2\t1/1/2026
C03H Unit\tTest\tFEDEX - #3 - 123456 TEST USER\t3\t1/1/2026`;

    const result = parsePackageList(input);

    expect(result.packages).toHaveLength(3);
    expect(result.packages[0].trackingLast4).toBe('9679');
    expect(result.packages[1].trackingLast4).toBe('4321');
    expect(result.packages[2].trackingLast4).toBe('3456');
  });

  it('should parse single-space separated format using reference number anchor', () => {
    const input = 'N01C Unit OFFICE 609 LLC USPS - #2167439815 - 420330199361289719660506103530 Gustavo Cuina 3801 2/4/2026 7:04:53 PM';

    const result = parsePackageList(input);

    expect(result.packages).toHaveLength(1);
    expect(result.errors).toHaveLength(0);

    const pkg = result.packages[0];
    expect(pkg.apartment).toBe('N01C');
    expect(pkg.carrier).toBe('USPS');
    expect(pkg.fullTracking).toBe('420330199361289719660506103530');
    expect(pkg.trackingLast4).toBe('3530');
    expect(pkg.recipient).toBe('Gustavo Cuina 3801 2/4/2026 7:04:53 PM');
  });

  it('should parse multiple single-space separated lines', () => {
    const input = `N01C Unit OFFICE 609 LLC USPS - #2167439815 - 420330199361289719660506103530 Gustavo Cuina 3801 2/4/2026 7:04:53 PM
N01D Unit HARBOUR 519 LLC USPS - #2156535163 - NO TRACKING NUMBER -- Ada Rinaudo (flat) 3801 1/2/2026 2:26:18 PM
N01E Unit Mavisis LLC UPS - #2167820464 - 1ZV514B7YT08003344 Maria Vicoria Silva JA (flat) 3801 2/5/2026 6:25:48 PM`;

    const result = parsePackageList(input);

    expect(result.packages).toHaveLength(3);
    expect(result.errors).toHaveLength(0);

    expect(result.packages[0].apartment).toBe('N01C');
    expect(result.packages[0].trackingLast4).toBe('3530');

    expect(result.packages[1].apartment).toBe('N01D');
    expect(result.packages[1].trackingLast4).toBe('NONE');
    expect(result.packages[1].fullTracking).toBe('NO TRACKING NUMBER');

    expect(result.packages[2].apartment).toBe('N01E');
    expect(result.packages[2].trackingLast4).toBe('3344');
  });

  it('should handle "NO TRACKING" variants', () => {
    const input = `N01A Unit Test LLC USPS - #111 - NO TRACKING NUMBER -- John Doe
N01B Unit Test LLC FEDEX - #222 - NO TRK -- Jane Smith
C01C Unit Test LLC AMAZON - #333 - NO TRACKING Bob Johnson`;

    const result = parsePackageList(input);

    expect(result.packages).toHaveLength(3);
    expect(result.errors).toHaveLength(0);

    expect(result.packages[0].fullTracking).toBe('NO TRACKING NUMBER');
    expect(result.packages[0].trackingLast4).toBe('NONE');
    expect(result.packages[0].recipient).toBe('John Doe');

    expect(result.packages[1].fullTracking).toBe('NO TRK');
    expect(result.packages[1].trackingLast4).toBe('NONE');
    expect(result.packages[1].recipient).toBe('Jane Smith');

    expect(result.packages[2].fullTracking).toBe('NO TRACKING');
    expect(result.packages[2].trackingLast4).toBe('NONE');
    expect(result.packages[2].recipient).toBe('Bob Johnson');
  });

  it('should work with any carrier name in single-space format', () => {
    const input = `N01A Unit Test LLC DHL - #111 - 1234567890 John Doe
N01B Unit Test LLC ONTRAC - #222 - ABCD1234 Jane Smith
C01C Unit Test LLC LASERSHIP - #333 - XYZ9876 Bob Johnson`;

    const result = parsePackageList(input);

    expect(result.packages).toHaveLength(3);
    expect(result.errors).toHaveLength(0);

    expect(result.packages[0].carrier).toBe('DHL');
    expect(result.packages[1].carrier).toBe('ONTRAC');
    expect(result.packages[2].carrier).toBe('LASERSHIP');
  });

  it('should parse continuous line format (no newlines between packages)', () => {
    const input = 'N01C Unit OFFICE 609 LLC USPS - #2167439815 - 420330199361289719660506103530 Gustavo Cuina 3801 2/4/2026 7:04:53 PM N01D Unit HARBOUR 519 LLC USPS - #2156535163 - NO TRACKING NUMBER -- Ada Rinaudo (flat) 3801 1/2/2026 2:26:18 PM N01E Unit Mavisis LLC UPS - #2167820464 - 1ZV514B7YT08003344 Maria Vicoria Silva JA (flat) 3801 2/5/2026 6:25:48 PM';

    const result = parsePackageList(input);

    expect(result.packages).toHaveLength(3);
    expect(result.errors).toHaveLength(0);

    expect(result.packages[0].apartment).toBe('N01C');
    expect(result.packages[0].carrier).toBe('USPS');
    expect(result.packages[0].trackingLast4).toBe('3530');

    expect(result.packages[1].apartment).toBe('N01D');
    expect(result.packages[1].carrier).toBe('USPS');
    expect(result.packages[1].trackingLast4).toBe('NONE');

    expect(result.packages[2].apartment).toBe('N01E');
    expect(result.packages[2].carrier).toBe('UPS');
    expect(result.packages[2].trackingLast4).toBe('3344');
  });
});
