#!/usr/bin/env bash
# Blocks agent shell commands that merge, approve, label, or read secrets.
# Only a person does those things. Every other command is allowed.
set -euo pipefail

input=$(cat)

python3 - "$input" <<'PY'
import json
import os
import re
import shlex
import sys

payload = json.loads(sys.argv[1])
command = payload.get("command") or ""
if not isinstance(command, str):
    command = " ".join(str(part) for part in command)

ONLY_A_PERSON = "Only a person does this."

SECRET_RE = re.compile(
    r"(?<!\\)\$(?:\{)?(?:CURSOR_API_KEY|GH_TOKEN|GITHUB_TOKEN)\b"
)
API_LABEL_RE = re.compile(r"/labels(?=$|[/?#\s\"'])")
API_MERGE_RE = re.compile(r"/merge(?=$|[/?#\s\"'])")
API_REVIEW_RE = re.compile(r"/reviews(?=$|[/?#\s\"'])")
API_GQL_RE = re.compile(
    r"\b(?:mergePullRequest|addPullRequestReview|submitPullRequestReview"
    r"|updatePullRequestReview|addLabelsToLabelable)\b"
)

SHELLS = {"bash", "sh", "zsh", "dash", "ksh", "fish"}
WRAPPERS = {"sudo", "command", "builtin", "nohup", "time"}
ENV_TAKES_VALUE = {"-u", "--unset", "-C", "--chdir", "-P"}
GH_TAKES_VALUE = {
    "-R",
    "--repo",
    "--hostname",
    "--jq",
    "--template",
    "--cache",
    "-F",
    "--field",
    "-f",
    "--raw-field",
    "-H",
    "--header",
    "-X",
    "--method",
    "--input",
    "--body",
    "-b",
    "-t",
    "--title",
    "--body-file",
    "--add-label",
}


def emit(permission: str, detail: str | None = None) -> None:
    if permission == "allow":
        print(json.dumps({"permission": "allow"}))
        return
    message = ONLY_A_PERSON if not detail else f"{ONLY_A_PERSON} {detail}"
    print(
        json.dumps(
            {
                "permission": "deny",
                "user_message": message,
                "agent_message": message,
            }
        )
    )


def basename(word: str) -> str:
    return os.path.basename(word)


def split_commands(text: str) -> list[str]:
    """Split on shell operators, keeping quoted regions intact."""
    parts: list[str] = []
    buf: list[str] = []
    i = 0
    n = len(text)
    in_single = False
    in_double = False
    while i < n:
        c = text[i]
        if in_single:
            buf.append(c)
            if c == "'":
                in_single = False
            i += 1
            continue
        if in_double:
            buf.append(c)
            if c == "\\" and i + 1 < n:
                buf.append(text[i + 1])
                i += 2
                continue
            if c == '"':
                in_double = False
            i += 1
            continue
        if c == "'":
            in_single = True
            buf.append(c)
            i += 1
            continue
        if c == '"':
            in_double = True
            buf.append(c)
            i += 1
            continue
        if text.startswith("&&", i) or text.startswith("||", i):
            parts.append("".join(buf))
            buf = []
            i += 2
            continue
        if c in ";\n|&":
            parts.append("".join(buf))
            buf = []
            i += 1
            continue
        buf.append(c)
        i += 1
    parts.append("".join(buf))
    return [part.strip() for part in parts if part.strip()]


def strip_prefix(words: list[str]) -> list[str]:
    i = 0
    while i < len(words) and re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*=.*", words[i]):
        i += 1
    while i < len(words):
        if basename(words[i]) not in WRAPPERS:
            break
        i += 1
        while i < len(words) and words[i].startswith("-"):
            i += 1
    return words[i:]


def child_after_env(args: list[str]) -> list[str] | None:
    """Utility argv after `env` options, or None when env prints the environment."""
    i = 0
    while i < len(args):
        arg = args[i]
        if arg == "--":
            return args[i + 1 :] or None
        if arg in ("-S", "--split-string") and i + 1 < len(args):
            return ["bash", "-c", args[i + 1]]
        if arg.startswith("--split-string="):
            return ["bash", "-c", arg.split("=", 1)[1]]
        if arg in ENV_TAKES_VALUE:
            i += 2
            continue
        if arg.startswith("--unset=") or arg.startswith("--chdir=") or arg.startswith("--split-string="):
            i += 1
            continue
        if arg.startswith("-"):
            i += 1
            continue
        if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*=.*", arg):
            i += 1
            continue
        return args[i:]
    return None


