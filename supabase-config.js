console.log("CONFIGURACIÓN DE SUPABASE CARGADA");
const SUPABASE_URL = "https://dcheaakcurfifnwzklga.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_wPoUywVqO26qJTAr0Or44A_efWYiLiO";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);