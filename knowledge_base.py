from pathlib import Path

DATA_DIR = Path(__file__).parent / "Data"
SCRAPED_DIR = DATA_DIR / "scraped_web"

_cached_knowledge = ""
_last_check_mtimes = {}

def read_file(path: Path) -> str:
    return path.read_text(encoding="utf-8").strip()

def get_current_mtimes() -> dict:
    """Collect modification timestamps of all knowledge source files."""
    mtimes = {}
    manual = DATA_DIR / "club_info.md"
    if manual.exists():
        mtimes[str(manual)] = manual.stat().st_mtime
    if SCRAPED_DIR.exists():
        for f in SCRAPED_DIR.glob("*.txt"):
            mtimes[str(f)] = f.stat().st_mtime
    return mtimes

def load_knowledge(force_reload: bool = False) -> str:
    """
    Loads knowledge base files. If files haven't changed since last read,
    returns the cached version immediately to avoid disk I/O bottlenecks.
    """
    global _cached_knowledge, _last_check_mtimes

    current_mtimes = get_current_mtimes()
    if not force_reload and _cached_knowledge and current_mtimes == _last_check_mtimes:
        return _cached_knowledge

    parts = []
    manual = DATA_DIR / "club_info.md"
    if manual.exists():
        text = read_file(manual)
        if text:
            parts.append(f"===MANUAL CLUB INFO (most reliable)===\n{text}")

    if SCRAPED_DIR.exists():
        for f in sorted(SCRAPED_DIR.glob("*.txt")):
            text = read_file(f)
            if text:
                parts.append(f"===WEBSITE: {f.stem}===\n{text}")

    _cached_knowledge = "\n\n".join(parts)
    _last_check_mtimes = current_mtimes
    return _cached_knowledge


if __name__ == "__main__":
    knowledge = load_knowledge()
    print(f"Loaded {len(knowledge)} characters (~{len(knowledge) // 3} tokens).")
