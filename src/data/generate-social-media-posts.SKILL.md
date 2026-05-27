---
name: flushing-tech-social
description: >
  Generates Instagram and LinkedIn captions for Flushing Tech hackathon recap posts.
  Use this skill whenever the user provides hackathon project names, descriptions, and
  winner categories and wants to generate a social media post — even if they just say
  "write a caption", "make a post", or "recap hackathon X". Always use this skill for
  any Flushing Tech hackathon social media output. The skill enforces the correct post
  structure, winner badge format, hashtag rules, sponsor line, and RSVP link.
---
 
# Flushing Tech Social Media Caption Skill
 
## Purpose
Generate engaging Instagram and LinkedIn captions for Flushing Tech hackathons that:
- Showcase creativity and technical depth of projects
- Highlight winners and notable projects
- Teach viewers something interesting concisely
- Encourage attendance at future Flushing Tech events
## Organization Background
Flushing Tech is a non-profit bringing together tech enthusiasts in and around Flushing, NYC. Its flagship event is a 2-hour self-organized free-form hackathon where participants brainstorm, form teams, build prototypes, demo projects, and vote in four categories: Overall, Technical, Impactful, Creative.
 
---
 
## Post Structure (always follow this order)
 
### 1. Opening Line
Format: `#Hackathon [N]` followed by a one-sentence summary of the overall vibe and themes.
 
Example:
`#Hackathon 9 explored how thoughtful design and simulation can reshape digital experiences — from mood-aware social feeds to immersive training tools and bold new UI frameworks!`
 
**Important:** Increment the hackathon number by 1 from the last known number unless the user specifies.
 
---
 
### 2. RSVP Line (always include exactly)
`Join Flushing Tech's next Hackathon: https://www.meetup.com/flushingtech.
We meet every 2 weeks to build for fun, make new connections, and learn new things together. No judges, no pressure, and the only prizes is a room full of cheers!`
 
---
 
### 3. Key Takeaways Section
Heading (use exactly):
`✨ Key Takeaways from the Winners:`
 
For each project:
- Project name as heading with winner badge(s) in brackets
- 1–2 concise sentences: what was built, why it's interesting, what viewers can learn
- Tone: energetic, technical, accessible
**Winner Badges:**
- 👑 Overall Winner
- 💻 Technical Winner
- 💥 Impactful Winner
- 🎨 Creative Winner
- 🏅 Honorable Mention
Combine when a project wins multiple categories:
`Project Name [👑 Overall + 💻 Technical Winner]`
 
---
 
### 4. Community Tagline (always include exactly)
`#FlushingTech: Bringing Tech Enthusiasts Together, One Bold Project at a Time!`
 
---
 
### 5. Sponsor Thanks (always include exactly)
`Special thanks to @qctechincubator for providing us with the awesome space, and @ginosofkissena for the amazing pizza!`
 
---
 
### 6. Hashtags
End with only these — no others:
```
#Hackathon #FlushingTech #TechCommunity
```
Technical terms (e.g. #AI, #DevOps) may appear **inline** within project descriptions when natural, but do NOT add extra hashtags at the end.
 
---
 
## Writing Style
- Concise but exciting
- Professional with fun energy
- Technical concepts understandable to non-experts
- Avoid corporate language
- Emphasize experimentation, learning, collaboration
- Community-driven and welcoming
---
 
## Input Format
User provides project names, short descriptions, and winner categories. Example:
```
- VisionAI [overall, most technical, most creative]: real-time computer vision inference system for uncertain environments.
- ZipFind [impactful]: AI-powered ZIP code analysis web app using open datasets.
```
 
---
 
## Output Template
```
#Hackathon X [summary sentence]

Join Flushing Tech's next Hackathon: https://www.meetup.com/flushingtech.
We meet every 2 weeks to build for fun, make new connections, and learn new things together. No judges, no pressure, and the only prizes is a room full of cheers!

✨ Key Takeaways from the Winners:
 
Project Name [winner badges]
Description.
 
Project Name [winner badges]
Description.
 
#FlushingTech: Bringing Tech Enthusiasts Together, One Bold Project at a Time!
 
Special thanks to @qctechincubator for providing us with the awesome space, and @ginosofkissena for the amazing pizza!
 
#Hackathon #FlushingTech #TechCommunity
```