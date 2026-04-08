#!/bin/bash

# ============================================================
#  new-project.sh
#  Run this script to set up a new React + Tailwind + Vite
#  project in seconds.
#
#  USAGE:
#    1. Copy this script into the folder where you want your
#       new project to live.
#    2. In the terminal, run:  bash new-project.sh
#    3. Follow the prompts.
# ============================================================

echo ""
echo "============================================"
echo "  New Project Setup"
echo "  React + Tailwind CSS + Vite"
echo "============================================"
echo ""

# ── 1. Project name ──────────────────────────────────────────
read -p "Enter your project name (e.g. client-name-project): " PROJECT_NAME

if [ -z "$PROJECT_NAME" ]; then
  echo "No project name entered. Exiting."
  exit 1
fi

# Sanitise: lowercase, spaces to hyphens
PROJECT_NAME=$(echo "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')

echo ""
echo "Creating project: $PROJECT_NAME"
echo ""

# ── 2. Create project folder ─────────────────────────────────
mkdir -p "$PROJECT_NAME"
cd "$PROJECT_NAME" || exit 1

# ── 3. Scaffold Vite + React ──────────────────────────────────
echo "→ Scaffolding Vite + React..."
npm create vite@latest . -- --template react --yes 2>/dev/null || \
  echo "y" | npm create vite@latest . -- --template react

# ── 4. Install dependencies ───────────────────────────────────
echo ""
echo "→ Installing dependencies..."
npm install

# ── 5. Install Tailwind ───────────────────────────────────────
echo ""
echo "→ Installing Tailwind CSS..."
npm install -D tailwindcss @tailwindcss/vite

# ── 6. Configure index.css ────────────────────────────────────
echo ""
echo "→ Configuring Tailwind..."
cat > src/index.css << 'EOF'
@import "tailwindcss";
EOF

# ── 7. Configure vite.config.js ──────────────────────────────
cat > vite.config.js << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})
EOF

# ── 8. Clean up default App content ──────────────────────────
cat > src/App.jsx << 'EOF'
import './App.css'

function App() {
  return (
    <div className="min-h-screen bg-white">
      {/* Components will be imported and rendered here */}
    </div>
  )
}

export default App
EOF

cat > src/App.css << 'EOF'
/* Global app styles */
EOF

# ── 9. Create components folder ──────────────────────────────
mkdir -p src/components

# ── 10. Create CLAUDE.md ─────────────────────────────────────
cat > CLAUDE.md << EOF
# Project: $PROJECT_NAME

## Tech Stack
- React (functional components with hooks)
- Tailwind CSS (utility-first, no custom CSS unless necessary)
- Vite (dev server and build tool)

## Project Structure
\`\`\`
src/
  components/    → All React components live here
  assets/        → Images, icons, fonts
  App.jsx        → Root component — imports and renders page components
  index.css      → Tailwind import only (@import "tailwindcss")
  main.jsx       → Entry point — do not edit
\`\`\`

## Component Rules
- One component per file
- File names match component names (e.g. HeroSection.jsx)
- Use functional components only — no class components
- Use Tailwind classes for all styling — avoid inline styles
- Props should have clear, descriptive names

## Naming Conventions
- Components: PascalCase (e.g. NavBar, HeroSection, CardGrid)
- Files: PascalCase.jsx (e.g. NavBar.jsx)
- CSS classes: Tailwind utility classes only

## Figma Workflow
- When given a Figma link, extract design context via the Figma MCP
- Map Figma auto-layout to Tailwind flex/grid classes
- Map Figma colour styles to Tailwind colour classes
- Map Figma text styles to Tailwind typography classes
- Break large frames into logical sub-components

## GitHub
- Commit after each meaningful change
- Use descriptive commit messages (e.g. "Add hero section component")
- Main branch is: main

## Notes
- Dev server runs at: http://localhost:5173
- Always import new components into App.jsx to render them
- Keep components small and focused — one responsibility per component
EOF

# ── 11. Create .gitignore ─────────────────────────────────────
cat > .gitignore << 'EOF'
node_modules
dist
.env
.env.local
.DS_Store
*.local
EOF

# ── 12. Done ──────────────────────────────────────────────────
echo ""
echo "============================================"
echo "  ✅ Project ready: $PROJECT_NAME"
echo "============================================"
echo ""
echo "Next steps:"
echo ""
echo "  1. Open this folder in VS Code:"
echo "     code $PROJECT_NAME"
echo ""
echo "  2. Start the dev server (Terminal 1):"
echo "     cd $PROJECT_NAME && npm run dev"
echo ""
echo "  3. Start Claude Code (Terminal 2):"
echo "     cd $PROJECT_NAME && claude"
echo ""
echo "  4. Check MCPs are connected:"
echo "     /mcp"
echo ""
echo "  Happy building! 🚀"
echo ""
