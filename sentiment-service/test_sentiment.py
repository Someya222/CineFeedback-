import unittest
from main import classify


class SentimentTests(unittest.TestCase):
    def test_positive(self):
        self.assertEqual(classify("Amazing acting and a gripping story, loved it")["label"], "positive")

    def test_negative(self):
        self.assertEqual(classify("Terrible boring movie, complete waste of time")["label"], "negative")

    def test_neutral(self):
        self.assertEqual(classify("It was a movie")["label"], "neutral")

    def test_score_range(self):
        s = classify("Brilliant and wonderful")["score"]
        self.assertTrue(-1 <= s <= 1)


if __name__ == "__main__":
    unittest.main()
