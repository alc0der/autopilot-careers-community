views {

    systemContext resumeSkill "SystemContext" "High-level view of the Resume Skill System and its external dependencies." {
        include *
        autolayout lr
    }

    container resumeSkill "Containers" "Internal containers showing the skill package, data directory, and MCP servers — with the Claude ecosystem as external actor." {
        include *
        autolayout lr
    }

    container claude "ClaudeEcosystem" "Claude Desktop (CoWork) and Claude Mobile (Dispatch) within the Claude ecosystem." {
        include *
        autolayout lr
    }

    component linkedinFetcher "FetcherComponents" "Internal components of the linkedin-fetcher MCP server." {
        include *
        autolayout
    }

    dynamic resumeSkill "ColdStart" "Scenario: embedding database wiped. User requests a resume via CoWork, system bootstraps with empty index then rebuilds over successive resumes. Per ADR 0004, the skill is the sole filesystem owner — MCP servers receive inline content, not paths." {
        claudeDesktop -> writeResumePlugin "Invokes /fetch with job URL"
        writeResumePlugin -> linkedinFetcher "Calls fetch_job"
        linkedinFetcher -> linkedin "Scrapes job posting"
        writeResumePlugin -> thateDb "Saves raw JD to db/jd-linted/"
        claudeDesktop -> writeResumePlugin "Invokes /analyze"
        writeResumePlugin -> thateDb "Reads base.yaml and prior resumes for context"
        writeResumePlugin -> thateDb "Saves annotated JD to db/jd-analyzed/"
        claudeDesktop -> writeResumePlugin "Invokes /synthesize"
        writeResumePlugin -> thateDb "Reads annotated JD"
        writeResumePlugin -> resumeEmbeddings "Queries similar bullets (sends jd_text inline; returns empty — cold start)"
        resumeEmbeddings -> ollama "Embeds query text"
        writeResumePlugin -> thateDb "Reads base.yaml, contact.yaml"
        writeResumePlugin -> thateDb "Writes new AI YAML to db/resumes/"
        writeResumePlugin -> thateDb "Reads rendered Markdown"
        writeResumePlugin -> ohmycvRender "Sends inline Markdown to render_resume; receives PDF bytes"
        writeResumePlugin -> thateDb "Writes decoded PDF to db/resumes/"
        writeResumePlugin -> thateDb "Reads new AI YAML for harvest"
        writeResumePlugin -> resumeEmbeddings "Harvests bullets (sends YAML content + filename inline)"
        resumeEmbeddings -> ollama "Embeds each bullet"
        autolayout lr
    }

    dynamic * "Dispatch" "Scenario: user dispatches a resume task from Claude Mobile, which routes it to Claude Desktop (CoWork) for execution." {
        user -> claude "Sends LinkedIn job URL from mobile"
        claude -> resumeSkill "Executes fetch, analyze, synthesize, render"
        resumeSkill -> linkedin "Fetches job posting"
        claude -> user "Delivers completed resume"
        autolayout lr
    }

    deployment * "Plugin Distribution (Claude)" "DeploymentClaudePlugin" "How the Claude Desktop plugin zip is built on the workstation and deployed to CoWork, plus MCP server entries written to claude_desktop_config.json." {
        include *
        autolayout lr
    }

    deployment * "Plugin Distribution (Codex)" "DeploymentCodexPlugin" "How the Codex plugin zip is built on the workstation, extracted to the project directory, synced to the Codex CLI cache, and loaded by Codex Desktop." {
        include *
        autolayout lr
    }

    deployment * "Local (stdio)" "DeploymentStdio" "MCP servers as pnpm child processes on the developer machine." {
        include *
        autolayout lr
    }

    deployment * "Local (container)" "DeploymentContainer" "MCP servers as OCI containers, bridged via mcp-remote." {
        include *
        autolayout lr
    }

    deployment * "Hosted" "DeploymentHosted" "MCP servers hosted at mcp.autopilot.careers." {
        include *
        autolayout lr
    }

    styles {
        element "Person" {
            shape Person
            background #08427B
            color #FFFFFF
        }
        element "Software System" {
            background #1168BD
            color #FFFFFF
        }
        element "External" {
            background #999999
            color #FFFFFF
        }
        element "Container" {
            background #438DD5
            color #FFFFFF
        }
        element "DataStore" {
            shape Cylinder
            background #85BBF0
            color #000000
        }
        element "Orchestrator" {
            background #2D882D
            color #FFFFFF
        }
        element "MCP" {
            background #438DD5
            color #FFFFFF
        }
        element "Agent" {
            shape Robot
            background #DA7756
            color #FFFFFF
        }
        element "Infrastructure Node" {
            shape Pipe
            background #999999
            color #FFFFFF
        }
    }
}
