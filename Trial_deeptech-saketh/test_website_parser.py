import os
from trafilatura import fetch_url

url = "https://huggingface.co/blog"
downloaded = fetch_url(url)
OUTPUT = "output/test_website_parser_output.txt"

print("Downloaded:", downloaded is not None)
print("Type:", type(downloaded))
print("Length:", len(downloaded) if downloaded else 0)
os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
with open(OUTPUT, "w", encoding="utf-8") as f:
    f.write(downloaded if downloaded else "")

