import React, { useState } from "react";
import { FactCheck } from "@/lib/types";
import { Shield, ShieldAlert, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

interface FactCheckOverlayProps {
  factCheck: FactCheck;
}

export default function FactCheckOverlay({ factCheck }: FactCheckOverlayProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="my-8 rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      <div 
        className={cn(
          "p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors",
          expanded && "border-b border-border bg-muted/10"
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-background border border-border shadow-sm">
            <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
              Automated claim review
              <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                Unverified
              </span>
              <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-bold bg-secondary text-secondary-foreground border border-border">
                {factCheck.biasRating}
              </span>
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-1 sm:line-clamp-none">
              {factCheck.summary}
            </p>
          </div>
        </div>
        <div className="text-muted-foreground p-2 rounded-full hover:bg-muted transition-colors">
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </div>
      
      {expanded && (
        <div className="p-4 sm:p-6 bg-muted/5 animate-in fade-in slide-in-from-top-4 duration-300">
          <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4" /> 
            Claims assessed by AI
          </h4>
          <div className="grid gap-4 sm:grid-cols-2">
            {factCheck.claims.map((claim, idx) => (
              <div key={idx} className="bg-background rounded-lg p-4 border border-border/50 shadow-sm relative group hover:border-primary/30 transition-colors">
                <p className="font-medium text-foreground mb-2 text-sm leading-relaxed">"{claim.claim}"</p>
                
                <div className="flex items-center justify-between mt-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
                    {claim.assessment}
                  </span>
                  
                  {claim.sourceUrl && (
                    <a 
                      href={claim.sourceUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-xs text-primary font-medium flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
                    >
                      Source <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-border flex justify-between items-center">
             <p className="text-xs text-muted-foreground italic flex items-center gap-1">
                AI-assisted analysis only. Our editors have not independently verified these assessments.
             </p>
          </div>
        </div>
      )}
    </div>
  );
}
