from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import easyocr
import cv2
import numpy as np
import os
from concurrent.futures import ThreadPoolExecutor

app = Flask(__name__, template_folder='../frontend/templates', static_folder='../frontend/static')
CORS(app)  # Enable CORS
executor = ThreadPoolExecutor(2)  # For handling multiple requests

# Initialize EasyOCR with the specified languages
reader = easyocr.Reader(['en'])

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/extract-text', methods=['POST'])
def extract_text():
    try:
        if 'image' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({"error": "Empty filename"}), 400

        # Get parameters from frontend
        min_confidence = float(request.form.get('min_confidence', 0.7))
        detail_level = request.form.get('detail_level', 'default')
        language = request.form.get('language', 'en')

        # Read and process image
        img_bytes = file.read()
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        # Configure OCR based on detail level
        if detail_level == 'fast':
            decoder = 'greedy'
            batch_size = 10
        elif detail_level == 'accurate':
            decoder = 'beamsearch'
            batch_size = 1
        else:  # default
            decoder = 'greedy'
            batch_size = 5

        # Perform OCR (using ThreadPoolExecutor to prevent blocking)
        def ocr_task():
            results = reader.readtext(
                img,
                decoder=decoder,
                batch_size=batch_size,
                min_size=20,
                text_threshold=min_confidence,
                link_threshold=0.4
            )
            return results

        results = executor.submit(ocr_task).result()

        # Format response
        extracted_text = " ".join([res[1] for res in results])
        boxes = [[float(x) for x in [res[0][0][0]/img.shape[1],  # x1 (normalized)
                                    res[0][0][1]/img.shape[0],  # y1
                                    (res[0][1][0]-res[0][0][0])/img.shape[1],  # width
                                    (res[0][2][1]-res[0][1][1])/img.shape[0]]]  # height
                for res in results]
        avg_confidence = sum(res[2] for res in results)/len(results) if results else 0

        return jsonify({
            "text": extracted_text,
            "confidence": avg_confidence,
            "boxes": boxes
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, threaded=True)