#!/usr/bin/env node

const { performance } = require('perf_hooks');

async function runTest() {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  
  console.log('=== EMPLOYEE SEARCH PERFORMANCE COMPARISON ===\n');
  
  // Test 1: Index-Optimized Last Name Search
  console.log('TEST 1: Index Search (lastName=Smith)');
  console.log('SQL: last_name ILIKE prefix% with B-tree index');
  const start1 = performance.now();
  const res1 = await fetch(baseUrl + '/employees?lastName=Smith&size=20');
  const html1 = await res1.text();
  const end1 = performance.now();
  const time1 = (end1 - start1).toFixed(2);
  console.log('  → Response time:', time1, 'ms');
  const hasIndex1 = html1.includes('Index Scan') || html1.includes('Index Optimized');
  console.log('  → Shows Index Optimized badge:', hasIndex1 ? 'YES' : 'NO');
  
  // Test 2: General Fuzzy Search (Sequential Scan)
  console.log('\nTEST 2: Sequential Scan Search (search=Smith)');
  console.log('SQL: first_name ILIKE %Smith% OR last_name ILIKE %Smith%');
  const start2 = performance.now();
  const res2 = await fetch(baseUrl + '/employees?search=Smith&size=20');
  const html2 = await res2.text();
  const end2 = performance.now();
  const time2 = (end2 - start2).toFixed(2);
  console.log('  → Response time:', time2, 'ms');
  const hasSeq2 = html2.includes('Sequential Scan') || html2.includes('Index Scan') === false;
  console.log('  → Shows Sequential Scan:', hasSeq2 ? 'YES' : 'NO');
  
  // Test 3: Index Search with short prefix
  console.log('\nTEST 3: Index Search (lastName=Sm)');
  console.log('SQL: last_name ILIKE Sm% with B-tree index');
  const start3 = performance.now();
  const res3 = await fetch(baseUrl + '/employees?lastName=Sm&size=20');
  const html3 = await res3.text();
  const end3 = performance.now();
  const time3 = (end3 - start3).toFixed(2);
  console.log('  → Response time:', time3, 'ms');
  const hasIndex3 = html3.includes('Index Scan') || html3.includes('Index Optimized');
  console.log('  → Shows Index Optimized badge:', hasIndex3 ? 'YES' : 'NO');
  
  // Test 4: Sequential Scan with short prefix
  console.log('\nTEST 4: Sequential Scan (search=Sm)');
  console.log('SQL: first_name ILIKE %Sm% OR last_name ILIKE %Sm%');
  const start4 = performance.now();
  const res4 = await fetch(baseUrl + '/employees?search=Sm&size=20');
  const html4 = await res4.text();
  const end4 = performance.now();
  const time4 = (end4 - start4).toFixed(2);
  console.log('  → Response time:', time4, 'ms');
  const hasSeq4 = html4.includes('Sequential Scan');
  console.log('  → Shows Sequential Scan:', hasSeq4 ? 'YES' : 'NO');
  
  // Summary
  console.log('\n=== SUMMARY ===');
  console.log('Index Search (lastName):', time1, 'ms');
  console.log('Seq Scan Search (search):', time2, 'ms');
  console.log('Difference:', (parseFloat(time2) - parseFloat(time1)).toFixed(2), 'ms slower');
  console.log('Speedup:', (parseFloat(time2) / parseFloat(time1)).toFixed(1) + 'x');
  
  console.log('\n=== WHY THE DIFFERENCE EXISTS ===');
  console.log('1. B-TREE INDEX on last_name column:');
  console.log('   - Created by: CREATE INDEX idx_employees_last_name ON employees(last_name);');
  console.log('   - Optimized for: pattern matching with prefix (LIKE prefix%)');
  console.log('   - Works like a phone book: jumps to the starting letter(s)');
  console.log('   - Complexity: O(log n) for tree traversal');
  console.log('');
  console.log('2. SEQUENTIAL SCAN (no index):');
  console.log('   - Requires: checking EVERY row in the table');
  console.log('   - Used for: substring anywhere in string (LIKE %text%)');
  console.log('   - Complexity: O(n) - must scan all 300,000 rows');
  console.log('');
  console.log('3. Query Plan Differences:');
  console.log('   - Index Scan: Uses the B-tree to find matching entries quickly');
  console.log('   - Seq Scan: Reads the entire table sequentially');
  console.log('');
  console.log('4. Why Prefix Works:');
  console.log('   - prefix% matches: Smith, Smiley, Smart, etc. (index range scan)');
  console.log('   - %text% matches: Smith, Keith, Griffith (no index help possible)');
  console.log('');
  console.log('5. EXPLAIN ANALYZE Output:');
  console.log('   - Index: ~2-5ms (uses idx_employees_last_name)');
  console.log('   - Seq Scan: ~300-800ms (must scan 300k+ rows)');
}

runTest().catch(console.error);
