import io
import os
import secrets
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
from pdf_utils import get_pdf_info, merge_pdf_files

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)

# Limit payload size to 100MB
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/inspect', methods=['POST'])
def inspect_files():
    """
    Accepts files and returns metadata (page count, encrypted status, file size)
    for each uploaded file.
    """
    if 'files' not in request.files:
        return jsonify({'error': 'No file part in the request.'}), 400

    files = request.files.getlist('files')
    if not files or files[0].filename == '':
        return jsonify({'error': 'No selected files.'}), 400

    file_info_list = []
    for file in files:
        if not file.filename.lower().endswith('.pdf'):
            file_info_list.append({
                'filename': file.filename,
                'is_valid': False,
                'error': 'Not a PDF file.'
            })
            continue

        content = file.read()
        info = get_pdf_info(content)
        info['filename'] = secure_filename(file.filename) or file.filename
        info['file_size'] = len(content)
        file_info_list.append(info)

    return jsonify({'files': file_info_list})


@app.route('/api/merge', methods=['POST'])
def merge_pdfs():
    """
    Accepts files along with page range settings and returns the merged PDF stream.
    Expected form data:
    - files: uploaded file objects
    - output_filename: custom filename (optional)
    - page_ranges: comma-separated list or JSON corresponding to each file
    """
    if 'files' not in request.files:
        return jsonify({'error': 'No files uploaded for merging.'}), 400

    files = request.files.getlist('files')
    if not files or len(files) < 1:
        return jsonify({'error': 'At least 1 PDF file is required.'}), 400

    output_filename = request.form.get('output_filename', 'merged_document.pdf').strip()
    if not output_filename.lower().endswith('.pdf'):
        output_filename += '.pdf'
    output_filename = secure_filename(output_filename) or 'merged_document.pdf'

    # Get optional page ranges for each file (passed as page_range_0, page_range_1, etc.)
    file_items = []
    for idx, file in enumerate(files):
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({'error': f'File "{file.filename}" is not a valid PDF.'}), 400

        content = file.read()
        page_range = request.form.get(f'page_range_{idx}', '')
        file_items.append({
            'stream': content,
            'page_range': page_range
        })

    output_io = io.BytesIO()
    result = merge_pdf_files(file_items, output_io)

    if not result['success']:
        return jsonify({'error': result['error']}), 400

    output_io.seek(0)
    is_inline = request.form.get('inline') == 'true' or request.args.get('inline') == 'true'
    return send_file(
        output_io,
        mimetype='application/pdf',
        as_attachment=not is_inline,
        download_name=output_filename
    )


@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({'error': 'File size exceeds maximum limit of 100MB.'}), 413


if __name__ == '__main__':
    app.run(debug=True, port=5000)
