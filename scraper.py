import re
import requests
from bs4 import BeautifulSoup
from markdownify import markdownify as md
from pathlib import Path

BASE = "https://www.opensourceclub-univ-alger1.dz"
OUT = Path(__file__).parent / "Data" / "scraped_web"

# Sections of the home page -> output file (matched by keywords in the section's first heading)
FILES = {
    "home": ["expanding knowledge", "education", "represents a place"],
    "courses": ["courses"],
}

# Separate pages -> output file
PAGES = {
    "events": "/events",
    "join": "/join",
}

JUNK = {
    "⌖", "▢", "◉", "Subscribe", "Made with ♥© 2026 Open Source Club",
    "ABOUT US", "MISSION", "LEARN", "EVENTS",
    "JOIN OSC", "Benefits", "Qualifications", "✕", "01", "02", "03"
}

# Used only to create new tags
_factory = BeautifulSoup("", "html.parser")


def to_markdown(tag):
    for el in tag(["script", "style", "noscript", "svg", "img"]):
        el.decompose()
    for br in tag.find_all("br"):
        br.replace_with(" ")  # line break -> space
    for div in tag.find_all("div", class_=lambda c: c and c.endswith("__tags")):
        names = [s.get_text(strip=True) for s in div.find_all("span")]
        p = _factory.new_tag("p")
        p.string = "Topics: " + ", ".join(names)
        div.replace_with(p)
    text = md(str(tag), heading_style="ATX")
    text = text.replace(")[", ")\n[")        # one link per line
    text = text.replace("?+", "?")           # remove FAQ expand icon
    text = text.replace("](/", f"]({BASE}/") # relative link -> full link
    lines = [line for line in text.splitlines() if line.strip() not in JUNK]
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()


def fetch(path):
    r = requests.get(BASE + path, timeout=20)
    r.raise_for_status()
    return BeautifulSoup(r.text, "html.parser")


def scrape_all():
    """Scrapes OSC website pages and updates Data/scraped_web/ files."""
    OUT.mkdir(parents=True, exist_ok=True)
    print(f"🔄 Syncing website content from {BASE}...")

    # --- Home page: split into sections ---
    soup = fetch("/")
    collected = {name: [] for name in FILES}
    collected["contact"] = []

    main_elem = soup.find("main")
    if main_elem:
        for section in main_elem.find_all("section"):
            heading = section.find(["h1", "h2", "h3"])
            title = heading.get_text(" ", strip=True).lower() if heading else ""
            for name, keywords in FILES.items():
                if any(k in title for k in keywords):
                    collected[name].append(to_markdown(section))
                    break
            else:
                if title:
                    print(f"  Skipped section: {title[:40]}")

    # The footer holds the contact details and social links
    footer = soup.find("footer")
    if footer is not None:
        collected["contact"].append(to_markdown(footer))

    # --- Other pages: one file each ---
    for name, path in PAGES.items():
        try:
            page = fetch(path)
            main = page.find("main")
            if main is None:
                print(f"  Skipped page (no <main>): {path}")
                continue
            for f in main.find_all(["nav", "footer"]):
                f.decompose()
            collected[name] = [to_markdown(main)]
        except Exception as e:
            print(f"  Failed to fetch {path}: {e}")

    # --- Save everything ---
    for name, parts in collected.items():
        text = "\n\n".join(parts)
        target_file = OUT / f"{name}.txt"
        target_file.write_text(text, encoding="utf-8")
        print(f"  Saved {name}.txt ({len(text)} chars)")
    print("✅ Web content sync complete.")


if __name__ == "__main__":
    scrape_all()
