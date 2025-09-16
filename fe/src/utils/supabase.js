// src/utils/supabase.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Missing Supabase env. Check fe/.env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)"
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);
export default supabase;
