import { NextResponse } from 'next/server';
import { processPDF } from '@/utils/pdf-utils';

export async function POST(req: Request) {
  try {
    const data = await req.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file received.' },
        { status: 400 }
      );
    }

    if (!file.type.includes('pdf')) {
      return NextResponse.json(
        { error: 'Please upload a PDF file.' },
        { status: 400 }
      );
    }

    const result = await processPDF(file);

    if (!result.success) {
      return NextResponse.json(
        { 
          error: result.error || 'Failed to process PDF',
          success: false
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `PDF processed successfully. Created ${result.chunks} chunks.`,
      success: true,
      chunks: result.chunks
    });
  } catch (error: any) {
    console.error('Error in upload route:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to process PDF',
        success: false
      },
      { status: 500 }
    );
  }
}
