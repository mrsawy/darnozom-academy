/**
 * React 19 + Radix: useComposedRefs(...refs) used `refs` (a new array every
 * call) as a useCallback dependency, which recreates the ref callback every
 * render and triggers infinite setRef cleanup/attach loops.
 *
 * Patches every @radix-ui/react-compose-refs dist file under node_modules.
 */
const fs = require('fs');
const path = require('path');

const OLD = `function useComposedRefs(...refs) {
  return React.useCallback(composeRefs(...refs), refs);
}`;

const NEW = `function useComposedRefs(...refs) {
  // Stabilize callback identity across renders (React 19 ref cleanups).
  // Rest \`refs\` is a new array each call, so it must not be a useCallback dep.
  const refsRef = React.useRef(refs);
  refsRef.current = refs;
  return React.useCallback((node) => composeRefs(...refsRef.current)(node), []);
}`;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === 'dist') {
        // still walk dist
      }
      if (entry.name === 'node_modules' || entry.name === '.pnpm' || entry.name === 'dist' || !entry.name.startsWith('.')) {
        walk(full, out);
      }
    } else if (
      entry.name === 'index.js' ||
      entry.name === 'index.mjs'
    ) {
      if (full.replace(/\\/g, '/').includes('@radix-ui/react-compose-refs/dist/')) {
        out.push(full);
      }
    }
  }
  return out;
}

const roots = [process.cwd(), path.join(process.cwd(), 'apps/client')];
const files = new Set();
for (const root of roots) {
  for (const f of walk(path.join(root, 'node_modules'))) {
    files.add(f);
  }
}

let patched = 0;
let skipped = 0;
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes('refsRef.current = refs')) {
    skipped += 1;
    continue;
  }
  if (!text.includes(OLD)) {
    continue;
  }
  fs.writeFileSync(file, text.replace(OLD, NEW));
  patched += 1;
  console.log('[patch-radix-compose-refs] patched', path.relative(process.cwd(), file));
}

console.log(`[patch-radix-compose-refs] done (patched=${patched}, already=${skipped})`);
