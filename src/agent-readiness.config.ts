import type { AgentReadinessConfig } from "@caistech/webmcp-kit";

// PRODUCT_STANDARDS §11 Layer 1 (DISCOVERABLE). Drives /llms.txt, landing JSON-LD, /.well-known/agent.json.
//
// keyPages carry RELATIVE urls on purpose: the kit resolves them against `url`
// (absolute(config.url, page.url)), so a domain change is a one-line edit rather
// than five. Each carries a description because the kit emits it into llms.txt —
// it is what an agent quotes when describing the page, so an undescribed page
// gets described by guesswork.
export const agentConfig: AgentReadinessConfig = {
  "name": "DealFindrs",
  "displayName": "DealFindrs",
  "url": "https://deal-findrs.vercel.app",
  "description": "Stop Guessing. Start Knowing. DealFindrs is the branded AI-powered deal assessment platform for buyers' agent firms and property development advisories — deploy Finance Packs to your developer client roster.",
  "applicationCategory": "BusinessApplication",
  "keyPages": [
    {
      "title": "About",
      "url": "/about",
      "description": "How DealFindrs brings AI-powered deal assessment to property development firms and buyers' agent practices across Australia."
    },
    {
      "title": "Pricing",
      "url": "/pricing",
      "description": "Free trial and paid plans for firms deploying branded deal assessment to their client roster."
    },
    {
      "title": "Partners",
      "url": "/partners",
      "description": "Partner program for buyers' agent firms and property advisories that white-label DealFindrs for their developer clients."
    },
    {
      "title": "Contact",
      "url": "/contact",
      "description": "Get in touch with the DealFindrs team."
    }
  ],
  "provider": {
    "name": "Global Buildtech Australia Pty Ltd",
    "url": "https://corporateaisolutions.com",
    "legalId": "ABN 54 672 395 685"
  },
  "contactEmail": "dennis@corporateaisolutions.com"
};
