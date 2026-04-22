# Recommendation Counting Behavior in buildRecommendation

**Type:** Problem

## Context

When writing tests for `buildRecommendation()` in testStrategy, the expected assertion counts initially seemed misaligned with the actual output. The function categorizes strategies into three buckets and reports missing coverage as "X/Y" counts.

## What happened / What is true

The `buildRecommendation()` function filters strategies into three buckets: custom hooks, components, and other functions. For each bucket with untested items, it reports:
- "X/Y custom hook(s) are missing unit tests." where X = untested hooks, Y = total hooks
- "X/Y component(s) are missing unit tests." where X = untested components, Y = total components
- "X/Y function(s) are missing unit tests." where X = untested functions, Y = total functions

The Y value is the **total count in that category**, not the count of untested items.

Example: If you have 2 non-hook/non-component functions and only 1 is untested, the message is `"1/2 function(s) are missing unit tests."` not `"1/1"` — because Y represents all functions in that category (2), not just the untested ones (1).

## Do

- When writing test assertions, count **all items in the category**, not just untested ones
- Verify which bucket each strategy lands in before predicting the Y count

## Don't

- Assume Y equals the untested count — it's the total count in that category
- Forget that strategies with both `is_custom_hook: false` and `is_component: false` go into "functions"

---

**Keywords:** buildRecommendation, counting, test assertions, categories, buckets
