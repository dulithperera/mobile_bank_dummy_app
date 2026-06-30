import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const status = {
    ok: true,
    devMode: process.env.DEV_MODE_NO_SMS === 'true',
    supabase: {
      configured: !!supabase,
      connected: false,
      error: null
    }
  };

  if (supabase) {
    try {
      // Query the app_mode table to check connection and schema availability
      const { error } = await supabase
        .from('app_mode')
        .select('value')
        .eq('key', 'mode')
        .single();
      
      if (error) {
        throw error;
      }
      status.supabase.connected = true;
    } catch (err) {
      status.supabase.error = err.message;
    }
  }

  return NextResponse.json(status);
}