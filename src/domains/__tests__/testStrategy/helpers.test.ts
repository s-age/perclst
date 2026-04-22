import { describe, it, expect } from 'vitest'
import type { RawFunctionInfo, FunctionStrategy } from '@src/types/testStrategy'
import {
  calcComplexity,
  calcSuggestedTestCaseCount,
  isCustomHook,
  isComponent,
  findMatchingTest,
  buildStrategy,
  buildRecommendation
} from '@src/utils/testStrategyHelpers'

// ============================================================================
// calcComplexity tests
// ============================================================================

describe('calcComplexity', () => {
  it('calculates complexity as 1 + branches + loops + logicalOps + catches', () => {
    const raw: RawFunctionInfo = {
      name: 'testFunc',
      class_name: null,
      lineno: 10,
      branchCount: 2,
      loopCount: 1,
      logicalOpCount: 3,
      catchCount: 1,
      referencedImports: []
    }

    expect(calcComplexity(raw)).toBe(8) // 1 + 2 + 1 + 3 + 1
  })
})

// ============================================================================
// calcSuggestedTestCaseCount tests
// ============================================================================

describe('calcSuggestedTestCaseCount', () => {
  it('returns 1 + branches + 1-for-loop + catches when loops exist', () => {
    const raw: RawFunctionInfo = {
      name: 'testFunc',
      class_name: null,
      lineno: 10,
      branchCount: 2,
      loopCount: 1,
      logicalOpCount: 0,
      catchCount: 2,
      referencedImports: []
    }

    expect(calcSuggestedTestCaseCount(raw)).toBe(6) // 1 + 2 + 1 + 2
  })

  it('returns 1 + branches + 0 + catches when no loops', () => {
    const raw: RawFunctionInfo = {
      name: 'testFunc',
      class_name: null,
      lineno: 10,
      branchCount: 2,
      loopCount: 0,
      logicalOpCount: 0,
      catchCount: 1,
      referencedImports: []
    }

    expect(calcSuggestedTestCaseCount(raw)).toBe(4) // 1 + 2 + 0 + 1
  })
})

// ============================================================================
// isCustomHook tests
// ============================================================================

describe('isCustomHook', () => {
  it('returns true for names starting with "use" and length > 3', () => {
    expect(isCustomHook('useEffect')).toBe(true)
  })

  it('returns false for names not starting with "use"', () => {
    expect(isCustomHook('myFunction')).toBe(false)
  })

  it('returns false for "use" exactly (length <= 3)', () => {
    expect(isCustomHook('use')).toBe(false)
  })
})

// ============================================================================
// isComponent tests
// ============================================================================

describe('isComponent', () => {
  it('returns true when first character is uppercase letter', () => {
    expect(isComponent('MyComponent')).toBe(true)
  })

  it('returns false when first character is lowercase', () => {
    expect(isComponent('myComponent')).toBe(false)
  })

  it('returns false when first character is non-alphabetic', () => {
    expect(isComponent('1Component')).toBe(false)
  })

  it('returns false when empty string', () => {
    expect(isComponent('')).toBe(false)
  })
})

// ============================================================================
// findMatchingTest tests
// ============================================================================

describe('findMatchingTest', () => {
  it('returns matching test function by name', () => {
    const result = findMatchingTest('getUserId', ['test_getUserId', 'other test'])
    expect(result).toBe('test_getUserId')
  })

  it('returns matching test function with case-insensitive search', () => {
    const result = findMatchingTest('calculateTotal', ['CALCULATETOTAL_test', 'other'])
    expect(result).toBe('CALCULATETOTAL_test')
  })

  it('returns null when no matching test function found', () => {
    const result = findMatchingTest('myFunction', ['unrelatedTest', 'otherTest'])
    expect(result).toBeNull()
  })
})

// ============================================================================
// buildStrategy tests
// ============================================================================

describe('buildStrategy', () => {
  it('builds strategy with existing test', () => {
    const raw: RawFunctionInfo = {
      name: 'getUserId',
      class_name: null,
      lineno: 10,
      branchCount: 1,
      loopCount: 0,
      logicalOpCount: 0,
      catchCount: 0,
      referencedImports: []
    }

    const result = buildStrategy(raw, 'vitest', ['test_getUserId'])
    expect(result.existing_test_function).toBe('test_getUserId')
    expect(result.missing_coverage).toHaveLength(0)
  })

  it('marks missing coverage when no existing test', () => {
    const raw: RawFunctionInfo = {
      name: 'myFunction',
      class_name: null,
      lineno: 10,
      branchCount: 1,
      loopCount: 0,
      logicalOpCount: 0,
      catchCount: 0,
      referencedImports: []
    }

    const result = buildStrategy(raw, 'vitest', [])
    expect(result.existing_test_function).toBeNull()
    expect(result.missing_coverage).toHaveLength(1)
    expect(result.missing_coverage[0].details).toContain("No test found for function 'myFunction'")
  })

  it('identifies custom hook and uses "hook" label in missing coverage', () => {
    const raw: RawFunctionInfo = {
      name: 'useMyHook',
      class_name: null,
      lineno: 10,
      branchCount: 0,
      loopCount: 0,
      logicalOpCount: 0,
      catchCount: 0,
      referencedImports: []
    }

    const result = buildStrategy(raw, 'vitest', [])
    expect(result.is_custom_hook).toBe(true)
    expect(result.missing_coverage[0].details).toContain("No test found for hook 'useMyHook'")
  })

  it('identifies component and uses "component" label in missing coverage', () => {
    const raw: RawFunctionInfo = {
      name: 'MyComponent',
      class_name: null,
      lineno: 10,
      branchCount: 0,
      loopCount: 0,
      logicalOpCount: 0,
      catchCount: 0,
      referencedImports: []
    }

    const result = buildStrategy(raw, 'vitest', [])
    expect(result.is_component).toBe(true)
    expect(result.missing_coverage[0].details).toContain(
      "No test found for component 'MyComponent'"
    )
  })
})

