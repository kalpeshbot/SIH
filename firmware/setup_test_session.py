import urllib.request
import urllib.error
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

DEVICE_ID = "WR-ESP32"
TRAINEE_ID = "TRN-ESP32"
SESSION_ID = "SESS-ESP32"

def post_json(url, data):
    req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as res:
            return res.getcode(), res.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8")
    except Exception as e:
        return 0, str(e)

def main():
    print("=========================================")
    print(" SIH Phase 4A: Hardware Test Setup Script")
    print("=========================================\n")
    
    # 1. Create Trainee
    print(f"[*] Creating trainee {TRAINEE_ID}...")
    code, text = post_json(f"{BASE_URL}/api/trainees", {
        "trainee_id": TRAINEE_ID,
        "name": "Hardware Test Trainee"
    })
    if code == 201:
        print("  -> Success")
    elif code == 400 and "already exists" in text:
        print("  -> Already exists (Skipping)")
    else:
        print(f"  -> Error: {text}")

    # 2. Create Device
    print(f"[*] Creating device {DEVICE_ID}...")
    code, text = post_json(f"{BASE_URL}/api/devices", {
        "device_id": DEVICE_ID,
        "device_type": "WEARABLE",
        "status": "ONLINE",
        "battery": 100
    })
    if code == 201:
        print("  -> Success")
    elif code == 400 and "already exists" in text:
        print("  -> Already exists (Skipping)")
    else:
        print(f"  -> Error: {text}")

    # 3. Create active session
    print(f"[*] Creating session {SESSION_ID}...")
    code, text = post_json(f"{BASE_URL}/api/sessions", {
        "session_id": SESSION_ID,
        "trainee_id": TRAINEE_ID,
        "device_id": DEVICE_ID,
        "session_type": "HARDWARE_TEST"
    })
    
    if code == 201:
        print("  -> Success")
    elif code == 400 and "already exists" in text:
        print("  -> Already exists. (Use dashboard to reactivate or delete if needed)")
    else:
        print(f"  -> Error: {text}")

    print("\n=========================================")
    print(" SETUP COMPLETE!")
    print("=========================================\n")
    print("Please use the following constants in your ESP32 code:\n")
    print(f'const char* DEVICE_ID = "{DEVICE_ID}";')
    print(f'const char* SESSION_ID = "{SESSION_ID}";')
    print("\nYou can now flash the ESP32 and view the live telemetry on the dashboard.")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print("ERROR: Could not connect to the backend.")
        print(f"Make sure FastAPI is running at {BASE_URL}")
        sys.exit(1)
