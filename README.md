# Free Interview Coder

A desktop application to help with coding interviews.

## 🚀 Quick Start Guide

### Prerequisites
- Make sure you have Node.js installed on your computer
- Git installed on your computer
- A Gemini API key (get it from [Google AI Studio](https://makersuite.google.com/app/apikey))

### Installation Steps

1. Clone the repository:
```bash
git clone [repository-url]
cd interview-coder
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
   - Create a file named `.env` in the root folder
   - Add your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
   - Save the file

### Running the App

#### Method 1: Development Mode (Recommended for first run)
1. Open a terminal and run:
```bash
npm run dev -- --port 5180
```

2. Open another terminal in the same folder and run:
```bash
NODE_ENV=development npm run electron:dev
```

#### Method 2: Production Mode
```bash
npm run app:build
```
The built app will be in the `release` folder.

### ⚠️ Important Notes

1. **Closing the App**: 
   - Press `Cmd + Q` (Mac) or `Ctrl + Q` (Windows/Linux) to quit
   - Or use Activity Monitor/Task Manager to close `Interview Coder`
   - The X button currently doesn't work (known issue)

2. **If the app doesn't start**:
   - Make sure no other app is using port 5180
   - Try killing existing processes:
     ```bash
     # Find processes using port 5180
     lsof -i :5180
     # Kill them (replace [PID] with the process ID)
     kill [PID]
     ```

3. **Keyboard Shortcuts**:
   - `Cmd/Ctrl + B`: Toggle window visibility
   - `Cmd/Ctrl + H`: Take screenshot
   - `Cmd/Ctrl + Arrow Keys`: Move window

### Troubleshooting

If you see errors:
1. Delete the `node_modules` folder
2. Delete `package-lock.json`
3. Run `npm install` again
4. Try running the app again using Method 1
