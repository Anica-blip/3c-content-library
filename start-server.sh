#!/bin/bash
# Simple HTTP server for 3C Library
# This allows localStorage to work properly

echo "Starting 3C Library Server..."
echo "Landing Page: http://localhost:8000/index.html"
echo "Admin Dashboard: http://localhost:8000/admin.html"
echo "Public Library: http://localhost:8000/library.html"
echo "Debug Tool: http://localhost:8000/debug.html"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start Python HTTP server
python3 -m http.server 8000
