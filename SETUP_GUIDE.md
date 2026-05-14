# Rossmann Dashboard - VS Code Setup Guide

This guide will help you run the Rossmann Sales Dashboard on your local machine using VS Code.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **npm** or **pnpm** (comes with Node.js)
- **Git** (optional, for version control) - [Download](https://git-scm.com/)
- **VS Code** - [Download](https://code.visualstudio.com/)

### Verify Installation

Open your terminal and run:

```bash
node --version
npm --version
```

You should see version numbers for both.

---

## Step 1: Download the Project

### Option A: Clone from Git (if available)

```bash
git clone <your-repository-url>
cd rossmann-dashboard
```

### Option B: Download as ZIP

1. Download the project files as a ZIP
2. Extract the ZIP file to your desired location
3. Open terminal in the extracted folder

---

## Step 2: Open Project in VS Code

```bash
code .
```

Or manually:
1. Open VS Code
2. Click **File → Open Folder**
3. Navigate to the `rossmann-dashboard` folder
4. Click **Select Folder**

---

## Step 3: Install Dependencies

In the VS Code terminal (or your system terminal in the project directory), run:

```bash
npm install
```

Or if you prefer pnpm:

```bash
pnpm install
```

This will install all required packages including React, Tailwind CSS, Recharts, and other dependencies.

**Expected time:** 2-5 minutes depending on your internet speed.

---

## Step 4: Start the Development Server

Run the following command:

```bash
npm run dev
```

Or with pnpm:

```bash
pnpm dev
```

You should see output similar to:

```
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.x.x:5173/
```

---

## Step 5: Open in Browser

Click on the **Local** URL (usually `http://localhost:5173/`) or copy-paste it into your browser.

The dashboard should now be running! You'll see:
- The hero banner with warm terracotta and sage green gradient
- KPI cards showing Store ID, Total Records, Average Daily Sales, and Date Range
- Three tabs: Sales History, Forecast, and Insights
- Interactive charts and controls

---

## Using VS Code Terminal

### Open Terminal in VS Code

1. Press `Ctrl + ` (backtick) or go to **Terminal → New Terminal**
2. The terminal opens at the bottom of VS Code
3. Run commands directly here

### Useful Terminal Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run check` | Check TypeScript errors |
| `npm run format` | Format code with Prettier |

---

## Project Structure

```
rossmann-dashboard/
├── client/
│   ├── public/              # Static files (favicon, robots.txt)
│   ├── src/
│   │   ├── pages/           # Page components
│   │   │   ├── Dashboard.tsx  # Main dashboard
│   │   │   └── Home.tsx
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # React contexts
│   │   ├── lib/             # Utility functions
│   │   ├── App.tsx          # Main app component
│   │   ├── main.tsx         # Entry point
│   │   └── index.css        # Global styles
│   └── index.html           # HTML template
├── server/                  # Backend (not used in static mode)
├── package.json             # Dependencies and scripts
└── tsconfig.json            # TypeScript configuration
```

---

## Making Changes

### Edit Components

1. Open any file in `client/src/`
2. Make your changes
3. Save the file (Ctrl+S)
4. The browser automatically refreshes (Hot Module Replacement)

### Edit Styles

- Global styles: `client/src/index.css`
- Component styles: Use Tailwind classes directly in JSX

### Edit Dashboard Content

- Main dashboard: `client/src/pages/Dashboard.tsx`
- Modify colors, layout, or add new features here

---

## Common Issues & Solutions

### Issue: "npm command not found"
**Solution:** Node.js is not installed or not in PATH. Reinstall Node.js and restart terminal.

### Issue: Port 5173 already in use
**Solution:** Either:
- Close the other application using port 5173
- Or run: `npm run dev -- --port 3000`

### Issue: Module not found errors
**Solution:** Run `npm install` again to ensure all dependencies are installed.

### Issue: TypeScript errors in VS Code
**Solution:** 
1. Open VS Code settings (Ctrl+,)
2. Search for "TypeScript"
3. Ensure TypeScript version is set correctly

### Issue: Changes not reflecting in browser
**Solution:** 
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Restart dev server (Ctrl+C in terminal, then `npm run dev`)

---

## Building for Production

When ready to deploy:

```bash
npm run build
```

This creates an optimized production build in the `dist/` folder.

---

## Useful VS Code Extensions

Install these extensions for better development experience:

1. **ES7+ React/Redux/React-Native snippets** - dsznajder.es7-react-js-snippets
2. **Tailwind CSS IntelliSense** - bradlc.vscode-tailwindcss
3. **Prettier - Code formatter** - esbenp.prettier-vscode
4. **TypeScript Vue Plugin** - Vue.volar

---

## Next Steps

- **Customize Colors:** Edit the color palette in `client/src/index.css`
- **Add Real Data:** Connect to your Rossmann database in `client/src/pages/Dashboard.tsx`
- **Deploy:** Use Vercel, Netlify, or your preferred hosting platform

---

## Need Help?

- Check the browser console for errors (F12 → Console tab)
- Review VS Code's Problems panel (Ctrl+Shift+M)
- Restart the dev server if issues persist

Happy coding! 🚀
