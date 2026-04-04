#!/usr/bin/env bats

@test "CLI application fetches LinkedIn job data" {
  run ./bin/thaty --url https://www.linkedin.com/jobs/view/3989104441
  [ "$status" -eq 0 ]
  [ -f "3989104441.md" ]
  [ "$(head -n 1 3989104441.md)" = "# CTO & Startup Founder" ]
}
