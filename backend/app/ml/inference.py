import joblib
import os
import re
import json
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from .preprocessor import TextPreprocessor

def levenshtein_distance(s1: str, s2: str) -> int:
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]

class InferenceService:
    def __init__(self, model_path='trained_models/model.pkl'):
        if not os.path.exists(model_path):
            # Try prepending backend/ if model is not found in local path
            alternative_path = os.path.join('backend', model_path)
            if os.path.exists(alternative_path):
                model_path = alternative_path
            else:
                raise FileNotFoundError(f"Model not found at {model_path}. Run trainer.py first.")
                
        self.model = joblib.load(model_path)
        self.preprocessor = TextPreprocessor()
        
        # Cache pipeline steps using ColumnTransformer references
        try:
            self.features_union = self.model.named_steps['features']
            self.tfidf = self.features_union.named_transformers_['tfidf'].named_steps['vect']
            self.eng = self.features_union.named_transformers_['eng']
        except Exception:
            self.features_union = None
            self.tfidf = None
            self.eng = None
            
        self.clf = self.model.named_steps['clf']
        
        # Extended Brand Configs
        self.brands_config = {
            "Microsoft": {"domains": ["microsoft.com", "microsoft365.com", "office.com", "live.com", "outlook.com"], "keywords": ["microsoft", "office365", "outlook", "msdn", "windows"]},
            "Google": {"domains": ["google.com", "gmail.com", "youtube.com", "android.com"], "keywords": ["google", "gmail", "gsuite", "workspace"]},
            "PayPal": {"domains": ["paypal.com", "paypal-objects.com"], "keywords": ["paypal", "venmo"]},
            "Amazon": {"domains": ["amazon.com", "amazon.co.uk", "amazon.de", "aws.amazon.com"], "keywords": ["amazon", "prime", "aws"]},
            "Apple": {"domains": ["apple.com", "icloud.com"], "keywords": ["apple", "icloud", "iphone", "macbook", "app store"]},
            "HDFC": {"domains": ["hdfcbank.com"], "keywords": ["hdfc"]},
            "ICICI": {"domains": ["icicibank.com"], "keywords": ["icici"]},
            "Axis Bank": {"domains": ["axisbank.com"], "keywords": ["axis bank", "axisbank"]},
            "SBI": {"domains": ["sbi.co.in", "onlinesbi.sbi"], "keywords": ["sbi", "state bank of india"]},
            "Adobe": {"domains": ["adobe.com"], "keywords": ["adobe", "acrobat", "pdfreader"]},
            "Netflix": {"domains": ["netflix.com"], "keywords": ["netflix"]},
            "Meta": {"domains": ["meta.com", "facebook.com", "instagram.com", "whatsapp.com"], "keywords": ["meta", "facebook", "instagram", "whatsapp"]},
            "LinkedIn": {"domains": ["linkedin.com"], "keywords": ["linkedin"]},
            "GitHub": {"domains": ["github.com"], "keywords": ["github"]},
            "OpenAI": {"domains": ["openai.com", "chatgpt.com"], "keywords": ["openai", "chatgpt"]},
            "Dropbox": {"domains": ["dropbox.com"], "keywords": ["dropbox"]},
            "OneDrive": {"domains": ["onedrive.live.com", "onedrive.com"], "keywords": ["onedrive"]},
            "Google Drive": {"domains": ["drive.google.com"], "keywords": ["google drive", "gdrive"]}
        }
        
        # Extended Psychological Tactics
        self.psychological_config = {
            "Fear": ["compromised", "locked", "suspended", "unauthorized login", "unusual activity", "billing error", "canceled", "penalty", "block", "restrict", "deactivated", "alert"],
            "Urgency": ["urgent", "immediately", "expires", "action required", "24 hours", "today", "now", "quick", "deadline", "limited time", "30 minutes"],
            "Authority": ["security support", "it department", "admin", "officer", "bank support", "billing department", "security team", "official notice", "administrator"],
            "Scarcity": ["limited offer", "exclusive rewards", "last chance", "before stock runs out", "final opportunity"],
            "Reward": ["free gift", "reward", "refund", "tax refund", "won", "lottery", "bonus", "claimed", "cashback", "prize"],
            "Trust": ["secure link", "official notification", "verified account", "safe document", "secure portal", "trusted sender", "safeguard"],
            "Compliance": ["verify identity", "confirm details", "update security question", "accept terms", "compliance review", "validate"],
            "Curiosity": ["shared a document", "check the invoice", "view photos", "details inside", "new message waiting", "attachment details"],
            "Loss Aversion": ["avoid suspension", "prevent deletion", "avoid fee", "loss of data", "stop service interruption"],
            "Financial Pressure": ["overdue utility bill", "wire transfer details", "transaction authorize", "charge on card", "billing update required"]
        }
        
        # Threat Categories Scanning Rules
        self.threat_categories_config = {
            "Credential Theft": ["password", "login", "credentials", "mfa", "otp", "verify account", "reset password", "security questions"],
            "Financial Scam": ["bank transfer", "wire funds", "routing details", "credit card update", "billing address"],
            "Lottery Scam": ["lottery winner", "prize reward", "unclaimed funds", "tax refund ticket"],
            "Invoice Fraud": ["overdue invoice", "unpaid statement", "purchase order summary", "payment details needed"],
            "Business Email Compromise": ["urgent request from CEO", "direct transfer requested", "confidential business transaction"],
            "Fake Delivery": ["failed delivery", "shipment tracking status", "ups package details", "fedex shipment delayed"],
            "Fake Refund": ["tax refund statement", "subscription credit refund", "billing cash back"],
            "Fake Tax Notice": ["irs tax alert", "revenue audit advisory", "outstanding taxes due"],
            "Investment Scam": ["make millions guaranteed", "automated crypto trading", "daily return portfolio"],
            "Crypto Scam": ["bitcoin deposit", "ethereum reward", "trust wallet verification"],
            "Tech Support Scam": ["critical system alert", "anti virus expired", "call safety support toll free"],
            "Account Verification": ["verify details", "re-authenticate session", "confirm profile settings"],
            "Password Reset Scam": ["forgot password request", "access link to reset", "change profile login"],
            "Malware Distribution": ["document.zip download", "statement.exe load", "view invoice.pdf.exe"],
            "Attachment-Based Attack": ["attached report summary", "embedded excel spreadsheet", "invoice file enclosed"],
            "Document Phishing": ["document signature", "signature pending", "sign agreement", "e-sign", "docusign", "document review"]
        }

        self.suspicious_tlds = {"xyz", "top", "gq", "cf", "tk", "ml", "ga", "fit", "work", "bid", "stream", "date"}

    def predict(self, text: str, sender: str = "", subject: str = "", body: str = "") -> Dict[str, Any]:
        # Fallback to text if raw fields are missing
        if not sender and not subject and not body:
            body = text
            sender = "unknown@aegis-security.local"
            subject = "No Subject Header"

        # Create DataFrame input to pass to the model pipeline
        df_input = pd.DataFrame([{
            "sender": sender,
            "subject": subject,
            "body": body,
            "text": f"{subject} {body}"
        }])

        # 1. Run Machine Learning Pipeline prediction
        prediction_label = self.model.predict(df_input)[0]
        probs = self.model.predict_proba(df_input)[0]
        
        # Retrieve thresholds
        threshold = 0.60
        config_path = os.path.join("trained_models", "model_config.json")
        if not os.path.exists(config_path):
            config_path = os.path.join("backend", "trained_models", "model_config.json")
        if os.path.exists(config_path):
            try:
                with open(config_path, "r") as f:
                    config = json.load(f)
                    threshold = config.get("threshold", 0.60)
            except Exception:
                pass

        ml_prob = float(probs[1])
        is_spam_ml = ml_prob >= threshold

        # 2. Execute Independent Analysis Engines
        iocs = self._extract_iocs(sender, subject, body)
        brands = self._detect_brands(sender, subject, body, iocs["extracted_domains"])
        domains = self._analyze_domains(iocs["extracted_domains"])
        psych = self._detect_social_engineering(body)
        threat_cats = self._analyze_threat_categories(subject, body)
        
        # Calculate Fused Threat Score
        threat_score = self._calculate_threat_score(ml_prob, iocs, brands, domains, psych)
        is_spam_fused = threat_score >= int(threshold * 100)

        # Local Feature Attribution
        feature_attribution = self._explain_local_attribution(df_input)

        # Safe Email explanations
        safe_email_explanation = self._generate_safe_email_explanation(is_spam_fused, iocs, brands, psych)

        # Keywords list
        top_keywords = self._extract_keywords(f"{subject} {body}")

        # Recommendations
        recommended_actions = self._generate_recommendations(threat_score, is_spam_fused)

        print("="*70)

        print("IOCS")
        print(iocs)

        print("BRANDS")
        print(brands)

        print("DOMAINS")
        print(domains)

        print("PSYCH")
        print(psych)

        print("THREAT CATS")
        print(threat_cats)

        print("TOP KEYWORDS")
        print(top_keywords)

        print("="*70)

        return self._build_prediction_output(
            is_spam=is_spam_fused,
            confidence=float(ml_prob if is_spam_fused else probs[0]),
            spam_score=ml_prob,
            threat_score=threat_score,
            top_keywords=top_keywords,
            iocs=iocs,
            brands=brands,
            domains=domains,
            psych=psych,
            threat_cats=threat_cats,
            feature_attribution=feature_attribution,
            safe_email_explanation=safe_email_explanation,
            recommended_actions=recommended_actions
        )

    def _extract_iocs(self, sender: str, subject: str, body: str) -> Dict[str, Any]:
        combined_raw = f"Sender: {sender}\nSubject: {subject}\nBody: {body}"
        
        # Regexes on RAW content
        urls = re.findall(r'https?://[^\s<>"]+|www\.[^\s<>"]+', combined_raw, re.IGNORECASE)
        emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', combined_raw)
        phones = re.findall(r'\+?\b\d{3}[-.\s]??\d{3}[-.\s]??\d{4}\b', combined_raw)
        attachments = re.findall(r'\b[\w-]+\.(?:pdf|zip|rar|docm|xlsm|exe|scr|docx|xlsx)\b', combined_raw, re.IGNORECASE)
        ips = re.findall(r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', combined_raw)
        
        # Extract unique domain names from URLs and Emails
        extracted_domains = []
        for url in urls:
            domain_match = re.search(r'https?://(?:www\.)?([^/:\s]+)', url, re.IGNORECASE)
            if domain_match:
                extracted_domains.append(domain_match.group(1).lower())
            else:
                www_match = re.search(r'www\.([^/:\s]+)', url, re.IGNORECASE)
                if www_match:
                    extracted_domains.append(www_match.group(1).lower())
        
        for email in emails:
            if "@" in email:
                email_domain = email.split("@")[-1].lower()
                extracted_domains.append(email_domain)
                
        extracted_domains = list(set(extracted_domains))
        
        shortened_urls = sum(1 for url in urls if any(short in url.lower() for short in ["bit.ly", "tinyurl", "goo.gl", "t.co"]))
        cloud_links = sum(1 for url in urls if any(cloud in url.lower() for cloud in ["drive.google.com", "dropbox.com", "onedrive.live.com", "sharepoint.com", "mega.nz"]))
        forms_detected = 1 if any(term in body.lower() for term in ['<form', 'input type=', 'type="submit"', 'type=\'submit\'']) else 0

        ioc_summary = {
            "URLs Found": len(urls),
            "Domains": len(extracted_domains),
            "Email Addresses": len(emails),
            "Phone Numbers": len(phones),
            "Attachments": len(attachments),
            "IP Addresses": len(ips),
            "Shortened URLs": shortened_urls,
            "Cloud Links": cloud_links,
            "Forms Detected": forms_detected
        }

        return {
            "summary": ioc_summary,
            "extracted_domains": extracted_domains,
            "has_iocs": len(urls) > 0 or len(emails) > 1 or len(attachments) > 0 or len(ips) > 0 or shortened_urls > 0 or forms_detected > 0
        }

    def _detect_brands(self, sender: str, subject: str, body: str, domains: List[str]) -> Dict[str, Any]:
        brand_detected = {
            "brand": "None",
            "confidence": 0,
            "detected_in": [],
            "impersonation": "None",
            "reason": "No brand indicators detected."
        }

        for brand, conf in self.brands_config.items():
            brand_in_sender = brand.lower() in sender.lower()
            brand_in_subj = brand.lower() in subject.lower()
            brand_in_body = brand.lower() in body.lower()
            brand_in_url = any(brand.lower() in dom for dom in domains)
            
            if brand_in_sender or brand_in_subj or brand_in_body or brand_in_url:
                detected_in = []
                if brand_in_sender: detected_in.append("Sender")
                if brand_in_subj: detected_in.append("Subject")
                if brand_in_body: detected_in.append("Body")
                if brand_in_url: detected_in.append("URLs")
                
                sender_domain = sender.split("@")[-1].lower() if "@" in sender else ""
                is_official = sender_domain in conf["domains"]
                
                confidence_val = 99 if len(detected_in) >= 2 and not is_official else (85 if not is_official else 100)
                impersonation_status = "Likely" if not is_official else "Official"
                
                reason_str = f"Official verified domain for {brand}." if is_official else f"Sender domain or links closely resemble official {brand} branding without authorization."
                
                brand_detected = {
                    "brand": brand,
                    "confidence": confidence_val,
                    "detected_in": detected_in,
                    "impersonation": impersonation_status,
                    "reason": reason_str
                }
                break

        return brand_detected

    def _analyze_domains(self, domains: List[str]) -> Dict[str, Any]:
        domain_analysis = {}
        for dom in domains:
            tld = dom.split(".")[-1]
            is_typosquatting = False
            associated_brand = "None"
            
            for brand, conf in self.brands_config.items():
                for trusted_dom in conf["domains"]:
                    trusted_name = trusted_dom.split(".")[0]
                    dom_name = dom.split(".")[0]
                    if 0 < levenshtein_distance(dom_name, trusted_name) <= 2:
                        is_typosquatting = True
                        associated_brand = brand
                        break
            
            if is_typosquatting:
                domain_analysis[dom] = {
                    "brand": associated_brand,
                    "status": "Brand Impersonation",
                    "reason": f"Likely typosquatting of the official {associated_brand} brand name."
                }
            elif any(brand.lower() in dom and dom not in conf["domains"] for brand, conf in self.brands_config.items()):
                matched_brand = [b for b, c in self.brands_config.items() if b.lower() in dom][0]
                domain_analysis[dom] = {
                    "brand": matched_brand,
                    "status": "Brand Impersonation",
                    "reason": f"Not an official {matched_brand} domain."
                }
            elif dom in [d for conf in self.brands_config.values() for d in conf["domains"]]:
                matched_brand = [b for b, c in self.brands_config.items() if dom in c["domains"]][0]
                domain_analysis[dom] = {
                    "brand": matched_brand,
                    "status": "Trusted",
                    "reason": f"Official verified domain for {matched_brand}."
                }
            elif tld in self.suspicious_tlds:
                domain_analysis[dom] = {
                    "brand": "None",
                    "status": "Suspicious",
                    "reason": f"Uses suspicious TLD '.{tld}' associated with malicious campaigns."
                }
            else:
                domain_analysis[dom] = {
                    "brand": "None",
                    "status": "Unknown",
                    "reason": "Unclassified external domain."
                }
                
        return domain_analysis

    def _detect_social_engineering(self, body: str) -> Dict[str, Any]:
        se_techniques = []
        se_evidence = {}
        sentences = [s.strip() for s in re.split(r'[.!?\n]', body) if len(s.strip()) > 5]
        
        for tactic, keywords in self.psychological_config.items():
            tactic_evidence = []
            for sent in sentences:
                if any(re.search(r'\b' + re.escape(kw) + r'\b', sent.lower()) for kw in keywords):
                    tactic_evidence.append(sent)
            if tactic_evidence:
                se_techniques.append(tactic)
                se_evidence[tactic] = tactic_evidence[0]

        return {
            "techniques": se_techniques,
            "evidence": se_evidence
        }

    def _analyze_threat_categories(self, subject: str, body: str) -> Dict[str, List[str]]:
        detected_categories = {}
        sentences = [s.strip() for s in re.split(r'[.!?\n]', f"{subject}. {body}") if len(s.strip()) > 5]
        
        for category, keywords in self.threat_categories_config.items():
            matches = [sent for sent in sentences if any(re.search(r'\b' + re.escape(kw) + r'\b', sent.lower()) for kw in keywords)]
            if matches:
                detected_categories[category] = [keywords[0]]
        return detected_categories

    def _calculate_threat_score(self, ml_prob: float, iocs: Dict[str, Any], brand: Dict[str, Any], domains: Dict[str, Any], psych: Dict[str, Any]) -> int:
        # Fused Threat Score Formula:
        # 40% ML Probability
        score = (ml_prob * 40)
        
        # 20% IOC Evidence
        ioc_score = 0
        sum_iocs = sum(iocs["summary"].values())
        if sum_iocs > 0:
            ioc_score = min(20, 5 + sum_iocs * 3)
        score += ioc_score
        
        # 15% Brand Impersonation
        brand_score = 0
        if brand["impersonation"] == "Likely":
            brand_score = 15
        elif brand["impersonation"] == "Official":
            brand_score = 0 # Safe signal
        score += brand_score
        
        # 10% Domain Reputation
        domain_score = 0
        statuses = [v["status"] for v in domains.values()]
        if "Brand Impersonation" in statuses:
            domain_score = 10
        elif "Suspicious" in statuses:
            domain_score = 7
        elif "Unknown" in statuses:
            domain_score = 3
        score += domain_score
        
        # 10% Psychological Manipulation
        psych_score = min(10, len(psych["techniques"]) * 5)
        score += psych_score
        
        # 5% Rule Engine Confidence
        rule_score = 0
        if iocs["has_iocs"] or brand["impersonation"] != "None":
            rule_score = 5
        score += rule_score
        
        return int(np.clip(score, 0, 100))

    def _explain_local_attribution(self, df_input: pd.DataFrame) -> Dict[str, Any]:
        feature_attribution = {
            "positive_tfidf": [],
            "positive_engineered": [],
            "negative_attribution": []
        }
        if self.features_union and self.clf:
            try:
                X_transformed = self.features_union.transform(df_input)
                X_arr = X_transformed.toarray()[0] if hasattr(X_transformed, "toarray") else np.array(X_transformed)[0]
                coefs = self.clf.coef_[0]
                
                vocabulary_size = len(self.tfidf.vocabulary_)
                feature_names = self.tfidf.get_feature_names_out()
                
                engineered_feature_names = [
                    "url_count", "email_count", "exclamation_count", "currency_count", "caps_ratio",
                    "html_tag_count", "form_detection", "javascript_detection", "shortened_count",
                    "suspicious_domain_count", "urgency_words", "credential_words", "financial_words",
                    "promotional_words", "fear_words", "action_verbs_count",
                    "contains_google", "contains_microsoft", "contains_paypal", "contains_amazon",
                    "contains_bank", "contains_security", "contains_login", "contains_verify",
                    "contains_update", "suspicious_tld_sender", "shortener_sender"
                ]
                
                raw_text = df_input["text"].iloc[0].lower()
                cleaned_text = self.preprocessor.clean_text(raw_text)

                # Positive TF-IDF
                vocab_attribs = []
                for i in X_arr.nonzero()[0]:
                    if i < vocabulary_size:
                        word = feature_names[i]
                        contrib = X_arr[i] * coefs[i]
                        if contrib > 0 and (word.lower() in raw_text or word.lower() in cleaned_text):
                            desc = "High-weight credential theft term." if word in ["verify", "password", "login"] else ("Frequently associated with phishing." if word in ["security", "account"] else "Spam pattern matched.")
                            vocab_attribs.append({
                                "feature": word,
                                "value": float(X_arr[i]),
                                "contribution": float(contrib),
                                "explanation": desc
                            })
                vocab_attribs.sort(key=lambda x: x["contribution"], reverse=True)
                feature_attribution["positive_tfidf"] = vocab_attribs[:5]

                # Positive Engineered
                eng_attribs = []
                for idx, eng_name in enumerate(engineered_feature_names):
                    i = vocabulary_size + idx
                    if i < len(X_arr):
                        val = X_arr[i]
                        contrib = val * coefs[i]
                        if contrib > 0 and val > 0:
                            desc = "Urgency signal detected." if "urgency" in eng_name else ("Impersonation sender domain." if "contains" in eng_name else "Suspicious payload structure.")
                            eng_attribs.append({
                                "feature": eng_name.replace("_", " ").title(),
                                "value": float(val),
                                "contribution": float(contrib),
                                "explanation": desc
                            })
                eng_attribs.sort(key=lambda x: x["contribution"], reverse=True)
                feature_attribution["positive_engineered"] = eng_attribs[:5]

                # Negatives
                neg_attribs = []
                for i in X_arr.nonzero()[0]:
                    if i < vocabulary_size:
                        word = feature_names[i]
                        contrib = X_arr[i] * coefs[i]
                        if contrib < 0:
                            neg_attribs.append({
                                "feature": word,
                                "contribution": float(contrib),
                                "explanation": "Normal business word suggesting legitimacy."
                            })
                for idx, eng_name in enumerate(engineered_feature_names):
                    i = vocabulary_size + idx
                    if i < len(X_arr):
                        val = X_arr[i]
                        contrib = val * coefs[i]
                        if contrib < 0 and val > 0:
                            neg_attribs.append({
                                "feature": eng_name.replace("_", " ").title(),
                                "contribution": float(contrib),
                                "explanation": "Signal indicating legitimate sender or payload structure."
                            })
                neg_attribs.sort(key=lambda x: x["contribution"])
                feature_attribution["negative_attribution"] = neg_attribs[:5]
            except Exception:
                pass
                
        return feature_attribution

    def _extract_keywords(self, text: str) -> List[str]:
        top_keywords = []
        if self.tfidf and self.clf:
            try:
                cleaned_text = self.preprocessor.clean_text(text)
                tfidf_matrix = self.tfidf.transform([cleaned_text])
                non_zero_features = tfidf_matrix.nonzero()[1]
                coefs = self.clf.coef_[0]
                vocab_size = len(self.tfidf.vocabulary_)
                feature_names = self.tfidf.get_feature_names_out()
                
                contributions = []
                for idx in non_zero_features:
                    if idx < vocab_size:
                        word = feature_names[idx]
                        coef = coefs[idx]
                        tfidf_val = tfidf_matrix[0, idx]
                        contribution = tfidf_val * coef
                        if contribution > 0:
                            if word.lower() in text.lower() or word.lower() in cleaned_text.lower():
                                contributions.append((word, float(contribution)))
                contributions.sort(key=lambda x: x[1], reverse=True)
                top_keywords = [item[0] for item in contributions[:10]]
            except Exception:
                pass
        return top_keywords

    def _generate_recommendations(self, threat_score: int, is_spam: bool) -> List[str]:
        if is_spam:
            return [
                "Critical Action Recommended",
                "Delete immediately",
                "Do not click links",
                "Block sender",
                "Report phishing",
                "Verify directly with official website"
            ]
        elif threat_score >= 35:
            return [
                "Review Carefully",
                "Verify sender",
                "Do not download attachments"
            ]
        else:
            return [
                "Appears legitimate",
                "Continue with caution"
            ]

    def _generate_safe_email_explanation(self, is_spam: bool, iocs: Dict[str, Any], brand: Dict[str, Any], psych: Dict[str, Any]) -> List[str]:
        safe_email_explanation = []
        if not is_spam:
            if iocs["summary"]["URLs Found"] == 0:
                safe_email_explanation.append("No suspicious URLs detected")
            if brand["brand"] == "None" or brand["impersonation"] == "Official":
                safe_email_explanation.append("Sender appears legitimate")
            if "Urgency" not in psych["techniques"]:
                safe_email_explanation.append("No urgency manipulation detected")
            if iocs["summary"]["Attachments"] == 0:
                safe_email_explanation.append("No malicious attachment indicators")
            safe_email_explanation.append("Professional business language detected")
        return safe_email_explanation

    def _build_prediction_output(self, is_spam: bool, confidence: float, spam_score: float, threat_score: int, top_keywords: List[str], iocs: Dict[str, Any], brands: Dict[str, Any], domains: Dict[str, Any], psych: Dict[str, Any], threat_cats: Dict[str, List[str]], feature_attribution: Dict[str, Any], safe_email_explanation: List[str], recommended_actions: List[str]) -> Dict[str, Any]:
        # Fallback keywords if empty and is spam
        print(">>> ENTERED _build_prediction_output <<<")
        if not top_keywords and is_spam:
            if feature_attribution and feature_attribution.get("positive_engineered"):
                top_keywords = [item["feature"].replace(" ", "_").lower() for item in feature_attribution["positive_engineered"]]
            else:
                top_keywords = ["suspicious_structure"]

        # Formulate Executive Narrative Summary
        summary_parts = []
        severity = "Safe"
        if threat_score > 90:
            severity = "Critical"
        elif threat_score > 70:
            severity = "High"
        elif threat_score > 45:
            severity = "Medium"
        elif threat_score > 20:
            severity = "Low"

        if is_spam:
            prime_attack = list(threat_cats.keys())[0] if threat_cats else "Phishing Scam"
            summary_parts.append(f"This email strongly resembles a {prime_attack.lower()} campaign")
            if brands["brand"] != "None" and brands["impersonation"] == "Likely":
                summary_parts.append(f" impersonating {brands['brand']}")
            summary_parts.append(".\n\n")
            
            indicators = []
            if "Urgency" in psych["techniques"]:
                indicators.append("urgency language")
            if "Credential Theft" in threat_cats:
                indicators.append("credential theft requests")
            if any(val["status"] in ["Suspicious", "Brand Impersonation"] for val in domains.values()):
                indicators.append("suspicious sender domains")
            if brands["brand"] != "None" and brands["impersonation"] == "Likely":
                indicators.append("account verification terminology")
                
            if indicators:
                summary_parts.append(f"Multiple independent phishing indicators were detected including {', '.join(indicators)}.")
            else:
                summary_parts.append("This classification was primarily influenced by structural phishing indicators including suspicious URLs, sender reputation, and engineered security features.")
                
            summary_parts.append(f"\n\nThe classifier predicts this email is malicious with {severity.lower()} severity.")
        else:
            summary_parts.append("No significant threat indicators were detected. The email represents standard business or personal communication.")
            
        executive_summary = "".join(summary_parts)

        threat_summary = {
            "attack_type": list(threat_cats.keys())[0] if (is_spam and threat_cats) else "None",
            "severity": severity,
            "brand_impersonated": brands["brand"] if brands else "None",
            "primary_target": "Credentials" if "Credential Theft" in threat_cats else ("Financial Assets" if "Financial Scam" in threat_cats else "User Security"),
            "confidence_level": "Very High" if confidence > 0.9 else ("High" if confidence > 0.7 else "Medium"),
            "executive_summary": executive_summary
        }

        # Format Risk Breakdown
        risk_breakdown = []
        if is_spam:
            factors = []
            if "Credential Theft" in threat_cats:
                factors.append(("Credential Theft", 30, "Attempts to gather credentials via login requests."))
            if brands["brand"] != "None" and brands["impersonation"] == "Likely":
                factors.append(("Brand Impersonation", 20, f"Unauthorized references to brand name {brands['brand']}."))
            if any(val["status"] in ["Suspicious", "Brand Impersonation"] for val in domains.values()):
                factors.append(("Suspicious URL", 18, "Unverified or typosquatted link domains found."))
            if "Urgency" in psych["techniques"]:
                factors.append(("Urgency Language", 12, "High-pressure deadlines or timelines identified."))
            if "Financial Scam" in threat_cats or "Invoice Fraud" in threat_cats:
                factors.append(("Financial Context", 10, "Demands related to wire transfers, bills, or rewards."))
            if iocs["summary"]["Forms Detected"] > 0:
                factors.append(("Sender Reputation", 10, "Layout elements resembling sign-in structures."))
            
            total_fact = sum(f[1] for f in factors)
            if total_fact > 0:
                mult = threat_score / total_fact
                for name, weight, reason in factors:
                    risk_breakdown.append({
                        "name": name,
                        "value": int(weight * mult),
                        "reason": reason
                    })
            else:
                risk_breakdown.append({
                    "name": "General Spam Model",
                    "value": threat_score,
                    "reason": "General statistical NLP patterns matched spam templates."
                })

        confidence_explanation = f"Fused intelligence framework calculated a final risk level of {severity} based on a combined score of {threat_score}."

        if is_spam:
            reasons = []
            narrative = f"The security engine classified this email as malicious with a fused threat score of {threat_score}."
            if brands["brand"] != "None":
                narrative += f" Brand impersonation profiling flagged unauthorized target spoofing of {brands['brand']}."
            if "Urgency" in psych["techniques"]:
                narrative += f" Urgency tactic profiling detected high-pressure deadlines in the email text."
            if iocs["summary"]["URLs Found"] > 0:
                narrative += f" Link analysis identified suspicious URL links pointing to unverified domains."
            reasons.append(narrative)
        else:
            reasons = [
                "This email represents standard legitimate communication. Passively scanned security factors show no active indicators of urgency, credential requests, or malicious domains."
            ]

        return {
            "prediction": "Spam" if is_spam else "Safe",
            "confidence": confidence,
            "spam_score": spam_score,
            "suspicious_keywords": top_keywords,
            "reasons": reasons,
            "threat_summary": threat_summary,
            "threat_score": threat_score,
            "threat_categories": threat_cats,
            "ioc_summary": iocs["summary"],
            "domain_analysis": domains,
            "brand_detection": brands,
            "social_engineering": psych["techniques"],
            "social_engineering_evidence": psych["evidence"],
            "confidence_explanation": confidence_explanation,
            "recommended_actions": recommended_actions,
            "risk_breakdown": risk_breakdown,
            "safe_email_explanation": safe_email_explanation,
            "feature_attribution": feature_attribution
        }
