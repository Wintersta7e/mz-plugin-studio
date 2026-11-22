/**
The plugin's own code with a template's code appended: after a blank line below code already
there, or as the whole text when there is none (whitespace only counts as none)
*/
export function appendTemplateCode(customCode: string, code: string): string {
  return customCode.trim() === '' ? code : customCode + '\n\n' + code
}
