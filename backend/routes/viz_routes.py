from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from models.schemas import VisualizationRequest, ExportToPPTRequest
from services.visualization import generate_chart_data, export_to_ppt
from services.preprocessing import download_from_supabase
import os
import logging
from urllib.parse import urlparse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/visualize")

@router.post("/")
async def create_visualization(req: VisualizationRequest):
    """Generate chart data from the input file and selected columns."""
    try:
        logger.info(f"Generating {req.chart_type} chart for file: {req.file_path}")
        
        # Check if the file path is a URL
        parsed_url = urlparse(req.file_path)
        if parsed_url.scheme in ['http', 'https']:
            # Download the file from Supabase
            local_path = download_from_supabase(req.file_path)
            try:
                # Generate chart data
                chart_data = generate_chart_data(
                    file_path=local_path,
                    x_col=req.x_col,
                    y_col=req.y_col,
                    chart_type=req.chart_type
                )
                return {
                    "chart_data": chart_data,
                    "message": "Chart data generated successfully"
                }
            finally:
                # Clean up the temporary file
                try:
                    os.unlink(local_path)
                except Exception as e:
                    logger.warning(f"Failed to clean up temporary file {local_path}: {str(e)}")
        else:
            # Handle local file
            if not os.path.exists(req.file_path):
                raise HTTPException(status_code=404, detail=f"File not found: {req.file_path}")

            # Generate chart data
            chart_data = generate_chart_data(
                file_path=req.file_path,
                x_col=req.x_col,
                y_col=req.y_col,
                chart_type=req.chart_type
            )

            return {
                "chart_data": chart_data,
                "message": "Chart data generated successfully"
            }

    except ValueError as e:
        logger.error(f"Validation error in chart generation: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in chart generation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export-ppt")
async def export_chart_to_ppt(request: ExportToPPTRequest):
    """Export chart data to a PowerPoint presentation."""
    try:
        # Validate request data
        if not request.chart_data:
            raise HTTPException(
                status_code=400,
                detail="Chart data is required"
            )
            
        if not request.chart_type:
            raise HTTPException(
                status_code=400,
                detail="Chart type is required"
            )
            
        if not request.x_column or not request.y_column:
            raise HTTPException(
                status_code=400,
                detail="Both x_column and y_column are required"
            )
            
        # Validate chart type
        valid_chart_types = ["bar", "line", "scatter", "pie"]
        if request.chart_type not in valid_chart_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid chart type. Must be one of: {', '.join(valid_chart_types)}"
            )
            
        logger.info(f"Exporting chart to PPT: {request.chart_type} chart with {len(request.chart_data)} data points")
        
        # Generate the PPT file
        output_path = export_to_ppt(
            chart_data=request.chart_data,
            chart_type=request.chart_type,
            x_column=request.x_column,
            y_column=request.y_column
        )
        
        # Verify the file was created
        if not os.path.exists(output_path):
            raise HTTPException(
                status_code=500,
                detail="PPT file was not created successfully"
            )
            
        logger.info(f"Successfully created PPT file at: {output_path}")
        
        # Return the file directly
        return FileResponse(
            path=output_path,
            filename="chart_presentation.pptx",
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation"
        )
        
    except Exception as e:
        logger.error(f"Error in PPT export: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))