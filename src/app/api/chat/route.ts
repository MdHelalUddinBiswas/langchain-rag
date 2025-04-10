import { NextResponse } from 'next/server';
import { queryPDF } from '@/utils/pdf-utils';

export async function POST(req: Request) {
  try {
    const { question } = await req.json();
    
    const result = await queryPDF(question);

    return NextResponse.json({
      answer: result.answer,
      success: result.success
    });
  } catch (error: any) {
    console.error('Error in chat route:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to process your question',
        success: false
      },
      { status: 500 }
    );
  }
}