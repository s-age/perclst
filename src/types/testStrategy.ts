export type TestFramework = 'jest' | 'vitest'

export type RawFunctionInfo = {
  name: string
  class_name?: string      // set for class methods; absent for top-level functions
  lineno: number
  branchCount: number      // if / ternary / case clauses
  loopCount: number        // for / for-in / for-of / while / do
  logicalOpCount: number   // && / || / ??
  catchCount: number       // catch clauses
  referencedImports: string[]
}

export type MissingCoverage = {
  type: string
  details: string
  lineno?: number
}

export type FunctionStrategy = {
  function_name: string
  class_name?: string      // set for class methods; absent for top-level functions
  recommended_framework: TestFramework
  existing_test_function: string | null
  complexity: number
  suggested_test_case_count: number
  missing_coverage: MissingCoverage[]
  suggested_mocks: string[]
  is_custom_hook: boolean
  is_component: boolean
}

export type TestStrategyOptions = {
  targetFilePath: string
  testFilePath?: string
}

export type TestStrategyResult = {
  target_file_path: string
  corresponding_test_file: string | null
  strategies: FunctionStrategy[]
  overall_recommendation: string
  error?: string
}
