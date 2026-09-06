import io
import unittest
from pypdf import PdfWriter, PdfReader
from pdf_utils import get_pdf_info, merge_pdf_files, parse_page_ranges
from app import app

def create_sample_pdf(num_pages=3, title="Test PDF"):
    writer = PdfWriter()
    for i in range(num_pages):
        writer.add_blank_page(width=612, height=792)
    output = io.BytesIO()
    writer.write(output)
    output.seek(0)
    return output.getvalue()

class TestPDFMerger(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
        self.pdf1_bytes = create_sample_pdf(3, "Doc 1")
        self.pdf2_bytes = create_sample_pdf(2, "Doc 2")

    def test_parse_page_ranges(self):
        # Test full range default
        self.assertEqual(parse_page_ranges("", 5), [0, 1, 2, 3, 4])
        # Test explicit range
        self.assertEqual(parse_page_ranges("1-2, 4", 5), [0, 1, 3])
        # Test single page
        self.assertEqual(parse_page_ranges("2", 3), [1])

    def test_get_pdf_info(self):
        info = get_pdf_info(self.pdf1_bytes)
        self.assertTrue(info['is_valid'])
        self.assertEqual(info['page_count'], 3)
        self.assertFalse(info['is_encrypted'])

    def test_merge_pdf_files(self):
        output = io.BytesIO()
        file_items = [
            {'stream': self.pdf1_bytes, 'page_range': '1-2'},
            {'stream': self.pdf2_bytes, 'page_range': ''}
        ]
        res = merge_pdf_files(file_items, output)
        self.assertTrue(res['success'])
        self.assertEqual(res['total_pages'], 4) # 2 from doc1 + 2 from doc2

        reader = PdfReader(output)
        self.assertEqual(len(reader.pages), 4)

    def test_flask_inspect_endpoint(self):
        data = {
            'files': [
                (io.BytesIO(self.pdf1_bytes), 'doc1.pdf'),
                (io.BytesIO(self.pdf2_bytes), 'doc2.pdf')
            ]
        }
        response = self.app.post('/api/inspect', data=data, content_type='multipart/form-data')
        self.assertEqual(response.status_code, 200)
        json_data = response.get_json()
        self.assertEqual(len(json_data['files']), 2)
        self.assertEqual(json_data['files'][0]['page_count'], 3)
        self.assertEqual(json_data['files'][1]['page_count'], 2)

    def test_flask_merge_endpoint(self):
        data = {
            'files': [
                (io.BytesIO(self.pdf1_bytes), 'doc1.pdf'),
                (io.BytesIO(self.pdf2_bytes), 'doc2.pdf')
            ],
            'output_filename': 'combined_result.pdf',
            'page_range_0': '1-2',
            'page_range_1': '1'
        }
        response = self.app.post('/api/merge', data=data, content_type='multipart/form-data')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.mimetype, 'application/pdf')
        
        # Verify output PDF
        output_pdf = io.BytesIO(response.data)
        reader = PdfReader(output_pdf)
        self.assertEqual(len(reader.pages), 3) # 2 + 1 = 3 pages

    def test_flask_single_file_preview_endpoint(self):
        data = {
            'files': [
                (io.BytesIO(self.pdf1_bytes), 'doc1.pdf')
            ],
            'output_filename': 'preview_single.pdf',
            'page_range_0': '1-2',
            'inline': 'true'
        }
        response = self.app.post('/api/merge', data=data, content_type='multipart/form-data')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.mimetype, 'application/pdf')
        output_pdf = io.BytesIO(response.data)
        reader = PdfReader(output_pdf)
        self.assertEqual(len(reader.pages), 2)

if __name__ == '__main__':
    unittest.main()
