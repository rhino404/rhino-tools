---
title: "What Is Infrastructure as Code? A Plain-English Guide for Developers"
slug: what-is-infrastructure-as-code
description: "Infrastructure as code lets you define servers, networks, and databases in version-controlled files instead of clicking through consoles. Here's why it matters."
track: devops/iac
tags: [iac, terraform, automation, declarative, provisioning]
datePublished: 2026-07-01
readingTime: 7
excerpt: "Ever wonder who changed that load balancer at 2 a.m.? IaC is the answer — define your entire infrastructure in code, check it into git, and provision identical environments in minutes. Here's what it means and why it matters in 2026."
sources_json: [{"title":"What is Terraform?","url":"https://developer.hashicorp.com/terraform/intro","publisher":"HashiCorp","accessed":"2026-07-01"},{"title":"OpenTofu Introduction","url":"https://opentofu.org/docs/intro/","publisher":"OpenTofu","accessed":"2026-07-01"},{"title":"OpenTofu Manifesto","url":"https://opentofu.org/manifesto/","publisher":"OpenTofu","accessed":"2026-07-01"},{"title":"What is AWS CloudFormation?","url":"https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html","publisher":"Amazon Web Services","accessed":"2026-07-01"},{"title":"What is Ansible?","url":"https://docs.ansible.com/ansible/latest/getting_started/introduction.html","publisher":"Red Hat","accessed":"2026-07-01"}]
status: ready
---

**Infrastructure as code (IaC)** is the practice of defining and managing your infrastructure — servers, networks, databases, load balancers, DNS records — in text files that are checked into version control, rather than through manual clicks in a cloud console or one-off shell commands. If you've heard a colleague mention Terraform, or seen an AWS CloudFormation template in a repository and wondered what it was for, you've already brushed up against IaC. Understanding it changes how you think about environments, reliability, and team collaboration.

> **TL;DR:** IaC means your infrastructure is defined in code files, stored in git, and applied by a tool rather than configured by hand. You get version history, reproducible environments, and peer review for infrastructure changes — the same benefits your application code already gets from source control.

## What does "infrastructure as code" actually mean?

Before IaC became common practice, setting up a new environment meant logging into a cloud console, clicking through wizards, running shell commands, and hoping you remembered every step. The result was often an environment that worked but that nobody could fully document, reproduce, or safely change. When something broke at 2 a.m., there was no audit trail for who modified what — and standing up an identical staging environment could take hours or days.

IaC solves this by treating infrastructure configuration the same way developers treat application code. You write a file that describes the resources you want — "I need a virtual machine with 4 CPUs, a security group allowing HTTPS traffic, and a managed database on the same VPC" — commit that file to git, and run a tool that provisions exactly what you described. The cloud console becomes a read-only view of what your code declared, not a place where changes are made.

## What are the benefits of Infrastructure as Code?

The benefits are concrete and significant, particularly for teams that have experienced the pain of managing infrastructure by hand:

- **Version history.** Every infrastructure change goes through a commit. You can see who changed what, when, and why — and roll back to any previous state.
- **Reproducibility.** The same code that provisions your production environment creates an identical staging environment. No more "it works in staging" mysteries caused by configuration differences.
- **Speed.** What takes hours of manual console work — provisioning a full environment — takes minutes when driven by a tool. Teams can create and destroy environments on demand.
- **Peer review.** Infrastructure changes go through pull requests, just like application code. A second engineer can catch a misconfigured security group before it ever reaches production.
- **Reduced configuration drift.** Drift occurs when someone manually tweaks a server or adds a rule directly in the console, leaving the real environment out of sync with what the team thinks it looks like. When the declared state is authoritative, drift becomes visible and addressable.

> **Exam tip:** Configuration drift is one of the most commonly tested IaC concepts. It describes the gap between what your code declares and what actually exists in your cloud environment — usually caused by manual changes made outside of the IaC workflow.

## What is declarative vs. imperative IaC?

There are two broad styles of IaC, and understanding the difference helps you choose tools and reason about how they behave.

**Declarative IaC** means you describe the desired end state — "I want three EC2 instances, one S3 bucket, and this IAM role" — and the tool determines how to make reality match that description. You don't write the steps to get there; the tool handles sequencing, dependencies, and identifying what already exists versus what needs to change. Terraform, OpenTofu, AWS CloudFormation, and Pulumi are all declarative tools. This is the dominant style in modern IaC.

**Imperative (procedural) IaC** means you write a sequence of instructions: create this resource, then configure it, then attach it to that. The tool follows your steps in order. Ansible playbooks are a well-known example of this style, though Ansible has evolved to support more declarative patterns over time. Shell scripts that call cloud CLIs are another classic example.

The practical difference matters most when you re-run the same code. A declarative tool compares your declared state to the current state and makes only the necessary changes — it's inherently safe to run multiple times. An imperative script that creates a resource will create it again if you run it a second time, resulting in duplicates unless you add your own guards.

## What is idempotency, and why does it matter?

**Idempotency** means that running the same operation multiple times produces the same result as running it once. It's a term borrowed from mathematics, but in IaC it has a very practical meaning: you can apply your infrastructure code again and again without creating duplicate resources or accumulating unintended changes.

Consider the difference between a shell script and a declarative IaC tool. A shell script that runs `aws ec2 run-instances ...` creates a new virtual machine every time you execute it. If you run it three times, you have three machines. A Terraform or OpenTofu configuration that declares `count = 1` for that same machine will compare the declared count against what exists and do nothing if the machine is already running. It reaches the same end state regardless of how many times you apply it.

