# Troubleshooting

Common issues and solutions.

## Installation Issues

### `npm install` fails

**Symptoms:** Tree-sitter native modules fail to build

**Solutions:**
1. Ensure you have build tools installed:
   - macOS: `xcode-select --install`
   - Ubuntu: `sudo apt-get install build-essential`
   - Windows: Install Visual Studio Build Tools

2. Try with Node.js 18 or 20 (not 22+):
   ```bash
   nvm use 18
   npm install -g driftdetect
   ```

3. Clear npm cache:
   ```bash
   npm cache clean --force
   npm install -g driftdetect
   ```

### `npx driftdetect` hangs

**Solutions:**
1. Use global install instead:
   ```bash
   npm install -g driftdetect
   drift init
   ```

2. Clear npx cache:
   ```bash
   rm -rf ~/.npm/_npx
   npx driftdetect init
   ```

---

## Scanning Issues

### Scan takes too long

**Symptoms:** Scan runs for 10+ minutes

**Solutions:**
1. Check `.driftignore` excludes large directories:
   ```gitignore
   node_modules/
   dist/
   build/
   .git/
   vendor/
   ```

2. Scan a subdirectory:
   ```bash
   drift scan src/
   ```

3. Use timeout:
   ```bash
   drift scan --timeout 600000
   ```

4. Use incremental scanning:
   ```bash
   drift scan --incremental
   ```

### No patterns found

**Symptoms:** `drift status` shows 0 patterns

**Solutions:**
1. Ensure you're scanning source files:
   ```bash
   drift scan src/
   ```

2. Check language is supported:
   ```bash
   drift parser --test
   ```

3. Lower confidence threshold:
   ```json
   // .drift/config.json
   {
     "patterns": {
       "minConfidence": 0.3
     }
   }
   ```

4. Check file extensions are recognized:
   - TypeScript: `.ts`, `.tsx`
   - Python: `.py`
   - Java: `.java`
   - C#: `.cs`
   - PHP: `.php`

### Scan fails with error

**Symptoms:** Scan crashes or exits with error

**Solutions:**
1. Run with verbose output:
   ```bash
   drift scan --verbose
   ```

2. Check for syntax errors in your code (Drift handles most, but some crash parsers)

3. Try scanning specific files:
   ```bash
   drift scan src/api/
   ```

4. Report the issue with the error message:
   https://github.com/dadbodgeoff/drift/issues

---

## MCP Issues

### MCP server not connecting

**Symptoms:** AI agent can't find Drift tools

**Solutions:**
1. Verify config file location:
   - Claude Desktop (macOS): `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Claude Desktop (Windows): `%APPDATA%\Claude\claude_desktop_config.json`

2. Check JSON syntax:
   ```json
   {
     "mcpServers": {
       "drift": {
         "command": "npx",
         "args": ["-y", "driftdetect-mcp"]
       }
     }
   }
   ```

3. Restart the AI client after config changes

4. Test MCP server manually:
   ```bash
   npx driftdetect-mcp
   # Should start without errors
   ```

### "Scan required" errors

**Symptoms:** MCP tools return "scan required" error

**Solutions:**
1. Run initial scan:
   ```bash
   cd your-project
   drift init
   drift scan
   ```

2. Ensure `.drift/` directory exists and has data

3. Check you're in the right directory

### Slow MCP responses

**Symptoms:** AI takes long time to get Drift data

**Solutions:**
1. First call is always slower (loading data)

2. Use `drift_status` first (lightweight)

3. For large codebases, pre-build call graph:
   ```bash
   drift callgraph build
   ```

4. Enable caching (default):
   ```json
   {
     "mcp": {
       "cache": {
         "enabled": true
       }
     }
   }
   ```

---

## Call Graph Issues

### Call graph not building

**Symptoms:** `drift callgraph build` fails or shows 0 functions

**Solutions:**
1. Ensure source files are being scanned:
   ```bash
   drift scan --verbose
   ```

2. Check parser status:
   ```bash
   drift parser --test
   ```

3. Try building for specific directory:
   ```bash
   drift callgraph build src/
   ```

### Reachability returns nothing

**Symptoms:** `drift callgraph reach` returns empty results

**Solutions:**
1. Ensure call graph is built:
   ```bash
   drift callgraph status
   ```

2. Check the location format:
   ```bash
   # File:line format
   drift callgraph reach src/api/users.ts:42
   
   # Function name
   drift callgraph reach handleLogin
   ```

3. Increase max depth:
   ```bash
   drift callgraph reach src/api/users.ts:42 --max-depth 20
   ```

---

## Dashboard Issues

### Dashboard won't start

**Symptoms:** `drift dashboard` fails to open

**Solutions:**
1. Check port availability:
   ```bash
   drift dashboard --port 3001
   ```

2. Try without auto-open:
   ```bash
   drift dashboard --no-browser
   # Then open http://localhost:3000 manually
   ```

3. Check for errors:
   ```bash
   drift dashboard --verbose
   ```

### Dashboard shows no data

**Symptoms:** Dashboard opens but is empty

**Solutions:**
1. Run a scan first:
   ```bash
   drift scan
   drift dashboard
   ```

2. Check `.drift/` directory has data

---

## CI Issues

### `drift check` always passes

**Symptoms:** CI never fails even with violations

**Solutions:**
1. Use `--ci` flag:
   ```bash
   drift check --ci --fail-on warning
   ```

2. Ensure patterns are approved:
   ```bash
   drift approve --category api --yes
   drift check --ci
   ```

### `drift check` always fails

**Symptoms:** CI fails on every run

**Solutions:**
1. Lower fail threshold:
   ```bash
   drift check --ci --fail-on error  # Only fail on errors
   ```

2. Ignore specific patterns:
   ```bash
   drift ignore <pattern-id>
   ```

3. Check what's failing:
   ```bash
   drift check --format json
   ```

---

## Getting Help

### Reporting Issues

Include in your bug report:
1. Drift version: `drift --version`
2. Node.js version: `node --version`
3. Operating system
4. Error message (full output)
5. Steps to reproduce

### Community

- [GitHub Issues](https://github.com/dadbodgeoff/drift/issues)
- [GitHub Discussions](https://github.com/dadbodgeoff/drift/discussions)
