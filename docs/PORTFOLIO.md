# Portfolio presentation and deployment notes

## Recommended presentation

Give SkillForge its own case-study page on the personal portfolio. Include:

- The audience and problem: designers turning references into actionable AI implementation instructions.
- The designer's role and an honest account of AI-assisted implementation.
- Three key interactions: reference input, visual refinement/comparison, and live Skill handoff.
- Screenshots or a short narrated recording showing one coherent task.
- Design rationale, implementation trade-offs, current limitations and next steps.
- Separate **View source** and **Try demo** links once those destinations exist.

Do not describe the prototype as production-ready or invent usability metrics. A job reviewer should be able to understand the project without creating an account or buying API credits.

## Public demo options

### Curated interactive demo

Provide pre-generated sample projects for visitors to inspect, adjust and export, with live paid AI actions clearly disabled. This is a proposed deployment mode, not yet implemented. It offers a predictable review experience without exposing an unrestricted paid endpoint.

### Live AI demo

Deploy the Node server and frontend together on a Node web-service host. Before launch:

1. Configure a production bind address, public origin, allowed hosts and HTTPS proxy behavior. The current server intentionally accepts only local host/origin values.
2. Store the API key in the hosting provider's environment configuration, never in frontend assets, Git or screenshots.
3. Add visitor authentication or controlled demo access, request quotas and spending limits. The local single-request concurrency guard is not a public abuse-control system.
4. Define timeout handling and a clear limit/retry experience for visitors.
5. Confirm privacy messaging and explain browser-only project storage.
6. Test reference fetching, screenshot uploads, autosave, AI cancellation and downloads against the public origin.

Do not create a public live endpoint until these requirements are implemented and hosting/cost decisions are approved.

## Adding it to a personal website

The simplest integration is a project card linking to a case study, plus a button opening the deployed demo in a new tab. A subdomain such as `skillforge.your-domain.example` can point to the demo host after DNS is configured. This is an example, not an existing address.

An iframe is optional, but a separate page is usually easier to use for a workspace with fullscreen dialogs, uploads and substantial screen-space needs. Embedding also depends on the portfolio platform and the demo's framing policy.

A localhost URL points to the visitor's own computer. It cannot serve this project to recruiters. Publishing the repository alone does not automatically deploy the application.

## Primary documentation

- [GitHub Pages is static hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- [Render Node web services](https://render.com/docs/web-services)
