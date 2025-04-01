import cv2
import sqlite3
import datetime
import requests
from pyzbar.pyzbar import decode

# Use GStreamer pipeline for OpenCV
gst_pipeline = "libcamerasrc ! video/x-raw,format=BGR,width=640,height=480 ! videoconvert ! appsink"
cap = cv2.VideoCapture(gst_pipeline, cv2.CAP_GSTREAMER)

if not cap.isOpened():
    print("❌ Error: Could not open camera")
    exit()

# Connect to SQLite database
conn = sqlite3.connect("attendance.db")
cursor = conn.cursor()

# Create table if it doesn't exist
cursor.execute('''
CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    qr_data TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
)
''')
conn.commit()

# Web API URL - change this to your server's IP if not running on the same machine
API_URL = "http://localhost:3000/api/attendance"

print("🔄 Waiting for QR Code...")
print("🌐 Connected to web server at", API_URL)

# Keep track of recently scanned codes to avoid duplicates
recently_scanned = set()
COOLDOWN_TIME = 5  # seconds to wait before allowing the same QR code to be scanned again

while True:
    ret, frame = cap.read()
    if not ret:
        print("❌ Error: Could not grab frame")
        break

    # Detect QR codes
    qr_codes = decode(frame)
    for qr in qr_codes:
        qr_data = qr.data.decode('utf-8')
        
        # Check if this code was recently scanned (to avoid duplicates)
        if qr_data in recently_scanned:
            continue
            
        print(f"✅ QR Code Detected: {qr_data}")
        
        # Add to recently scanned
        recently_scanned.add(qr_data)
        
        # Set a timer to remove from recently scanned
        import threading
        def remove_from_recent(code):
            recently_scanned.remove(code)
        timer = threading.Timer(COOLDOWN_TIME, remove_from_recent, [qr_data])
        timer.daemon = True
        timer.start()

        # Get current timestamp in ISO format
        timestamp = datetime.datetime.now().isoformat()
        
        # Store QR data in the local database
        cursor.execute("INSERT INTO attendance (student_id, qr_data, timestamp) VALUES (?, ?, ?)", 
                       (qr_data, qr_data, timestamp))
        conn.commit()
        print("💾 Data saved to local database!")
        
        # Also send to web API
        try:
            api_data = {
                'student_id': qr_data,
                'qr_data': qr_data
            }
            response = requests.post(API_URL, json=api_data)
            if response.status_code == 200:
                print("📡 Data sent to web API successfully!")
            else:
                print(f"⚠️ API Error: {response.status_code}")
        except Exception as e:
            print(f"📡 Failed to send data to API: {e}")

        # Highlight the detected QR code
        points = qr.polygon
        if points:
            hull = cv2.convexHull(points)
            cv2.polylines(frame, [hull], True, (0, 255, 0), 3)
            
            # Add text
            cv2.putText(frame, qr_data, (points[0][0], points[0][1] - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    # Show the camera feed
    cv2.imshow("QR Code Scanner", frame)

    # Press 'q' to exit
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
conn.close()