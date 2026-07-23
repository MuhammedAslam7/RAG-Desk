import requests

url = "http://localhost:11434/api/chat"

payload = {
    "model": "gemma3:latest",
    "messages": [
        {
            "role": "user",
            "content": "What is Python?"
        }
    ],
    "stream": False
}

print("Sending request...")

response = requests.post(url, json=payload)

print(response.status_code)
print(response.json())