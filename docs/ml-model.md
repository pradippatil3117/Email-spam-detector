# Machine Learning Pipeline & Explainability

This document details the Machine Learning pipeline, text processing methods, model mathematical formulation, and explainable AI (XAI) feature importance metrics of the Aegis classification engine.

## Inference Pipeline Flow

```
Raw Email PAYLOAD (Sender, Subject, Body)
   │
   ▼
[HTML Cleaning] (BeautifulSoup4 strips markup tags)
   │
   ▼
[Lemmatization] (NLTK-driven morphology normalization)
   │
   ▼
[Tokenizer] (Regex filters out punctuation & collects alphanumeric terms)
   │
   ▼
[TF-IDF Vectorizer] (Transforms clean text into a sparse float vector of size 1,248)
   │
   ▼
[Logistic Regression] (Applies weight coefficients and intercept to calculate log-odds)
   │
   ▼
[Sigmoid Activation] (Converts log-odds to spam probability p in range [0, 1])
   │
   ▼
[Decision Boundary] (If p >= 0.72, classify as SPAM; else classify as SAFE)
```

---

## 1. Natural Language Preprocessing

Raw email inputs contain noise (HTML markup, styling, punctuation, capitalization variations). Preprocessing extracts clean, standardized features:
1. **HTML Strip**: Strips markup elements using `BeautifulSoup4`.
2. **Lowercasing**: Normalizes casing to ensure word representations match.
3. **Word Tokenization**: Regex tokenizes text on word boundaries.
4. **Lemmatization**: Uses morphological rules to map variations of a word (e.g. `running`, `ran`, `runs` to `run`).

---

## 2. Feature Extraction (TF-IDF)

We convert the list of tokens into numerical vectors using **Term Frequency-Inverse Document Frequency (TF-IDF)** with a vocabulary size of **1,248 features**.

The weight of term $t$ in document $d$ is:

$$\text{tf-idf}(t, d, D) = \text{tf}(t, d) \times \text{idf}(t, D)$$

Where:
- $\text{tf}(t, d)$ is the Term Frequency: count of term $t$ in document $d$.
- $\text{idf}(t, D)$ is the Inverse Document Frequency: measures term importance across all $N$ documents in dataset $D$:

$$\text{idf}(t, D) = \log \left( \frac{1 + N}{1 + |\{d \in D : t \in d\}|} \right) + 1$$

---

## 3. Classification Model Formulation

The model is a **Logistic Regression** classifier. It calculates the probability of an email being spam ($y=1$) given the input feature vector $\mathbf{x}$:

$$P(y=1 | \mathbf{x}) = \sigma(\mathbf{w}^T \mathbf{x} + b)$$

Where:
- $\mathbf{w}$ is the vector of model coefficients (feature weights).
- $b$ is the model bias (intercept).
- $\sigma(z)$ is the sigmoid activation function:

$$\sigma(z) = \frac{1}{1 + e^{-z}}$$

If the resulting probability is greater than or equal to the calibrated **decision boundary threshold (0.72)**, the email is classified as **SPAM**. Otherwise, it is classified as **SAFE**.

---

## 4. Model Coefficients (Feature Importance)

The Logistic Regression model weights correspond to word influence:
- **Positive weights** increase spam probability (Spam Keywords).
- **Negative weights** decrease spam probability (Safe Keywords).

### Top 5 Spam-Influenced Terms
| Word Term | Coefficient | Feature Impact |
| :--- | :--- | :--- |
| **urgent** | `+4.12` | Urgency cues, immediate action demands |
| **locked** | `+3.85` | Account security hooks, credential harvesting triggers |
| **verify** | `+3.42` | Account validation redirects |
| **million** | `+3.10` | Lottery / prize scams |
| **win** | `+2.95` | Sweepstakes/lottery lures |

### Top 5 Safe-Influenced Terms
| Word Term | Coefficient | Feature Impact |
| :--- | :--- | :--- |
| **kickoff** | `-3.22` | Standard corporate synchronization and meetings |
| **invoice** | `-2.85` | Regular business transactions / invoice billing |
| **scheduled**| `-2.60` | Meeting setups and calendar coordination |
| **revised** | `-2.15` | Collaborative updates and document edits |
| **notes** | `-1.98` | Team sync minutes and administrative reviews |
