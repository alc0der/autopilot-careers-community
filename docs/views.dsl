views {

    systemContext resumeSkill "SystemContext" "High-level view of the Resume Skill System and its external dependencies." {
        include *
        autolayout lr
    }

    container resumeSkill "Containers" "Internal containers showing Claude CoWork as the agent, the db directory, skill plugin, and MCP servers." {
        include *
        autolayout lr
    }

    dynamic resumeSkill "ColdStart" "Scenario: embedding database wiped. User requests a resume, system bootstraps with empty index then rebuilds over successive resumes." {
        user -> claudeCowork "Requests a tailored resume for a LinkedIn job URL"
        claudeCowork -> writeResumePlugin "Invokes /fetch with job URL"
        writeResumePlugin -> linkedinFetcher "Calls fetch_job"
        linkedinFetcher -> linkedin "Scrapes job posting"
        writeResumePlugin -> thateDb "Saves raw JD to db/jd-linted/"
        claudeCowork -> writeResumePlugin "Invokes /analyze"
        writeResumePlugin -> thateDb "Reads base.yaml and prior resumes for context"
        writeResumePlugin -> thateDb "Saves annotated JD to db/jd-analyzed/"
        claudeCowork -> writeResumePlugin "Invokes /synthesize"
        writeResumePlugin -> resumeEmbeddings "Queries for similar bullets (returns empty — cold start)"
        resumeEmbeddings -> ollama "Embeds query text"
        writeResumePlugin -> thateDb "Reads base.yaml, contact.yaml"
        writeResumePlugin -> thateDb "Writes new AI YAML to db/resumes/"
        writeResumePlugin -> ohmycvRender "Renders Markdown to PDF"
        writeResumePlugin -> resumeEmbeddings "Harvests bullets from new resume"
        resumeEmbeddings -> ollama "Embeds each bullet"
        resumeEmbeddings -> thateDb "Reads resume YAML during harvest"
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
    }
}
