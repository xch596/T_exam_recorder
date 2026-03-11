
import requests
import os
import sys

def download_file(url, filename):
    print(f"Downloading {url} to {filename}...")
    try:
        response = requests.get(url, stream=True, timeout=60)
        response.raise_for_status()
        total_size = int(response.headers.get('content-length', 0))
        
        print(f"Total size: {total_size / (1024*1024):.2f} MB")
        
        block_size = 1024 * 1024 # 1MB
        wrote = 0
        with open(filename, 'wb') as f:
            for data in response.iter_content(block_size):
                wrote += len(data)
                f.write(data)
                sys.stdout.write(f"\rDownloaded {wrote / (1024*1024):.2f} MB")
                sys.stdout.flush()
        print("\nDownload complete.")
        
        if total_size != 0 and wrote != total_size:
            print("ERROR: Something went wrong")
            
    except Exception as e:
        print(f"\nFailed to download: {e}")

if __name__ == "__main__":
    url = "https://huggingface.co/Inoob/DIS-Handwriting-Remover/resolve/main/isnet.pth"
    os.makedirs("server/weights", exist_ok=True)
    download_file(url, "server/weights/isnet.pth")
