import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder, OneHotEncoder
from sklearn.model_selection import train_test_split
import os
import json
import logging
import requests
import tempfile
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# state.py
global_file_path = None

def set_file_path(path: str):
    global global_file_path
    global_file_path = path

def get_file_path():
    return global_file_path

def download_from_supabase(url: str) -> str:
    """Download a file from Supabase Storage and return the local path."""
    try:
        # Get the file extension from the URL
        file_ext = os.path.splitext(urlparse(url).path)[1]
        if not file_ext:
            file_ext = '.csv'  # Default to .csv if no extension found
            
        # Create a temporary file with the correct extension
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp:
            # Download the file
            response = requests.get(url)
            response.raise_for_status()
            
            # Write the content to the temporary file
            tmp.write(response.content)
            return tmp.name
    except Exception as e:
        logger.error(f"Error downloading file from Supabase: {str(e)}")
        raise

def read_data_file(file_path: str) -> pd.DataFrame:
    """Read a data file and return a pandas DataFrame."""
    try:
        # Check if the file path is a URL
        parsed_url = urlparse(file_path)
        if parsed_url.scheme in ['http', 'https']:
            # Download the file from Supabase
            local_path = download_from_supabase(file_path)
            try:
                # Determine file type and read accordingly
                if local_path.endswith(('.xlsx', '.xls')):
                    df = pd.read_excel(local_path)
                else:
                    df = pd.read_csv(local_path)
            except Exception as e:
                logger.error(f"Error reading downloaded file {local_path}: {str(e)}")
                raise
            finally:
                # Clean up the temporary file
                try:
                    os.unlink(local_path)
                except Exception as e:
                    logger.warning(f"Failed to clean up temporary file {local_path}: {str(e)}")
            return df
        else:
            # Handle local file
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
                
            if file_path.endswith(('.xlsx', '.xls')):
                return pd.read_excel(file_path)
            else:
                return pd.read_csv(file_path)
    except Exception as e:
        logger.error(f"Error reading file {file_path}: {str(e)}")
        raise

def handle_missing_values(file_path: str, strategies: dict) -> dict:
    """Handle missing values in the dataset using specified strategies."""
    try:
        df = read_data_file(file_path)
        original_rows = len(df)
        
        for column, strategy in strategies.items():
            if column not in df.columns:
                continue
            if strategy == "Drop rows":
                before_drop = len(df)
                df = df.dropna(subset=[column])
                after_drop = len(df)
                logger.info(f"[DROP] Column: {column}, Rows before: {before_drop}, Rows after: {after_drop}, Dropped: {before_drop - after_drop}")
            else:
                if pd.api.types.is_numeric_dtype(df[column]):
                    if strategy == "Replace with mean":
                        df[column] = df[column].fillna(df[column].mean())
                    elif strategy == "Replace with median":
                        df[column] = df[column].fillna(df[column].median())
                    elif strategy == "Replace with mode":
                        df[column] = df[column].fillna(df[column].mode()[0])
                    elif strategy == "Replace with zero":
                        df[column] = df[column].fillna(0)
                else:
                     raise ValueError(f"Unknown strategy: {strategy}")
        
        # Save the processed file
        output_path = os.path.join(os.path.dirname(file_path), "processed_data.csv")
        df.to_csv(output_path, index=False)
        
        return {
            "message": "Missing values handled successfully",
            "output_path": output_path,
            "original_rows": original_rows,
            "remaining_rows": len(df)
        }
    except Exception as e:
        logger.error(f"Error handling missing values: {str(e)}")
        raise

def get_categorical_fields(file_path: str) -> list:
    """Get only object dtype fields and their unique values from the dataset for encoding."""
    try:
        # Read the file
        df = read_data_file(file_path)
        categorical_fields = []
        
        # Only include columns with dtype 'object' (true string/categorical fields)
        object_cols = df.select_dtypes(include=['object']).columns
        for col in object_cols:
            unique_values = df[col].dropna().unique().tolist()
            unique_values = [str(val) for val in unique_values]
            categorical_fields.append({
                "variable": col,
                "uniqueValues": unique_values,
                "encoding": "Label Encoding"  # Default encoding method
            })
        
        logger.info(f"Found {len(categorical_fields)} object dtype categorical fields in {file_path}")
        for field in categorical_fields:
            logger.info(f"Field: {field['variable']}, Unique values: {len(field['uniqueValues'])}")
        
        # Clean up temporary file if it's not in the uploads directory
        if file_path.startswith('/tmp') or file_path.startswith(tempfile.gettempdir()):
            try:
                os.unlink(file_path)
                logger.info(f"Cleaned up temporary file: {file_path}")
            except Exception as e:
                logger.warning(f"Failed to clean up temporary file {file_path}: {str(e)}")
        
        return categorical_fields
    except Exception as e:
        logger.error(f"Error getting object dtype categorical fields from {file_path}: {str(e)}")
        raise

