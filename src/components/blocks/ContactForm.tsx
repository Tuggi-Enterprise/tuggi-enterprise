"use client";

import { useState } from "react";

export function ContactForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const genericDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com"];
    const domain = email.split("@")[1];

    if (!domain || genericDomains.includes(domain.toLowerCase())) {
      setError("Please use a corporate or government email address.");
      return;
    }

    // Process lead routing
    setError("");
    alert("Lead routed successfully");
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-1">
        <label htmlFor="work-email" className="sr-only">Work Email</label>
        <input 
          id="work-email"
          type="email" 
          required
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          placeholder="Work Email" 
          className="p-3 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00A8E8] text-[#0B1220]" 
        />
        {error && <span className="text-red-500 text-sm">{error}</span>}
      </div>
      <button 
        type="submit" 
        className="p-3 bg-[#FF6F00] text-white rounded-md font-semibold hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#FF6F00] focus:ring-offset-2"
      >
        Request Demo
      </button>
    </form>
  );
}
