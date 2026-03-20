import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isSupabaseConfigured = supabaseUrl && !supabaseUrl.includes('your-project-id');

if (!isSupabaseConfigured) {
    console.warn('Supabase placeholders detected. Using Local Mode fallback.');
}

export const supabase = isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseAnonKey)
    : {
        auth: {
            getUser: () => Promise.resolve({ data: { user: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
            signInWithPassword: () => Promise.reject(new Error('Supabase not configured')),
            signUp: () => Promise.reject(new Error('Supabase not configured')),
            resetPasswordForEmail: () => Promise.reject(new Error('Supabase not configured'))
        },
        from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }) }) }) })
    };
