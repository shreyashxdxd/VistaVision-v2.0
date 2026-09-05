# VistaVision AI

VistaVision AI is a real-time computer vision prototype designed to assist in emergency and rescue scenarios.

The system uses a live camera feed to detect people using YOLO and allows the user to capture a snapshot of an incident. The captured image can then be analyzed by an AI vision model to provide useful visual insights about the scene.

## Features

- Real-time camera feed
- Real-time human detection using YOLO
- Live bounding boxes around detected people
- Uploaded video playback with YOLO detection overlays
- Incident snapshot capture
- AI-powered image and video-frame analysis
- Analysis of people, environment, visible hazards, and potential concerns

## How It Works

```
Live Camera
     ↓
YOLO Human Detection
     ↓
Live Bounding Boxes
     ↓
Capture Snapshot
     ↓
AI Vision Analysis
     ↓
AI Insights

Uploaded Video
     ↓
YOLO Detection Overlay
     ↓
Analyze Current Frame
     ↓
AI Insights
```

## Tech Stack

- Python
- FastAPI
- YOLO Algorithm
- AI API (Gemini in this case)
- HTML
- CSS
- JavaScript

