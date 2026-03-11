
import requests
import json
import base64
import os

def download_via_api(repo_path, local_path):
    url = f"https://api.github.com/repos/xuebinqin/DIS/contents/{repo_path}"
    print(f"Fetching {url}...")
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            content = base64.b64decode(data['content'])
            
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            with open(local_path, 'wb') as f:
                f.write(content)
            print(f"Saved to {local_path}")
        else:
            print(f"Error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    # Download IS-Net/models/isnet.py
    download_via_api("IS-Net/models/isnet.py", "server/DIS_repo/models/isnet.py")
    
    # Download IS-Net/models/__init__.py
    download_via_api("IS-Net/models/__init__.py", "server/DIS_repo/models/__init__.py")
    
    # Download IS-Net/basics.py
    download_via_api("IS-Net/basics.py", "server/DIS_repo/basics.py")
    
    # Download IS-Net/data_loader_cache.py (Might be needed)
    download_via_api("IS-Net/data_loader_cache.py", "server/DIS_repo/data_loader_cache.py")

