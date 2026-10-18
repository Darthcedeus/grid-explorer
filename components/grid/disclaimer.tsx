'use client';
import {useEffect,useState} from 'react';
import {Info} from 'lucide-react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
export function Disclaimer(){
 const [open,setOpen]=useState(false);
 useEffect(()=>{setOpen(true);},[]);
 return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="disclaimer-dialog"><DialogHeader><div className="disclaimer-icon"><Info size={24}/></div><DialogTitle>Before you explore</DialogTitle><DialogDescription asChild><div className="disclaimer-copy"><p>Netherlands Grid Explorer is an experimental, AI-assisted (“vibe-coded”) application, created solely for educational and awareness purposes.</p><p><strong>The data sources, processing methods and displayed results have not been independently audited by human analysts.</strong> Information may be incomplete, outdated or inaccurate.</p><p>Use this tool to explore and learn. Treat its figures and visualisations as indicative, and verify information independently before relying on it for decisions.</p></div></DialogDescription></DialogHeader><DialogFooter><Button className="disclaimer-accept" onClick={()=>setOpen(false)}>I understand — explore the grid</Button></DialogFooter></DialogContent></Dialog>;
}
