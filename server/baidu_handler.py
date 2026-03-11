import requests
import base64
import time
import json

class BaiduHandler:
    def __init__(self, api_key, secret_key):
        self.api_key = api_key
        self.secret_key = secret_key
        self.access_token = None
        self.token_expires_at = 0

    def get_access_token(self):
        """
        Get Access Token from Baidu AI Cloud
        """
        # Return cached token if valid
        if self.access_token and time.time() < self.token_expires_at:
            return self.access_token

        url = "https://aip.baidubce.com/oauth/2.0/token"
        params = {
            "grant_type": "client_credentials",
            "client_id": self.api_key,
            "client_secret": self.secret_key
        }
        
        try:
            response = requests.post(url, params=params)
            response.raise_for_status()
            result = response.json()
            
            if "access_token" in result:
                self.access_token = result["access_token"]
                # Expires in usually 30 days, set a safe buffer (e.g. refresh 1 day early or just rely on expires_in)
                self.token_expires_at = time.time() + result.get("expires_in", 2592000) - 3600
                return self.access_token
            else:
                print(f"Failed to get access token: {result}")
                raise Exception(f"Failed to get access token: {result.get('error_description', 'Unknown error')}")
                
        except Exception as e:
            print(f"Error getting access token: {e}")
            raise

    def remove_handwriting(self, image_bytes):
        """
        Call Baidu Document Handwriting Removal API
        """
        request_url = "https://aip.baidubce.com/rest/2.0/ocr/v1/remove_handwriting"
        
        try:
            access_token = self.get_access_token()
            request_url = request_url + "?access_token=" + access_token
            
            # Encode image to base64
            img_base64 = base64.b64encode(image_bytes).decode('utf-8')
            
            params = {"image": img_base64}
            headers = {'content-type': 'application/x-www-form-urlencoded'}
            
            response = requests.post(request_url, data=params, headers=headers)
            response.raise_for_status()
            
            try:
                result = response.json()
            except Exception:
                body_preview = response.text[:500] if hasattr(response, "text") and response.text else ""
                raise Exception(f"Unexpected non-JSON response from Baidu API. status={response.status_code}, body_preview={body_preview}")
            
            # Check for error in response body (Baidu APIs often return 200 OK even with application error)
            if "error_code" in result:
                raise Exception(f"Baidu API Error: {result['error_code']} - {result.get('error_msg', 'Unknown error')}")
            
            def _pick_image_field(obj):
                if not isinstance(obj, dict):
                    return None
                for k in ("image", "image_processed", "image_base64", "img"):
                    v = obj.get(k)
                    if isinstance(v, str) and v.strip():
                        return v
                return None

            image_b64 = _pick_image_field(result)
            if image_b64 is None:
                for container_key in ("result", "data"):
                    image_b64 = _pick_image_field(result.get(container_key))
                    if image_b64 is not None:
                        break

            if image_b64 is not None:
                return base64.b64decode(image_b64)

            safe_preview = json.dumps(result, ensure_ascii=False)[:800]
            raise Exception(f"No image data in response. keys={list(result.keys())}, preview={safe_preview}")
                
        except Exception as e:
            print(f"Error in remove_handwriting: {e}")
            raise
