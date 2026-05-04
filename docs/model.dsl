model {

    user = person "Resume Author" "The human writing and tailoring resumes for job applications. Assigns a db/ directory containing their resume data."

    claude = softwareSystem "Claude" "Anthropic's AI assistant ecosystem: desktop app (CoWork) for agentic coding and mobile app for dispatching tasks." {
        tags "External"

        claudeDesktop = container "Claude Desktop" "AI coding agent (CoWork) that loads skills and MCP servers to execute resume workflows from the user's db/ directory." "Claude Code / Codex" {
            tags "Agent"
        }

        claudeMobile = container "Claude Mobile" "Mobile app interface for dispatching resume tasks to Claude Desktop (CoWork)." "Claude iOS / Android" {
            tags "Agent"
        }
    }

    linkedin = softwareSystem "LinkedIn" "Professional networking platform with job postings." {
        tags "External"
    }

    ollama = softwareSystem "Ollama" "Local LLM inference server running nomic-embed-text for embeddings." {
        tags "External"
    }

    resumeSkill = softwareSystem "Resume Skill System" "AI-assisted system for writing, tailoring, and rendering resumes." {

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
            !include ../packages/fetcher/docs/architecture.dsl
        }

        ohmycvRender = container "oh-my-cv-render" "MCP server that renders Markdown resumes to styled PDFs with icon support." "TypeScript, Puppeteer, MCP" {
            tags "MCP"
        }
    }

    # User relationships
    user -> claudeDesktop "Uses directly for resume tasks"
    user -> claudeMobile "Dispatches resume tasks via mobile"

    # Claude internal relationships
    claudeMobile -> claudeDesktop "Dispatches work to"

    # Claude Desktop -> Resume Skill System
    claudeDesktop -> writeResumePlugin "Loads and executes skill commands (/fetch, /analyze, /synthesize)"
    claudeDesktop -> thateDb "Uses as working directory"
    claudeDesktop -> linkedinFetcher "Connects via MCP"
    claudeDesktop -> resumeEmbeddings "Connects via MCP"
    claudeDesktop -> ohmycvRender "Connects via MCP"

    # Orchestrator relationships
    writeResumePlugin -> thateDb "Reads base.yaml, contact.yaml; writes resume YAMLs and rendered output"
    writeResumePlugin -> linkedinFetcher "Fetches job descriptions via fetch_job"
    writeResumePlugin -> resumeEmbeddings "Queries similar bullets, harvests new bullets, records feedback"
    writeResumePlugin -> ohmycvRender "Renders Markdown to PDF via render_resume"

    # MCP server relationships
    linkedinFetcher -> linkedin "Scrapes job postings from"
    resumeEmbeddings -> ollama "Generates embeddings via nomic-embed-text"
    resumeEmbeddings -> thateDb "Reads resume YAMLs during harvest"

    # ── Deployment environments ──────────────────────────────────────────────

    deploymentEnvironment "Local (stdio)" {
        deploymentNode "Developer Machine" "" "macOS" {
            deploymentNode "Claude Desktop" "" "Electron / CoWork" {
                containerInstance claudeDesktop
                containerInstance writeResumePlugin
            }
            deploymentNode "db/" "" "Local filesystem" {
                containerInstance thateDb
            }
            deploymentNode "pnpm Processes" "" "Node.js · stdio transport" {
                containerInstance linkedinFetcher
                containerInstance ohmycvRender
                containerInstance resumeEmbeddings
            }
            deploymentNode "Ollama" "" "localhost:11434" {
                softwareSystemInstance ollama
            }
        }
    }

    deploymentEnvironment "Local (container)" {
        deploymentNode "Developer Machine" "" "macOS" {
            deploymentNode "Claude Desktop" "" "Electron / CoWork" {
                containerInstance claudeDesktop
                containerInstance writeResumePlugin
            }
            deploymentNode "db/" "" "Local filesystem" {
                containerInstance thateDb
            }
            deploymentNode "OCI Containers" "" "Docker / Apple Container · compose.yaml" {
                deploymentNode "linkedin-fetcher :3001" "" "Node.js · HTTP" {
                    containerInstance linkedinFetcher
                }
                deploymentNode "oh-my-cv-render :3002" "" "Node.js · HTTP" {
                    containerInstance ohmycvRender
                }
                deploymentNode "bullet-embeddings :3003" "" "Node.js · HTTP" {
                    containerInstance resumeEmbeddings
                }
            }
            deploymentNode "Ollama" "" "host.containers.internal:11434" {
                softwareSystemInstance ollama
            }
        }
    }

    deploymentEnvironment "Plugin Distribution (Claude)" {
        deploymentNode "Workstation" "" "macOS · autopilot-careers monorepo" {
            deploymentNode "packages/agent-marketplace" "" "pnpm bundle" {
                claudeZip = infrastructureNode "write-resume-plugin-{v}.zip" "Claude Desktop plugin archive. Contains .claude-plugin/plugin.json, skills/, .mcp.json." "ZIP"
            }
            deploymentNode "scripts/claude_mcp.py" "" "python3 scripts/claude_mcp.py install" {
                mcpEntries = infrastructureNode "MCP server entries" "linkedin-fetcher · oh-my-cv-render · bullet-embeddings as npx mcp-remote stdio bridges." "JSON"
            }
        }

        deploymentNode "Claude Desktop" "" "~/Library/Application Support/Claude" {
            cdConfig = infrastructureNode "claude_desktop_config.json" "mcpServers entries written by claude_mcp.py install. Used by standalone Claude Desktop." "JSON"
            deploymentNode "CoWork session" "" "local-agent-mode-sessions/*/rpm/" {
                rpmDir = infrastructureNode "plugin_*/" "Extracted here by claude_plugin.py deploy. Contains skills/, .mcp.json, .claude-plugin/." "Plugin files"
            }
        }

        claudeZip -> rpmDir "extracted by claude_plugin.py deploy"
        mcpEntries -> cdConfig "written by claude_mcp.py install"
    }

    deploymentEnvironment "Plugin Distribution (Codex)" {
        deploymentNode "Workstation" "" "macOS · autopilot-careers monorepo" {
            deploymentNode "packages/agent-marketplace" "" "pnpm bundle" {
                codexZip = infrastructureNode "write-resume-plugin-codex-{v}.zip" "Codex plugin archive. Contains .codex-plugin/, skills/, .mcp.json." "ZIP"
            }
        }

        deploymentNode "Career on Autopilot project" "" "~/Documents/Projects/Career on Autopilot" {
            pluginSrc = infrastructureNode "plugin source" ".codex/plugins/write-resume-plugin/ — extracted from zip by publish_codex_plugin.py." "Plugin files"
            mktJson = infrastructureNode "marketplace.json" ".agents/plugins/marketplace.json — defines the autopilot-careers marketplace URL." "JSON"
        }

        deploymentNode "Codex CLI data" "" "~/.codex" {
            pluginCache = infrastructureNode "plugin cache" "plugins/cache/autopilot-careers/write-resume-plugin/local/ — synced from project source." "Plugin files"
            codexToml = infrastructureNode "config.toml" "[marketplaces.autopilot-careers] entry written by codex plugin marketplace add." "TOML"
        }

        deploymentNode "Codex Desktop" "" "Codex app · reads ~/.codex at launch" {
            codexLoaded = infrastructureNode "Loaded plugin" "Discovered via [marketplaces.autopilot-careers] in config.toml; plugin files read from cache." "Plugin files"
        }

        codexZip -> pluginSrc "extracted by publish_codex_plugin.py"
        codexZip -> pluginCache "synced by publish_codex_plugin.py"
        mktJson -> codexToml "registered by codex plugin marketplace add"
        pluginCache -> codexLoaded "loaded at startup"
    }

    deploymentEnvironment "Hosted" {
        deploymentNode "Developer Machine" "" "macOS" {
            deploymentNode "Claude Desktop" "" "Electron / CoWork" {
                containerInstance claudeDesktop
                containerInstance writeResumePlugin
            }
            deploymentNode "db/" "" "Local filesystem" {
                containerInstance thateDb
            }
        }
        deploymentNode "mcp.autopilot.careers" "" "Cloud · HTTPS" {
            containerInstance linkedinFetcher
            containerInstance ohmycvRender
            containerInstance resumeEmbeddings
            deploymentNode "Ollama" "" "localhost:11434" {
                softwareSystemInstance ollama
            }
        }
    }
}
