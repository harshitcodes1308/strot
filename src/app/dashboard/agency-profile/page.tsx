"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Plus, Trash, Globe, Briefcase, IdentificationCard, Code, ListPlus } from "@phosphor-icons/react";

export default function AgencyProfilePage() {
  const { data: profile, isLoading, refetch } = trpc.agency.getProfile.useQuery();
  const updateMutation = trpc.agency.updateProfile.useMutation({
    onSuccess: () => {
      refetch();
      alert("Agency Profile updated successfully!");
    },
    onError: (err) => {
      alert(`Error updating profile: ${err.message}`);
    }
  });

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [pricingModel, setPricingModel] = useState("project-based");
  const [contactInfo, setContactInfo] = useState({ email: "", website: "", phone: "" });

  const [services, setServices] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [caseStudies, setCaseStudies] = useState<any[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [techStack, setTechStack] = useState<string[]>([]);

  // Temp item input states
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceDesc, setNewServiceDesc] = useState("");

  const [newPortTitle, setNewPortTitle] = useState("");
  const [newPortDesc, setNewPortDesc] = useState("");
  const [newPortLink, setNewPortLink] = useState("");

  const [newCaseClient, setNewCaseClient] = useState("");
  const [newCaseTitle, setNewCaseTitle] = useState("");
  const [newCaseChallenge, setNewCaseChallenge] = useState("");
  const [newCaseSolution, setNewCaseSolution] = useState("");
  const [newCaseResults, setNewCaseResults] = useState("");

  const [newIndustry, setNewIndustry] = useState("");
  const [newTech, setNewTech] = useState("");

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setSlug(profile.slug || "");
      setTagline(profile.tagline || "");
      setDescription(profile.description || "");
      setPricingModel(profile.pricingModel || "project-based");
      setServices(profile.services as any[] || []);
      setPortfolio(profile.portfolio as any[] || []);
      setCaseStudies(profile.caseStudies as any[] || []);
      setIndustries(profile.industries || []);
      setTechStack(profile.techStack || []);
      setContactInfo((profile.contactInfo as any) || { email: "", website: "", phone: "" });
    }
  }, [profile]);

  if (isLoading) return <div className="p-8 text-[var(--ink)]">Loading profile...</div>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      name,
      slug,
      tagline,
      description,
      services,
      portfolio,
      caseStudies,
      industries,
      techStack,
      pricingModel,
      contactInfo,
    });
  };

  // List manipulation helpers
  const addService = () => {
    if (!newServiceName) return;
    setServices([...services, {
      name: newServiceName,
      price: newServicePrice || "TBD",
      description: newServiceDesc,
      priority: services.length + 1
    }]);
    setNewServiceName("");
    setNewServicePrice("");
    setNewServiceDesc("");
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const addPortfolio = () => {
    if (!newPortTitle) return;
    setPortfolio([...portfolio, {
      title: newPortTitle,
      description: newPortDesc,
      link: newPortLink
    }]);
    setNewPortTitle("");
    setNewPortDesc("");
    setNewPortLink("");
  };

  const removePortfolio = (index: number) => {
    setPortfolio(portfolio.filter((_, i) => i !== index));
  };

  const addCaseStudy = () => {
    if (!newCaseClient || !newCaseTitle) return;
    setCaseStudies([...caseStudies, {
      client: newCaseClient,
      title: newCaseTitle,
      challenge: newCaseChallenge,
      solution: newCaseSolution,
      results: newCaseResults
    }]);
    setNewCaseClient("");
    setNewCaseTitle("");
    setNewCaseChallenge("");
    setNewCaseSolution("");
    setNewCaseResults("");
  };

  const removeCaseStudy = (index: number) => {
    setCaseStudies(caseStudies.filter((_, i) => i !== index));
  };

  const addIndustry = () => {
    if (newIndustry && !industries.includes(newIndustry)) {
      setIndustries([...industries, newIndustry.toLowerCase()]);
      setNewIndustry("");
    }
  };

  const removeIndustry = (ind: string) => {
    setIndustries(industries.filter(x => x !== ind));
  };

  const addTech = () => {
    if (newTech && !techStack.includes(newTech)) {
      setTechStack([...techStack, newTech.toLowerCase()]);
      setNewTech("");
    }
  };

  const removeTech = (t: string) => {
    setTechStack(techStack.filter(x => x !== t));
  };

  return (
    <div className="p-8 max-w-5xl mx-auto text-[var(--ink)] space-y-8">
      <header className="border-b border-white/10 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display">Agency Profile</h1>
          <p className="text-sm opacity-70">Customize your public portfolio page, pitch services, and case studies.</p>
        </div>
        {profile && (
          <a
            href={`/agency/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary text-xs flex items-center gap-2"
          >
            <Globe size={14} /> View Public Page
          </a>
        )}
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Brand details */}
        <section className="bg-[var(--surface)] border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold font-display flex items-center gap-2 text-[var(--primary)] border-b border-white/5 pb-2">
            <IdentificationCard size={18} />
            Agency Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider opacity-75">Agency Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[var(--surface-raised)] border border-white/10 rounded p-2 text-xs text-white"
                required
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider opacity-75">Public Slug URL</label>
              <div className="flex rounded bg-[var(--surface-raised)] border border-white/10 overflow-hidden">
                <span className="bg-white/5 px-2 py-2 text-xs opacity-55">/agency/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                  className="flex-1 bg-transparent border-0 outline-none p-2 text-xs text-white"
                  required
                />
              </div>
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider opacity-75">Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              className="w-full bg-[var(--surface-raised)] border border-white/10 rounded p-2 text-xs text-white"
              placeholder="e.g. High-performance software and design solutions."
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider opacity-75">Full Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full h-24 bg-[var(--surface-raised)] border border-white/10 rounded p-2 text-xs text-white"
              placeholder="Describe your capabilities, history, and focus areas..."
            />
          </div>
        </section>

        {/* Section 2: Services Menu */}
        <section className="bg-[var(--surface)] border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold font-display flex items-center gap-2 text-[var(--primary)] border-b border-white/5 pb-2">
            <ListPlus size={18} />
            Services Menu
          </h2>
          <div className="space-y-3">
            {services.map((s, idx) => (
              <div key={idx} className="flex justify-between items-start bg-[var(--surface-raised)] border border-white/5 rounded-lg p-3 text-xs">
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    {s.name}
                    <span className="text-[10px] font-semibold text-[var(--accent)] px-1.5 py-0.2 bg-[var(--accent-subtle)] rounded">
                      {s.price}
                    </span>
                  </div>
                  <div className="opacity-60 mt-1">{s.description}</div>
                </div>
                <button
                  type="button"
                  onClick={() => removeService(idx)}
                  className="text-white/40 hover:text-[var(--error)] p-1 rounded"
                >
                  <Trash size={14} />
                </button>
              </div>
            ))}
          </div>
          {/* Add Service form fields */}
          <div className="border border-white/5 bg-white/2 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold opacity-60">Service Name</label>
              <input
                type="text"
                value={newServiceName}
                onChange={e => setNewServiceName(e.target.value)}
                placeholder="e.g. Technical SEO Audit"
                className="w-full bg-[var(--surface-raised)] border border-white/10 rounded p-2 text-xs text-white mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold opacity-60">Ballpark Price</label>
              <input
                type="text"
                value={newServicePrice}
                onChange={e => setNewServicePrice(e.target.value)}
                placeholder="e.g. $1,500 - $3,000"
                className="w-full bg-[var(--surface-raised)] border border-white/10 rounded p-2 text-xs text-white mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold opacity-60">Description</label>
              <input
                type="text"
                value={newServiceDesc}
                onChange={e => setNewServiceDesc(e.target.value)}
                placeholder="Brief description..."
                className="w-full bg-[var(--surface-raised)] border border-white/10 rounded p-2 text-xs text-white mt-1"
              />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <button
                type="button"
                onClick={addService}
                className="btn btn-secondary text-xs flex items-center gap-1.5 py-1 px-3"
              >
                <Plus size={12} /> Add Service to Menu
              </button>
            </div>
          </div>
        </section>

        {/* Section 3: Portfolio & Case Studies */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Portfolio items */}
          <section className="bg-[var(--surface)] border border-white/10 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold font-display flex items-center gap-2 text-[var(--primary)] border-b border-white/5 pb-2">
              <Briefcase size={18} />
              Portfolio Projects
            </h2>
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {portfolio.map((p, idx) => (
                <div key={idx} className="flex justify-between items-start bg-[var(--surface-raised)] rounded p-2.5 text-xs">
                  <div>
                    <div className="font-semibold text-white">{p.title}</div>
                    <div className="opacity-60 text-[10px] mt-0.5">{p.description}</div>
                    {p.link && <a href={p.link} target="_blank" rel="noopener" className="text-[var(--accent)] underline text-[10px] mt-1 block">{p.link}</a>}
                  </div>
                  <button type="button" onClick={() => removePortfolio(idx)} className="text-white/40 hover:text-[var(--error)]"><Trash size={12} /></button>
                </div>
              ))}
            </div>
            <div className="border border-white/5 p-3 rounded space-y-2 bg-white/2">
              <input
                type="text"
                placeholder="Project Title"
                value={newPortTitle}
                onChange={e => setNewPortTitle(e.target.value)}
                className="w-full bg-[var(--surface-raised)] border border-white/10 rounded p-1.5 text-xs text-white"
              />
              <input
                type="text"
                placeholder="Brief Description"
                value={newPortDesc}
                onChange={e => setNewPortDesc(e.target.value)}
                className="w-full bg-[var(--surface-raised)] border border-white/10 rounded p-1.5 text-xs text-white"
              />
              <input
                type="text"
                placeholder="Link URL (Optional)"
                value={newPortLink}
                onChange={e => setNewPortLink(e.target.value)}
                className="w-full bg-[var(--surface-raised)] border border-white/10 rounded p-1.5 text-xs text-white"
              />
              <div className="flex justify-end">
                <button type="button" onClick={addPortfolio} className="btn btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1">
                  <Plus size={11} /> Add Project
                </button>
              </div>
            </div>
          </section>

          {/* Case Studies */}
          <section className="bg-[var(--surface)] border border-white/10 rounded-xl p-6 space-y-4">
            <h2 className="text-base font-bold font-display flex items-center gap-2 text-[var(--primary)] border-b border-white/5 pb-2">
              <Code size={18} />
              Case Studies
            </h2>
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {caseStudies.map((c, idx) => (
                <div key={idx} className="flex justify-between items-start bg-[var(--surface-raised)] rounded p-2.5 text-xs">
                  <div>
                    <div className="font-semibold text-white">{c.client} - {c.title}</div>
                    <div className="opacity-60 text-[10px] mt-0.5">Results: {c.results}</div>
                  </div>
                  <button type="button" onClick={() => removeCaseStudy(idx)} className="text-white/40 hover:text-[var(--error)]"><Trash size={12} /></button>
                </div>
              ))}
            </div>
            <div className="border border-white/5 p-3 rounded space-y-2 bg-white/2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Client / Brand"
                  value={newCaseClient}
                  onChange={e => setNewCaseClient(e.target.value)}
                  className="bg-[var(--surface-raised)] border border-white/10 rounded p-1.5 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Study Title"
                  value={newCaseTitle}
                  onChange={e => setNewCaseTitle(e.target.value)}
                  className="bg-[var(--surface-raised)] border border-white/10 rounded p-1.5 text-xs text-white"
                />
              </div>
              <input
                type="text"
                placeholder="The Challenge"
                value={newCaseChallenge}
                onChange={e => setNewCaseChallenge(e.target.value)}
                className="w-full bg-[var(--surface-raised)] border border-white/10 rounded p-1.5 text-xs text-white"
              />
              <input
                type="text"
                placeholder="Your Solution"
                value={newCaseSolution}
                onChange={e => setNewCaseSolution(e.target.value)}
                className="w-full bg-[var(--surface-raised)] border border-white/10 rounded p-1.5 text-xs text-white"
              />
              <input
                type="text"
                placeholder="Key Results / ROI"
                value={newCaseResults}
                onChange={e => setNewCaseResults(e.target.value)}
                className="w-full bg-[var(--surface-raised)] border border-white/10 rounded p-1.5 text-xs text-white"
              />
              <div className="flex justify-end">
                <button type="button" onClick={addCaseStudy} className="btn btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1">
                  <Plus size={11} /> Add Case Study
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Section 4: Industries & Tech Stack */}
        <section className="bg-[var(--surface)] border border-white/10 rounded-xl p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Industries Served */}
            <div className="space-y-3">
              <label className="text-[10px] uppercase font-bold tracking-wider opacity-75">Industries We Serve</label>
              <div className="flex flex-wrap gap-1.5 min-h-[36px] bg-[var(--surface-raised)] border border-white/10 rounded p-2">
                {industries.map(i => (
                  <span key={i} className="bg-white/10 text-white rounded text-[10px] px-2 py-0.5 flex items-center gap-1.5">
                    {i}
                    <button type="button" onClick={() => removeIndustry(i)} className="hover:text-[var(--error)] text-[9px]">✕</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. saas, retail"
                  value={newIndustry}
                  onChange={e => setNewIndustry(e.target.value)}
                  className="flex-1 bg-[var(--surface-raised)] border border-white/10 rounded p-1.5 text-xs text-white"
                />
                <button type="button" onClick={addIndustry} className="btn btn-secondary text-xs py-1 px-3">Add</button>
              </div>
            </div>

            {/* Tech Stack */}
            <div className="space-y-3">
              <label className="text-[10px] uppercase font-bold tracking-wider opacity-75">Agency Tech Stack</label>
              <div className="flex flex-wrap gap-1.5 min-h-[36px] bg-[var(--surface-raised)] border border-white/10 rounded p-2">
                {techStack.map(t => (
                  <span key={t} className="bg-white/10 text-white rounded text-[10px] px-2 py-0.5 flex items-center gap-1.5">
                    {t}
                    <button type="button" onClick={() => removeTech(t)} className="hover:text-[var(--error)] text-[9px]">✕</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. nextjs, tailwind"
                  value={newTech}
                  onChange={e => setNewTech(e.target.value)}
                  className="flex-1 bg-[var(--surface-raised)] border border-white/10 rounded p-1.5 text-xs text-white"
                />
                <button type="button" onClick={addTech} className="btn btn-secondary text-xs py-1 px-3">Add</button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Pricing Models & Contact details */}
        <section className="bg-[var(--surface)] border border-white/10 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-bold font-display flex items-center gap-2 text-[var(--primary)] border-b border-white/5 pb-2">
            Pricing & Contact Card
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider opacity-75">Pricing Model</label>
              <select
                value={pricingModel}
                onChange={e => setPricingModel(e.target.value)}
                className="w-full bg-[var(--surface-raised)] border border-white/10 rounded p-2 text-xs text-white"
              >
                <option value="project-based">Project-based flat fee</option>
                <option value="retainer">Monthly retainer</option>
                <option value="hourly">Hourly rate</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider opacity-75">Contact Email</label>
              <input
                type="email"
                value={contactInfo.email}
                onChange={e => setContactInfo({ ...contactInfo, email: e.target.value })}
                className="w-full bg-[var(--surface-raised)] border border-white/10 rounded p-2 text-xs text-white"
                placeholder="contact@agency.com"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider opacity-75">Website Link</label>
              <input
                type="url"
                value={contactInfo.website}
                onChange={e => setContactInfo({ ...contactInfo, website: e.target.value })}
                className="w-full bg-[var(--surface-raised)] border border-white/10 rounded p-2 text-xs text-white"
                placeholder="https://agency.com"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider opacity-75">Phone Number</label>
              <input
                type="text"
                value={contactInfo.phone}
                onChange={e => setContactInfo({ ...contactInfo, phone: e.target.value })}
                className="w-full bg-[var(--surface-raised)] border border-white/10 rounded p-2 text-xs text-white"
                placeholder="+1 (555) 0199"
              />
            </div>
          </div>
        </section>

        {/* Form controls */}
        <div className="flex justify-end gap-3 pb-8">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="btn btn-primary font-semibold px-6 py-2.5 text-xs shadow-[0_0_15px_var(--primary-glow)] disabled:opacity-50"
          >
            {updateMutation.isPending ? "Saving Profile..." : "Save Agency Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
