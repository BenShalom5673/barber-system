@AGENTS.md

---

# Memory System Rules

1. Before doing anything:
   - Always read `/PROJECT_MEMORY` completely
   - Especially `PROJECT_MASTER.md`, `CURRENT_STATE.md`, `RULES.md`

2. After finishing any meaningful task:
   - Update `CURRENT_STATE.md`
   - Update `CHANGELOG.md`
   - Update `NEXT_TASKS.md` (mark completed tasks and add new ones if needed)
   - Update `CHATGPT_CONTEXT.md` so it reflects the latest state

3. Never rely only on chat memory.
   `PROJECT_MEMORY` is the single source of truth.

4. If a new rule is introduced:
   - Add it to `RULES.md` immediately

5. If code structure changes:
   - Reflect it in `PROJECT_MASTER.md` and `CURRENT_STATE.md`

6. Always keep `CHATGPT_CONTEXT.md` short, clear, and optimized for copy-paste into ChatGPT.

7. Work in a way that a non-developer can understand the system through `PROJECT_MEMORY`.

8. If `PROJECT_MEMORY` is missing, outdated, or inconsistent:
   - Stop
   - Fix `PROJECT_MEMORY` first
   - Only then continue working
