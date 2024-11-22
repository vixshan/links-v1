const fs = require('fs')
const path = require('path')

function patchBuild() {
  const distPath = path.join(process.cwd(), 'dist', 'index.js')

  try {
    let code = fs.readFileSync(distPath, 'utf8')

    // Pattern for the function call including its closing brace
    const functionCallPattern =
      /(\/\/ 11\. Mark resource timing[^\n]*\n\s*\/\/[^\n]*\n\s*markResourceTiming\(\s*timingInfo,\s*originalURL,\s*initiatorType,\s*globalThis,\s*cacheState\s*\)\s*\n\s*})/g

    // Updated pattern for the function definition to properly include closing brace
    const functionDefPattern =
      /(\/\/ https:\/\/w3c\.github\.io\/resource-timing\/#dfn-mark-resource-timing\s*function markResourceTiming[^{]*{[^}]*})/gs

    // Comment out the function call including its brace
    code = code.replace(functionCallPattern, match => {
      return `/* This was causing issues as bun don't support it\n${match.trim()}\n*/`
    })

    // Comment out the function definition
    code = code.replace(functionDefPattern, match => {
      return `/* This was causing issues as bun don't support it\n${match.trim()}\n*/`
    })

    fs.writeFileSync(distPath, code)
    console.log(
      'Successfully patched dist/index.js - removed markResourceTiming'
    )
  } catch (error) {
    console.error('Error patching dist/index.js:', error)
    process.exit(1)
  }
}

patchBuild()
