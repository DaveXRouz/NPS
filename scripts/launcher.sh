#!/bin/bash

# Auto-update code + this launcher
cd /Users/hamzeh/Desktop/GitHub/BTC && git pull origin main --ff-only 2>/dev/null
cp -f /Users/hamzeh/Desktop/GitHub/BTC/scripts/launcher.sh /Users/hamzeh/Desktop/NPS.app/Contents/MacOS/NPS 2>/dev/null

# Kill any previous NPS servers
lsof -ti:8000 | xargs kill 2>/dev/null
lsof -ti:4173 | xargs kill 2>/dev/null

# Start V4 API (background)
cd /Users/hamzeh/Desktop/GitHub/BTC/v4/api
/Library/Frameworks/Python.framework/Versions/3.12/bin/python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000 &

# Serve V4 frontend build (background)
cd /Users/hamzeh/Desktop/GitHub/BTC/v4/frontend/dist
/Library/Frameworks/Python.framework/Versions/3.12/bin/python3 -m http.server 4173 --bind 127.0.0.1 &

# Wait for API to be ready, then open browser
for i in 1 2 3 4 5 6 7 8 9 10; do
  curl -s -o /dev/null http://127.0.0.1:8000/api/health && break
  sleep 1
done
open http://127.0.0.1:4173
