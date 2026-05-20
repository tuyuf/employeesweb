'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  Database, 
  Zap, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp,
  Search,
  Loader2
} from 'lucide-react';

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

interface ApiResponse {
  scenarios: TestScenario[];
  speedup: string;
  searchTerm: string;
  totalExecutionTimeMs: number;
}

export default function PerformancePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());

  const handleRunTest = async () => {
    if (!searchTerm.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/performance/compare?term=${encodeURIComponent(searchTerm)}`);
      
      if (!response.ok) {
        throw new Error('Failed to run performance comparison');
      }
      
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExplain = (index: number) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedCards(newExpanded);
  };

  const getScanTypeColor = (scanType: string) => {
    if (scanType.includes('Index')) return 'bg-green-100 text-green-800 border-green-200';
    if (scanType.includes('Sequential') || scanType.includes('Seq')) return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getSpeedIcon = (time: number) => {
    if (time < 10) return <Zap className="h-5 w-5 text-green-500" />;
    if (time < 100) return <Clock className="h-5 w-5 text-yellow-500" />;
    return <Clock className="h-5 w-5 text-red-500" />;
  };

  // Calculate bar chart widths for speed comparison
  const getBarWidths = () => {
    if (!results || results.scenarios.length < 2) return { indexWidth: 50, generalWidth: 50 };
    
    const indexTime = results.scenarios[0].executionTimeMs;
    const generalTime = results.scenarios[1].executionTimeMs;
    const maxTime = Math.max(indexTime, generalTime, 1); // Avoid division by zero
    
    return {
      indexWidth: Math.max((indexTime / maxTime) * 100, 5),
      generalWidth: Math.max((generalTime / maxTime) * 100, 5)
    };
  };

  const barWidths = getBarWidths();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Performance Analysis
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Test your search queries with EXPLAIN ANALYZE
        </p>
      </div>

      {/* Search Section */}
      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter a search term (e.g., baba)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRunTest()}
                className="pl-10"
              />
            </div>
            <Button 
              onClick={handleRunTest}
              disabled={!searchTerm.trim() || isLoading}
              className="bg-black text-white hover:bg-black/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Run Test
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Error: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!results && !isLoading && !error && (
        <Card className="border-border border-dashed">
          <CardContent className="pt-12 pb-12 text-center">
            <Database className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Ready to Analyze
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Enter a search term above and click &quot;Run Test&quot; to analyze query performance 
              across different search scenarios.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Card key={i} className="border-border">
              <CardContent className="pt-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                  <div className="h-4 bg-muted rounded w-full"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Results */}
      {results && !isLoading && (
        <>
          {/* Results Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Results for &quot;{results.searchTerm}&quot;
            </h2>
            <span className="text-sm text-muted-foreground">
              Total API time: {results.totalExecutionTimeMs}ms
            </span>
          </div>

          {/* Scenario Cards - Index Search & General Search */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Index Search Card */}
            {results.scenarios[0] && (
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Index Search</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={`${getScanTypeColor(results.scenarios[0].scanType)}`}>
                        {results.scenarios[0].scanType}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="font-mono text-xs mt-1">
                    {results.scenarios[0].query}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    {getSpeedIcon(results.scenarios[0].executionTimeMs)}
                    <div>
                      <div className="text-2xl font-bold">
                        {results.scenarios[0].executionTimeMs.toFixed(2)} ms
                      </div>
                      <div className="text-sm text-muted-foreground">Execution Time</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Rows:</span>{' '}
                      <span className="font-mono font-medium">{results.scenarios[0].rowCount}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Index:</span>{' '}
                      <span className="font-mono text-green-600">
                        {results.scenarios[0].indexUsed ? 'Used' : 'Not Used'}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                    <div className="font-mono">
                      shared hit={results.scenarios[0].buffersSharedHit} read={results.scenarios[0].buffersSharedRead}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleExplain(0)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {expandedCards.has(0) ? (
                      <><ChevronUp className="h-4 w-4" /> Hide EXPLAIN</>
                    ) : (
                      <><ChevronDown className="h-4 w-4" /> View EXPLAIN</>
                    )}
                  </button>

                  {expandedCards.has(0) && (
                    <div className="bg-muted/50 rounded-lg p-4 overflow-x-auto">
                      <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">
                        {results.scenarios[0].plan.join('\n')}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* General Search Card */}
            {results.scenarios[1] && (
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">General Search</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={`${getScanTypeColor(results.scenarios[1].scanType)}`}>
                        {results.scenarios[1].scanType}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="font-mono text-xs mt-1">
                    {results.scenarios[1].query}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    {getSpeedIcon(results.scenarios[1].executionTimeMs)}
                    <div>
                      <div className="text-2xl font-bold">
                        {results.scenarios[1].executionTimeMs.toFixed(2)} ms
                      </div>
                      <div className="text-sm text-muted-foreground">Execution Time</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Rows:</span>{' '}
                      <span className="font-mono font-medium">{results.scenarios[1].rowCount}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Index:</span>{' '}
                      <span className="font-mono text-red-600">
                        {results.scenarios[1].indexUsed ? 'Used' : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                    <div className="font-mono">
                      shared hit={results.scenarios[1].buffersSharedHit} read={results.scenarios[1].buffersSharedRead}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleExplain(1)}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {expandedCards.has(1) ? (
                      <><ChevronUp className="h-4 w-4" /> Hide EXPLAIN</>
                    ) : (
                      <><ChevronDown className="h-4 w-4" /> View EXPLAIN</>
                    )}
                  </button>

                  {expandedCards.has(1) && (
                    <div className="bg-muted/50 rounded-lg p-4 overflow-x-auto">
                      <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">
                        {results.scenarios[1].plan.join('\n')}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Speed Comparison Bar Chart */}
          {results.scenarios.length >= 2 && (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Speed Comparison
                </CardTitle>
                <CardDescription>
                  {parseFloat(results.speedup) > 1 ? (
                    <span className="text-green-600 font-medium">
                      {results.speedup}x faster with index
                    </span>
                  ) : (
                    <span>Index vs General search performance</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Index Search Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Index Search</span>
                    <span className="font-mono">{results.scenarios[0].executionTimeMs.toFixed(2)} ms</span>
                  </div>
                  <div className="h-6 bg-green-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${barWidths.indexWidth}%` }}
                    ></div>
                  </div>
                </div>

                {/* General Search Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">General Search</span>
                    <span className="font-mono">{results.scenarios[1].executionTimeMs.toFixed(2)} ms</span>
                  </div>
                  <div className="h-6 bg-red-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full transition-all duration-500"
                      style={{ width: `${barWidths.generalWidth}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Manager Reports Card */}
          {results.scenarios[2] && (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Manager Reports</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getScanTypeColor(results.scenarios[2].scanType)}`}>
                      {results.scenarios[2].scanType}
                    </Badge>
                  </div>
                </div>
                <CardDescription className="font-mono text-xs mt-1">
                  {results.scenarios[2].query}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  {getSpeedIcon(results.scenarios[2].executionTimeMs)}
                  <div>
                    <div className="text-2xl font-bold">
                      {results.scenarios[2].executionTimeMs.toFixed(2)} ms
                    </div>
                    <div className="text-sm text-muted-foreground">Execution Time</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Rows:</span>{' '}
                    <span className="font-mono font-medium">{results.scenarios[2].rowCount}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Index:</span>{' '}
                    <span className={results.scenarios[2].indexUsed ? 'text-green-600' : 'text-red-600'}>
                      {results.scenarios[2].indexUsed ? 'Used' : 'Not Used'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Source:</span>{' '}
                    <span className="font-mono text-xs">SQL View</span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                  <div className="font-mono">
                    shared hit={results.scenarios[2].buffersSharedHit} read={results.scenarios[2].buffersSharedRead}
                  </div>
                </div>

                <button
                  onClick={() => toggleExplain(2)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {expandedCards.has(2) ? (
                    <><ChevronUp className="h-4 w-4" /> Hide EXPLAIN</>
                  ) : (
                    <><ChevronDown className="h-4 w-4" /> View EXPLAIN</>
                  )}
                </button>

                {expandedCards.has(2) && (
                  <div className="bg-muted/50 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-xs font-mono text-foreground whitespace-pre-wrap">
                      {results.scenarios[2].plan.join('\n')}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Index Analysis Summary */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Index Analysis Summary</CardTitle>
              <CardDescription>
                Understanding the performance characteristics of different query patterns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-green-600" />
                    With Index (Optimized)
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Uses Index Scan or Bitmap Index Scan</li>
                    <li>Direct lookup via B-tree index structure</li>
                    <li>O(log n) time complexity</li>
                    <li>Reads only matching rows from index</li>
                    <li>Minimal I/O operations (low buffer reads)</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    Without Index (Sequential)
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Sequential Scan (Full Table Scan)</li>
                    <li>Reads every row in the table</li>
                    <li>O(n) time complexity</li>
                    <li>High I/O overhead for large tables</li>
                    <li>Scales poorly with data growth</li>
                  </ul>
                </div>
              </div>

              <div className="border-t border-border pt-4 mt-4">
                <h4 className="text-sm font-semibold mb-2">Key Metrics Explained</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Execution Time:</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total query execution time in milliseconds
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Scan Type:</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Index Scan vs Sequential Scan
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Buffer Hits:</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pages read from PostgreSQL cache
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Buffer Reads:</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pages read from disk (I/O)
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-muted-foreground border-t border-border pt-4">
        <div>
          <span className="font-medium">Analysis Tool:</span> PostgreSQL EXPLAIN ANALYZE
        </div>
        {results && (
          <div className="flex items-center gap-2">
            <span className="font-medium">API Response:</span>
            <span className="font-mono bg-black text-white px-2 py-0.5 rounded">
              {results.totalExecutionTimeMs}ms
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
