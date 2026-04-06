const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const file = path.join(process.cwd(), 'src', 'App.tsx');
const text = fs.readFileSync(file, 'utf8');
const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
for (const d of sf.parseDiagnostics) {
  const pos = sf.getLineAndCharacterOfPosition(d.start || 0);
  console.log(JSON.stringify({ message: ts.flattenDiagnosticMessageText(d.messageText, '\n'), line: pos.line + 1, column: pos.character + 1 }));
}
