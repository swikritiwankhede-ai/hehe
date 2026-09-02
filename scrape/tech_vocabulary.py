"""
Vocabulary that decides whether a scraped label is a technology or cybersecurity
term, and which domain it belongs to.

A label is KEPT when it contains at least one term below. The matched term also
supplies its domain, so filtering and classification happen in one pass.

Terms are matched on word boundaries, case-insensitively. Order matters only in
that the first domain to match wins, so the security domains are listed first:
"cloud security" should classify as Cloud Security, not Cloud & Infrastructure.
"""

# domain -> terms.  Keep terms specific: a term so generic that it matches
# non-technical labels ("management", "platform", "solution") does more harm
# than the rows it rescues.
VOCABULARY: dict[str, list[str]] = {
    "Security Operations": [
        "cybersecurity", "cyber security", "cyber defen", "infosec",
        "information security", "managed security", "security service",
        "security platform", "cyber attack", "threat protection",
        "siem", "soar", "ueba", "xdr", "edr", "ndr", "mdr", "itdr", "soc",
        "security operations", "threat detection", "threat hunting", "threat intel",
        "threat intelligence", "incident response", "digital forensics", "forensics",
        "breach", "security analytics", "log management", "security monitoring",
        "threat", "cyber threat", "attack surface", "security incident",
        "detection and response", "managed detection", "dark web", "deception",
        "threat exposure", "security data", "alert triage", "purple team",
    ],
    "Network Security": [
        "proxy", "reverse proxy", "forward proxy",
        "firewall", "ngfw", "sase", "sse", "swg", "ztna", "zero trust", "vpn",
        "secure web gateway", "network security", "microsegmentation",
        "segmentation", "nac", "network access control", "ddos", "ips", "ids",
        "intrusion", "dns security", "email security", "anti-spam", "waf",
        "web application firewall", "bot management", "bot mitigation", "casb",
        "remote browser", "browser isolation", "secure browser", "cdn security",
    ],
    "Endpoint Security": [
        "endpoint security", "endpoint protection", "antivirus", "anti-virus",
        "malware", "ransomware", "anti-ransomware", "mobile threat", "device security",
        "endpoint detection", "host security", "exploit prevention", "epp",
        "mobile security", "app shielding", "rasp", "runtime protection",
        "anti-tamper", "obfuscation", "mobile app protection", "moving target",
    ],
    "Cloud Security": [
        "cnapp", "cspm", "cwpp", "ciem", "cloud security", "container security",
        "kubernetes security", "workload protection", "cloud detection",
        "cloud native security", "cloud posture", "serverless security",
        "cloud entitlement", "cloud compliance", "cloud workload",
    ],
    "Application Security": [
        "appsec", "application security", "sast", "dast", "iast", "sca",
        "software composition", "api security", "api protection", "secure code",
        "code scanning", "sbom", "supply chain security", "iac security",
        "penetration test", "pentest", "vapt", "red team", "bug bounty",
        "vulnerability scanning", "devsecops", "container image", "zero-cve",
        "hardened image",
    ],
    "Data Security & Privacy": [
        "dlp", "data loss prevention", "dspm", "data security", "encryption",
        "tokenization", "key management", "hsm", "data privacy", "data masking",
        "anonymi", "pseudonymi", "data protection", "data erasure", "sanitization",
        "digital rights", "drm", "watermark", "confidential computing", "pki",
        "certificate", "cryptograph", "post-quantum", "secrets management",
        "data vault", "consent management", "data diode", "data classification",
        "data discovery", "sensitive data",
    ],
    "Identity & Access": [
        "iam", "ciam", "identity", "pam", "privileged access", "iga",
        "identity governance", "sso", "single sign", "mfa", "multi-factor",
        "authentication", "authorization", "passwordless", "access management",
        "access control", "directory service", "active directory", "entra",
        "credential", "biometric", "kyc", "ekyc", "verification", "fido",
        "session management", "password vault", "entitlement",
    ],
    "Exposure & Offensive Security": [
        "vulnerability", "vulnerability assessment", "risk visibility",
        "security assessment", "security audit", "risk score",
        "vulnerability management", "exposure management", "attack surface",
        "asm", "easm", "ctem", "breach and attack", "attack simulation",
        "security rating", "cyber risk", "risk quantification", "patch management",
        "attack path", "exploit", "cve", "security posture", "caasm",
        "third-party risk", "tprm", "vendor risk", "supply chain risk",
    ],
    "OT & IoT Security": [
        "ot security", "ics security", "scada", "industrial security", "iot security",
        "iomt", "medical device security", "critical infrastructure",
        "operational technology",
    ],
    "Governance, Risk & Compliance": [
        "pci-dss", "pci dss", "nis2", "dora", "iso 27701", "sox",
        "ccpa", "fedramp", "cmmc", "swift", "rbi guideline",
        "data residency", "sebi", "hitrust",
        "grc", "compliance", "audit", "iso 27001", "soc 2", "pci", "hipaa",
        "gdpr", "dpdp", "nist", "regulatory", "governance", "policy management",
        "risk management", "risk assessment", "internal control", "esg",
        "security awareness", "phishing simulation", "awareness training",
    ],
    "AI & Machine Learning": [
        "ai", "ml", "intelligent automation", "cognitive",
        "artificial intelligence", "machine learning", "deep learning", "genai",
        "generative ai", "llm", "large language", "ai agent", "agentic",
        "ai security", "ai governance", "mlops", "model training", "inference",
        "computer vision", "nlp", "natural language", "chatbot", "copilot",
        "vector search", "vector database", "rag", "prompt", "ai platform",
        "ai model", "ml model", "neural",
    ],
    "Data & Analytics": [
        "search", "semantic search", "data recovery", "file recovery",
        "blockchain", "distributed ledger", "data science", "insight",
        "analytics", "business intelligence", "data warehouse", "data lake",
        "lakehouse", "etl", "elt", "data pipeline", "data integration",
        "data engineering", "data catalog", "data governance", "master data",
        "data quality", "data virtualization", "data fabric", "data mesh",
        "database", "nosql", "sql", "olap", "htap", "streaming", "kafka",
        "real-time data", "data visualization", "dashboard", "reporting",
        "data management", "data platform", "big data", "observability",
        "telemetry", "metrics", "geospatial", "gis", "lidar", "remote sensing",
    ],
    "Cloud & Infrastructure": [
        "aws", "amazon web services", "azure", "gcp", "google cloud",
        "hyperscaler", "s3", "ec2", "cloud native", "devops platform",
        "cloud", "kubernetes", "container", "docker", "openshift", "openstack",
        "virtualization", "hypervisor", "vmware", "server", "compute", "storage",
        "backup", "disaster recovery", "high availability", "data center",
        "datacenter", "colocation", "hosting", "infrastructure", "migration",
        "hybrid cloud", "multi-cloud", "private cloud", "public cloud", "iaas",
        "paas", "saas", "gpu", "hpc", "edge computing", "bare metal", "vps",
        "load balancer", "autoscaling", "finops", "cloud cost",
    ],
    "Networking & Connectivity": [
        "mobile", "mobility", "satellite", "iot", "m2m",
        "sd-wan", "networking", "network", "router", "switch", "wifi", "wi-fi",
        "wireless", "lan", "wan", "5g", "lte", "broadband", "connectivity",
        "bandwidth", "dns", "dhcp", "ipam", "ddi", "cdn", "content delivery",
        "peering", "interconnect", "mpls", "ethernet", "fiber", "telecom",
    ],
    "Application & DevOps": [
        "api", "sdk", "containeri", "software engineering",
        "product engineering", "digital engineering", "web development",
        "devops", "ci/cd", "cicd", "continuous integration", "continuous delivery",
        "api gateway", "api management", "microservice", "low-code", "no-code",
        "application development", "app development", "software development",
        "test automation", "quality engineering", "application performance",
        "apm", "application modernization", "middleware", "service mesh",
        "version control", "release management", "platform engineering",
    ],
    "IT Operations & Endpoint Management": [
        "automation", "monitor", "ticketing", "knowledge management",
        "managed service", "it service", "it support",
        "deployment", "digital workplace", "digital transformation",
        "itsm", "itom", "service management", "help desk", "helpdesk",
        "endpoint management", "unified endpoint", "uem", "mdm", "emm",
        "device management", "asset management", "patching", "software distribution",
        "remote access", "remote support", "remote monitoring", "rmm",
        "digital experience monitoring", "it operations", "aiops", "monitoring",
        "provisioning", "configuration management", "kiosk", "vdi",
        "virtual desktop", "workspace",
    ],
    "Business Applications": [
        "payment", "payments", "e-commerce", "commerce", "loyalty",
        "erp", "crm", "hcm", "hris", "payroll", "workforce management",
        "procurement", "e-procurement", "spend management", "supply chain",
        "warehouse management", "transportation management", "order management",
        "billing", "invoicing", "e-invoicing", "contact center", "cpaas",
        "customer experience", "marketing automation", "collaboration",
        "content management", "document management", "workflow automation",
        "business process", "rpa", "robotic process", "esignature", "e-signature",
        "digital signature", "tax compliance",
    ],
}

# Each domain rolls up to one of the nine categories already used in the sheet.
DOMAIN_TO_CATEGORY = {
    "Security Operations": "Cybersecurity & Risk",
    "Network Security": "Cybersecurity & Risk",
    "Endpoint Security": "Cybersecurity & Risk",
    "Cloud Security": "Cybersecurity & Risk",
    "Application Security": "Cybersecurity & Risk",
    "Data Security & Privacy": "Cybersecurity & Risk",
    "Exposure & Offensive Security": "Cybersecurity & Risk",
    "OT & IoT Security": "Cybersecurity & Risk",
    "Identity & Access": "Identity & Access",
    "Governance, Risk & Compliance": "Governance & Compliance",
    "AI & Machine Learning": "AI & Machine Learning",
    "Data & Analytics": "Data & Analytics",
    "Cloud & Infrastructure": "Cloud & Infrastructure",
    "Networking & Connectivity": "Cloud & Infrastructure",
    "Application & DevOps": "Application & DevSecOps",
    "IT Operations & Endpoint Management": "Business Applications & IT",
    "Business Applications": "Business Applications & IT",
}
