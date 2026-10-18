'use client';
import {ThemeProvider as Provider,useTheme} from 'next-themes';
import {useEffect,useState,type ReactNode} from 'react';
import {Moon,Sun} from 'lucide-react';
import {Switch} from '@/components/ui/switch';
export function ThemeProvider({children}:{children:ReactNode}){return <Provider attribute="class" defaultTheme="light" enableSystem={false} storageKey="grid-explorer-theme" disableTransitionOnChange>{children}</Provider>;}
export function ThemeToggle(){const {resolvedTheme,setTheme}=useTheme();const [mounted,setMounted]=useState(false);useEffect(()=>setMounted(true),[]);const dark=mounted&&resolvedTheme==='dark';return <label className="theme-toggle"><Sun size={15} aria-hidden="true"/><Switch aria-label="Dark mode" checked={dark} disabled={!mounted} onCheckedChange={checked=>setTheme(checked?'dark':'light')}/><Moon size={15} aria-hidden="true"/><span className="sr-only">Dark mode</span></label>;}
