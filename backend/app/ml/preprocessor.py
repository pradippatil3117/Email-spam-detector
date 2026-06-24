import re
import os
import json
import numpy as np
import pandas as pd
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from bs4 import BeautifulSoup
from sklearn.base import BaseEstimator, TransformerMixin

# Ensure necessary NLTK data is downloaded
nltk.download('stopwords', quiet=True)
nltk.download('wordnet', quiet=True)
nltk.download('omw-1.4', quiet=True)

class TextPreprocessor(BaseEstimator, TransformerMixin):
    def __init__(self):
        self.lemmatizer = WordNetLemmatizer()
        self.stop_words = set(stopwords.words('english'))

    def fit(self, X, y=None):
        return self

    def transform(self, X):
        if isinstance(X, pd.Series):
            return X.apply(self.clean_text)
        elif isinstance(X, list):
            return [self.clean_text(t) for t in X]
        else:
            # array-like
            return [self.clean_text(t) for t in np.array(X).flatten()]

    def clean_text(self, text):
        if not isinstance(text, str):
            text = str(text) if text is not None else ""
        # 1. Remove HTML tags safely
        try:
            text = BeautifulSoup(text, "html.parser").get_text()
        except Exception:
            pass
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

class FeatureEngineer(BaseEstimator, TransformerMixin):
    def __init__(self):
        # Load configs relative to this file
        current_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        data_dir = os.path.join(current_dir, "data")
        
        with open(os.path.join(data_dir, "phishing_keywords.json"), "r") as f:
            self.phishing_keywords = json.load(f)
            
        with open(os.path.join(data_dir, "legitimate_keywords.json"), "r") as f:
            self.legitimate_keywords = json.load(f)
            
        with open(os.path.join(data_dir, "suspicious_domains.json"), "r") as f:
            self.domains_config = json.load(f)
            
        self.action_verbs = {
            "verify", "update", "click", "login", "reset", "confirm", "act", "pay", 
            "submit", "upgrade", "unlock", "dispute", "cancel", "claim", "restore", "download"
        }
        
    def fit(self, X, y=None):
        return self
        
    def transform(self, X):
        if isinstance(X, pd.DataFrame):
            senders = X['sender'].astype(str).tolist() if 'sender' in X.columns else [""] * len(X)
            subjects = X['subject'].astype(str).tolist() if 'subject' in X.columns else [""] * len(X)
            bodies = X['body'].astype(str).tolist() if 'body' in X.columns else [""] * len(X)
            texts = X['text'].astype(str).tolist() if 'text' in X.columns else [""] * len(X)
        else:
            # Handle array-like or lists from ColumnTransformer selecting columns ['sender', 'subject', 'body', 'text']
            X_arr = np.array(X)
            if X_arr.ndim == 2 and X_arr.shape[1] >= 4:
                senders = [str(row[0]) if row[0] is not None else "" for row in X_arr]
                subjects = [str(row[1]) if row[1] is not None else "" for row in X_arr]
                bodies = [str(row[2]) if row[2] is not None else "" for row in X_arr]
                texts = [str(row[3]) if row[3] is not None else "" for row in X_arr]
            else:
                # Fallback for 1D or basic structure
                texts = [str(t) for t in X_arr.flatten()]
                senders = [""] * len(texts)
                subjects = [""] * len(texts)
                bodies = texts

        features = []
        for sender, subject, body, text in zip(senders, subjects, bodies, texts):
            sender_lower = sender.lower()
            subject_lower = subject.lower()
            body_lower = body.lower()
            text_lower = text.lower()
            
            # 1. URL count
            urls = re.findall(r'https?://[^\s]+|www\.[^\s]+', body_lower)
            url_count = len(urls)
            
            # 2. Email count
            emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', body_lower + " " + sender_lower)
            email_count = len(emails)
            
            # 3. Exclamation count
            exclamation_count = body.count('!') + subject.count('!')
            
            # 4. Currency symbol count
            currency_count = sum((body.count(sym) + subject.count(sym)) for sym in ['$', '€', '£', '¥'])
            
            # 5. ALL CAPS ratio
            letters = [c for c in (body + " " + subject) if c.isalpha()]
            caps = [c for c in letters if c.isupper()]
            caps_ratio = len(caps) / len(letters) if len(letters) > 0 else 0.0
            
            # 6. HTML tag count
            html_tags = re.findall(r'<[^>]+>', body)
            html_tag_count = len(html_tags)
            
            # 7. Form detection
            form_detection = 1.0 if any(term in body_lower for term in ['<form', 'input type=', 'type="submit"', 'type=\'submit\'']) else 0.0
            
            # 8. JavaScript detection
            javascript_detection = 1.0 if any(term in body_lower for term in ['<script', 'javascript:', 'onload=', 'onclick=']) else 0.0
            
            # 9. Shortened URL count
            shortened_count = 0
            for shortener in self.domains_config["url_shorteners"]:
                shortened_count += sum(1 for url in urls if shortener in url)
                
            # 10. Suspicious domain count
            suspicious_domain_count = 0
            for url in urls:
                if any(url.endswith(tld) or (tld + "/") in url or (tld + "?") in url for tld in self.domains_config["suspicious_tlds"]):
                    suspicious_domain_count += 1
                elif any(s_dom in url for s_dom in self.domains_config["credential_domains"]):
                    suspicious_domain_count += 1
                
            # 11-15. Keyword counts
            urgency_words = sum((body_lower.count(word) + subject_lower.count(word)) for word in self.phishing_keywords["urgency"])
            credential_words = sum((body_lower.count(word) + subject_lower.count(word)) for word in self.phishing_keywords["credential_theft"])
            financial_words = sum((body_lower.count(word) + subject_lower.count(word)) for word in self.phishing_keywords["financial"])
            promotional_words = sum((body_lower.count(word) + subject_lower.count(word)) for word in self.phishing_keywords["promotional"])
            fear_words = sum((body_lower.count(word) + subject_lower.count(word)) for word in self.phishing_keywords["fear"])
            
            # 16. Action verbs
            action_verbs_count = sum((body_lower.count(verb) + subject_lower.count(verb)) for verb in self.action_verbs)
            
            # Sender domain intelligence
            contains_google = 1.0 if "google" in sender_lower else 0.0
            contains_microsoft = 1.0 if "microsoft" in sender_lower or "outlook" in sender_lower or "office365" in sender_lower else 0.0
            contains_paypal = 1.0 if "paypal" in sender_lower else 0.0
            contains_amazon = 1.0 if "amazon" in sender_lower else 0.0
            contains_bank = 1.0 if any(b in sender_lower for b in ["bank", "chase", "wells", "citi", "barclays", "hsbc"]) else 0.0
            contains_security = 1.0 if "security" in sender_lower or "secure" in sender_lower else 0.0
            contains_login = 1.0 if "login" in sender_lower or "signin" in sender_lower else 0.0
            contains_verify = 1.0 if "verify" in sender_lower or "validation" in sender_lower or "confirm" in sender_lower else 0.0
            contains_update = 1.0 if "update" in sender_lower or "reset" in sender_lower else 0.0
            
            suspicious_tld_sender = 1.0 if any(sender_lower.endswith(tld) or (tld + "@") in sender_lower or (tld + ".") in sender_lower for tld in self.domains_config["suspicious_tlds"]) else 0.0
            shortener_sender = 1.0 if any(shortener in sender_lower for shortener in self.domains_config["url_shorteners"]) else 0.0
            
            row_features = [
                url_count, email_count, exclamation_count, currency_count, caps_ratio,
                html_tag_count, form_detection, javascript_detection, shortened_count,
                suspicious_domain_count, urgency_words, credential_words, financial_words,
                promotional_words, fear_words, action_verbs_count,
                contains_google, contains_microsoft, contains_paypal, contains_amazon,
                contains_bank, contains_security, contains_login, contains_verify,
                contains_update, suspicious_tld_sender, shortener_sender
            ]
            features.append(row_features)
            
        return np.array(features)
