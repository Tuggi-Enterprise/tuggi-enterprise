"use client";

export function DataDeletionForm() {
  return (
    <form className="flex flex-col sm:flex-row gap-4" onSubmit={(e) => e.preventDefault()}>
      <input 
        type="email" 
        placeholder="your@email.com"
        className="flex-1 bg-white border border-slate-300 rounded-lg px-4 py-3 text-tuggi-dark focus:outline-none focus:ring-2 focus:ring-tuggi-primary/50 transition-all"
        required
      />
      <button 
        type="submit"
        className="bg-tuggi-dark text-white font-bold px-6 py-3 rounded-lg hover:bg-slate-800 transition-colors shadow-md whitespace-nowrap"
      >
        Request Data Deletion
      </button>
    </form>
  );
}
