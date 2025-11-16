#!/usr/bin/env python3
"""
Convert uncompressed 32-bit BMP images to RGB565 raw data suitable for the GC9A01.

The output is a 16-bit little-endian stream (5R-6G-5B) with no header that can be
streamed directly to the display or stored in SPIFFS.
"""

from __future__ import annotations

import argparse
import struct
from pathlib import Path


def _read_bmp_header(payload: bytes):
    if payload[:2] != b"BM":
        raise ValueError("Not a BMP file (missing BM signature)")

    pixel_offset = struct.unpack_from("<I", payload, 10)[0]
    dib_header_size = struct.unpack_from("<I", payload, 14)[0]

    if dib_header_size < 40:
        raise ValueError("Unsupported BMP header size (expected BITMAPINFOHEADER or larger)")

    width = struct.unpack_from("<i", payload, 18)[0]
    height = struct.unpack_from("<i", payload, 22)[0]
    planes = struct.unpack_from("<H", payload, 26)[0]
    bits_per_pixel = struct.unpack_from("<H", payload, 28)[0]
    compression = struct.unpack_from("<I", payload, 30)[0]

    if planes != 1:
        raise ValueError(f"Unsupported plane count: {planes}")
    if bits_per_pixel not in (24, 32):
        raise ValueError(f"Expected 24- or 32-bit BMP, got {bits_per_pixel}")
    if compression not in (0, 3):  # BI_RGB or BI_BITFIELDS
        raise ValueError(f"Unsupported compression: {compression}")

    top_down = height < 0
    width = abs(width)
    height = abs(height)

    return pixel_offset, width, height, bits_per_pixel, top_down


def convert_bmp_to_rgb565(src: Path, dest: Path, expected_size=(240, 240)) -> None:
    data = src.read_bytes()
    pixel_offset, width, height, bpp, top_down = _read_bmp_header(data)

    if (width, height) != expected_size:
        raise ValueError(
            f"{src} is {width}x{height}; expected {expected_size[0]}x{expected_size[1]}"
        )

    row_stride = ((width * bpp + 31) // 32) * 4
    bytes_per_pixel = bpp // 8
    out = bytearray(width * height * 2)

    for y in range(height):
        src_row = y if top_down else (height - 1 - y)
        row_start = pixel_offset + src_row * row_stride
        for x in range(width):
            offset = row_start + x * bytes_per_pixel
            b = data[offset]
            g = data[offset + 1]
            r = data[offset + 2]
            rgb565 = ((r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3)
            dst_index = (y * width + x) * 2
            out[dst_index] = rgb565 & 0xFF
            out[dst_index + 1] = (rgb565 >> 8) & 0xFF

    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(out)


def parse_args():
    parser = argparse.ArgumentParser(description="Convert BMP assets to RGB565 raw data.")
    parser.add_argument(
        "source",
        nargs="?",
        default=Path("assets_src"),
        type=Path,
        help="Directory containing BMP files (default: data/assets)",
    )
    parser.add_argument(
        "destination",
        nargs="?",
        default=None,
        type=Path,
        help="Destination directory for RGB565 output (default: same as source)",
    )
    parser.add_argument(
        "--extension",
        default=".rgb565",
        help="Extension for generated files (default: .rgb565)",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    src_dir: Path = args.source.resolve()
    dst_dir: Path = src_dir if args.destination is None else args.destination.resolve()

    if not src_dir.exists():
        raise SystemExit(f"Source directory {src_dir} does not exist")

    bmp_files = sorted(src_dir.glob("*.bmp"))
    if not bmp_files:
        raise SystemExit(f"No BMP files found in {src_dir}")

    print("=" * 60)
    print("Converting BMP assets to RGB565 raw format")
    print(f" Source: {src_dir}")
    print(f" Dest:   {dst_dir}")
    print("=" * 60)

    for bmp in bmp_files:
        dest_file = dst_dir / (bmp.stem + args.extension)
        try:
            convert_bmp_to_rgb565(bmp, dest_file)
        except Exception as exc:
            print(f"✗ {bmp.name}: {exc}")
        else:
            size = dest_file.stat().st_size
            print(f"✓ {bmp.name} -> {dest_file.name} ({size} bytes)")

    print("=" * 60)
    print("Conversion complete.")


if __name__ == "__main__":
    main()
