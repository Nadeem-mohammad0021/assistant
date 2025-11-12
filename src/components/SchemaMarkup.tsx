// ✅ Server component version — no "use client"

export function SchemaMarkup() {
  const schemaData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "KYNEX.dev",
      url: "https://kynex.dev",
      logo: "https://kynex.dev/favicon-512x512.png",
      sameAs: [
        "https://www.linkedin.com/company/kynex-dev/",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        email: "contact@kynex.dev",
        contactType: "customer support"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "KYNEX.dev - Personal AI Workspace with Long-Term Memory",
      url: "https://assistant.kynex.dev",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://assistant.kynex.dev/search?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "KYNEX.dev - Personal AI Assistant Workspace",
      description: "Your personal AI assistant workspace with long-term memory. Chat intelligently, organize notes, set reminders, and access your information anytime, anywhere.",
      url: "https://assistant.kynex.dev"
    }
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
    />
  );
}

export default SchemaMarkup;