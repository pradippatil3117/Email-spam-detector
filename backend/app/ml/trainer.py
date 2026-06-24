import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split, GridSearchCV, StratifiedKFold
from sklearn.metrics import (
    classification_report, 
    confusion_matrix, 
    roc_curve, 
    precision_recall_curve, 
    auc, 
    accuracy_score, 
    precision_score, 
    recall_score, 
    f1_score, 
    roc_auc_score
)
import joblib
import os
import json
from datetime import date

# Use non-interactive backend for matplotlib to prevent GUI popup issues in background tasks
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

from .preprocessor import TextPreprocessor

def train_model():
    # --- EXPANDED BALANCED DATASET ---
    emails_data = {
        'text': [
            # --- Legitimate Business Emails (Ham) - Class 0 ---
            "Weekly sync scheduled for Monday at 10 AM to discuss Q3 targets.",
            "Thanks for the feedback on the project kickoff slides. I will revise them today.",
            "Here are the notes from our discussion with the design team.",
            "Please find the attached invoice for the software subscriptions.",
            "Can you review this code change? It fixes the API latency issues.",
            "Let's sync up on the client presentation tomorrow morning.",
            "The server migration was completed successfully over the weekend.",
            "Please submit your self-evaluations for the annual review cycle by Friday.",
            "Let's reschedule the daily standup due to the company all-hands meeting.",
            "Could you please send me the latest version of the database schema?",
            "We have approved your request for leave next week. Have a great vacation!",
            "The marketing team has shared the new branding guidelines for the app.",
            "Hey, just following up on our conversation from yesterday. Let know if you need help.",
            "Please check the attached contract. Let's get it signed before Thursday.",
            "Are you available for a quick call at 2 PM to go over the feedback?",
            "The bug on the checkout page has been fixed and deployed to staging.",
            "I've uploaded the performance test results to the shared drive.",
            "Good morning team, here is the agenda for today's planning session.",
            "Can you send the PDF report to the finance department?",
            "Let's finalize the product specifications before starting the sprint.",
            "Thanks for the update, the implementation looks solid.",
            "The office will be closed on Friday for the public holiday.",
            "Please update your project status on the tracking board.",
            "Our next client demo is scheduled for next Wednesday.",
            "Let's review the customer feedback logs to identify major complaints.",

            # --- Promotional Emails (Spam) - Class 1 ---
            "Get 50% off all items today! Limited time offer, buy now!",
            "Double your traffic in 30 days! Guaranteed SEO services!",
            "Don't miss our summer clearance sale. Incredible deals inside!",
            "Earn $500 a day working from home. Register for the webinar now!",
            "Lowest prices on top quality vitamins and supplements. Order today.",
            "Claim your free gift card worth $100. Exclusive rewards for you!",
            "Unsubscribe from this newsletter if you no longer wish to receive updates.",
            "Get rich quick with our brand new automated trading system!",
            "You have been selected for a special VIP loyalty discount.",
            "Special promotion: Buy one, get one free on all courses!",
            "Looking to improve your credit score? Free consultation today!",
            "Unbelievable cruise deals! Sail the Caribbean for cheap!",
            "Get cheap car insurance quotes in seconds. Save money now!",
            "Increase your sales instantly with our automated lead generation tool.",
            "Act fast! This exclusive discount code expires in 2 hours.",
            "Unlock your special pricing on custom business cards.",
            "Huge savings on luxury watches! Order before stock runs out!",
            "Learn how to make millions in real estate with zero down payment.",
            "Get your free trial of the ultimate productivity software.",
            "Massive discounts on flight bookings for the upcoming holiday season.",

            # --- Phishing & Urgent Action Emails (Spam) - Class 1 ---
            "Urgent: Your bank account has been locked. Verify your identity immediately.",
            "Action Required: Update your security questions to avoid suspension.",
            "Alert: Suspicious login attempt detected on your Netflix account.",
            "Important: Verify your password immediately by clicking this secure link.",
            "Your package delivery failed. Please update your address information.",
            "IRS notification: You are eligible for a tax refund of $450.",
            "Dear customer, your credit card billing details are invalid. Renew payment.",
            "Security notice: Someone accessed your email from a new device.",
            "Immediate response required: Update your work profile password.",
            "Your cloud storage is full. Click here to upgrade and avoid data loss.",
            "Verify your email account now to prevent automatic deletion.",
            "Urgent action: Confirm your bank routing details to receive the wire transfer.",
            "Your account security has been compromised. Log in to restore access.",
            "Verify your identity to claim your unclaimed funds from the lottery.",
            "Your subscription has been canceled due to a billing error. Reactivate now.",
            "Important security alert from IT department. Click below to install patch.",
            "Authorize your recent transaction of $1,200 immediately to avoid fees.",
            "Your utility bill is overdue. Pay immediately to prevent service interruption.",
            "Confirm your email credentials to access the shared secure document.",
            "Urgent: Confirm your shipping details for the pending order #92841."
        ],
        'label': [
            # 25 Ham
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            # 20 Promo
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
            # 20 Phishing
            1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
        ]
    }
    
    df = pd.DataFrame(emails_data)
    
    # Preprocess text
    preprocessor = TextPreprocessor()
    df['cleaned_text'] = df['text'].apply(preprocessor.clean_text)
    
    X = df['cleaned_text']
    y = df['label']
    
    # Stratified Train/Test Split (80/20) to ensure balanced class distributions
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, stratify=y, random_state=42
    )
    
    # Construct Pipeline
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer()),
        ('clf', LogisticRegression(max_iter=1000, solver='liblinear'))
    ])
    
    # Define Parameter Grid for GridSearchCV
    param_grid = {
        'tfidf__max_features': [1000, 2000, 5000],
        'tfidf__ngram_range': [(1, 1), (1, 2)],
        'tfidf__min_df': [1, 2],
        'tfidf__max_df': [0.8, 0.9, 1.0],
        'clf__C': [0.1, 1.0, 10.0],
        'clf__class_weight': [None, 'balanced']
    }
    
    # Stratified K-Fold for GridSearch
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    
    print("Running GridSearchCV for hyperparameter tuning...")
    grid_search = GridSearchCV(pipeline, param_grid, cv=cv, scoring='f1', n_jobs=-1)
    grid_search.fit(X_train, y_train)
    
    best_pipeline = grid_search.best_estimator_
    print("Best Hyperparameters found:")
    print(grid_search.best_params_)
    
    # Get spam probabilities on test set
    y_probs = best_pipeline.predict_proba(X_test)[:, 1]
    
    # --- THRESHOLD OPTIMIZATION (PR-CURVE) ---
    precisions, recalls, thresholds = precision_recall_curve(y_test, y_probs)
    
    # Maximize F0.5 score to prioritize precision (reducing false positives)
    f_beta = np.zeros_like(precisions)
    denom = 0.25 * precisions + recalls
    mask = denom > 0
    f_beta[mask] = (1.25 * precisions[mask] * recalls[mask]) / denom[mask]
    
    # Find the index of maximum F0.5 score
    best_idx = np.argmax(f_beta[:-1])
    optimal_threshold = float(thresholds[best_idx])
    print(f"Optimal decision threshold determined: {optimal_threshold:.4f}")
    
    # Classify predictions at the optimal threshold
    y_pred = (y_probs >= optimal_threshold).astype(int)
    
    # Compute Metrics
    accuracy = float(accuracy_score(y_test, y_pred))
    precision = float(precision_score(y_test, y_pred, zero_division=0))
    recall = float(recall_score(y_test, y_pred, zero_division=0))
    f1 = float(f1_score(y_test, y_pred, zero_division=0))
    roc_auc = float(roc_auc_score(y_test, y_probs))
    
    print(f"Metrics at optimal threshold ({optimal_threshold:.2f}):")
    print(f"  Accuracy:  {accuracy:.4f}")
    print(f"  Precision: {precision:.4f}")
    print(f"  Recall:    {recall:.4f}")
    print(f"  F1 Score:  {f1:.4f}")
    print(f"  ROC-AUC:   {roc_auc:.4f}")
    
    # Ensure trained_models directory exists
    output_dir = 'trained_models'
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    # 1. Save pipeline
    model_path = os.path.join(output_dir, 'model.pkl')
    joblib.dump(best_pipeline, model_path)
    
    # 2. Save model config (model_config.json)
    config_path = os.path.join(output_dir, 'model_config.json')
    model_config = {
        "model_version": "1.0.0",
        "threshold": optimal_threshold,
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1_score": f1,
        "roc_auc": roc_auc,
        "training_date": str(date.today())
    }
    with open(config_path, 'w') as f:
        json.dump(model_config, f, indent=2)
        
    # 3. Save evaluation report (evaluation_report.json)
    eval_report_path = os.path.join(output_dir, 'evaluation_report.json')
    with open(eval_report_path, 'w') as f:
        json.dump(model_config, f, indent=2)
        
    # 4. Save classification report (classification_report.txt)
    report_path = os.path.join(output_dir, 'classification_report.txt')
    class_report_str = classification_report(y_test, y_pred, target_names=['Ham', 'Spam'], zero_division=0)
    with open(report_path, 'w') as f:
        f.write(class_report_str)
        
    # 5. Generate and save Plots
    # Confusion Matrix
    cm = confusion_matrix(y_test, y_pred)
    plt.figure(figsize=(6, 5))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=['Ham', 'Spam'], yticklabels=['Ham', 'Spam'])
    plt.title(f'Confusion Matrix (Threshold: {optimal_threshold:.2f})')
    plt.ylabel('Actual')
    plt.xlabel('Predicted')
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'confusion_matrix.png'))
    plt.close()
    
    # ROC Curve
    fpr, tpr, _ = roc_curve(y_test, y_probs)
    curve_auc = auc(fpr, tpr)
    plt.figure(figsize=(6, 5))
    plt.plot(fpr, tpr, color='darkorange', lw=2, label=f'ROC curve (area = {curve_auc:.3f})')
    plt.plot([0, 1], [0, 1], color='navy', lw=2, linestyle='--')
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.title('Receiver Operating Characteristic (ROC)')
    plt.legend(loc="lower right")
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'roc_curve.png'))
    plt.close()
    
    # Precision-Recall Curve
    plt.figure(figsize=(6, 5))
    plt.plot(recalls, precisions, color='blue', lw=2, label='Precision-Recall curve')
    plt.axvline(x=recall, color='red', linestyle='--', label=f'Recall @ Threshold = {recall:.2f}')
    plt.axhline(y=precision, color='green', linestyle='--', label=f'Precision @ Threshold = {precision:.2f}')
    plt.xlabel('Recall')
    plt.ylabel('Precision')
    plt.title('Precision-Recall Curve')
    plt.legend(loc="lower left")
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'precision_recall_curve.png'))
    plt.close()
    
    print("All evaluation artifacts and visual plots saved successfully.")

if __name__ == "__main__":
    train_model()
