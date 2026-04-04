---
name: {{name}} <br><small>{{tagline}}</small>
header:
  - text: <span class="iconify" data-icon="tabler:phone"></span> {{phone}}
    link: tel:{{phone_link}}
  - text: <span class="iconify" data-icon="tabler:mail"></span> {{email}}
    link: mailto:{{email}}
  - text: <span class="iconify" data-icon="tabler:brand-github"></span> {{github}}
    link: https://github.com/{{github}}
  - text: <span class="iconify" data-icon="tabler:brand-linkedin"></span> {{linkedin}}
    link: https://www.linkedin.com/in/{{linkedin}}/
  - text: <span class="iconify" data-icon="charm:person"></span> {{website}}
    link: {{website}}
    newLine: true
  - text: <span class="iconify" data-icon="ic:outline-location-on"></span> {{location}}
  - text: <span class="iconify" data-icon="mdi:passport-biometric"></span> {{visa}}
---

## Work Experience <span>{{years_experience}}+ years</span>

{{#jobs}}
**{{title}}** | {{company}}
  ~ {{city}} | {{start_date}} - {{end_date}}

{{#achievements}}
- {{{.}}}
{{/achievements}}

{{/jobs}}

## Education

{{#education}}
**{{institution}}**
  ~ {{city}}

{{degree}}
  ~ {{start_date}} - {{end_date}}

{{/education}}

## Skills

{{#skill_groups}}
**{{category}}:** {{{skills}}}
{{/skill_groups}}
