# Security

## Reporting a vulnerability

Please report security problems privately through GitHub's private vulnerability reporting
(the Security tab, "Report a vulnerability"), not in a public issue.

## Supported versions

Only the latest release receives fixes. Fixes ship in the next release; older releases are not patched.

## Scope

MZ Plugin Studio itself, and the plugin code it generates.

Text typed into a plugin's fields or a code template's options, imported from a `.mzparams` file, restored from saved data or applied from a preset cannot close the comment or string it is written into and run as code — in the generated plugin, in the code a template inserts, or in the descriptions of the `.d.ts` export. A template option written directly into code must fit there: while any option fails its template's check, the template dialog shows the problem and inserts or copies nothing. A way around either is a vulnerability, except in the two options that hold JavaScript by design (see below).

Known limits, not treated as vulnerabilities:

- Two template options are JavaScript by design and run as written: the Damage Modifier template's **Value** when
  **Modification Type** is "Custom formula", and the Custom Text Code template's **Replacement Expression**. Their
  check rejects line breaks, `;` and comments; it does not make the code safe. Insert only code you trust.

- Text in a field can still begin a line that RPG Maker MZ reads as an annotation tag (for example `@param`).
  The app warns about it. It can change how MZ presents or configures the plugin; it cannot make the text
  run as code.
- The app accepts Chromium's `--remote-debugging-port` switch. A program that can start the app with that
  switch already runs as you and can change your files directly.
