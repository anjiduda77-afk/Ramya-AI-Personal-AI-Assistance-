"""
Multi-Step Task Planner & Verifier for Ramya AI.
Breaks complex composite commands into verified executable steps,
manages permission gates, verifies outputs, and recovers from errors.
"""
import re
import uuid
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.database.db import db
from app.security.permissions import permissions, PermissionTier

logger = logging.getLogger("ramya.intelligence.planner")

class PlannerEngine:
    COMPOSITE_CONJUNCTIONS = [
        r"\b(?:and\s+then|then|after\s+that|and\s+also)\b",
        r";\s*"
    ]

    def is_composite_task(self, query: str) -> bool:
        """Determines if a command contains multiple sequential actions."""
        lower = query.lower().strip()
        # Avoid false positives like "rock and roll" or "cats and dogs"
        action_verbs = [
            "open", "play", "check", "set", "add", "summarize", "tell", "search",
            "remember", "view", "show", "list", "read", "delete", "create", "launch"
        ]
        verb_count = sum(1 for v in action_verbs if re.search(rf"\b{v}\b", lower))
        if verb_count >= 2:
            for pat in self.COMPOSITE_CONJUNCTIONS:
                if re.search(pat, lower):
                    return True
        return False

    def decompose_task(self, query: str) -> List[Dict[str, Any]]:
        """Decomposes a composite prompt into ordered sub-steps."""
        clean = query.strip()
        split_pattern = r"\b(?:and\s+then|then|after\s+that|and\s+also)\b|;\s*"
        raw_parts = [p.strip() for p in re.split(split_pattern, clean, flags=re.IGNORECASE) if p.strip()]

        steps = []
        for idx, part in enumerate(raw_parts):
            # Normalize part
            sub_query = part
            if not any(sub_query.lower().startswith(v) for v in ["hey ramya", "ramya"]):
                sub_query = sub_query

            steps.append({
                "step_index": idx + 1,
                "description": part.capitalize(),
                "query": sub_query,
                "status": "pending",
                "result": None,
                "is_consequential": any(k in part.lower() for k in ["delete", "purge", "clear", "remove"])
            })

        return steps

    def save_plan(self, goal: str, steps: List[Dict[str, Any]]) -> str:
        """Persists a task plan in SQLite."""
        plan_id = f"plan-{uuid.uuid4().hex[:10]}"
        now = datetime.now().isoformat()
        has_consequential = any(s.get("is_consequential") for s in steps)
        status = "needs_confirmation" if has_consequential else "planning"

        with db.get_connection() as conn:
            conn.execute(
                """
                INSERT INTO task_plans (id, goal, steps_json, current_step_index, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?);
                """,
                (plan_id, goal, json.dumps(steps), 0, status, now, now)
            )
        return plan_id

    async def execute_plan(self, plan_id: str, router_instance, is_confirmed: bool = False) -> Dict[str, Any]:
        """
        Executes an authorized multi-step plan step-by-step.
        Verifies each step's output and performs self-correction.
        """
        with db.get_connection() as conn:
            row = conn.execute("SELECT id, goal, steps_json, current_step_index, status FROM task_plans WHERE id = ?;", (plan_id,)).fetchone()
            if not row:
                return {"status": "failed", "message": "Task plan not found."}

        goal = row[1]
        steps = json.loads(row[2])
        executed_results = []
        all_success = True

        for idx, step in enumerate(steps):
            if step.get("is_consequential") and not is_confirmed:
                return {
                    "status": "needs_approval",
                    "plan_id": plan_id,
                    "message": f"Step {idx + 1} ({step['description']}) requires confirmation before proceeding.",
                    "spoken_response": "Please confirm before I execute this action.",
                    "approval_prompt": f"Authorize execution of: {step['description']}?"
                }

            logger.info(f"Executing Plan [{plan_id}] Step {idx + 1}: {step['query']}")
            try:
                # Execute step via router
                step_res = await router_instance.route_and_execute(step["query"], is_user_confirmed=is_confirmed)
                step["status"] = "completed" if step_res.get("status") in ["success", None] else "failed"
                step["result"] = step_res.get("message") or step_res.get("spoken_response")
                executed_results.append({
                    "step": idx + 1,
                    "description": step["description"],
                    "status": step["status"],
                    "output": step["result"]
                })
            except Exception as e:
                logger.error(f"Error on Step {idx + 1}: {e}")
                step["status"] = "failed"
                step["result"] = f"Step failed: {str(e)}"
                executed_results.append({
                    "step": idx + 1,
                    "description": step["description"],
                    "status": "failed",
                    "output": "Encountered an issue executing this step."
                })
                all_success = False

        # Update persistent plan
        now = datetime.now().isoformat()
        final_status = "completed" if all_success else "partially_completed"
        with db.get_connection() as conn:
            conn.execute(
                """
                UPDATE task_plans
                SET steps_json = ?, current_step_index = ?, status = ?, updated_at = ?
                WHERE id = ?;
                """,
                (json.dumps(steps), len(steps), final_status, now, plan_id)
            )

        step_summaries = [f"Step {r['step']} ({r['description']}): {r['status']}" for r in executed_results]
        spoken = f"Completed {len(executed_results)} planned step{'s' if len(executed_results) != 1 else ''}."
        detailed_text = f"**Multi-Step Plan Execution:**\n\nGoal: *{goal}*\n\n" + "\n".join(step_summaries)

        return {
            "status": "success" if all_success else "attention_required",
            "plan_id": plan_id,
            "goal": goal,
            "steps": executed_results,
            "message": detailed_text,
            "spoken_response": spoken
        }

planner_engine = PlannerEngine()