This property is what makes IaC automation trustworthy. You can apply your configuration as part of a CI/CD pipeline on every merge, or after an incident, or to recover from a partial failure — without worrying that you'll accidentally double your infrastructure.

## What is state, and what is drift?

Declarative tools like Terraform and OpenTofu maintain a **state file** — a record that maps every resource declared in your code to the real resource it corresponds to in your cloud account. When you run `terraform apply`, the tool reads the state file, compares it against your current code, and computes a plan of what needs to be created, modified, or destroyed.

**Drift** is what happens when someone modifies real infrastructure outside of the IaC workflow — changing a security group rule in the console, resizing a database manually, or deleting a resource directly. The state file no longer matches reality. The next time you run your IaC tool, it will either try to revert those manual changes (if the declared state hasn't changed) or behave unpredictably.

This is why IaC is as much a discipline as a tool choice. The technical setup is straightforward; the harder part is the team agreement that all infrastructure changes flow through code and pull requests, and that the console is used only for reading, not for writing.

## What are the main IaC tools in 2026?

**Terraform** (HashiCorp) is the tool most people encounter first. It uses its own configuration language (HCL), supports thousands of cloud providers through a plugin ecosystem, and introduced the declarative, state-based approach that most modern IaC tools now follow. It remains widely used in enterprise environments.

**OpenTofu** is the community-maintained, open-source fork of Terraform, now a Linux Foundation project. The fork emerged after HashiCorp relicensed Terraform from the Mozilla Public License (MPL 2.0) to the Business Source License (BSL 1.1) in August 2023 — a change made without community input that introduced legal uncertainty for teams building products and services on top of Terraform. OpenTofu retains the MPL 2.0 license, is CLI-compatible with Terraform, and has shipped several features the upstream tool lacks, including built-in state file encryption (v1.7), early variable evaluation that allows variables in backend and module source blocks (v1.8), and provider-level `for_each` iteration (v1.9). For teams starting a greenfield project today, OpenTofu is worth evaluating alongside Terraform — the migration path is low friction, and the open governance model removes vendor licensing risk.

**AWS CloudFormation** is Amazon's native IaC service. You write templates in YAML or JSON that describe AWS resources, and CloudFormation provisions them as a logical unit called a **stack**. CloudFormation is AWS-specific but deeply integrated with the platform, making it a natural fit for teams that live entirely within the AWS ecosystem and prefer managed tooling with no third-party dependencies.

**Pulumi** lets you write infrastructure configuration in general-purpose programming languages — TypeScript, Python, Go, and others — rather than a domain-specific language like HCL. This appeals to teams that want full language features (loops, conditionals, libraries, type checking) and a single language across application and infrastructure code.

**Ansible** is primarily a configuration management and automation tool — used to install software, apply settings, and orchestrate changes on existing servers — but it can also provision cloud resources. Its playbook model is more procedural than the state-based approach of Terraform and OpenTofu, which makes it a different kind of tool rather than a direct alternative. Many teams use Ansible alongside a declarative provisioning tool: Terraform to stand up the servers, Ansible to configure what runs on them.

## Where does IaC fit with Docker, Kubernetes, and CI/CD?

IaC, containers, and CI/CD are often mentioned together but operate at different layers of the stack, and the distinctions matter.

**IaC is about provisioning infrastructure** — the virtual machines, networks, load balancers, managed databases, and DNS records that form the foundation of an environment. It answers the question: "What cloud resources need to exist?"

**Containers and orchestration are about running applications on that infrastructure.** Docker packages your application and its dependencies into a portable image. Kubernetes (or another orchestrator) manages where and how those containers run. These tools assume infrastructure already exists; they don't provision it. (A dedicated post on Docker vs Kubernetes covers that distinction in depth.)

**CI/CD pipelines are about moving code from a commit to a deployed state** — building, testing, scanning, and deploying application changes. IaC code itself can and should flow through a CI/CD pipeline: a pull request modifying a Terraform configuration can trigger a `terraform plan` in CI so reviewers see the exact changes before approving. See the [CI/CD beginners guide](/blog/what-is-cicd-beginners-guide/) for a full walkthrough of how pipelines work.

The three layers stack on each other: IaC provisions the infrastructure, containers run on it, and CI/CD pipelines automate the movement of changes through both layers.

## Frequently asked questions

**Do I need IaC for a small project or personal side project?**

Not necessarily — and starting with IaC just to learn it is completely reasonable even at small scale. The real payoff comes when an environment needs to be reproducible, shared across a team, or rebuilt from scratch after an incident. For a solo project with one server, the console is fine. For anything with more than one environment or more than one person, IaC saves significant time and reduces error.

**What is the difference between IaC and configuration management?**

IaC in the narrower sense refers to provisioning resources — telling a cloud provider to create a virtual machine. Configuration management (the domain of tools like Ansible, Chef, and Puppet) refers to controlling what's installed and configured on a machine after it exists. In practice, the lines blur: tools like Ansible can provision cloud resources, and Terraform can execute configuration scripts as part of provisioning. The distinction is useful for understanding what problem a tool was designed to solve.

**Is Terraform still relevant in 2026, or has OpenTofu replaced it?**

Both are in active use. Terraform remains dominant in organizations that adopted it before the license change, and HashiCorp (now owned by IBM) continues to maintain it. OpenTofu has gained significant traction, particularly for new projects and at companies that need an OSI-approved open-source license. The two tools share HCL syntax and most of the same provider ecosystem, so the choice is primarily about governance and feature roadmap rather than a major technical rewrite.
