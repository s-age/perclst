// @ts-check
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: { description: 'Prefer fs operations over shell commands in repositories' },
    schema: [],
    messages: {
      noShellFsOp:
        'Avoid shell file-system commands (rm, mv, cp, mkdir, touch) in repositories. ' +
        'Use Node.js fs module via an infrastructure instead (see repository-operation-placement.md).'
    }
  },
  create(context) {
    const shellFsPattern = /\b(rm|mv|cp|mkdir|touch)\b/
    return {
      CallExpression(node) {
        const callee = node.callee
        const isFnName =
          (callee.type === 'Identifier' && (callee.name === 'exec' || callee.name === 'execSync')) ||
          (callee.type === 'MemberExpression' &&
            callee.property.type === 'Identifier' &&
            (callee.property.name === 'exec' || callee.property.name === 'execSync'))
        if (!isFnName) return
        const firstArg = node.arguments[0]
        if (!firstArg) return
        if (firstArg.type === 'Literal' && typeof firstArg.value === 'string') {
          if (shellFsPattern.test(firstArg.value)) {
            context.report({ node, messageId: 'noShellFsOp' })
          }
        }
      }
    }
  }
}
