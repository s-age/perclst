import type {
  RawFunctionInfo,
  TestFramework,
  MissingCoverage,
  FunctionStrategy
} from '@src/types/testStrategy'

export function calcComplexity(raw: RawFunctionInfo): number {
  return 1 + raw.branchCount + raw.loopCount + raw.logicalOpCount + raw.catchCount
}

export function calcSuggestedTestCaseCount(raw: RawFunctionInfo): number {
  // 1 happy-path + 1 per branch + 1 empty-collection if loops exist + 1 per error path
  return 1 + raw.branchCount + (raw.loopCount > 0 ? 1 : 0) + raw.catchCount
}

export function isCustomHook(name: string): boolean {
  return name.startsWith('use') && name.length > 3
}

export function isComponent(name: string): boolean {
  return name.length > 0 && name[0] === name[0].toUpperCase() && name[0] !== name[0].toLowerCase()
}

export function findMatchingTest(functionName: string, testFunctions: string[]): string | null {
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

export function buildStrategy(
  raw: RawFunctionInfo,
  framework: TestFramework,
  testFunctions: string[]
): FunctionStrategy {
  const hook = !raw.class_name && isCustomHook(raw.name)
  const component = !raw.class_name && isComponent(raw.name)
  const complexity = calcComplexity(raw)
  const existingTest = findMatchingTest(raw.name, testFunctions)

  const missingCoverage: MissingCoverage[] = []
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

export function buildRecommendation(strategies: FunctionStrategy[]): string {
  const hooks = strategies.filter((s) => s.is_custom_hook)
  const components = strategies.filter((s) => s.is_component && !s.is_custom_hook)
  const others = strategies.filter((s) => !s.is_custom_hook && !s.is_component)
  const untested = (arr: FunctionStrategy[]) => arr.filter((s) => !s.existing_test_function).length

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
