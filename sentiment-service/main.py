from fastapi import FastAPI
from pydantic import BaseModel, Field
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

app = FastAPI(title="CineFeedback Sentiment Service")
analyzer = SentimentIntensityAnalyzer()


class ReviewIn(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


def classify(text: str) -> dict:
    compound = analyzer.polarity_scores(text)["compound"]
    if compound >= 0.05:
        label = "positive"
    elif compound <= -0.05:
        label = "negative"
    else:
        label = "neutral"
    return {"label": label, "score": round(compound, 4)}


@app.post("/analyze")
def analyze(body: ReviewIn):
    return classify(body.text)


@app.get("/health")
def health():
    return {"status": "ok"}
