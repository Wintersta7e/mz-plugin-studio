// One rule for what names an identifier in generated code and declarations: ECMAScript's
// IdentifierName, so a letter of any script is kept, as engines and TypeScript read it

/**
An IdentifierName: a start character (a Unicode ID_Start letter, `$` or `_`), then any number of
ID_Continue characters, `$`, ZWNJ or ZWJ. Reserved words match; callers that declare a name
handle them.
@internal exported for tests
*/
export const IDENTIFIER_NAME = /^[\p{ID_Start}$_][\p{ID_Continue}$\u{200C}\u{200D}]*$/u

/**
Whether `name` is an IdentifierName.
*/
export const isIdentifierName = (name: string): boolean => IDENTIFIER_NAME.test(name)
