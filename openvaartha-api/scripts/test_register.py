import httpx
import asyncio

async def test_register():
    url = "http://127.0.0.1:8000/api/v1/users/register"
    payload = {
        "email": "test_script@example.com",
        "password": "password123",
        "full_name": "Test Script User"
    }
    
    print(f"Sending POST to {url}...")
    try:
        async with httpx.AsyncClient(timeout=35.0) as client:
            response = await client.post(url, json=payload)
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_register())
