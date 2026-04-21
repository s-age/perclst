import { describe, it, expect } from 'vitest'
import type { RawFunctionInfo, FunctionStrategy, TestFramework } from '@src/types/testStrategy'

// ============================================================================
// calcComplexity tests
// ============================================================================

describe('calcComplexity', () => {
  it('calculates complexity as 1 + branches + loops + logicalOps + catches', () => {
    const calcComplexity = (raw: RawFunctionInfo): number => {
      return 1 + raw.branchCount + raw.loopCount + raw.logicalOpCount + raw.catchCount
    }

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
    const calcSuggestedTestCaseCount = (raw: RawFunctionInfo): number => {
      return 1 + raw.branchCount + (raw.loopCount > 0 ? 1 : 0) + raw.catchCount
    }

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
    const calcSuggestedTestCaseCount = (raw: RawFunctionInfo): number => {
      return 1 + raw.branchCount + (raw.loopCount > 0 ? 1 : 0) + raw.catchCount
    }

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
    const isCustomHook = (name: string): boolean => {
      return name.startsWith('use') && name.length > 3
    }

    expect(isCustomHook('useEffect')).toBe(true)
  })

  it('returns false for names not starting with "use"', () => {
    const isCustomHook = (name: string): boolean => {
      return name.startsWith('use') && name.length > 3
    }

    expect(isCustomHook('myFunction')).toBe(false)
  })

  it('returns false for "use" exactly (length <= 3)', () => {
    const isCustomHook = (name: string): boolean => {
      return name.startsWith('use') && name.length > 3
    }

    expect(isCustomHook('use')).toBe(false)
  })
})

// ============================================================================
// isComponent tests
// ============================================================================

describe('isComponent', () => {
  it('returns true when first character is uppercase letter', () => {
    const isComponent = (name: string): boolean => {
      return (
        name.length > 0 && name[0] === name[0].toUpperCase() && name[0] !== name[0].toLowerCase()
      )
    }

    expect(isComponent('MyComponent')).toBe(true)
  })

  it('returns false when first character is lowercase', () => {
    const isComponent = (name: string): boolean => {
      return (
        name.length > 0 && name[0] === name[0].toUpperCase() && name[0] !== name[0].toLowerCase()
      )
    }

    expect(isComponent('myComponent')).toBe(false)
  })

  it('returns false when first character is non-alphabetic', () => {
    const isComponent = (name: string): boolean => {
      return (
        name.length > 0 && name[0] === name[0].toUpperCase() && name[0] !== name[0].toLowerCase()
      )
    }

    expect(isComponent('1Component')).toBe(false)
  })

  it('returns false when empty string', () => {
    const isComponent = (name: string): boolean => {
      return (
        name.length > 0 && name[0] === name[0].toUpperCase() && name[0] !== name[0].toLowerCase()
      )
    }

    expect(isComponent('')).toBe(false)
  })
})

// ============================================================================
// findMatchingTest tests
// ============================================================================

describe('findMatchingTest', () => {
  it('returns matching test function by name', () => {
    const findMatchingTest = (functionName: string, testFunctions: string[]): string | null => {
      const words = functionName
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .toLowerCase()
      for (const tf of testFunctions) {
        const lower = tf.toLowerCase()
        if (lower.includes(words) || lower.includes(functionName.toLowerCase())) return tf
      }
      return null
    }

    const result = findMatchingTest('getUserId', ['test_getUserId', 'other test'])
    expect(result).toBe('test_getUserId')
  })

  it('returns matching test function with case-insensitive search', () => {
    const findMatchingTest = (functionName: string, testFunctions: string[]): string | null => {
      const words = functionName
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .toLowerCase()
      for (const tf of testFunctions) {
        const lower = tf.toLowerCase()
        if (lower.includes(words) || lower.includes(functionName.toLowerCase())) return tf
      }
      return null
    }

    const result = findMatchingTest('calculateTotal', ['CALCULATETOTAL_test', 'other'])
    expect(result).toBe('CALCULATETOTAL_test')
  })

  it('returns null when no matching test function found', () => {
    const findMatchingTest = (functionName: string, testFunctions: string[]): string | null => {
      const words = functionName
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .toLowerCase()
      for (const tf of testFunctions) {
        const lower = tf.toLowerCase()
        if (lower.includes(words) || lower.includes(functionName.toLowerCase())) return tf
      }
      return null
    }

    const result = findMatchingTest('myFunction', ['unrelatedTest', 'otherTest'])
    expect(result).toBeNull()
  })
})

