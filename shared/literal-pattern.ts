// The one definition of how a piece of literal text becomes a category pattern.
//
// The transaction shortcut sends text the user selected, not a regular
// expression, so the text is escaped before it is stored: every PostgreSQL ARE
// metacharacter is prefixed with a backslash, which makes the stored expression
// match the text literally. Category matching uses the case-insensitive `~*`
// operator, so the escape is the only transformation needed.
//
// The append endpoint and the literal match-count preview both build their
// pattern from this function, so the text that is stored and the text that is
// previewed cannot drift apart.
//
// `-` is deliberately not escaped: it is only special inside a bracket
// expression, and every bracket is escaped, so it is literal everywhere else.

const ARE_METACHARACTERS = /[.*+?^${}()|[\]\\]/g;

export function escapeLiteralPattern(text: string): string {
  return text.replace(ARE_METACHARACTERS, '\\$&');
}
