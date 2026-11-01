"""Align stored APK entries before signing, without Android SDK dependencies."""
from pathlib import Path
from zipfile import ZipFile, ZIP_STORED
from copy import copy
import struct
import sys


def align(source, destination):
    source, destination = Path(source), Path(destination)
    if source.resolve() == destination.resolve():
        raise ValueError('Use a separate output file')
    with ZipFile(source) as original, ZipFile(destination, 'w') as output:
        for entry in original.infolist():
            info = copy(entry)
            if info.compress_type == ZIP_STORED:
                alignment = 16384 if info.filename.endswith('.so') else 4
                offset = output.fp.tell() + 30 + len(info.filename.encode('utf-8')) + len(info.extra)
                if offset % alignment:
                    padding = (-(offset + 4)) % alignment
                    info.extra += struct.pack('<HH', 0xFFFF, padding) + bytes(padding)
            output.writestr(info, original.read(entry), compress_type=info.compress_type)
    with ZipFile(destination) as result:
        assert result.testzip() is None
        data = destination.read_bytes()
        for info in result.infolist():
            if info.compress_type != ZIP_STORED:
                continue
            alignment = 16384 if info.filename.endswith('.so') else 4
            name_length, extra_length = struct.unpack_from('<HH', data, info.header_offset + 26)
            assert (info.header_offset + 30 + name_length + extra_length) % alignment == 0, info.filename


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit('Usage: python align-apk.py INPUT.apk OUTPUT.apk')
    align(sys.argv[1], sys.argv[2])
