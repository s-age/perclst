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
        'Import the interface from ports/, not the concrete implementation.'
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
      if (path.includes('/src/services/')) return 'services'
      if (path.includes('/src/domains/')) return 'domains'
      if (path.includes('/src/repositories/')) return 'repositories'
      if (path.includes('/src/infrastructures/')) return 'infrastructures'
      return null
    }

    const fileLayer = getLayer(filepath)
    if (!fileLayer) return {}

    // Layer order (lower index = higher in the stack)
    const layerOrder = ['services', 'domains', 'repositories', 'infrastructures']

    function isLowerLayer(fileL, importL) {
      return layerOrder.indexOf(importL) > layerOrder.indexOf(fileL)
    }

    // Layers that expose a ports/ subdirectory
    const portsLayers = new Set(['domains', 'repositories'])

    return {
      ImportDeclaration(node) {
        const source = node.source.value
        if (typeof source !== 'string') return

        const importLayer = getLayer(source.replace('@src/', '/src/'))
        if (!importLayer) return
        if (!isLowerLayer(fileLayer, importLayer)) return

        // repositories → infrastructures: no ports convention, allow direct import
        if (fileLayer === 'repositories' && importLayer === 'infrastructures') return

        // Lower layer has no ports/ convention (infrastructures)
        if (!portsLayers.has(importLayer)) return

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
