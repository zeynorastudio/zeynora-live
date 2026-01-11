"use client";

import React, { useState } from "react";
import { X, Send, Paperclip, User, ShoppingBag, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Drawer, DrawerContent, DrawerClose } from "@/components/ui/Drawer";
import { Badge } from "@/components/ui/Badge";
import { Separator } from "@/components/ui/Separator";
import { AdminButton } from "@/components/admin/AdminButton";
import { Query } from "./QueriesList";
import { QueryThreadItem, QueryMessage } from "./QueryThreadItem";
import { useToastWithCompat } from "@/components/ui/use-toast";
import { Select } from "@/components/ui/Select"; // Verify if Select is usable this way or needs Radix primitives
// Note: ui/Select.tsx usually wraps native select or Radix. I'll use native select for simplicity and robustness as per rules.

interface QueryDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  query: Query | null;
  currentUserId?: string;
}

export function QueryDetailDrawer({ isOpen, onClose, query, currentUserId }: QueryDetailDrawerProps) {
  const { addToast } = useToastWithCompat();
  const [replyText, setReplyText] = useState("");
  const [internalNote, setInternalNote] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock messages since we don't have a fetcher yet
  // In a real implementation, we would fetch these when the drawer opens or pass them in
  const mockMessages: QueryMessage[] = query ? [
    {
      id: "msg_1",
      sender_type: "customer",
      sender_name: query.customer_name,
      message: "I received my order but the size seems smaller than expected. Can I exchange it?",
      created_at: query.created_at,
    },
    {
      id: "msg_2",
      sender_type: "agent",
      sender_name: "Support Team",
      message: "Hello! I'm sorry to hear that. Could you please confirm if the tags are still attached?",
      created_at: new Date(new Date(query.created_at).getTime() + 3600000).toISOString(),
    }
  ] : [];

  if (!query) return null;

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      // TODO: Call POST /api/admin/queries/[id]/reply
      console.log(`Sending reply to query ${query.id}: ${replyText} (Internal: ${internalNote})`);
      addToast("Reply sent successfully (Mock)", "success");
      
      setReplyText("");
      setInternalNote(false);
      setIsSubmitting(false);
    }, 1000);
  };

  const handleStatusChange = (newStatus: string) => {
    // TODO: Call PUT /api/admin/queries/[id]/status
    addToast(`TODO: Update status to ${newStatus}`, "info");
  };

  const handleAssign = (userId: string) => {
    // TODO: Call POST /api/admin/queries/[id]/assign
    addToast(`TODO: Assign query to user ${userId}`, "info");
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} direction="right">
      <DrawerContent className="h-full w-full sm:max-w-3xl ml-auto rounded-none border-l border-silver-light bg-white flex flex-col p-0">
        
        {/* Header */}
        <div className="bg-white border-b border-silver-light px-6 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="serif-display text-xl text-night truncate max-w-md" title={query.subject}>
                {query.subject}
              </h2>
              <Badge variant={query.status === 'resolved' ? 'success' : 'secondary'} className="capitalize">
                {query.status}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-xs text-silver-dark">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(query.created_at).toLocaleString()}</span>
              <span className="font-mono">ID: {query.id}</span>
            </div>
          </div>
          <DrawerClose asChild>
            <button className="p-2 hover:bg-offwhite rounded-full transition-colors">
              <X className="w-5 h-5 text-silver-darker" />
            </button>
          </DrawerClose>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
          
          {/* Left: Thread */}
          <div className="flex-1 p-6 bg-white min-h-[400px]">
            <div className="space-y-6 mb-8">
              {mockMessages.map((msg) => (
                <QueryThreadItem key={msg.id} message={msg} />
              ))}
            </div>

            {/* Reply Composer */}
            <div className="bg-offwhite/30 rounded-lg border border-silver-light p-4 mt-auto sticky bottom-0">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-silver-dark uppercase tracking-wide">Reply</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="rounded border-silver-light text-gold focus:ring-gold/50"
                    checked={internalNote}
                    onChange={(e) => setInternalNote(e.target.checked)}
                  />
                  <span className="text-xs text-silver-darker select-none">Internal Note</span>
                </label>
              </div>
              <textarea
                className={`w-full p-3 rounded-md border text-sm focus:outline-none focus:ring-1 focus:ring-gold/50 min-h-[100px] resize-y ${internalNote ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-silver-light'}`}
                placeholder={internalNote ? "Add an internal note visible only to staff..." : "Type your reply here..."}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <div className="flex justify-between items-center mt-3">
                <button className="text-silver-dark hover:text-night transition-colors" title="Attach File (TODO)">
                  <Paperclip className="w-4 h-4" />
                </button>
                <div className="flex gap-2">
                   {query.status !== 'resolved' && (
                     <AdminButton 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleStatusChange('resolved')}
                        className="text-xs"
                      >
                        Resolve & Close
                      </AdminButton>
                   )}
                   <AdminButton 
                      onClick={handleSendReply} 
                      disabled={!replyText.trim() || isSubmitting}
                      isLoading={isSubmitting}
                      icon={Send}
                      size="sm"
                    >
                      {internalNote ? "Add Note" : "Send Reply"}
                    </AdminButton>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Sidebar Info */}
          <div className="w-full md:w-80 bg-offwhite/30 border-l border-silver-light p-6 space-y-8 flex-shrink-0">
            
            {/* Customer Info */}
            <section>
              <h3 className="flex items-center gap-2 text-sm font-bold text-night uppercase tracking-wide mb-3">
                <User className="w-4 h-4" /> Customer
              </h3>
              <div className="space-y-2 text-sm">
                <div className="font-medium text-night">{query.customer_name}</div>
                <div className="text-silver-darker break-all">{query.customer_email}</div>
                {/* Placeholder for phone/profile link */}
                <div className="text-xs text-silver-dark mt-2 pt-2 border-t border-silver-light/50">
                  <a href="#" className="text-gold hover:underline">View Profile &rarr;</a>
                </div>
              </div>
            </section>

            <Separator />

            {/* Order Context */}
            <section>
              <h3 className="flex items-center gap-2 text-sm font-bold text-night uppercase tracking-wide mb-3">
                <ShoppingBag className="w-4 h-4" /> Order Context
              </h3>
              {query.order_id ? (
                <div className="bg-white p-3 rounded border border-silver-light space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-medium text-night">#{query.order_id.substring(0,8)}</span>
                    <Badge variant="outline" className="text-[10px] h-5 px-1.5">Paid</Badge>
                  </div>
                  <div className="text-xs text-silver-dark">
                    Placed on {new Date(query.created_at).toLocaleDateString()}
                  </div>
                  <div className="pt-2 border-t border-silver-light/50 flex justify-between items-center">
                    <span className="text-xs font-medium">Total</span>
                    <span className="text-sm font-bold">₹2,499.00</span>
                  </div>
                  <a href={`/admin/orders?id=${query.order_id}`} className="block text-center text-xs text-gold hover:underline mt-2">
                    View Order Details
                  </a>
                </div>
              ) : (
                <p className="text-xs text-silver-light italic">No order linked to this query.</p>
              )}
            </section>

            <Separator />

            {/* Actions */}
            <section>
              <h3 className="text-sm font-bold text-night uppercase tracking-wide mb-3">
                Ticket Actions
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-silver-dark mb-1">Status</label>
                  <select 
                    className="w-full h-9 px-3 rounded border border-silver-light text-sm bg-white"
                    value={query.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                  >
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-silver-dark mb-1">Assigned Agent</label>
                  <select 
                    className="w-full h-9 px-3 rounded border border-silver-light text-sm bg-white"
                    value={query.assigned_to || ""}
                    onChange={(e) => handleAssign(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    <option value={currentUserId || "me"}>Me</option>
                    {/* Placeholder agents */}
                    <option value="agent_1">Support Team</option>
                  </select>
                </div>
              </div>
            </section>

             {/* Missing Endpoint Notice */}
             <div className="mt-8 p-3 bg-blue-50 border border-blue-100 rounded text-[10px] text-blue-800">
               <div className="flex items-center gap-1 font-bold mb-1">
                 <AlertCircle className="w-3 h-3" />
                 Dev Note
               </div>
               Server endpoints for replies and assignment are not yet implemented. UI is in "Mock Mode".
             </div>

          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}


