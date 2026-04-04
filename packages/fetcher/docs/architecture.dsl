workspace {

  model {
      user = person "User" "Job seeker using Thaty"
      softwareSystem = softwareSystem "Thaty" {
          description "A system to automate job hunting."
          cliApp = container "CLI Application" {
              description "A CLI application"
              technology "Node.js, TypeScript"
              group "Core External Dependencies" {
                puppeteer = component "Puppeteer" {
                    description "Library for browser automation and LinkedIn interaction"
                }
                turndown = component "Turndown" {
                    description "Library for converting HTML to Markdown"
                }
                clackPrompts = component "@clack/prompts" {
                    description "Library for interactive command-line prompts"
                }
                readability = component "@mozilla/readability" {
                    description "Library for extracting main content from HTML"
                }
                puppeteer -> readability "full page to article"
                readability -> turndown "article to markdown"
              }
          }
      }
    user -> cliApp "Uses"
  }

  views {
    !script groovy {
        workspace.views.createDefaultViews()
    }

    dynamic softwareSystem "CLI_Usage" {
        user -> cliApp "Invokes command with LinkedIn job URL"
        cliApp -> user "Creates markdown file with job post content"
        autolayout
    }

    theme default
  }
}
