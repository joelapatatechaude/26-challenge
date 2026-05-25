"""Red Hat OpenShift — Example Presentation Deck.

Run:
    python3 src/generator/openshift_demo_deck.py
"""

from pathlib import Path

from generator.deck_builder import build_deck

TEMPLATE_ID = "red-hat-openshift"

SLIDES = [
    # ── Slide 1 ── Title ──────────────────────────────────────────────────────
    {
        "element":    "title-block",
        "title":      "Red Hat OpenShift:\nThe Enterprise Kubernetes Platform",
        "subheading": "Run anywhere. Automate everything. Ship faster.",
        "presenter":  "[Presenter Name], [Title]",
        "date":       "May 2026",
    },

    # ── Slide 2 ── Agenda ─────────────────────────────────────────────────────
    {
        "element": "agenda",
        "title":   "What We'll Cover",
        "items": [
            {"topic": "Why OpenShift",           "detail": "The challenges OpenShift was built to solve"},
            {"topic": "Platform Capabilities",   "detail": "From developer experience to Day-2 operations"},
            {"topic": "Key Use Cases",           "detail": "AI/ML, edge, hybrid cloud, and sovereign deployments"},
            {"topic": "Customer Outcomes",       "detail": "Real results from Red Hat customers worldwide"},
            {"topic": "Getting Started",         "detail": "Deployment options, trial, and next steps"},
        ],
    },

    # ── Slide 3 ── Divider ────────────────────────────────────────────────────
    {
        "element":        "divider",
        "section_marker": "THE CHALLENGE",
        "headline":       "Why Kubernetes\nNeeds OpenShift",
    },

    # ── Slide 4 ── Challenge List ─────────────────────────────────────────────
    {
        "element":        "challenge-list",
        "section_marker": "THE CHALLENGE",
        "title":          "Raw Kubernetes is complex — most teams spend more time managing the platform than shipping software",
        "challenges": [
            {
                "headline": "Steep operational overhead",
                "body":     "Kubernetes requires extensive expertise to configure, secure, upgrade, and maintain at scale across heterogeneous infrastructure.",
            },
            {
                "headline": "Security gaps out of the box",
                "body":     "Vanilla Kubernetes ships with permissive defaults. Teams must hand-assemble policies, RBAC, network segmentation, and image scanning.",
            },
            {
                "headline": "Fragmented developer experience",
                "body":     "Developers juggle multiple tools for CI/CD, logging, monitoring, and service mesh — with no integrated inner loop or GitOps workflow.",
            },
            {
                "headline": "No unified multi-cluster management",
                "body":     "Running workloads across on-prem, cloud, and edge requires stitching together disparate toolchains with no single control plane.",
            },
        ],
    },

    # ── Slide 5 ── Divider ────────────────────────────────────────────────────
    {
        "element":        "divider",
        "section_marker": "PLATFORM",
        "headline":       "OpenShift\nCapabilities",
    },

    # ── Slide 6 ── Metric Cards ───────────────────────────────────────────────
    {
        "element":        "metric-card",
        "section_marker": "PLATFORM",
        "title":          "OpenShift delivers measurable impact across the software delivery lifecycle",
        "cards": [
            {
                "value": "4×",
                "label": "Faster application deployment cycles vs. DIY Kubernetes",
            },
            {
                "value": "60%",
                "label": "Reduction in infrastructure management overhead reported by customers",
            },
            {
                "value": "99.9%",
                "label": "Uptime SLA with automated cluster lifecycle management and rolling upgrades",
            },
        ],
        "source": "Source: Red Hat Customer Survey 2025; IDC Business Value Study",
    },

    # ── Slide 7 ── Tech Tiles ─────────────────────────────────────────────────
    {
        "element":        "tech-tile",
        "section_marker": "PLATFORM",
        "title":          "One platform — from developer inner loop to production operations across every cloud",
        "tiles": [
            {
                "pillar":      "Developer Experience",
                "name":        "OpenShift Dev Spaces",
                "description": "Browser-based IDE with preconfigured dev environments — zero-to-code in minutes",
            },
            {
                "pillar":      "CI/CD",
                "name":        "OpenShift Pipelines & GitOps",
                "description": "Tekton-native pipelines and Argo CD-based GitOps baked in — no external toolchain required",
            },
            {
                "pillar":      "Security",
                "name":        "Built-in Security Controls",
                "description": "Pod security admission, network policies, image signing, and ACS integration from day one",
            },
            {
                "pillar":      "AI/ML",
                "name":        "OpenShift AI",
                "description": "End-to-end MLOps platform — model training, serving, monitoring, and pipelines on the same cluster",
            },
            {
                "pillar":      "Edge",
                "name":        "MicroShift / SNO",
                "description": "Single-node OpenShift and MicroShift bring Kubernetes to resource-constrained edge locations",
            },
            {
                "pillar":      "Multi-Cluster",
                "name":        "Advanced Cluster Management",
                "description": "Unified governance, policy, and lifecycle management across hundreds of clusters",
            },
        ],
    },

    # ── Slide 8 ── Data Table ─────────────────────────────────────────────────
    {
        "element":        "data-table",
        "section_marker": "COMPETITIVE",
        "title":          "OpenShift vs. DIY Kubernetes — the total cost of ownership picture",
        "headers":        ["Capability", "OpenShift", "DIY Kubernetes"],
        "rows": [
            ["Integrated CI/CD + GitOps",          "✓ Included",        "Manual assembly"],
            ["Built-in security hardening",        "✓ CIS-benchmarked", "Must configure manually"],
            ["Automated cluster upgrades",         "✓ Rolling, OTA",    "Manual, high risk"],
            ["Developer portal (Backstage)",       "✓ Red Hat Developer Hub", "DIY / commercial add-on"],
            ["Multi-cluster management",           "✓ ACM included",    "3rd-party required"],
            ["AI/ML platform",                     "✓ OpenShift AI",    "Kubeflow DIY"],
            ["24×7 enterprise support",            "✓ Red Hat support", "Community only"],
        ],
        "takeaway": "OpenShift consolidates 6–8 separate tools into one supported platform, reducing TCO by up to 40% over three years.",
        "source":   "Source: Red Hat / IDC Total Cost of Analysis, 2025",
    },

    # ── Slide 9 ── Recommendation Cards ──────────────────────────────────────
    {
        "element": "recommendation-card",
        "title":   "Next Steps",
        "cards": [
            {
                "headline": "Try OpenShift Free",
                "body":     "Spin up a fully managed OpenShift cluster in under 60 seconds at console.redhat.com — no credit card required.",
            },
            {
                "headline": "Book an Architecture Workshop",
                "body":     "Work with a Red Hat solution architect to design your OpenShift adoption roadmap, migration path, and TCO model.",
            },
            {
                "headline": "Explore OpenShift AI",
                "body":     "Schedule a live demo of OpenShift AI model serving, pipeline automation, and GPU-optimised workload scheduling.",
            },
        ],
        "cta": "Start your OpenShift journey today — visit redhat.com/openshift",
    },

    # ── Slide 10 ── Closing ───────────────────────────────────────────────────
    {
        "element": "closing",
        "boilerplate": "Red Hat is the world's leading provider of enterprise open source solutions. OpenShift is trusted by 90% of the Fortune 500 to run mission-critical workloads.",
    },
]


def main() -> None:
    skills_root = Path(__file__).parents[2] / "skills-output"
    assets_root = skills_root / "assets"
    output_path = Path(__file__).parents[2] / "decks" / "openshift-demo.pptx"

    print(f"Building OpenShift demo deck ({len(SLIDES)} slides) using {TEMPLATE_ID} blueprint...")
    build_deck(SLIDES, assets_root, output_path,
               skills_root=skills_root, template_id=TEMPLATE_ID)
    print(f"\nOpen: {output_path}")


if __name__ == "__main__":
    main()
