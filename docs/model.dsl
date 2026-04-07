model {

    user = person "Resume Author" "The human writing and tailoring resumes for job applications. Assigns a db/ directory containing their resume data."

    linkedin = softwareSystem "LinkedIn" "Professional networking platform with job postings." {
        tags "External"
    }

    ollama = softwareSystem "Ollama" "Local LLM inference server running nomic-embed-text for embeddings." {
        tags "External"
    }

    resumeSkill = softwareSystem "Resume Skill System" "AI-assisted system for writing, tailoring, and rendering resumes." {

        agentRuntime = container "Agent Runtime" "AI coding agent runtime operating from the user's db/ directory as its working directory. Claude Desktop and Codex both load the same skills and MCP servers to execute resume workflows." "Claude Code / Codex" {
            tags "Agent"
        }

        thateDb = container "db" "User-assigned data directory storing resumes, job descriptions, achievements, base.yaml, contact.yaml, and priorities.yaml." "Git, YAML, Markdown" {
            tags "DataStore"
        }

        writeResumePlugin = container "write-resume-plugin" "Shared skill package that orchestrates the full resume workflow: fetch, lint, analyze, synthesize, render, harvest." "Claude Skill, Codex Skill, Bash, Mustache" {
            tags "Orchestrator"
        }

        resumeEmbeddings = container "resume-embeddings" "MCP server providing vector search over resume bullets with trust signals (groundedness, reuse, feedback)." "TypeScript, Vectra, MCP" {
            tags "MCP"
        }

        linkedinFetcher = container "linkedin-fetcher" "MCP server that fetches LinkedIn job postings and converts them to Markdown." "TypeScript, Puppeteer, MCP" {
            tags "MCP"
        }

        ohmycvRender = container "oh-my-cv-render" "MCP server that renders Markdown resumes to styled PDFs with icon support." "TypeScript, Puppeteer, MCP" {
            tags "MCP"
        }
    }

    # User relationships
    user -> agentRuntime "Assigns db/ directory and delegates resume tasks to"

    # Agent runtime relationships
    agentRuntime -> thateDb "Uses as working directory"
    agentRuntime -> writeResumePlugin "Loads and executes skill commands (/fetch, /analyze, /synthesize)"
    agentRuntime -> linkedinFetcher "Connects via MCP"
    agentRuntime -> resumeEmbeddings "Connects via MCP"
    agentRuntime -> ohmycvRender "Connects via MCP"

    # Orchestrator relationships
    writeResumePlugin -> thateDb "Reads base.yaml, contact.yaml; writes resume YAMLs and rendered output"
    writeResumePlugin -> linkedinFetcher "Fetches job descriptions via fetch_job"
    writeResumePlugin -> resumeEmbeddings "Queries similar bullets, harvests new bullets, records feedback"
    writeResumePlugin -> ohmycvRender "Renders Markdown to PDF via render_resume"

    # MCP server relationships
    linkedinFetcher -> linkedin "Scrapes job postings from"
    resumeEmbeddings -> ollama "Generates embeddings via nomic-embed-text"
    resumeEmbeddings -> thateDb "Reads resume YAMLs during harvest"
}
