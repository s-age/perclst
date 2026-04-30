// @ts-check
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Enforce port-type imports when crossing layer boundaries' },
    schema: [],
    messages: {
      usePort:
        "Cross-layer import '{{source}}' must go through a port type (e.g. '{{portsPath}}'). " +
        'Import the interface from ports/, not the concrete implementation.',
      forbiddenLayer:
        "Importing from '{{importLayer}}' is forbidden in '{{fileLayer}}' files. {{suggestion}}"
    }
  },
  create(context) {
    const filepath = context.filename ?? context.getFilename()

    // core/di is the sole wiring exception; tests are exempt
    if (
      filepath.includes('/core/di/') ||
      filepath.includes('/__tests__/') ||
      filepath.includes('.test.ts') ||
      filepath.includes('.spec.ts')
    ) {
      return {}
    }

    function getLayer(path) {
      if (path.includes('/src/cli/')) return 'cli'
      if (path.includes('/src/mcp/')) return 'mcp'
      if (path.includes('/src/validators/')) return 'validators'
      if (path.includes('/src/services/')) return 'services'
      if (path.includes('/src/domains/')) return 'domains'
      if (path.includes('/src/repositories/')) return 'repositories'
      if (path.includes('/src/infrastructures/')) return 'infrastructures'
      return null
    }

    // Absolute prohibitions derived from layers.md allowlists.
    // Ports do not help — the import itself is the violation.
    const forbidden = {
      cli: {
        repositories: 'Route through services instead.',
        infrastructures: 'Route through services instead.',
      },
      mcp: {
        cli: 'Route through services instead.',
        domains: 'Route through services instead.',
        repositories: 'Route through services instead.',
        infrastructures: 'Route through services instead.',
      },
      validators: {
        services: 'validators may only import from errors, types, and constants.',
        domains: 'validators may only import from errors, types, and constants.',
        repositories: 'validators may only import from errors, types, and constants.',
        infrastructures: 'validators may only import from errors, types, and constants.',
      },
      services: {
        // repositories is forbidden even via ports/ — must go through domains
        repositories: 'Route through domains instead.',
        infrastructures: 'Route through domains instead.',
      },
    }

    // Cross-layer imports that are allowed only when going through ports/
    const portRequired = {
      services: new Set(['domains']),
      domains: new Set(['repositories']),
    }

    const fileLayer = getLayer(filepath)
    if (!fileLayer) return {}

    return {
      ImportDeclaration(node) {
        const source = node.source.value
        if (typeof source !== 'string') return

        const importLayer = getLayer(source.replace('@src/', '/src/'))
        if (!importLayer) return
        if (importLayer === fileLayer) return // intra-layer: always OK

        // Check absolute prohibition first
        const suggestion = forbidden[fileLayer]?.[importLayer]
        if (suggestion) {
          context.report({ node, messageId: 'forbiddenLayer', data: { importLayer, fileLayer, suggestion } })
          return
        }

        // Check port requirement
        if (!portRequired[fileLayer]?.has(importLayer)) return

        // Already importing via ports/
        if (source.includes(`/${importLayer}/ports/`)) return

        const portsPath = source.replace(
          new RegExp(`(@src/${importLayer}/)`),
          `$1ports/`
        )
        context.report({ node, messageId: 'usePort', data: { source, portsPath } })
      }
    }
  }
}
