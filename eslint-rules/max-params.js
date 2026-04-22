// @ts-check
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'suggestion',
    docs: { description: 'Enforce a maximum number of parameters with actionable guidance' },
    schema: [{ type: 'object', properties: { max: { type: 'integer', minimum: 0 } }, additionalProperties: false }],
    messages: {
      tooManyParams:
        'Function has too many parameters ({{count}}). ' +
        'If the responsibility is too large, consider splitting the function. ' +
        'Consider grouping related parameters into an object.'
    }
  },
  create(context) {
    const max = context.options[0]?.max ?? 4

    function check(node) {
      const params = node.params ?? []
      if (params.length > max) {
        context.report({ node, messageId: 'tooManyParams', data: { count: params.length } })
      }
    }

    return {
      FunctionDeclaration: check,
      FunctionExpression: check,
      ArrowFunctionExpression: check
    }
  }
}
