/**
 * `@assistant-ui/react-native` can install nested `@assistant-ui/core` + `@assistant-ui/store`,
 * which duplicates React context for AuiProvider. Remove nested copies so everything resolves
 * to the workspace-hoisted packages (Metro + Node agree).
 */
const fs = require('fs');
const path = require('path');

const roots = [path.join(__dirname, '..')];

for (const root of roots) {
  const nestedAssistantUi = path.join(
    root,
    'node_modules',
    '@assistant-ui',
    'react-native',
    'node_modules',
    '@assistant-ui'
  );

  if (fs.existsSync(nestedAssistantUi)) {
    fs.rmSync(nestedAssistantUi, { recursive: true, force: true });
    console.log('[prune-nested-assistant-ui] removed', nestedAssistantUi);
  }
}
