"""Digital Sovereignty Sales Enablement — deck spec derived from the markdown outline.

Run:
    python3 src/generator/digital_sovereignty_deck.py
"""

from pathlib import Path

from generator.deck_builder import build_deck

SLIDES = [
    # ── Slide 1 ── Title Block ──────────────────────────────────────────────
    {
        "element":    "title-block",
        "title":      "Digital Sovereignty:\nEnabling Trusted Infrastructure at Scale",
        "subheading": "A Red Hat Sales Enablement Guide",
        "presenter":  "[Presenter Name], [Title]",
        "date":       "May 2026",
    },

    # ── Slide 2 ── Agenda ───────────────────────────────────────────────────
    {
        "element": "agenda",
        "title":   "What We'll Cover Today",
        "items": [
            {
                "topic":  "The Sovereignty Landscape",
                "detail": "Why geopolitics, AI funding, and VMware changes created urgency now",
            },
            {
                "topic":  "Customer Challenges",
                "detail": "Where enterprises, MSPs, and CCSPs are stuck today",
            },
            {
                "topic":  "The Red Hat Approach",
                "detail": "How OpenShift, Ansible, and reference architectures close the gap",
            },
            {
                "topic":  "Competitive Context & Next Steps",
                "detail": "Where Red Hat stands vs. Google GDC and Oracle Alloy — and how to win",
            },
        ],
    },

    # ── Slide 3 ── Divider: Sovereignty Landscape ───────────────────────────
    {
        "element":        "divider",
        "section_marker": "SITUATION",
        "headline":       "The Sovereignty\nLandscape",
    },

    # ── Slide 4 ── Metric Cards: Why Sovereignty, Why Now ───────────────────
    {
        "element":        "metric-card",
        "section_marker": "SITUATION",
        "title":          "Geopolitics, AI funding, and VMware disruption have made sovereignty commercially urgent",
        "cards": [
            {
                "value": "Govt AI\nFunding",
                "label": "Driving low-risk, fast-rollout procurement cycles across APAC and EMEA",
            },
            {
                "value": "VMware\nDisruption",
                "label": "Broadcom licensing changes have disrupted MSPs and CCSPs globally — demand for alternatives is surging",
            },
            {
                "value": "Regional\nMandates",
                "label": "Data-centre sovereignty requirements accelerating across APAC, EU, and Middle East",
            },
        ],
        "source": "Source: [Cite government AI investment report; Broadcom/VMware market impact study; regional regulatory analysis]",
    },

    # ── Slide 5 ── Challenge List ────────────────────────────────────────────
    {
        "element":        "challenge-list",
        "section_marker": "PROBLEM",
        "title":          "Enterprises are mandated to be sovereign — but lose the cloud experience when they try",
        "challenges": [
            {
                "headline": "Losing the cloud-native experience",
                "body":     "Banks and regulated enterprises moving on-premise face an operational cliff — no GitOps, no automation, no Day-2 tooling parity with hyperscalers.",
            },
            {
                "headline": "MSP and CCSP models broken by VMware",
                "body":     "Managed and cloud service providers accustomed to VMware economics are under commercial pressure and seeking a compelling, cloud-native replacement.",
            },
            {
                "headline": "APAC assurance and operations gaps",
                "body":     "Sovereignty requirements in APAC are highly specific; current offerings cover technology but leave operations and assurance largely unaddressed.",
            },
            {
                "headline": "Hardware sovereignty beyond software reach",
                "body":     "Geopolitical supply-chain concerns are real, but customers need assurance and measurement tools, not just platform software.",
            },
        ],
    },

    # ── Slide 6 ── Divider: Red Hat Approach ────────────────────────────────
    {
        "element":        "divider",
        "section_marker": "OUR APPROACH",
        "headline":       "The Red Hat\nApproach",
    },

    # ── Slide 7 ── Tech Tiles: Solution Portfolio ────────────────────────────
    {
        "element":        "tech-tile",
        "section_marker": "OUR APPROACH",
        "title":          "Red Hat maps to all four sovereignty pillars — with the largest opportunity in Operations and Assurance",
        "tiles": [
            {
                "pillar":      "Technology",
                "name":        "Red Hat OpenShift",
                "description": "Sovereign cloud platform — run disconnected, on-prem, or at the edge",
            },
            {
                "pillar":      "Technology",
                "name":        "Red Hat Enterprise Linux",
                "description": "Trusted OS foundation with supply-chain integrity via SBOM and signing",
            },
            {
                "pillar":      "Operations",
                "name":        "Ansible Automation Platform",
                "description": "GitOps-driven Day-2 operations; pre-packaged automation for sovereign stacks",
            },
            {
                "pillar":      "Operations",
                "name":        "OpenShift GitOps",
                "description": "Declarative, auditable operational model — time-to-value accelerator for sovereign adopters",
            },
            {
                "pillar":      "Assurance",
                "name":        "Compliance Automation",
                "description": "Automated evidence collection and policy enforcement across sovereign boundaries (in development)",
            },
            {
                "pillar":      "Assurance",
                "name":        "Enclave Reference Architecture",
                "description": "Upstream project defining audit boundaries and consistent cross-boundary content flows",
            },
        ],
    },

    # ── Slide 8 ── Image + Content: Differentiated Architecture ─────────────
    {
        "element":        "image-content",
        "section_marker": "OUR APPROACH",
        "title":          "Pre-packaged OpenShift solutions cut time-to-sovereign and preserve the cloud experience",
        "bullets": [
            {
                "headline": "Automated Operational Model",
                "body":     "Deploy governance-as-code via GitOps so enterprises can articulate and enforce sovereignty requirements, not just migrate VMs.",
            },
            {
                "headline": "Pre-packaged Sovereign Stack",
                "body":     "Reference architectures co-developed with Dell, Cisco, and IBM provide bootstrapped hardware + software sovereignty out of the box.",
            },
            {
                "headline": "Mitigating Controls for Hyperscaler Reliance",
                "body":     "Customers on AWS or other hyperscalers receive risk-based mitigating controls — sovereignty without sacrificing cloud economics.",
            },
            {
                "headline": '"Enclave" Model for Multi-Sovereign Consistency',
                "body":     "Upstream enclave project enables enterprises spanning multiple sovereign boundaries to maintain global-to-local workflow consistency.",
            },
        ],
    },

    # ── Slide 9 ── Data Table: Competitive Landscape ─────────────────────────
    {
        "element":        "data-table",
        "section_marker": "COMPETITIVE CONTEXT",
        "title":          "Google GDC and Oracle Alloy lead on packaged disconnected delivery — Red Hat must close the gap",
        "headers": ["Capability", "Red Hat (Today)", "Google GDC", "Oracle Alloy"],
        "rows": [
            ["Disconnected / air-gapped deployment",    "✓ OpenShift",               "✓ Full stack",          "✓ Full stack"],
            ["Partner-operated sovereign cloud",         "Ref. arch. (in progress)",  "✓ Partner-operated GDC","✓ Alloy partner model"],
            ["Cloud-native experience on-prem",          "✓ OpenShift + GitOps",      "✓ Native GCP parity",   "Partial"],
            ["Open standards / upstream community",      "✓ Strong (enclave, OCP)",   "Limited",               "Limited"],
            ["APAC operations & assurance tooling",      "Gap",                       "Partial",               "Partial"],
            ["Hardware reference architecture",          "In dev (IBM, Dell, Cisco)", "✓ Google hardware",     "✓ Oracle hardware"],
            ["Compliance automation",                    "In development",            "Limited",               "Limited"],
        ],
        "takeaway": "Red Hat's open-source advantage and upstream enclave project are differentiators — but field teams must articulate a clear sovereign experience story today while reference architectures mature.",
        "source":   "Source: [Cite current public product pages; validate all competitive claims before external use]",
    },

    # ── Slide 10 ── Recommendation Cards ─────────────────────────────────────
    {
        "element": "recommendation-card",
        "title":   "Where to Start",
        "cards": [
            {
                "headline": "Qualify the Deal",
                "body":     "Use the Digital Sovereignty Readiness Tool to legitimately tag deals and identify the customer's sovereignty tier (data-at-rest → full operational sovereignty).",
            },
            {
                "headline": "Frame the Conversation",
                "body":     "Lead with AI sovereignty or VMware migration pain — not abstract sovereignty theory. Connect to Red Hat's automated operational model and pre-packaged OpenShift story.",
            },
            {
                "headline": "Engage the Program",
                "body":     "Connect with the Red Hat Sovereignty Program team and APAC field leads for APAC-specific operations and assurance requirements.",
            },
        ],
        "cta": "Book a Digital Sovereignty workshop — help your customer define their sovereign journey with Red Hat.",
    },

    # ── Slide 11 ── Closing ─────────────────────────────────────────────────
    {
        "element": "closing",
        "boilerplate": "Red Hat is the world's leading provider of enterprise open source software solutions, using a community-powered approach to deliver reliable and high-performing Linux, hybrid cloud, container, and Kubernetes technologies.",
    },
]


TEMPLATE_ID = "sales-enablement-2022"

def main() -> None:
    skills_root = Path(__file__).parents[2] / "skills-output"
    assets_root = skills_root / "assets"
    output_path = Path(__file__).parents[2] / "decks" / "digital-sovereignty-sales-enablement.pptx"

    print(f"Building Digital Sovereignty deck ({len(SLIDES)} slides) using {TEMPLATE_ID} blueprint...")
    build_deck(SLIDES, assets_root, output_path,
               skills_root=skills_root, template_id=TEMPLATE_ID)
    print(f"\nOpen: {output_path}")


if __name__ == "__main__":
    main()
