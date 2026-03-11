
import requests
import os

def download_file(url, filename):
    print(f"Downloading {url} to {filename}...")
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            os.makedirs(os.path.dirname(filename), exist_ok=True)
            with open(filename, 'wb') as f:
                f.write(response.content)
            print("Download complete.")
        else:
            print(f"Failed to download. Status code: {response.status_code}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # Attempt to download isnet.py from GitHub
    # Using a mirror or raw.githubusercontent.com
    # GitHub Raw: https://raw.githubusercontent.com/xuebinqin/DIS/master/models/isnet.py
    
    # 1. Download IS-Net/models/isnet.py
    url_isnet = "https://raw.githubusercontent.com/xuebinqin/DIS/main/IS-Net/models/isnet.py"
    download_file(url_isnet, "server/DIS_repo/models/isnet.py")
    
    # 2. Download IS-Net/models/__init__.py
    url_init = "https://raw.githubusercontent.com/xuebinqin/DIS/main/IS-Net/models/__init__.py"
    download_file(url_init, "server/DIS_repo/models/__init__.py")

    # 3. Download IS-Net/basics.py (Likely a dependency)
    url_basics = "https://raw.githubusercontent.com/xuebinqin/DIS/main/IS-Net/basics.py"
    download_file(url_basics, "server/DIS_repo/basics.py")

    # 4. Download Inference.py from Hugging Face
    # Try Inference.py (Capital I)
    url_inference = "https://huggingface.co/Inoob/DIS-Handwriting-Remover/resolve/main/Inference.py"
    download_file(url_inference, "server/DIS_repo/Inference.py")
    
    # Try inference.py (lowercase) just in case
    url_inference_lower = "https://huggingface.co/Inoob/DIS-Handwriting-Remover/resolve/main/inference.py"
    download_file(url_inference_lower, "server/DIS_repo/inference.py")

