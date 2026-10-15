/** Every published measurement must carry enough context to reproduce it. */
export interface BenchmarkResult {
  readonly workload: string;
  readonly machine: string;
  readonly engineConfiguration: string;
  readonly commit: string;
  readonly datasetSize: string;
  readonly command: string;
  readonly result: string;
}