// ============================================================================
// buildRecommendation tests
// ============================================================================

describe('buildRecommendation', () => {
  it('returns "Test coverage is good." when all tests exist', () => {
    const strategies: FunctionStrategy[] = [
      {
        function_name: 'func1',
        class_name: null,
        recommended_framework: 'vitest',
        existing_test_function: 'test_func1',
        complexity: 1,
        suggested_test_case_count: 1,
        missing_coverage: [],
        suggested_mocks: [],
        is_custom_hook: false,
        is_component: false
      }
    ]

    expect(buildRecommendation(strategies)).toBe('Test coverage is good.')
  })

  it('reports missing function tests', () => {
    const strategies: FunctionStrategy[] = [
      {
        function_name: 'func1',
        class_name: null,
        recommended_framework: 'vitest',
        existing_test_function: null,
        complexity: 1,
        suggested_test_case_count: 1,
        missing_coverage: [{ type: 'missing_test_function', details: 'No test', lineno: 10 }],
        suggested_mocks: [],
        is_custom_hook: false,
        is_component: false
      },
      {
        function_name: 'func2',
        class_name: null,
        recommended_framework: 'vitest',
        existing_test_function: null,
        complexity: 1,
        suggested_test_case_count: 1,
        missing_coverage: [{ type: 'missing_test_function', details: 'No test', lineno: 15 }],
        suggested_mocks: [],
        is_custom_hook: false,
        is_component: false
      }
    ]

    expect(buildRecommendation(strategies)).toContain('2/2 function(s) are missing unit tests.')
  })

  it('reports missing custom hook tests', () => {
    const strategies: FunctionStrategy[] = [
      {
        function_name: 'useMyHook',
        class_name: null,
        recommended_framework: 'vitest',
        existing_test_function: null,
        complexity: 1,
        suggested_test_case_count: 1,
        missing_coverage: [{ type: 'missing_test_function', details: 'No test', lineno: 10 }],
        suggested_mocks: [],
        is_custom_hook: true,
        is_component: false
      }
    ]

    expect(buildRecommendation(strategies)).toContain('1/1 custom hook(s) are missing unit tests.')
  })

  it('reports missing component tests', () => {
    const strategies: FunctionStrategy[] = [
      {
        function_name: 'MyComponent',
        class_name: null,
        recommended_framework: 'vitest',
        existing_test_function: null,
        complexity: 1,
        suggested_test_case_count: 1,
        missing_coverage: [{ type: 'missing_test_function', details: 'No test', lineno: 10 }],
        suggested_mocks: [],
        is_custom_hook: false,
        is_component: true
      }
    ]

    expect(buildRecommendation(strategies)).toContain('1/1 component(s) are missing unit tests.')
  })

  it('reports high complexity functions', () => {
    const strategies: FunctionStrategy[] = [
      {
        function_name: 'complexFunc',
        class_name: null,
        recommended_framework: 'vitest',
        existing_test_function: 'test_complexFunc',
        complexity: 15,
        suggested_test_case_count: 5,
        missing_coverage: [],
        suggested_mocks: [],
        is_custom_hook: false,
        is_component: false
      }
    ]

    expect(buildRecommendation(strategies)).toContain('1 function(s) have high complexity')
  })

  it('reports functions needing mocks', () => {
    const strategies: FunctionStrategy[] = [
      {
        function_name: 'funcWithDeps',
        class_name: null,
        recommended_framework: 'vitest',
        existing_test_function: 'test_funcWithDeps',
        complexity: 1,
        suggested_test_case_count: 1,
        missing_coverage: [],
        suggested_mocks: ['http', 'database'],
        is_custom_hook: false,
        is_component: false
      }
    ]

    expect(buildRecommendation(strategies)).toContain(
      '1 function(s) need mocking for dependencies.'
    )
  })

  it('combines multiple recommendations', () => {
    const strategies: FunctionStrategy[] = [
      {
        function_name: 'func1',
        class_name: null,
        recommended_framework: 'vitest',
        existing_test_function: null,
        complexity: 1,
        suggested_test_case_count: 1,
        missing_coverage: [{ type: 'missing_test_function', details: 'No test', lineno: 10 }],
        suggested_mocks: ['dependency'],
        is_custom_hook: false,
        is_component: false
      },
      {
        function_name: 'complexFunc',
        class_name: null,
        recommended_framework: 'vitest',
        existing_test_function: 'test_complexFunc',
        complexity: 12,
        suggested_test_case_count: 5,
        missing_coverage: [],
        suggested_mocks: [],
        is_custom_hook: false,
        is_component: false
      }
    ]

    const result = buildRecommendation(strategies)
    expect(result).toContain('1/2 function(s) are missing unit tests.')
    expect(result).toContain('1 function(s) have high complexity')
    expect(result).toContain('1 function(s) need mocking for dependencies.')
  })
})