def shell_script(words: list[str]) -> str | None:
    args = words[1:]
    i = 0
    while i < len(args):
        arg = args[i]
        if arg == "--":
            return None
        if not arg.startswith("-"):
            return None
        if arg == "-c" and i + 1 < len(args):
            return args[i + 1]
        if arg.startswith("-") and not arg.startswith("--") and "c" in arg[1:]:
            inline = arg.split("c", 1)[1]
            if inline:
                return inline
            if i + 1 < len(args):
                return args[i + 1]
        i += 1
    return None


def skip_gh_flag(args: list[str], index: int) -> int:
    arg = args[index]
    if arg in GH_TAKES_VALUE:
        return index + 2
    if arg.startswith("--") and "=" in arg:
        return index + 1
    return index + 1


def first_action(args: list[str]) -> str | None:
    i = 0
    while i < len(args):
        arg = args[i]
        if arg.startswith("-"):
            i = skip_gh_flag(args, i)
            continue
        return arg
    return None


def has_flag(args: list[str], flag: str) -> bool:
    """True when flag is present and is not the value of a preceding option."""
    i = 0
    while i < len(args):
        arg = args[i]
        if arg == flag or arg.startswith(flag + "="):
            return True
        if arg.startswith("-"):
            i = skip_gh_flag(args, i)
            continue
        i += 1
    return False


def gh_after_globals(args: list[str]) -> list[str]:
    i = 0
    while i < len(args):
        arg = args[i]
        if arg in {"-R", "--repo", "--hostname"}:
            i += 2
            continue
        if arg.startswith("--repo=") or arg.startswith("--hostname="):
            i += 1
            continue
        if arg.startswith("-"):
            i = skip_gh_flag(args, i)
            continue
        return args[i:]
    return []


def api_detail(args: list[str]) -> str | None:
    blob = " ".join(args)
    if API_LABEL_RE.search(blob) or "addLabelsToLabelable" in blob:
        return "Adding labels is not an agent action."
    if API_MERGE_RE.search(blob) or "mergePullRequest" in blob:
        return "Merging a pull request is not an agent action."
    if API_REVIEW_RE.search(blob) or API_GQL_RE.search(blob):
        return "Reviewing a pull request is not an agent action."
    return None


def gh_detail(words: list[str]) -> str | None:
    args = gh_after_globals(words[1:])
    if not args:
        return None
    sub = args[0]
    rest = args[1:]
    if sub == "label":
        return "Adding labels is not an agent action."
    if sub == "api":
        return api_detail(rest)
    action = first_action(rest)
    if sub == "pr" and action == "merge":
        return "Merging a pull request is not an agent action."
    if sub == "pr" and action == "review" and (
        has_flag(rest, "--approve") or has_flag(rest, "-a")
    ):
        return "Approving a pull request is not an agent action."
    if sub == "pr" and action == "edit" and has_flag(rest, "--add-label"):
        return "Adding labels is not an agent action."
    if sub == "issue" and action == "edit" and has_flag(rest, "--add-label"):
        return "Adding labels is not an agent action."
    return None


def evaluate(words: list[str], depth: int) -> str | None:
    if depth > 8:
        return ONLY_A_PERSON
    words = strip_prefix(words)
    if not words:
        return None
    name = basename(words[0])
    if name == "printenv":
        return "Printing the environment is not an agent action."
    if name == "env":
        child = child_after_env(words[1:])
        if child is None:
            return "Printing the environment is not an agent action."
        return evaluate(child, depth + 1)
    if name in SHELLS:
        script = shell_script(words)
        if script is not None:
            return analyze(script, depth + 1)
        return None
    if name == "eval" and len(words) > 1:
        return analyze(" ".join(words[1:]), depth + 1)
    if name == "gh":
        return gh_detail(words)
    return None


def analyze(text: str, depth: int = 0) -> str | None:
    if depth > 8:
        return ONLY_A_PERSON
    for segment in split_commands(text):
        try:
            words = shlex.split(segment, posix=True)
        except ValueError:
            if re.search(r"\bgh\s+pr\s+merge\b", segment):
                return "Merging a pull request is not an agent action."
            if re.search(r"\bgh\s+pr\s+review\b", segment) and "--approve" in segment:
                return "Approving a pull request is not an agent action."
            if "--add-label" in segment or re.search(r"\bgh\s+label\b", segment):
                return "Adding labels is not an agent action."
            if re.search(r"\bprintenv\b", segment) or re.search(r"(?:^|\s)env(?:\s|$)", segment):
                return "Printing the environment is not an agent action."
            continue
        detail = evaluate(words, depth)
        if detail:
            return detail
    if SECRET_RE.search(text):
        return "Reading CURSOR_API_KEY, GH_TOKEN, or GITHUB_TOKEN is not an agent action."
    return None


detail = analyze(command)
if detail:
    emit("deny", detail)
else:
    emit("allow")
PY
