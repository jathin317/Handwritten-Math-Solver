import base64
import numpy as np
from sympy import sympify, simplify
from flask import jsonify, request, Flask, render_template
import cv2 as cv
import torch
import torch.nn as nn

app = Flask(__name__)

LABEL_MAP = {
    '0':'0',
    '1':'1',
    '2':'2',
    '3':'3',
    '4':'4',
    '5':'5',
    '6':'6',
    '7':'7',
    '8':'8', 
    '9':'9',
    'dot':'.', 
    'minus':'-', 
    'plus':'+',
    'slash':'/', 
    'w':'w', 
    'x':'x', 
    'y':'y', 
    'z':'z'
}

class_to_symbol = {
    0:'0', 
    1:'1', 
    2:'2', 
    3:'3', 
    4:'4',
    5:'5', 
    6:'6', 
    7:'7', 
    8:'8', 
    9:'9',
    10:'.', 
    11:'-', 
    12:'+', 
    13:'/',
    14:'w', 
    15:'x', 
    16:'y', 
    17:'z'
}

@app.route('/')
def index():
    return render_template('board.html')

@app.route('/solve', methods=['POST'])
def solve():
    data = request.json['image']
    image_data = base64.b64decode(data.split(',')[1])

    np_arr = np.frombuffer(image_data, np.uint8)
    img = cv.imdecode(np_arr, cv.IMREAD_COLOR)

    gray = cv.cvtColor(img, cv.COLOR_BGR2GRAY)

    _, thresh_org = cv.threshold(gray, 50, 255, cv.THRESH_BINARY)
    _, thresh_inv = cv.threshold(gray, 50, 255, cv.THRESH_BINARY_INV)

    crops = segmentImage(thresh_inv, thresh_org)
    recognised, confidence = recognise_symbols(crops)
    expression = ''.join(recognised)


    try:
        simplified = str(simplify(sympify(expression)))
    except Exception:
        simplified = f"Could not parse this string: {expression}"

    print(f'Crops detected: {len(crops)}')
    print(f'Recognised: {recognised}')
    print(f'Confidences: {[round(c, 2) for c in confidence]}')

    return jsonify({
        'expression': expression,
        'simplified': simplified
    })

def segmentImage(thresh_for_contours, thresh_for_crops):
    kernel = cv.getStructuringElement(cv.MORPH_RECT, (5, 5))
    dilated = cv.dilate(thresh_for_contours, kernel, iterations=1)
    contours, hierarchy = cv.findContours(dilated, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE)

    image_area = thresh_for_crops.shape[0] * thresh_for_crops.shape[1]
    min_area = image_area * 0.001
    max_area = image_area * 0.95

    filtered = []
    for i, contour in enumerate(contours):
        area = cv.contourArea(contour)
        has_no_parent = hierarchy[0][i][3] == -1
        if has_no_parent and min_area < area < max_area:
            filtered.append(contour)

    filtered = sorted(filtered, key=lambda c: cv.boundingRect(c)[0])

    crops = []
    PADDING = 4
    for contour in filtered:
        x, y, w, h = cv.boundingRect(contour)
        x1 = max(0, x - PADDING)
        y1 = max(0, y - PADDING)
        x2 = min(thresh_for_crops.shape[1], x + w + PADDING)
        y2 = min(thresh_for_crops.shape[0], y + h + PADDING)
        crop = thresh_for_crops[y1:y2, x1:x2]
        crop_resized = cv.resize(crop, (28, 28))
        crops.append(crop_resized)

    return crops



class MathSymbolCNN(nn.Module):
    def __init__(self, num_classes):
        super(MathSymbolCNN, self).__init__()

        self.features = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),     # 28 x 28 -> 14 x 14

            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2, 2)      # 14 x 14 -> 7 x 7
        )

        self.classifier = nn.Sequential(
            nn.Flatten(),
            nn.Linear(64 * 7 * 7, 256),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(256, num_classes)
        )

    def forward(self, x):
        x = self.features(x)
        x = self.classifier(x)
        return x
    
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
checkpoint = torch.load("math_symbol_cnn_v4.pth", map_location=device)
model = MathSymbolCNN(num_classes=18).to(device)
model.load_state_dict(checkpoint["model_state"])
model.eval()

def recognise_symbols(crops):
    recognised = []
    confidences = []

    for crop in crops:
        tensor = torch.tensor(crop, dtype=torch.float32) / 255.0
        tensor = (tensor - 0.5) / 0.5
        tensor = tensor.unsqueeze(0).unsqueeze(0).to(device)

        with torch.no_grad():
            output = model(tensor)
            probabilities = torch.softmax(output, dim=1)
            confidence, predicted = torch.max(probabilities, 1)

        recognised.append(class_to_symbol[predicted.item()])
        confidences.append(confidence.item())

    return recognised, confidences