def encode_categorical_variables(file_path: str, encoding_config: dict) -> dict:
    """Encode categorical variables using specified encoding methods."""
    try:
        # Read the file
        df = read_data_file(file_path)
        encoders = {}
        encoded_data = df.copy()
        logger.info(f"Encoding categorical variables: {encoding_config}")
        logger.info(f"df: {df.head(5)}")
        
        for variable, encoding_method in encoding_config.items():
            if variable not in df.columns:
                continue
                
            if encoding_method == "Label Encoding":
                # Label encoding
                le = LabelEncoder()
                encoded_data[variable] = le.fit_transform(df[variable].astype(str))
                encoders[variable] = {
                    "type": "Label Encoding",
                    "mapping": dict(zip(le.classes_, range(len(le.classes_))))
                }
            elif encoding_method == "One-Hot Encoding":
                # One-hot encoding
                ohe = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
                encoded_cols = pd.DataFrame(
                    ohe.fit_transform(df[[variable]]),
                    columns=[f"{variable}_{val}" for val in ohe.categories_[0]]
                )
                
                # Drop original column and add encoded columns
                encoded_data = pd.concat([encoded_data.drop(columns=[variable]), encoded_cols], axis=1)
                
                encoders[variable] = {
                    "type": "One-Hot Encoding",
                    "categories": ohe.categories_[0].tolist()
                }
        
        # Save the encoded data to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as tmp:
            encoded_data.to_csv(tmp.name, index=False)
            output_path = tmp.name
        
        # Save the encoders to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.json') as tmp:
            with open(tmp.name, 'w') as f:
                json.dump(encoders, f)
            encoder_path = tmp.name
        
        return {
            "message": "Encoding completed successfully",
            "encoded_file_path": output_path,
            "encoder_file_path": encoder_path,
            "encoders": encoders,
            "columns": encoded_data.columns.tolist()
        }
    except Exception as e:
        logger.error(f"Error encoding categorical variables: {str(e)}")
        raise

def split_data(file_path: str, test_size: float = 0.2, random_state: int = 42, target_column: str = None) -> dict:
    """Split the data into X_train, X_test, y_train, y_test and save them as separate files."""
    try:
        df = read_data_file(file_path)
        logger.info(f"Original dataset shape: {df.shape}")

        if target_column is None or target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' not found in dataset")

        logger.info(f"Using target column: {target_column}")

        if not pd.api.types.is_numeric_dtype(df[target_column]):
            logger.warning(f"Target column {target_column} is not numeric. Consider encoding it first.")

        X = df.drop(columns=[target_column])
        y = df[target_column]

        logger.info(f"Features shape: {X.shape}, Target shape: {y.shape}")

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state
        )

        logger.info(f"Train set shape: X={X_train.shape}, y={y_train.shape}")
        logger.info(f"Test set shape: X={X_test.shape}, y={y_test.shape}")

        base_dir = os.path.dirname(file_path)
        X_train_path = os.path.join(base_dir, "X_train.csv")
        X_test_path = os.path.join(base_dir, "X_test.csv")
        y_train_path = os.path.join(base_dir, "y_train.csv")
        y_test_path = os.path.join(base_dir, "y_test.csv")

        # Save the files
        X_train.to_csv(X_train_path, index=False)
        X_test.to_csv(X_test_path, index=False)
        y_train.to_frame().to_csv(y_train_path, index=False)
        y_test.to_frame().to_csv(y_test_path, index=False)

        # Verify files exist
        for path in [X_train_path, X_test_path, y_train_path, y_test_path]:
            if not os.path.exists(path):
                raise ValueError(f"Failed to create file: {path}")

        # Optional: verify shapes match
        if pd.read_csv(X_train_path).shape != X_train.shape:
            raise ValueError("Mismatch in X_train dimensions after saving")
        if pd.read_csv(X_test_path).shape != X_test.shape:
            raise ValueError("Mismatch in X_test dimensions after saving")
        if pd.read_csv(y_train_path).shape[0] != y_train.shape[0]:
            raise ValueError("Mismatch in y_train size after saving")
        if pd.read_csv(y_test_path).shape[0] != y_test.shape[0]:
            raise ValueError("Mismatch in y_test size after saving")

        logger.info("All files saved and verified successfully.")

        return {
            "message": "Data split into X_train, X_test, y_train, y_test successfully",
            "files": {
                "X_train": X_train_path,
                "X_test": X_test_path,
                "y_train": y_train_path,
                "y_test": y_test_path
            },
            "sizes": {
                "X_train": len(X_train),
                "X_test": len(X_test),
                "y_train": len(y_train),
                "y_test": len(y_test)
            }
        }

    except Exception as e:
        logger.error(f"Error splitting data: {str(e)}")
        raise
