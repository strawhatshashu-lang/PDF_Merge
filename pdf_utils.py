import io
import re
from typing import List, Dict, Any, Optional, Tuple
from pypdf import PdfReader, PdfWriter

def parse_page_ranges(range_str: str, total_pages: int) -> List[int]:
    """
    Parses a string like '1-3, 5, 7-9' into a list of 0-based page indices.
    If range_str is empty or invalid, returns all pages [0, 1, ..., total_pages-1].
    """
    if not range_str or not range_str.strip():
        return list(range(total_pages))

    pages_to_include = []
    # Split by comma
    parts = range_str.split(',')
    
    for part in parts:
        part = part.strip()
        if not part:
            continue
        
        # Check for range pattern e.g., "1-5"
        range_match = re.match(r'^(\d+)\s*-\s*(\d+)$', part)
        single_match = re.match(r'^(\d+)$', part)
        
        if range_match:
            start_p = int(range_match.group(1))
            end_p = int(range_match.group(2))
            
            # Convert 1-indexed to 0-indexed
            start_idx = max(0, min(start_p - 1, total_pages - 1))
            end_idx = max(0, min(end_p - 1, total_pages - 1))
            
            if start_idx <= end_idx:
                for idx in range(start_idx, end_idx + 1):
                    if idx not in pages_to_include:
                        pages_to_include.append(idx)
        elif single_match:
            p_num = int(single_match.group(1))
            idx = p_num - 1
            if 0 <= idx < total_pages:
                if idx not in pages_to_include:
                    pages_to_include.append(idx)
                    
    # If parsing yielded no valid pages, fallback to all pages
    if not pages_to_include:
        return list(range(total_pages))

    return pages_to_include


def get_pdf_info(stream_bytes: bytes) -> Dict[str, Any]:
    """
    Inspects raw PDF bytes and returns information such as page count,
    encryption status, and basic metadata.
    """
    try:
        reader = PdfReader(io.BytesIO(stream_bytes))
        
        if reader.is_encrypted:
            # Try decrypting with empty password if possible
            try:
                decrypted = reader.decrypt("")
                if decrypted == 0:
                    return {
                        "is_valid": False,
                        "error": "PDF is password protected.",
                        "is_encrypted": True
                    }
            except Exception:
                return {
                    "is_valid": False,
                    "error": "PDF is password protected.",
                    "is_encrypted": True
                }

        page_count = len(reader.pages)
        title = ""
        author = ""
        
        if reader.metadata:
            title = reader.metadata.title or ""
            author = reader.metadata.author or ""
            
        return {
            "is_valid": True,
            "page_count": page_count,
            "title": title,
            "author": author,
            "is_encrypted": False
        }
    except Exception as e:
        return {
            "is_valid": False,
            "error": f"Failed to parse PDF file: {str(e)}",
            "is_encrypted": False
        }


def merge_pdf_files(file_items: List[Dict[str, Any]], output_stream: io.BytesIO) -> Dict[str, Any]:
    """
    Merges multiple PDF byte streams into output_stream according to specified order and page ranges.
    file_items is a list of dicts: [
        { "stream": bytes, "page_range": "1-3, 5" }, ...
    ]
    """
    writer = PdfWriter()
    total_merged_pages = 0
    
    try:
        for idx, item in enumerate(file_items):
            raw_bytes = item.get("stream")
            page_range_str = item.get("page_range", "")
            
            reader = PdfReader(io.BytesIO(raw_bytes))
            if reader.is_encrypted:
                try:
                    reader.decrypt("")
                except Exception:
                    return {"success": False, "error": f"File #{idx + 1} is password protected and cannot be merged."}
            
            num_pages = len(reader.pages)
            selected_indices = parse_page_ranges(page_range_str, num_pages)
            
            for page_idx in selected_indices:
                writer.add_page(reader.pages[page_idx])
                total_merged_pages += 1

        if total_merged_pages == 0:
            return {"success": False, "error": "No pages selected to merge."}

        writer.write(output_stream)
        output_stream.seek(0)
        return {
            "success": True,
            "total_pages": total_merged_pages
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"An error occurred while merging PDFs: {str(e)}"
        }
