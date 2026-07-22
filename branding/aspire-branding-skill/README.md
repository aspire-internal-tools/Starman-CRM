# Aspire Branding Skill

A self-contained brand kit for Aspire Investments & Insurance Ltd., written so an AI assistant can apply the branding without any other context.

## What is in here

- `SKILL.md`: the complete machine-readable brand reference. Colours, fonts, logo rules, and ready-to-paste CSS and Tailwind recipes.
- `assets/`: the four essential logo PNGs (colour and white, stacked and horizontal).

## How to use it with an AI

Pick whichever fits your setup:

1. **Paste it.** Open `SKILL.md`, copy the whole file into your chat (ChatGPT, Claude, whatever you use), then ask for what you want. Works everywhere.
2. **Attach it.** If your tool supports file uploads or a project knowledge folder, add `SKILL.md` there once and it applies to every chat in that project.
3. **Install it as a skill.** In Claude Code or another agent that supports skills, drop the whole `aspire-branding` folder into the skills directory (for Claude Code: `.claude/skills/aspire-branding/` in your project). The frontmatter in `SKILL.md` makes it trigger automatically when you mention Aspire branding.

Copy the files from `assets/` into your project wherever the tool needs the logo (for example a `public/` folder in a web app).

## Example prompt

> Here is our brand skill file. Restyle the attached client intake form to Aspire branding: use the web palette, Work Sans and Open Sans from Google Fonts, put the white horizontal logo in a dark green header, and add a version number and date in the footer.

## Where this came from

Extracted from the official Aspire brand guideline PDF (September 2021, Amplo Media). If something here disagrees with the guideline or the live website, the guideline and site win; flag the difference so this kit can be corrected.
