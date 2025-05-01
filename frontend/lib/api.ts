// API base URL - adjust this to match your backend URL
const API_BASE_URL = "http://localhost:8000"

// Generic fetch function with error handling
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error("API request failed:", error)
    throw error
  }
}

// File upload
export async function uploadFile(file: File) {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetchAPI("/upload/file", {
    method: "POST",
    body: formData,
  })

  // Validate the response
  if (!response || !response.file_path) {
    throw new Error("Invalid response from server: missing file path")
  }

  // Get the columns from the uploaded file
  const columnsResponse = await fetchAPI(`/columns?file_path=${encodeURIComponent(response.file_path)}`)
  
  if (!columnsResponse || !Array.isArray(columnsResponse.columns)) {
    throw new Error("Failed to get columns from uploaded file")
  }

  return {
    file_path: response.file_path,
    columns: columnsResponse.columns
  }
}

// Preprocessing functions
export async function handleMissingValues(filePath: string, method: string) {
  return fetchAPI("/preprocess/missing", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file_path: filePath, method }),
  })
}

export async function encodeLabels(filePath: string, fields: Record<string, string>) {
  if (!filePath) {
    throw new Error("File path is required")
  }

  const formData = new FormData();
  formData.append("file_path", filePath);
  formData.append("fields", JSON.stringify(fields));
  
  return fetchAPI("/preprocess/encode-labels", {
    method: "POST",
    body: formData
  });
}

export async function splitData(filePath: string, testSize: number, randomState: number, targetColumn: string) {
  if (!filePath) {
    throw new Error("File path is required")
  }
  
  return fetchAPI("/preprocess/split", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file_path: filePath,
      test_size: testSize,
      random_state: randomState,
      target_column: targetColumn
    }),
  })
}

// Feature selection
export async function selectFeatures(filePath: string, method: string) {
  console.log("Calling feature selection with method:", method)
  try {
    const response = await fetchAPI("/feature/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        method: method,
        file_path: filePath
      }),
    })
    console.log("Feature selection response:", response)
    return response
  } catch (error) {
    console.error("Feature selection error:", error)
    throw error
  }
}

// Visualization
export async function generateChart(filePath: string, xCol: string, yCol: string, chartType: string) {
  return fetchAPI("/visualize/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      file_path: filePath,
      x_col: xCol,
      y_col: yCol,
      chart_type: chartType,
    }),
  })
}

// Image labeling
export async function labelImages() {
  return fetchAPI("/image/label", {
    method: "GET",
  })
}
