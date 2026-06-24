import re
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from bs4 import BeautifulSoup

# Ensure necessary NLTK data is downloaded
nltk.download('stopwords', quiet=True)
nltk.download('wordnet', quiet=True)
nltk.download('omw-1.4', quiet=True)

class TextPreprocessor:
    def __init__(self):
        self.lemmatizer = WordNetLemmatizer()
        self.stop_words = set(stopwords.words('english'))

    def clean_text(self, text):
        # 1. Remove HTML
        text = BeautifulSoup(text, "html.parser").get_text()
        # 2. Normalize: Remove special characters, convert to lowercase
        text = re.sub(r'[^a-zA-Z\s]', '', text).lower()
        # 3. Tokenize and Remove Stop Words, Lemmatize
        tokens = text.split()
        cleaned_tokens = [
            self.lemmatizer.lemmatize(word) 
            for word in tokens 
            if word not in self.stop_words
        ]
        return " ".join(cleaned_tokens)
