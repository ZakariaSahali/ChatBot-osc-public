import requests
from bs4 import BeautifulSoup

BASE = "https://www.opensourceclub-univ-alger1.dz"

for path in ["/events", "/join", "/team", "/courses"]:
    r = requests.get(BASE + path, timeout=20)
    print("=====", path, "| status:", r.status_code, "| length:", len(r.text))
    soup = BeautifulSoup(r.text, "html.parser")
    main = soup.find("main")
    print("main found:", main is not None)
    for tag in (main or soup).find_all(["h1", "h2", "h3"]):
        print(tag.name, "|", tag.get_text(" ", strip=True)[:60])