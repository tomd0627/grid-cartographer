export default {
  extends: ['stylelint-config-standard'],
  plugins: ['stylelint-order', 'stylelint-use-logical'],
  rules: {
    'color-named': 'never',
    'csstools/use-logical': [
      true,
      {
        except: ['resize', 'float', 'clear', 'overflow-x', 'overflow-y'],
      },
    ],
    // Allow BEM class naming convention (block__element--modifier)
    'selector-class-pattern': [
      '^[a-z][a-z0-9]*(-[a-z0-9]+)*(__[a-z][a-z0-9]*(-[a-z0-9]+)*)?(--[a-z][a-z0-9]*(-[a-z0-9]+)*)*$',
      { message: (selector) => `Expected BEM class selector "${selector}"` },
    ],
    // Allow vendor-prefixed properties that are genuinely still needed
    'property-no-vendor-prefix': [
      true,
      {
        ignoreProperties: ['backdrop-filter', 'font-smoothing', 'text-size-adjust', 'appearance'],
      },
    ],
    // Only require quotes for font names with spaces
    'font-family-name-quotes': 'always-where-required',
    'order/properties-alphabetical-order': true,
  },
};
