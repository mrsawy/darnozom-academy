const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');

function resolveRelativeImport(importPath, currentFile) {
  if (importPath.endsWith('.js')) return importPath;
  const dir = path.dirname(currentFile);
  const resolved = path.resolve(dir, importPath);
  const asFile = resolved + '.js';
  const asDir = path.join(resolved, 'index.js');
  if (fs.existsSync(asFile)) return importPath + '.js';
  if (fs.existsSync(asDir)) return importPath.replace(/\/?$/, '') + '/index.js';
  return importPath + '.js';
}

function addJsExtensions(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const modified = content.replace(/(from\s+['"])((?:\.\.\/|\.\/)[^'"]+)(['"])/g, (_, prefix, importPath, suffix) => {
    const withJs = resolveRelativeImport(importPath, filePath);
    return `${prefix}${withJs}${suffix}`;
  });
  if (modified !== content) {
    fs.writeFileSync(filePath, modified, 'utf8');
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full);
    } else if (entry.name.endsWith('.js')) {
      addJsExtensions(full);
    }
  }
}

if (fs.existsSync(distDir)) {
  walkDir(distDir);
}
