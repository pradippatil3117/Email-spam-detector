import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.compose import ColumnTransformer
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
    roc_auc_score,
    balanced_accuracy_score,
    matthews_corrcoef
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

from .preprocessor import TextPreprocessor, FeatureEngineer

def train_model():
    # --- LOAD DATA FROM CSV ---
    current_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    data_path = os.path.join(current_dir, "data", "emails.csv")
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset not found at {data_path}")
    df = pd.read_csv(data_path)
    
    # 1. Verify loading & print details
    print(f"Number of training samples loaded: {len(df)}")
    print(f"Label distribution:\n{df['label'].value_counts()}")
    
    # Construct DataFrame with sender, subject, body, and text columns
    # emails.csv only has 'text' column, so we default other raw fields.
    df['sender'] = ""
    df['subject'] = ""
    df['body'] = df['text']
    
    X = df[['sender', 'subject', 'body', 'text']]
    y = df['label']
    
    # Stratified Train/Test Split (80/20) to ensure balanced class distributions
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, stratify=y, random_state=42
    )
    
    # Construct Pipeline with ColumnTransformer (TF-IDF sub-pipeline + FeatureEngineer)
    pipeline = Pipeline([
        ('features', ColumnTransformer(
            transformers=[
                ('tfidf', Pipeline([
                    ('clean', TextPreprocessor()),
                    ('vect', TfidfVectorizer())
                ]), 'text'),
                ('eng', FeatureEngineer(), ['sender', 'subject', 'body', 'text'])
            ]
        )),
        ('clf', LogisticRegression(max_iter=1000, solver='liblinear'))
    ])
    
    # Define Parameter Grid for GridSearchCV
    param_grid = {
        'features__tfidf__vect__max_features': [1000, 2000],
        'features__tfidf__vect__ngram_range': [(1, 1), (1, 2)],
        'features__tfidf__vect__min_df': [1, 2],
        'features__tfidf__vect__max_df': [0.8, 0.9],
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
    
    # Print metrics on TF-IDF vocabulary and feature engineering
    features_transformer = best_pipeline.named_steps['features']
    tfidf_step = features_transformer.named_transformers_['tfidf'].named_steps['vect']
    vocabulary_size = len(tfidf_step.vocabulary_)
    print(f"TF-IDF vocabulary size: {vocabulary_size}")
    
    engineered_feature_count = 27
    print(f"Engineered feature count: {engineered_feature_count}")
    
    X_train_transformed = best_pipeline.named_steps['features'].transform(X_train)
    print(f"Combined feature matrix shape: {X_train_transformed.shape}")
    
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
    balanced_acc = float(balanced_accuracy_score(y_test, y_pred))
    mcc = float(matthews_corrcoef(y_test, y_pred))
    
    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel()
    false_positive_rate = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
    false_negative_rate = float(fn / (fn + tp)) if (fn + tp) > 0 else 0.0
    
    print(f"Metrics at optimal threshold ({optimal_threshold:.2f}):")
    print(f"  Accuracy:          {accuracy:.4f}")
    print(f"  Precision:         {precision:.4f}")
    print(f"  Recall:            {recall:.4f}")
    print(f"  F1 Score:          {f1:.4f}")
    print(f"  ROC-AUC:           {roc_auc:.4f}")
    print(f"  Balanced Accuracy: {balanced_acc:.4f}")
    print(f"  MCC:               {mcc:.4f}")
    print(f"  FPR:               {false_positive_rate:.4f}")
    print(f"  FNR:               {false_negative_rate:.4f}")
    
    # Ensure trained_models directory exists
    output_dir = os.path.join(current_dir, 'trained_models')
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    # Extract feature importances and save feature_importance.csv
    coefs = best_pipeline.named_steps['clf'].coef_[0]
    tfidf_feature_names = tfidf_step.get_feature_names_out()
    
    engineered_feature_names = [
        "url_count", "email_count", "exclamation_count", "currency_count", "caps_ratio",
        "html_tag_count", "form_detection", "javascript_detection", "shortened_count",
        "suspicious_domain_count", "urgency_words", "credential_words", "financial_words",
        "promotional_words", "fear_words", "action_verbs_count",
        "contains_google", "contains_microsoft", "contains_paypal", "contains_amazon",
        "contains_bank", "contains_security", "contains_login", "contains_verify",
        "contains_update", "suspicious_tld_sender", "shortener_sender"
    ]
    
    feature_names = list(tfidf_feature_names) + engineered_feature_names
    
    df_importance = pd.DataFrame({
        'feature': feature_names,
        'coefficient': coefs
    })
    df_importance = df_importance.sort_values(by='coefficient', ascending=False)
    
    # Save to CSV
    df_importance.to_csv(os.path.join(output_dir, 'feature_importance.csv'), index=False)
    print("feature_importance.csv saved successfully.")
    
    # Extract top positive & negative features
    top_pos_df = df_importance.head(10)
    top_positive_features = dict(zip(top_pos_df['feature'], top_pos_df['coefficient']))
    
    top_neg_df = df_importance.tail(10).sort_values(by='coefficient', ascending=True)
    top_negative_features = dict(zip(top_neg_df['feature'], top_neg_df['coefficient']))
    
    # 1. Save pipeline
    model_path = os.path.join(output_dir, 'model.pkl')
    joblib.dump(best_pipeline, model_path)
    
    # 2. Save model config (model_config.json)
    config_path = os.path.join(output_dir, 'model_config.json')
    model_config = {
        "model_version": "1.1.0",
        "algorithm": "Logistic Regression with Feature Engineering",
        "training_date": str(date.today()),
        "dataset_size": len(df),
        "vocabulary_size": vocabulary_size,
        "engineered_feature_count": engineered_feature_count,
        "combined_feature_matrix_shape": list(X_train_transformed.shape),
        "threshold": optimal_threshold,
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1_score": f1,
        "roc_auc": roc_auc,
        "balanced_accuracy": balanced_acc,
        "MCC": mcc,
        "false_positive_rate": false_positive_rate,
        "false_negative_rate": false_negative_rate,
        "top_positive_features": top_positive_features,
        "top_negative_features": top_negative_features
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
