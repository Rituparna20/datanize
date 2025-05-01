1.Create app: npx create-react-app preprocess-frontend
2.Add Supabase: npm install @supabase/supabase-js
3.Create supabaseClient.js:
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(YOUR_URL, YOUR_KEY);
export default supabase;
4.Build components one-by-one
5.Test connections using useEffect and console logs

Folder structure
src/
├── components/
│   ├── UploadExcel.js
│   ├── MissingValueHandler.js
│   ├── ChartVisualizer.js
├── App.js
└── supabaseClient.js

