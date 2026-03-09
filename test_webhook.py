import requests
import json

url = "https://primary-production-94f2.up.railway.app/webhook/descriptions-produits"

payload = {
    "package": "premium",
    "products": [
        {
            "nom_produit": "Wireless Headphones Pro",
            "caracteristiques": "Noise cancellation, 30h battery, Bluetooth 5.0",
            "ton": "Professional",
            "langue": "English",
            "concurrents": "Sony WH-1000XM5, Bose QuietComfort 45"
        },
        {
            "nom_produit": "USB-C Hub 7-in-1",
            "caracteristiques": "HDMI, USB-A, SD card reader, PD charging",
            "ton": "Professional",
            "langue": "English",
            "concurrents": "Anker Hub, Belkin Multiport Adapter"
        }
    ],
    "platforms": ["shopify", "woocommerce", "amazon"],
    "fiverr_order": "TEST-FINAL-SINGLE-001"
}

try:
    print("📦 Sending test to N8N...")
    response = requests.post(url, json=payload)
    print(f"✅ Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"❌ Error: {str(e)}")
