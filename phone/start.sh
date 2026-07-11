#!/bin/bash
# Start the FastAPI web application on port 7860 in the background
# This binds to port 7860 which satisfies Hugging Face Space health check requirement
echo "Starting FastAPI API server..."
uvicorn api.main:app --host 0.0.0.0 --port 7860 &

# Wait a brief moment for the FastAPI server to bind to the port
sleep 2

# Start the LiveKit Voice Agent worker in the foreground
echo "Starting LiveKit Voice Agent Worker..."
python -m voice.main start
