"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
require("dotenv/config");
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || ''; // Puede ser la llave anon o la service_role
// Cliente Oficial de Supabase para funciones extra (Storage, Edge Functions, etc.)
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
