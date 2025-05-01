import pandas as pd
import numpy as np
from sklearn.decomposition import PCA
from sklearn.cross_decomposition import PLSRegression
from sklearn.preprocessing import StandardScaler, LabelEncoder
from scipy.stats import pearsonr, chi2_contingency
from services.preprocessing import read_data_file
import os
from sklearn.feature_selection import RFE
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer

def save_processed_data(df, file_path):
    """Save the processed data to encoded_data.csv"""
    output_dir = os.path.dirname(file_path)
    output_path = os.path.join(output_dir, "encoded_data.csv")
    df.to_csv(output_path, index=False)
    return output_path

from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
import numpy as np
import pandas as pd
import os

def pca_selection(file_path):
    """
    Perform PCA-based feature selection and return component loadings + simple importance for categorical features.
    """
    # Step 1: Load data
    df = read_data_file(file_path)  # <-- make sure this handles CSV/XLS/XLSX robustly

    if df is None or df.empty:
        raise ValueError("Data file is empty or could not be loaded.")

    # Step 2: Identify numeric and categorical columns
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()

    # Sanity check: dataset must have at least 2 columns
    if df.shape[1] < 2:
        raise ValueError("Dataset must contain at least one feature and one target column.")

    # Step 3: Define features and target (assumes last column is the target)
    target_col = df.columns[-1]
    feature_scores = {}

    if numeric_cols:
        # Drop target from numeric features if present
        numeric_features = [col for col in numeric_cols if col != target_col]

        # Step 4: Standardize numeric features
        scaler = StandardScaler()
        X_numeric_scaled = scaler.fit_transform(df[numeric_features])

        # Step 5: Run PCA
        pca = PCA()
        pca.fit(X_numeric_scaled)

        # Step 6: Get feature importance (from first principal component)
        for i, feature in enumerate(numeric_features):
            score = np.abs(pca.components_[0, i])
            feature_scores[feature] = float(score)
    else:
        explained_variance = 0.0  # fallback if no numeric features

    # Step 7: Score categorical features (simple heuristic: uniqueness ratio)
    for feature in categorical_cols:
        if feature != target_col:
            unique_ratio = len(df[feature].unique()) / len(df)
            feature_scores[feature] = float(unique_ratio)

    # Step 8: Save the processed data (even if unchanged)
    output_path = save_processed_data(df, file_path)

    # Step 9: Return results
    return {
        "method": "pca",
        "feature_scores": feature_scores,
        "explained_variance": float(pca.explained_variance_ratio_[0]) if numeric_cols else 0.0,
        "output_path": output_path
    }


def pls_selection(file_path):
    """Perform RFE-based feature selection and return feature importance"""
    df = read_data_file(file_path)

    if df is None or df.empty:
        raise ValueError("Data file is empty or could not be loaded.")

    # Sanity check: dataset must have at least 2 columns
    if df.shape[1] < 2:
        raise ValueError("Dataset must contain at least one feature and one target column.")

    # Separate numeric and categorical features
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()

    target_col = df.columns[-1]
    feature_scores = {}
    r2_score = 0.0

    # Prepare features
    if numeric_cols:
        numeric_features = [col for col in numeric_cols if col != target_col]
        X_numeric = df[numeric_features]
        y = df[target_col]

        # Standardize numeric features
        scaler = StandardScaler()
        X_numeric_scaled = scaler.fit_transform(X_numeric)

        # Perform RFE on numeric features
        estimator = LinearRegression()
        rfe = RFE(estimator, n_features_to_select=1)
        rfe.fit(X_numeric_scaled, y)

        # Get feature importance scores for numeric features
        for i, feature in enumerate(numeric_features):
            score = rfe.ranking_[i]
            # Convert ranking to importance score (lower rank = higher importance)
            feature_scores[feature] = float(1 / score)
        
        # Calculate R² score using the fitted estimator
        r2_score = float(rfe.score(X_numeric_scaled, y))

    # For categorical features, use chi-square test (keeping the same approach)
    for feature in categorical_cols:
        if feature != target_col:
            contingency = pd.crosstab(df[feature], df[target_col])
            chi2, _, _, _ = chi2_contingency(contingency)
            importance = chi2 / (contingency.shape[0] * contingency.shape[1])
            feature_scores[feature] = float(importance)

    # Save the processed data
    output_path = save_processed_data(df, file_path)

    return {
        "method": "rfe",
        "feature_scores": feature_scores,
        "r2_score": r2_score,
        "output_path": output_path
    }

def correlation_selection(file_path):
    """Perform correlation-based feature selection"""
    df = read_data_file(file_path)

    if df is None or df.empty:
        raise ValueError("Data file is empty or could not be loaded.")

    # Sanity check: dataset must have at least 2 columns
    if df.shape[1] < 2:
        raise ValueError("Dataset must contain at least one feature and one target column.")

    # Separate numeric and categorical features
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(exclude=[np.number]).columns.tolist()

    target_col = df.columns[-1]
    feature_scores = {}

    if numeric_cols:
        numeric_features = [col for col in numeric_cols if col != target_col]
        y = df[target_col]
        for feature in numeric_features:
            correlation, _ = pearsonr(df[feature], y)
            feature_scores[feature] = float(np.abs(correlation))

    # For categorical features, use chi-square test
    for feature in categorical_cols:
        if feature != target_col:
            contingency = pd.crosstab(df[feature], df[target_col])
            chi2, _, _, _ = chi2_contingency(contingency)
            importance = chi2 / (contingency.shape[0] * contingency.shape[1])
            feature_scores[feature] = float(importance)

    # Save the processed data
    output_path = save_processed_data(df, file_path)

    return {
        "method": "correlation",
        "feature_scores": feature_scores,
        "output_path": output_path
    }