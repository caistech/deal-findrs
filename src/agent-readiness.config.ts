import type { AgentReadinessConfig } from "@caistech/webmcp-kit";

// PRODUCT_STANDARDS §11 Layer 1 (DISCOVERABLE). Drives /llms.txt, landing JSON-LD, /.well-known/agent.json.
export const agentConfig: AgentReadinessConfig = {
  "name": "DealFindrs",
  "displayName": "DealFindrs",
  "url": "https://deal-findrs.vercel.app",
  "description": "DealFindrs is the branded AI-powered deal assessment platform for buyers' agent firms and property development advisories — deploy Finance Packs to your developer client roster.",
  "applicationCategory": "BusinessApplication",
  "keyPages": [
    {
      "title": "About",
      "url": "/about"
    },
    {
      "title": "Pricing",
      "url": "/pricing"
    },
    {
      "title": "Partners",
      "url": "/partners"
    },
    {
      "title": "Contact",
      "url": "/contact"
    }
  ],
  "provider": {
    "name": "Global Buildtech Australia Pty Ltd",
    "url": "https://corporateaisolutions.com",
    "legalId": "ABN 54 672 395 685"
  },
  "contactEmail": "dennis@corporateaisolutions.com"
};
