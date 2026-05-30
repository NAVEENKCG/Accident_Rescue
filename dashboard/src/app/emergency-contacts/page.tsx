"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Plus, Pencil, Trash2, X, Save, ShieldCheck } from "lucide-react";
import { useTelemetry } from "@/context/TelemetryContext";
import { Contact } from "@/lib/simulatedData";
import { staggerContainer, fadeInUp, SPRING_SMOOTH } from "@/lib/animations";
import { cn } from "@/lib/cn";

const PRIORITIES: Contact["priority"][] = ["Primary", "Secondary", "Tertiary"];

const priorityColors: Record<Contact["priority"], string> = {
  Primary:   "bg-[var(--accent)]/15 border-[var(--accent)]/30 text-[var(--accent)]",
  Secondary: "bg-[var(--warning)]/15 border-[var(--warning)]/30 text-[var(--warning)]",
  Tertiary:  "bg-white/[0.06] border-white/[0.12] text-white/50",
};

// ── Contact Card ──────────────────────────────────────────────────────────────
function ContactCard({
  contact,
  onEdit,
  onDelete,
}: {
  contact: Contact;
  onEdit: (c: Contact) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.article
      variants={fadeInUp}
      layout
      whileHover={{ y: -6, transition: SPRING_SMOOTH }}
      whileTap={{ scale: 0.97 }}
      className="glass-card p-5 flex items-center gap-4"
    >
      {/* Avatar */}
      <div className="w-11 h-11 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/25 flex items-center justify-center flex-shrink-0">
        <Phone className="w-5 h-5 text-[var(--accent)]" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-white text-sm truncate">{contact.name}</p>
        <p className="text-xs font-mono text-white/50 mt-0.5">{contact.phone}</p>
      </div>

      {/* Priority badge */}
      <span
        className={cn(
          "text-xs font-semibold px-2.5 py-1 rounded-full border",
          priorityColors[contact.priority]
        )}
      >
        {contact.priority}
      </span>

      {/* Actions */}
      <div className="flex gap-1 flex-shrink-0">
        <button
          onClick={() => onEdit(contact)}
          aria-label={`Edit ${contact.name}`}
          className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.07] transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(contact.id)}
          aria-label={`Delete ${contact.name}`}
          className="p-2 rounded-lg text-white/40 hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.article>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  initial?: Contact;
  onSave: (data: Omit<Contact, "id">) => void;
  onClose: () => void;
}

function ContactModal({ initial, onSave, onClose }: ModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [priority, setPriority] = useState<Contact["priority"]>(
    initial?.priority ?? "Primary"
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    onSave({ name: name.trim(), phone: phone.trim(), priority });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
        className="glass-card p-6 w-full max-w-md"
        role="dialog"
        aria-modal="true"
        aria-label={initial ? "Edit contact" : "Add contact"}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-lg">
            {initial ? "Edit Contact" : "Add Contact"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.07]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="contact-name" className="block text-xs text-white/50 mb-1.5 font-medium">
              Full Name
            </label>
            <input
              id="contact-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Naveen Kumar"
              required
              className="w-full rounded-xl bg-white/[0.04] border border-white/[0.1] px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/30 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="contact-phone" className="block text-xs text-white/50 mb-1.5 font-medium">
              Phone Number
            </label>
            <input
              id="contact-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              required
              className="w-full rounded-xl bg-white/[0.04] border border-white/[0.1] px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[var(--accent)]/50 focus:ring-1 focus:ring-[var(--accent)]/30 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1.5 font-medium">Priority</label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-xs font-semibold border transition-all duration-200",
                    priority === p
                      ? priorityColors[p]
                      : "bg-white/[0.03] border-white/[0.08] text-white/40 hover:text-white/60"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.07] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[var(--accent)]/20 border border-[var(--accent)]/40 text-[var(--accent)] hover:bg-[var(--accent)]/30 transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Emergency Contacts Page ────────────────────────────────────────────────────
export default function EmergencyContactsPage() {
  const { contacts, addContact, editContact, deleteContact } = useTelemetry();
  const [modalMode, setModalMode] = useState<null | "add" | Contact>(null);

  const handleSave = (data: Omit<Contact, "id">) => {
    if (modalMode === "add") {
      addContact(data);
    } else if (modalMode && typeof modalMode === "object") {
      editContact(modalMode.id, data);
    }
    setModalMode(null);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl">
      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6 flex items-start justify-between"
      >
        <div>
          <p className="text-xs font-semibold tracking-widest text-[var(--accent)]/70 uppercase mb-1">
            GSM / SMS
          </p>
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight text-white">
            Emergency Contacts
          </h1>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setModalMode("add")}
          id="add-contact-btn"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent)]/20 border border-[var(--accent)]/40 text-[var(--accent)] text-sm font-semibold hover:bg-[var(--accent)]/30 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </motion.button>
      </motion.div>

      {/* Info banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-3 mb-6 px-4 py-3 rounded-2xl bg-[var(--accent)]/[0.06] border border-[var(--accent)]/15"
      >
        <ShieldCheck className="w-4 h-4 text-[var(--accent)] flex-shrink-0" />
        <p className="text-xs text-white/60">
          These contacts receive SMS and voice call alerts when a severe impact is detected. Primary contact is dialled first.
        </p>
      </motion.div>

      {/* Contact list */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-3"
      >
        <AnimatePresence mode="popLayout">
          {contacts.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-12 text-center"
            >
              <Phone className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-sm text-white/40">No contacts added yet.</p>
            </motion.div>
          )}
          {contacts.map((c) => (
            <ContactCard
              key={c.id}
              contact={c}
              onEdit={(contact) => setModalMode(contact)}
              onDelete={deleteContact}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {modalMode !== null && (
          <ContactModal
            initial={modalMode === "add" ? undefined : (modalMode as Contact)}
            onSave={handleSave}
            onClose={() => setModalMode(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
