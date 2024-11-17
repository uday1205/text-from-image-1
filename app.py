import easyocr
import cv2
import matplotlib.pyplot as plt

def process_image(image_path):
    # Initialize the EasyOCR reader for English
    reader = easyocr.Reader(['en'], gpu=True)
    result = reader.readtext(image_path)
    
    # Initialize image and font
    img = cv2.imread(image_path)
    font = cv2.FONT_HERSHEY_SIMPLEX
    
    spacer = 100
    detected_text = []  # List to collect detected text
    
    for detection in result: 
        # Ensure that the coordinates are integers
        top_left = tuple(map(int, detection[0][0]))  # Convert to int
        bottom_right = tuple(map(int, detection[0][2]))  # Convert to int
        text = detection[1]
        confidence = detection[2]  # Confidence value is in the 3rd element
        
        # Optional: Only display text with confidence above a threshold
        if confidence > 0.6:
            img = cv2.rectangle(img, top_left, bottom_right, (0, 255, 0), 3)
            img = cv2.putText(img, text, (20, spacer), font, 0.5, (0, 255, 0), 2, cv2.LINE_AA)
            spacer += 15
            detected_text.append(text)  # Add detected text to the list
    
    # Display the processed image
    plt.imshow(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    plt.axis('off')
    plt.show()
    
    # Print all detected text
    print("Detected Text:")
    for text in detected_text:
        print(text)

# Test the function
IMAGE_PATH = "img"  # Replace with your image path
process_image(IMAGE_PATH)
