"""
EXIF and GPS metadata extraction service for uploaded images.
Extracts camera parameters, capture date/time, and converts GPS coordinates
from DMS (degrees, minutes, seconds) to decimal latitude and longitude.
"""
import io
import logging
from typing import Any, Dict, Optional, Tuple
from PIL import Image, ExifTags

logger = logging.getLogger("impactai.exif")


def _convert_dms_to_decimal(dms_values: Any, ref: str) -> Optional[float]:
    try:
        # Handles tuples or rationals
        deg = float(dms_values[0])
        minutes = float(dms_values[1])
        seconds = float(dms_values[2])
        decimal = deg + (minutes / 60.0) + (seconds / 3600.0)
        if ref.upper() in ["S", "W"]:
            decimal = -decimal
        return round(decimal, 6)
    except Exception as exc:
        logger.debug(f"Failed converting DMS {dms_values} with ref {ref}: {exc}")
        return None


def extract_exif_and_gps(image_bytes: bytes) -> Tuple[Dict[str, Any], Optional[float], Optional[float]]:
    """
    Extracts structured EXIF data and decimal (lat, lon) coordinates from image bytes.
    Returns: (exif_dict, latitude, longitude)
    """
    try:
        img = Image.open(io.BytesIO(image_bytes))
        raw_exif = img.getexif()
        if not raw_exif:
            return {}, None, None

        cleaned_exif: Dict[str, Any] = {}
        gps_info: Dict[str, Any] = {}

        # Standard tags
        for tag_id, val in raw_exif.items():
            tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
            if tag_name == "GPSInfo":
                continue
            if isinstance(val, (int, float, str, bool)):
                cleaned_exif[tag_name] = val
            elif isinstance(val, bytes):
                try:
                    cleaned_exif[tag_name] = val.decode("utf-8", errors="ignore").strip("\x00")
                except Exception:
                    pass

        # GPS IFD
        try:
            gps_ifd = raw_exif.get_ifd(ExifTags.IFD.GPSInfo)
            for gps_tag_id, gps_val in gps_ifd.items():
                gps_name = ExifTags.GPSTAGS.get(gps_tag_id, str(gps_tag_id))
                if isinstance(gps_val, (int, float, str, bool, list, tuple)):
                    gps_info[gps_name] = gps_val
        except Exception:
            gps_ifd = {}

        lat: Optional[float] = None
        lon: Optional[float] = None

        if gps_ifd:
            cleaned_exif["GPS"] = {k: str(v) for k, v in gps_info.items()}
            gps_lat = gps_ifd.get(2)  # GPSLatitude
            gps_lat_ref = gps_ifd.get(1)  # GPSLatitudeRef
            gps_lon = gps_ifd.get(4)  # GPSLongitude
            gps_lon_ref = gps_ifd.get(3)  # GPSLongitudeRef

            if gps_lat and gps_lat_ref:
                lat = _convert_dms_to_decimal(gps_lat, str(gps_lat_ref))
            if gps_lon and gps_lon_ref:
                lon = _convert_dms_to_decimal(gps_lon, str(gps_lon_ref))

        return cleaned_exif, lat, lon
    except Exception as exc:
        logger.warning(f"Could not extract EXIF/GPS: {exc}")
        return {}, None, None
