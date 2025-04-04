import { NextResponse } from 'next/server';
import { processAllPDFsInFolder } from '@/utils/local-pdf-reader';
import { join } from 'path';

export async function POST(req: Request) {
  try {
    // Path to the PDFs folder
    const pdfsFolder = join(process.cwd(), 'pdfs');
    
    // Process all PDFs in the folder
    const results = await processAllPDFsInFolder(pdfsFolder);
    
    // Check if any PDFs were processed successfully
    const successfulResults = results.filter(r => r.success);
    
    if (successfulResults.length === 0) {
      return NextResponse.json(
        {
          error: 'No PDFs were processed successfully',
          success: false,
          details: results
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: `Successfully processed ${successfulResults.length} PDFs`,
      success: true,
      results: results
    });
  } catch (error: any) {
    console.error('Error in process-local-pdfs route:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to process local PDFs',
        success: false
      },
      { status: 500 }
    );
  }
}
