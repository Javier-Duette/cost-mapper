"""
Detector de tablas en páginas del TCPO V15.

Flujo:
  1. Renderizar página PDF como imagen con pymupdf (sin dependencias externas).
  2. Detectar rectángulos tabulares con OpenCV: busca contornos externos grandes
     con forma rectangular y proporción compatible con las tablas TCPO.
  3. Devolver lista de imágenes PIL recortadas, ordenadas top-bottom left-right.

Las tablas TCPO tienen borde negro grueso bien definido —
el enfoque de contornos externos es suficientemente robusto para este caso.
"""

from __future__ import annotations

from pathlib import Path

import cv2
import fitz  # pymupdf
import numpy as np
from PIL import Image

# Resolución de renderizado. 150 DPI = buen balance calidad/tamaño para Vision API.
_RENDER_DPI = 150
_MATRIX = fitz.Matrix(_RENDER_DPI / 72, _RENDER_DPI / 72)


def page_count(pdf_path: Path) -> int:
    """Devuelve el número total de páginas del PDF."""
    with fitz.open(str(pdf_path)) as doc:
        return doc.page_count


def render_page(pdf_path: Path, page_num: int) -> Image.Image:
    """Renderiza una página del PDF como imagen PIL RGB.

    Args:
        pdf_path: Ruta al PDF.
        page_num: Número de página base-1 (1 = primera página).

    Returns:
        Imagen PIL en modo RGB.
    """
    with fitz.open(str(pdf_path)) as doc:
        page = doc[page_num - 1]
        pix = page.get_pixmap(matrix=_MATRIX, colorspace=fitz.csRGB)
        return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def detect_tables(page_img: Image.Image) -> list[Image.Image]:
    """Detecta y recorta tablas de composición en una imagen de página TCPO.

    Estrategia:
        - Umbral binario inverso (bordes oscuros → blanco).
        - Dilatación para cerrar pequeñas discontinuidades en los bordes.
        - Contornos externos (RETR_EXTERNAL) para ignorar celdas interiores.
        - Filtro por área (2%–65% de la página) y proporción (0.4 – 4.0).
        - Agrupación de filas con tolerancia de 60 px para sort top-to-bottom.

    Args:
        page_img: Imagen PIL de la página completa.

    Returns:
        Lista de imágenes PIL recortadas, una por tabla detectada.
        Si no se detecta ninguna tabla, devuelve [page_img] (fallback página completa).
    """
    w_page, h_page = page_img.size
    page_area = w_page * h_page

    # PIL → numpy → OpenCV
    img_np = np.array(page_img)
    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)

    # Umbral: píxeles oscuros (bordes) → blanco
    _, thresh = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)

    # Dilatar para cerrar discontinuidades en los bordes de las tablas
    kernel = np.ones((4, 4), np.uint8)
    dilated = cv2.dilate(thresh, kernel, iterations=2)

    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    MIN_AREA_RATIO = 0.018   # tabla mínima = 1.8% de la página
    MAX_AREA_RATIO = 0.65    # tabla máxima = 65% de la página
    MIN_ASPECT    = 0.40     # mínimo ancho/alto (tablas son anchas)
    MAX_ASPECT    = 4.50

    candidates: list[tuple[int, int, int, int]] = []  # (y, x, w, h)

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < page_area * MIN_AREA_RATIO or area > page_area * MAX_AREA_RATIO:
            continue

        x, y, w, h = cv2.boundingRect(cnt)
        if h < 60 or w < 120:
            continue

        aspect = w / h
        if aspect < MIN_ASPECT or aspect > MAX_ASPECT:
            continue

        candidates.append((y, x, w, h))

    if not candidates:
        return [page_img]  # fallback: página completa

    # Ordenar: primero por fila (grupos de 60 px), luego por columna
    candidates.sort(key=lambda t: (t[0] // 60, t[1]))

    pad = 6
    crops: list[Image.Image] = []
    for y, x, w, h in candidates:
        x0 = max(0, x - pad)
        y0 = max(0, y - pad)
        x1 = min(w_page, x + w + pad)
        y1 = min(h_page, y + h + pad)
        crops.append(page_img.crop((x0, y0, x1, y1)))

    return crops


def save_debug(page_img: Image.Image, crops: list[Image.Image], out_dir: Path, page_num: int) -> None:
    """Guarda la página con tablas marcadas y cada recorte por separado (debug)."""
    out_dir.mkdir(parents=True, exist_ok=True)

    # Página completa con detección visual
    img_np = np.array(page_img.copy())
    gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
    _, thresh = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY_INV)
    kernel = np.ones((4, 4), np.uint8)
    dilated = cv2.dilate(thresh, kernel, iterations=2)
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    debug_img = img_np.copy()
    w_page, h_page = page_img.size
    page_area = w_page * h_page
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < page_area * 0.018 or area > page_area * 0.65:
            continue
        x, y, w, h = cv2.boundingRect(cnt)
        cv2.rectangle(debug_img, (x, y), (x + w, y + h), (255, 0, 0), 3)

    Image.fromarray(debug_img).save(out_dir / f"page_{page_num:04d}_debug.jpg", quality=85)

    for i, crop in enumerate(crops):
        crop.save(out_dir / f"page_{page_num:04d}_table_{i + 1:02d}.jpg", quality=90)
