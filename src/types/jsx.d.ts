import type React from 'react'

declare global {
  namespace JSX {
    type Element = React.JSX.Element
    type ElementClass = React.JSX.ElementClass
    type ElementAttributesProperty = React.JSX.ElementAttributesProperty
    type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute
    type IntrinsicElements = React.JSX.IntrinsicElements
    type IntrinsicAttributes = React.JSX.IntrinsicAttributes
  }
}
