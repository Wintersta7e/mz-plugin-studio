/**
A `@param` line whose name holds one of these tags is read as the one-line format
(`name @type number @default 0`): the name ends before the first such tag and the rest is read
as the parameter's settings.
*/
export const COMPACT_PARAM_TAG =
  /@(?:text|type|desc|default|min|max|dir|parent|on|off|option|decimals)\s/i
