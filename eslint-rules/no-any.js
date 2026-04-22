// @ts-check
/** @type {import('eslint').Rule.RuleModule} */
export default {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow the any type with policy guidance' },
    schema: [],
    messages: {
      noAny:
        "Unexpected 'any'. " +
        'Exceptions: library-dependent types or cases where generics cannot resolve the type ' +
        '(suppress with eslint-disable-next-line and a comment explaining why). ' +
        'Otherwise, ask a reviewer before suppressing.'
    }
  },
  create(context) {
    return {
      TSAnyKeyword(node) {
        context.report({ node, messageId: 'noAny' })
      }
    }
  }
}
