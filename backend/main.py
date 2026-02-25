from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps
import io
import os
import uuid
import numpy as np
import cv2
from segment_anything import sam_model_registry, SamAutomaticMaskGenerator, SamPredictor

# 1) FastAPI + CORS
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2) Upload-Ordner im Root
ROOT_UPLOAD = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
os.makedirs(ROOT_UPLOAD, exist_ok=True)

# 3) SAM-Modell laden
sam = sam_model_registry["vit_h"](checkpoint="checkpoints/sam_vit_h_4b8939.pth")
sam.to("cpu")
auto_gen = SamAutomaticMaskGenerator(sam)
predictor = SamPredictor(sam)

def postprocess_mask(mask: np.ndarray) -> np.ndarray:
    """Füllt Löcher mit Morphological Closing."""
    m = (mask.astype(np.uint8)) * 255
    kernel = np.ones((15, 15), np.uint8)
    closed = cv2.morphologyEx(m, cv2.MORPH_CLOSE, kernel)
    return closed.astype(bool)

def mask_to_image(img: Image.Image, mask: np.ndarray) -> Image.Image:
    """Wendet weichen Alphakanal basierend auf Maske an."""
    rgba = img.convert("RGBA")
    arr = np.array(rgba)
    m = (mask.astype(np.uint8)) * 255
    alpha = cv2.GaussianBlur(m, (5, 5), sigmaX=0)  # weiche Kanten
    arr[:, :, 3] = alpha
    return Image.fromarray(arr)

def crop_image(img: Image.Image) -> Image.Image:
    """Crop um den nicht-transparenten Bereich."""
    alpha = img.split()[3]
    bbox = alpha.getbbox()
    return img.crop(bbox) if bbox else img

def save_and_stream(img: Image.Image) -> StreamingResponse:
    """Speichert PNG und liefert als Response."""
    fn = f"{uuid.uuid4().hex}.png"
    path = os.path.join(ROOT_UPLOAD, fn)
    img.save(path, format="PNG")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")

@app.post("/segment-box")
async def segment_box(
    file: UploadFile = File(...),
    x1: int = Form(...), y1: int = Form(...),
    x2: int = Form(...), y2: int = Form(...)
):
    data = await file.read()
    img = Image.open(io.BytesIO(data)).convert("RGB")
    img = ImageOps.exif_transpose(img)  # sorgt für korrekte Orientierung
    arr = np.array(img)
    predictor.set_image(arr)
    masks, _, _ = predictor.predict(
        box=np.array([x1, y1, x2, y2]),
        multimask_output=False
    )
    clean = postprocess_mask(masks[0])
    result = mask_to_image(img, clean)
    result = crop_image(result)
    return save_and_stream(result)
