const fs = require('fs');

const htmlContent = fs.readFileSync('design/code.html', 'utf8');
const scriptMatch = htmlContent.match(/tailwind\.config\s*=\s*(\{[\s\S]*?\})\s*</);

if (scriptMatch) {
  try {
    const configStr = scriptMatch[1].replace(/,\s*}/g, '}'); // Remove trailing commas
    const config = eval('(' + configStr + ')');
    const extend = config.theme.extend;

    let cssLines = [
      '@import "tailwindcss";',
      '',
      '@theme {',
    ];

    if (extend.colors) {
      for (const [key, value] of Object.entries(extend.colors)) {
        cssLines.push(`  --color-${key}: ${value};`);
      }
    }
    
    if (extend.borderRadius) {
      for (const [key, value] of Object.entries(extend.borderRadius)) {
        if (key === 'DEFAULT') {
          cssLines.push(`  --radius: ${value};`);
        } else {
          cssLines.push(`  --radius-${key}: ${value};`);
        }
      }
    }
    
    if (extend.spacing) {
      for (const [key, value] of Object.entries(extend.spacing)) {
        cssLines.push(`  --spacing-${key}: ${value};`);
      }
    }

    if (extend.fontFamily) {
      for (const [key, value] of Object.entries(extend.fontFamily)) {
        cssLines.push(`  --font-${key}: ${value.join(', ')};`);
      }
    }
    
    // Note: fontSize in tailwind.config is typically [size, { lineHeight, letterSpacing, fontWeight }]
    // We can map it roughly, but in v4 it's better to stick to utility classes or define custom utilities if needed.
    // For simplicity, we can just define --text-* for the sizes
    
    cssLines.push('}');
    
    cssLines.push(`
@layer base {
  :root {
    color-scheme: dark;
  }
}
`);
    
    cssLines.push(`
.material-symbols-outlined {
  font-variation-settings: 'FILL' 1;
}

body {
  min-height: max(884px, 100dvh);
}
`);

    fs.writeFileSync('app/globals.css', cssLines.join('\n'));
    console.log('Successfully generated app/globals.css');
  } catch (e) {
    console.error('Error parsing config:', e);
  }
} else {
  console.log('Could not find tailwind.config in code.html');
}
