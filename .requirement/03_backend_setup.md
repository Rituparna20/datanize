POST /upload_excel – Upload and preview file
POST /handle_missing – Impute missing values
POST /encode – Label encode columns
POST /visualize – Generate charts
POST /feature_select – Apply feature selection
POST /train_test_split – Split and export CSVs
POST /image_label – Auto-generate YAML labels

Setup Steps
Create main.py with FastAPI instance and include routers
Build routers in /routers for each functionality
Place processing logic in /utils
Run: uvicorn main:app --reload


File structure
backend/
├── main.py
├── routers/
│   ├── upload_router.py
│   └── preprocess_router.py
├── utils/
│   ├── excel_handler.py
│   └── image_labeler.py
└── requirements.txt