import { classifyJobPosting } from "./classifyJobPosting";

describe("classifyJobPosting", () => {
  it("classifies a talent pipeline posting", () => {
    const title = "Staff Software Engineer I";
    const body = `**Calling senior technology leaders to shape the future of engineering in the Middle East!**

Are you a senior tech leader with deep roots in the Middle East, looking for a way to bring your global experience back to the region?

We're looking to connect with senior tech professionals like you. If you've built and scaled complex engineering systems, we want to hear from you.

**We're Particularly Interested In Leaders Who**

- Lead Internal Engineering Initiatives
- Architect Scalable Solutions
- Drive Impact in Data & AI
- Mentorship and Knowledge Sharing`;

    expect(classifyJobPosting(title, body)).toBe("pipeline");
  });

  it("classifies a specific role posting", () => {
    const title = "Software Engineer III";
    const body = `**Overview**

We are seeking a **Software Engineer III** to support engineering initiatives.

**Key Responsibilities**

- Design, implement, test, and maintain software features
- Write clean, maintainable, and well-documented code

**Minimum Qualifications**

- Bachelor's degree in Computer Science or related field
- Experience in one or more general-purpose programming languages (C++, Java, Python, Go)
- Strong understanding of data structures, algorithms, and software design principles
- Experience with version control systems (e.g., Git)
- Familiarity with CI/CD pipelines and modern development workflows`;

    expect(classifyJobPosting(title, body)).toBe("specific-role");
  });

  it("classifies a generic posting with no requirements and no tech stack", () => {
    const title = "Senior Engineer";
    const body = `We are always looking for talented individuals to join our growing team.

If you are passionate about technology and want to make a difference, we'd love to hear from you.

Join our talent pool and we'll reach out when the right opportunity arises.`;

    expect(classifyJobPosting(title, body)).toBe("pipeline");
  });

  it("classifies a specific posting with requirements heading and tech mentions", () => {
    const title = "Backend Engineer";
    const body = `## About the Role

We are looking for a Backend Engineer to join our payments team.

## Requirements

- 5+ years of experience with Python and Django
- Experience with PostgreSQL and Redis
- Familiarity with AWS services (EC2, S3, Lambda)
- Strong understanding of RESTful API design

## Responsibilities

- Design and implement microservices
- Collaborate with frontend engineers`;

    expect(classifyJobPosting(title, body)).toBe("specific-role");
  });
});
