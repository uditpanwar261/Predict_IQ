#!/bin/bash
echo ""
echo "╔════════════════════════════════════════════╗"
echo "║   PredictIQ — Predictive Maintenance       ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Start Django backend
echo "🚀 Starting Django backend on http://localhost:8000"
cd "$(dirname "$0")/backend"
python manage.py runserver 8000 &
DJANGO_PID=$!

sleep 2

# Start React frontend
echo "⚛️  Starting React frontend on http://localhost:3000"
cd "$(dirname "$0")/frontend"
npm start &
REACT_PID=$!

echo ""
echo "✅ Both servers running!"
echo "   Frontend → http://localhost:3000"
echo "   Backend  → http://localhost:8000"
echo "   Admin    → http://localhost:8000/admin"
echo ""
echo "Demo credentials:"
echo "   Admin:    admin@predictive.ai / admin123"
echo "   Engineer: engineer@predictive.ai / engineer123"
echo ""
echo "Press Ctrl+C to stop both servers"

wait $DJANGO_PID $REACT_PID
