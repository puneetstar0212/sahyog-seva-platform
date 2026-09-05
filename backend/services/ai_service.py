import os
from groq import Groq
import json

def forecast_demand():
    """
    Simulate sending mock historical data to Groq to get a demand forecast.
    """
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        return {"error": "GROQ_API_KEY not configured"}

    client = Groq(api_key=groq_api_key)

    mock_historical_data = {
        "recent_trends": [
            {"skill": "Plumbing", "requests_last_week": 120},
            {"skill": "Electrician", "requests_last_week": 85},
            {"skill": "Carpentry", "requests_last_week": 40},
            {"skill": "Cleaning", "requests_last_week": 150}
        ],
        "season": "Summer",
        "upcoming_events": ["Monsoon starting soon"]
    }

    prompt = f"""
    Given the following historical service request data for a local gig platform:
    {json.dumps(mock_historical_data)}

    Please forecast the top 3 high-demand skills for the upcoming week.
    Return your response strictly in the following JSON format:
    {{
        "forecast": [
            {{"skill": "SkillName", "predicted_demand": "High/Medium", "reason": "brief reason"}}
        ]
    }}
    """

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a data analysis AI. You only output valid JSON."
                },
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="openai/gpt-oss-120b",
            response_format={"type": "json_object"},
            temperature=0.5,
        )

        response_content = chat_completion.choices[0].message.content
        return json.loads(response_content)
    except Exception as e:
        return {"error": str(e)}
