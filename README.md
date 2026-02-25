# How to run

## Backend

"checkpoints", "uploads" folder required. Check for the Sam-Checkpoint file in "checkpoints" folder.

- cd C:\dev\virtual-closet\backend
- python -m venv .venv
- .\.venv\Scripts\Activate.ps1
- python -m pip install --upgrade pip wheel
- pip install -r requirements.txt

- uvicorn main:app --reload --host 127.0.0.1 --port 8000

## Frontend

- cd C:\dev\virtual-closet\frontend
- python --version
- node -v
- npm -v
- npm install

- npm run dev

## About

- This project lets you upload an image, mark an area with your mouse, and instantly extract that object with a smooth transparent background directly in the browser. This is a prototype for the app "OutFeed" by Harald Müller

- The backend is built with FastAPI (Python) and runs Meta’s Segment Anything Model (SAM) using PyTorch to load the large ViT-H checkpoint file and predict a mask for the selected bounding box.
It processes the mask with OpenCV for morphological closing (to fill small gaps) and Gaussian blur (to soften edges), then uses Pillow to apply the mask as an alpha channel, crop tightly to the object, and stream the final PNG; NumPy handles the array conversions between image formats. The frontend is a Next.js (React + TypeScript) app styled with standard CSS, using the HTML5 canvas-like mouse tracking to record the box coordinates, converting display coordinates to original image pixels, sending them to the backend via Axios over an API proxy, and then rendering the returned transparent PNG in the browser.