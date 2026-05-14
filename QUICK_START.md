# Quick Start - 5 Minutes to Running Dashboard

## TL;DR - Copy & Paste Commands

### 1. Open Terminal in Project Folder

```bash
cd /path/to/rossmann-dashboard
```

### 2. Install Dependencies (First Time Only)

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

### 4. Open in Browser

Click the link shown in terminal (usually `http://localhost:5173/`)

---

## That's It! 🎉

Your dashboard is now running. Make changes to files and see them update instantly in the browser.

---

## Common Commands

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run check      # Check for TypeScript errors
npm run format     # Format code
```

---

## Stop the Server

Press `Ctrl+C` in the terminal where the server is running.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "npm: command not found" | Install Node.js from nodejs.org |
| "Port already in use" | Run `npm run dev -- --port 3000` |
| "Module not found" | Run `npm install` again |
| "Changes not showing" | Hard refresh browser (Ctrl+Shift+R) |

---

## Next: Customize Your Dashboard

Edit `client/src/pages/Dashboard.tsx` to:
- Change colors in `index.css`
- Add new charts or features
- Connect real data from your database

See `SETUP_GUIDE.md` for detailed instructions.
