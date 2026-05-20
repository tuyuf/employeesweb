import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export interface ExplainResult {
  query: string;
  plan: string[];
  indexUsed: boolean;
  scanType: string;
}

/**
 * Execute EXPLAIN ANALYZE query and return formatted results
 */
async function getExplainPlan(query: string): Promise<string[]> {
  try {
    // Use $queryRawUnsafe to execute EXPLAIN ANALYZE
    const result = await prisma.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${query}`
    );
    return result.map((row) => row['QUERY PLAN']);
  } catch (error) {
    console.error('EXPLAIN query error:', error);
    return ['Error executing EXPLAIN ANALYZE'];
  }
}

/**
 * Get scan type from EXPLAIN plan
 */
function detectScanType(plan: string[]): { scanType: string; indexUsed: boolean } {
  const planText = plan.join(' ').toLowerCase();

  if (planText.includes('index scan')) {
    return { scanType: 'Index Scan', indexUsed: true };
  } else if (planText.includes('bitmap heap scan') || planText.includes('bitmap index scan')) {
    return { scanType: 'Bitmap Index Scan', indexUsed: true };
  } else if (planText.includes('seq scan')) {
    return { scanType: 'Sequential Scan (Full Table Scan)', indexUsed: false };
  }

  return { scanType: 'Unknown', indexUsed: false };
}

export async function GET() {
  const startTime = performance.now();

  try {
    // Test query for EXPLAIN analysis
    const testLastName = 'Baba';

    // Query 1: With index (default behavior)
    const queryWithIndex = `
      SELECT emp_no, first_name, last_name, hire_date
      FROM employees
      WHERE last_name = '${testLastName}'
    `;

    const planWithIndex = await getExplainPlan(queryWithIndex);
    const scanInfoWithIndex = detectScanType(planWithIndex);

    // Query 2: Wildcard prefix search (also uses index)
    const queryWildcard = `
      SELECT emp_no, first_name, last_name, hire_date
      FROM employees
      WHERE last_name LIKE '${testLastName.charAt(0)}%'
    `;

    const planWildcard = await getExplainPlan(queryWildcard);
    const scanInfoWildcard = detectScanType(planWildcard);

    // Query 3: ILIKE search (prefix pattern)
    const queryILike = `
      SELECT emp_no, first_name, last_name, hire_date
      FROM employees
      WHERE last_name ILIKE '${testLastName.toLowerCase()}%'
    `;

    const planILike = await getExplainPlan(queryILike);
    const scanInfoILike = detectScanType(planILike);

    const endTime = performance.now();
    const executionTimeMs = Number((endTime - startTime).toFixed(2));

    return NextResponse.json({
      results: [
        {
          query: `SELECT ... WHERE last_name = '${testLastName}'`,
          plan: planWithIndex,
          indexUsed: scanInfoWithIndex.indexUsed,
          scanType: scanInfoWithIndex.scanType,
        },
        {
          query: `SELECT ... WHERE last_name LIKE '${testLastName.charAt(0)}%'`,
          plan: planWildcard,
          indexUsed: scanInfoWildcard.indexUsed,
          scanType: scanInfoWildcard.scanType,
        },
        {
          query: `SELECT ... WHERE last_name ILIKE '${testLastName.toLowerCase()}%'`,
          plan: planILike,
          indexUsed: scanInfoILike.indexUsed,
          scanType: scanInfoILike.scanType,
        },
      ],
      executionTimeMs,
      indexName: 'idx_employees_last_name',
      tableName: 'employees',
      columnName: 'last_name',
    });
  } catch (error) {
    console.error('Performance explain API error:', error);
    return NextResponse.json(
      { error: 'Failed to execute EXPLAIN ANALYZE' },
      { status: 500 }
    );
  }
}
