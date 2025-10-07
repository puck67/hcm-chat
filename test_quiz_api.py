import requests
import json

def test_quiz_api():
    url = "https://hcm-chat-2.onrender.com/quiz/generate"
    data = {
        "chapter": "Chương III",
        "num_questions": 10,
        "difficulty": "medium"
    }
    
    try:
        print("Testing quiz API...")
        response = requests.post(url, json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ API hoạt động tốt!")
            print(f"Quiz ID: {result.get('id')}")
            print(f"Title: {result.get('title')}")
        else:
            print("❌ API lỗi!")
            
    except Exception as e:
        print(f"❌ Lỗi kết nối: {e}")

if __name__ == "__main__":
    test_quiz_api()
