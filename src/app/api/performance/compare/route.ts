import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

interface ExplainResult {
  'QUERY PLAN': string;
}

interface TestScenario {
  name: string;
  query: string;
  plan: string[];
  executionTimeMs: number;
  scanType: string;
  indexUsed: boolean;
  rowCount: number;
  buffersSharedHit: number;
  buffersSharedRead: number;
}

/**
 * Execute EXPLAIN ANALYZE and parse results
 */
async function runExplainQuery(
  query: string,
  enableIndex: boolean = true
): Promise<{
  plan: string[];
  executionTimeMs: number;
  scanType: string;
  indexUsed: boolean;
  rowCount: number;
  buffersSharedHit: number;
  buffersSharedRead: number;
}> {
  // Use transaction to ensure consistent connection for SET commands
  return await prisma.$transaction(async (tx) => {
    // Disable indexes if needed for sequential scan demo
    if (!enableIndex) {
      await tx.$executeRawUnsafe(`SET LOCAL enable_bitmapscan = off;`);
      await tx.$executeRawUnsafe(`SET LOCAL enable_indexscan = off;`);
    }

    // Run EXPLAIN ANALYZE
    const explainResult = await tx.$queryRawUnsafe<ExplainResult[]>(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${query}`
    );

    const plan = explainResult.map(row => row['QUERY PLAN']);
    const planText = plan.join('\n');

    // Parse execution time
    const execTimeMatch = planText.match(/Execution Time:\s*([\d.]+)\s*ms/);
    const executionTimeMs = execTimeMatch ? parseFloat(execTimeMatch[1]) : 0;

    // Parse row count from "rows=..."
    const rowsMatch = planText.match(/rows=(\d+)/);
    const rowCount = rowsMatch ? parseInt(rowsMatch[1]) : 0;

    // Parse buffer statistics
    const sharedHitMatch = planText.match(/shared hit=(\d+)/);
    const sharedReadMatch = planText.match(/shared read=(\d+)/);
    const buffersSharedHit = sharedHitMatch ? parseInt(sharedHitMatch[1]) : 0;
    const buffersSharedRead = sharedReadMatch ? parseInt(sharedReadMatch[1]) : 0;

    // Detect scan type (check Seq Scan first)
    let scanType = 'Unknown';
    let indexUsed = false;

    if (planText.includes('Seq Scan') || planText.includes('Sequential Scan')) {
      scanType = 'Sequential Scan';
      indexUsed = false;
    } else if (planText.includes('Bitmap Index Scan') || planText.includes('Bitmap Heap Scan')) {
      scanType = 'Bitmap Index Scan';
      indexUsed = true;
    } else if (planText.includes('Index Only Scan')) {
      scanType = 'Index Only Scan';
      indexUsed = true;
    } else if (planText.includes('Index Scan')) {
      scanType = 'Index Scan';
      indexUsed = true;
    }

    return {
      plan,
      executionTimeMs,
      scanType,
      indexUsed,
      rowCount,
      buffersSharedHit,
      buffersSharedRead,
    };
  }, {
    isolationLevel: 'Serializable',
    maxWait: 10000,
    timeout: 60000,
  });
}

export async function GET(request: NextRequest) {
  const startTime = performance.now();

  try {
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('term') || 'baba';
    const escapedTerm = searchTerm.replace(/'/g, "''");

    // Scenario 1: Index Search (Last Name with prefix matching)
    const indexSearchQuery = `
      SELECT emp_no, first_name, last_name, hire_date
      FROM employees
      WHERE last_name ILIKE '${escapedTerm}%'
    `;

    // Scenario 2: General Search (substring matching with forced sequential scan)
    const generalSearchQuery = `
      SELECT emp_no, first_name, last_name, hire_date
      FROM employees
      WHERE first_name ILIKE '%${escapedTerm}%' 
         OR last_name ILIKE '%${escapedTerm}%'
    `;

    // Scenario 3: Manager Reports (SQL View)
    const managerReportsQuery = `
      SELECT manager_emp_no, manager_full_name, department_name, tenure_start_date
      FROM vw_manager_profiles
    `;

    // Run all three scenarios
    const [indexResult, generalResult, managerResult] = await Promise.all([
      // Index search with index enabled
      runExplainQuery(indexSearchQuery, true),
      // General search with index disabled for comparison
      runExplainQuery(generalSearchQuery, false),
      // Manager reports
      runExplainQuery(managerReportsQuery, true),
    ]);

    const scenarios: TestScenario[] = [
      {
        name: 'Index Search (Last Name)',
        query: `SELECT ... WHERE last_name ILIKE '${escapedTerm}%'`,
        ...indexResult,
      },
      {
        name: 'General Search (Substring)',
        query: `SELECT ... WHERE first_name ILIKE '%${escapedTerm}%' OR last_name ILIKE '%${escapedTerm}%'`,
        ...generalResult,
      },
      {
        name: 'Manager Reports (SQL View)',
        query: `SELECT ... FROM vw_manager_profiles`,
        ...managerResult,
      },
    ];

    // Calculate speedup
    const indexTime = scenarios[0].executionTimeMs;
    const generalTime = scenarios[1].executionTimeMs;
    const speedup = generalTime > 0 ? (generalTime / indexTime).toFixed(1) : '0';

    const endTime = performance.now();
    const totalExecutionTimeMs = Number((endTime - startTime).toFixed(2));

    return NextResponse.json({
      scenarios,
      speedup,
      searchTerm,
      totalExecutionTimeMs,
    });
  } catch (error) {
    console.error('Performance comparison error:', error);
    return NextResponse.json(
      { error: 'Failed to run performance comparison' },
      { status: 500 }
    );
  }
}
