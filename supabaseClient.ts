import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || ''; // Puede ser la llave anon o la service_role

// Cliente Oficial de Supabase para funciones extra (Storage, Edge Functions, etc.)
export const supabase = createClient(supabaseUrl, supabaseKey);