// ============================================================================
// buildStrategy tests
// ============================================================================

describe('buildStrategy', () => {
  const buildStrategy = (
    raw: RawFunctionInfo,
    framework: TestFramework,
    testFunctions: string[]
  ) => {
    const isCustomHook = (name: string): boolean => name.startsWith('use') && name.length > 3
    const isComponent = (name: string): boolean =>
      name.length > 0 && name[0] === name[0].toUpperCase() && name[0] !== name[0].toLowerCase()
    const calcComplexity = (raw: RawFunctionInfo): number =>
      1 + raw.branchCount + raw.loopCount + raw.logicalOpCount + raw.catchCount
    const calcSuggestedTestCaseCount = (raw: RawFunctionInfo): number =>
      1 + raw.branchCount + (raw.loopCount > 0 ? 1 : 0) + raw.catchCount
    const findMatchingTest = (functionName: string, testFunctions: string[]): string | null => {
      const words = functionName
        .replace(/([A-Z])/g, ' $1')
        .trim()
        .toLowerCase()
      for (const tf of testFunctions) {
        const lower = tf.toLowerCase()
        if (lower.includes(words) || lower.includes(functionName.toLowerCase())) return tf
      }
      return null
    }

    const hook = !raw.class_name && isCustomHook(raw.name)
    const component = !raw.class_name && isComponent(raw.name)
    const complexity = calcComplexity(raw)
    const existingTest = findMatchingTest(raw.name, testFunctions)

    const missingCoverage: FunctionStrategy['missing_coverage'] = []
    if (!existingTest) {
      const label = hook ? 'hook' : component ? 'component' : 'function'
      missingCoverage.push({
        type: 'missing_test_function',
        details: `No test found for ${label} '${raw.name}'`,
        lineno: raw.lineno
      })
    }

    return {
      function_name: raw.name,
      class_name: raw.class_name,
      recommended_framework: framework,
      existing_test_function: existingTest,
      complexity,
      suggested_test_case_count: calcSuggestedTestCaseCount(raw),
      missing_coverage: missingCoverage,
      suggested_mocks: raw.referencedImports,
      is_custom_hook: hook,
      is_component: component
    }
  }

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
  const buildRecommendation = (strategies: FunctionStrategy[]): string => {
    const hooks = strategies.filter((s) => s.is_custom_hook)
    const components = strategies.filter((s) => s.is_component && !s.is_custom_hook)
    const others = strategies.filter((s) => !s.is_custom_hook && !s.is_component)
    const untested = (arr: FunctionStrategy[]) =>
      arr.filter((s) => !s.existing_test_function).length

    const recs: string[] = []
    const uh = untested(hooks)
    const uc = untested(components)
    const uo = untested(others)
    if (uh > 0) recs.push(`${uh}/${hooks.length} custom hook(s) are missing unit tests.`)
    if (uc > 0) recs.push(`${uc}/${components.length} component(s) are missing unit tests.`)
    if (uo > 0) recs.push(`${uo}/${others.length} function(s) are missing unit tests.`)

    const highComplexity = strategies.filter((s) => s.complexity > 10)
    if (highComplexity.length > 0) {
      const names = highComplexity
        .slice(0, 3)
        .map((f) => f.function_name)
        .join(', ')
      recs.push(
        `${highComplexity.length} function(s) have high complexity (e.g., ${names}). Testing is recommended.`
      )
    }

    const needMocks = strategies.filter((s) => s.suggested_mocks.length > 0)
    if (needMocks.length > 0)
      recs.push(`${needMocks.length} function(s) need mocking for dependencies.`)

    return recs.length > 0 ? recs.join(' ') : 'Test coverage is good.'
  }

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
