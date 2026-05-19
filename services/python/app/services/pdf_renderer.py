"""PPTX -> PDF rendering via headless LibreOffice subprocess.

Implemented in T-039. The LibreOffice binary is bundled into the Python
service Docker image (SPEC §4.8).
"""

# TODO(T-039): wrap `libreoffice --headless --convert-to pdf` subprocess call.
