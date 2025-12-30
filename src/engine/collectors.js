export function collect(entityType, input) {
  if (entityType === "Individual") {
    return {
      entity: "Individual",
      name: input.username || "Aarav Mehta",
      username: input.username || "aaravm",
      email: input.email || "aarav.mehta@protonmail.com",
      location: "Bengaluru, India",
      findings: {
        github: [
          "15 public repositories",
          "Commit email exposed",
          "Old API key found in commit history"
        ],
        social: [
          "High Twitter activity",
          "OSINT & security discussions",
          "Profile linked to GitHub"
        ],
        darkweb: [
          "Email referenced in 2021 credential dump"
        ],
        geo: [
          "Office proximity to tech parks",
          "Frequent location overlap with startup hubs"
        ]
      }
    };
  }

  return {
    entity: "Organization",
    name: input.domain || "SurakshaTech Solutions Pvt Ltd",
    domain: input.domain || "surakshatech.in",
    email: "admin@surakshatech.in",
    locations: ["Hyderabad", "Pune"],
    findings: {
      web: [
        "Exposed staging subdomain",
        "Directory listing enabled"
      ],
      github: [
        "Misconfigured repository",
        "Hardcoded credentials found"
      ],
      darkweb: [
        "Employee credential reference observed"
      ],
      geo: [
        "Multiple offices sharing infrastructure zones"
      ]
    }
  };
}
