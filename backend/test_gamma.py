import ollama

print("Program started...")

response = ollama.chat(
    model="gemma3",
    messages=[
        {
            "role": "user",
            "content": "What is Python?"
        }
    ]
)

print("Response received!")
print(response["message"]["content"])